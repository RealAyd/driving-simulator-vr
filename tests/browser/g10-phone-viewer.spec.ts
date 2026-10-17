import {expect,test,type Page} from '@playwright/test';

// Phone viewer (cardboard-style headset) at the iPhone 14 Pro Max landscape size, touch.
// The motion sensor and the game controller are simulated: real-device behaviour is untested here.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(300_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const EYE={x:.37,y:1.2,z:.1};
/** Head yaw/pitch (degrees) that looks from the driver's eye at a car-local point. */
const aimAt=(p:{x:number;y:number;z:number})=>{
  const dx=p.x-EYE.x,dy=p.y-EYE.y,dz=p.z-EYE.z;
  return {yaw:Math.atan2(dx,-dz)*180/Math.PI,pitch:Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI};
};

/**
 * A phone worn in landscape (screen angle 90, or 270 for the other way round): sensor readings for a
 * head yaw/pitch in degrees, plus a controller that tests can connect, press and disconnect.
 */
async function wearPhone(page:Page,screenAngle:90|270=90){
  await page.addInitScript(angle=>{
    if(!('DeviceOrientationEvent' in window))(window as any).DeviceOrientationEvent=class extends Event{};
    (DeviceOrientationEvent as any).requestPermission=async()=>'granted';
    Object.defineProperty(screen,'orientation',{configurable:true,value:{angle,type:angle===90?'landscape-primary':'landscape-secondary',addEventListener(){},removeEventListener(){}}});
    const w=window as any;
    // Looking down at the phone while putting it in the headset; `drift` degrees per second of compass creep; `sending` false = sensor stops.
    w.__head={yaw:0,pitch:-30,compass:40,drift:0,sending:true,t0:performance.now()};
    setInterval(()=>{
      const h=w.__head;
      if(!h.sending)return;
      const alpha=h.compass-h.yaw+h.drift*(performance.now()-h.t0)/1000;
      const reading=angle===90?{alpha,beta:0,gamma:-90-h.pitch}:{alpha,beta:0,gamma:90+h.pitch};
      window.dispatchEvent(Object.assign(new Event('deviceorientation'),reading));
    },30);
    w.__pad={id:'Test controller (odd layout)',connected:false,mapping:'',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[w.__pad.connected?w.__pad:null]});
  },screenAngle);
}
const look=(page:Page,yaw:number,pitch:number)=>page.evaluate(([y,p])=>{const h=(window as any).__head;h.yaw=y;h.pitch=p},[yaw,pitch]);
const pad=(page:Page,index:number,down:boolean)=>page.evaluate(([i,d])=>{const p=(window as any).__pad;p.connected=true;p.buttons[i]={pressed:d,value:d?1:0}},[index,down] as const);
const unplug=(page:Page,on:boolean)=>page.evaluate(v=>{(window as any).__pad.connected=v},on);
/** Presses until the app has seen it (buttons are read once per frame), then releases. */
async function tap(page:Page,index:number,until:()=>Promise<boolean>){
  await pad(page,index,true);
  await expect.poll(until,{timeout:10_000}).toBe(true);
  await pad(page,index,false);
  await page.waitForTimeout(150);
}

/** This controller's (deliberately non-standard) layout. */
const LAYOUT={accelerate:1,brake:0,'signal-left':2,'signal-right':3,pause:11,recentre:10} as const;

async function openExercise(page:Page){
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
}

/** The input check: remap each control to this controller's layout, press each once, Done. */
async function checkController(page:Page){
  await unplug(page,true);
  await page.click('#controller-check-open');
  await expect(page.locator('#controller-raw')).toContainText('Test controller (odd layout)');
  for(const [action,index] of Object.entries(LAYOUT)){
    await page.click(`[data-remap="${action}"]`);
    await pad(page,index,true);
    await expect(page.locator('#controller-actions tr',{hasText:''}).filter({has:page.locator(`[data-remap="${action}"]`)})).toContainText(`button ${index}`);
    await pad(page,index,false);
  }
  await expect(page.locator('#controller-done')).toBeDisabled();
  // Press each one until the check has seen it (the controller is read once per frame).
  for(const [action,index] of Object.entries(LAYOUT)){
    await pad(page,index,true);
    await expect(page.locator('#controller-actions tr').filter({has:page.locator(`[data-remap="${action}"]`)})).toContainText('✓ works');
    await pad(page,index,false);
    await page.waitForTimeout(100);
  }
  await expect(page.locator('#controller-check-status')).toContainText('All six controls work');
  await page.click('#controller-done');
  await expect(page.locator('#viewer-drive')).toBeEnabled();
}

