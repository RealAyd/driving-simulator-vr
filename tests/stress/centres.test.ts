import {expect,it} from 'vitest';
import {gunzipSync} from 'node:zlib';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {parseLocation,type Location,type Road} from '../../src/contracts';
import {RoadNetwork,type RouteLeg} from '../../src/test/route';
import {careful} from './careful';
import {pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import {layoutStreetscape} from '../../src/world/streetscape';
import {layoutTownscape} from '../../src/world/townscape';
import {layoutSignage} from '../../src/world/signage';
import {junctionMouths} from '../../src/world/junctionControls';

/**
 * Every test centre pack, as a learner would meet it: the place loads, the car starts on the road, the examiner's
 * routes (several seeds) go somewhere (no dead ends, no running off the area, named roads, one-way streets the right
 * way), each direction matches the turn, a careful driver following them is not faulted, and the scenery does not
 * stand in the road. Writes a report (STRESS_REPORT, default stress-report.json) of everything found.
 */
const DIR='public/centres';
const SEEDS=[1,2,3,4];
const len=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);
type Issue={centre:string;kind:string;detail:string};

it('every test centre: start, routes, directions, marking, scenery',()=>{
  const files=readdirSync(DIR).filter(f=>f.endsWith('.json.gz')&&!process.env.STRESS_ONLY||f.includes(process.env.STRESS_ONLY??'@@'));
  const issues:Issue[]=[];
  const faultCount=new Map<string,number>();
  let routes=0;
  for(const f of files){
    const centre=f.replace('.json.gz','');
    if(process.env.STRESS_PROGRESS)process.stderr.write(`${new Date().toISOString().slice(11,19)} ${centre}\n`);
    const add=(kind:string,detail:string)=>issues.push({centre,kind,detail});
    let location:Location;
    try{location=parseLocation(JSON.parse(gunzipSync(readFileSync(`${DIR}/${f}`)).toString()).location)}
    catch(e){add('pack-invalid',String(e).slice(0,200));continue}
    const net=new RoadNetwork(location);
    const sp=location.spawn;
    const st=net.startNear(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180);
    if(surfaceAt(location,st.x,st.z)?.kind!=='carriageway')add('spawn-off-road',`${st.x.toFixed(1)},${st.z.toFixed(1)}`);
    const start=net.locate(st.x,st.z,st.heading);
    if(!start){add('spawn-not-on-network','');continue}
    for(const seed of SEEDS){
      routes++;
      let run;
      try{run=careful(location,net,seed,3000)}catch(e){add('route-crash',`seed ${seed}: ${String(e).slice(0,200)}`);continue}
      const {result,steps,legs,late,parkedOk,events,drivenUntil}=run;
      for(const e of events.filter(e=>e.type==='examiner.redirected'&&e.time<drivenUntil))add('careful-driver-redirected',`seed ${seed}: told new directions (expected ${String(e.payload['expected'])})`);
      for(const x of late)add('direction-late',`seed ${seed}: ${x}`);
      if(!parkedOk)add('no-legal-place-to-pull-up',`seed ${seed}: near the end of ${legs.at(-1)?.road.name??'?'}`);
      const length=legs.reduce((n,l)=>n+Math.abs(l.to-l.from),0);
      if(steps.length===0)add('route-no-directions',`seed ${seed}`);
      if(length<1500)add('route-short',`seed ${seed}: ${length.toFixed(0)} m`);
      for(const s of steps){
        if(!s.to.road.name&&s.kind!=='roundabout'&&len(s.to.road)<40)add('direction-unnamed-short-road',`seed ${seed}: "${s.say}" into ${s.to.road.id}`);
        if(s.to.road.oneway&&s.to.dir<0)add('direction-wrong-way-one-way',`seed ${seed}: into ${s.to.road.name??s.to.road.id}`);
        // The words match the turn.
        if(/left/.test(s.say)&&!/right/.test(s.say)&&s.turn==='right'||/right/.test(s.say)&&!/left/.test(s.say)&&s.turn==='left')add('direction-words-wrong',`seed ${seed}: "${s.say}" is a ${s.turn} turn`);
        // Into a road whose far end runs off the area with no way on, and the route ends there.
      }
      // Round the same streets: a road (by name) taken more than twice.
      const taken=new Map<string,number>();
      for(const st of steps){const k=st.to.road.name??st.to.road.id;taken.set(k,(taken.get(k)??0)+1)}
      for(const [k,n] of taken)if(n>4)add('route-loops',`seed ${seed}: into ${k} ${n} times`);
      // The last turn into a road too short to pull up in (a stub at a cul-de-sac's mouth).
      const lastStep=steps.at(-1);
      if(lastStep&&len(lastStep.to.road)<30)add('route-ends-in-stub',`seed ${seed}: "${lastStep.say}" into ${lastStep.to.road.name??lastStep.to.road.id} (${len(lastStep.to.road).toFixed(0)} m)`);
      // Where the drive ends: room on to pull up, not at the edge.
      const end=legs.at(-1);
      if(end){
        const p=pointAtAlong(end.road,end.to),m=Math.max(...location.roads.flatMap(r=>r.centreline.map(q=>Math.max(Math.abs(q.x),Math.abs(q.z)))));
        if(Math.max(Math.abs(p.x),Math.abs(p.z))>m-25)add('route-ends-at-edge',`seed ${seed}: ${end.road.name??end.road.id}`);
      }
      if(result.outcome!=='completed')add('test-not-completed',`seed ${seed}: ${result.outcome}`);
      for(const x of result.findings.filter(x=>x.severity!=='info')){
        faultCount.set(x.ruleId,(faultCount.get(x.ruleId)??0)+1);
        add(`careful-driver-fault:${x.ruleId}`,`seed ${seed}: ${x.explanation.slice(0,160)}`);
      }
    }
    // Scenery: nothing solid in the carriageway. (Laid out from the start the app uses, as main.ts does.)
    location.spawn={position:{x:st.x,z:st.z},headingDeg:(st.heading*180/Math.PI+360)%360,roadId:start.road.id};
    const layout=layoutStreetscape(location)??layoutTownscape(location);
    for(const c of layout?.cars??[])if(Math.hypot(c.x-st.x,c.z-st.z)<6)add('parked-car-at-start',`${c.x.toFixed(0)},${c.z.toFixed(0)}`);
    const plan=layoutSignage(location,layout);
    for(const c of plan.colliders)if(surfaceAt(location,c.position.x,c.position.z)?.kind==='carriageway')add('sign-in-road',c.id);
    for(const t of layout?.trees??[])if(surfaceAt(location,t.x,t.z)?.kind==='carriageway')add('tree-in-road',`${t.x.toFixed(0)},${t.z.toFixed(0)}`);
    for(const l of layout?.lamps??[])if(surfaceAt(location,l.x,l.z)?.kind==='carriageway')add('lamp-in-road',`${l.x.toFixed(0)},${l.z.toFixed(0)}`);
    for(const c of layout?.cars??[]){
      if(location.junctions.some(j=>Math.hypot(j.position.x-c.x,j.position.z-c.z)<j.radius+8))add('parked-car-in-junction',`${c.x.toFixed(0)},${c.z.toFixed(0)}`);
    }
    // A barrier closes the road it stands at the end of; across any other road it blocks a way through.
    const endsNear=(r:Road,p:{x:number;z:number})=>[r.centreline[0]!,r.centreline.at(-1)!].some(e=>Math.hypot(e.x-p.x,e.z-p.z)<6);
    for(const b of location.blocks)if(b.id.startsWith('edge-barrier-')&&!b.id.includes('hedge')&&location.roads.some(r=>{
      if(endsNear(r,b.position))return false;
      const s=sampleRoad(r,b.position.x,b.position.z);return s.distance<roadHalfWidth(r)+2;
    }))add('barrier-across-another-road',b.id);
    // A building across a road: the road's centreline runs through its outline (an arch over a road is mapped so,
    // and drawn solid it would block the way).
    const inside=(p:{x:number;z:number},poly:Array<{x:number;z:number}>)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i]!,b=poly[j]!;if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)c=!c}return c};
    const drawn=new Set((layout?.town?.buildings??[]).map(b=>b.id));
    for(const b of location.buildings){
      if(b.use==='parking'||/roof|canopy/i.test(b.evidence??'')||!drawn.has(b.id))continue;
      const across=location.roads.find(r=>{for(let a=2;a<len(r)-2;a+=2){const p=pointAtAlong(r,a);if(inside(p,b.footprint))return true}return false});
      if(across)add('building-across-road',`${b.id} over ${across.name??across.id}`);
    }
    // Signals: each stop on a road that exists, within it.
    for(const g of location.signals)for(const s of g.stops){
      const r=location.roads.find(x=>x.id===s.roadId);
      if(!r)add('signal-stop-no-road',`${g.id} ${s.roadId}`);
      else if(s.along<0||s.along>len(r))add('signal-stop-off-road',`${g.id} ${s.roadId} at ${s.along.toFixed(0)} of ${len(r).toFixed(0)}`);
    }
    for(const m of junctionMouths(location))if(m.road.oneway&&!m.atEnd)add('mouth-on-one-way-start',m.id);
  }
  const byKind=new Map<string,{count:number;centres:Set<string>;examples:string[]}>();
  for(const i of issues){const k=byKind.get(i.kind)??{count:0,centres:new Set(),examples:[]};k.count++;k.centres.add(i.centre);if(k.examples.length<6)k.examples.push(`${i.centre}: ${i.detail}`);byKind.set(i.kind,k)}
  const summary=[...byKind].sort((a,b)=>b[1].count-a[1].count).map(([kind,k])=>({kind,count:k.count,centres:k.centres.size,examples:k.examples}));
  writeFileSync(process.env.STRESS_REPORT??'stress-report.json',JSON.stringify({centres:files.length,routes,summary,issues},null,1));
  console.log(`centres ${files.length}, routes ${routes}`);
  for(const s of summary)console.log(`${s.kind}: ${s.count} (${s.centres} centres) e.g. ${s.examples[0]}`);
  expect(files.length).toBeGreaterThan(0);
});
