import {describe,expect,it} from 'vitest';
import {parseLocation,parseScenario} from '../../src/contracts';
import {RoadNetwork,type RouteLeg} from '../../src/test/route';
import {Examiner} from '../../src/test/examiner';
import {MockTestAssessor} from '../../src/assessment/mockTest';
import {EventLog} from '../../src/app/eventLog';
import {pointAtAlong,sampleRoad} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';
import goodmayesMockTestJson from '../../content/scenarios/goodmayes-mock-test.json';

const goodmayes=parseLocation(goodmayesJson);

/** Drives a planned route: positions every metre, the speed given, signalling and checking mirrors if asked. */
function drive(options:{signals:boolean;mirrors:boolean;speed:(i:number,toTurn:number)=>number}){
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
  const legs:RouteLeg[]=[...route.legs,{road:last.to.road,dir:last.to.dir,from,to:Math.max(0,Math.min(net.length(last.to.road),from+last.to.dir*120))}];
  // Look round before moving off.
  if(options.mirrors){time+=.5;events.emit('observation.dwell',{target:'right-door'})}
  let i=0;
  for(const l of legs){
    const n=Math.max(1,Math.ceil(Math.abs(l.to-l.from)));
    for(let k=0;k<=n;k++,i++){
      const p=pointAtAlong(l.road,l.from+(l.to-l.from)*k/n);
      // Signal and check the mirror once a direction to turn has been given; cancel once past.
      const step=examiner.steps[examiner.index];
      const d=step?Math.hypot(p.x-step.at.x,p.z-step.at.z):Infinity;
      Object.assign(learner,{x:p.x,z:p.z,heading:Math.atan2(p.direction.x*l.dir,-p.direction.z*l.dir),speed:options.speed(i,step&&step.turn!=='ahead'?d:Infinity)});
      if(options.signals)learner.indicator=step&&step.turn!=='ahead'&&d<60?step.turn:'off';
      if(options.mirrors&&step&&d<55&&d>53)events.emit('observation.dwell',{target:'interior'});
      const dt=1/Math.max(1,learner.speed);
      time+=dt;examiner.fixedUpdate(dt);assessor.fixedUpdate(dt);
    }
  }
  learner.speed=0;
  for(let k=0;k<200&&!finished;k++){time+=1/30;examiner.fixedUpdate(1/30);assessor.fixedUpdate(1/30)}
  return {result:assessor.finish('mock',finished?'completed':'time-limit',time),route};
}

describe('Mock test marking',()=>{
  it('a careful drive (mirrors, signals, 25 mph, 12 mph at the turns) passes with no faults at the turns',()=>{
    const {result}=drive({signals:true,mirrors:true,speed:(_,d)=>d<25?5.4:11});
    expect(result.outcome).toBe('completed');
    expect(result.findings.filter(f=>/mirrors|signals/.test(f.ruleId))).toEqual([]);
    expect(result.mockTest?.passed).toBe(true);
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
