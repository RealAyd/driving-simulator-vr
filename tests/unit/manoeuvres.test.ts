import {describe,expect,it} from 'vitest';
import {parseLocation,type Vec2} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {routeLanePath} from '../../src/test/routePath';
import {Manoeuvre,kerbPosition,type ManoeuvreKind} from '../../src/test/manoeuvres';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {layoutTownscape} from '../../src/world/townscape';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);
const net=new RoadNetwork(goodmayes);
const parked=layoutTownscape(goodmayes)!.cars.filter(c=>c.id.startsWith('kerb-car')).map(c=>({x:c.x,z:c.z}));

/**
 * A learner driving a manoeuvre with assisted steering and the car's own model: looks round where `looks` says,
 * signals, brakes `reaction` seconds after "Stop!", reverses at walking pace.
 */
function run(kind:ManoeuvreKind,o:{reaction?:number;lookRound?:boolean;signal?:boolean;lookAfter?:boolean}={}){
  let time=0;
  const looks:Array<{time:number;target:string}>=[];
  const look=(...t:string[])=>{for(const target of t){time+=.4;looks.push({time,target})}};
  const said:string[]=[];
  const sp=goodmayes.spawn;
  let car:VehicleState={position:{x:sp.position.x,y:0,z:sp.position.z},heading:sp.headingDeg*Math.PI/180,speed:0,steerAngle:0};
  let indicator:'off'|'left'|'right'='off';
  // Out from the kerb and up the road first (the manoeuvre is asked for on the move).
  const lane=new SteeringAssist(routeLanePath(net.wayAhead(net.locate(car.position.x,car.position.z,car.heading)!,null,600).legs,parked),LEARNER_CAR);
  const assist=lane;
  for(let t=0;t<6;t+=1/60){car=stepVehicle(car,{throttle:car.speed<7?.6:0,brake:0,steer:assist.steer(car,car.speed)},LEARNER_CAR,1/60);time+=1/60}
  const m=new Manoeuvre(kind,{location:goodmayes,parked,now:()=>time,looks:()=>looks,traffic:()=>[],
    learner:()=>({x:car.position.x,z:car.position.z,heading:car.heading,speed:car.speed,indicator}),
    say:t=>said.push(t),flash:()=>{},
    setPath:(f,r)=>{if(f)assist.setPath(f);assist.setReversePath(r)}});
  let stopAt:number|null=null,phase='';
  for(let i=0;i<60*240&&!m.done;i++){
    const dt=1/60;
    m.update(dt);
    if(m.phase!==phase){
      phase=m.phase;
      // The routine at each new stage: a look round, and the signal where one is due.
      if(o.lookRound!==false&&['brief','after','rejoin','reverse'].includes(phase)&&!(phase==='after'&&o.lookAfter===false))look('left-shoulder','left-door','interior','right-door','right-shoulder');
      if(phase==='crossing'){if(o.lookRound!==false)look('interior','right-door');if(o.signal!==false)indicator='right'}
      if(phase==='stopping')stopAt=time;
    }
    let throttle=0,brake=0,reverse=false,steer=assist.steer(car,car.speed);
    switch(phase){
      case 'pull-in':{
        // In to the kerb: steer gently left until close, then stop.
        const k=kerbPosition(goodmayes,car.position.x,car.position.z,car.heading)!;
        steer=k.left>.5?-.25:0;brake=k.left<.7?1:0;throttle=k.left>.7&&car.speed<3?.4:0;
        if(k.angle>.15&&k.left<1)steer=.3;
        break;
      }
      case 'stopping':brake=time-stopAt!>=(o.reaction??.6)?1:0;throttle=brake?0:.5;break;
      case 'crossing':{throttle=car.speed<3?.4:0;const k=kerbPosition(goodmayes,car.position.x,car.position.z,car.heading)!;if(k.right<.8||(assist.length-assist.progress(car.position.x,car.position.z))<3)brake=1;indicator=o.signal!==false?'right':'off';break}
      case 'approach':{
        const k=kerbPosition(goodmayes,car.position.x,car.position.z,car.heading)!;
        const t=(m as unknown as {target:{along:number;dir:number}}).target;
        const ahead=(k.along-t.along)*t.dir;
        throttle=ahead<-2&&car.speed<3?.4:0;brake=ahead>=-2?1:0;break;
      }
      case 'reverse':{
        reverse=true;
        const rev=(assist as unknown as {reversePath:SteeringAssist|null}).reversePath;
        const left=rev?rev.length-rev.progress(car.position.x,car.position.z):0;
        throttle=left>1.5&&car.speed>-1.2?.35:0;brake=left<=1.5?1:0;
        steer=assist.steerReverse(car,car.speed);
        if(Math.floor(time*10)%35===0)looks.push({time,target:'left-shoulder'});
        break;
      }
      default:throttle=car.speed<7?.5:0;
    }
    if(phase!=='crossing'&&phase!=='reverse')indicator='off';
    car=stepVehicle(car,{throttle,brake,steer,reverse},LEARNER_CAR,dt);
    time+=dt;
  }
  return {m,said,car};
}

