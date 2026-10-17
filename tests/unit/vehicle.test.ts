import {describe,expect,it} from 'vitest';
import {degToRad,type EventSink,type SimEventType} from '../../src/contracts';
import {Indicators,INDICATOR_PERIOD} from '../../src/vehicle/indicators';
import {LEARNER_CAR,NO_CONTROLS,stepVehicle,stoppingDistance,type Controls,type VehicleState} from '../../src/vehicle/kinematics';
import {VehicleController} from '../../src/vehicle/vehicleController';

const DT=1/60;
const start=(speed=0):VehicleState=>({position:{x:0,y:0,z:0},heading:0,speed,steerAngle:0});
function drive(state:VehicleState,controls:Controls,seconds:number){
  for(let t=0;t<seconds;t+=DT)state=stepVehicle(state,controls,LEARNER_CAR,DT);
  return state;
}

describe('kinematic learner car',()=>{
  it('steering right turns clockwise and moves east of the start line',()=>{
    const s=drive(start(8),{throttle:.3,brake:0,steer:1},2);
    expect(s.heading).toBeGreaterThan(0);
    expect(s.heading).toBeLessThan(Math.PI);
    expect(s.position.x).toBeGreaterThan(1);
  });
  it('steering left turns anticlockwise and moves west',()=>{
    const s=drive(start(8),{throttle:.3,brake:0,steer:-1},2);
    expect(s.heading).toBeGreaterThan(Math.PI);
    expect(s.position.x).toBeLessThan(-1);
  });
  it('drives straight north with no steering',()=>{
    const s=drive(start(),{throttle:1,brake:0,steer:0},3);
    expect(s.position.z).toBeLessThan(-5);
    expect(Math.abs(s.position.x)).toBeLessThan(1e-9);
  });
  it('never exceeds the speed limit or goes negative',()=>{
    expect(drive(start(),{throttle:1,brake:0,steer:0},120).speed).toBeLessThanOrEqual(LEARNER_CAR.maxSpeed);
    expect(drive(start(5),{throttle:0,brake:1,steer:0},5).speed).toBe(0);
  });
  it('stops predictably: simulated braking distance matches v²/2a',()=>{
    let s=start(13.4); // 30 mph
    const z0=s.position.z;
    while(s.speed>0)s=stepVehicle(s,{throttle:0,brake:1,steer:0},LEARNER_CAR,DT);
    const travelled=z0-s.position.z;
    const expected=stoppingDistance(LEARNER_CAR,13.4);
    expect(Math.abs(travelled-expected)).toBeLessThan(.6); // rolling resistance helps slightly
  });
  it('smooths steering instead of snapping the wheels',()=>{
    const s=stepVehicle(start(5),{throttle:0,brake:0,steer:1},LEARNER_CAR,DT);
    expect(s.steerAngle).toBeCloseTo(LEARNER_CAR.steerRate*DT,9);
  });
});

describe('indicators',()=>{
  it('toggles, cancels and flashes at the documented rate',()=>{
    const ind=new Indicators();
    expect(ind.toggle('left',0)).toBe('left');
    expect(ind.isLit(.01)).toBe(true);
    expect(ind.isLit(INDICATOR_PERIOD*.75)).toBe(false);
    expect(ind.toggle('right',1)).toBe('right');
    expect(ind.toggle('right',2)).toBe('off');
    expect(ind.isLit(2.1)).toBe(false);
  });
});

function sink(){
  const log:Array<{type:SimEventType;payload:Record<string,unknown>}>=[];
  const s:EventSink={emit:(type,payload={})=>{log.push({type,payload});return {id:String(log.length),type,time:0,payload}}};
  return {log,s};
}

describe('vehicle controller',()=>{
  const flat={surfaceHeightAt:()=>0,groundHeight:0};
  it('is the single movement owner: emits moving/stopped once per transition and resets',()=>{
    let controls:Controls={throttle:1,brake:0,steer:0};
    const {log,s}=sink();
    const v=new VehicleController({position:{x:-1.6,y:0,z:0},heading:0},{read:()=>controls},flat,{firstCollision:()=>null},s);
    for(let i=0;i<60;i++)v.fixedUpdate(DT);
    controls={throttle:0,brake:1,steer:0};
    for(let i=0;i<240;i++)v.fixedUpdate(DT);
    expect(log.map(e=>e.type)).toEqual(['vehicle.moving','vehicle.braking','vehicle.stopped']);
    v.reset();
    expect(v.state.speed).toBe(0);
    expect(v.state.position).toEqual({x:-1.6,y:0,z:0});
  });
  it('takes height from the road query, not from scene meshes',()=>{
    const v=new VehicleController({position:{x:0,y:99,z:0},heading:0},{read:()=>NO_CONTROLS},
      {surfaceHeightAt:()=>.3,groundHeight:0},{firstCollision:()=>null},sink().s);
    expect(v.state.position.y).toBe(.3);
  });
  it('stops at an obstacle and reports the contact once',()=>{
    const {log,s}=sink();
    const v=new VehicleController({position:{x:0,y:0,z:0},heading:0},{read:()=>({throttle:1,brake:0,steer:0})},flat,
      {firstCollision:(pose,_w,halfLength)=>pose.position.z-halfLength< -5?'wall':null},s);
    for(let i=0;i<300;i++)v.fixedUpdate(DT); // keeps pressing the accelerator into the wall
    expect(v.state.position.z-v.halfLength).toBeGreaterThanOrEqual(-5);
    expect(log.filter(e=>e.type==='vehicle.collision')).toHaveLength(1);
  });
  it('counts a fresh approach after moving away as a new contact',()=>{
    const {log,s}=sink();
    const v=new VehicleController({position:{x:0,y:0,z:0},heading:0},{read:()=>({throttle:1,brake:0,steer:0})},flat,
      {firstCollision:(pose,_w,halfLength)=>pose.position.z-halfLength< -5?'wall':null},s);
    for(let i=0;i<180;i++)v.fixedUpdate(DT);
    v.reset(); // back at the start, well clear of the wall
    for(let i=0;i<180;i++)v.fixedUpdate(DT);
    expect(log.filter(e=>e.type==='vehicle.collision')).toHaveLength(2);
  });
  it('interpolates headings across north without spinning the long way',()=>{
    const v=new VehicleController({position:{x:0,y:0,z:0},heading:degToRad(359)},{read:()=>({throttle:1,brake:0,steer:1})},flat,{firstCollision:()=>null},sink().s);
    for(let i=0;i<120;i++)v.fixedUpdate(DT);
    const mid=v.interpolatedPose(.5).heading;
    expect(Math.abs(mid-v.state.heading)).toBeLessThan(.1);
  });
});
