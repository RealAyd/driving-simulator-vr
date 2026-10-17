import {
  IMPROVE,INFO,type AttemptResult,type EventSink,type Finding,type Pose,type Seconds,type SimEvent,type SimModule
} from '../contracts';
import type {PassingVehicle} from '../actors/passingVehicle';
import {boxesOverlap} from '../world/obstacles';
import {FindingLog} from './findingLog';

/** Draft thresholds, loaded from content/rubrics/moving-off.json. */
export interface MovingOffRubric{
  id:string;
  version:string;
  reviewStatus:string;
  moveOffSpeed:number;
  observationAreas:Array<{id:string;label:string;views:string[];recentSeconds:number}>;
  alongsideMarginMetres:number;
  closePassMetres:number;
  signalRelevantWithinSeconds:number;
  signalRelevantWithinMetres:number;
  harshAvoidingDecel:number;
}

export interface MovingOffInputs{
  events:()=>readonly SimEvent[];
  learner:()=>{pose:Pose;speed:number;halfWidth:number;halfLength:number;indicator:'off'|'left'|'right'|'hazard'};
  roadUsers:PassingVehicle[];
  now:()=>Seconds;
}

const VIEW_NAMES:Record<string,string>={
  interior:'interior mirror','right-door':'right mirror','left-door':'left mirror',
  'right-shoulder':'right shoulder','left-shoulder':'left shoulder'
};

interface Observation{view:string;time:Seconds;eventId:string;source:string}

/** Position of another road user relative to the learner's car (metres). */
function relative(learner:Pose,other:Pose):{ahead:number;right:number}{
  const dx=other.position.x-learner.position.x,dz=other.position.z-learner.position.z;
  const fx=Math.sin(learner.heading),fz=-Math.cos(learner.heading);
  return {ahead:dx*fx+dz*fz,right:dx*-fz+dz*fx};
}

/**
 * Assesses moving off from a parked position as a decision, not a checklist:
 * which views were selected and how recently, whether the road changed since,
 * and whether moving off affected anyone (an avoiding response, a close pass
 * or a collision). A signal never makes an unsafe movement acceptable.
 *
 * View evidence means the view was selected or pointed at the mirror or
 * blind spot. It is not eye tracking and does not prove the learner noticed
 * a road user.
 */
export class MovingOffAssessor implements SimModule{
  readonly id='moving-off-assessment';
  private readonly log:FindingLog;
  private readonly notes:string[]=[];
  private readonly observations:Observation[]=[];
  private readonly passed=new Map<string,{time:Seconds;eventId:string;learnerStationary:boolean}>();
  private cursor=0;
  private moveOff:{time:Seconds;eventId:string}|null=null;
  private closest=new Map<string,number>();

  constructor(private readonly input:MovingOffInputs,private readonly rubric:MovingOffRubric,private readonly sink:EventSink){
    this.log=new FindingLog(rubric.version,sink,input.now);
  }

  private name(id:string):string{
    return this.input.roadUsers.find(u=>u.id===id)?.name??id.replace(/-/g,' ');
  }

  fixedUpdate():void{
    const events=this.input.events();
    const learner=this.input.learner();
    for(;this.cursor<events.length;this.cursor++){
      const e=events[this.cursor]!;
      if(e.type==='observation.dwell')
        this.observations.push({view:String(e.payload['target']),time:e.time,eventId:e.id,source:String(e.payload['source'])});
      if(e.type==='vehicle.moving'&&!this.moveOff){
        this.moveOff={time:e.time,eventId:e.id};
        this.assessMoveOff(learner);
      }
      if(e.type==='actor.avoiding')this.avoiding(e);
      if(e.type==='vehicle.collision'){
        const id=String(e.payload['obstacleId']);
        const user=this.input.roadUsers.some(u=>u.id===id);
        this.log.record('moving-off.collision',user?`conflict-${id}`:`collision-${id}`,user?'dangerous':'serious',[e.id],
          user?`You collided with the ${this.name(id)}.`:`The car collided with the ${id.replace(/-/g,' ')}.`);
      }
    }
    this.trackRoadUsers(learner);
  }

  /** Records road users passing the learner, and close passes once moving. */
  private trackRoadUsers(learner:ReturnType<MovingOffInputs['learner']>):void{
    for(const u of this.input.roadUsers){
      if(!u.started)continue;
      const rel=relative(learner.pose,u.pose);
      if(!this.passed.has(u.id)&&rel.ahead>learner.halfLength+u.size.halfLength){
        const e=this.sink.emit('actor.passed',{actorId:u.id,learnerSpeed:+learner.speed.toFixed(2)});
        this.passed.set(u.id,{time:e.time,eventId:e.id,learnerStationary:learner.speed<this.rubric.moveOffSpeed});
      }
      if(!this.moveOff)continue;
      const gap=this.gap(learner,u);
      if(gap<(this.closest.get(u.id)??Infinity))this.closest.set(u.id,gap);
      if(gap<this.rubric.closePassMetres&&u.speed>1&&!this.log.has(`conflict-${u.id}`)){
        const e=this.sink.emit('actor.avoiding',{actorId:u.id,closePass:true,gap:+gap.toFixed(2)});
        this.log.record('moving-off.close-pass',`conflict-${u.id}`,'serious',[e.id,this.moveOff.eventId],
          `After you moved off, the ${u.name} passed within ${Math.max(0,gap).toFixed(1)} m of your car.`);
      }
    }
  }

