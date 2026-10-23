import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {Traffic} from '../../src/actors/traffic';
import {layoutTownscape} from '../../src/world/townscape';
import {surfaceAt} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);

/** Whether two cars' outlines (rectangles: centre, heading, half sizes) overlap, by separating axes. */
function overlap(a:{x:number;z:number;h:number;hw:number;hl:number},b:{x:number;z:number;h:number;hw:number;hl:number}):boolean{
  const axes=[a.h,a.h+Math.PI/2,b.h,b.h+Math.PI/2].map(h=>({x:Math.sin(h),z:-Math.cos(h)}));
  const corners=(r:typeof a)=>{const f={x:Math.sin(r.h),z:-Math.cos(r.h)},s={x:-f.z,z:f.x};
    return [[1,1],[1,-1],[-1,1],[-1,-1]].map(([i,j])=>({x:r.x+f.x*r.hl*i!+s.x*r.hw*j!,z:r.z+f.z*r.hl*i!+s.z*r.hw*j!}))};
  const ca=corners(a),cb=corners(b);
  return axes.every(ax=>{const pa=ca.map(p=>p.x*ax.x+p.z*ax.z),pb=cb.map(p=>p.x*ax.x+p.z*ax.z);
    return Math.max(...pa)>Math.min(...pb)&&Math.max(...pb)>Math.min(...pa)});
}
const box=(c:{pose:{position:{x:number;z:number};heading:number};halfWidth:number;halfLength:number})=>({x:c.pose.position.x,z:c.pose.position.z,h:c.pose.heading,hw:c.halfWidth,hl:c.halfLength});

describe('Background traffic (generated areas)',()=>{
  it('drives the mapped roads for two minutes: on the carriageway, moving, never through each other or the learner',()=>{
    const layout=layoutTownscape(goodmayes)!;
    const sp=goodmayes.spawn.position;
    const learner={pose:{position:{x:sp.x,y:0,z:sp.z},heading:goodmayes.spawn.headingDeg*Math.PI/180},speed:0};
    const traffic=new Traffic(goodmayes,{count:12,buses:2,busStops:goodmayes.furniture.map(f=>f.position),parked:layout.cars.map(c=>({x:c.x,z:c.z})),learner:()=>learner,seed:7});
    let onRoad=0,samples=0,moved=0,busStopped=0,overlaps=0;
    const start=traffic.cars.map(c=>({...c.pose.position}));
    for(let t=0;t<120;t+=1/30){
      traffic.fixedUpdate(1/30);
      const visible=traffic.cars.filter(c=>c.visible);
      for(const c of visible){
        samples++;
        const kind=surfaceAt(goodmayes,c.pose.position.x,c.pose.position.z)?.kind;
        if(kind==='carriageway')onRoad++;
        if(c.kind==='bus'&&c.speed===0&&goodmayes.furniture.some(f=>Math.hypot(f.position.x-c.pose.position.x,f.position.z-c.pose.position.z)<9))busStopped++;
        // Never touching the learner's car.
        expect(overlap(box(c),{x:sp.x,z:sp.z,h:learner.pose.heading,hw:.9,hl:2.15}),`${c.id} at ${t.toFixed(1)} s`).toBe(false);
      }
      for(const a of visible)for(const b of visible)if(a.id<b.id&&overlap(box(a),box(b)))overlaps++;
    }
    traffic.cars.forEach((c,i)=>{if(Math.hypot(c.pose.position.x-start[i]!.x,c.pose.position.z-start[i]!.z)>30)moved++});
    expect(traffic.cars.filter(c=>c.visible).length).toBeGreaterThanOrEqual(8);
    expect(onRoad/samples).toBeGreaterThan(.95);
    expect(moved).toBeGreaterThan(8);
    // Traffic keeps apart (a moment's touch while two cars sort out a junction is allowed: under 1% of the time).
    expect(overlaps/(120*30)).toBeLessThan(.01);
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
    let passed=0,touched=0;
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
          if(overlap(box(c),{x:sp.position.x,z:sp.position.z,h,hw:.9,hl:2.15}))touched++;
          if(a<-8&&lat<4)behind.set(c.id,true);
          if(a>8&&lat<4&&behind.get(c.id)){passed++;behind.delete(c.id)}
        }
      }
    }
    expect(passed).toBeGreaterThan(0);
    expect(touched).toBe(0);
  },120_000);
});

