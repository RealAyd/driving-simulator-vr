import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {Traffic} from '../../src/actors/traffic';
import {layoutTownscape} from '../../src/world/townscape';
import {surfaceAt} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);

describe('Background traffic (generated areas)',()=>{
  it('drives the mapped roads for two minutes: on the carriageway, moving, never through each other or the learner',()=>{
    const layout=layoutTownscape(goodmayes)!;
    const sp=goodmayes.spawn.position;
    const learner={pose:{position:{x:sp.x,y:0,z:sp.z},heading:goodmayes.spawn.headingDeg*Math.PI/180},speed:0};
    const traffic=new Traffic(goodmayes,{count:12,buses:2,busStops:goodmayes.furniture.map(f=>f.position),parked:layout.cars.map(c=>({x:c.x,z:c.z})),learner:()=>learner,seed:7});
    let onRoad=0,samples=0,moved=0,busStopped=0;
    const start=traffic.cars.map(c=>({...c.pose.position}));
    for(let t=0;t<120;t+=1/30){
      traffic.fixedUpdate(1/30);
      const visible=traffic.cars.filter(c=>c.visible);
      for(const c of visible){
        samples++;
        const kind=surfaceAt(goodmayes,c.pose.position.x,c.pose.position.z)?.kind;
        if(kind==='carriageway')onRoad++;
        if(c.kind==='bus'&&c.speed===0&&goodmayes.furniture.some(f=>Math.hypot(f.position.x-c.pose.position.x,f.position.z-c.pose.position.z)<9))busStopped++;
        // Never on top of the learner's car.
        expect(Math.hypot(c.pose.position.x-sp.x,c.pose.position.z-sp.z)).toBeGreaterThan(2.5);
      }
      for(const a of visible)for(const b of visible)if(a!==b)
        expect(Math.hypot(a.pose.position.x-b.pose.position.x,a.pose.position.z-b.pose.position.z),`${a.id} and ${b.id} at ${t.toFixed(1)} s`).toBeGreaterThan(1.5);
    }
    traffic.cars.forEach((c,i)=>{if(Math.hypot(c.pose.position.x-start[i]!.x,c.pose.position.z-start[i]!.z)>30)moved++});
    expect(traffic.cars.filter(c=>c.visible).length).toBeGreaterThanOrEqual(8);
    expect(onRoad/samples).toBeGreaterThan(.95);
    expect(moved).toBeGreaterThan(8);
    expect(traffic.cars.filter(c=>c.kind==='bus').length).toBe(2);
    // A bus called at a stop (stood beside it) at some point.
    expect(busStopped).toBeGreaterThan(30);
    expect(Math.max(...traffic.cars.map(c=>c.speed))).toBeLessThan(31/2.237);
  },60_000);
});

describe('Background traffic: a new attempt',()=>{
  it('keeps the same car objects (what is drawn and collided with follows them)',()=>{
    const sp=goodmayes.spawn.position;
    const learner={pose:{position:{x:sp.x,y:0,z:sp.z},heading:0},speed:0};
    const traffic=new Traffic(goodmayes,{count:6,parked:[],learner:()=>learner,seed:3});
    const before=[...traffic.cars];
    traffic.reset();
    expect(traffic.cars).toEqual(before);
    traffic.cars.forEach((c,i)=>expect(c).toBe(before[i]));
  });
});

describe('Background traffic and a stopped learner',()=>{
  it('waits behind, then drives round the learner when the way is clear, without touching it',()=>{
    const layout=layoutTownscape(goodmayes)!;
    const sp=goodmayes.spawn,h=sp.headingDeg*Math.PI/180;
    const learner={pose:{position:{x:sp.position.x,y:0,z:sp.position.z},heading:h},speed:0};
    let passed=0,closest=Infinity;
    for(const seed of [1,2,3,4,5,6]){
      const traffic=new Traffic(goodmayes,{count:12,parked:layout.cars.map(c=>({x:c.x,z:c.z})),learner:()=>learner,seed});
      const fx=Math.sin(h),fz=-Math.cos(h);
      const along=(c:{pose:{position:{x:number;z:number}}})=>(c.pose.position.x-sp.position.x)*fx+(c.pose.position.z-sp.position.z)*fz;
      const behind=new Map<string,boolean>();
      for(let t=0;t<120;t+=1/30){
        traffic.fixedUpdate(1/30);
        for(const c of traffic.cars){
          if(!c.visible)continue;
          const a=along(c),lat=Math.abs((c.pose.position.x-sp.position.x)*fz-(c.pose.position.z-sp.position.z)*fx);
          if(Math.abs(a)<5)closest=Math.min(closest,lat);
          if(a<-8&&lat<4)behind.set(c.id,true);
          if(a>8&&lat<4&&behind.get(c.id)){passed++;behind.delete(c.id)}
        }
      }
    }
    expect(passed).toBeGreaterThan(0);
    // Side by side, the two cars' sides stay apart (1.9 m wide each).
    expect(closest).toBeGreaterThan(1.95);
  },120_000);
});