  /** Clearance between the learner's car and a road user (0 when touching). */
  private gap(learner:ReturnType<MovingOffInputs['learner']>,u:PassingVehicle):number{
    for(let margin=0;margin<=2;margin+=.1){
      if(boxesOverlap(
        {id:'l',cx:learner.pose.position.x,cz:learner.pose.position.z,heading:learner.pose.heading,halfW:learner.halfWidth+margin/2,halfD:learner.halfLength+margin/2},
        {id:u.id,cx:u.pose.position.x,cz:u.pose.position.z,heading:u.pose.heading,halfW:u.size.halfWidth+margin/2,halfD:u.size.halfLength+margin/2}
      ))return margin;
    }
    return Infinity;
  }

  private avoiding(e:SimEvent):void{
    if(e.payload['closePass'])return;
    const id=String(e.payload['actorId']);
    const decel=Number(e.payload['requiredDecel']);
    const ids=[e.id,...(this.moveOff?[this.moveOff.eventId]:[])];
    const how=decel>=this.rubric.harshAvoidingDecel?'brake hard':'slow down';
    const severity=decel>=this.rubric.harshAvoidingDecel?'dangerous':'serious';
    this.log.record('moving-off.forced-avoidance',`conflict-${id}`,severity,ids,
      `You moved into the path of the ${this.name(id)}, which had to ${how} to avoid you.${this.signalDidNotHelp()}`);
  }

  private signalDidNotHelp():string{
    return this.input.learner().indicator==='right'?' Signalling does not make moving out safe; it only tells others what you intend.':'';
  }

  /** Called at the moment the car starts to move. */
  private assessMoveOff(learner:ReturnType<MovingOffInputs['learner']>):void{
    const t=this.moveOff!.time,moveId=this.moveOff!.eventId;
    // The road changes while you look elsewhere: a check made before someone passed is out of date.
    const lastPass=[...this.passed.values()].reduce((latest,p)=>Math.max(latest,p.time),-Infinity);

    for(const area of this.rubric.observationAreas){
      const seen=this.observations.filter(o=>area.views.includes(o.view)&&o.time<=t);
      const latest=seen.at(-1);
      const recent=latest&&t-latest.time<=area.recentSeconds;
      const fresh=latest&&latest.time>=lastPass;
      if(recent&&fresh){
        this.notes.push(`Before moving off you selected the ${VIEW_NAMES[latest!.view]} view ${(t-latest!.time).toFixed(1)} s earlier (${latest!.source}).`);
        continue;
      }
      const why=!latest?`no view of ${area.label} was selected before you moved off`
        :!recent?`your last view of ${area.label} was ${(t-latest.time).toFixed(0)} s before you moved off, so it was out of date`
        :`you checked ${area.label} before another road user passed, and did not check again after waiting`;
      this.log.record('moving-off.observation',`observation-${area.id}`,'minor',[moveId,...(latest?[latest.eventId]:[])],
        `Observation: ${why}. Check again just before you move.`);
    }

    // Who could be affected at the moment of moving off.
    let signalRelevant=false;
    for(const u of this.input.roadUsers){
      if(!u.started||this.passed.has(u.id))continue;
      const rel=relative(learner.pose,u.pose);
      const lengths=learner.halfLength+u.size.halfLength;
      const side=rel.right>=0?'right':'left';
      if(rel.ahead>-lengths-this.rubric.alongsideMarginMetres&&rel.ahead<lengths){
        this.log.record('moving-off.alongside',`conflict-${u.id}`,'serious',[moveId],
          `You moved off while the ${u.name} was passing on your ${side}.${this.signalDidNotHelp()}`);
      }
      const behind=Math.max(0,-rel.ahead-lengths);
      if(behind<=this.rubric.signalRelevantWithinMetres&&behind/Math.max(u.speed,.1)<=this.rubric.signalRelevantWithinSeconds)signalRelevant=true;
    }
    const indicator=learner.indicator;
    if(indicator==='left')
      this.log.record('moving-off.signal','signal','minor',[moveId],'You signalled left while moving out to the right. A wrong signal can mislead other road users.');
    else if(signalRelevant&&indicator!=='right')
      this.log.record('moving-off.signal','signal','minor',[moveId],'Road users were approaching when you moved off and you did not signal right. Signal to tell them what you intend.');
    else if(indicator==='right')this.notes.push('You signalled right before moving off.');
    else this.notes.push('Nobody was close behind when you moved off, so a signal was optional.');

    const waitedFor=[...this.passed.entries()].filter(([,p])=>p.learnerStationary).map(([id])=>this.name(id));
    if(waitedFor.length)this.notes.push(`You waited while the ${waitedFor.join(' and the ')} passed.`);
  }

  /** Builds the attempt result. Call once when the exercise ends. */
  finish(scenarioId:string,outcome:AttemptResult['outcome'],duration:Seconds):AttemptResult{
    this.fixedUpdate();
    const findings=this.log.sorted();
    const notes=[...this.notes];
    if(!this.moveOff)notes.push(IMPROVE+'You did not move off before the exercise ended.');
    else if(!findings.some(f=>f.incidentId.startsWith('conflict-'))&&outcome==='completed')
      notes.push('You moved off without affecting anyone.');
    notes.push(INFO+'View evidence records which views were selected and when. It is not eye tracking and does not show what you noticed.');
    return {scenarioId,rubricVersion:`${this.rubric.id} ${this.rubric.version}`,outcome,findings,notes,durationSeconds:duration,finishedAt:new Date().toISOString()};
  }

  get current():Finding[]{
    return this.log.current;
  }

  reset():void{
    this.log.reset();
    this.notes.length=0;
    this.observations.length=0;
    this.passed.clear();
    this.closest.clear();
    this.cursor=0;
    this.moveOff=null;
  }

  dispose():void{}
}
