import {INFO,IMPROVE,type AttemptResult,type Location,type Pose,type Seconds,type SimEvent,type SimModule,type Severity} from '../contracts';
import {FindingLog} from './findingLog';
import {sampleRoad} from '../world/roadGeometry';
import type {EventLog} from '../app/eventLog';
import type {ExaminerListener} from '../test/examiner';
import type {RouteStep} from '../test/route';

/**
 * Mock driving test marking, in the shape of the DVSA marking sheet (DL25): driving faults (recorded as "minor"),
 * serious and dangerous faults under its headings. More than 15 driving faults, or any serious or dangerous fault,
 * is a fail. Nothing ends the test early: a collision is marked dangerous and the drive goes on, so the report
 * covers the whole drive. The thresholds are this simulator's draft judgements of what can be measured in it, not
 * DVSA's own criteria; they are listed in each fault's explanation.
 */

export const MOCK_TEST_RUBRIC='mock-test-0.1';
const mph=(v:number)=>v*2.237;

export interface MockTestInput{
  location:Location;
  events:EventLog;
  now:()=>Seconds;
  learner:()=>{pose:Pose;speed:number;indicator:'off'|'left'|'right';surface:'carriageway'|'pavement'|'none'};
  /** Other road users (traffic, buses) with the way they face. */
  traffic:()=>Array<{x:number;z:number;heading:number;speed:number}>;
  /** Parked cars at the kerb (passing them on the right is not a positioning fault). */
  parked:Array<{x:number;z:number}>;
}

/** A manoeuvre the examiner asked for, being watched. */
interface Watch{step:RouteStep;mirror:boolean;signalled:boolean;wrongSignal:boolean;maxSpeed:number;directionEvent:string|null}

export class MockTestAssessor implements SimModule,ExaminerListener{
  readonly id='mock-test';
  private log!:FindingLog;
  private watch:Watch|null=null;
  /** Mirror or shoulder checks (event times). */
  private looks:Array<{time:number;target:string;id:string}>=[];
  private lastEvent=0;
  private movedOff=false;
  private speeding:{since:number;worst:number;incident:number}|null=null;
  private speedIncidents=0;
  private following=0;
  private followingIncidents=0;
  private wrongSide=0;
  private wrongSideIncident=0;
  private pavement=0;
  private cancelBy:{time:number;turn:'left'|'right';incident:string}|null=null;
  private redirects=0;
  private inRoundabout=-1;
  private directions=0;

  constructor(private readonly input:MockTestInput){this.reset()}

  reset():void{
    this.log=new FindingLog(MOCK_TEST_RUBRIC,this.input.events,this.input.now);
    this.watch=null;this.looks=[];this.movedOff=false;this.speeding=null;this.speedIncidents=0;this.following=0;this.followingIncidents=0;
    this.wrongSide=0;this.wrongSideIncident=0;this.pavement=0;this.cancelBy=null;this.redirects=0;this.inRoundabout=-1;this.directions=0;
    const last=this.input.events.events.at(-1);
    this.lastEvent=last?Number(last.id.slice(3)):0;
  }

  private fault(rule:string,incident:string,severity:Severity,explanation:string,events:string[]=[]){
    this.log.record(rule,incident,severity,events,explanation);
  }

  private recentLook(within:number,targets?:string[]){
    const t=this.input.now();
    return this.looks.find(l=>t-l.time<=within&&(!targets||targets.includes(l.target)))??null;
  }

  // ---- The examiner's directions ----
  direction(step:RouteStep):void{
    this.directions++;
    const ev=this.input.events.events.at(-1);
    // A mirror check just before the direction counts too (planning ahead).
    this.watch={step,mirror:!!this.recentLook(4),signalled:false,wrongSignal:false,maxSpeed:0,directionEvent:ev?.id??null};
  }

