// Builds every test centre's streets in advance: for each centre in content/centres/test-centres.json, the
// OpenStreetMap data round it (the same square the phone would download) is turned into a location by the same
// generator the app uses, rounded to the centimetre and written gzipped to public/centres/<name>.json.gz, which the
// app loads instead of building the area itself (src/generator/area.ts).
//
//   node tools/centres/build_all.mjs [--only "Name,Name"] [--refresh]
//
// One centre at a time, a pause between map calls (the OSM API's usage policy); centres already built are skipped
// unless --refresh. Map data © OpenStreetMap contributors, ODbL.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';

const args=process.argv.slice(2);
const only=args.includes('--only')?new Set(args[args.indexOf('--only')+1].split(',').map(s=>s.trim())):null;
const refresh=args.includes('--refresh');
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const {locationFromMap,packCentre,centreFile}=await vite.ssrLoadModule('/src/generator/area.ts');
const {centreBbox}=await vite.ssrLoadModule('/src/generator/buildCentre.js');
await vite.close();

const centres=JSON.parse(fs.readFileSync('content/centres/test-centres.json','utf8'));
const list=(Array.isArray(centres)?centres:centres.centres).filter(c=>!only||only.has(c.name));
const dir='public/centres';
fs.mkdirSync(dir,{recursive:true});
const files=new Map();
for(const c of list){const f=centreFile(c.name);if(files.has(f))throw new Error(`${c.name} and ${files.get(f)} share ${f}`);files.set(f,c.name)}

const date=new Date().toISOString().slice(0,10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/** Fewer roads than this in the usual square: a bigger one is tried. */
const SPARSE=20;
/** The map call for one square (null: too dense for one call, HTTP 400), with retries when the API is busy. */
async function downloadSquare(lat,lon,half){
  for(let attempt=0;attempt<4;attempt++){
    try{
      // curl: it uses the environment's HTTPS proxy, where Node's fetch may not.
      const xml=execFileSync('curl',['-sS','--compressed','-m','180','-A','DrivingPractice-centre-builder/1.0 (driving practice simulator; one call per test centre)',
        '-w','\n%{http_code}',`https://api.openstreetmap.org/api/0.6/map?bbox=${centreBbox(lat,lon,half).join(',')}`],{encoding:'utf8',maxBuffer:512*1024*1024});
      const cut=xml.lastIndexOf('\n'),status=Number(xml.slice(cut+1));
      if(status===400)return null;
      if(status===200)return xml.slice(0,cut);
      throw new Error(`HTTP ${status}`);
    }catch(e){if(attempt===3)throw e;await sleep(5000*(attempt+1))}
  }
}
/** The usual square (as the phone would download), smaller where the map is too dense. */
async function download(lat,lon){
  for(const half of [350,250,180]){const xml=await downloadSquare(lat,lon,half);if(xml)return {xml,half}}
  throw new Error('too dense even at 180 m');
}

let built=0,skipped=0,failed=[],bytes=0;
const t0=Date.now();
for(const [i,c] of list.entries()){
  const file=`${dir}/${centreFile(c.name)}`;
  if(!refresh&&fs.existsSync(file)){skipped++;bytes+=fs.statSync(file).size;continue}
  try{
    const request={label:`${c.name} test centre`,lat:c.lat,lon:c.lon,testCentre:c.located!=='town',centre:c.name};
    const first=await download(c.lat,c.lon);
    let half=first.half;
    let {location,summary}=locationFromMap(request,first.xml,half);
    // Few streets round the centre (an industrial estate, out of town): a bigger square, as a test route would go
    // further (larger squares only where the map is sparse, so the files stay small).
    for(const bigger of [600,900]){
      if(location.roads.length>=SPARSE||first.half!==350)break;
      await sleep(1500);
      const more=await downloadSquare(c.lat,c.lon,bigger);
      if(!more)break;
      const built=locationFromMap(request,more,bigger);
      if(built.location.roads.length>location.roads.length){({location,summary}=built);half=bigger}
    }
    const gz=zlib.gzipSync(packCentre(c.name,half,date,summary,location),{level:9});
    fs.writeFileSync(file,gz);
    bytes+=gz.length;built++;
    console.log(`${i+1}/${list.length} ${c.name}: ${(gz.length/1024).toFixed(0)} KB (${half} m)`);
  }catch(e){failed.push(`${c.name}: ${e.message.split('\n')[0]}`);console.log(`${i+1}/${list.length} ${c.name}: FAILED ${e.message.split('\n')[0]}`)}
  await sleep(1500);
}
// The list the app checks before asking for a pack (so a centre not built goes straight to the map call).
const all=(Array.isArray(centres)?centres:centres.centres).map(c=>c.name);
const index=all.filter(name=>fs.existsSync(`${dir}/${centreFile(name)}`)).sort();
fs.writeFileSync(`${dir}/index.json`,JSON.stringify({date,centres:index})+'\n');
console.log(`\n${built} built, ${skipped} already there, ${failed.length} failed; ${(bytes/1048576).toFixed(1)} MB in all; ${((Date.now()-t0)/60000).toFixed(1)} min`);
if(failed.length)console.log(failed.join('\n'));
