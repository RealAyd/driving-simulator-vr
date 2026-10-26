import fs from 'node:fs';
import {expect,test,type CDPSession,type Page} from '@playwright/test';
import {pick} from './home';

// Device and network matrix (QA=1 npx playwright test qa-matrix; diagnostic, not in CI). Each profile is a screen,
// pixel density, touch or mouse, CPU slow-down and connection; each loads the app, builds Goodmayes, and drives a
// mock test with assisted steering and a bot on the pedals. Recorded: load times and bytes, draw calls and triangles
// in the driver's and the behind view, frame times (software rendering here: compare profiles, not absolute
// numbers), memory, errors, and the bugs owners have seen: road users stalled, the car drifting off its lane with
// assisted steering, cars drawn in one colour. The report is attached as qa-<profile>.json.
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
type Net={download:number;upload:number;latency:number}|null;
const NET:Record<string,Net>={fast:null,'4g':{download:9e6/8,upload:3e6/8,latency:170},'slow-3g':{download:4e5/8,upload:4e5/8,latency:400}};
// (Each drives in its conditions: the cheaper phones at night in the rain, the hardest case.)
const PROFILES:{id:string;width:number;height:number;dpr:number;touch:boolean;cpu:number;net:keyof typeof NET;drive:'day'|'night-rain'}[]=[
  {id:'iphone-se',width:667,height:375,dpr:2,touch:true,cpu:2,net:'4g',drive:'night-rain'},
  {id:'iphone-14',width:844,height:390,dpr:3,touch:true,cpu:1,net:'4g',drive:'day'},
  {id:'pixel-7',width:915,height:412,dpr:2.625,touch:true,cpu:2,net:'4g',drive:'night-rain'},
  {id:'low-android',width:640,height:360,dpr:2,touch:true,cpu:6,net:'slow-3g',drive:'night-rain'},
  {id:'ipad',width:1180,height:820,dpr:2,touch:true,cpu:1,net:'fast',drive:'day'},
  {id:'desktop',width:1366,height:768,dpr:1,touch:false,cpu:1,net:'fast',drive:'day'}
];
const only=process.env.QA_PROFILES?.split(',');
const DRIVE_SECONDS=Number(process.env.QA_SECONDS??90);

/** The bot's pedals: about 15 mph, 8 near a junction, waits behind traffic, stops when the examiner says so. */
const pedal=(page:Page)=>page.evaluate(`(()=>{const d=window.__drivingPractice,v=d.vehicle(),fx=Math.sin(v.heading),fz=-Math.cos(v.heading);
  const ahead=d.traffic().filter(c=>c.visible).some(c=>{const ox=c.pose.position.x-v.position.x,oz=c.pose.position.z-v.position.z,a=ox*fx+oz*fz;return a>0&&a<12&&Math.abs(ox*fz-oz*fx)<1.95});
  const e=d.examiner();if(e&&(e.phase==='stopping'||e.phase==='finished'||e.phase==='tell-me'))return 'brake';
  const st=e&&e.steps[e.index],slow=st&&Math.hypot(st.at.x-v.position.x,st.at.z-v.position.z)<28,top=slow?3.5:6.5;
  const s=Math.abs(v.speed);return ahead||s>top+1.5?(s>.2?'brake':'hold'):s<top?'go':'coast'})()`) as Promise<string>;

