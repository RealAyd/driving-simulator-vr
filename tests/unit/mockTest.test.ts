import {describe,expect,it} from 'vitest';
import {parseLocation,parseScenario} from '../../src/contracts';
import {RoadNetwork,type RouteLeg} from '../../src/test/route';
import {Examiner} from '../../src/test/examiner';
import {MockTestAssessor} from '../../src/assessment/mockTest';
import {stopPlace} from '../../src/test/pullUp';
import {EventLog} from '../../src/app/eventLog';
import {pointAtAlong,sampleRoad} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';
import goodmayesMockTestJson from '../../content/scenarios/goodmayes-mock-test.json';

const goodmayes=parseLocation(goodmayesJson);

/** Drives a planned route: positions every metre, the speed given, signalling and checking mirrors if asked. */
function drive(options:{signals:boolean;mirrors:boolean;speed:(i:number,toTurn:number)=>number;
  /** How the mirrors are checked at each turn: in order (interior, the turn's side, then signal), only the
   *  interior, or only after signalling. */
  routine?:'in-order'|'interior-only'|'after-signal';
  /** Seconds between the look round and moving off. */
  waitBeforeMovingOff?:number}){
  const routine=options.routine??'in-order';
  let time=0;
  const events=new EventLog(()=>time);
  const net=new RoadNetwork(goodmayes);
  const sp=goodmayes.spawn;
  const learner={x:sp.position.x,z:sp.position.z,heading:sp.headingDeg*Math.PI/180,speed:0,indicator:'off' as 'off'|'left'|'right'};
  const assessor=new MockTestAssessor({location:goodmayes,events,now:()=>time,
    learner:()=>({pose:{position:{x:learner.x,y:0,z:learner.z},heading:learner.heading},speed:learner.speed,indicator:learner.indicator,surface:'carriageway'}),
    traffic:()=>[],parked:[]});
  let finished=false;
  const examiner=new Examiner(net,()=>learner,{target:1500,seed:3,say:()=>{},events,onComplete:()=>{finished=true},listener:assessor});
  examiner.reset();
  const route=net.plan(net.locate(learner.x,learner.z,learner.heading)!,1500,3);
  const last=route.steps.at(-1)!,from=sampleRoad(last.to.road,last.at.x,last.at.z).along;
  const legs:RouteLeg[]=[...route.legs,{road:last.to.road,dir:last.to.dir,from,to:Math.max(0,Math.min(net.length(last.to.road),from+last.to.dir*80))}];
  // Look all round before moving off (the left side, the interior mirror, then the right mirror and blind spot).
  if(options.mirrors)for(const target of ['left-shoulder','left-door','interior','right-door','right-shoulder']){time+=.5;events.emit('observation.dwell',{target})}
  time+=options.waitBeforeMovingOff??1;
  let i=0;
  for(const l of legs){
    const n=Math.max(1,Math.ceil(Math.abs(l.to-l.from)));
    for(let k=0;k<=n;k++,i++){
      const p=pointAtAlong(l.road,l.from+(l.to-l.from)*k/n);
      // Signal and check the mirror once a direction to turn has been given; cancel once past.
      const step=examiner.steps[examiner.index];
      const d=step?Math.hypot(p.x-step.at.x,p.z-step.at.z):Infinity;
      Object.assign(learner,{x:p.x,z:p.z,heading:Math.atan2(p.direction.x*l.dir,-p.direction.z*l.dir),speed:options.speed(i,step&&step.turn!=='ahead'?d:Infinity)});
      const turning=!!step&&step.turn!=='ahead';
      // In order: the interior mirror at 56 m, the mirror on the turn's side at 54 m, the signal from 50 m.
      if(options.mirrors&&turning&&routine!=='after-signal'&&d<56&&d>55)events.emit('observation.dwell',{target:'interior'});
      if(options.mirrors&&turning&&routine==='in-order'&&d<54&&d>53)events.emit('observation.dwell',{target:`${step!.turn}-door`});
      if(options.mirrors&&turning&&routine==='after-signal'&&d<40&&d>39)events.emit('observation.dwell',{target:'interior'});
      if(options.signals)learner.indicator=turning&&d<50?step!.turn as 'left'|'right':'off';
      const dt=1/Math.max(1,learner.speed);
      time+=dt;examiner.fixedUpdate(dt);assessor.fixedUpdate(dt);
    }
  }
  // Pull up on the left: a mirror check, then in to the kerb (0.3 m from it on a 6 m road) and stop.
  if(options.mirrors)events.emit('observation.dwell',{target:'interior'});
  const gap=stopPlace(goodmayes,learner.x,learner.z,learner.heading)!.kerbGap-.3;
  learner.x-=Math.cos(learner.heading)*gap;learner.z-=Math.sin(learner.heading)*gap;
  learner.speed=0;
  for(let k=0;k<400&&!finished;k++){time+=1/30;examiner.fixedUpdate(1/30);assessor.fixedUpdate(1/30)}
  return {result:assessor.finish('mock',finished?'completed':'time-limit',time),route};
}

