import fs from 'node:fs';
import {expect,test,type Page} from '@playwright/test';

// Soak (SOAK=1 npx playwright test s1-soak): mock tests at several test centres, minutes each, driven by a bot with
// assisted steering. Records what goes wrong rather than stopping at the first thing: page errors, console errors,
// the car stuck or off the road, the examiner's progress and new directions, the voice (clips, device voice,
// dropped, waits), memory and frame rate. The report is attached to the test's output (soak-report.json).
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.skip(!process.env.SOAK,'soak runs only with SOAK=1');
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const MINUTES=Number(process.env.SOAK_MINUTES??4);
const CENTRES=(process.env.SOAK_CENTRES??'Goodmayes,Leeds,Aberfeldy,Belvedere,Chelmsford').split(',');

/** The bot: about 15 mph, 8 mph near a junction, waits behind traffic; brakes hard on "Stop!". */
const pedal=(page:Page)=>page.evaluate(`(()=>{const d=window.__drivingPractice,v=d.vehicle(),fx=Math.sin(v.heading),fz=-Math.cos(v.heading);
  const ahead=d.traffic().filter(c=>c.visible).some(c=>{const ox=c.pose.position.x-v.position.x,oz=c.pose.position.z-v.position.z,a=ox*fx+oz*fz;return a>0&&a<12&&Math.abs(ox*fz-oz*fx)<1.95});
  const e=d.examiner();if(e&&e.manoeuvre&&e.manoeuvre.phase==='stopping'&&document.querySelector('#hud-flash:not([hidden])'))return 'brake';
  if(e&&(e.phase==='stopping'||e.phase==='finished'))return 'brake';
  const st=e&&e.steps[e.index],slow=st&&Math.hypot(st.at.x-v.position.x,st.at.z-v.position.z)<28,top=slow?3.5:6.5;
  const s=Math.abs(v.speed);return {ahead,want:ahead||s>top+1.5?(s>.2?'brake':'hold'):s<top?'go':'coast'}})()`) as Promise<any>;

for(const centre of CENTRES)test(`soak: mock test at ${centre}`,async({page},testInfo)=>{
  test.setTimeout((MINUTES+4)*60_000);
  const errors:string[]=[],consoleErrors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,200))});
  await page.route('https://api.postcodes.io/**',()=>new Promise(()=>{}));
  await page.goto('./?routeSeed=5');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=test]');
  await page.click('[data-difficulty=easy]');
  if(centre==='Goodmayes')await page.click('[data-exercise=goodmayes]');
  else{
    await page.fill('#area-query',centre);
    await page.locator('#area-results button',{hasText:new RegExp(`^${centre}`)}).first().click();
  }
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:90_000});
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  const report0:any={};
  // The tell me question first (the car is held until it is answered).
  await expect(page.locator('#hud-question')).toBeVisible({timeout:30_000});
  await page.keyboard.down('KeyW');await page.waitForTimeout(1500);await page.keyboard.up('KeyW');
  report0.heldDuringQuestion=Math.abs((await read(page,'vehicle()')).speed)<.1;
  await page.locator('#hud-question-choices button').first().click();
  await page.click('#hud-question-go');
  const heap=async()=>page.evaluate(()=>((performance as any).memory?.usedJSHeapSize??0)/1e6);
  const report:any={...report0,centre,samples:0,offRoad:0,stuckEpisodes:[] as string[],fpsMin:999,fpsSum:0,heapStart:await heap(),indexMax:0,phases:new Set<string>()};
  const end=Date.now()+MINUTES*60_000;
  let held:string|null=null,stillSince=Date.now();
  const hold=async(key:string|null)=>{if(held===key)return;if(held)await page.keyboard.up(held);if(key)await page.keyboard.down(key);held=key};
  while(Date.now()<end){
    if(await read(page,'session()')!=='running'){report.ended=await read(page,'session()');break}
    const p=await pedal(page);
    const want=typeof p==='string'?p:p.want;
    await hold(want==='go'?'KeyW':want==='brake'?'KeyS':null);
    const v=await read(page,'vehicle()'),e=await read(page,'examiner()'),fps=await read(page,'fps()');
    report.samples++;report.fpsSum+=fps;report.fpsMin=Math.min(report.fpsMin,fps||999);
    if(v.surface!=='carriageway')report.offRoad++;
    report.indexMax=Math.max(report.indexMax,e?.index??0);report.phases.add(e?.phase);
    if(Math.abs(v.speed)>.5||want!=='go'||e?.manoeuvre||e?.phase==='finished')stillSince=Date.now();
    else if(Date.now()-stillSince>20_000){
      report.stuckEpisodes.push(`at ${v.position.x.toFixed(0)},${v.position.z.toFixed(0)} (${await page.locator('#hud-place').textContent()}) phase ${e?.phase}`);
      await page.screenshot({path:testInfo.outputPath(`stuck-${report.stuckEpisodes.length}.png`)});
      // Back off and try again (the car may be against something).
      await hold('KeyS');await page.waitForTimeout(400);await hold(null);
      stillSince=Date.now();
      if(report.stuckEpisodes.length>4)break;
    }
    await page.waitForTimeout(250);
  }
  await hold(null);
  const events:any[]=await read(page,'events()');
  report.redirects=events.filter(x=>x.type==='examiner.redirected').length;
  report.directions=events.filter(x=>x.type==='examiner.direction').map((x:any)=>x.payload.text);
  report.collisions=events.filter(x=>x.type==='vehicle.collision').map((x:any)=>x.payload.obstacleId);
  report.findings=events.filter(x=>x.type==='assessment.finding').map((x:any)=>x.payload.ruleId);
  report.voice=await read(page,'voice()');
  report.heapEnd=await heap();
  report.fpsAvg=report.fpsSum/Math.max(1,report.samples);
  report.phases=[...report.phases];
  report.errors=errors;report.consoleErrors=consoleErrors;
  await page.screenshot({path:testInfo.outputPath('end.png')});
  fs.writeFileSync(testInfo.outputPath('soak-report.json'),JSON.stringify(report,null,1));
  console.log(`SOAK ${centre}: ${JSON.stringify({...report,directions:report.directions.length,collisions:report.collisions.length,findings:report.findings.length})}`);
  expect(errors).toEqual([]);
});
