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
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  testInfo.annotations.push({type:'screen angle',description:String(await page.evaluate(()=>screen.orientation?.angle))});

  // Choose tilt: readings must arrive, or the choice falls back to assisted.
  const feed=setInterval(()=>{void lean(page,0).catch(()=>{})},50);
  await page.locator('input[name=steering][value=tilt]').check();
  await expect(page.locator('#tilt-status')).toContainText('Motion sensor working',{timeout:5000});
  clearInterval(feed);
  await expect(page.locator('#tilt-options')).toBeVisible();
  await lean(page,15);
  await page.waitForTimeout(300);
  await page.screenshot({path:testInfo.outputPath('g4-01-start-tilt.png')});
  await lean(page,0);

  await page.click('#start-mirror-check');
  await expect(page.locator('#briefing')).toBeVisible();
  await expect(page.locator('#briefing-steering')).toContainText('tilt the phone');
  await expect(page.locator('#hud-tilt')).toBeVisible();
  await expect(page.locator('[data-hold=left]')).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('g4-02-briefing.png')});
  // Held: nothing moves while the briefing is up.
  await page.waitForTimeout(2000);
  expect(await read(page,'simTime()')).toBe(0);
  expect(await read(page,'briefing()')).toBeGreaterThan(6);

  // Hold the phone tipped 12° and start: that becomes straight ahead.
  await lean(page,12);
  await page.waitForTimeout(200);
  await page.click('#briefing-go');
  await lean(page,12);
  await page.waitForTimeout(400);
  expect(Math.abs((await read(page,'vehicle()')).steerAngle)).toBeLessThan(.02);

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

test('G4: without sensor readings, choosing tilt falls back to assisted steering and says why',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.locator('input[name=steering][value=tilt]').check();
  await expect(page.locator('#tilt-status')).toContainText('No motion sensor readings',{timeout:5000});
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  expect(await read(page,'steering()')).toBe('assist');
});