describe('Background traffic: no gridlock',()=>{
  it('keeps flowing for five minutes: no car stands still for more than 40 s unless the learner is next to it',()=>{
    const layout=layoutTownscape(goodmayes)!;
    // The learner parked out of the way (far corner), so nothing waits for it.
    const learner={pose:{position:{x:goodmayes.spawn.position.x,y:0,z:goodmayes.spawn.position.z},heading:0},speed:0};
    for(const seed of [7,11,19]){
      const traffic=new Traffic(goodmayes,{count:12,buses:2,busStops:goodmayes.furniture.map(f=>f.position),parked:layout.cars.map(c=>({x:c.x,z:c.z})),learner:()=>learner,seed});
      const still=new Map<string,number>();
      let worst=0;
      for(let t=0;t<300;t+=1/30){
        traffic.fixedUpdate(1/30);
        for(const c of traffic.cars){
          const nearLearner=Math.hypot(c.pose.position.x-learner.pose.position.x,c.pose.position.z-learner.pose.position.z)<25;
          const v=c.visible&&c.speed<.2&&!nearLearner?(still.get(c.id)??0)+1/30:0;
          still.set(c.id,v);worst=Math.max(worst,v);
        }
      }
      expect(worst,`seed ${seed}`).toBeLessThan(40);
    }
  },180_000);
  it('at the edge of the area, traffic does not vanish in front of the learner (Gartmore Road at Green Lane)',()=>{
    const layout=layoutTownscape(goodmayes)!;
    // Stopped near the end of Gartmore Road, looking across Green Lane to where it leaves the area.
    const learner={pose:{position:{x:-463,y:0,z:325},heading:Math.PI},speed:0};
    const fwd={x:Math.sin(learner.pose.heading),z:-Math.cos(learner.pose.heading)};
    let vanished=0,seen=0;
    for(const seed of [1,2,3]){
      const traffic=new Traffic(goodmayes,{count:14,buses:2,busStops:goodmayes.furniture.map(f=>f.position),parked:layout.cars.map(c=>({x:c.x,z:c.z})),learner:()=>learner,seed});
      let before=new Map<string,{x:number;z:number}|null>();
      for(let t=0;t<180;t+=1/30){
        traffic.fixedUpdate(1/30);
        const now=new Map(traffic.cars.map(c=>[c.id,c.visible?{x:c.pose.position.x,z:c.pose.position.z}:null]));
        for(const [id,p] of before){
          if(!p)continue;
          const dx=p.x-learner.pose.position.x,dz=p.z-learner.pose.position.z,ahead=dx*fwd.x+dz*fwd.z;
          if(ahead>0&&Math.hypot(dx,dz)<70){seen++;if(!now.get(id))vanished++}
        }
        before=now;
      }
    }
    expect(seen).toBeGreaterThan(100);
    expect(vanished).toBe(0);
  });
  it('traffic does not drive through parked cars (nor appear out of one): under 3 s in two minutes',()=>{
    const layout=layoutTownscape(goodmayes)!;
    const parked=layout.cars.map(c=>({x:c.x,z:c.z,h:c.heading}));
    const sp=goodmayes.spawn.position;
    const learner={pose:{position:{x:sp.x,y:0,z:sp.z},heading:goodmayes.spawn.headingDeg*Math.PI/180},speed:0};
    for(const seed of [1,2,3]){
      const traffic=new Traffic(goodmayes,{count:14,buses:2,busStops:goodmayes.furniture.map(f=>f.position),parked:parked.map(p=>({x:p.x,z:p.z})),learner:()=>learner,seed});
      let frames=0;
      for(let t=0;t<120;t+=1/30){
        traffic.fixedUpdate(1/30);
        for(const c of traffic.cars)if(c.visible)for(const p of parked)
          if(Math.hypot(c.pose.position.x-p.x,c.pose.position.z-p.z)<6&&overlap(box(c),{x:p.x,z:p.z,h:p.h,hw:.85,hl:2}))frames++;
      }
      expect(frames,`seed ${seed}`).toBeLessThan(90);
    }
  });
});