for(const p of PROFILES.filter(p=>!only||only.includes(p.id)))test(`QA: ${p.id}`,async({browser},testInfo)=>{
  test.skip(!process.env.QA,'diagnostic: QA=1');
  test.setTimeout(20*60_000);
  const context=await browser.newContext({viewport:{width:p.width,height:p.height},deviceScaleFactor:p.dpr,hasTouch:p.touch,isMobile:p.touch});
  const page=await context.newPage();
  const cdp:CDPSession=await context.newCDPSession(page);
  if(p.cpu>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:p.cpu});
  await cdp.send('Network.enable');
  const net=NET[p.net];
  if(net)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:net.latency,downloadThroughput:net.download,uploadThroughput:net.upload});
  let bytes=0;cdp.on('Network.loadingFinished',e=>{bytes+=e.encodedDataLength});
  const t0=Date.now();
  const errors:string[]=[],consoleErrors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message.slice(0,200)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,200))});
  const report:any={profile:p,errors,consoleErrors};
  const stage=(what:string)=>console.log(`QA-STAGE ${p.id} ${((Date.now()-t0)/1000).toFixed(0)}s ${what}`);
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:300_000});
  stage('home');report.homeSeconds=(Date.now()-t0)/1000;report.homeBytes=bytes;
  await page.evaluate(()=>addEventListener('webglcontextlost',()=>{(window as any).__lost=true},true));
  const t1=Date.now();
  await pick(page,'goodmayes','test');
  await expect(page.locator('#busy')).toBeHidden({timeout:600_000});
  stage('place built');report.placeSeconds=(Date.now()-t1)/1000;report.totalBytes=bytes;
  // (The bot steers with the assistance on every device: a desktop starts with the keys.)
  await page.locator('label.opt',{has:page.locator('input[name=steering][value=assist]')}).click();
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:300_000}).toBe('running');
  stage('running');report.renderer=await read(page,'renderer()');
  report.assist=await read(page,'assist()');
  // The tell me question first: answered with the first choice.
  await page.locator('#hud-question-choices button').first().click({timeout:30_000}).catch(()=>{});
  await page.click('#hud-question-go',{timeout:10_000}).catch(()=>{});
  await page.click('#hud-tip-close',{timeout:3000}).catch(()=>{});
  await read(page,'countDrawCalls()');
  const view=async(label:string)=>{
    await page.waitForTimeout(1500);await read(page,'resetPerf()');await page.waitForTimeout(4000);
    const s=await read(page,'sceneStats()'),f=await read(page,'perf()');
    report[label]={drawCalls:s.drawCalls,activeMeshes:s.activeMeshes,triangles:Math.round(s.triangles),fps:+f.averageFps.toFixed(1),p95Ms:Math.round(f.p95Ms)};
  };
  await view('driverView');
  await page.click('#hud-behind');await view('behindView');await page.click('#hud-behind');
  // The same at night in the rain (more to draw: rain streaks, lamp pools, the headlight beam).
  await read(page,"setConditions('night-rain')");await view('driverViewNightRain');
  await page.screenshot({path:testInfo.outputPath(`qa-${p.id}-night-rain.png`)});
  report.driveConditions=await read(page,`setConditions('${p.drive}')`);
  stage('views measured');report.heapStartMb=await page.evaluate(()=>Math.round(((performance as any).memory?.usedJSHeapSize??0)/1e6));

  // Drive: the bot on the pedals, assisted steering, sampled every half second (simulation time).
  const samples:{t:number;speed:number;offRoad:boolean;offset:number|null}[]=[];
  const stalls=new Map<string,{why:string;waited:number;x:number;z:number}>();
  let held:string|null=null;
  const hold=async(key:string|null)=>{if(held===key)return;if(held)await page.keyboard.up(held);if(key)await page.keyboard.down(key);held=key};
  const start=await read(page,'simTime()');
  const wallEnd=Date.now()+DRIVE_SECONDS*1000*Math.max(3,p.cpu*2);
  while(await read(page,'simTime()')-start<DRIVE_SECONDS&&Date.now()<wallEnd&&await read(page,'session()')==='running'){
    const want=await pedal(page);
    await hold(want==='go'?'KeyW':want==='brake'?'KeyS':null);
    const s=await page.evaluate(()=>{const d=(window as any).__drivingPractice,v=d.vehicle(),r=d.roadAt(v.position.x,v.position.z);
      // Signed distance from the centreline (+ left of the road's direction), and whether the wheels are on the road.
      const off=r?((v.position.x-r.x)*r.dz-(v.position.z-r.z)*r.dx):null;
      return {t:d.simTime(),speed:v.speed,offRoad:!/road|tarmac|carriageway|junction/.test(String(v.surface??d.surfaceAt(v.position.x,v.position.z))),offset:off,surface:String(v.surface),
        traffic:d.traffic().filter((c:any)=>c.visible&&c.waited>25).map((c:any)=>({id:c.id,why:c.why,waited:c.waited,x:c.pose.position.x,z:c.pose.position.z}))}});
    samples.push({t:s.t,speed:s.speed,offRoad:s.offRoad,offset:s.offset});
    for(const c of s.traffic)stalls.set(c.id,{why:c.why,waited:Math.round(c.waited),x:Math.round(c.x),z:Math.round(c.z)});
    if(!report.surfaces)report.surfaces={};report.surfaces[s.surface]=(report.surfaces[s.surface]??0)+1;
    await page.waitForTimeout(250);
    if(samples.length%40===0)stage(`driving ${Math.round(s.t-start)} s`);
  }
  await hold(null);stage('driven');
  report.drivenSimSeconds=Math.round(await read(page,'simTime()')-start);
  report.distanceMetres=Math.round(samples.reduce((a,s,i)=>i?a+Math.abs(s.speed)*(s.t-samples[i-1]!.t):a,0));
  report.offRoadSamples=samples.filter(s=>s.offRoad&&Math.abs(s.speed)>.5).length;
  report.maxOffsetMetres=+Math.max(0,...samples.map(s=>Math.abs(s.offset??0))).toFixed(2);
  report.stalledTraffic=[...stalls].map(([id,s])=>({id,...s}));
  report.examiner=await read(page,'examiner()').then((e:any)=>e&&{phase:e.phase,index:e.index,steps:e.steps.length});
  report.findings=(await read(page,'findings()')).map((f:any)=>f.rule??f.id??JSON.stringify(f).slice(0,60));
  // One-colour cars: the paint and the other materials of each moving car.
  report.trafficMaterials=(await read(page,"meshMaterials('^traffic-')")).slice(0,12).map((m:any)=>`${m.material}:${(m.diffuse??[]).map((v:number)=>v.toFixed(2)).join('/')}`);
  report.scenery=await read(page,'scenery()');
  report.heapEndMb=await page.evaluate(()=>Math.round(((performance as any).memory?.usedJSHeapSize??0)/1e6));
  report.contextLost=await page.evaluate(()=>!!(window as any).__lost);
  report.sessionAfterDrive=await read(page,'session()');
  report.failure=await page.locator('#error-message').textContent({timeout:1000}).catch(()=>null);

  // Hard times: the connection drops for ten seconds, then the 3D context is lost and restored (low-memory phones
  // when switching apps). The drive should carry on: the simulation still advancing, no new errors.
  const advancing=async()=>{const a=await read(page,'simTime()');await page.waitForTimeout(3000);return +(await read(page,'simTime()')-a).toFixed(2)};
  const errorsBefore=errors.length;
  await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await page.keyboard.down('KeyW');await page.waitForTimeout(5000);await page.keyboard.up('KeyW');
  report.offline={advancedSeconds:await advancing(),session:await read(page,'session()')};
  await cdp.send('Network.emulateNetworkConditions',net?{offline:false,latency:net.latency,downloadThroughput:net.download,uploadThroughput:net.upload}:{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  stage('offline checked');
  await page.evaluate(()=>{const c=document.getElementById('sim-canvas') as HTMLCanvasElement;const gl=(c.getContext('webgl2')??c.getContext('webgl')) as WebGLRenderingContext|null;
    const ext=gl?.getExtension('WEBGL_lose_context');ext?.loseContext();setTimeout(()=>ext?.restoreContext(),1500)});
  await page.waitForTimeout(6000);
  report.contextRestore={advancedSeconds:await advancing(),session:await read(page,'session()'),newErrors:errors.slice(errorsBefore)};
  await page.screenshot({path:testInfo.outputPath(`qa-${p.id}-after-restore.png`)});
  stage('context restore checked');
  await page.screenshot({path:testInfo.outputPath(`qa-${p.id}.png`)});
  fs.writeFileSync(testInfo.outputPath(`qa-${p.id}.json`),JSON.stringify(report,null,1));
  console.log('QA',JSON.stringify(report));
  await context.close();
});
