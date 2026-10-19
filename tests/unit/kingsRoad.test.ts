import {describe,expect,it} from 'vitest';
import {degToRad,parseLocation,parseScenario,type Block,type PedestrianActorDef,type Pose} from '../../src/contracts';
import {layoutTownscape} from '../../src/world/townscape';
import {layoutSignage} from '../../src/world/signage';
import {StaticObstacles} from '../../src/world/obstacles';
import {pointToBox} from '../../src/world/collisions';
import {pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {Bus,BUS_SIZE} from '../../src/actors/bus';
import {Pedestrian} from '../../src/actors/pedestrian';
import {EventLog} from '../../src/app/eventLog';
import {headingFromDirection} from '../../src/contracts';
import locationJson from '../../content/locations/brentwood-kings-road-zebra.json';
import scenarioJson from '../../content/scenarios/brentwood-kings-road-zebra.json';

const place=parseLocation(locationJson);
const scenario=parseScenario(scenarioJson);
const road=place.roads.find(r=>r.id==='kings-road')!;
const crossing=place.crossings[0]!;
const layout=layoutTownscape(place)!;
const signs=layoutSignage(place,layout);
const colliders=[...place.blocks,...layout.colliders,...signs.colliders];
const ped=scenario.actors.find(a=>a.kind==='pedestrian') as PedestrianActorDef;
const busDef=scenario.buses[0]!;
const bus=new Bus(busDef,place);
const busBlock:Block={id:'bus',kind:'parked-vehicle',position:{x:bus.pose.position.x,z:bus.pose.position.z},headingDeg:bus.pose.heading*180/Math.PI,
  size:{width:BUS_SIZE.halfWidth*2,depth:BUS_SIZE.halfLength*2,height:BUS_SIZE.height},occludes:true,shape:'box'};
const zone=(id:string)=>scenario.zones.find(z=>z.id===id)!;
const giveWay=crossing.along-crossing.width/2-crossing.giveWayOffset;

/** Does the sight line from `eye` to `target` pass through block `b` below its top? (slab clipping) */
function blocks(b:Block,eye:[number,number,number],target:[number,number,number]):boolean{
  const h=degToRad(b.headingDeg),f={x:Math.sin(h),z:-Math.cos(h)},r={x:Math.cos(h),z:Math.sin(h)};
  const local=(x:number,z:number)=>{const dx=x-b.position.x,dz=z-b.position.z;return {u:dx*r.x+dz*r.z,v:dx*f.x+dz*f.z}};
  const a=local(eye[0],eye[2]),c=local(target[0],target[2]);
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
/** Fraction of points on a person standing at `p` visible from the driver's eye with the car's centre at `along`, `lateral`. */
function visible(along:number,lateral:number,p:{x:number;z:number},obstacles:Block[]):number{
  const c=pointAtAlong(road,along);
  // Driver's eye: 0.37 m right of the car's centre line.
  const ex=c.x-c.direction.z*(lateral+.37),ez=c.z+c.direction.x*(lateral+.37);
  const points:Array<[number,number,number]>=[[0,1.6],[-.2,1.4],[.2,1.4],[0,1],[-.18,.9],[.18,.9]].map(([d,y])=>[p.x+d!,y!,p.z]);
  return points.filter(pt=>!obstacles.some(b=>blocks(b,[ex,1.2,ez],pt))).length/points.length;
}

describe('Kings Road zebra (Brentwood): map data',()=>{
  it('is labelled area-inspired and unreviewed, names its place and credits OpenStreetMap and Overture',()=>{
    expect(place.name).toContain('area-inspired');
    expect(place.reviewStatus).toBe('unreviewed');
    expect(place.placeName).toBe('Brentwood');
    expect(place.sources.map(s=>s.licence).join(' ')).toContain('OpenStreetMap');
    expect(place.sources.map(s=>s.licence).join(' ')).toContain('Overture');
    expect(scenario.briefing).toContain('not a record of real traffic');
  });
  it('puts the zebra crossing at the mapped node (the world origin) on Kings Road, 30 mph from map data',()=>{
    const at=pointAtAlong(road,crossing.along);
    expect(Math.hypot(at.x,at.z)).toBeLessThan(1);
    expect(crossing.kind).toBe('zebra');
    expect(road.speedLimitMph).toBe(30);
    // The side roads either side of the crossing exist as real junction mouths.
    for(const id of ['kings-chase','primrose-hill','white-lyons-road','westbury-road'])expect(place.roads.some(r=>r.id===id),id).toBe(true);
  });
  it('the mapped bus stop stands at the southbound (left) kerb, with its name and no shelter (as mapped)',()=>{
    expect(place.furniture).toHaveLength(1);
    const stop=place.furniture[0]!;
    expect(stop.name).toBe('Queens Road Roundabout');
    expect(stop.shelter).toBe(false);
    const s=sampleRoad(road,stop.position.x,stop.position.z);
    expect(s.lateral).toBeLessThan(-roadHalfWidth(road));
    expect(surfaceAt(place,stop.position.x,stop.position.z)?.kind).toBe('pavement');
    expect(crossing.along-s.along).toBeGreaterThan(30);
  });
});

describe('Kings Road zebra: the exercise',()=>{
  it('the bus stands at the stop, front at the flag, in the learner\'s lane, clear of the kerb and all scenery, for the whole exercise',()=>{
    const flag=sampleRoad(road,place.furniture[0]!.position.x,place.furniture[0]!.position.z).along;
    const front=sampleRoad(road,bus.pose.position.x,bus.pose.position.z).along+BUS_SIZE.halfLength;
    expect(Math.abs(front-flag)).toBeLessThan(.6);
    expect(busDef.startDwellSeconds).toBeGreaterThan(scenario.end.timeLimitSeconds);
    const obstacles=new StaticObstacles(colliders);
    expect(obstacles.firstCollision(bus.pose,BUS_SIZE.halfWidth,BUS_SIZE.halfLength)).toBeNull();
    const f={x:Math.sin(bus.pose.heading),z:-Math.cos(bus.pose.heading)},a={x:-f.z,z:f.x};
    for(const u of [-1,1])for(const v of [-1,0,1]){
      const p={x:bus.pose.position.x+a.x*u*BUS_SIZE.halfWidth+f.x*v*BUS_SIZE.halfLength,z:bus.pose.position.z+a.z*u*BUS_SIZE.halfWidth+f.z*v*BUS_SIZE.halfLength};
      expect(surfaceAt(place,p.x,p.z)?.kind).toBe('carriageway');
      expect(sampleRoad(road,p.x,p.z).lateral).toBeLessThan(.05);
    }
    // It never moves during the exercise.
    for(let t=0;t<scenario.end.timeLimitSeconds;t+=1/30)bus.fixedUpdate(1/30);
    expect(bus.travelled).toBe(0);
    bus.reset();
  });

  it('the assisted path passes the bus and reaches the end without touching the bus, the kerb or any scenery',()=>{
    const obstacles=new StaticObstacles([...colliders,busBlock]);
    const assist=new SteeringAssist(scenario.assistPath!,LEARNER_CAR);
    const start=scenario.start!;
    let s:VehicleState={position:{x:start.position.x,y:0,z:start.position.z},heading:degToRad(start.headingDeg),speed:0,steerAngle:0};
    let minLateral=Infinity;
    for(let t=0;t<45;t+=1/60){
      s=stepVehicle(s,{throttle:s.speed<8.9?1:0,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,1/60);
      const pose={position:s.position,heading:s.heading};
      expect(obstacles.firstCollision(pose,.9,2.2),`at ${sampleRoad(road,s.position.x,s.position.z).along.toFixed(1)}`).toBeNull();
      expect(surfaceAt(place,s.position.x,s.position.z)?.kind).toBe('carriageway');
      minLateral=Math.min(minLateral,sampleRoad(road,s.position.x,s.position.z).lateral);
      if(sampleRoad(road,s.position.x,s.position.z).along>zone('end').from+5)break;
    }
    expect(sampleRoad(road,s.position.x,s.position.z).along).toBeGreaterThan(zone('end').from);
    // It keeps to the left lane where there is no bus (centre at least 1 m left of the centre line).
    expect(minLateral).toBeLessThan(-1);
  });

  it('the passenger walks along the pavement to the kerb, then across the crossing, clear of every post and column',()=>{
    const from=ped.walkFrom!;
    for(const [a,b,kind] of [[from,ped.waitAt,'pavement'],[ped.waitAt,ped.crossTo,null]] as const)for(let t=0;t<=1;t+=.02){
      const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      if(kind)expect(surfaceAt(place,x,z)?.kind,`walk at ${t}`).toBe('pavement');
      else expect(Math.abs(sampleRoad(road,x,z).along-crossing.along)).toBeLessThan(crossing.width/2);
      for(const c of colliders){
        const g=pointToBox(x,z,{position:{x:c.position.x,y:0,z:c.position.z},heading:degToRad(c.headingDeg)},c.size.width/2,c.size.depth/2);
        expect(g,`${c.id} at t=${t.toFixed(2)}`).toBeGreaterThan(.3);
      }
    }
    // They reach the kerb about 15 s into the exercise and only then can start to cross.
    const p=new Pedestrian(ped,new EventLog(()=>0));
    p.requestCrossing(0);
    let t=0;
    for(;p.approaching&&t<60;t+=1/60)p.fixedUpdate(1/60);
    expect(t).toBeGreaterThan(10);
    expect(t).toBeLessThan(20);
    expect(p.state).toBe('waiting');
    for(let k=0;k<120&&p.state==='waiting';k++)p.fixedUpdate(1/60);
    expect(p.state).toBe('preparing');
  });

  it('the bus hides the pavement where the passenger waits from behind it, and the passenger can be seen in time once past it',()=>{
    const all=[...colliders,busBlock];
    let hidden=0;
    // Behind the bus in the left lane: the crossing's near-side kerb is hidden for much of the approach.
    for(let a=zone('restricted-approach').from-30;a<=zone('restricted-approach').from-4;a+=2)if(visible(a,-1.6,ped.waitAt,all)<.5)hidden++;
    expect(hidden).toBeGreaterThan(3);
    // Moved out to pass it, and from beside its front to the line, the waiting passenger is in view at least
    // 15 m before the give-way line (stopping from 20 mph takes about 12 m).
    for(let a=zone('restricted-approach').from+12;a<=giveWay-15;a+=1)expect(visible(a,1.6,ped.waitAt,all),`at ${a}`).toBeGreaterThanOrEqual(.5);
    // Static scenery adds no cover near the crossing: the bus is the only thing that hides them there.
    for(let a=giveWay-25;a<=giveWay-4;a+=1)expect(visible(a,-1.6,ped.waitAt,all)).toBeCloseTo(visible(a,-1.6,ped.waitAt,[busBlock]),5);
  });

  it('zones run in order: past the bus, the pedestrian trigger, the end before the roundabout',()=>{
    expect(zone('restricted-approach').to).toBeCloseTo(giveWay,1);
    expect(zone('pedestrian-trigger').from).toBeLessThan(giveWay);
    expect(zone('end').from).toBeGreaterThan(crossing.along+crossing.width);
    const length=road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
    expect(zone('end').to).toBeLessThan(length-5);
    expect(scenario.restrictedViewBy).toBe('the bus at the stop');
    // The following car starts in the lane behind, clear of scenery.
    const follower=scenario.actors.find(a=>a.kind==='following-vehicle')!;
    if(follower.kind!=='following-vehicle')return;
    const startAlong=sampleRoad(road,scenario.start!.position.x,scenario.start!.position.z).along;
    const obstacles=new StaticObstacles(colliders);
    for(let a=startAlong-follower.startBehind-5;a<=startAlong;a+=1){
      const c=pointAtAlong(road,a);
      const pose:Pose={position:{x:c.x+c.direction.z*1.6,y:0,z:c.z-c.direction.x*1.6},heading:headingFromDirection(c.direction)};
      expect(obstacles.firstCollision(pose,.9,2.2),`at ${a}`).toBeNull();
    }
  });
});
