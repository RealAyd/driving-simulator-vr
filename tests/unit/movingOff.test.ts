import {describe,expect,it} from 'vitest';
import {headingFromDirection,parseLocation,parseScenario,type Pose} from '../../src/contracts';
import {EventLog} from '../../src/app/eventLog';
import {PassingVehicle} from '../../src/actors/passingVehicle';
import {MovingOffAssessor} from '../../src/assessment/movingOff';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {LEARNER_CAR,stepVehicle} from '../../src/vehicle/kinematics';
import {pointToBox} from '../../src/world/collisions';
import {surfaceAt} from '../../src/world/roadGeometry';
import scenarioJson from '../../content/scenarios/moving-off-safely.json';
import locationJson from '../../content/locations/residential-moving-off.json';
import rubric from '../../content/rubrics/moving-off.json';

const DT=1/60;
const scenario=parseScenario(scenarioJson);
const place=parseLocation(locationJson);
const HALF={width:.9,length:2.2};

type View='interior'|'right-door'|'left-door'|'right-shoulder'|'left-shoulder';
interface Plan{
  variant:string;
  /** Observations: view selected (dwell evidence) at these times. */
  looks:Array<[number,View]>;
  /** When the learner releases the brake and moves off (seconds), or a condition. */
  moveAt:number|((t:number,users:PassingVehicle[])=>boolean);
  signal?:'left'|'right';
  /** How long to keep simulating after moving off. */
  after?:number;
}

/** Runs one moving-off attempt with a learner car that follows the exercise path. */
function attempt(plan:Plan){
  let time=0;
  const events=new EventLog(()=>time);
  const path=new SteeringAssist(scenario.assistPath!,LEARNER_CAR);
  const start=scenario.start!.position;
  let s=0,speed=0,moving=false,moveTime=-1;
  let pose:Pose={position:{x:start.x,y:0,z:start.z},heading:0};
  const learner=()=>({pose,halfWidth:HALF.width,halfLength:HALF.length});
  const users=scenario.actors.filter(a=>a.kind==='passing-vehicle').map(d=>new PassingVehicle(d as never,learner,events));
  const variant=scenario.variants.find(v=>v.id===plan.variant)!;
  for(const u of users){const t=variant.actors[u.id];if(t)u.setTiming(t.delaySeconds,t.speed);u.reset()}
  const assessor=new MovingOffAssessor({
    events:()=>events.events,
    learner:()=>({pose,speed,halfWidth:HALF.width,halfLength:HALF.length,indicator:plan.signal??'off'}),
    roadUsers:users,now:()=>time
  },rubric,events);
  const looks=[...plan.looks];
  let minGap=Infinity;
  for(let step=0;step<60*90;step++){
    time+=DT;
    while(looks.length&&looks[0]![0]<=time){
      const [,view]=looks.shift()!;
      events.emit('view.selected',{view,by:'touch'});
      events.emit('observation.dwell',{target:view,startedAt:time-.25,source:'touch view button'});
    }
    if(!moving&&(typeof plan.moveAt==='number'?time>=plan.moveAt:plan.moveAt(time,users))){moving=true;moveTime=time}
    if(moving){
      speed=Math.min(4,speed+1.8*DT);
      s+=speed*DT;
      const a=path.pointAt(s),b=path.pointAt(s+.5);
      pose={position:{x:a.x,y:0,z:a.z},heading:headingFromDirection({x:b.x-a.x,z:b.z-a.z})};
      if(speed>.15&&!events.events.some(e=>e.type==='vehicle.moving'))events.emit('vehicle.moving',{speed});
    }
    for(const u of users){
      u.fixedUpdate(DT);
      if(u.started)minGap=Math.min(minGap,pointToBox(u.pose.position.x,u.pose.position.z,pose,HALF.width,HALF.length));
    }
    assessor.fixedUpdate();
    if(moving&&time>moveTime+(plan.after??10))break;
  }
  return {result:assessor.finish(scenario.id,'completed',time),events:events.events,minGap,users};
}
const ids=(r:ReturnType<typeof attempt>)=>r.result.findings.map(f=>f.incidentId);
const text=(r:ReturnType<typeof attempt>)=>r.result.findings.map(f=>f.explanation).join(' | ');
const allLooks=(t:number):Array<[number,View]>=>[[t,'interior'],[t+.6,'right-door'],[t+1.2,'left-door'],[t+1.8,'left-shoulder'],[t+2.4,'right-shoulder']];
const passed=(users:PassingVehicle[],id:string)=>users.find(u=>u.id===id)!.pose.position.z<-6;
const zOf=(users:PassingVehicle[],id:string)=>users.find(u=>u.id===id)!.pose.position.z;

