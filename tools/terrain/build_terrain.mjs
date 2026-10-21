// Ground heights for a location from the open AWS Terrain Tiles (Terrarium PNG encoding), sampled on a
// regular grid in the location's own frame (x east, z south, metres from its origin, 111 320 m per degree,
// as the OSM extraction tools use). Writes content/terrain/<location-id>.json; the simulator lays its
// roads, buildings and road users on it. Run from the repository root:
//
//   node tools/terrain/build_terrain.mjs <location-id> <origin-lat> <origin-lon> [cell-metres=4] [margin-metres=120]
//
// Needs pngjs 7.0.0: copy this file into a scratch folder that has it installed and run it from there with the
// repository root as the working directory (as tools/assets/simplify.mjs is run). Network: s3.amazonaws.com.
// Heights are relative to the origin's height (the scene's y = 0 there); slopes are what matter.
import fs from 'node:fs';
import {PNG} from 'pngjs';

const [id,latArg,lonArg,cellArg='4',marginArg='120']=process.argv.slice(2);
if(!id||!latArg||!lonArg)throw new Error('usage: build_terrain.mjs <location-id> <origin-lat> <origin-lon> [cell] [margin]');
const LAT=Number(latArg),LON=Number(lonArg),CELL=Number(cellArg),MARGIN=Number(marginArg);
const KX=111320*Math.cos(LAT*Math.PI/180),KY=111320;
const ZOOM=15;

const location=JSON.parse(fs.readFileSync(`content/locations/${id}.json`,'utf8'));
const pts=location.roads.flatMap(r=>r.centreline);
const x0=Math.floor((Math.min(...pts.map(p=>p.x))-MARGIN)/CELL)*CELL,x1=Math.ceil((Math.max(...pts.map(p=>p.x))+MARGIN)/CELL)*CELL;
const z0=Math.floor((Math.min(...pts.map(p=>p.z))-MARGIN)/CELL)*CELL,z1=Math.ceil((Math.max(...pts.map(p=>p.z))+MARGIN)/CELL)*CELL;

const toGeo=(x,z)=>({lat:LAT-z/KY,lon:LON+x/KX});
const tileXY=(lat,lon)=>{
  const n=2**ZOOM,r=lat*Math.PI/180;
  return {x:(lon+180)/360*n,y:(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n};
};

const tiles=new Map();
async function tile(tx,ty){
  const key=`${tx}/${ty}`;
  if(!tiles.has(key)){
    const url=`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`;
    const res=await fetch(url);
    if(!res.ok)throw new Error(`${url}: HTTP ${res.status}`);
    tiles.set(key,PNG.sync.read(Buffer.from(await res.arrayBuffer())));
  }
  return tiles.get(key);
}
const metres=(png,px,py)=>{
  const i=(py*png.width+px)*4,d=png.data;
  return d[i]*256+d[i+1]+d[i+2]/256-32768;
};
/** Bilinear height at a geographic point (pixels can straddle tiles). */
async function heightAt(lat,lon){
  const t=tileXY(lat,lon),fx=t.x*256-.5,fy=t.y*256-.5,ix=Math.floor(fx),iy=Math.floor(fy),u=fx-ix,v=fy-iy;
  const sample=async(px,py)=>metres(await tile(Math.floor(px/256),Math.floor(py/256)),((px%256)+256)%256,((py%256)+256)%256);
  const [a,b,c,d]=await Promise.all([sample(ix,iy),sample(ix+1,iy),sample(ix,iy+1),sample(ix+1,iy+1)]);
  return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
}

const cols=Math.round((x1-x0)/CELL)+1,rows=Math.round((z1-z0)/CELL)+1;
const raw=[];
for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const g=toGeo(x0+c*CELL,z0+r*CELL);raw.push(await heightAt(g.lat,g.lon))}
const originHeight=await heightAt(LAT,LON);
const heights=raw.map(h=>Math.round((h-originHeight)*100)/100);
const out={
  locationId:id,
  source:'AWS Terrain Tiles (Terrarium, zoom 15), https://registry.opendata.aws/terrain-tiles/',
  attribution:'Terrain: AWS Terrain Tiles (Mapzen); includes data from SRTM (NASA), EU-DEM (Copernicus), GMTED, ETOPO1',
  licence:'Open data; attribution required (see https://github.com/tilezen/joerd/blob/master/docs/attribution.md)',
  built:new Date().toISOString().slice(0,10),
  origin:{lat:LAT,lon:LON,heightAboveSeaLevel:Math.round(originHeight*10)/10},
  frame:'x east, z south, metres from the origin (111 320 m per degree); heights relative to the origin',
  cell:CELL,x0,z0,cols,rows,
  heights
};
fs.mkdirSync('content/terrain',{recursive:true});
fs.writeFileSync(`content/terrain/${id}.json`,JSON.stringify(out));
const min=Math.min(...heights),max=Math.max(...heights);
console.log(`${id}: ${cols}x${rows} cells of ${CELL} m, ${tiles.size} tiles; origin ${out.origin.heightAboveSeaLevel} m; relative heights ${min} to ${max} m`);
