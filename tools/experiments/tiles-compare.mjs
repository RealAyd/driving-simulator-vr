// Photorealistic tiles experiment: driver-eye comparison of the scenery modes on the
// Brentwood stretch, in a headless browser. Desktop software rendering (SwiftShader):
// frame rates here are NOT phone or headset measurements.
//
// Usage: npm run build (with VITE_GOOGLE_MAPS_BROWSER_KEY set for tile modes), npm run preview, then
//   node tools/experiments/tiles-compare.mjs [out-dir] [modes] [--drive] [--gpu]
// Each tile-mode page load makes one Map Tiles API root request (billable); keep runs few.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const args=process.argv.slice(2);
const flags=new Set(args.filter(a=>a.startsWith('--')));
const [outDir='docs/experiments/tiles-evidence',modeList='constructed,tiles,hybrid']=args.filter(a=>!a.startsWith('--'));
const modes=modeList.split(',');
const base=process.env.BASE_URL??'http://localhost:4173/';
fs.mkdirSync(outDir,{recursive:true});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({
  executablePath:process.env.PW_CHROMIUM||undefined,
  args:flags.has('--gpu')?[]:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
  // Outbound requests (tile.googleapis.com) go through the environment's HTTPS proxy, if any.
  ...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})
});
const report={conditions:{renderer:null,viewport:'1280x720',deviceScaleFactor:1,quality:'desktop',note:'Headless Chromium, software WebGL (SwiftShader) unless --gpu. Not an iPhone or headset measurement.',date:new Date().toISOString()},modes:{}};

async function run(mode){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const consoleErrors=[];
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().replace(/key=[^&\s"']+/g,'key=…').slice(0,200))});
  const t0=Date.now();
  await page.goto(`${base}?quality=desktop${mode==='constructed'?'':`&scenery=${mode}`}`);
  await page.waitForFunction(()=>window.__drivingPractice?.session()==='ready',null,{timeout:120_000});
  const readyMs=Date.now()-t0;
  report.conditions.renderer??=await page.evaluate(()=>window.__drivingPractice.renderer());
  await page.click('[data-exercise="brentwood"]');
  await page.check('input[name="steering"][value="assist"]').catch(()=>{});
  await page.click('#start-practice');
  await page.waitForFunction(()=>window.__drivingPractice.session()==='running');
  const dp=fn=>page.evaluate(fn);
  await dp(()=>{window.__drivingPractice.freezeTime(true);window.__drivingPractice.countDrawCalls()});
  // Tile modes: wait until the height is measured and downloads have settled.
  let tiles=null,settledMs=null;
  if(mode!=='constructed'){
    const until=Date.now()+150_000;
    let quiet=0;
    while(Date.now()<until){
      tiles=await dp(()=>window.__drivingPractice.tiles());
      const s=tiles.stats;
      if(tiles.problem)break;
      quiet=s&&tiles.calibrationDone&&s.downloading===0&&s.parsing===0&&s.queued===0?quiet+1:0;
      if(quiet>=4){settledMs=Date.now()-t0;break}
      await sleep(500);
    }
  }else await sleep(3000);
  const shot=async name=>page.screenshot({path:path.join(outDir,`${name}-${mode}.png`)});
  await shot('driver-forward');
  // The same views the learner uses: right door mirror and interior mirror (held views narrow the field of view).
  await dp(()=>window.__drivingPractice.selectView('right-door'));await sleep(1800);await shot('driver-right-mirror');
  await dp(()=>window.__drivingPractice.selectView('interior'));await sleep(1800);await shot('driver-interior-mirror');
  await dp(()=>window.__drivingPractice.selectView('forward'));await sleep(1500);
  // A raised view of the junctions from behind the car, to show alignment of road and tiles (not a driver view).
  await dp(()=>window.__drivingPractice.overhead({x:-22,z:40,height:28,target:{x:10,y:0,z:0}}));await sleep(2500);
  if(mode!=='constructed')await page.waitForFunction(()=>window.__drivingPractice.tiles().stats?.downloading===0,null,{timeout:60_000}).catch(()=>{});
  await shot('raised-junctions');
  await dp(()=>window.__drivingPractice.overhead(null));await sleep(1000);

  // Stationary frame timing, mirrors on then off.
  const measure=async ms=>{await dp(()=>window.__drivingPractice.resetPerf());await sleep(ms);return dp(()=>({perf:window.__drivingPractice.perf(),scene:window.__drivingPractice.sceneStats()}))};
  const stationary=await measure(6000);
  await dp(()=>window.__drivingPractice.mirrorsEnabled(false));
  const noMirrors=await measure(6000);
  await dp(()=>window.__drivingPractice.mirrorsEnabled(true));
  let tileSurface=null;
  if(mode!=='constructed')tileSurface=await dp(()=>window.__drivingPractice.tilesSurface());

  // Short controlled drive: assisted steering, throttle held, frames captured for a movement strip.
  let drive=null;
  if(flags.has('--drive')){
    await page.evaluate(()=>window.__drivingPractice.freezeTime(false));
    await dp(()=>window.__drivingPractice.resetPerf());
    const frames=path.join(outDir,`drive-${mode}`);
    fs.mkdirSync(frames,{recursive:true});
    const before=mode==='constructed'?null:(await dp(()=>window.__drivingPractice.tiles())).stats;
    const samples=[];
    await page.keyboard.down('KeyW');
    for(let i=0;i<40;i++){
      const s=await dp(()=>({t:window.__drivingPractice.simTime(),v:window.__drivingPractice.vehicle(),tiles:window.__drivingPractice.tiles().stats}));
      samples.push({t:+s.t.toFixed(2),x:+s.v.position.x.toFixed(1),z:+s.v.position.z.toFixed(1),speed:+s.v.speed.toFixed(1),downloading:s.tiles?.downloading??null,visible:s.tiles?.visible??null});
      if(s.v.speed>6.5)await page.keyboard.up('KeyW');
      else if(s.v.speed<5)await page.keyboard.down('KeyW');
      await page.screenshot({path:path.join(frames,`${String(i).padStart(3,'0')}.png`)});
      await sleep(250);
    }
    await page.keyboard.up('KeyW');
    const after=mode==='constructed'?null:(await dp(()=>window.__drivingPractice.tiles())).stats;
    drive={perf:await dp(()=>window.__drivingPractice.perf()),samples,tilesBefore:before?.network??null,tilesAfter:after?.network??null};
  }
  const finalTiles=mode==='constructed'?null:await dp(()=>window.__drivingPractice.tiles());
  const memory=await page.evaluate(()=>performance.memory?{usedJSHeapMB:+(performance.memory.usedJSHeapSize/1048576).toFixed(0)}:null);
  report.modes[mode]={readyMs,settledMs,stationary,noMirrors,tiles:finalTiles,tileSurface,drive,memory,consoleErrors:consoleErrors.slice(0,10),about:await page.evaluate(()=>document.getElementById('about-scenery')?.textContent??null)};
  await page.close();
}

for(const mode of modes)await run(mode);
await browser.close();
const file=path.join(outDir,`report${modes.length===1?`-${modes[0]}`:''}.json`);
fs.writeFileSync(file,JSON.stringify(report,null,2));
console.log(`wrote ${file}`);