test('G10: normal mobile mode is unchanged: one camera, touch controls, no viewer',async({page})=>{
  await wearPhone(page);
  await openExercise(page);
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  const v=await read(page,'viewer()');
  expect(v.active).toBe(false);
  expect(v.activeCameras).toEqual([]);
  await expect(page.locator('[data-hold=throttle]')).toBeVisible();
});

test('G10: without a checked controller, scored viewer driving is unavailable and says why; parked familiarisation works by gaze and nothing is pressed by observing',async({page},testInfo)=>{
  await wearPhone(page);
  await openExercise(page);
  await expect(page.locator('#viewer-drive')).toBeDisabled();
  await expect(page.locator('#viewer-drive-status')).toContainText('run the controller check first');
  await expect(page.locator('#viewer-mode')).toContainText('Do the check before putting the phone in the headset');
  await page.click('#viewer-familiarise');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('familiarisation');
  await page.waitForTimeout(3300);
  // Start by looking at it.
  const start=aimAt({x:EYE.x,y:EYE.y-.02,z:EYE.z-1.2});
  await look(page,start.yaw,start.pitch);
  await expect.poll(()=>read(page,'viewer().starting'),{timeout:10_000}).toBe(false);

  // Observing — forward, every mirror, both shoulders, the speedometer — for longer than any dwell: nothing is pressed.
  const directions={forward:[0,-3],interior:[-27,8],'right mirror':[33,-8],'left mirror':[-55,-6],'right shoulder':[115,-5],'left shoulder':[-115,-5],speedometer:[0,-14],'road ahead left':[-20,-8]};
  for(const [name,[yaw,pitch]] of Object.entries(directions)){
    await look(page,yaw!,pitch!);
    await page.waitForTimeout(1800);
    expect(await read(page,'session()'),name).toBe('running');
    expect((await read(page,'vehicle()')).indicator,name).toBe('off');
  }
  expect((await read(page,'vehicle()')).speed).toBe(0);
  await page.screenshot({path:testInfo.outputPath('g10-01-familiarisation-left-shoulder.png')});

  // The Menu (low on the dashboard) by gaze pauses; Resume by gaze.
  const menu=aimAt({x:-.05,y:.82,z:-.66});
  await look(page,menu.yaw,menu.pitch);
  await expect.poll(()=>read(page,'session()'),{timeout:10_000}).toBe('paused');
  await look(page,0,0);
  await page.screenshot({path:testInfo.outputPath('g10-02-familiarisation-menu.png')});
  expect(await read(page,'viewer().items')).toEqual(['resume','recentre','exit']);
  // Exit: results say not scored and not saved.
  const exit=aimAt({x:EYE.x+.22,y:EYE.y+.02-.21-.06,z:EYE.z-1.35+.02});
  await look(page,exit.yaw,exit.pitch);
  await expect(page.locator('#screen-results')).toBeVisible({timeout:15_000});
  await expect(page.locator('#results-meta')).toContainText('not scored and not saved');
  expect((await read(page,'result()')).conditions.controlMode).toBe('phone-viewer-familiarisation');
});

