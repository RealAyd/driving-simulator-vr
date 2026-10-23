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
/** Presses until the app has seen it (buttons are read once per frame), then releases until it has seen that too. */
async function tap(page:Page,index:number,until:()=>Promise<boolean>){
  await pad(page,index,true);
  await expect.poll(until,{timeout:10_000}).toBe(true);
  await pad(page,index,false);
  // Frames can be slow in this test browser: wait for two to pass, so the next press is a new one.
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(null)))));
  await page.waitForTimeout(50);
}

/** This controller's (deliberately non-standard) layout. */
const LAYOUT={accelerate:1,brake:0,'signal-left':2,'signal-right':3,pause:11,recentre:10} as const;

async function openExercise(page:Page){
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  // The headset options are folded under "Phone headset" on the exercise screen.
  await page.click('#viewer-details > summary');
}

/**
 * The input check: remap each control to this controller's layout, press each once, Done.
 * `slowScene`: when frames are slow (a full route, or a busy machine) a remap press can also count as working.
 */
async function checkController(page:Page,slowScene=false){
  await unplug(page,true);
  await page.click('#controller-check-open');
  await expect(page.locator('#controller-raw')).toContainText('Test controller (odd layout)');
  for(const [action,index] of Object.entries(LAYOUT)){
    await page.click(`[data-remap="${action}"]`);
    await pad(page,index,true);
    await expect(page.locator('#controller-actions tr',{hasText:''}).filter({has:page.locator(`[data-remap="${action}"]`)})).toContainText(`button ${index}`);
    await pad(page,index,false);
  }
  if(!slowScene)await expect(page.locator('#controller-done')).toBeDisabled();
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
  const start=aimAt({x:EYE.x,y:EYE.y-.3,z:EYE.z-1.2});
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
  const exit=aimAt({x:EYE.x+.27,y:EYE.y+.02-.29-.07,z:EYE.z-1.3+.02});
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
  // Any of its controls starts it (here Brake: it does not move the car, and Accelerate still needs a fresh press).
  await tap(page,LAYOUT.brake,async()=>!(await read(page,'viewer().starting')));
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
  // Let two frames render after resuming: a control already down when play resumes counts as held through the
  // pause and is ignored until pressed again (by design), so on a slow machine a press made before the first
  // frame after resuming would be ignored.
  await read(page,'resetPerf()');
  await expect.poll(async()=>(await read(page,'perf()')).frames,{timeout:30_000}).toBeGreaterThanOrEqual(2);

  // Controller lost: pause, acceleration dropped; reconnecting does not resume; accelerate held through it does nothing until pressed again.
  await pad(page,LAYOUT.accelerate,true);
  await expect.poll(async()=>(await read(page,'lastControls()')).throttle,{timeout:20_000}).toBeGreaterThan(0);
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

test('G10: controls set on the controller check are kept: part-way (Cancel) and, once checked, on the next visit',async({page})=>{
  await wearPhone(page);
  await openExercise(page);
  // Part-way: Brake set to button 5, then Cancel. Back again: still button 5.
  await unplug(page,true);
  await page.click('#controller-check-open');
  await expect(page.locator('#controller-raw')).toContainText('Test controller (odd layout)');
  await page.click('[data-remap="brake"]');
  await pad(page,5,true);
  const brakeRow=page.locator('#controller-actions tr').filter({has:page.locator('[data-remap="brake"]')});
  await expect(brakeRow).toContainText('button 5');
  await pad(page,5,false);
  await page.click('#controller-cancel');
  await openExercise(page);
  await unplug(page,true);
  await page.click('#controller-check-open');
  await expect(brakeRow).toContainText('button 5');
  await page.click('#controller-cancel');
  // Checked in full, then a new visit: the same controller connected is ready to drive with, no check needed.
  await checkController(page);
  await openExercise(page);
  await unplug(page,true);
  await expect(page.locator('#viewer-drive')).toBeEnabled({timeout:10_000});
  await expect(page.locator('#viewer-drive-status')).toContainText('Controller checked: Test controller (odd layout)');
  // Calibrating the viewer in between leaves the controller as it was.
  await page.click('#viewer-calibrate');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('calibration');
  await look(page,0,0);
  await page.waitForTimeout(3500);
  const done=aimAt({x:EYE.x+.35,y:EYE.y+.02-.29-.07,z:EYE.z-1.3+.02});
  await look(page,done.yaw,done.pitch);
  await expect.poll(()=>read(page,'viewer().mode'),{timeout:15_000}).toBe(null);
  await expect(page.locator('#viewer-drive')).toBeEnabled();
  await page.click('#controller-check-open');
  await expect(page.locator('#controller-saved')).toContainText('✓ Saved on this phone for Test controller (odd layout): Accelerate button 1');
  await expect(brakeRow).toContainText('button 0');
});

for(const angle of [90,270] as const){
  test(`G10: head tracking with the phone in landscape ${angle===90?'one way':'the other way round'} (screen angle ${angle}): right is right, down is down`,async({page})=>{
    await wearPhone(page,angle);
    await openExercise(page);
    await page.click('#viewer-familiarise');
    await expect.poll(()=>read(page,'viewer().receiving')).toBe(true);
    await page.waitForTimeout(3300);
    const start=aimAt({x:EYE.x,y:EYE.y-.3,z:EYE.z-1.2});
    await look(page,start.yaw,start.pitch);
    await expect.poll(()=>read(page,'viewer().starting'),{timeout:10_000}).toBe(false);
    await look(page,30,-10);
    // (Recentring at Start sets straight ahead from side to side only: up and down stay as looked.)
    await expect.poll(async()=>{const h=await read(page,'head()');return Math.abs(h.yaw*180/Math.PI-30)<2&&Math.abs(h.pitch*180/Math.PI-(-10))<2.5},{timeout:5000}).toBe(true);
  });
}

test('G10: calibration: eye spacing from 63 mm, adjustments saved per viewer, reset to defaults; offset, drift and reading rate measured separately',async({page},testInfo)=>{
  await wearPhone(page);
  await openExercise(page);
  await expect(page.locator('#viewer-summary')).toContainText('provisional');
  await page.click('#viewer-calibrate');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('calibration');
  expect((await read(page,'viewer()')).settings.ipdMm).toBe(63);
  // Eye spacing "+" by gaze (first setting, below the title and the instruction line; right-hand button).
  // (The menu panel: viewerHud MENU, 0.9 × 0.58 m at 1.3 m, lines 104 px apart from 100 px on a 990 px texture.)
  const panel={x:EYE.x,y:EYE.y+.02,z:EYE.z-1.3};
  const rowY=(i:number)=>panel.y+.29-(100+i*104-66*.35)/990*.58;
  const plus=aimAt({x:panel.x+.38,y:rowY(2),z:panel.z+.02});
  // Look straight ahead while the viewer settles, then at "+" (as for Reset below).
  await look(page,0,0);
  await page.waitForTimeout(1500);
  await look(page,plus.yaw,plus.pitch);
  await expect.poll(async()=>(await read(page,'viewer()')).settings.ipdMm,{timeout:20_000}).toBe(64);
  await look(page,0,0);
  await page.screenshot({path:testInfo.outputPath('g10-07-calibration.png')});
  // Offset: after Recentre, 0° (this is not lag and not drift).
  const recentre=aimAt({x:panel.x,y:panel.y-.29-.07,z:panel.z+.02});
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
  await page.click('#viewer-details > summary');
  await page.selectOption('#viewer-slot','Viewer 2');
  expect((await read(page,'viewer()')).settings.ipdMm).toBe(63);
  await page.selectOption('#viewer-slot','Viewer 1');
  await page.click('#viewer-calibrate');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('calibration');
  // Look straight ahead while the viewer settles after the reload, then at Reset.
  await look(page,0,0);
  await page.waitForTimeout(1500);
  // Reset to the preset needs a deliberate look (3 s), set apart from Done.
  const reset=aimAt({x:panel.x-.35,y:panel.y-.29-.07,z:panel.z+.02});
  await look(page,reset.yaw,reset.pitch);
  await expect.poll(async()=>(await read(page,'viewer()')).settings.ipdMm,{timeout:20_000}).toBe(63);
  // Done: back to the exercise screen, which says what was saved.
  const done=aimAt({x:panel.x+.35,y:panel.y-.29-.07,z:panel.z+.02});
  await look(page,done.yaw,done.pitch);
  await expect.poll(()=>read(page,'viewer().mode'),{timeout:15_000}).toBe(null);
  await expect(page.locator('#viewer-status')).toContainText('Viewer settings saved for Viewer 1');
});

test('G10: mock test in the headset: the tell me question and its answers are shown, an answer is chosen by looking at it, then the drive starts',async({page})=>{
  test.setTimeout(400_000);
  await wearPhone(page);
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=test]');
  await page.click('[data-exercise=goodmayes]');
  await expect(page.locator('#busy')).toBeHidden({timeout:300_000});
  await page.click('#viewer-details > summary');
  await checkController(page,true);
  await page.click('#viewer-drive');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('driving');
  await look(page,0,0);
  await page.waitForTimeout(3500);
  await tap(page,LAYOUT.brake,async()=>!(await read(page,'viewer().starting')));
  // The question is in the headset as three answer cards, not only on the (unseen) phone screen.
  await expect.poll(async()=>(await read(page,'viewer().items')).join(),{timeout:60_000}).toContain('tell-0');
  expect(await read(page,'viewer().items')).toEqual(expect.arrayContaining(['tell-0','tell-1','tell-2']));
  // Glancing across the cards chooses nothing.
  await look(page,0,-14);
  await page.waitForTimeout(1500);
  expect((await read(page,'viewer().items')).join()).not.toContain('tell-go');
  // Looking at answer A for a couple of seconds chooses it; then "Start the drive" appears.
  const a=aimAt({x:EYE.x-.5,y:EYE.y-.34,z:EYE.z-1.25});
  await look(page,a.yaw,a.pitch);
  await expect.poll(async()=>(await read(page,'viewer().items')).join(),{timeout:20_000}).toContain('tell-go');
  const g=aimAt({x:EYE.x,y:EYE.y-.63,z:EYE.z-1.25});
  await look(page,g.yaw,g.pitch);
  await expect.poll(async()=>(await read(page,'viewer().items')).join(),{timeout:20_000}).not.toContain('tell');
  await expect(page.locator('#hud-question')).toBeHidden();
  expect((await read(page,'examiner()')).phase).toBe('briefing');
});

