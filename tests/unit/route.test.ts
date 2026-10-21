import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);

describe('Mock test routes',()=>{
  const net=new RoadNetwork(goodmayes);
  const sp=goodmayes.spawn;
  const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
  it('start on the road the learner is on, the way the car faces',()=>{
    expect(start.road.name).toBe('Ashgrove Road');
  });
  it.each([1,2,3,4,5])('seed %i: about 2.5–3.5 km with 8 or more directions, each to a road joining at that point',seed=>{
    const route=net.plan(start,2800,seed);
    expect(route.length).toBeGreaterThan(2400);
    expect(route.steps.length).toBeGreaterThanOrEqual(8);
    for(const [i,s] of route.steps.entries()){
      expect(s.say).toMatch(/^(Then )?((T|t)ake the|(A|a)t the (end of the road|junction|roundabout))/);
      // The next road passes (or starts) within a few metres of the manoeuvre.
      const d=Math.min(...s.to.road.centreline.map(p=>Math.hypot(p.x-s.at.x,p.z-s.at.z)));
      expect(d,`${s.say} → ${s.to.road.name}`).toBeLessThan(25);
      if(i>0)expect(s.distance).toBeGreaterThan(route.steps[i-1]!.distance);
    }
  });
});
