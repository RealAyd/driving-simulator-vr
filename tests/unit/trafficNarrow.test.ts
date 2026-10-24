import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';

// (Node modules by name: the unit tests are type-checked for the browser.)
const node=(m:string)=>import(/* @vite-ignore */ m);

describe('Background traffic on narrow streets with parked cars (Farnborough test centre, as served)',()=>{
  it('a car in its lane tucks in for one coming out past parked cars, or that one pulls back in: no standoffs',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
    const pack=JSON.parse(gunzipSync(readFileSync('public/centres/farnborough.json.gz')).toString());
    const loc=parseLocation(pack.location);
    const layout=layoutTownscape(loc)!;
    const parked=kerbFootprints(layout);
    const sp=loc.spawn.position;
    // The learner stopped at the start, as when a drive begins: traffic passes it like a parked car.
    const learner={pose:{position:{x:sp.x,y:0,z:sp.z},heading:loc.spawn.headingDeg*Math.PI/180},speed:0};
    const shares:number[]=[];
    for(const seed of [7,11,19]){
      const traffic=new Traffic(loc,{count:12,buses:2,busStops:loc.furniture.map(f=>f.position),parked,learner:()=>learner,seed});
      const still=new Map<string,number>();
      let standing=0,seen=0,worst=0;
      for(let t=0;t<300;t+=1/30){
        traffic.fixedUpdate(1/30);
        for(const c of traffic.cars){
          if(!c.visible){still.set(c.id,0);continue}
          seen++;if(c.speed<.2)standing++;
          const v=c.speed<.2?(still.get(c.id)??0)+1/30:0;
          still.set(c.id,v);worst=Math.max(worst,v);
        }
      }
      shares.push(standing/seen);
      // Waiting at lights, for a gap or behind a queue happens; standing a minute and a half does not.
      expect(worst,`seed ${seed}: longest stand`).toBeLessThan(90);
    }
    // Before (each waiting for the other): standing 12–78% of the time; now about 5–25%.
    expect(shares.reduce((a,b)=>a+b,0)/shares.length,`standing by seed: ${shares.map(x=>(x*100).toFixed(0)+'%').join(' ')}`).toBeLessThan(.3);
  },300_000);
});
