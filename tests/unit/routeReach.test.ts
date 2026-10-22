import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
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
