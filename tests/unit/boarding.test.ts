import {describe,expect,it} from 'vitest';
import {BusStopBoarding} from '../../src/world/boarding';

const base=(x:number,z:number)=>({x,y:0,z,heading:0,stride:0,walking:false});

describe('people at bus stops',()=>{
  // A stop at the origin; a bus heading north (−z) standing beside it, its door on the nearside (west, −x).
  const bus={stop:0,pose:{position:{x:2,y:0,z:0},heading:0},halfLength:5.5,halfWidth:1.25};

  it('walk to the door of a bus that stands at their stop and get on before it goes',()=>{
    const b=new BusStopBoarding([{x:0,z:0}],[{id:'w1',x:-1,z:1},{id:'w2',x:-1,z:-2},{id:'far',x:30,z:0}]);
    b.update(0,[bus],()=>true);
    const mid=b.pose('w1',base(-1,1),1);
    expect(mid.walking).toBe(true);
    // Heading towards the door (2-1.6=0.4 east, 4.2 north of the bus's middle).
    expect(mid.z).toBeLessThan(1);
    expect(b.pose('far',base(30,0),1)).toEqual(base(30,0));
    for(let t=0;t<=5;t+=.1)b.update(t,[bus],()=>true);
    expect(b.visible('w1')).toBe(false);
    expect(b.visible('w2')).toBe(false);
    expect(b.visible('far')).toBe(true);
  });

  it('are waiting again later, turning up only out of the learner\'s sight',()=>{
    const b=new BusStopBoarding([{x:0,z:0}],[{id:'w1',x:-1,z:1}]);
    for(let t=0;t<=5;t+=.1)b.update(t,[bus],()=>true);
    expect(b.visible('w1')).toBe(false);
    for(let t=5;t<=120;t+=.5)b.update(t,[],()=>true);
    expect(b.visible('w1')).toBe(false);
    b.update(121,[],()=>false);
    expect(b.visible('w1')).toBe(true);
    expect(b.pose('w1',base(-1,1),121)).toEqual(base(-1,1));
  });
});
