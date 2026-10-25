import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// Goodmayes (generated from map data, tools/centres/build_centre.mjs): a free drive on a street network with
// terraced side roads, on real ground. Starts, drives off along Ashgrove Road without leaving the route.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G19: Goodmayes free drive starts on real ground and drives off along the road',async({page},testInfo)=>{
  test.setTimeout(540_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'goodmayes','free');
  // Building the place takes a few seconds: the loading screen says so meanwhile.
  await expect(page.locator('#busy')).toBeVisible();
  await expect(page.locator('#busy-text')).toContainText('Loading Goodmayes');
  await page.screenshot({path:testInfo.outputPath('g19-00-loading.png')});
  await expect(page.locator('#busy')).toBeHidden({timeout:90_000});
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
  // Assisted steering with no route: along the lane past the parked cars, then (signalling left) into the next
  // turning on the left, Granton Road, without hitting anything or leaving the road.
  await page.click('#hud-ind-left');
  // (Wall-clock time: on a slow software-rendered test machine the simulation runs at a few frames a second.)
  const end=Date.now()+240_000;
  let held:string|null=null;
  const hold=async(key:string|null)=>{if(held===key)return;if(held)await page.keyboard.up(held);if(key)await page.keyboard.down(key);held=key};
  while(Date.now()<end&&!(await page.locator('#hud-place').textContent())?.includes('Granton Road')){
    const v=await read(page,'vehicle()');
    // Giving way as a learner should: held back for a car close ahead in the car's path (one coming the other way
    // while the learner is out past parked cars on its own side included).
    const fx=Math.sin(v.heading),fz=-Math.cos(v.heading);
    const blocked=(await read(page,'traffic()')).some((c:{visible:boolean;pose:{position:{x:number;z:number}}})=>{
      if(!c.visible)return false;
      const ox=c.pose.position.x-v.position.x,oz=c.pose.position.z-v.position.z,a=ox*fx+oz*fz;
      // (Or alongside, going by: wait for it to clear before moving on.)
      return a>0&&a<14&&Math.abs(ox*fz-oz*fx)<2.1||Math.abs(a)<5&&Math.abs(ox*fz-oz*fx)<2.6;
    });
    await hold(blocked?(Math.abs(v.speed)>.2?'KeyS':null):Math.abs(v.speed)<5?'KeyW':Math.abs(v.speed)>7?'KeyS':null);
    await page.waitForTimeout(150);
    expect(await read(page,'session()')).toBe('running');
  }
  await hold(null);
  await expect(page.locator('#hud-place')).toContainText('Granton Road');
  expect(await read(page,'session()')).toBe('running');
  await page.screenshot({path:testInfo.outputPath('g19-turned-left.png')});
  expect(errors).toEqual([]);
});
