import {describe,expect,it} from 'vitest';
import {degToRad,parseLocation,parseScenario,type Block,type Pose} from '../../src/contracts';
import {layoutStreetscape} from '../../src/world/streetscape';
import {boxesOverlap,StaticObstacles,type Box} from '../../src/world/obstacles';
import {pointToBox} from '../../src/world/collisions';
import {roadHalfWidth,sampleRoad} from '../../src/world/roadGeometry';
import {CAR_MODELS,PANEL_VAN,parkedSize} from '../../src/assets/carSpecs';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import locationJson from '../../content/locations/representative-residential-straight.json';
import scenarioJson from '../../content/scenarios/crossing-restricted-view.json';

const place=parseLocation(locationJson);
const scenario=parseScenario(scenarioJson);
const layout=layoutStreetscape(place)!;
const road=place.roads[0]!;
const crossing=place.crossings[0]!;
const half=roadHalfWidth(road),pavementBack=half+road.pavementWidth;
const toBox=(b:Block):Box=>({id:b.id,cx:b.position.x,cz:b.position.z,heading:degToRad(b.headingDeg),halfW:b.size.width/2,halfD:b.size.depth/2});
const all=[...place.blocks,...layout.colliders];
const van=place.blocks.find(b=>b.id==='parked-van')!;
const pedestrian=scenario.actors.find(a=>a.kind==='pedestrian')!;
if(pedestrian.kind!=='pedestrian')throw new Error('no pedestrian');

/** Does the sight line from `eye` to `target` (x, y, z) pass through block `b` below its top? */
function blocks(b:Block,eye:[number,number,number],target:[number,number,number]):boolean{
  const h=degToRad(b.headingDeg),f={x:Math.sin(h),z:-Math.cos(h)},r={x:Math.cos(h),z:Math.sin(h)};
  const local=(x:number,z:number)=>{const dx=x-b.position.x,dz=z-b.position.z;return {u:dx*r.x+dz*r.z,v:dx*f.x+dz*f.z}};
  const a=local(eye[0],eye[2]),c=local(target[0],target[2]);
  // Clip the segment to the box footprint (slab method), then compare heights where it is inside.
  let t0=0,t1=1;
  for(const [p,d,lim] of [[a.u,c.u-a.u,b.size.width/2],[a.v,c.v-a.v,b.size.depth/2]] as const){
    if(Math.abs(d)<1e-9){if(Math.abs(p)>lim)return false;continue}
    let ta=(-lim-p)/d,tb=(lim-p)/d;
    if(ta>tb)[ta,tb]=[tb,ta];
    t0=Math.max(t0,ta);t1=Math.min(t1,tb);
    if(t0>t1)return false;
  }
  const yAt=(t:number)=>eye[1]+(target[1]-eye[1])*t;
  return Math.min(yAt(t0),yAt(t1))<b.size.height;
}
/** Fraction of points on the waiting pedestrian (head, shoulders, waist) visible from a driver's eye at `z` in the lane. */
function pedestrianVisible(z:number,x:number,obstacles:Block[]):number{
  const eye:[number,number,number]=[x-.37,1.2,z];
  const p=pedestrian.kind==='pedestrian'?pedestrian.waitAt:{x:0,z:0};
  const points:Array<[number,number,number]>=[[0,1.6],[-.2,1.4],[.2,1.4],[0,1.0],[-.18,.9],[.18,.9]].map(([dx,y])=>[p.x+dx!,y!,p.z]);
  return points.filter(pt=>!obstacles.some(b=>blocks(b,eye,pt))).length/points.length;
}

