import {describe,expect,it} from 'vitest';
import {parseLocation,type Location} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {routeLanePath} from '../../src/test/routePath';
import {surfaceAt,roadHalfWidth} from '../../src/world/roadGeometry';
import {drivingView,roundaboutRings,prepareRoundabouts} from '../../src/world/roundabouts';

const node=(m:string)=>import(/* @vite-ignore */ m);

/**
 * Roundabouts bigger than a mini (a ring of one-way roads on the map; the owner's report: "roundabout road feels too
 * small", and the examiner gave "At the junction, turn left" at each piece of the ring). Every ring at every centre:
 * wide enough to go round, one decision with numbered exits, and the way round on the carriageway.
 */
describe('roundabouts',()=>{
  it('are wide, one junction with numbered exits, and the way round stays on the road',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync,readdirSync}=await node('node:fs');
    const files=(readdirSync('public/centres') as string[]).filter(f=>f.endsWith('.json.gz')).sort();
    let rings=0,narrow=0,entries=0,said=0,ringSaid=0,points=0,off=0;const worst:string[]=[];
    for(const file of files){
      const loc:Location=parseLocation(JSON.parse(gunzipSync(readFileSync(`public/centres/${file}`)).toString()).location);
      if(!roundaboutRings(loc).length)continue;
      prepareRoundabouts(loc);
      const found=roundaboutRings(loc),view=drivingView(loc),net=new RoadNetwork(loc);
      const on=(x:number,z:number)=>surfaceAt(loc,x,z)?.kind==='carriageway';
      for(const g of found){
        rings++;
        for(const r of g.roads)if(roadHalfWidth(r)<2.9)narrow++;
        // Each road coming into the ring: a route from 40 m back along it, through the roundabout.
        for(const road of view.roads){
          if(road.centreline.length<2)continue;
          const end=road.centreline.at(-1)!;
          if(Math.hypot(end.x-g.position.x,end.z-g.position.z)>g.reach+1)continue;
          const p=road.centreline.at(-2)!,h=Math.atan2(end.x-p.x,-(end.z-p.z));
          const start=net.locate(p.x,p.z,h);
          if(!start||start.road!==road||start.dir!==1)continue;
          entries++;
          const plan=net.plan(start,300,entries);
          const first=plan.steps.find(s=>Math.hypot(s.at.x-g.position.x,s.at.z-g.position.z)<g.reach+2);
          if(first){said++;if(/^At the roundabout, take the/.test(first.say))ringSaid++;else if(worst.length<6)worst.push(`${file}: ${first.say}`)}
          const path=routeLanePath(plan.legs,[],view.junctions);
          for(let i=1;i<path.length;i++){
            const a=path[i-1]!,q=path[i]!,l=Math.hypot(q.x-a.x,q.z-a.z)||1,sx=-(q.z-a.z)/l*.9,sz=(q.x-a.x)/l*.9;
            if(Math.hypot(q.x-g.position.x,q.z-g.position.z)>g.reach+3)continue;
            // The car's middle and sides (0.9 m either side).
            points++;if(!on(q.x,q.z)||!on(q.x+sx,q.z+sz)||!on(q.x-sx,q.z-sz)){off++;if(worst.length<12)worst.push(`${file} off ${q.x.toFixed(1)},${q.z.toFixed(1)}`)}
          }
        }
      }
    }
    console.log(`ROUNDABOUTS ${rings} rings, ${narrow} narrow pieces, ${entries} entries, ${ringSaid}/${said} said as a roundabout, way round off the road ${off}/${points}\n${worst.join('\n')}`);
    expect(rings).toBeGreaterThan(50);
    expect(narrow).toBe(0);
    expect(ringSaid/Math.max(1,said)).toBeGreaterThan(.95);
    expect(off/Math.max(1,points)).toBeLessThan(.005);
  },900_000);
});
