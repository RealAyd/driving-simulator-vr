import {expect,test,type Page} from '@playwright/test';

// The on-screen steering wheel, the driver's hands on the wheel, and the behind-the-car view.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G17: the on-screen wheel steers and the hands follow it; the behind-the-car view is practice only and reported',async({page},testInfo)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await page.click('input[name=steering][value=wheel]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  expect(await read(page,'steering()')).toBe('wheel');
  // The wheel replaces the steer buttons.
  await expect(page.locator('#touch-wheel')).toBeVisible();
  await expect(page.locator('#steer-buttons')).toBeHidden();
  expect(await read(page,'hands()')).toBeCloseTo(0,3);

  // Drag clockwise round the wheel (a third of a turn): the car's wheels turn right, and so do the hands.
  const box=(await page.locator('#touch-wheel').boundingBox())!;
  const cx=box.x+box.width/2,cy=box.y+box.height/2,r=box.width/2-8;
  await page.mouse.move(cx,cy-r);
  await page.mouse.down();
  for(let a=0;a<=120;a+=10){const t=a*Math.PI/180;await page.mouse.move(cx+r*Math.sin(t),cy-r*Math.cos(t))}
  await expect.poll(async()=>(await read(page,'vehicle()')).steerAngle,{timeout:30_000}).toBeGreaterThan(.1);
  await expect.poll(()=>read(page,'hands()'),{timeout:30_000}).toBeGreaterThan(.3);
  await page.screenshot({path:testInfo.outputPath('g17-wheel-right.png')});
  // Let go: the wheel returns to the centre.
  await page.mouse.up();
  await expect.poll(async()=>Math.abs((await read(page,'vehicle()')).steerAngle),{timeout:30_000}).toBeLessThan(.02);

  // Behind the car: the camera moves out behind and above the car; the head (observations) stays in the seat.
  const seat=await read(page,'camera()');
  await page.click('#hud-behind');
  await expect(page.locator('#hud-view-label')).toHaveText(/Behind the car \(not a driver's view\)/);
  await expect.poll(async()=>(await read(page,'behind()')).carModel,{timeout:30_000}).toBe(true);
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
  await expect(page.locator('#results-notes')).toContainText('You steered with the on-screen wheel.');
  expect(errors).toEqual([]);
});
