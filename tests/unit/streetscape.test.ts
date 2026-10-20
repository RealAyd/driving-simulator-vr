import {describe,expect,it} from 'vitest';
import {degToRad,parseLocation,parseScenario,type Block,type Pose} from '../../src/contracts';
import {layoutStreetscape} from '../../src/world/streetscape';
import {boxesOverlap,StaticObstacles,type Box} from '../../src/world/obstacles';
import {pointToBox} from '../../src/world/collisions';
import {roadHalfWidth,sampleRoad} from '../../src/world/roadGeometry';
import {CAR_MODELS,parkedSize} from '../../src/assets/carSpecs';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import locationJson from '../../content/locations/residential-moving-off.json';
import scenarioJson from '../../content/scenarios/moving-off-safely.json';

const place=parseLocation(locationJson);
const scenario=parseScenario(scenarioJson);
const layout=layoutStreetscape(place)!;
const road=place.roads[0]!;
const half=roadHalfWidth(road),pavementBack=half+road.pavementWidth;
const toBox=(b:Block):Box=>({id:b.id,cx:b.position.x,cz:b.position.z,heading:degToRad(b.headingDeg),halfW:b.size.width/2,halfD:b.size.depth/2});
const corners=(b:Block)=>{
  const h=degToRad(b.headingDeg),f={x:Math.sin(h),z:-Math.cos(h)},r={x:Math.cos(h),z:Math.sin(h)};
  return [[1,1],[1,-1],[-1,-1],[-1,1]].map(([a,c])=>({x:b.position.x+r.x*b.size.width/2*a!+f.x*b.size.depth/2*c!,z:b.position.z+r.z*b.size.width/2*a!+f.z*b.size.depth/2*c!}));
};
const minDistanceFromCentre=(b:Block)=>Math.min(...corners(b).map(c=>sampleRoad(road,c.x,c.z).distance));
const all=[...place.blocks,...layout.colliders];

describe('moving-off street: layout',()=>{
  it('is a full street on both sides, built from a few house variants',()=>{
    expect(layout.houses.length).toBeGreaterThan(40);
    expect(new Set(layout.houses.map(h=>h.style)).size).toBeGreaterThanOrEqual(4);
    // Directly beside and ahead of the learner (within 60 m), both sides have houses.
    const near=(side:number)=>layout.houses.filter(h=>Math.abs(h.frame.oz)<60&&Math.sign(h.frame.ox)===side);
    expect(near(-1).length).toBeGreaterThanOrEqual(4);
    expect(near(1).length).toBeGreaterThanOrEqual(4);
    // The street continues well behind the learner (seen in the mirrors).
    expect(Math.max(...layout.houses.map(h=>h.frame.oz))).toBeGreaterThan(200);
    // No five-storey blocks: every house is two storeys.
    expect(layout.houses.every(h=>['terrace','semi','semi-bay','detached'].includes(h.style))).toBe(true);
  });

  it('keeps houses, gardens and street furniture off the carriageway, and houses behind their gardens',()=>{
    for(const c of layout.colliders){
      const d=minDistanceFromCentre(c);
      if(c.kind==='building')expect(d,c.id).toBeGreaterThan(pavementBack+3);
      else if(c.id.startsWith('lamp-'))expect(d,c.id).toBeGreaterThan(half+.2);
      else expect(d,c.id).toBeGreaterThanOrEqual(pavementBack-.01);
    }
  });

  it('has no houses or parked cars intersecting each other',()=>{
    const solid=all.filter(b=>b.kind==='building'||b.kind==='parked-vehicle');
    for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)
      expect(boxesOverlap(toBox(solid[i]!),toBox(solid[j]!)),`${solid[i]!.id} / ${solid[j]!.id}`).toBe(false);
    // Cars on drives do not touch walls, hedges or fences either.
    for(const car of layout.colliders.filter(c=>c.kind==='parked-vehicle'))
      for(const s of layout.colliders.filter(c=>c.kind==='wall'||c.kind==='hedge'))
        expect(boxesOverlap(toBox(car),toBox(s)),`${car.id} / ${s.id}`).toBe(false);
  });

  it('gives each parked car a collision box the size of its model as drawn',()=>{
    const close=(a:number[],b:number[],id:string)=>a.forEach((v,i)=>expect(v,id).toBeCloseTo(b[i]!,3));
    for(const b of place.blocks.filter(b=>b.kind==='parked-vehicle')){
      const model=CAR_MODELS[b.vehicleModel as keyof typeof CAR_MODELS];
      expect(model,b.id).toBeTruthy();
      const spec=parkedSize(model);
      close([b.size.width,b.size.depth,b.size.height],[spec.width,spec.length,spec.height],b.id);
      // At the kerb, wheels on the carriageway.
      expect(sampleRoad(road,b.position.x,b.position.z).distance+b.size.width/2).toBeLessThanOrEqual(half);
    }
    for(const car of layout.cars){
      const box=layout.colliders.find(c=>c.id===car.id)!;
      const spec=parkedSize(CAR_MODELS[car.model]);
      close([box.size.width,box.size.depth],[spec.width,spec.length],car.id);
    }
  });

  it('puts no drive across the kerb where a car is parked, including the learner\'s own position',()=>{
    for(const pad of layout.pads.filter(p=>p.kind==='drive')){
      const a=sampleRoad(road,pad.corners[0].x,pad.corners[0].z),b=sampleRoad(road,pad.corners[1].x,pad.corners[1].z);
      const side=Math.sign(a.lateral),lo=Math.min(a.along,b.along),hi=Math.max(a.along,b.along);
      for(const spot of [...place.blocks.filter(b=>b.kind==='parked-vehicle').map(b=>({...b.position,len:b.size.depth})),{...scenario.start!.position,len:4.3}]){
        const s=sampleRoad(road,spot.x,spot.z);
        if(Math.sign(s.lateral)!==side||s.distance>half)continue;
        expect(hi<s.along-spot.len/2||lo>s.along+spot.len/2,`drive at ${lo.toFixed(1)}–${hi.toFixed(1)} vs car at ${s.along.toFixed(1)}`).toBe(true);
      }
    }
  });
});

