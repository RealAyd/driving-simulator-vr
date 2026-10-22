import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {pointAtAlong} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

describe('routes never lead into a dead end',()=>{
  const loc=parseLocation(goodmayesJson),net=new RoadNetwork(loc),sp=loc.spawn;
  const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
  it('every turn on a route leaves at least 200 m of driving on (not soon into a dead end or the map\'s edge)',()=>{
    for(let seed=1;seed<=8;seed++){
      const r=net.plan(start,4000,seed);
      expect(r.length).toBeGreaterThan(2800);
      // Each road joined (after the first): driving on from where it was joined goes on at least 200 m.
      for(const leg of r.legs.slice(1))expect(net.reach({road:leg.road,dir:leg.dir,from:leg.from})).toBeGreaterThanOrEqual(200);
    }
  },30000);
});

describe('the way ahead for free driving (assisted steering with no route)',()=>{
  const loc=parseLocation(goodmayesJson),net=new RoadNetwork(loc),sp=loc.spawn;
  const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
  it('no signal: along the road and on, about 220 m',()=>{
    const {legs,turnAt}=net.wayAhead(start,null);
    expect(legs[0]!.road).toBe(start.road);
    expect(legs.reduce((n,l)=>n+Math.abs(l.to-l.from),0)).toBeGreaterThan(150);
    expect(turnAt).toBeNull();
  });
  for(const side of ['left','right'] as const)it(`signalling ${side}: the next turning on the ${side}`,()=>{
    const {legs,turnAt}=net.wayAhead(start,side);
    expect(turnAt).not.toBeNull();
    // The road after the turning heads off to that side of the way the car was going.
    const i=legs.findIndex((l,k)=>k>0&&legs.slice(0,k).reduce((n,x)=>n+Math.abs(x.to-x.from),0)>=turnAt!-.5);
    const before=legs[i-1]!,after=legs[i]!;
    // Directions: the last 10 m before the junction, and the first stretch after it (its own length if short).
    const span=(l:typeof before,a:number,b:number)=>{const p=pointAtAlong(l.road,a),q=pointAtAlong(l.road,b);return {x:q.x-p.x,z:q.z-p.z}};
    const u=span(before,before.to-10*before.dir,before.to),v=span(after,after.from,after.from+after.dir*Math.min(10,Math.abs(after.to-after.from)));
    const cross=u.x*v.z-u.z*v.x;
    expect(side==='right'?cross>0:cross<0).toBe(true);
  });
});
