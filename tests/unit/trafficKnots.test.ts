import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {prepareRoundabouts} from '../../src/world/roundabouts';

const node=(m:string)=>import(/* @vite-ignore */ m);

/**
 * The owner's report (Basildon, Paycocke Road): cars and a bus stuck for good at a mini-roundabout. The map's roads
 * end at its middle, so cars waiting to come on stopped inside it, in the way of a bus going round, and each waited
 * for the other. Now they wait at its edge, give way to the right, and a knot where everyone stands is undone (the one
 * waiting longest is waved on). The learner stopped near it (where traffic gathers round it).
 */
describe('a busy mini-roundabout',()=>{
  it('never jams: no car stands for minutes',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
    const loc=parseLocation(JSON.parse(gunzipSync(readFileSync('public/centres/basildon.json.gz')).toString()).location);
    prepareRoundabouts(loc);
    const layout=layoutTownscape(loc)!;
    const longest:number[]=[];
    for(const [x,z] of [[188,27],[175,27]] as const)for(const seed of [3,7,11,19,23,31]){
      const learner={pose:{position:{x,y:0,z},heading:Math.PI/2},speed:0};
      const traffic=new Traffic(loc,{count:14,buses:2,busStops:loc.furniture.filter(f=>f.kind==='bus-stop').map(f=>f.position),
        parked:kerbFootprints(layout),learner:()=>learner,seed});
      const still=new Map<string,number>();let worst=0;
      for(let t=0;t<300;t+=1/30){
        traffic.fixedUpdate(1/30);
        for(const c of traffic.cars){
          if(!c.visible){still.delete(c.id);continue}
          const v=c.speed<.2?(still.get(c.id)??0)+1/30:0;still.set(c.id,v);worst=Math.max(worst,v);
        }
      }
      longest.push(worst);
    }
    longest.sort((a,b)=>a-b);
    console.log(`MINI-KNOTS longest stands (s): ${longest.map(v=>v.toFixed(0)).join(' ')}`);
    // Before: most runs had a car standing 3 to 5 minutes (stuck for good).
    expect(longest[Math.floor(longest.length/2)]!).toBeLessThan(70);
    expect(longest.at(-1)!).toBeLessThan(180);
  },900_000);
});
