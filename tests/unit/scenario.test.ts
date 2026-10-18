import {describe,expect,it} from 'vitest';
import {parseLocation,parseScenario,type EventSink,type PedestrianActorDef,type Pose,type SimEvent,type SimEventType} from '../../src/contracts';
import {EventLog} from '../../src/app/eventLog';
import {FollowingVehicle} from '../../src/actors/followingVehicle';
import {Pedestrian} from '../../src/actors/pedestrian';
import {Assessor} from '../../src/assessment/assessor';
import {CROSSING_RUBRIC} from '../../src/assessment/rubric';
import {ObservationTracker} from '../../src/cockpit/observation';
import {ScenarioRunner} from '../../src/scenarios/scenarioRunner';
import {ZoneTracker} from '../../src/scenarios/zones';
import {openAttemptStore} from '../../src/storage/attempts';
import rawLocation from '../../content/locations/representative-residential-straight.json';
import rawScenario from '../../content/scenarios/crossing-restricted-view.json';

const DT=1/60;
const location=parseLocation(rawLocation);
const scenario=parseScenario(rawScenario);
const pedDef=scenario.actors.find((a):a is PedestrianActorDef=>a.kind==='pedestrian')!;
const crossing=location.crossings[0]!;
/** z coordinate for a distance along the straight part of main-street. */
const zAt=(along:number)=>330-along;

function harness(){
  let t=0;
  const events=new EventLog(()=>t);
  const car={x:-1.6,z:0,speed:0,heading:0};
  const pose=():Pose=>({position:{x:car.x,y:0,z:car.z},heading:car.heading});
  const ped=new Pedestrian(pedDef,events);
  const zones=new ZoneTracker(location,scenario.zones,()=>car,events);
  const runner=new ScenarioRunner(scenario,zones,new Map([[ped.id,ped]]),()=>({surface:'carriageway',heading:car.heading,roadHeading:0,collidedWith:null}),events);
  let followerGap:number|null=20;
  const assessor=new Assessor({
    events:()=>events.events,
    learner:()=>({pose:pose(),speed:car.speed,halfWidth:.9,halfLength:2.15}),
    followerGap:()=>followerGap,
    zones,crossing,pedestrian:ped,now:()=>t
  },events);
  const tick=(seconds:number,move?:()=>void)=>{
    for(let s=0;s<seconds;s+=DT){
      t+=DT;move?.();
      ped.fixedUpdate(DT);zones.fixedUpdate(DT);runner.fixedUpdate(DT);assessor.fixedUpdate();
    }
  };
  return {events,car,ped,zones,runner,assessor,tick,setGap:(g:number|null)=>{followerGap=g},time:()=>t};
}

describe('content files',()=>{
  it('scenario and location validate and agree',()=>{
    expect(scenario.locationId).toBe(location.id);
    expect(location.crossings.map(c=>c.id)).toContain(pedDef.crossingId);
  });
  it('rejects a trigger that points at a missing zone',()=>{
    const broken={...rawScenario,triggers:[{...rawScenario.triggers[0]!,when:{zoneEntered:'nowhere'}}]};
    expect(()=>parseScenario(broken)).toThrow(/missing zone "nowhere"/);
  });
});

describe('pedestrian',()=>{
  it('waits until asked, then prepares, crosses and becomes clear',()=>{
    const sink:EventSink={emit:(type,payload={})=>({id:'x',type,time:0,payload}) as SimEvent<typeof type>};
    const ped=new Pedestrian(pedDef,sink);
    for(let i=0;i<120;i++)ped.fixedUpdate(DT);
    expect(ped.state).toBe('waiting');
    ped.requestCrossing(0);
    ped.fixedUpdate(DT);
    expect(ped.state).toBe('preparing');
    for(let i=0;i<Math.ceil(pedDef.prepareSeconds/DT)+1;i++)ped.fixedUpdate(DT);
    expect(ped.state).toBe('crossing');
    const crossSeconds=Math.hypot(pedDef.crossTo.x-pedDef.waitAt.x,pedDef.crossTo.z-pedDef.waitAt.z)/pedDef.walkSpeed;
    for(let i=0;i<Math.ceil(crossSeconds/DT)+2;i++)ped.fixedUpdate(DT);
    expect(ped.state).toBe('clear');
    ped.reset();
    expect(ped.state).toBe('waiting');
    expect(ped.position).toEqual(pedDef.waitAt);
  });
  it('pauses rather than walking into a vehicle in its path',()=>{
    const sink:EventSink={emit:(type,payload={})=>({id:'x',type,time:0,payload}) as SimEvent<typeof type>};
    const ped=new Pedestrian({...pedDef,prepareSeconds:0},sink,p=>p.x>-3);
    ped.requestCrossing(0);
    for(let i=0;i<600;i++)ped.fixedUpdate(DT);
    expect(ped.state).toBe('crossing');
    expect(ped.position.x).toBeLessThanOrEqual(-3);
  });
});

