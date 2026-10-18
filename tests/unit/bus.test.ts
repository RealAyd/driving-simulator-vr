import {describe,expect,it} from 'vitest';
import {degToRad,parseLocation,parseScenario,type Pose} from '../../src/contracts';
import {Bus,BUS_MAX_DECEL,BUS_SIZE} from '../../src/actors/bus';
import {StaticObstacles} from '../../src/world/obstacles';
import {layoutTownscape} from '../../src/world/townscape';
import {layoutSignage} from '../../src/world/signage';
import {sampleRoad,roadHalfWidth,surfaceAt} from '../../src/world/roadGeometry';
import {pointToBox} from '../../src/world/collisions';
import locationJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import guidedJson from '../../content/scenarios/brentwood-guided-traversal.json';
import crossingJson from '../../content/scenarios/crossing-restricted-view.json';
import movingOffJson from '../../content/scenarios/moving-off-safely.json';

const place=parseLocation(locationJson);
const guided=parseScenario(guidedJson);
const layout=layoutTownscape(place);
const signs=layoutSignage(place,layout);
const obstacles=new StaticObstacles([...place.blocks,...layout!.colliders,...signs.colliders]);
const spawn:Pose={position:{x:place.spawn.position.x,y:0,z:place.spawn.position.z},heading:degToRad(place.spawn.headingDeg)};
const learnerAtStart=()=>({pose:spawn,halfWidth:.9,halfLength:2.2});
const corners=(p:Pose)=>{
  const f={x:Math.sin(p.heading),z:-Math.cos(p.heading)},a={x:-f.z,z:f.x};
  return [-1,1].flatMap(u=>[-1,0,1].map(v=>({x:p.position.x+a.x*u*BUS_SIZE.halfWidth+f.x*v*BUS_SIZE.halfLength,z:p.position.z+a.z*u*BUS_SIZE.halfWidth+f.z*v*BUS_SIZE.halfLength})));
};
const run=(bus:Bus,seconds:number,dt=1/60,each?:(t:number)=>void)=>{for(let t=0;t<seconds;t+=dt){bus.fixedUpdate(dt);each?.(t)}};

describe('Background buses (Brentwood)',()=>{
  it('two runs on the High Street, unbranded, separate from every scored exercise',()=>{
    expect(guided.buses.map(b=>b.id)).toEqual(['bus-westbound','bus-eastbound']);
    for(const s of [guided,parseScenario(crossingJson),parseScenario(movingOffJson)]){
      // Buses are never actors, zones or triggers: nothing assesses them.
      expect(s.actors.some(a=>a.id.startsWith('bus'))).toBe(false);
      expect(JSON.stringify(s.triggers)).not.toContain('bus');
    }
    expect(parseScenario(crossingJson).buses).toEqual([]);
    expect(parseScenario(movingOffJson).buses).toEqual([]);
  });

  it.each(guided.buses.map(d=>[d.id,d] as const))('%s: its whole body stays in its own lane, clear of kerbs, buildings, street furniture and parked vehicles',(_,def)=>{
    const bus=new Bus(def,place);
    const road=place.roads.find(r=>r.id===def.roadId)!;
    for(let s=0;s<=bus.length;s+=.5){
      const pose=bus.sample(s);
      for(const c of corners(pose)){
        expect(surfaceAt(place,c.x,c.z)?.kind,`${def.id} at ${s} m`).toBe('carriageway');
        // Its own half of the road (left of its direction of travel), with room to the kerb.
        const lateral=sampleRoad(road,c.x,c.z).lateral*(def.direction==='with'?1:-1);
        expect(lateral).toBeLessThan(.15);
        expect(lateral).toBeGreaterThan(-roadHalfWidth(road)+.15);
      }
      expect(obstacles.firstCollision(pose,BUS_SIZE.halfWidth,BUS_SIZE.halfLength),`${def.id} at ${s} m`).toBeNull();
    }
  });

  it('pulls away gently, brakes in a controlled way and stops with its front at each stop; frame-rate independent',()=>{
    for(const def of guided.buses){
      const bus=new Bus(def,place);
      let last=0,maxDecel=0,maxAccel=0;
      const halts:number[]=[];
      let wasMoving=false;
      run(bus,140,1/60,()=>{
        // (The step in which it arrives covers only the last few millimetres: not counted as braking.)
        const a=bus.speed>0||last>.1?(bus.speed-last)*60:0;
        maxDecel=Math.max(maxDecel,-a);maxAccel=Math.max(maxAccel,a);
        if(wasMoving&&bus.speed===0)halts.push(bus.travelled);
        wasMoving=bus.speed>0;last=bus.speed;
      });
      expect(maxDecel).toBeLessThanOrEqual(BUS_MAX_DECEL+1e-6);
      // Planned braking (1.1 m/s²), plus the last step of a few millimetres into each stop.
      expect(maxDecel).toBeLessThan(2.5);
      expect(maxAccel).toBeLessThanOrEqual(.91);
      expect(Math.max(bus.speed,0)).toBeLessThanOrEqual(def.cruiseMph*.44704+1e-6);
      // Halts exactly at its calls and at the end of its run.
      expect(halts.map(h=>+h.toFixed(2))).toEqual([...bus.calls.map(c=>+c.at.toFixed(2)),+bus.length.toFixed(2)]);
      expect(bus.state).toBe(def.end==='leave'?'gone':'calling');
    }
    // The same simulated time gives the same place whatever the step.
    const def=guided.buses[1]!;
    const a=new Bus(def,place),b=new Bus(def,place);
    run(a,30,1/60);run(b,30,1/120);
    expect(Math.abs(a.travelled-b.travelled)).toBeLessThan(.2);
  });

  it('waits at its first stop before pulling away, and signals while it does',()=>{
    const def=guided.buses[0]!;
    const bus=new Bus(def,place);
    run(bus,def.startDwellSeconds-1.5);
    expect(bus.travelled).toBe(0);
    expect(bus.indicating).toBe(true);
    run(bus,3);
    expect(bus.travelled).toBeGreaterThan(0);
  });

  it('never reaches the learner\'s car waiting at the start, and slows for a car in its path',()=>{
    for(const def of guided.buses){
      const bus=new Bus(def,place,learnerAtStart);
      run(bus,140,1/60,()=>{
        for(const c of corners(bus.pose))expect(pointToBox(c.x,c.z,spawn,.9,2.2)).toBeGreaterThan(.5);
      });
    }
    // A car stopped in the eastbound lane ahead of the bus: it halts a few metres short.
    const def=guided.buses[1]!;
    const probe=new Bus(def,place);
    const blocker:Pose=probe.sample(150);
    const bus=new Bus({...def,calls:[]},place,()=>({pose:blocker,halfWidth:.9,halfLength:2.2}));
    run(bus,90);
    expect(bus.speed).toBe(0);
    const front=bus.travelled+BUS_SIZE.halfLength,rear=150-2.2;
    expect(rear-front).toBeGreaterThan(2);
    expect(rear-front).toBeLessThan(6);
  });
});
