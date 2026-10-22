import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {DIFFICULTIES} from '../../src/app/difficulty';
import goodmayesJson from '../../content/locations/goodmayes.json';

// Levels: a longer mock test at each level, up to the length of the real test.
describe('difficulty levels',()=>{
  const goodmayes=parseLocation(goodmayesJson),net=new RoadNetwork(goodmayes),sp=goodmayes.spawn;
  const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
  it('Easy, Standard, Test day: more traffic and longer mock tests in turn; reminders off on Test day',()=>{
    const [e,s,t]=[DIFFICULTIES.easy,DIFFICULTIES.standard,DIFFICULTIES.test];
    expect(e.traffic.cars).toBeLessThan(s.traffic.cars);expect(s.traffic.cars).toBeLessThan(t.traffic.cars);
    expect(e.mockMetres).toBeLessThan(s.mockMetres);expect(s.mockMetres).toBeLessThan(t.mockMetres);
    expect(t.mockSeconds).toBeLessThanOrEqual(3600);
    expect(t.reminders).toBe(false);
  });
  it('a Test day mock test route at Goodmayes is long, with many directions',{timeout:60_000},()=>{
    const route=net.plan(start,DIFFICULTIES.test.mockMetres,1);
    expect(route.length).toBeGreaterThan(DIFFICULTIES.test.mockMetres*.9);
    expect(route.steps.length).toBeGreaterThan(25);
  });
});
