import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// Phone-sized landscape viewport with touch, like an iPhone 14 Pro Max.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G5: Brentwood guided route: start at S0, left at mini-roundabout 1, ahead at 2, finish on Shenfield Road',async({page},testInfo)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'brentwood');
  await expect(page.locator('#exercise-briefing')).toContainText('not an official test route');
  await expect(page.locator('#exercise-briefing')).toContainText('turn LEFT');
  await page.click('#start-practice');
  expect(await read(page,'location()')).toBe('brentwood-paired-mini-roundabouts');
  await expect(page.locator('#hud-credit')).toContainText('© OpenStreetMap contributors');

  // Layout review shots from above (diagnostic camera), then the driver's view at the start.
  await read(page,'overhead({x:5,z:0,height:95})');
  await page.waitForTimeout(800);
  await page.screenshot({path:testInfo.outputPath('g5-01-overhead.png')});
  await read(page,'overhead({x:12,z:0,height:38})');
  await page.waitForTimeout(800);
  await page.screenshot({path:testInfo.outputPath('g5-02-overhead-junctions.png')});
  await read(page,'overhead(null)');
  await page.waitForTimeout(800);
  await page.screenshot({path:testInfo.outputPath('g5-03-start-s0.png')});

  // Drive the route on assisted steering, holding Go; brake to a crawl near each roundabout.
  const go=page.locator('[data-hold=throttle]'),brake=page.locator('[data-hold=brake]');
  await page.click('#hud-ind-left');
  let shots=0;
  for(let i=0;i<400;i++){
    const v=await read(page,'vehicle()');
    if(await read(page,'session()')!=='running')break;
    const near=(x:number,z:number,r:number)=>Math.hypot(v.position.x-x,v.position.z-z)<r;
    const slow=near(7.87,7.89,16)||near(16.83,-9.01,13);
    const want=slow?3.5:8;
    if(v.speed<want){await brake.dispatchEvent('pointerup');await go.dispatchEvent('pointerdown')}
    else{await go.dispatchEvent('pointerup');if(v.speed>want+1)await brake.dispatchEvent('pointerdown');else await brake.dispatchEvent('pointerup')}
    if(shots===0&&near(7.87,7.89,9)){shots++;await page.screenshot({path:testInfo.outputPath('g5-04-rb1.png')})}
    if(shots===1&&near(16.83,-9.01,9)){shots++;await page.screenshot({path:testInfo.outputPath('g5-05-rb2.png')})}
    testInfo.annotations.push({type:'car',description:`x=${v.position.x.toFixed(1)} z=${v.position.z.toFixed(1)} v=${v.speed.toFixed(1)} ${v.surface}`});
    await page.waitForTimeout(250);
  }
  await go.dispatchEvent('pointerup');
  await expect(page.locator('#screen-results')).toBeVisible({timeout:30_000});
  await page.screenshot({path:testInfo.outputPath('g5-06-results.png')});
  const result=await read(page,'result()');
  expect(result.outcome).toBe('completed');
  expect(result.notes.join(' ')).toContain('Mini-roundabout 1');
  expect(result.notes.join(' ')).toContain('Mini-roundabout 2');
  expect(result.notes.join(' ')).toContain('left signal on before entering');
  // The test never looks right, so that shows as something to improve, not with a tick.
  await expect(page.locator('#results-notes li.improve').first()).toContainText('no look to the right');
  const types=(await read(page,'events()')).map((e:{type:string})=>e.type);
  expect(types).not.toContain('vehicle.collision');

  // Back to the menu and into an exercise elsewhere: the world is rebuilt and the car starts there.
  await page.click('#menu-button');
  await pick(page,'zebra');
  await page.click('#start-practice');
  expect(await read(page,'location()')).toBe('representative-residential-straight');
  expect(await read(page,'passers()')).toEqual([]);
  // Not a mapped street: only the car models' credit (CC BY), no map data credit.
  await expect(page.locator('#hud-credit')).toHaveText('cars: muha692, Comrade1280 (Sketchfab, CC BY 4.0)');
  const car=await read(page,'vehicle()');
  expect(car.position.z).toBeCloseTo(0,3);
  expect(car.surface).toBe('carriageway');
  expect(errors).toEqual([]);
});
