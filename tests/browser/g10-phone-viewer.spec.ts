import {expect,test,type Page} from '@playwright/test';

// Phone viewer (cardboard-style headset) on an iPhone 14 Pro Max-sized landscape screen, touch.
// The motion sensor and game controller are simulated: real-device behaviour is untested here.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(240_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const EYE={x:.37,y:1.2,z:.1};
/** Head yaw/pitch (degrees) that looks from the driver's eye at a car-local point. */
const aimAt=(p:{x:number;y:number;z:number})=>{
  const dx=p.x-EYE.x,dy=p.y-EYE.y,dz=p.z-EYE.z;
  return {yaw:Math.atan2(dx,-dz)*180/Math.PI,pitch:Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI};
};
const BUTTON={left:-.55,stop:-.39,go:-.23,right:-.07,recentre:.09};
const button=(x:number)=>aimAt({x,y:.99,z:-.76});

/** A phone in a headset, worn in landscape: sensor readings for a head yaw/pitch (degrees) relative to where it started. */
async function wearPhone(page:Page){
  await page.addInitScript(()=>{
    if(!('DeviceOrientationEvent' in window))(window as any).DeviceOrientationEvent=class extends Event{};
    (DeviceOrientationEvent as any).requestPermission=async()=>'granted';
    const w=window as any;
    w.__head={yaw:0,pitch:-30,compass:40};   // looking down at the phone while putting it in the headset
    setInterval(()=>{
      const angle=screen.orientation?.angle??0,{yaw,pitch,compass}=w.__head;
      // Landscape (screen turned 90°): upright is gamma −90; portrait: beta 90. Turning right lowers alpha.
      const reading=angle===90?{alpha:compass-yaw,beta:0,gamma:-90-pitch}:angle===270||angle===-90?{alpha:compass-yaw,beta:0,gamma:90+pitch}:{alpha:compass-yaw,beta:90+pitch,gamma:0};
      window.dispatchEvent(Object.assign(new Event('deviceorientation'),reading));
    },30);
    // A Bluetooth game controller that tests can connect and press.
    w.__pad={id:'Test controller (standard)',connected:false,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[w.__pad.connected?w.__pad:null]});
  });
}
const look=(page:Page,yaw:number,pitch:number)=>page.evaluate(([y,p])=>{(window as any).__head.yaw=y;(window as any).__head.pitch=p},[yaw,pitch]);
/** Average frame rate over 4 s (headless software rendering: compare modes, not devices). */
async function frameRate(page:Page){
  await read(page,'resetPerf()');
  await page.waitForTimeout(4000);
  return Math.round((await read(page,'perf()')).averageFps*10)/10;
}
const pad=(page:Page,index:number,down:boolean)=>page.evaluate(([i,d])=>{const p=(window as any).__pad;p.connected=true;p.buttons[i]={pressed:d,value:d?1:0}},[index,down] as const);

/** Fraction of a region's pixels that are near black. */
async function darkShare(page:Page,x0:number,y0:number,x1:number,y1:number){
  const png=await page.screenshot({clip:{x:x0,y:y0,width:x1-x0,height:y1-y0}});
  return page.evaluate(async b64=>{
    const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
    const g=c.getContext('2d')!;g.drawImage(img,0,0);
    const d=g.getImageData(0,0,c.width,c.height).data;let n=0;
    for(let i=0;i<d.length;i+=4)if(d[i]!+d[i+1]!+d[i+2]!<30)n++;
    return n/(d.length/4);
  },png.toString('base64'));
}

test('G10: normal mobile mode is unchanged: one camera, touch controls, no viewer',async({page},testInfo)=>{
  await wearPhone(page);
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await expect(page.locator('#viewer-start')).toBeVisible();
  await page.locator('#viewer-mode').scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('g10-00-exercise-screen-viewer-option.png')});
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  const v=await read(page,'viewer()');
  expect(v.active).toBe(false);
  expect(v.activeCameras).toEqual([]);
  await expect(page.locator('[data-hold=throttle]')).toBeVisible();
  await expect(page.locator('#hud-view-label')).toBeVisible();
  const fps=await frameRate(page);
  testInfo.annotations.push({type:'frame rate, normal mode (software rendering)',description:`${fps} fps`});
  console.log('FPS normal',fps);
});

