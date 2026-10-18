import {expect,test,type Page} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G1: interior mirror shows the real scene behind, correctly oriented, and updates as the car moves',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.click('[data-exercise=zebra]');
  await page.click('#start-practice');
  await page.waitForTimeout(800);

  const rect=(await read(page,'mirrors()'))[0];
  expect(rect.right-rect.left).toBeGreaterThan(40);  // visible on screen
  expect(rect.left).toBeGreaterThan(0);
  await page.screenshot({path:testInfo.outputPath('g1-01-mirror-at-start.png')});

  // Read the interior mirror's own image (red and blue car paint only: brick and roofs do not count).
  const colours=async()=>({red:await read(page,"mirrorPixels('interior','red')"),blue:await read(page,"mirrorPixels('interior','blue')")});
  await read(page,'freezeTime(true)');
  await page.waitForTimeout(600);
  const atStart=await colours();
  testInfo.annotations.push({type:'interior mirror at start',description:JSON.stringify(atStart)});
  // The red car is parked behind on the left kerb (almost straight behind) and the blue car behind on the
  // right kerb: in the mirror the blue car appears on the right and the red car to the left of it.
  expect(atStart.red.n).toBeGreaterThan(20);
  expect(atStart.blue.n).toBeGreaterThan(20);
  expect(atStart.blue.x).toBeGreaterThan(.6);
  expect(atStart.red.x).toBeLessThan(atStart.blue.x-.05);
  await read(page,'freezeTime(false)');

  // Drive 10 m (a simulation condition, not a wall-clock wait), then stop: the red car gets smaller (live updates).
  await page.keyboard.down('KeyW');
  await page.waitForFunction('window.__drivingPractice.vehicle().position.z< -10',null,{timeout:60_000});
  await page.keyboard.up('KeyW');
  await page.keyboard.down('Space');
  await page.waitForFunction('window.__drivingPractice.vehicle().speed===0',null,{timeout:60_000});
  await page.keyboard.up('Space');
  await read(page,'freezeTime(true)');
  await page.waitForTimeout(600);
  const later=await colours();
  testInfo.annotations.push({type:'interior mirror after driving 10 m',description:JSON.stringify(later)});
  expect(later.red.n).toBeLessThan(atStart.red.n*.85);
  await page.screenshot({path:testInfo.outputPath('g1-02-mirror-after-moving.png')});
  expect(errors).toEqual([]);
});

test('G1: road sits under the car, kerb raises it, and braking from 30 mph stops predictably',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.click('[data-exercise=zebra]');
  await page.click('#start-practice');

  const start=await read(page,'vehicle()');
  expect(start.position.y).toBeCloseTo(0,6);         // carriageway surface
  const cam=await read(page,'camera()');
  expect(cam.position[1]-start.position.y).toBeCloseTo(1.2,2); // eye height above the road, not sea level

  // Accelerate to about 30 mph, then brake fully and measure the stop.
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>(window as any).__drivingPractice.vehicle().speed>=13.4,null,{timeout:90_000});
  await page.keyboard.up('KeyW');
  const before=await read(page,'vehicle()');
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>(window as any).__drivingPractice.vehicle().speed===0,null,{timeout:60_000});
  await page.keyboard.up('Space');
  const after=await read(page,'vehicle()');
  const distance=Math.hypot(after.position.x-before.position.x,after.position.z-before.position.z);
  const v=before.speed;
  const predicted=v*v/(2*7.5);
  test.info().annotations.push({type:'braking',description:`from ${v.toFixed(2)} m/s stopped in ${distance.toFixed(2)} m (v²/2a = ${predicted.toFixed(2)} m)`});
  // Allow for up to two frames of input latency at the measured speed.
  expect(Math.abs(distance-predicted)).toBeLessThan(1+v*2/60);
  expect(Math.abs(after.position.x+1.6)).toBeLessThan(.05); // still in its lane

  // Steer gently left onto the pavement at walking pace and stop there (garden walls stand at the back of the
  // pavement): the car rises by the kerb height. Decisions use simulation state, not wall-clock durations.
  // Find a stretch of pavement with no lamp column or wall in the way (drive on 6 m at a time until there is one).
  for(let tries=0;;tries++){
    const v=await read(page,'vehicle()');
    if(await read(page,`staticObstacleAt(-3.4,${v.position.z-7},0,1.5,7)`)===null)break;
    expect(tries).toBeLessThan(15);
    await page.keyboard.down('KeyW');
    await page.waitForFunction(`window.__drivingPractice.vehicle().position.z<${v.position.z-6}`,null,{timeout:60_000});
    await page.keyboard.up('KeyW');
    await page.keyboard.down('Space');
    await page.waitForFunction(()=>(window as any).__drivingPractice.vehicle().speed===0,null,{timeout:40_000});
    await page.keyboard.up('Space');
  }
  const until=Date.now()+150_000;
  for(;;){
    const v=await read(page,'vehicle()');
    if(v.position.x< -3.5)break;
    if(Date.now()>until)throw new Error(`did not reach the pavement: x=${v.position.x.toFixed(2)} heading=${v.heading.toFixed(2)} speed=${v.speed.toFixed(2)}`);
    const heading=v.heading>Math.PI?v.heading-2*Math.PI:v.heading;
    await (heading>-.22?page.keyboard.down('KeyA'):page.keyboard.up('KeyA'));
    await (v.speed<1.5?page.keyboard.down('KeyW'):page.keyboard.up('KeyW'));
  }
  await page.keyboard.up('KeyA');await page.keyboard.up('KeyW');
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>(window as any).__drivingPractice.vehicle().speed===0,null,{timeout:40_000});
  await page.keyboard.up('Space');
  const kerb=await read(page,'vehicle()');
  test.info().annotations.push({type:'kerb',description:`stopped at x=${kerb.position.x.toFixed(2)} y=${kerb.position.y.toFixed(3)}`});
  // Pavement spans 3.2–5.2 m left of the centre line.
  expect(kerb.position.x).toBeLessThan(-3.2);
  expect(kerb.position.x).toBeGreaterThan(-5.2);
  expect(kerb.position.y).toBeCloseTo(.12,6);
});

test('G1: measured frame times (environment recorded)',async({page},testInfo)=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.click('[data-exercise=zebra]');
  await page.click('#start-practice');
  await page.waitForTimeout(1000);
  await read(page,'resetPerf()');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(6000);
  await page.keyboard.up('KeyW');
  const perf=await read(page,'perf()');
  const renderer=await read(page,'renderer()');
  const report={measuredAt:new Date().toISOString(),userAgent:await page.evaluate(()=>navigator.userAgent),renderer,quality:await read(page,'quality'),perf};
  testInfo.annotations.push({type:'perf',description:JSON.stringify(report)});
  mkdirSync('test-results',{recursive:true});
  writeFileSync('test-results/g1-perf.json',JSON.stringify(report,null,2));
  expect(perf.frames).toBeGreaterThan(10);
});
