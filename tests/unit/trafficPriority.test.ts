import {describe,expect,it} from 'vitest';
import {parseLocation,type Location} from '../../src/contracts';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {junctionMouths} from '../../src/world/junctionControls';
import {roadHalfWidth,sampleRoad} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

// (Node modules by name: the unit tests are type-checked for the browser.)
const node=(m:string)=>import(/* @vite-ignore */ m);
const served=async(id:string)=>{
  const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
  return parseLocation(JSON.parse(gunzipSync(readFileSync(`public/centres/${id}.json.gz`)).toString()).location);
};

/**
 * Background traffic at junctions, as the Highway Code has it: out of a side road (give way or STOP lines) only into a
 * safe gap in the main road's traffic (rules 170–172), a full stop at a STOP line, and no standing about.
 * Measured: pulling out in front of a main-road car under 2.5 s from the mouth; STOP lines run; time standing.
 */
function drive(loc:Location,seed:number,seconds:number){
  const layout=layoutTownscape(loc)!;
  const sp=loc.spawn.position;
  // The learner parked well away from the junctions (at the spawn: the start of a drive).
  const learner={pose:{position:{x:sp.x,y:0,z:sp.z},heading:loc.spawn.headingDeg*Math.PI/180},speed:0};
  const traffic=new Traffic(loc,{count:14,buses:1,busStops:loc.furniture.map(f=>f.position),parked:kerbFootprints(layout),learner:()=>learner,seed});
  const mouths=junctionMouths(loc).map(m=>({m,half:roadHalfWidth(m.road),mainHalf:roadHalfWidth(m.main),
    point:m.atEnd?m.road.centreline.at(-1)!:m.road.centreline[0]!}));
  const last=new Map<string,{x:number;z:number;slowest:number}>();
  let pulledOut=0,stopRun=0,crossings=0,standing=0,seen=0,worst=0;
  const still=new Map<string,number>();
  for(let t=0;t<seconds;t+=1/30){
    traffic.fixedUpdate(1/30);
    const cars=traffic.cars.filter(c=>c.visible);
    for(const c of cars){
      // (Parked at the end of a cul-de-sac is not standing about in traffic.)
      if(c.parked){still.set(c.id,0);continue}
      seen++;if(c.speed<.2)standing++;
      const v=c.speed<.2?(still.get(c.id)??0)+1/30:0;still.set(c.id,v);worst=Math.max(worst,v);
      const p=c.pose.position,prev=last.get(c.id);
      for(const {m,half,mainHalf,point} of mouths){
        const s=sampleRoad(m.road,p.x,p.z);
        if(s.distance>half)continue;
        // Over the line this step, heading for the junction.
        const before=prev?sampleRoad(m.road,prev.x,prev.z):null;
        if(!before||before.distance>half)continue;
        const crossed=m.dir>0?before.along<m.lineAlong&&s.along>=m.lineAlong:before.along>m.lineAlong&&s.along<=m.lineAlong;
        if(!crossed)continue;
        crossings++;
        if(m.kind==='stop'&&prev!.slowest>.3)stopRun++;
        // Main-road cars coming to the mouth, under 2.5 s away.
        for(const o of cars){
          if(o===c)continue;
          const op=o.pose.position,on=sampleRoad(m.main,op.x,op.z);
          if(on.distance>mainHalf+.5)continue;
          const dx=point.x-op.x,dz=point.z-op.z,d=Math.hypot(dx,dz);
          const toward=(Math.sin(o.pose.heading)*dx-Math.cos(o.pose.heading)*dz)/(d||1);
          if(d>4&&toward>.7&&o.speed>1&&(d-o.halfLength)/o.speed<2.5){pulledOut++;break}
        }
      }
      // The slowest it went in the last few metres (for STOP lines).
      const moved=prev?Math.hypot(p.x-prev.x,p.z-prev.z):0;
      last.set(c.id,{x:p.x,z:p.z,slowest:prev&&moved<1?Math.min(prev.slowest,c.speed):c.speed});
    }
    for(const c of traffic.cars)if(!c.visible)last.delete(c.id);
  }
  return {pulledOut,stopRun,crossings,standing:standing/Math.max(1,seen),worst};
}

describe('Background traffic at junctions (the Highway Code)',()=>{
  it('pulls out of side roads only into a safe gap, stops at STOP lines, and keeps moving',async()=>{
    const places:Array<[string,Location]>=[['goodmayes',parseLocation(goodmayesJson)]];
    for(const id of ['farnborough','folkestone','chelmsford-hanbury-road','belvedere-london','leeds'])
      try{places.push([id,await served(id)])}catch{/* not built */}
    const rows:string[]=[];
    let pulledOut=0,crossings=0,stopRun=0,worst=0,standing=0;
    for(const [id,loc] of places)for(const seed of [3,7,19]){
      const r=drive(loc,seed,180);
      rows.push(`${id}/${seed}: out ${r.pulledOut}/${r.crossings}, stop run ${r.stopRun}, standing ${(r.standing*100).toFixed(0)}%, longest ${r.worst.toFixed(0)} s`);
      pulledOut+=r.pulledOut;crossings+=r.crossings;stopRun+=r.stopRun;worst=Math.max(worst,r.worst);standing+=r.standing;
    }
    console.log(`TRAFFIC-PRIORITY ${places.length} places\n${rows.join('\n')}\nTOTAL pulled out ${pulledOut} of ${crossings} crossings, STOP lines run ${stopRun}, standing ${(standing/rows.length*100).toFixed(0)}%, longest ${worst.toFixed(0)} s`);
    if((globalThis as {process?:{env:Record<string,string|undefined>}}).process?.env['TRAFFIC_BASELINE'])return;
    expect(pulledOut/Math.max(1,crossings),'share of pulls out in front of a main-road car').toBeLessThan(.02);
    expect(stopRun).toBe(0);
    expect(worst).toBeLessThan(90);
    expect(standing/rows.length).toBeLessThan(.3);
  },900_000);
});