describe('zebra street: layout',()=>{
  it('is a full street on both sides, continuing behind the learner (mirrors) and beyond the crossing',()=>{
    expect(layout.houses.length).toBeGreaterThan(30);
    expect(new Set(layout.houses.map(h=>h.style)).size).toBeGreaterThanOrEqual(4);
    for(const side of [-1,1]){
      const near=layout.houses.filter(h=>Math.sign(h.frame.ox)===side&&h.frame.oz<20&&h.frame.oz>-130);
      expect(near.length,`side ${side}`).toBeGreaterThanOrEqual(6);
    }
    // Houses run about 160 m behind the start (the haze begins at 180 m) and about 100 m past the end of the exercise.
    expect(Math.max(...layout.houses.map(h=>h.frame.oz))).toBeGreaterThan(150);
  });

  it('keeps houses, gardens and street furniture off the carriageway',()=>{
    for(const c of layout.colliders){
      const d=Math.min(...[[1,1],[1,-1],[-1,-1],[-1,1]].map(([a,b])=>{
        const h=degToRad(c.headingDeg),f={x:Math.sin(h),z:-Math.cos(h)},r={x:Math.cos(h),z:Math.sin(h)};
        return sampleRoad(road,c.position.x+r.x*c.size.width/2*a!+f.x*c.size.depth/2*b!,c.position.z+r.z*c.size.width/2*a!+f.z*c.size.depth/2*b!).distance;
      }));
      if(c.kind==='building')expect(d,c.id).toBeGreaterThan(pavementBack+3);
      else if(c.id.startsWith('lamp-'))expect(d,c.id).toBeGreaterThan(half+.2);
      else expect(d,c.id).toBeGreaterThanOrEqual(pavementBack-.01);
    }
  });

  it('has no houses or vehicles intersecting each other',()=>{
    const solid=all.filter(b=>b.kind==='building'||b.kind==='parked-vehicle');
    for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)
      expect(boxesOverlap(toBox(solid[i]!),toBox(solid[j]!)),`${solid[i]!.id} / ${solid[j]!.id}`).toBe(false);
  });

  it('gives every parked vehicle a collision box the size of its model as drawn',()=>{
    for(const b of place.blocks.filter(b=>b.kind==='parked-vehicle')){
      const model=CAR_MODELS[b.vehicleModel as keyof typeof CAR_MODELS];
      const spec=b.vehicleModel===PANEL_VAN.id?PANEL_VAN:model&&parkedSize(model);
      expect(spec,b.id).toBeTruthy();
      [spec!.width,spec!.length,spec!.height].forEach((v,i)=>expect([b.size.width,b.size.depth,b.size.height][i],b.id).toBeCloseTo(v,3));
    }
  });

  it('puts no street light on the crossing or its approaches, and nothing in the pedestrian\'s path',()=>{
    for(const l of layout.lamps){
      const s=sampleRoad(road,l.x,l.z);
      expect(Math.abs(s.along-crossing.along),`lamp at ${s.along.toFixed(1)}`).toBeGreaterThan(crossing.width/2+7);
    }
    if(pedestrian.kind!=='pedestrian')return;
    const {waitAt,crossTo}=pedestrian;
    for(let t=0;t<=1;t+=.02){
      const x=waitAt.x+(crossTo.x-waitAt.x)*t,z=waitAt.z+(crossTo.z-waitAt.z)*t;
      for(const c of all){
        const g=pointToBox(x,z,{position:{x:c.position.x,y:0,z:c.position.z},heading:degToRad(c.headingDeg)},c.size.width/2,c.size.depth/2);
        expect(g,`${c.id} at t=${t.toFixed(2)}`).toBeGreaterThan(.3);
      }
    }
  });
});

describe('zebra street: the hazard and the lesson are unchanged',()=>{
  it('the van is where it was, the same size, and is the only thing hiding the waiting pedestrian',()=>{
    expect(van.position).toEqual({x:-2.4,z:-95});
    expect(van.size).toEqual({width:2,depth:5.3,height:2.3});
    // Approaching in the lane and while moving out past the van, the street adds no extra cover:
    // visibility with every collider equals visibility with the van alone.
    let hiddenFrom=0;
    for(let z=-20;z>=-100;z-=2){
      const x=z>-50?-1.6:-1.6+Math.min(1,(-50-z)/22)*2.9;
      const withVan=pedestrianVisible(z,x,[van]);
      const withAll=pedestrianVisible(z,x,all);
      expect(withAll,`z=${z}`).toBeCloseTo(withVan,5);
      if(withVan<.5)hiddenFrom++;
    }
    // The van does hide the pedestrian for a good part of the approach (as designed).
    expect(hiddenFrom).toBeGreaterThan(10);
  });

  it('the assisted path passes the van and reaches the end without touching any scenery',()=>{
    const obstacles=new StaticObstacles(all);
    const assist=new SteeringAssist(scenario.assistPath!,LEARNER_CAR);
    let s:VehicleState={position:{x:place.spawn.position.x,y:0,z:place.spawn.position.z},heading:0,speed:0,steerAngle:0};
    for(let t=0;t<40;t+=1/60){
      s=stepVehicle(s,{throttle:s.speed<8.9?1:0,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,1/60);
      expect(obstacles.firstCollision({position:s.position,heading:s.heading},.9,2.2),`z=${s.position.z.toFixed(1)}`).toBeNull();
    }
    expect(sampleRoad(road,s.position.x,s.position.z).along).toBeGreaterThan(scenario.zones.find(z=>z.id==='end')!.from);
  });

  it('the following car\'s straight start behind the learner is clear of parked cars',()=>{
    const follower=scenario.actors.find(a=>a.kind==='following-vehicle')!;
    if(follower.kind!=='following-vehicle')return;
    for(let z=0;z<=follower.startBehind+20;z+=.5)for(const c of all){
      const pose:Pose={position:{x:c.position.x,y:0,z:c.position.z},heading:degToRad(c.headingDeg)};
      expect(pointToBox(place.spawn.position.x,z,pose,c.size.width/2,c.size.depth/2)-.9,`${c.id} at z=${z}`).toBeGreaterThan(.2);
    }
  });

  it('the crossing and zones moved with the road start (along +290), so they are at the same places on the ground',()=>{
    expect(crossing.along).toBe(436);
    const zone=(id:string)=>scenario.zones.find(z=>z.id===id)!;
    expect([zone('restricted-approach').from,zone('restricted-approach').to]).toEqual([405,433]);
    expect([zone('pedestrian-trigger').from,zone('pedestrian-trigger').to]).toEqual([410,440]);
    // The crossing is still at z = 40 − 146 = −106, where the pedestrian waits.
    expect(330-crossing.along).toBe(-106);
    if(pedestrian.kind==='pedestrian')expect(pedestrian.waitAt.z).toBe(-106);
  });
});