  done(step:RouteStep,followed:boolean):void{
    const w=this.watch;
    this.watch=null;
    if(!followed){this.redirects++;return}
    if(!w||w.step!==step)return;
    const into=step.to.road.name??'the next road';
    const ev=w.directionEvent?[w.directionEvent]:[];
    const turning=step.turn!=='ahead';
    const id=`turn-${this.directions}`;
    if(turning&&!w.mirror)this.fault('mirrors-change-direction',`${id}-mirrors`,'minor',
      `Use of mirrors – change direction: no mirror check between the direction and turning ${step.turn} into ${into}.`,ev);
    if(turning&&!w.signalled)this.fault('signals-necessary',`${id}-signal`,'minor',
      `Signals – necessary: no ${step.turn} signal before turning ${step.turn} into ${into}.`,ev);
    if(w.wrongSignal)this.fault('signals-correctly',`${id}-wrong-signal`,w.signalled?'minor':'serious',
      w.signalled?`Signals – correctly: a signal the wrong way before turning ${step.turn} into ${into}.`
        :`Signals – correctly: signalled the wrong way and never ${step.turn} before turning into ${into}: misleading to other road users.`,ev);
    if(turning){
      const v=mph(w.maxSpeed);
      if(v>22)this.fault('junctions-approach-speed',`${id}-speed`,'serious',`Junctions – approach speed: ${v.toFixed(0)} mph turning ${step.turn} into ${into} (draft limit: 15 mph, serious above 22 mph).`,ev);
      else if(v>15)this.fault('junctions-approach-speed',`${id}-speed`,'minor',`Junctions – approach speed: ${v.toFixed(0)} mph turning ${step.turn} into ${into} (draft limit: 15 mph).`,ev);
      // The signal should be cancelled once round the corner.
      this.cancelBy={time:this.input.now()+8,turn:step.turn as 'left'|'right',incident:`${id}-cancel`};
    }
  }

  pullUp():void{}

  /** Findings so far (for the HUD and diagnostics). */
  get current(){return this.log.current}