describe('moving off safely: road user paths are physically plausible',()=>{
  it.each(scenario.actors.map(a=>[a.id,a] as const))('%s stays on the carriageway, never meets the parked learner or the parked car ahead',(_,actor)=>{
    if(actor.kind!=='passing-vehicle')return;
    const parked:Pose={position:{x:scenario.start!.position.x,y:0,z:scenario.start!.position.z},heading:0};
    const ahead=place.blocks.find(b=>b.id==='parked-car-ahead')!;
    const u=new PassingVehicle(actor,null,null);
    u.setTiming(0);u.reset();
    let minLearner=Infinity,minAhead=Infinity,off=0;
    for(let t=0;t<60;t+=DT){
      u.fixedUpdate(DT);
      const {x,z}=u.pose.position;
      minLearner=Math.min(minLearner,pointToBox(x,z,parked,HALF.width,HALF.length));
      minAhead=Math.min(minAhead,pointToBox(x,z,{position:{x:ahead.position.x,y:0,z:ahead.position.z},heading:0},ahead.size.width/2,ahead.size.depth/2));
      for(const side of [-1,1])if(surfaceAt(place,x+side*u.size.halfWidth,z)?.kind!=='carriageway')off++;
    }
    const clearance=minLearner-u.size.halfWidth;
    expect(off).toBe(0);                       // never on the pavement
    expect(clearance).toBeGreaterThan(.6);     // passes the parked learner with room to spare
    expect(minAhead-u.size.halfWidth).toBeGreaterThan(.6);
  });
});

