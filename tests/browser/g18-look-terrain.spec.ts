import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// The look (sun shadows) and real ground heights (terrain) at Brentwood. Shadows are off with software
// rendering (as here) unless asked for; the terrain lays the road, the car and its camera on the ground.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

async function startBrentwood(page:Page,query=''){
  await page.goto(`./${query}`);
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'brentwood');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
}

test('G18: shadows off with software rendering, on when asked; Brentwood on real ground with the camera above it',async({page},testInfo)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));

  await startBrentwood(page);
  expect((await read(page,'renderer()')).renderer).toMatch(/SwiftShader/i);
  expect((await read(page,'shadows()')).on).toBe(false);
  // On the ground: the eye is about 1.2 m above the ground under the car, wherever that is.
  const t=await read(page,'terrain()');
  expect(t.on).toBe(true);
  const cam=await read(page,'camera()');
  expect(cam.position[1]-t.heightUnderCar).toBeGreaterThan(.9);
  expect(cam.position[1]-t.heightUnderCar).toBeLessThan(1.5);
  // Drive on: the ground under the car changes (High Street is not flat), the eye height above it does not.
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:60_000}).toBeGreaterThan(4);
  await page.keyboard.up('KeyW');
  const t2=await read(page,'terrain()'),cam2=await read(page,'camera()');
  expect(cam2.position[1]-t2.heightUnderCar).toBeGreaterThan(.9);
  expect(cam2.position[1]-t2.heightUnderCar).toBeLessThan(1.5);
  await page.screenshot({path:testInfo.outputPath('g18-terrain.png')});

  // Asked for: one shadow map with the scenery and road users drawn into it.
  await startBrentwood(page,'?shadows=1');
  await expect.poll(async()=>(await read(page,'shadows()')).casters,{timeout:30_000}).toBeGreaterThan(20);
  const s=await read(page,'shadows()');
  expect(s.on).toBe(true);
  expect(s.mapSize).toBe(1024);
  await page.screenshot({path:testInfo.outputPath('g18-shadows.png')});
  expect(errors).toEqual([]);
});