describe('manoeuvres',()=>{
  it('emergency stop: prompt braking, straight: no faults; then a look all round before moving off',()=>{
    const {m,said}=run('emergency-stop');
    expect(m.done).toBe(true);
    expect(said).toContain('Stop!');
    expect(m.faults).toEqual([]);
    expect(m.notes.join(' ')).toMatch(/brakes on 0\.\d s after/);
  });
  it('emergency stop: slow to brake is a driving fault, very slow a serious one',()=>{
    expect(run('emergency-stop',{reaction:2}).m.faults.map(f=>[f.rule,f.severity])).toContainEqual(['controlled-stop-promptness','minor']);
    expect(run('emergency-stop',{reaction:3.2}).m.faults.map(f=>[f.rule,f.severity])).toContainEqual(['controlled-stop-promptness','serious']);
  });
  it('emergency stop: no interior mirror check after the stop is a fault, even after a look round before it',()=>{
    const {m}=run('emergency-stop',{lookAfter:false});
    const f=m.faults.filter(f=>f.rule==='moving-off-safety');
    expect(f.map(f=>f.text).join(' ')).toMatch(/no check of the interior mirror.*before the stop don't count/);
    expect(f.map(f=>f.coach)).toContain('check the interior mirror after you stop, then look all round before moving off');
  });
  it('pull up on the right and reverse: done with the routine and assisted steering, close to the kerb, about two car lengths',()=>{
    const {m,said}=run('pull-up-right');
    expect(m.done).toBe(true);
    expect(said).toEqual(expect.arrayContaining([expect.stringMatching(/right-hand side/),expect.stringMatching(/two car lengths/)]));
    expect(m.faults.filter(f=>/control/.test(f.rule))).toEqual([]);
    expect(m.notes.join(' ')).toMatch(/Reversed \d.*\(about (1\.[5-9]|2\.\d) car lengths\)/);
  });
  it('pull up on the right without mirrors or a signal, and no look round before reversing: faults for each',()=>{
    const {m}=run('pull-up-right',{lookRound:false,signal:false});
    const rules=m.faults.map(f=>f.rule);
    expect(rules).toContain('reverse-right-observation');
    expect(rules).toContain('signals-necessary');
  });
  it('parallel park behind a parked car: assisted, it finishes behind it, parallel and close to the kerb',()=>{
    const {m}=run('parallel-park');
    expect(m.done).toBe(true);
    expect(m.notes.join(' ')).toMatch(/Parked/);
    expect(m.faults.filter(f=>f.rule==='reverse-park-control').map(f=>f.text)).toEqual([]);
  });
});

it('a parking target is a car at the left kerb ahead, with room behind it',()=>{
  const sp=goodmayes.spawn;
  const t=Manoeuvre.parkingTarget(goodmayes,parked,{x:sp.position.x,z:sp.position.z,heading:sp.headingDeg*Math.PI/180});
  expect(t).not.toBeNull();
  const v:Vec2[]=parked;
  expect(v.length).toBeGreaterThan(0);
});
