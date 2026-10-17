import {describe,expect,it} from 'vitest';
import {degToRad,parseScenario,worldToLocal,localToWorld,type Pose} from '../../src/contracts';
import {PassingVehicle} from '../../src/actors/passingVehicle';
import {blindSpotSide} from '../../src/assessment/viewPractice';
import {DriverHead} from '../../src/cockpit/seat';
import {ALL_MIRRORS} from '../../src/cockpit/mirror';
import {KeyboardInput} from '../../src/input/keyboard';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import mirrorCheck from '../../content/scenarios/mirror-check.json';
import crossing from '../../content/scenarios/crossing-restricted-view.json';

const DT=1/60;

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
  it('gives no steering when the car is stopped',()=>{
    const assist=new SteeringAssist([{x:0,z:0},{x:10,z:-10}],LEARNER_CAR);
    expect(assist.steer({position:{x:0,y:0,z:0},heading:0},0)).toBe(0);
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
    const def=parseScenario(mirrorCheck).actors.find(a=>a.id==='overtaking-car');
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
