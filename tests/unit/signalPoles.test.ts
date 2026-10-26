import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {TrafficSignals} from '../../src/world/trafficSignals';
import {planSignalPoles} from '../../src/world/signalLights';
import {roadHalfWidth,surfaceAt} from '../../src/world/roadGeometry';

const node=(m:string)=>import(/* @vite-ignore */ m);

// Traffic light poles stand off the road (the owner's report, Wakefield: one stood in the middle of the lane, and the
// assisted car ran into it). Every built test centre with traffic lights.
describe('traffic light poles',()=>{
  it('never stand in a carriageway, at any test centre',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync,readdirSync}=await node('node:fs');
    let checked=0,before=0;const inRoad:string[]=[];
    for(const file of (readdirSync('public/centres') as string[]).filter(f=>f.endsWith('.json.gz'))){
      const loc=parseLocation(JSON.parse(gunzipSync(readFileSync(`public/centres/${file}`)).toString()).location);
      if(loc.signals.length===0)continue;
      const stops=new TrafficSignals(loc).stops;
      const onRoad=(x:number,z:number)=>surfaceAt(loc,x,z)?.kind==='carriageway';
      const plan=planSignalPoles(stops,onRoad);
      const own=[...plan.primaries.filter(p=>p.pole),...plan.secondaries.filter(s=>!s.on)];
      for(const p of own){checked++;if(onRoad(p.x,p.z))inRoad.push(`${file} ${p.stop.id}`)}
      // (The old rule for a secondary with no opposing pole: 12 m past the line on the far side.)
      for(const s of stops){
        if(plan.secondaries.some(x=>x.stop===s&&x.on))continue;
        const fx=Math.sin(s.heading),fz=-Math.cos(s.heading),half=roadHalfWidth(s.road);
        if(onRoad(s.x+fx*12-fz*(half+.45),s.z+fz*12+fx*(half+.45)))before++;
      }
    }
    console.log(`SIGNAL-POLES ${checked} poles checked; in a carriageway before: ${before} secondaries; now: ${inRoad.length}`);
    expect(checked).toBeGreaterThan(50);
    expect(inRoad,inRoad.slice(0,10).join('\n')).toEqual([]);
  },600_000);
});
