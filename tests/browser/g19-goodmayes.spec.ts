import {expect,test,type Page} from '@playwright/test';

// Goodmayes (generated from map data, tools/centres/build_centre.mjs): a free drive on a street network with
// terraced side roads, on real ground. Starts, drives off along Ashgrove Road without leaving the route.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G19: Goodmayes free drive starts on real ground and drives off along the road',async({page},testInfo)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=free]');
  await page.click('[data-exercise=goodmayes]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  // The traffic lights mapped at Goodmayes run (two junctions and two crossings).
  const lights=await read(page,'signals()');
  expect(lights.length).toBeGreaterThan(10);
  expect(new Set(lights.map((s:{state:string})=>s.state)).has('red')).toBe(true);
  const t=await read(page,'terrain()');
  expect(t.on).toBe(true);
  const cam=await read(page,'camera()');
  expect(cam.position[1]-t.heightUnderCar).toBeGreaterThan(.9);
  expect(cam.position[1]-t.heightUnderCar).toBeLessThan(1.5);
  await page.screenshot({path:testInfo.outputPath('g19-start.png')});
  // Drive west along Ashgrove Road: steady, on the carriageway, still running.
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:60_000}).toBeGreaterThan(5);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(1500);
  expect(await read(page,'session()')).toBe('running');
  await page.screenshot({path:testInfo.outputPath('g19-driving.png')});
  expect(errors).toEqual([]);
});
