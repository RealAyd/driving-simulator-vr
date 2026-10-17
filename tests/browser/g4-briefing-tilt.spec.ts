import {expect,test,type Page} from '@playwright/test';

// Phone-sized landscape viewport with touch, like an iPhone 14 Pro Max.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
/**
 * Simulated sensor reading for a phone tipped back 40° and turned `deg` clockwise.
 * In landscape (screen angle 90) the turn shows up in beta; in portrait, in gamma.
 */
const lean=(page:Page,deg:number)=>page.evaluate(d=>{
  const landscape=screen.orientation?.angle===90;
  const reading=landscape?{beta:d,gamma:-40}:{beta:40,gamma:d};
  window.dispatchEvent(Object.assign(new Event('deviceorientation'),{alpha:0,...reading}));
},deg);

test('G4: tilt steering turns the car with the phone, and the briefing holds the start for 10 s',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Headless builds either lack the orientation API or refuse its permission; stand in for an allowed phone.
  await page.addInitScript(()=>{
    if(!('DeviceOrientationEvent' in window))(window as any).DeviceOrientationEvent=class extends Event{};
    if('requestPermission' in DeviceOrientationEvent)(DeviceOrientationEvent as any).requestPermission=async()=>'granted';
  });
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  testInfo.annotations.push({type:'screen angle',description:String(await page.evaluate(()=>screen.orientation?.angle))});

  // Choosing tilt shows the panel without asking for anything yet.
  await page.locator('input[name=steering][value=tilt]').check();
  await expect(page.locator('#tilt-options')).toBeVisible();
  await expect(page.locator('#tilt-permission')).toHaveText('not asked yet');
  await expect(page.locator('#tilt-calibrate')).toBeDisabled();

  // Enable tilt (the tap asks for access), then real readings show up with a live rate.
  const feed=setInterval(()=>{void lean(page,12).catch(()=>{})},40);
  await page.click('#tilt-enable');
  await expect(page.locator('#tilt-permission')).toHaveText(/granted|not needed/);
  await expect(page.locator('#tilt-readings')).toContainText('readings arriving',{timeout:5000});
  await expect(page.locator('#tilt-landscape')).toHaveText('landscape');
  await expect(page.locator('#tilt-calibrated')).toHaveText('not calibrated');

  // Calibrate with the phone held turned 12°: that becomes straight ahead.
  await expect(page.locator('#tilt-calibrate')).toBeEnabled();
  await page.click('#tilt-calibrate');
  await expect(page.locator('#tilt-calibrated')).toHaveText('calibrated');
  await expect(page.locator('#tilt-readings')).toContainText('lean +0°');
  clearInterval(feed);
  await lean(page,27);
  await page.waitForTimeout(300);
  await expect(page.locator('#tilt-readings')).toContainText('lean +15°');
  await page.screenshot({path:testInfo.outputPath('g4-01-start-tilt.png')});
  await lean(page,12);

  await page.click('#start-mirror-check');
  await expect(page.locator('#briefing')).toBeVisible();
  await expect(page.locator('#briefing-steering')).toContainText('calibrated');
  await expect(page.locator('#hud-tilt')).toBeVisible();
  // Touch steering stays available as a fallback.
  await expect(page.locator('[data-hold=left]')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('g4-02-briefing.png')});
  // Held: nothing moves while the briefing is up.
  await page.waitForTimeout(2000);
  expect(await read(page,'simTime()')).toBe(0);
  expect(await read(page,'briefing()')).toBeGreaterThan(6);

  // Still held at the calibrated 12°: straight ahead, and the calibration is kept at the start.
  await lean(page,12);
  await page.click('#briefing-go');
  for(let i=0;i<8;i++){await lean(page,12);await page.waitForTimeout(50)}
  expect(Math.abs((await read(page,'vehicle()')).steerAngle)).toBeLessThan(.02);
  await expect(page.locator('#hud-tilt-state')).toHaveText('tilt on');

  // Turn the phone clockwise by 20° relative to that: the wheels turn right.
  for(let i=0;i<10;i++){await lean(page,32);await page.waitForTimeout(60)}
  expect((await read(page,'vehicle()')).steerAngle).toBeGreaterThan(.2);
  await page.screenshot({path:testInfo.outputPath('g4-03-tilt-right.png')});
  // And anticlockwise: left.
  for(let i=0;i<15;i++){await lean(page,-8);await page.waitForTimeout(60)}
  expect((await read(page,'vehicle()')).steerAngle).toBeLessThan(-.2);

  // Centre re-zeroes on the current position.
  await page.click('#hud-tilt-centre');
  for(let i=0;i<15;i++){await lean(page,-8);await page.waitForTimeout(60)}
  expect(Math.abs((await read(page,'vehicle()')).steerAngle)).toBeLessThan(.05);
  expect(await read(page,'steering()')).toBe('tilt');
  expect(errors).toEqual([]);
});

