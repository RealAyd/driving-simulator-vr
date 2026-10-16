import {expect,test,type Page} from '@playwright/test';

type Sim={
  session():string;
  vehicle():{position:{x:number;y:number;z:number};heading:number;speed:number;indicator:string};
  camera():{position:number[];forward:number[]};
  events():Array<{id:string;type:string;time:number}>;
  simTime():number;
  fps():number;
  quality:string;
};
const sim=<T>(page:Page,fn:(s:Sim)=>T)=>page.evaluate(fn as never,undefined) as Promise<T>;
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
// Wait for simulation conditions, not wall-clock time: on slow machines the
// fixed clock caps catch-up, so simulation time can run slower than real time.
const until=(page:Page,fn:string,timeout=30_000)=>page.waitForFunction(fn,null,{timeout});

test('G0: start, drive, brake, signal, pause, restart and recover focus',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await expect(page.locator('#location-label')).toContainText('representative layout');
  await page.screenshot({path:testInfo.outputPath('01-start.png')});

  await page.click('#start-button');
  expect(await read(page,'session()')).toBe('running');
  await expect(page.locator('#hud')).toBeVisible();

  // Camera sits at the right-hand driver seat, about 1.2 m above the road, facing north.
  const cam=await read(page,'camera()');
  expect(cam.position[0]).toBeCloseTo(-1.6+.37,1);
  expect(cam.position[1]).toBeGreaterThan(1.1);
  expect(cam.position[1]).toBeLessThan(1.4);
  expect(cam.forward[2]).toBeLessThan(-.95);
  await page.waitForTimeout(500);
  await page.screenshot({path:testInfo.outputPath('02-driver-view.png')});

  // Drive forward.
  await page.keyboard.down('KeyW');
  await until(page,'window.__drivingPractice.vehicle().speed>3');
  const moving=await read(page,'vehicle()');
  expect(moving.speed).toBeGreaterThan(2);
  expect(moving.position.z).toBeLessThan(-1);
  expect(Math.abs(moving.position.x+1.6)).toBeLessThan(.05); // straight, stays in lane
  expect(Number(await page.locator('#hud-speed').textContent())).toBeGreaterThan(4);
  await page.screenshot({path:testInfo.outputPath('03-driving.png')});

  // Losing focus releases the accelerator.
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(300);
  const afterBlur=await read(page,'vehicle()');
  await page.waitForTimeout(500);
  expect((await read(page,'vehicle()')).speed).toBeLessThan(afterBlur.speed); // coasting, not accelerating
  await page.keyboard.up('KeyW');

  // Brake to a stop.
  await page.keyboard.down('KeyS');
  await until(page,'window.__drivingPractice.vehicle().speed===0');
  await page.keyboard.up('KeyS');
  expect((await read(page,'vehicle()')).speed).toBe(0);

  // Indicator on and off.
  await page.keyboard.press('BracketLeft');
  expect((await read(page,'vehicle()')).indicator).toBe('left');
  await expect(page.locator('#ind-left')).toHaveClass(/armed/);
  await page.keyboard.press('BracketLeft');
  expect((await read(page,'vehicle()')).indicator).toBe('off');

  // Steer right while moving: heading turns clockwise.
  await page.keyboard.down('KeyW');await page.keyboard.down('KeyD');
  await until(page,'window.__drivingPractice.vehicle().heading>.1');
  await page.keyboard.up('KeyD');await page.keyboard.up('KeyW');
  const turned=await read(page,'vehicle()');
  expect(turned.heading).toBeGreaterThan(.05);
  expect(turned.heading).toBeLessThan(Math.PI);

  // Pause freezes simulation time; resume continues.
  await page.keyboard.press('KeyP');
  expect(await read(page,'session()')).toBe('paused');
  await expect(page.locator('#screen-paused')).toBeVisible();
  const pausedAt=await read(page,'simTime()');
  await page.waitForTimeout(700);
  expect(await read(page,'simTime()')).toBe(pausedAt);
  await page.click('#resume-button');
  expect(await read(page,'session()')).toBe('running');

  // Hidden tab pauses automatically.
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await read(page,'session()')).toBe('paused');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false})});

  // Restart from the pause screen: back to spawn, events cleared to a single reset.
  await page.click('#restart-button');
  expect(await read(page,'session()')).toBe('running');
  const reset=await read(page,'vehicle()');
  expect(reset.position.z).toBeCloseTo(0,5);
  expect(reset.speed).toBe(0);
  const types=(await read(page,'events()')).map((e:{type:string})=>e.type);
  expect(types).toEqual(['session.reset','session.resumed']);

  // Repeated restarts do not accumulate errors.
  for(let i=0;i<5;i++){await page.keyboard.press('KeyR');await page.waitForTimeout(100)}
  await page.waitForTimeout(1000);
  const fps=await read(page,'fps()');
  testInfo.annotations.push({type:'fps (headless SwiftShader, not representative)',description:fps.toFixed(1)});
  await page.screenshot({path:testInfo.outputPath('04-after-restarts.png')});

  expect(errors).toEqual([]);
});

test('G0: errors are shown on screen, not as a blank canvas',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.evaluate(()=>setTimeout(()=>{throw new Error('Injected failure for test')}));
  await expect(page.locator('#screen-error')).toBeVisible();
  await expect(page.locator('#error-message')).toContainText('Injected failure for test');
});