  fixedUpdate(dt:Seconds):void{
    const now=this.input.now();
    const l=this.input.learner();
    const {x,z}=l.pose.position,heading=l.pose.heading,speed=Math.abs(l.speed);
    // New evidence since the last step: looks (mirrors and shoulders), collisions.
    const evs=this.input.events.events;
    for(let i=evs.length-1;i>=0;i--){
      const e=evs[i] as SimEvent;
      const n=Number(e.id.slice(3));
      if(n<=this.lastEvent)break;
      if(e.type==='observation.dwell'){
        this.looks.unshift({time:e.time,target:String(e.payload['target']),id:e.id});
        if(this.watch)this.watch.mirror=true;
      }
      if(e.type==='vehicle.collision')this.fault('control-collision',`collision-${String(e.payload['obstacleId'])}`,'dangerous',`Control: collision with ${String(e.payload['obstacleId']).replace(/-\d+$/,'').replace(/-/g,' ')} at ${mph(Number(e.payload['speed'])||0).toFixed(0)} mph.`,[e.id]);
    }
    if(evs.length)this.lastEvent=Math.max(this.lastEvent,Number(evs.at(-1)!.id.slice(3)));
    this.looks=this.looks.filter(lk=>now-lk.time<30);

    // Moving off: a look round (right mirror, right shoulder or interior mirror) in the 10 s before first moving.
    if(!this.movedOff&&speed>.5){
      this.movedOff=true;
      if(!this.recentLook(10,['right-door','right-shoulder','interior']))
        this.fault('moving-off-safety','moving-off','minor','Moving off – safety: no check of the mirrors or over the right shoulder in the 10 s before moving off.');
    }

    // The manoeuvre being watched: mirror checks, the signal, the speed into the junction.
    const w=this.watch;
    if(w){
      const turn=w.step.turn;
      if(l.indicator!=='off'){
        if(turn!=='ahead'&&l.indicator===turn)w.signalled=true;
        else if(Math.hypot(x-w.step.at.x,z-w.step.at.z)<40)w.wrongSignal=true;
      }
      if(Math.hypot(x-w.step.at.x,z-w.step.at.z)<12)w.maxSpeed=Math.max(w.maxSpeed,speed);
    }
    if(this.cancelBy&&now>this.cancelBy.time){
      // (Not when the next turn is the same way and already asked for: that signal is for it.)
      if(l.indicator===this.cancelBy.turn&&this.watch?.step.turn!==this.cancelBy.turn)this.fault('signals-timed',this.cancelBy.incident,'minor','Signals – timed: the signal was left on after the turn (not cancelled within 8 s).');
      this.cancelBy=null;
    }

    // Speed: over the limit for more than 2 s.
    const near=this.input.location.roads.reduce((best,r)=>{const s=sampleRoad(r,x,z);return !best||s.distance<best.s.distance?{r,s}:best},null as null|{r:Location['roads'][number];s:ReturnType<typeof sampleRoad>});
    const limit=near?.r.speedLimitMph??30;
    const over=mph(speed)-limit;
    if(over>3){
      this.speeding??={since:now,worst:0,incident:++this.speedIncidents};
      this.speeding.worst=Math.max(this.speeding.worst,over);
      if(now-this.speeding.since>2){
        const sev:Severity=this.speeding.worst>20?'dangerous':this.speeding.worst>8?'serious':'minor';
        this.fault('speed-limit',`speed-${this.speeding.incident}`,sev,`Speed: ${(limit+this.speeding.worst).toFixed(0)} mph in a ${limit} mph limit (draft: a fault above ${limit+3}, serious above ${limit+8}, dangerous above ${limit+20} mph).`);
      }
    }else if(over<1)this.speeding=null;

    // Following distance: under one second behind a vehicle going the same way, for 2 s.
    const fwd={x:Math.sin(heading),z:-Math.cos(heading)};
    let gap=Infinity;
    for(const t of this.input.traffic()){
      if(Math.cos(t.heading-heading)<.8)continue;
      const dx=t.x-x,dz=t.z-z,along=dx*fwd.x+dz*fwd.z,side=Math.abs(dx*fwd.z-dz*fwd.x);
      if(along>0&&side<1.6)gap=Math.min(gap,along-4.4);
    }
    if(speed>4.5&&gap/speed<1){
      this.following+=dt;
      if(this.following>2&&this.following-dt<=2)this.fault('following-distance',`following-${++this.followingIncidents}`,'minor',`Following distance: under one second behind the vehicle ahead at ${mph(speed).toFixed(0)} mph (the two-second rule).`);
    }else this.following=0;

    // Position: on the right-hand side of a two-way road for no reason (not passing parked cars, not at a junction).
    if(near&&!near.r.oneway&&near.r.lanes.count>=2&&speed>2){
      const dir=near.s.direction.x*fwd.x+near.s.direction.z*fwd.z>=0?1:-1;
      const right=near.s.lateral*dir;
      const passing=this.input.parked.some(p=>{const dx=p.x-x,dz=p.z-z,a=dx*fwd.x+dz*fwd.z;return a>-6&&a<25&&Math.hypot(dx,dz)<26})
        ||this.input.traffic().some(t=>{const dx=t.x-x,dz=t.z-z,a=dx*fwd.x+dz*fwd.z;return t.speed<.5&&a>-6&&a<25&&Math.abs(dx*fwd.z-dz*fwd.x)<3});
      const atJunction=this.input.location.junctions.some(j=>Math.hypot(j.position.x-x,j.position.z-z)<j.radius+20)
        ||(this.watch&&Math.hypot(this.watch.step.at.x-x,this.watch.step.at.z-z)<30);
      if(right>.5&&!passing&&!atJunction){
        this.wrongSide+=dt;
        if(this.wrongSide>3&&this.wrongSide-dt<=3)this.wrongSideIncident++;
        if(this.wrongSide>3)this.fault('positioning-normal',`position-${this.wrongSideIncident}`,this.wrongSide>8?'serious':'minor',
          `Positioning – normal driving: on the right-hand side of ${near.r.name??'the road'} for ${this.wrongSide.toFixed(0)} s with nothing to pass.`);
      }else this.wrongSide=0;
    }

    // Mounting the pavement, or leaving the road.
    if(l.surface!=='carriageway'&&speed>.3){
      this.pavement+=dt;
      if(this.pavement>.5&&this.pavement-dt<=.5)this.fault(l.surface==='pavement'?'positioning-pavement':'control-off-road',`kerb-${Math.round(now)}`,l.surface==='pavement'?'serious':'dangerous',
        l.surface==='pavement'?'Control – steering: the car mounted the pavement.':'Control – steering: the car left the road.');
    }else this.pavement=0;

    // Mini-roundabouts: entering while another vehicle is on it, or coming on from close by.
    const rb=this.input.location.junctions.findIndex(j=>j.kind==='mini-roundabout'&&Math.hypot(j.position.x-x,j.position.z-z)<j.radius);
    if(rb>=0&&rb!==this.inRoundabout){
      const j=this.input.location.junctions[rb]!;
      const conflict=this.input.traffic().some(t=>{
        const d=Math.hypot(t.x-j.position.x,t.z-j.position.z);
        if(d<j.radius+1)return true;
        // Approaching it (heading towards the middle) within 12 m.
        const to={x:j.position.x-t.x,z:j.position.z-t.z};
        return d<j.radius+12&&t.speed>1&&(to.x*Math.sin(t.heading)-to.z*Math.cos(t.heading))/d>.7;
      });
      if(conflict)this.fault('junctions-observation',`roundabout-${Math.round(now)}`,'serious','Junctions – observation: entered the mini-roundabout while another vehicle was on it or about to arrive (give way to traffic from the right).');
    }
    this.inRoundabout=rb;
  }

