import type {Location,Pose} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {Examiner} from '../../src/test/examiner';
import {routeLanePath} from '../../src/test/routePath';
import {EventLog} from '../../src/app/eventLog';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {drivingView} from '../../src/world/roundabouts';
import {layoutStreetscape} from '../../src/world/streetscape';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {layoutSignage} from '../../src/world/signage';
import {StaticObstacles} from '../../src/world/obstacles';
import {surfaceAt} from '../../src/world/roadGeometry';

/** One simulation step (seconds). */
const DT=1/30;
/** The learner's car: half its width and length (metres), as its collisions take it. */
const HW=.9,HL=2.15;

export type Issue={centre:string;seed:number;kind:'kerb'|'hit'|'stray'|'weave'|'stuck';at:string;detail:string};
export type TraceStep={time:number;at:number;lateral:number;steer:number;wheel:number;speed:number;bend:number;kerb:boolean};

/**
 * One mock test route (the examiner's, as planned for `seed`) driven with assisted steering by a bot on the pedals:
 * up to 30 mph on the straight, `turnSpeed` for turns, the assistance's own braking for bends; no other traffic.
 * Returns what went wrong (a wheel over the kerb, touching something, straying, weaving, not getting to the end).
 */
export function auditRoute(location:Location,seed:number,turnSpeed:number,metres=3000,trace?:(t:TraceStep)=>void){
  const net=new RoadNetwork(location);
  const layout=layoutStreetscape(location)??layoutTownscape(location);
  const kerb=kerbFootprints(layout);
  const signs=layoutSignage(location,layout);
  const obstacles=new StaticObstacles([...location.blocks,...(layout?.colliders??[]),...signs.colliders]);
  const sp=location.spawn,st=net.startNear(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180);
  let time=0;
  const learner={x:st.x,z:st.z,heading:st.heading,speed:0};
  const examiner=new Examiner(net,()=>learner,{target:metres,seed,say:()=>{},events:new EventLog(()=>time),onComplete:()=>{}});
  examiner.reset();
  const path=routeLanePath(examiner.legs,kerb,drivingView(location).junctions,(x,z)=>surfaceAt(location,x,z)?.kind==='carriageway');
  const issues:Array<Omit<Issue,'centre'|'seed'>>=[];
  if(path.length<2)return {issues,metres:0,length:0};
  const assist=new SteeringAssist(path,LEARNER_CAR);
  let car:VehicleState={position:{x:path[0]!.x,y:0,z:path[0]!.z},heading:Math.atan2(path[1]!.x-path[0]!.x,-(path[1]!.z-path[0]!.z)),speed:0,steerAngle:0};
  const pose=():Pose=>({position:car.position,heading:car.heading});
  // The wheels: the car's position is the middle of the wheelbase; the tyres' outer edges 0.85 m either side.
  const wheels=()=>{const f={x:Math.sin(car.heading),z:-Math.cos(car.heading)},r={x:-f.z,z:f.x},a=LEARNER_CAR.wheelbase/2;
    return [[1,1],[1,-1],[-1,1],[-1,-1]].map(([u,v])=>({x:car.position.x+f.x*a*u!+r.x*.85*v!,z:car.position.z+f.z*a*u!+r.z*.85*v!}))};
  // An issue once per place (a run of steps doing the same thing counts once).
  const last=new Map<string,number>();
  const add=(kind:Issue['kind'],detail:string)=>{
    const at=assist.progress(car.position.x,car.position.z);
    if(at-(last.get(kind)??-Infinity)<25)return;
    last.set(kind,at);
    issues.push({kind,at:`${car.position.x.toFixed(0)},${car.position.z.toFixed(0)}`,detail:`${detail} (${at.toFixed(0)} m along, ${car.speed.toFixed(1)} m/s)`});
  };
  let prevSteer=0,prevSign=0,flips:number[]=[],stuckFor=0,maxStray=0;
  const total=assist.length;
  for(time=0;time<Math.max(240,total/3);time+=DT){
    const at=assist.progress(car.position.x,car.position.z);
    if(at>total-6)break;
    const turning=Math.abs(assist.turnBetween(at,at+25))>.5;
    // (30 mph on the straight: assisted steering at a town's limit.)
    const top=turning?turnSpeed:13.4;
    const brake=Math.max(assist.brakeFor(pose(),car.speed),car.speed>top+.5?.6:0);
    const steer=assist.steer({...pose(),steerAngle:car.steerAngle},car.speed);
    car=stepVehicle(car,{throttle:brake>0||car.speed>top?0:1,brake,steer},LEARNER_CAR,DT);
    // Off the carriageway: any corner of the car on a pavement, a verge or nothing mapped.
    // Straying: the car's centre from the path.
    const p=assist.pointAt(at),stray=Math.hypot(p.x-car.position.x,p.z-car.position.z);
    // A wheel over the kerb (the body's corners may hang over it on a tight turn, as a real car's do).
    const off=wheels().filter(c=>surfaceAt(location,c.x,c.z)?.kind!=='carriageway');
    // How far over: still off with the wheel 15 or 30 cm further in.
    const depth=(()=>{const f={x:Math.sin(car.heading),z:-Math.cos(car.heading)},r={x:-f.z,z:f.x},a=LEARNER_CAR.wheelbase/2;
      for(const w of [.7,.55,.4]){if(![[1,1],[1,-1],[-1,1],[-1,-1]].some(([u,v])=>surfaceAt(location,car.position.x+f.x*a*u!+r.x*w*v!,car.position.z+f.z*a*u!+r.z*w*v!)?.kind!=='carriageway'))return w===.7?'<15 cm':w===.55?'15-30 cm':'30-45 cm'}
      return '>45 cm'})();
    if(off.length){
      // Whose fault: a car exactly on the path here (along it) would have its wheels on the road, or not.
      const q=assist.pointAt(at),q1=assist.pointAt(at+1),l=Math.hypot(q1.x-q.x,q1.z-q.z)||1,f={x:(q1.x-q.x)/l,z:(q1.z-q.z)/l},r={x:-f.z,z:f.x},a=LEARNER_CAR.wheelbase/2;
      const pathOff=[[1,1],[1,-1],[-1,1],[-1,-1]].some(([u,v])=>surfaceAt(location,q.x+f.x*a*u!+r.x*.85*v!,q.z+f.z*a*u!+r.z*.85*v!)?.kind!=='carriageway');
      // Which side of the car (left/right) and of the bend (inside/outside), and whether the car is left or right of the path.
      const fx=Math.sin(car.heading),fz=-Math.cos(car.heading),side=off.map(w=>((w.x-car.position.x)*-fz+(w.z-car.position.z)*fx)>0?'R':'L');
      const bend=assist.turnBetween(at-10,at+10),inside=Math.abs(bend)<.3?'':side.every(x=>(x==='R')===(bend>0))?' inside':' outside';
      const pathSide=((p.x-car.position.x)*-fz+(p.z-car.position.z)*fx)>0?'path to the right':'path to the left';
      add('kerb',`${depth}${inside} ${pathSide}: ${off.length} wheel${off.length>1?'s':''} off the road${Math.abs(assist.turnBetween(at-15,at+15))>.5?' in a turn':''}${pathOff?', the path too':', following'} [${stray.toFixed(1)} m off the path]`);
    }
    if(trace){const fx=Math.sin(car.heading),fz=-Math.cos(car.heading);trace({time,at,lateral:(car.position.x-p.x)*-fz+(car.position.z-p.z)*fx,steer,wheel:car.steerAngle,speed:car.speed,bend:assist.turnBetween(at,at+6),kerb:off.length>0})}
    const hit=obstacles.firstCollision(pose(),HW,HL);
    if(hit)add('hit',hit);
    for(const k of kerb){const ox=k.x-car.position.x,oz=k.z-car.position.z;if(Math.hypot(ox,oz)<k.halfLength+HL+.1){
      const f={x:Math.sin(k.heading),z:-Math.cos(k.heading)},a=Math.abs(ox*Math.sin(car.heading)-oz*Math.cos(car.heading)),b=Math.abs(ox*Math.cos(car.heading)+oz*Math.sin(car.heading));
      void f;if(a<HL+k.halfLength-.3&&b<HW+k.halfWidth-.05){add('hit',`parked car at ${k.x.toFixed(0)},${k.z.toFixed(0)}`);break}}}

    maxStray=Math.max(maxStray,stray);
    if(stray>1.5&&car.speed>1)add('stray',`${stray.toFixed(1)} m from the path`);
    // Weaving: the wheel turned one way then the other, again and again, on a straight piece.
    // (The wheels themselves, by more than about 2 degrees each way: a small steady correction is not weaving.)
    const sign=Math.abs(car.steerAngle)>.035?Math.sign(car.steerAngle):0;
    if(sign&&prevSign&&sign!==prevSign&&Math.abs(assist.turnBetween(at-10,at+10))<.1)flips.push(time);
    if(sign)prevSign=sign;
    flips=flips.filter(t=>time-t<4);
    if(flips.length>=4){add('weave','the wheel back and forth on a straight');flips=[]}
    prevSteer=steer;
    stuckFor=car.speed<.2?stuckFor+DT:0;
    if(stuckFor>8){add('stuck','stopped and not moving on');break}
  }
  void prevSteer;
  const done=assist.progress(car.position.x,car.position.z);
  if(done<total-6&&!issues.some(i=>i.kind==='stuck'))issues.push({kind:'stuck',at:`${car.position.x.toFixed(0)},${car.position.z.toFixed(0)}`,detail:`only ${done.toFixed(0)} of ${total.toFixed(0)} m in ${time.toFixed(0)} s`});
  return {issues,metres:done,length:total,maxStray};
}