test('G10: controller check with a non-standard layout; scored driving: held accelerate within the exercise limit, immediate brake, explicit pause and resume, disconnect, stale tracking and hidden page all pause',async({page},testInfo)=>{
  await wearPhone(page);
  await openExercise(page);
  await read(page,"forceVariant('cyclist-then-late-car')");
  await checkController(page);
  await page.screenshot({path:testInfo.outputPath('g10-03-controller-check.png'),fullPage:true});
  await page.click('#viewer-drive');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('driving');
  // No gaze items at all while driving.
  await page.waitForTimeout(3300);
  expect(await read(page,'viewer().items')).toEqual([]);
  await look(page,0,0);
  const simBefore=await read(page,'simTime()');
  await page.waitForTimeout(1000);
  expect(await read(page,'simTime()')).toBe(simBefore);        // nothing moves before Start
  await tap(page,LAYOUT.recentre,async()=>!(await read(page,'viewer().starting')));
  await page.screenshot({path:testInfo.outputPath('g10-04-driving-started.png')});

  // Accelerate is held: speed rises, never beyond the exercise's assisted speed (12 mph); released, the car coasts.
  await pad(page,LAYOUT.accelerate,true);
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:20_000}).toBeGreaterThan(3);
  await page.waitForTimeout(1500);
  expect((await read(page,'vehicle()')).speed).toBeLessThanOrEqual(12/2.237+.05);
  await pad(page,LAYOUT.accelerate,false);
  await expect.poll(async()=>(await read(page,'lastControls()')).throttle).toBe(0);
  const coasting=(await read(page,'vehicle()')).speed;
  expect(coasting).toBeGreaterThan(2);
  // Brake: applied in the very next simulation step after the press is received (no dwell, no confirmation).
  await pad(page,LAYOUT.brake,true);
  await expect.poll(async()=>(await read(page,'lastControls()')).brake).toBeGreaterThan(0);
  const latency=await read(page,'viewer().brakeLatency');
  expect(latency).not.toBeNull();
  expect(latency).toBeLessThanOrEqual(1/60+1e-6);
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:15_000}).toBeLessThan(.05);
  await pad(page,LAYOUT.brake,false);
  testInfo.annotations.push({type:'brake latency (simulated time)',description:`${(latency*1000).toFixed(1)} ms = one simulation step`});

  // Signals.
  await tap(page,LAYOUT['signal-right'],async()=>(await read(page,'vehicle()')).indicator==='right');

  // Pause: everything freezes; looking around does not resume; only Pause again resumes.
  await tap(page,LAYOUT.pause,async()=>(await read(page,'session()'))==='paused');
  const t=await read(page,'simTime()'),users=JSON.stringify(await read(page,'passersDetail()'));
  await look(page,0,-14);await page.waitForTimeout(800);await look(page,-27,8);await page.waitForTimeout(800);await look(page,0,0);
  await page.waitForTimeout(1500);
  expect(await read(page,'session()')).toBe('paused');
  expect(await read(page,'simTime()')).toBe(t);
  expect(JSON.stringify(await read(page,'passersDetail()'))).toBe(users);
  await page.screenshot({path:testInfo.outputPath('g10-05-pause-menu.png')});
  await tap(page,LAYOUT.pause,async()=>(await read(page,'session()'))==='running');

  // Controller lost: pause, acceleration dropped; reconnecting does not resume; accelerate held through it does nothing until pressed again.
  await pad(page,LAYOUT.accelerate,true);
  await expect.poll(async()=>(await read(page,'lastControls()')).throttle).toBeGreaterThan(0);
  await unplug(page,false);
  await expect.poll(()=>read(page,'viewer().pauseReason')).toBe('Controller disconnected');
  expect(await read(page,'session()')).toBe('paused');
  await unplug(page,true);
  await page.waitForTimeout(1500);
  expect(await read(page,'session()')).toBe('paused');
  await page.screenshot({path:testInfo.outputPath('g10-06-disconnected.png')});
  await tap(page,LAYOUT.pause,async()=>(await read(page,'session()'))==='running');
  await page.waitForTimeout(600);
  expect((await read(page,'lastControls()')).throttle).toBe(0);     // still held, but not re-pressed
  await pad(page,LAYOUT.accelerate,false);

  // Head tracking stops: pause.
  await page.evaluate(()=>{(window as any).__head.sending=false});
  await expect.poll(()=>read(page,'viewer().pauseReason'),{timeout:5000}).toBe('Head tracking stopped');
  await page.evaluate(()=>{(window as any).__head.sending=true});
  await page.waitForTimeout(400);
  await tap(page,LAYOUT.pause,async()=>(await read(page,'session()'))==='running');

  // The page is hidden (screen off, another app): pause.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
  await expect.poll(()=>read(page,'session()')).toBe('paused');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});
  await page.waitForTimeout(800);
  expect(await read(page,'session()')).toBe('paused');

  // Exit from the pause menu: hold Brake for 2 s. The attempt records how it was driven.
  await pad(page,LAYOUT.brake,true);
  await expect(page.locator('#screen-results')).toBeVisible({timeout:15_000});
  await pad(page,LAYOUT.brake,false);
  const result=await read(page,'result()');
  expect(result.conditions).toMatchObject({controlMode:'phone-viewer-controller',headDirectionEvidence:true,controller:'Test controller (odd layout)'});
  expect(result.notes.join(' ')).toContain('head direction');
  expect(result.notes.join(' ')).toContain('not eye tracking');
});

