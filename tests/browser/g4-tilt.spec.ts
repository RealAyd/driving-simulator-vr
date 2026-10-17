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
/** Headless builds either lack the orientation API or refuse its permission; stand in for a phone that allows it (or refuses). */
const sensorApi=(page:Page,answer:'granted'|'denied')=>page.addInitScript(a=>{
  if(!('DeviceOrientationEvent' in window))(window as any).DeviceOrientationEvent=class extends Event{};
  (DeviceOrientationEvent as any).requestPermission=async()=>a;
},answer);

test('G4: tilt on the exercise screen: enable, live status, calibrate, then the car steers with the phone; Steer buttons stay as a fallback',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await sensorApi(page,'granted');
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  // Assisted steering is the default for the judgement exercises on a phone.
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  await expect(page.locator('input[name=steering][value=tilt]')).toBeEnabled();

  // Choosing tilt shows the panel without asking for anything yet.
  await page.locator('input[name=steering][value=tilt]').check();
  await expect(page.locator('#tilt-options')).toBeVisible();
  await expect(page.locator('#tilt-permission')).toHaveText('not asked yet');
  await expect(page.locator('#tilt-calibrate')).toBeDisabled();

  // Enable tilt (the tap asks for access), then real readings show up with a live rate.
  const feed=setInterval(()=>{void lean(page,12).catch(()=>{})},40);
  await page.click('#tilt-enable');
  await expect(page.locator('#tilt-permission')).toHaveText('granted');
  await expect(page.locator('#tilt-readings')).toContainText('readings arriving',{timeout:5000});
  await expect(page.locator('#tilt-landscape')).toHaveText('landscape');

  // Calibrate with the phone held turned 12°: that becomes straight ahead.
  await expect(page.locator('#tilt-calibrate')).toBeEnabled();
  await page.click('#tilt-calibrate');
  await expect(page.locator('#tilt-calibrated')).toHaveText('calibrated');
  clearInterval(feed);
  await lean(page,27);
  await expect(page.locator('#tilt-readings')).toContainText('lean +15°');
  await page.locator('#tilt-options').scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('g4-01-tilt-settings.png')});

  await lean(page,12);
  await page.click('#start-practice');
  await expect(page.locator('#hud-tilt')).toBeVisible();
  await expect(page.locator('[data-hold=left]')).toBeVisible();   // fallback
  for(let i=0;i<8;i++){await lean(page,12);await page.waitForTimeout(50)}
  expect(Math.abs((await read(page,'vehicle()')).steerAngle)).toBeLessThan(.02);
  await expect(page.locator('#hud-tilt-state')).toHaveText('tilt on');

  // Turn the phone clockwise by 20° relative to that: the wheels turn right; anticlockwise: left.
  for(let i=0;i<10;i++){await lean(page,32);await page.waitForTimeout(60)}
  expect((await read(page,'vehicle()')).steerAngle).toBeGreaterThan(.2);
  await page.screenshot({path:testInfo.outputPath('g4-02-tilt-right.png')});
  for(let i=0;i<15;i++){await lean(page,-8);await page.waitForTimeout(60)}
  expect((await read(page,'vehicle()')).steerAngle).toBeLessThan(-.2);
  // Centre re-zeroes on the current position.
  await page.click('#hud-tilt-centre');
  for(let i=0;i<15;i++){await lean(page,-8);await page.waitForTimeout(60)}
  expect(Math.abs((await read(page,'vehicle()')).steerAngle)).toBeLessThan(.05);
  // The Steer buttons override tilt.
  await page.locator('[data-hold=right]').dispatchEvent('pointerdown');
  await expect.poll(async()=>(await read(page,'vehicle()')).steerAngle).toBeGreaterThan(.1);
  await page.locator('[data-hold=right]').dispatchEvent('pointerup');
  expect(errors).toEqual([]);
});

test('G4: if motion access is refused, Tilt is disabled with a short reason and assisted steering is used',async({page})=>{
  await sensorApi(page,'denied');
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=zebra]');
  await page.locator('input[name=steering][value=tilt]').check();
  await page.click('#tilt-enable');
  await expect(page.locator('input[name=steering][value=tilt]')).toBeDisabled();
  await expect(page.locator('#tilt-unavailable')).toContainText('refused');
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  expect(await read(page,'steering()')).toBe('assist');
});

test.describe('desktop',()=>{
  test.use({viewport:{width:1280,height:720},isMobile:false,hasTouch:false});
  test('G4: on a desktop (no touch), Tilt is disabled with a reason; keys steer',async({page})=>{
    await page.goto('./');
    await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
    expect(await read(page,'quality')).toBe('desktop');
    await page.click('[data-exercise=brentwood]');
    await expect(page.locator('input[name=steering][value=tilt]')).toBeDisabled();
    await expect(page.locator('#tilt-unavailable')).toContainText('phone or tablet');
    await expect(page.locator('input[name=steering][value=buttons]')).toBeChecked();
  });
});

test('G4: with no sensor readings, tilt says so, cannot be calibrated, and the Steer buttons steer',async({page})=>{
  await sensorApi(page,'granted');
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await page.locator('input[name=steering][value=tilt]').check();
  await page.click('#tilt-enable');
  await expect(page.locator('#tilt-permission')).toHaveText('granted');
  await page.waitForTimeout(800);
  await expect(page.locator('#tilt-readings')).toHaveText('no readings');
  await expect(page.locator('#tilt-calibrate')).toBeDisabled();
  await page.click('#start-practice');
  await expect(page.locator('#hud-tilt-state')).toHaveText('no tilt: use Steer');
  await page.locator('[data-hold=left]').dispatchEvent('pointerdown');
  await expect.poll(async()=>(await read(page,'vehicle()')).steerAngle).toBeLessThan(-.1);
  await page.locator('[data-hold=left]').dispatchEvent('pointerup');
});
