import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {drivingView,prepareRoundabouts,roundaboutRings} from '../../src/world/roundabouts';
import {aroundRing,laneAfter,laneAt,lanesFor,ringLanes,project} from '../../src/world/roundaboutLanes';

const node=(m:string)=>import(/* @vite-ignore */ m);

/**
 * Lanes at roundabouts bigger than a mini, by the owner's rules (an approved driving instructor; roundaboutLanes.ts)
 * and Highway Code rule 186; and the way round in them, on Brentwood's Brook Street roundabout (M25 junction 28: a
 * ring of three lanes, about 600 m round).
 */
describe('roundabout lanes',()=>{
  it('the lane for each exit',()=>{
    // Two lanes: the first exit on the left; straight on (the second exit) and to the right on the right.
    expect(lanesFor(2,1,3,'left')).toEqual([1]);
    expect(lanesFor(2,2,3,'ahead')).toEqual([2]);
    expect(lanesFor(2,3,3,'right')).toEqual([2]);
    // Three lanes: straight on in the middle; the third of five exits (about twelve o'clock) in the middle or right;
    // the third of three (to the right) on the right.
    expect(lanesFor(3,2,4,'ahead')).toEqual([2]);
    expect(lanesFor(3,3,5,'right')).toEqual([2,3]);
    expect(lanesFor(3,3,3,'right')).toEqual([3]);
    // Lane arrows on the map decide.
    expect(lanesFor(2,2,3,'ahead',[1,2])).toEqual([1,2]);
    // Out a lane at a time as the exits before go by: the third exit from the right lane of three, the middle lane
    // past the first, the left lane past the second.
    expect([0,1,2].map(p=>laneAfter(3,3,p))).toEqual([3,2,1]);
    expect([0,1,2,3].map(p=>laneAfter(2,4,p))).toEqual([2,2,2,1]);
  });

  it('Brook Street roundabout: found, three lanes, and round it in the right lane',async()=>{
    const {readFileSync}=await node('node:fs');
    const loc=parseLocation(JSON.parse(readFileSync('content/locations/brook-street-roundabout.json','utf8')));
    prepareRoundabouts(loc);
    const ring=roundaboutRings(loc).find(g=>[...g.roads].some(r=>r.name==='Brook Street Roundabout'));
    expect(ring).toBeDefined();
    const j=drivingView(loc).junctions.find(x=>x.id.startsWith('ring-'))!,r=ringLanes(j)!;
    expect(r.lanes).toBe(3);
    expect(r.length).toBeGreaterThan(550);
    // From Brook Street (from Brentwood, the A1023 westbound) to each way out: on in the lane for it, in the left lane
    // by the exit.
    const brook=loc.roads.find(x=>x.name==='Brook Street'&&x.oneway&&Math.hypot(x.centreline.at(-1)!.x-ring!.position.x,x.centreline.at(-1)!.z-ring!.position.z)<ring!.reach+4)!;
    const a=brook.centreline.at(-1)!,p=brook.centreline.at(-2)!,l=Math.hypot(a.x-p.x,a.z-p.z),inDir={x:(a.x-p.x)/l,z:(a.z-p.z)/l};
    const seen=new Set<string>();
    for(const e of r.exits){
      const b=drivingView(loc).roads.map(x=>x.centreline[0]!).find(q=>Math.abs(project(r,q).along-e)<1);
      if(!b)continue;
      const way=aroundRing(r,a,b,inDir,{x:0,z:-1});
      seen.add(`${way.exit}:${way.lane}`);
      // A quarter of the way along (on the ring, before any exit is passed for the first exit) it is in its lane;
      // just before the exit, in the left lane.
      const end=way.points.at(-Math.max(2,Math.round(way.points.length*.08)))!;
      expect(laneAt(r,end),`exit ${way.exit}`).toBe(1);
    }
    // The first exit from the left lane; further round from the right lanes.
    expect([...seen].some(s=>s==='1:1')).toBe(true);
    expect([...seen].some(s=>/^[3-9]:3$/.test(s))).toBe(true);
  });
});