test('G4: without sensor readings, tilt says so, cannot be calibrated, and ◀ ▶ remain for steering',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.locator('input[name=steering][value=tilt]').check();
  await page.click('#tilt-enable');
  // Refused (browsers with the iOS-style permission) or silent (no sensor): no readings either way.
  await expect(page.locator('#tilt-permission')).not.toHaveText('not asked yet');
  await page.waitForTimeout(800);
  await expect(page.locator('#tilt-readings')).toHaveText('no readings');
  await expect(page.locator('#tilt-calibrate')).toBeDisabled();
  await page.click('#start-mirror-check');
  await expect(page.locator('#briefing-steering')).toContainText('no sensor readings are arriving');
  await page.click('#briefing-go');
  await expect(page.locator('#hud-tilt-state')).toHaveText('no tilt readings: use ◀ ▶');
  await expect(page.locator('[data-hold=left]')).toBeVisible();
  // The buttons still steer.
  await page.locator('[data-hold=left]').dispatchEvent('pointerdown');
  await expect.poll(async()=>(await read(page,'vehicle()')).steerAngle).toBeLessThan(-.1);
  await page.locator('[data-hold=left]').dispatchEvent('pointerup');
});

test('G4: assisted steering in the mirror check keeps to the road through the bend, and after a manual correction',async({page},testInfo)=>{
  // Regression for an iPhone report: holding Go on assisted steering ran off the road at the bend.
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  await page.click('#start-mirror-check');
  await page.click('#briefing-go');
  const go=page.locator('[data-hold=throttle]');
  await go.dispatchEvent('pointerdown');
  // A correction to the right with the button, then let the assistance bring the car back.
  await expect.poll(async()=>(await read(page,'vehicle()')).position.z,{timeout:30_000}).toBeLessThan(-30);
  const right=page.locator('[data-hold=right]');
  await right.dispatchEvent('pointerdown');
  await page.waitForTimeout(400);
  await right.dispatchEvent('pointerup');
  expect((await read(page,'vehicle()')).steerAngle).toBeGreaterThan(0);
  // Simulation time runs slower than real time under headless software rendering.
  await expect.poll(async()=>{
    const v=await read(page,'vehicle()');
    testInfo.annotations.push({type:'car',description:`t=${(await read(page,'simTime()')).toFixed(1)} x=${v.position.x.toFixed(2)} z=${v.position.z.toFixed(1)} v=${v.speed.toFixed(1)} ${v.surface} ${await read(page,'session()')}`});
    return v.position.z;
  },{timeout:200_000,intervals:[1000]}).toBeLessThan(-250);
  // Stop well before the end of the modelled road (about 340 m).
  await go.dispatchEvent('pointerup');
  await page.locator('[data-hold=brake]').dispatchEvent('pointerdown');
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:60_000}).toBe(0);
  const car=await read(page,'vehicle()');
  await page.screenshot({path:testInfo.outputPath('g4-04-after-bend.png')});
  expect(await read(page,'session()')).toBe('running');
  expect(car.surface).toBe('carriageway');
  const types=(await read(page,'events()')).map((e:{type:string})=>e.type);
  expect(types).not.toContain('vehicle.collision');
  expect(types).not.toContain('vehicle.offroad');
  expect(errors).toEqual([]);
});
