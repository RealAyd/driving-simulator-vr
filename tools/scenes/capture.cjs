// Scenario captures: a scene built in advance (tools/scenes/build_scene.mjs), the learner's car placed at the decision
// point, the traffic left to gather, then the views the decision needs, from the driver's seat (and a short sequence
// where timing matters). Reconstructions from map data, not photographs.
//
//   node tools/scenes/capture.cjs <spec.json> <out dir> [app url=http://localhost:4183/]
//
// spec: {scene, label, at:[x,z,headingDeg], wait (simulated seconds), shots:[{name, look?:[yawDeg,pitchDeg]}],
//        sequence?:{name, look?, frames, every (simulated seconds)}}
// Writes <out>/<name>.png and <out>/capture.json (where, when, how long it took). Needs the app built and served.
const {chromium}=require('playwright');
const fs=require('fs');

(async()=>{
  const [specFile,out,url='http://localhost:4183/']=process.argv.slice(2);
  const spec=JSON.parse(fs.readFileSync(specFile,'utf8'));
  fs.mkdirSync(out,{recursive:true});
  const t0=Date.now();
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  // A phone in landscape (the captures must read on one).
  const p=await b.newPage({viewport:{width:844,height:390},deviceScaleFactor:3});
  await p.addInitScript(()=>{try{localStorage.setItem('dp-difficulty','test');localStorage.setItem('dp-tips-seen','1')}catch{}});
  await p.goto(url);
  await p.waitForSelector('#screen-start:not([hidden])',{timeout:120000});
  await p.click('[data-drive-mode=free]');
  await p.evaluate(([id,label])=>window.__drivingPractice.openScene(id,label),[spec.scene,spec.label]);
  await p.waitForSelector('#exercise-detail:not([hidden])',{timeout:180000});
  await p.click('#start-practice');
  await p.waitForFunction(()=>window.__drivingPractice?.session()==='running',undefined,{timeout:240000});
  const place=()=>p.evaluate(a=>window.__drivingPractice.placeCar(a[0],a[1],a[2]),spec.at);
  const sim=()=>p.evaluate(()=>window.__drivingPractice.simTime());
  const until=async t=>p.waitForFunction(t=>window.__drivingPractice.simTime()>t,t,{timeout:900000,polling:250});
  await place();
  await until(await sim()+(spec.wait??20));
  await place();
  // Only what the driver sees: the controls and status hidden, the map credit kept.
  await p.addStyleTag({content:'[id^=hud-]:not(#hud-credit),#view-buttons,.hud-panel,.hud-round,#busy,.hud-tip{visibility:hidden!important}'});
  const look=v=>p.evaluate(([y,pt])=>window.__drivingPractice.look(y*Math.PI/180,pt*Math.PI/180),v??[0,0]);
  const shots=[];
  for(const s of spec.shots){await look(s.look);await until(await sim()+.4);await p.screenshot({path:`${out}/${s.name}.png`});shots.push({name:s.name,look:s.look??[0,0],simTime:await sim()})}
  if(spec.sequence){
    const q=spec.sequence;await look(q.look);
    for(let k=0;k<q.frames;k++){await until(await sim()+q.every);const name=`${q.name}-${k+1}`;await p.screenshot({path:`${out}/${name}.png`});shots.push({name,look:q.look??[0,0],simTime:await sim()})}
  }
  const traffic=await p.evaluate(()=>(window.__drivingPractice.traffic()??[]).filter(t=>t.visible).map(t=>({id:t.id,x:+t.pose.position.x.toFixed(1),z:+t.pose.position.z.toFixed(1),speed:+t.speed.toFixed(1)})));
  fs.writeFileSync(`${out}/capture.json`,JSON.stringify({spec,shots,traffic,seconds:Math.round((Date.now()-t0)/1000),capturedAt:new Date().toISOString()},null,1));
  console.log(`captured ${shots.length} views in ${Math.round((Date.now()-t0)/1000)} s`);
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
