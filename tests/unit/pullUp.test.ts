import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {judgePullUp,junctionPoints,stopPlace} from '../../src/test/pullUp';
import {pointAtAlong,roadHalfWidth} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

// Pulling up on the left at the end of a mock test, on Ashgrove Road (Goodmayes).
describe('pull-up judging',()=>{
  const location=parseLocation(goodmayesJson);
  const road=location.roads.find(r=>r.name==='Ashgrove Road')!;
  const junctions=junctionPoints(location);
  /** A car stopped `along` metres along Ashgrove Road, driving its own way, `gap` metres from the left kerb. */
  const at=(along:number,gap:number)=>{
    const p=pointAtAlong(road,along),d=p.direction;
    // Left of travel is (dz, −dx); the car's centre is half its width plus the gap in from the kerb.
    const off=roadHalfWidth(road)-.9-gap;
    return {x:p.x+d.z*off,z:p.z-d.x*off,heading:Math.atan2(d.x,-d.z)};
  };
  const judge=(along:number,gap:number,parked:Array<{x:number;z:number}>=[])=>{const c=at(along,gap);return judgePullUp(location,junctions,parked,c.x,c.z,c.heading)};

  it('measures the gap to the left kerb',()=>{
    const c=at(150,.3);
    expect(stopPlace(location,c.x,c.z,c.heading)!.kerbGap).toBeCloseTo(.3,1);
  });
  it('close to the kerb, away from junctions: no faults',()=>{
    expect(judge(150,.3)).toEqual([]);
  });
  it('more than a metre out from the kerb is a driving fault',()=>{
    expect(judge(150,1.6).map(f=>[f.key,f.severity])).toEqual([['kerb','minor']]);
  });
  it('within 10 m of a junction is a driving fault',()=>{
    const side=junctions.find(j=>Math.abs(Math.hypot(j.x-pointAtAlong(road,193.8).x,j.z-pointAtAlong(road,193.8).z))<8);
    expect(side).toBeTruthy();
    expect(judge(193.8,.3).some(f=>f.key==='junction')).toBe(true);
  });
  it('too close behind a parked car is a driving fault',()=>{
    const c=at(150,.3),fwd={x:Math.sin(c.heading),z:-Math.cos(c.heading)};
    expect(judge(150,.3,[{x:c.x+fwd.x*5,z:c.z+fwd.z*5}]).map(f=>f.key)).toEqual(['parked']);
    expect(judge(150,.3,[{x:c.x+fwd.x*8,z:c.z+fwd.z*8}])).toEqual([]);
  });
  it('on the zig-zags of a zebra crossing is serious',()=>{
    const zebra=location.crossings.find(c=>c.kind==='zebra'&&c.zigzagMarks>0)!;
    const r=location.roads.find(x=>x.id===zebra.roadId)!;
    const p=pointAtAlong(r,zebra.along-zebra.width/2-zebra.zigzagMarks),d=p.direction,off=roadHalfWidth(r)-.9-.3;
    const f=judgePullUp(location,[],[],p.x+d.z*off,p.z-d.x*off,Math.atan2(d.x,-d.z));
    expect(f.map(x=>[x.key,x.severity])).toContainEqual(['zig-zags','serious']);
  });
});