test('G10: steering in the headset: chosen on the controller screen or with Signal left/right before the start and while paused; the stick steers, also from behind the car (Change view); settings say they are saved',async({page})=>{
  await wearPhone(page);
  await openExercise(page);
  await checkController(page,true);
  await expect(page.locator('#viewer-status')).toContainText('✓ Controller settings saved on this phone for Test controller (odd layout)');
  // Back on the controller screen: what is saved is listed, and each change says it was saved.
  await page.click('#controller-check-open');
  await expect(page.locator('#controller-saved')).toContainText('✓ Saved on this phone for Test controller (odd layout): Accelerate button 1, Brake button 0');
  await expect(page.locator('#controller-saved')).toContainText('Checked: ready to drive');
  // This controller reports no standard layout: the stick is set like any other control (pushed either way).
  await page.click('[data-remap="steer"]');
  await page.evaluate(()=>{(window as any).__pad.axes[0]=-.95});
  await expect(page.locator('#controller-actions tr').filter({has:page.locator('[data-remap="steer"]')})).toContainText('stick/axis 0 +');
  await page.evaluate(()=>{(window as any).__pad.axes[0]=0});
  await page.click('[data-remap="view"]');
  await pad(page,5,true);
  await expect(page.locator('#controller-actions tr').filter({has:page.locator('[data-remap="view"]')})).toContainText('button 5');
  await pad(page,5,false);
  await page.selectOption('#controller-steering','stick');
  await expect(page.locator('#controller-saved')).toContainText('Steering in the headset: Left stick');
  await page.click('#controller-cancel');

  await page.click('#viewer-drive');
  await expect.poll(()=>read(page,'viewer().mode')).toBe('driving');
  await look(page,0,0);
  await page.waitForTimeout(3300);
  expect(await read(page,'steering()')).toBe('stick');
  // Signal right/left step through the choices and do not start the drive.
  await tap(page,LAYOUT['signal-right'],async()=>(await read(page,'steering()'))==='buttons');
  await tap(page,LAYOUT['signal-left'],async()=>(await read(page,'steering()'))==='stick');
  expect(await read(page,'viewer().starting')).toBe(true);
  await tap(page,LAYOUT.brake,async()=>!(await read(page,'viewer().starting')));
  // Accelerate counts once the app has seen it released after the start (frames are slow in this test browser).
  await expect(async()=>{
    await pad(page,LAYOUT.accelerate,false);
    await page.waitForTimeout(500);
    await pad(page,LAYOUT.accelerate,true);
    await expect.poll(async()=>(await read(page,'lastControls()')).throttle,{timeout:2000}).toBeGreaterThan(0);
  }).toPass({timeout:20_000});
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:20_000}).toBeGreaterThan(2);
  await page.evaluate(()=>{(window as any).__pad.axes[0]=.9});
  await expect.poll(async()=>(await read(page,'lastControls()')).steer).toBeGreaterThan(.6);
  await page.evaluate(()=>{(window as any).__pad.axes[0]=0});
  await expect.poll(async()=>(await read(page,'lastControls()')).steer).toBe(0);
  await pad(page,LAYOUT.accelerate,false);
  // Change view (set to button 5 on this controller): behind the car and back; the stick still steers from there.
  await tap(page,5,async()=>(await read(page,'behind()')).on);
  expect((await read(page,'behind()')).carModel).toBe(true);
  await page.evaluate(()=>{(window as any).__pad.axes[0]=-.9});
  await expect.poll(async()=>(await read(page,'lastControls()')).steer).toBeLessThan(-.6);
  await page.evaluate(()=>{(window as any).__pad.axes[0]=0});
  await page.waitForTimeout(1200);
  expect((await read(page,'behind()')).seconds).toBeGreaterThan(.5);
  await tap(page,5,async()=>!(await read(page,'behind()')).on);
  // Paused: Signal left changes the steering (it is remembered on this phone).
  await tap(page,LAYOUT.pause,async()=>(await read(page,'session()'))==='paused');
  await tap(page,LAYOUT['signal-left'],async()=>(await read(page,'steering()'))==='assist');
  expect(await page.evaluate(()=>localStorage.getItem('dp.viewer.steering.v1'))).toBe('assist');
});

