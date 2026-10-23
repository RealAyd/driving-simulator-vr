import {expect,test,type Page} from '@playwright/test';

// The driver's hands on the wheel (they follow the steering), and the behind-the-car view.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G17: the hands follow the steering; the behind-the-car view is practice only and reported',async({page},testInfo)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  // The on-screen wheel is gone: assisted, tilt or the Steer buttons.
  await expect(page.locator('input[name=steering][value=wheel]')).toHaveCount(0);
  await page.click('input[name=steering][value=buttons]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  expect(await read(page,'steering()')).toBe('buttons');
  expect(await read(page,'hands()')).toBeCloseTo(0,3);
  // Hold Steer right: the car's wheels turn right, and so do the hands on the wheel.
  const right=page.locator('[data-hold=right]');
  const box=(await right.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await expect.poll(async()=>(await read(page,'vehicle()')).steerAngle,{timeout:30_000}).toBeGreaterThan(.1);
  await expect.poll(()=>read(page,'hands()'),{timeout:30_000}).toBeGreaterThan(.3);
  await page.screenshot({path:testInfo.outputPath('g17-steer-right.png')});
  // Let go: the wheel returns to the centre.
  await page.mouse.up();
  await expect.poll(async()=>Math.abs((await read(page,'vehicle()')).steerAngle),{timeout:30_000}).toBeLessThan(.02);

  // Behind the car: the camera moves out behind and above the car; the head (observations) stays in the seat.
  const seat=await read(page,'camera()');
  await page.click('#hud-behind');
  await expect(page.locator('#hud-view-label')).toHaveText(/Behind the car \(not a driver's view\)/);
  // The Steer buttons stay.
  await expect(page.locator('#steer-buttons')).toBeVisible();
  await expect.poll(async()=>(await read(page,'behind()')).carModel,{timeout:30_000}).toBe(true);
  // L plates (and the roof box) on the learner's car, seen from behind.
  expect((await read(page,'behind()')).lPlates).toBe(true);
  const out=await read(page,'camera()');
  expect(out.position[1]).toBeGreaterThan(seat.position[1]+1.5);
  await page.screenshot({path:testInfo.outputPath('g17-behind.png')});
  await expect.poll(async()=>(await read(page,'behind()')).seconds,{timeout:60_000}).toBeGreaterThan(1.5);
  // A view button is a driver's view: it returns to the driver's seat.
  await page.click('[data-view=forward]');
  expect((await read(page,'behind()')).on).toBe(false);
  await expect(page.locator('#hud-view-label')).toHaveText('View: Forward');
  await expect.poll(async()=>(await read(page,'camera()')).position[1],{timeout:30_000}).toBeCloseTo(seat.position[1],1);

  // The results say the behind view was used and that it is not a driver's view.
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#results-title')).toHaveText('You exited the exercise');
  await expect(page.locator('#results-notes')).toContainText(/behind-the-car view for \d+ s\. It is not a driver's view/);
  expect(errors).toEqual([]);
});