test('G10: phone viewer: stereo with lens correction, head tracking, recentring, gaze and controller input, tap to leave',async({page},testInfo)=>{
  await wearPhone(page);
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await read(page,"forceVariant('cyclist-then-late-car')");
  await page.click('#viewer-start');
  await expect.poll(()=>read(page,'viewer().active')).toBe(true);

  // Two eye cameras, touch HUD hidden; waiting for Start with simulated time stopped.
  let v=await read(page,'viewer()');
  expect(v.activeCameras).toEqual(['viewer-eye-left','viewer-eye-right']);
  expect(v.starting).toBe(true);
  expect(v.permission).toBe('granted');
  await expect(page.locator('#hud')).toBeHidden();
  await page.waitForTimeout(1500);
  const t0=await read(page,'simTime()');
  await page.screenshot({path:testInfo.outputPath('g10-01-waiting-for-start.png')});
  // Lens correction: the corners of each eye are black, the centres are not.
  for(const [x0,x1] of [[0,466],[466,932]]){
    expect(await darkShare(page,x0,0,x0+40,30),'eye corner').toBeGreaterThan(.9);
    expect(await darkShare(page,(x0+x1)/2-40,180,(x0+x1)/2+40,250),'eye centre').toBeLessThan(.2);
  }
  expect(await read(page,'simTime()')).toBe(t0);

  // Look at Start (straight ahead, slightly down) for a moment: the exercise begins, recentred on this direction.
  const start=aimAt({x:EYE.x,y:EYE.y-.02,z:EYE.z-1.2});
  await look(page,start.yaw,start.pitch);
  await expect.poll(()=>read(page,'viewer().starting'),{timeout:10_000}).toBe(false);
  await look(page,0,0);
  await expect.poll(async()=>Math.abs((await read(page,'head()')).yaw),{timeout:5000}).toBeLessThan(.05);

  // Head tracking: turning the head turns the driver's view (yaw right positive) and drives observation evidence.
  await look(page,40,0);
  await expect.poll(async()=>(await read(page,'head()')).yaw,{timeout:5000}).toBeGreaterThan(.6);
  await look(page,-25,-10);
  await expect.poll(async()=>{const h=await read(page,'head()');return h.yaw<-.35&&h.pitch<-.1},{timeout:5000}).toBe(true);
  await page.screenshot({path:testInfo.outputPath('g10-02-looking-left-down.png')});
  // Right shoulder check by head turn.
  await look(page,115,-5);
  await page.waitForTimeout(1200);
  await page.screenshot({path:testInfo.outputPath('g10-03-right-shoulder-by-head.png')});
  const views=(await read(page,'events()')).filter((e:any)=>e.type==='observation.dwell').map((e:any)=>e.payload?.target??e.target);
  expect(views).toContain('right-shoulder');

  // Recentre: the head direction becomes straight ahead (controller Y).
  await look(page,20,0);
  // Buttons are read once per frame (Gamepad API): hold until the effect shows (a slow machine renders few frames).
  await pad(page,3,true);
  await expect.poll(async()=>Math.abs((await read(page,'head()')).yaw),{timeout:10_000}).toBeLessThan(.05);
  await pad(page,3,false);
  await look(page,0,0);   // the sensors now say 20° left of the new centre
  await expect.poll(async()=>(await read(page,'head()')).yaw,{timeout:5000}).toBeLessThan(-.3);
  await look(page,20,0);

  // Frame rate while parked looking ahead (comparable with the normal-mode test).
  await look(page,20,0);
  const fps=await frameRate(page);
  testInfo.annotations.push({type:'frame rate, phone viewer (software rendering)',description:`${fps} fps`});
  console.log('FPS viewer',fps);
  // Gaze: signal right, then Go: the car moves off by itself to a steady low speed.
  const centre=20;   // the recentred straight ahead, in sensor yaw
  const gaze=async(x:number)=>{const b=button(x);await look(page,centre+b.yaw,b.pitch)};
  await gaze(BUTTON.right);
  await expect.poll(()=>read(page,'vehicle().indicator'),{timeout:10_000}).toBe('right');
  await gaze(BUTTON.go);
  await page.waitForTimeout(400);
  await page.screenshot({path:testInfo.outputPath('g10-04-gazing-at-go.png')});
  await expect.poll(()=>read(page,'viewer().cruise'),{timeout:10_000}).toBe(true);
  await look(page,centre,0);
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:20_000}).toBeGreaterThan(2);
  await page.screenshot({path:testInfo.outputPath('g10-05-moving.png')});
  // Gaze Stop: brakes and holds.
  await gaze(BUTTON.stop);
  await expect.poll(()=>read(page,'viewer().holding'),{timeout:10_000}).toBe(true);
  await look(page,centre,0);
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:20_000}).toBeLessThan(.1);

  // Controller: RT accelerates while held; LT brakes; LB signals left.
  await pad(page,7,true);
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:20_000}).toBeGreaterThan(1);
  await pad(page,7,false);
  await pad(page,6,true);
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:20_000}).toBeLessThan(.1);
  await pad(page,6,false);
  await pad(page,4,true);
  await expect.poll(()=>read(page,'vehicle().indicator'),{timeout:10_000}).toBe('left');
  await pad(page,4,false);

  // A tap on the screen pauses and leaves the viewer; the normal screen is back.
  await page.touchscreen.tap(466,215);
  await expect(page.locator('#screen-paused')).toBeVisible();
  v=await read(page,'viewer()');
  expect(v.active).toBe(false);
  expect(v.activeCameras).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('g10-06-tap-pauses-and-leaves.png')});
  await page.waitForTimeout(600);
  await page.click('#resume-button');
  await expect(page.locator('[data-hold=throttle]')).toBeVisible();
});

test('G10: phone viewer without motion access explains why and stays on the exercise screen',async({page})=>{
  await page.addInitScript(()=>{(DeviceOrientationEvent as any).requestPermission=async()=>'denied'});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await page.click('#viewer-start');
  await expect(page.locator('#viewer-status')).toContainText('Motion access was refused');
  expect(await read(page,'viewer().active')).toBe(false);
  expect(await read(page,'session()')).toBe('ready');
});
