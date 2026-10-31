// A scene for a scenario (a junction on a reported test route): the OpenStreetMap data round a point, built by the
// same generator as the test centres' streets, written gzipped to public/scenes/<id>.json.gz. The app opens one with
// window.__drivingPractice.openScene(id,label) (scenario captures: tools/scenes/capture.cjs).
//
//   node tools/scenes/build_scene.mjs <id> "<label>" <lat> <lon> [half-size-metres=300] [saved .osm file] [start lat,lon] [facing lat,lon]
//
// (The drive starts on the road nearest the middle, or nearest `start lat,lon`. For an area too big for one OSM API
// call, save an Overpass download of centreBbox(lat, lon, half) and pass it as the .osm file.)
//
// Map data © OpenStreetMap contributors, ODbL.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';

const [id,label,latArg,lonArg,halfArg='300',osmFile,startArg,facingArg]=process.argv.slice(2);
if(!id||!label||!latArg||!lonArg||!/^[a-z0-9-]+$/.test(id))throw new Error('usage: build_scene.mjs <id> "<label>" <lat> <lon> [half] [osm-file]');
const lat=Number(latArg),lon=Number(lonArg),half=Number(halfArg);
const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const {locationFromMap,packCentre}=await vite.ssrLoadModule('/src/generator/area.ts');
const {centreBbox}=await vite.ssrLoadModule('/src/generator/buildCentre.js');
await vite.close();
// curl: it uses the environment's HTTPS proxy, where Node's fetch may not.
const xml=osmFile&&osmFile!=='-'?fs.readFileSync(osmFile,'utf8')
  :execFileSync('curl',['-sS','--compressed','--fail','-m','180','-A','DrivingPractice-scene-builder/1.0',`https://api.openstreetmap.org/api/0.6/map?bbox=${centreBbox(lat,lon,half).join(',')}`],{encoding:'utf8',maxBuffer:512*1024*1024});
const start=startArg?(([a,b])=>({lat:a,lon:b}))(startArg.split(',').map(Number)):undefined;
const {location,summary}=locationFromMap({label,lat,lon},xml,half,start);
// Facing a point (the start road's own direction may point away): turned round into the other lane where it does.
if(facingArg){
  const [fl,fo]=facingArg.split(',').map(Number),KX=111320*Math.cos(lat*Math.PI/180);
  const to={x:(fo-lon)*KX,z:-(fl-lat)*111320},sp=location.spawn,h=sp.headingDeg*Math.PI/180;
  if((to.x-sp.position.x)*Math.sin(h)-(to.z-sp.position.z)*Math.cos(h)<0){
    const line=location.roads.find(r=>r.id===sp.roadId).centreline;
    let best=null;
    for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,((sp.position.x-a.x)*dx+(sp.position.z-a.z)*dz)/l2)),q={x:a.x+dx*t,z:a.z+dz*t};
      const d=Math.hypot(q.x-sp.position.x,q.z-sp.position.z);if(!best||d<best.d)best={q,d}}
    sp.position={x:+(2*best.q.x-sp.position.x).toFixed(2),z:+(2*best.q.z-sp.position.z).toFixed(2)};
    sp.headingDeg=+((sp.headingDeg+180)%360).toFixed(2);
  }
}
fs.mkdirSync('public/scenes',{recursive:true});
fs.writeFileSync(`public/scenes/${id}.json.gz`,zlib.gzipSync(packCentre(label,half,new Date().toISOString().slice(0,10),summary,location),{level:9}));
console.log(summary);
