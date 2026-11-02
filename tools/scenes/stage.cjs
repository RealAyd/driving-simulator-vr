// Staged scenario captures: a scene built in advance (tools/scenes/build_scene.mjs), its streets quiet apart from the
// road users scripted for the decision (scenario actors: their paths, speeds and start delays), the learner's car
// placed at the decision point (signalling, where it already is). At each moment (simulated seconds after the start)
// time is frozen and the views taken: from the driver's seat, from behind the car, or from above (a plan of the
// junction for review). Repeatable: the same spec gives the same pictures.
//
//   node tools/scenes/stage.cjs <spec.json> <out dir> [app url=http://localhost:4191/]
//
// spec: {scene, label, at:[x,z,headingDeg], signal?:'left'|'right', actors:[scenario actors],
//        moments:[{t, at?:[x,z,headingDeg], signal?, shots:[{name, view:'driver'|'behind'|'overhead',
//                  look?:[yawDeg,pitchDeg], yaw?:deg, overhead?:{x,z,height,target?:{x,y,z}}}]}]}
// (A moment's `at` puts the car somewhere else for it: the same drive, a later stage of the decision.)
// Writes <out>/<name>.jpg and <out>/stage.json (where each road user was at each moment). Needs the app built and
// served. PW_CHROMIUM: a browser installed apart from Playwright's own.
const {chromium}=require('playwright');
const fs=require('fs');

(async()=>{
  const [specFile,out,url='http://localhost:4191/']=process.argv.slice(2);
  const spec=JSON.parse(fs.readFileSync(specFile,'utf8'));
  fs.mkdirSync(out,{recursive:true});
  const t0=Date.now();
  const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  // A phone in landscape (the pictures must read on one).
  const p=await b.newPage({viewport:{width:844,height:390},deviceScaleFactor:2});
  await p.addInitScript(()=>{try{localStorage.setItem('dp-difficulty','test');localStorage.setItem('dp-tips-seen','1')}catch{}});
  await p.goto(url);
  await p.waitForSelector('#screen-start:not([hidden])',{timeout:120000});
  await p.click('[data-drive-mode=free]');
  await p.evaluate(([id,label,actors])=>window.__drivingPractice.openScene(id,label,{actors}),[spec.scene,spec.label,spec.actors??[]]);
  await p.waitForSelector('#exercise-detail:not([hidden])',{timeout:300000});
  await p.click('#start-practice');
  await p.waitForFunction(()=>window.__drivingPractice?.session()==='running',undefined,{timeout:300000});
  const d=(expr,arg)=>p.evaluate(expr,arg);
  await d(a=>window.__drivingPractice.placeCar(a[0],a[1],a[2]),spec.at);
  if(spec.signal)await d(s=>window.__drivingPractice.act(`indicator-${s}`),spec.signal);
  // Only what the driver sees: the controls and status hidden, the map credit kept.
  await p.addStyleTag({content:'[id^=hud-]:not(#hud-credit),#view-buttons,.hud-panel,.hud-round,#busy,.hud-tip,#hud-question{visibility:hidden!important}'});
  const sim=()=>d(()=>window.__drivingPractice.simTime());
  const start=await sim();
  const moments=[];
  for(const m of spec.moments){
    await p.waitForFunction(t=>window.__drivingPractice.simTime()>=t,start+m.t,{timeout:900000,polling:50});
    await d(()=>window.__drivingPractice.freezeTime(true));
    if(m.at)await d(a=>window.__drivingPractice.placeCar(a[0],a[1],a[2]),m.at);
    if(m.signal)await d(s=>window.__drivingPractice.act(`indicator-${s}`),m.signal);
    const at=+((await sim())-start).toFixed(2);
    const users=await d(()=>(window.__drivingPractice.passersDetail?.()??[]).map(x=>({id:x.id,started:x.started,x:+x.pose.position.x.toFixed(1),z:+x.pose.position.z.toFixed(1),headingDeg:+((x.pose.heading*180/Math.PI+360)%360).toFixed(0),speed:+(x.speed??0).toFixed(1)})));
    const car=await d(()=>{const v=window.__drivingPractice.vehicle();return {x:+v.position.x.toFixed(2),z:+v.position.z.toFixed(2),headingDeg:+((v.heading*180/Math.PI+360)%360).toFixed(1),speed:+v.speed.toFixed(2),indicator:v.indicator}});
    for(const s of m.shots){
      if(s.view==='overhead')await d(o=>window.__drivingPractice.overhead(o),s.overhead);
      else{
        await d(()=>window.__drivingPractice.overhead(null));
        await d(([on,yaw])=>window.__drivingPractice.behindView(on,yaw),[s.view==='behind',s.yaw??0]);
        if(s.view==='driver'){const l=s.look??[0,0];await d(v=>window.__drivingPractice.look(v[0]*Math.PI/180,v[1]*Math.PI/180),l)}
      }
      // A few frames for the camera to settle (time is frozen: nothing moves).
      await p.waitForTimeout(1200);
      await p.screenshot({path:`${out}/${s.name}.jpg`,type:'jpeg',quality:85});
    }
    await d(()=>window.__drivingPractice.overhead(null));
    moments.push({t:m.t,simAt:at,car,users,shots:m.shots.map(s=>s.name)});
    await d(()=>window.__drivingPractice.freezeTime(false));
  }
  fs.writeFileSync(`${out}/stage.json`,JSON.stringify({spec,moments,seconds:Math.round((Date.now()-t0)/1000),capturedAt:new Date().toISOString()},null,1));
  console.log(`staged ${moments.reduce((n,m)=>n+m.shots.length,0)} views at ${moments.length} moments in ${Math.round((Date.now()-t0)/1000)} s`);
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