  /** The result: pass or fail, with every fault. */
  finish(scenarioId:string,outcome:AttemptResult['outcome'],duration:Seconds):AttemptResult{
    const findings=this.log.sorted();
    const driving=findings.filter(f=>f.severity==='minor').length;
    const serious=findings.filter(f=>f.severity==='serious').length;
    const dangerous=findings.filter(f=>f.severity==='dangerous').length;
    // The drive is over when the examiner ends it or the time is up; ended early, it is a fail only if a fault
    // had already decided it.
    const failed=driving>15||serious>0||dangerous>0;
    const finished=outcome==='completed'||outcome==='time-limit'||failed;
    const passed=finished&&!failed;
    const notes:string[]=[];
    notes.push(`${INFO}${!finished?'Not finished':passed?'Pass':'Fail'}: ${driving} driving fault${driving===1?'':'s'}, ${serious} serious, ${dangerous} dangerous. A pass allows up to 15 driving faults and no serious or dangerous faults.`);
    if(outcome!=='completed')notes.push(`${INFO}${outcome==='time-limit'?'The time for the drive ran out; it is marked on the faults so far.':'The test was ended before the examiner finished it.'}`);
    if(this.redirects)notes.push(`${INFO}You went a different way ${this.redirects} time${this.redirects===1?'':'s'}: not a fault in itself; the examiner gave new directions.`);
    const byHeading=new Map<string,number>();
    for(const f of findings)if(f.severity==='minor'){const h=f.explanation.split(':')[0]!;byHeading.set(h,(byHeading.get(h)??0)+1)}
    for(const [h,n] of [...byHeading].sort((a,b)=>b[1]-a[1]))if(n>=3)notes.push(`${IMPROVE}${h} (${n} driving faults): three or more under one heading is worth practising on its own.`);
    if(findings.length===0&&outcome==='completed')notes.push('No faults recorded on this drive.');
    return {scenarioId,rubricVersion:MOCK_TEST_RUBRIC,outcome,findings,notes,durationSeconds:duration,finishedAt:new Date().toISOString(),
      mockTest:{passed,driving,serious,dangerous,finished}};
  }

  dispose():void{}
}