describe('Mock test marking',()=>{
  it('a careful drive (mirrors, signals, 25 mph, 12 mph at the turns) passes with no faults at the turns',()=>{
    const {result}=drive({signals:true,mirrors:true,speed:(_,d)=>d<25?5.4:11});
    expect(result.outcome).toBe('completed');
    expect(result.findings.filter(f=>/mirrors|signals|normal-stops/.test(f.ruleId)).map(f=>f.explanation)).toEqual([]);
    expect(result.mockTest?.passed).toBe(true);
  });
  it('the routine in the wrong order: mirrors only after the signal, or only the interior mirror, is a driving fault',()=>{
    const turns=(r:ReturnType<typeof drive>['route'])=>r.steps.filter(s=>s.turn!=='ahead').length;
    const late=drive({signals:true,mirrors:true,routine:'after-signal',speed:(_,d)=>d<25?5.4:11});
    expect(late.result.findings.filter(f=>f.ruleId==='mirrors-signalling')).toHaveLength(turns(late.route));
    const interior=drive({signals:true,mirrors:true,routine:'interior-only',speed:(_,d)=>d<25?5.4:11});
    const side=interior.result.findings.filter(f=>f.ruleId==='mirrors-change-direction');
    expect(side).toHaveLength(turns(interior.route));
    expect(side[0]!.explanation).toMatch(/the (left|right) mirror/);
  });
  it('moving off: a look all round that is not current (a long wait after it) is a fault; a fresh one is not',()=>{
    const stale=drive({signals:true,mirrors:true,waitBeforeMovingOff:12,speed:(_,d)=>d<25?5.4:11});
    expect(stale.result.findings.find(f=>f.ruleId==='moving-off-safety')?.explanation).toMatch(/not again just before moving off/);
    const fresh=drive({signals:true,mirrors:true,waitBeforeMovingOff:2,speed:(_,d)=>d<25?5.4:11});
    expect(fresh.result.findings.some(f=>f.ruleId==='moving-off-safety')).toBe(false);
  });
  it('no signals and no mirror checks: a driving fault for each at every turn',()=>{
    const {result,route}=drive({signals:false,mirrors:false,speed:(_,d)=>d<25?5.4:11});
    const turns=route.steps.filter(s=>s.turn!=='ahead').length;
    expect(result.findings.filter(f=>f.ruleId==='signals-necessary')).toHaveLength(turns);
    expect(result.findings.filter(f=>f.ruleId==='mirrors-change-direction')).toHaveLength(turns);
    expect(result.findings.some(f=>f.ruleId==='moving-off-safety')).toBe(true);
    expect(result.findings.every(f=>f.severity==='minor')).toBe(true);
  });
  it('speed: 36 mph in a 30 is a driving fault, 45 serious, 55 dangerous; the test then fails',()=>{
    for(const [mphV,sev] of [[36,'minor'],[45,'serious'],[55,'dangerous']] as const){
      const {result}=drive({signals:true,mirrors:true,speed:(i,d)=>i>100&&i<200?mphV/2.237:d<25?5.4:9});
      const f=result.findings.find(x=>x.ruleId==='speed-limit');
      expect(f?.severity,`${mphV} mph`).toBe(sev);
      if(sev!=='minor')expect(result.mockTest?.passed).toBe(false);
    }
  });
});

describe('Goodmayes mock test scenario file',()=>{
  it('is valid and marked as a mock test',()=>{
    const s=parseScenario(goodmayesMockTestJson);
    expect(s.rubricId).toBe('mock-test');
    expect(s.locationId).toBe('goodmayes');
  });
});