describe('zones and triggers',()=>{
  it('fires the pedestrian trigger once, even while the car sits in the zone',()=>{
    const h=harness();
    h.car.z=zAt(415);
    h.tick(3);
    h.car.z=zAt(390); // leaves the zone backwards (e.g. after a restart)
    h.tick(.5);
    h.car.z=zAt(415);
    h.tick(1);
    expect(h.events.events.filter(e=>e.type==='scenario.triggered')).toHaveLength(1);
    expect(h.ped.state).not.toBe('waiting');
  });
  it('does not start the pedestrian if the learner stops early',()=>{
    const h=harness();
    h.car.z=zAt(390);
    h.tick(30);
    expect(h.ped.state).toBe('waiting');
    expect(h.runner.ended).toBeNull();
  });
  it('re-arms triggers after reset',()=>{
    const h=harness();
    h.car.z=zAt(415);h.tick(.5);
    h.ped.reset();h.zones.reset();h.runner.reset();h.events.clear();
    h.car.z=zAt(390);h.tick(.1);
    h.car.z=zAt(415);h.tick(.1);
    expect(h.events.events.filter(e=>e.type==='scenario.triggered')).toHaveLength(1);
  });
  it('ends the attempt on any collision, since the car cannot reverse away',()=>{
    let t=0;
    const events=new EventLog(()=>t);
    const ped=new Pedestrian(pedDef,events);
    const zones=new ZoneTracker(location,scenario.zones,()=>({x:-1.6,z:-90,speed:0}),events);
    const runner=new ScenarioRunner(scenario,zones,new Map([[ped.id,ped]]),()=>({surface:'carriageway',heading:0,roadHeading:0,collidedWith:'parked-van'}),events);
    runner.fixedUpdate(DT);
    expect(runner.ended).toBe('collision');
    expect(events.events.filter(e=>e.type==='exercise.ended')).toHaveLength(1);
    runner.fixedUpdate(DT);
    expect(events.events.filter(e=>e.type==='exercise.ended')).toHaveLength(1);
  });
  it('ends as completed in the end zone and on the time limit otherwise',()=>{
    const done=harness();
    done.car.z=zAt(490);done.tick(.1);
    expect(done.runner.ended).toBe('completed');
    const slow=harness();
    slow.tick(scenario.end.timeLimitSeconds+1);
    expect(slow.runner.ended).toBe('time-limit');
  });
});

describe('assessment',()=>{
  /** Drives along the road at `speed`, stopping for the pedestrian if `yields`. */
  function drive(h:ReturnType<typeof harness>,speed:number,yields:boolean){
    const giveWay=crossing.along-crossing.width/2-crossing.giveWayOffset;
    let along=330;
    h.tick(240,()=>{
      const frontAt=along+2.15;
      const pedOnCrossing=h.ped.state==='preparing'||h.ped.state==='crossing';
      const mustStop=yields&&pedOnCrossing&&frontAt>=giveWay-6&&frontAt<giveWay;
      h.car.speed=mustStop?0:speed;
      along+=h.car.speed*DT;
      h.car.z=zAt(along);
      h.car.x=along>390&&along<440?1.2:-1.6; // pass the van in the right lane
    });
    return h.assessor.finish(scenario.id,h.runner.ended??'abandoned',h.runner.elapsed);
  }

  it('a slow approach that gives way produces no serious or dangerous findings',()=>{
    const h=harness();
    const result=drive(h,mphToMps(12),true);
    expect(result.outcome).toBe('completed');
    expect(result.findings.filter(f=>f.severity==='serious'||f.severity==='dangerous')).toEqual([]);
    expect(result.notes.join(' ')).toMatch(/Approached the restricted view/);
    expect(result.notes.join(' ')).toMatch(/Gave way/);
  });

  it('a fast approach that does not give way is serious, cites events and counts the conflict once',()=>{
    const h=harness();
    const result=drive(h,mphToMps(30),false);
    const speed=result.findings.find(f=>f.ruleId==='approach.speed')!;
    expect(speed.severity).toBe('serious');
    expect(speed.eventIds.length).toBeGreaterThan(0);
    const conflicts=result.findings.filter(f=>f.incidentId==='crossing-conflict');
    expect(conflicts).toHaveLength(1);
    expect(['serious','dangerous']).toContain(conflicts[0]!.severity);
    expect(conflicts[0]!.rubricVersion).toBe(CROSSING_RUBRIC.version);
    for(const f of result.findings)for(const id of f.eventIds)expect(h.events.events.some(e=>e.id===id)).toBe(true);
  });

  it('upgrades one incident instead of adding a duplicate',()=>{
    const h=harness();
    h.assessor.record('crossing.give-way','crossing-conflict','serious',['ev-1'],'first');
    h.assessor.record('crossing.too-close','crossing-conflict','dangerous',['ev-2'],'second');
    h.assessor.record('crossing.give-way','crossing-conflict','serious',['ev-3'],'third');
    const all=h.assessor.current;
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({severity:'dangerous',upgradedFrom:'serious',explanation:'second',eventIds:['ev-1','ev-2','ev-3']});
  });

  it('a missing mirror check is minor with a follower close behind and advice without one',()=>{
    for(const [gap,severity] of [[15,'minor'],[null,'advice']] as const){
      const h=harness();
      h.setGap(gap);
      h.car.z=zAt(420);h.tick(.1);
      h.events.emit('vehicle.braking',{speed:8});
      h.tick(.1);
      expect(h.assessor.current.find(f=>f.ruleId==='observation.mirror-before-braking')?.severity).toBe(severity);
    }
  });

  it('a mirror glance shortly before braking counts as checking',()=>{
    const h=harness();
    h.car.z=zAt(420);h.tick(.1);
    h.events.emit('observation.dwell',{target:'interior',source:'mouse-controlled view'});
    h.tick(1);
    h.events.emit('vehicle.braking',{speed:8});
    h.tick(.1);
    expect(h.assessor.current.find(f=>f.ruleId==='observation.mirror-before-braking')).toBeUndefined();
    expect(h.assessor.finish(scenario.id,'completed',1).notes.join(' ')).toMatch(/mouse-controlled view/);
  });
});