describe('moving-off street: the lesson is unchanged',()=>{
  it('the assisted moving-off path does not touch any scenery, even at full throttle',()=>{
    const obstacles=new StaticObstacles(all);
    const assist=new SteeringAssist(scenario.assistPath!,LEARNER_CAR);
    let s:VehicleState={position:{x:scenario.start!.position.x,y:0,z:scenario.start!.position.z},heading:0,speed:0,steerAngle:0};
    for(let t=0;t<20;t+=1/60){
      s=stepVehicle(s,{throttle:s.speed<8?1:0,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,1/60);
      expect(obstacles.firstCollision({position:s.position,heading:s.heading},.9,2.2)).toBeNull();
    }
  });

  it.each(scenario.actors.map(a=>[a.id,a] as const))('%s keeps clear of every parked car and all scenery along its route',(_,actor)=>{
    if(actor.kind!=='passing-vehicle')return;
    const halfWidth=actor.body==='car'?.9:.35;
    const path=actor.path;
    let min=Infinity,nearest='';
    for(let i=0;i<path.length-1;i++){
      const a=path[i]!,b=path[i+1]!,l=Math.hypot(b.x-a.x,b.z-a.z);
      for(let d=0;d<=l;d+=.25){
        const x=a.x+(b.x-a.x)*d/l,z=a.z+(b.z-a.z)*d/l;
        for(const c of all){
          const pose:Pose={position:{x:c.position.x,y:0,z:c.position.z},heading:degToRad(c.headingDeg)};
          const g=pointToBox(x,z,pose,c.size.width/2,c.size.depth/2)-halfWidth;
          if(g<min){min=g;nearest=c.id}
        }
      }
    }
    expect(min,`closest: ${nearest}`).toBeGreaterThan(.2);
  });
});

describe('moving-off street: no unexplained gaps',()=>{
  it('each row of houses runs to the end of its frontage (within one house width)',()=>{
    for(const [i,frontage] of place.streetscape!.frontages.entries()){
      const side=frontage.side==='left'?-1:1;
      const houses=layout.houses.filter(h=>h.id.startsWith(`f${i}-`));
      const alongs=houses.flatMap(h=>[-h.width/2,h.width/2].map(u=>{
        const p={x:h.frame.ox+h.frame.ax*u,z:h.frame.oz+h.frame.az*u};
        return sampleRoad(road,p.x,p.z).along;
      }));
      expect(Math.min(...alongs)-frontage.from,`frontage ${i} start`).toBeLessThan(1);
      expect(frontage.to-Math.max(...alongs),`frontage ${i} (${side<0?'left':'right'}) end`).toBeLessThan(5);
    }
    // Consecutive frontages on a side leave at most a few metres between them.
    for(const side of ['left','right']){
      const f=place.streetscape!.frontages.filter(x=>x.side===side).sort((a,b)=>a.from-b.from);
      for(let i=1;i<f.length;i++)expect(f[i]!.from-f[i-1]!.to).toBeLessThan(3);
    }
  });
});