test('G10: a controller checked before: Done is ready straight away; on the screen it drives a lesson too; the headset waits for a lesson to be chosen',async({page})=>{
  test.setTimeout(400_000);
  await wearPhone(page);
  await openExercise(page);
  await checkController(page,true);
  // Back to the settings: its saved controls loaded and already shown to work, so Done is ready.
  await page.click('#controller-check-open');
  await expect(page.locator('#controller-done')).toBeEnabled();
  await expect(page.locator('#controller-done')).toHaveText('Done');
  // Set one control again: that one must be pressed before Done, and Done says so.
  await page.click('[data-remap="pause"]');
  await pad(page,11,true);
  await expect(page.locator('#controller-actions tr').filter({has:page.locator('[data-remap="pause"]')})).toContainText('button 11');
  await pad(page,11,false);
  await expect(page.locator('#controller-done')).toHaveText('Done (press 1 more)');
  await expect(page.locator('#controller-check-status')).toContainText('press each of these once on the controller: Pause');
  await tap(page,11,async()=>(await page.locator('#controller-done').textContent())==='Done');
  await page.click('#controller-done');
  await expect(page.locator('#screen-controller')).toBeHidden();

  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=lesson]');
  await page.click('[data-exercise=goodmayes]');
  await unplug(page,true);
  await expect(page.locator('#pad-screen-status')).toContainText('it drives on the screen too');
  await page.click('#viewer-details > summary');
  await expect(page.locator('#viewer-drive')).toBeDisabled();
  await expect(page.locator('#viewer-drive-status')).toContainText('Choose a lesson first');
  await page.click('[data-lesson=left-turns]');
  await expect(page.locator('#viewer-drive')).toBeEnabled();
  // The lesson on the screen, driven with the controller.
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:200_000}).toBe('running');
  await pad(page,LAYOUT.accelerate,true);
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:30_000}).toBeGreaterThan(1);
  await pad(page,LAYOUT.accelerate,false);
  await tap(page,LAYOUT['signal-left'],async()=>(await read(page,'vehicle()')).indicator==='left');
  await tap(page,LAYOUT.pause,async()=>(await read(page,'session()'))==='paused');
  await tap(page,LAYOUT.pause,async()=>(await read(page,'session()'))==='running');
  await pad(page,LAYOUT.brake,true);
  await expect.poll(async()=>(await read(page,'lastControls()')).brake).toBeGreaterThan(0);
  await pad(page,LAYOUT.brake,false);
});