describe('assessment at the end of an attempt',()=>{
  it('includes evidence from the final step, such as the collision that ended it',()=>{
    const h=harness();
    h.events.emit('vehicle.collision',{obstacleId:'parked-van',speed:9});
    const result=h.assessor.finish(scenario.id,'collision',10);
    expect(result.findings.map(f=>f.ruleId)).toContain('vehicle.collision');
  });
});

describe('mirror observation',()=>{
  it('records a glance only after the view rests on the mirror, once per glance, labelled by source',()=>{
    const log:Array<{type:SimEventType;payload:Record<string,unknown>}>=[];
    const sink:EventSink={emit:(type,payload={})=>{log.push({type,payload});return {id:String(log.length),type,time:0,payload}}};
    let lookingAtMirror=false;
    const tracker=new ObservationTracker(
      [{id:'interior',position:()=>({x:0,y:1.43,z:-1}),angularRadius:.15}],
      ()=>({position:{x:0,y:0,z:0},heading:0}),()=>({x:0,y:1.43,z:0}),
      ()=>lookingAtMirror?{x:0,y:0,z:-1}:{x:1,y:0,z:0},sink
    );
    for(let i=0;i<60;i++)tracker.fixedUpdate(DT,i*DT);
    expect(log).toHaveLength(0);
    lookingAtMirror=true;
    for(let i=0;i<10;i++)tracker.fixedUpdate(DT,i*DT); // 0.17 s: too short
    expect(log).toHaveLength(0);
    for(let i=0;i<60;i++)tracker.fixedUpdate(DT,i*DT);
    expect(log).toHaveLength(1);
    expect(log[0]!.payload['source']).toBe('mouse-controlled view');
    lookingAtMirror=false;tracker.fixedUpdate(DT,0);
    lookingAtMirror=true;for(let i=0;i<30;i++)tracker.fixedUpdate(DT,0);
    expect(log).toHaveLength(2);
  });
});

describe('following vehicle',()=>{
  it('waits for the learner, keeps a gap and never runs into it under hard braking',()=>{
    const learner={pose:{position:{x:-1.6,y:0,z:0},heading:0} as Pose,speed:0};
    const f=new FollowingVehicle({id:'f',kind:'following-vehicle',startBehind:35,desiredSpeed:13.4,headway:1.5,colour:'#999999'},()=>learner.pose,()=>learner.speed);
    for(let i=0;i<300;i++)f.fixedUpdate(DT);
    expect(f.speed).toBe(0); // learner has not moved off
    let minGap=Infinity;
    for(let t=0;t<40;t+=DT){
      learner.speed=t<20?Math.min(13,learner.speed+2.5*DT):Math.max(0,learner.speed-7.5*DT);
      learner.pose={position:{x:-1.6,y:0,z:learner.pose.position.z-learner.speed*DT},heading:0};
      f.fixedUpdate(DT);
      if(t>5)minGap=Math.min(minGap,f.gap);
    }
    expect(minGap).toBeGreaterThan(1.5);
    expect(f.speed).toBe(0);
    expect(f.pose.position.z).toBeGreaterThan(learner.pose.position.z+4.3);
  });
});

describe('attempt storage',()=>{
  it('falls back to memory when IndexedDB is unavailable',async()=>{
    const store=await openAttemptStore(undefined);
    expect(store.kind).toBe('memory');
    await store.save({scenarioId:'s',rubricVersion:'v',outcome:'completed',findings:[],notes:[],durationSeconds:1,finishedAt:'x'});
    expect(await store.list('s')).toHaveLength(1);
    expect(await store.list('other')).toHaveLength(0);
  });
});

function mphToMps(mph:number){return mph*.44704}
