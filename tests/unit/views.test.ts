import {describe,expect,it} from 'vitest';
import {degToRad,headingDelta,parseScenario,worldToLocal,localToWorld,type Pose} from '../../src/contracts';
import {PassingVehicle} from '../../src/actors/passingVehicle';
import {blindSpotSide} from '../../src/assessment/viewPractice';
import {DriverHead} from '../../src/cockpit/seat';
import {ALL_MIRRORS} from '../../src/cockpit/mirror';
import {KeyboardInput} from '../../src/input/keyboard';
import {LEARNER_CAR,steerLimit,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {SteerRamp} from '../../src/input/steerRamp';
import movingOffIntro from '../../content/scenarios/moving-off-intro.json';
import crossing from '../../content/scenarios/crossing-restricted-view.json';
import location from '../../content/locations/representative-residential-straight.json';
import {parseLocation} from '../../src/contracts';
import {sampleRoad} from '../../src/world/roadGeometry';

const DT=1/60;
/** Left-lane centre of the straight part of the road. */
const STRAIGHT_LANE=[{x:-1.6,z:40},{x:-1.6,z:-300}];

describe('steering assistance (pure pursuit)',()=>{
  it('brings a car that starts 1.5 m off the lane back onto it and keeps it there',()=>{
    const assist=new SteeringAssist([{x:-1.6,z:40},{x:-1.6,z:-300}],LEARNER_CAR);
    let s:VehicleState={position:{x:-0.1,y:0,z:0},heading:0,speed:8,steerAngle:0};
    let worst=0;
    for(let t=0;t<12;t+=DT){
      s=stepVehicle(s,{throttle:.2,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
      if(t>4)worst=Math.max(worst,Math.abs(s.position.x+1.6));
    }
    expect(worst).toBeLessThan(.15);
  });
  it('follows the crossing exercise path out round the parked van and back',()=>{
    const path=parseScenario(crossing).assistPath!;
    const assist=new SteeringAssist(path,LEARNER_CAR);
    let s:VehicleState={position:{x:-1.6,y:0,z:0},heading:0,speed:6,steerAngle:0};
    let atVan=Infinity;
    for(let t=0;t<40&&s.position.z>-150;t+=DT){
      s=stepVehicle(s,{throttle:.15,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
      if(Math.abs(s.position.z+95)<.2)atVan=s.position.x;
    }
    expect(atVan).toBeGreaterThan(.5); // passing the van (x -3.4…-1.4) in the other lane
    expect(s.position.z).toBeLessThan(-145);
    expect(Math.abs(s.position.x+1.6)).toBeLessThan(.6); // back in the left lane
  });
  it.each([['crossing',crossing]])('keeps the car on the road all the way to the end in %s, round the bend',(_,raw)=>{
    // Regression: an earlier exercise's path ran into the parked van and stopped before the bend.
    const place=parseLocation(location),road=place.roads[0]!;
    let closest=Infinity;
    const assist=new SteeringAssist(parseScenario(raw).assistPath!,LEARNER_CAR);
    let s:VehicleState={position:{x:-1.6,y:0,z:0},heading:0,speed:10,steerAngle:0};
    let worst=0;
    let along=0;
    for(let t=0;t<60&&along<330;t+=DT){
      s=stepVehicle(s,{throttle:.3,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
      const sample=sampleRoad(road,s.position.x,s.position.z);
      along=sample.along;
      worst=Math.max(worst,Math.abs(sample.lateral));
      for(const b of place.blocks){
        const dx=Math.max(0,Math.abs(s.position.x-b.position.x)-b.size.width/2);
        const dz=Math.max(0,Math.abs(s.position.z-b.position.z)-b.size.depth/2);
        closest=Math.min(closest,Math.hypot(dx,dz));
      }
    }
    expect(along).toBeGreaterThan(330);
    expect(closest).toBeGreaterThan(1); // car half-width 0.9 m: never touches a parked vehicle or building
    expect(worst).toBeLessThan(3.2); // never off the carriageway
  });
  it('carries straight on past the end of its path instead of turning back',()=>{
    const assist=new SteeringAssist([{x:-1.6,z:40},{x:-1.6,z:-20}],LEARNER_CAR);
    let s:VehicleState={position:{x:-1.3,y:0,z:-10},heading:.02,speed:8,steerAngle:0};
    for(let t=0;t<6;t+=DT)s=stepVehicle(s,{throttle:.2,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
    expect(s.position.z).toBeLessThan(-50);
    expect(Math.abs(headingDelta(s.heading,0))).toBeLessThan(.05);
    expect(Math.abs(s.position.x+1.6)).toBeLessThan(.2);
  });
  it('steers a car that has drifted 3 m off at an angle back into its lane',()=>{
    const assist=new SteeringAssist(STRAIGHT_LANE,LEARNER_CAR);
    let s:VehicleState={position:{x:1.6,y:0,z:-20},heading:degToRad(25),speed:6,steerAngle:0};
    for(let t=0;t<8;t+=DT)s=stepVehicle(s,{throttle:.15,brake:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
    expect(Math.abs(s.position.x+1.6)).toBeLessThan(.3);
    expect(Math.abs(headingDelta(s.heading,0))).toBeLessThan(.05);
  });
  it('gives no steering when the car is stopped on its path, and sets the wheels to pull out when stopped off it',()=>{
    const assist=new SteeringAssist([{x:0,z:0},{x:10,z:-10}],LEARNER_CAR);
    expect(assist.steer({position:{x:0,y:0,z:0},heading:0},0)).toBe(0);
    // At the kerb 2 m left of a straight lane (pulled in behind a parked car): wheels to the right, towards it.
    const lane=new SteeringAssist(STRAIGHT_LANE,LEARNER_CAR);
    expect(lane.steer({position:{x:-3.6,y:0,z:-20},heading:0},0)).toBeGreaterThan(.3);
  });
});

describe('held views',()=>{
  it('turns the head to a held view, returns after release, and never pulls back a swipe-look',()=>{
    const head=new DriverHead();
    const right=head.aimAt(ALL_MIRRORS[1].glass);
    expect(right.yaw).toBeGreaterThan(0);           // driver's door mirror is to the right
    expect(head.aimAt(ALL_MIRRORS[2].glass).yaw).toBeLessThan(-.6); // passenger mirror well to the left
    head.hold(right);
    for(let i=0;i<60;i++)head.animate(DT);
    expect(head.yaw).toBeCloseTo(right.yaw,6);
    head.hold(null);
    for(let i=0;i<60;i++)head.animate(DT);
    expect(head.yaw).toBeCloseTo(0,6);
    head.look(.5,0);                                // swipe-look afterwards
    for(let i=0;i<60;i++)head.animate(DT);
    expect(head.yaw).toBeCloseTo(.5,6);
  });
});

describe('blind spots',()=>{
  const learner:Pose={position:{x:-1.6,y:0,z:0},heading:0};
  it('round-trips world and vehicle-local coordinates',()=>{
    const pose:Pose={position:{x:3,y:0,z:-2},heading:degToRad(37)};
    const p={x:.4,y:1.1,z:2.5};
    const back=worldToLocal(pose,localToWorld(pose,p));
    expect(back.x).toBeCloseTo(p.x,9);expect(back.z).toBeCloseTo(p.z,9);
  });
  it('is beside or just behind the car, on the correct side',()=>{
    const at=(x:number,z:number):Pose=>({position:{x,y:0,z},heading:0});
    expect(blindSpotSide(learner,at(1.5,-1))).toBe('right');  // overtaking car alongside
    expect(blindSpotSide(learner,at(-3,-.5))).toBe('left');   // cyclist on the left
    expect(blindSpotSide(learner,at(1.5,3))).toBeNull();      // behind: still in the door mirror
    expect(blindSpotSide(learner,at(1.5,12))).toBeNull();     // far behind: visible in mirrors
    expect(blindSpotSide(learner,at(1.5,-6))).toBeNull();     // ahead: visible directly
  });
});

describe('passing vehicles',()=>{
  it('drive their path at constant speed after the delay and repeat',()=>{
    const def=parseScenario(movingOffIntro).actors.find(a=>a.id==='purple-car');
    if(def?.kind!=='passing-vehicle')throw new Error('missing actor');
    const car=new PassingVehicle(def);
    const z0=car.pose.position.z;
    for(let t=0;t<def.delaySeconds;t+=DT)car.fixedUpdate(DT);
    expect(car.pose.position.z).toBe(z0);
    for(let i=0;i<120;i++)car.fixedUpdate(DT);
    expect(z0-car.pose.position.z).toBeCloseTo(def.speed*2,0);
    for(let t=0;t<car.length/def.speed+1;t+=DT)car.fixedUpdate(DT);
    expect(z0-car.pose.position.z).toBeLessThan(def.speed*4); // started again near the beginning
    car.reset();
    expect(car.pose.position.z).toBe(z0);
  });
});

describe('keyboard view keys',()=>{
  it('hold a view while the key is down and release it on key up',()=>{
    const win=new EventTarget();
    const input=new KeyboardInput(win,win);
    const views:Array<string|null>=[];
    input.onView=v=>views.push(v);
    const key=(type:string,code:string,repeat=false)=>Object.assign(new Event(type),{code,repeat});
    win.dispatchEvent(key('keydown','KeyE'));
    win.dispatchEvent(key('keydown','KeyE',true));
    win.dispatchEvent(key('keyup','KeyE'));
    win.dispatchEvent(key('keydown','Digit2'));
    expect(views).toEqual(['right-shoulder',null,'interior']);
  });
});

describe('button and key steering',()=>{
  it('builds up gradually, so a tap is a small correction, and releases at once',()=>{
    const ramp=new SteerRamp();
    let v=0;
    for(let t=0;t<.3;t+=DT)v=ramp.update(1,DT);
    expect(v).toBeGreaterThan(.4);
    expect(v).toBeLessThan(.65);
    for(let t=0;t<.5;t+=DT)v=ramp.update(1,DT);
    expect(v).toBe(1);
    expect(ramp.update(0,DT)).toBe(0);
    expect(ramp.update(-1,DT)).toBeCloseTo(-.15);
  });
  it('a 0.3 s tap at 30 mph moves the car less than half a metre, and the assistance returns it to the lane',()=>{
    const road=parseLocation(location).roads[0]!;
    const assist=new SteeringAssist(STRAIGHT_LANE,LEARNER_CAR);
    const ramp=new SteerRamp();
    let s:VehicleState={position:{x:-1.6,y:0,z:-30},heading:0,speed:13.4,steerAngle:0};
    let worst=0,off=0;
    for(let t=0;t<6;t+=DT){
      const manual=ramp.update(t<.3?1:0,DT);
      s=stepVehicle(s,{throttle:.35,brake:0,steer:manual||assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
      off=sampleRoad(road,s.position.x,s.position.z).lateral+1.6;
      worst=Math.max(worst,Math.abs(off));
    }
    expect(worst).toBeLessThan(.5);
    expect(Math.abs(off)).toBeLessThan(.15);
  });
  it('full steering at 30 mph corners at a firm but normal 0.45 g, not beyond tyre grip',()=>{
    const angle=steerLimit(LEARNER_CAR,13.4);
    expect(13.4**2*Math.tan(angle)/LEARNER_CAR.wheelbase).toBeCloseTo(4.5,1);
    expect(steerLimit(LEARNER_CAR,1)).toBe(LEARNER_CAR.maxSteerAngle); // full lock when parking
  });
});
