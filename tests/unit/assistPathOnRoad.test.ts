import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {routeLanePath} from '../../src/test/routePath';
import {surfaceAt} from '../../src/world/roadGeometry';
import {drivingView,widenRoundabouts} from '../../src/world/roundabouts';

const node=(m:string)=>import(/* @vite-ignore */ m);

// The assisted steering's path stays on the road with the car's width (the owner's report, Wakefield: on a left turn
// at the lights the assisted car went over the corner and into a street-name sign). Test routes at many centres.
describe('the assisted steering path',()=>{
  it('keeps the car on the carriageway round every corner',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync,readdirSync}=await node('node:fs');
    const files=(readdirSync('public/centres') as string[]).filter(f=>f.endsWith('.json.gz')).sort();
    const pick=files.filter((_,i)=>i%9===0).concat(files.filter(f=>/wakefield|warwick|goodmayes/.test(f)));
    let points=0,off=0;const worst:Array<{file:string;x:number;z:number}>=[];
    for(const file of pick){
      const loc=parseLocation(JSON.parse(gunzipSync(readFileSync(`public/centres/${file}`)).toString()).location);
      widenRoundabouts(loc);
      const net=new RoadNetwork(loc),sp=loc.spawn;
      const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180);
      if(!start)continue;
      const on=(x:number,z:number)=>surfaceAt(loc,x,z)?.kind==='carriageway';
      for(const seed of [1,2,3,4,5,6]){
        const path=routeLanePath(net.plan(start,2500,seed).legs,[],drivingView(loc).junctions);
        for(let i=1;i<path.length;i++){
          const a=path[i-1]!,b=path[i]!,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
          // The car's sides (0.9 m either side of the path).
          const sx=-dz/l*.9,sz=dx/l*.9;
          points++;
          if(!on(b.x,b.z)||!on(b.x+sx,b.z+sz)||!on(b.x-sx,b.z-sz)){off++;if(worst.length<12)worst.push({file,x:+b.x.toFixed(1),z:+b.z.toFixed(1)})}
        }
      }
    }
    console.log(`ASSIST-PATH ${pick.length} centres, ${points} points, car over the edge at ${off} (${(off/points*100).toFixed(2)}%)\n${worst.map(w=>JSON.stringify(w)).join('\n')}`);
    // Before: 4.7% (the left lane's middle on a single-track road put the car half over the kerb). Left now: tight
    // corners on single-track roads (Barra: 3 m wide for a 1.8 m car).
    expect(off/points).toBeLessThan(.0025);
  },900_000);
});