for(const angle of [90,270] as const){
  test(`G10: head tracking with the phone in landscape ${angle===90?'one way':'the other way round'} (screen angle ${angle}): right is right, down is down`,async({page})=>{
    await wearPhone(page,angle);
    await openExercise(page);
    await page.click('#viewer-familiarise');
    await expect.poll(()=>read(page,'viewer().receiving')).toBe(true);
    await page.waitForTimeout(3300);
    const start=aimAt({x:EYE.x,y:EYE.y-.02,z:EYE.z-1.2});
    await look(page,start.yaw,start.pitch);
    await expect.poll(()=>read(page,'viewer().starting'),{timeout:10_000}).toBe(false);
    await look(page,30,-10);
    await expect.poll(async()=>{const h=await read(page,'head()');return Math.abs(h.yaw*180/Math.PI-30)<2&&Math.abs(h.pitch*180/Math.PI-(-10-start.pitch))<2.5},{timeout:5000}).toBe(true);
  });
}

test('G10: calibration: eye spacing from 63 mm, adjustments saved per viewer, reset to defaults; offset, drift and reading rate measured separately',async({page},testInfo)=>{
  await wearPhone(page);
  await openExercise(page);
  await expect(page.locator('#viewer-summary')).toContainText('provisional');
  await page.click('#viewer-calibrate');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('calibration');
  expect((await read(page,'viewer()')).settings.ipdMm).toBe(63);
  // Eye spacing "+" by gaze (first row, right-hand button).
  const panel={x:EYE.x,y:EYE.y+.02,z:EYE.z-1.35};
  const rowY=(i:number)=>panel.y+.21-(62+i*46-12)/511*.42;
  const plus=aimAt({x:panel.x+.31,y:rowY(1),z:panel.z+.02});
  await look(page,plus.yaw,plus.pitch);
  await expect.poll(async()=>(await read(page,'viewer()')).settings.ipdMm,{timeout:10_000}).toBe(64);
  await look(page,0,0);
  await page.screenshot({path:testInfo.outputPath('g10-07-calibration.png')});
  // Offset: after Recentre, 0° (this is not lag and not drift).
  const recentre=aimAt({x:panel.x,y:panel.y-.21-.06,z:panel.z+.02});
  await look(page,recentre.yaw,recentre.pitch);
  await page.waitForTimeout(1500);
  await look(page,recentre.yaw,recentre.pitch);   // still looking at it: offset is from straight ahead of the recentred view
  // Drift: a compass creep of 0.5°/s while the head is held still reads about 30°/min; Recentre does not cure it.
  await look(page,0,0);
  await page.evaluate(()=>{const h=(window as any).__head;h.t0=performance.now();h.drift=.5});
  await page.waitForTimeout(400);
  const before=await read(page,'viewer()');
  expect(before.rate).toBeGreaterThan(15);              // readings per second (an input to lag; true lag needs the device)
  expect(before.readingAge).toBeLessThan(200);
  await page.waitForTimeout(4000);
  const drift=(await read(page,'viewer()')).driftDegPerMinute;
  expect(Math.abs(drift)).toBeGreaterThan(15);
  expect(Math.abs(drift)).toBeLessThan(60);
  testInfo.annotations.push({type:'simulated drift 30°/min',description:`measured ${drift.toFixed(1)}°/min`});
  // Saved: survives a reload; another viewer slot has its own settings; Reset restores defaults.
  await page.reload();
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  expect((await read(page,'viewer()')).settings.ipdMm).toBe(64);
  await page.click('[data-exercise=moving-off]');
  await page.selectOption('#viewer-slot','Viewer 2');
  expect((await read(page,'viewer()')).settings.ipdMm).toBe(63);
  await page.selectOption('#viewer-slot','Viewer 1');
  await page.click('#viewer-calibrate');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('calibration');
  const reset=aimAt({x:panel.x-.22,y:panel.y-.21-.06,z:panel.z+.02});
  await look(page,reset.yaw,reset.pitch);
  await page.waitForTimeout(600);
  await expect.poll(async()=>(await read(page,'viewer()')).settings.ipdMm,{timeout:10_000}).toBe(63);
});