describe('moving off safely: the decision is assessed, not a checklist',()=>{
  it('waiting for both road users, checking again and moving into the clear road succeeds',()=>{
    const r=attempt({variant:'car-then-cyclist',signal:'right',
      looks:[[2,'right-door'],...allLooks(27)],
      moveAt:(t,u)=>t>30&&passed(u,'purple-car')&&passed(u,'cyclist')});
    expect(r.result.findings).toEqual([]);
    expect(r.result.notes.join(' ')).toContain('You waited while the purple car and the yellow cyclist passed');
    expect(r.result.notes.join(' ')).toContain('without affecting anyone');
  });

  it('pressing every view early does not make a later unsafe move acceptable, even with a signal',()=>{
    const r=attempt({variant:'car-then-cyclist',signal:'right',looks:allLooks(1),
      moveAt:(t,u)=>zOf(u,'purple-car')<14&&zOf(u,'purple-car')>4});
    expect(ids(r)).toContain('conflict-purple-car');
    const conflict=r.result.findings.find(f=>f.incidentId==='conflict-purple-car')!;
    expect(['serious','dangerous']).toContain(conflict.severity);
    expect(conflict.explanation).toContain('purple car');
    expect(conflict.explanation).toContain('Signalling does not make moving out safe');
    // The early views were out of date when it mattered.
    expect(ids(r)).toContain('observation-right-blind-spot');
    expect(text(r)).toContain('out of date');
    // Evidence: the moving-off event and the purple car's avoiding response.
    const types=conflict.eventIds.map(id=>r.events.find(e=>e.id===id)?.type);
    expect(types).toContain('vehicle.moving');
    expect(types).toContain('actor.avoiding');
  });

  it('moving off while the purple car is alongside is described in plain language',()=>{
    const r=attempt({variant:'car-then-cyclist',looks:allLooks(1),
      moveAt:(t,u)=>Math.abs(zOf(u,'purple-car'))<1.5});
    expect(text(r)).toContain('You moved off while the purple car was passing on your right.');
  });

  it('checks made before a road user passed must be refreshed after waiting',()=>{
    // Fresh enough by the clock (within the recency windows), but the purple car passed after them.
    const r=attempt({variant:'car-then-cyclist',looks:allLooks(9.5),signal:'right',
      moveAt:(t,u)=>passed(u,'purple-car')&&t>15.5&&t<16});
    expect(text(r)).toContain('did not check again after waiting');
  });

  it('waiting for the purple car does not excuse pulling out in front of the cyclist',()=>{
    const r=attempt({variant:'car-then-late-cyclist',signal:'right',
      looks:allLooks(0),
      moveAt:(t,u)=>passed(u,'purple-car')&&zOf(u,'cyclist')<8&&zOf(u,'cyclist')>4});
    expect(ids(r)).toContain('conflict-cyclist');
    expect(text(r)).toContain('yellow cyclist');
  });

  it('a road user that is far away is not a reason to wait: moving off early can be safe',()=>{
    const r=attempt({variant:'cyclist-then-late-car',signal:'right',looks:allLooks(.5),moveAt:3.5});
    expect(ids(r).filter(id=>id.startsWith('conflict-'))).toEqual([]);
    expect(r.minGap).toBeGreaterThan(1);
  });

  it('one incident per road user: a close pass and an avoiding response are one finding, raised in severity',()=>{
    const r=attempt({variant:'car-then-cyclist',looks:allLooks(1),
      moveAt:(t,u)=>zOf(u,'purple-car')<9&&zOf(u,'purple-car')>5});
    const conflicts=r.result.findings.filter(f=>f.incidentId==='conflict-purple-car');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.eventIds.length).toBeGreaterThan(1);
  });

  it('labels the rubric as a draft and view evidence as selected views, not eye tracking',()=>{
    const r=attempt({variant:'cyclist-then-late-car',looks:[],moveAt:3});
    expect(r.result.rubricVersion).toContain('draft');
    expect(r.result.notes.join(' ')).toContain('not eye tracking');
    expect(ids(r)).toEqual(expect.arrayContaining(['observation-behind','observation-right-blind-spot','observation-left-side']));
  });
});

describe('moving off safely: the assisted path',()=>{
  it('pulls out past the parked car ahead with room to spare, even when the learner keeps accelerating',()=>{
    const assist=new SteeringAssist(scenario.assistPath!,LEARNER_CAR);
    const ahead=place.blocks.find(b=>b.id==='parked-car-ahead')!;
    const box:Pose={position:{x:ahead.position.x,y:0,z:ahead.position.z},heading:0};
    let s:import('../../src/vehicle/kinematics').VehicleState={position:{x:scenario.start!.position.x,y:0,z:0},heading:0,speed:0,steerAngle:0};
    let clearance=Infinity,off=0;
    for(let t=0;t<12;t+=DT){
      s=stepVehicle(s,{throttle:s.speed<6?1:0,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
      // Closest corner of the learner's car to the parked car.
      for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]] as const){
        const c={x:s.position.x+Math.cos(s.heading)*dx*HALF.width-Math.sin(s.heading)*dz*HALF.length,z:s.position.z+Math.sin(s.heading)*dx*HALF.width+Math.cos(s.heading)*dz*HALF.length};
        clearance=Math.min(clearance,pointToBox(c.x,c.z,box,ahead.size.width/2,ahead.size.depth/2));
      }
      if(surfaceAt(place,s.position.x,s.position.z)?.kind!=='carriageway')off++;
    }
    expect(clearance).toBeGreaterThan(.4);
    expect(off).toBe(0);
    expect(s.position.z).toBeLessThan(-26); // into the lane past the parked car
  });
});
