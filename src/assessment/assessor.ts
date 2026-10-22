import {
  mpsToMph,type AttemptResult,type Crossing,type EventSink,type Finding,type Pose,
  type Seconds,type Severity,type SimEvent,type SimModule
} from '../contracts';
import type {Pedestrian} from '../actors/pedestrian';
import {PEDESTRIAN_RADIUS} from '../actors/pedestrian';
import {pointToBox} from '../world/collisions';
import type {ZoneTracker} from '../scenarios/zones';
import {CROSSING_RUBRIC as R} from './rubric';
import {FindingLog} from './findingLog';

export interface AssessorInputs{
  events:()=>readonly SimEvent[];
  learner:()=>{pose:Pose;speed:number;halfWidth:number;halfLength:number};
  followerGap:()=>number|null;
  zones:ZoneTracker;
  crossing:Crossing;
  pedestrian:Pedestrian;
  now:()=>Seconds;
  /** What hides the pavement on the approach (for feedback), e.g. "the parked van". */
  restriction?:string;
}

const mph=(v:number)=>Math.round(mpsToMph(v));

/**
 * Turns recorded evidence into findings. It never changes the simulation.
 * One incident is counted once: later evidence for the same incident
 * upgrades it instead of adding a second finding.
 */
export class Assessor implements SimModule{
  readonly id='assessment';
  private readonly log:FindingLog;
  private readonly notes:string[]=[];
  private cursor=0;
  private firstApproachBrake:SimEvent|null=null;
  private conflictSeen=false;

  constructor(private readonly input:AssessorInputs,sink:EventSink){
    this.log=new FindingLog(R.version,sink,input.now);
  }

  /** Adds a finding, or upgrades the existing finding for the same incident. */
  record(ruleId:string,incidentId:string,severity:Severity,eventIds:string[],explanation:string):Finding{
    return this.log.record(ruleId,incidentId,severity,eventIds,explanation);
  }

  private inApproachZone():boolean{
    return !!this.input.zones.stats.get(R.approachZone)?.inside;
  }

  fixedUpdate():void{
    const events=this.input.events();
    for(;this.cursor<events.length;this.cursor++){
      const e=events[this.cursor]!;
      if(e.type==='vehicle.braking'&&!this.firstApproachBrake&&this.inApproachZone()){
        this.firstApproachBrake=e;
        this.checkMirrorBeforeBraking(e,events);
      }
      if(e.type==='vehicle.surface.changed'&&e.payload['to']==='pavement'){
        this.record('kerb.mounted',`kerb-${e.id}`,'minor',[e.id],'The car mounted the pavement. Keep the wheels on the carriageway and allow room for parked vehicles.');
      }
      if(e.type==='vehicle.collision'&&e.payload['obstacleId']===this.input.pedestrian.id){
        this.record('crossing.collision','crossing-conflict','dangerous',[e.id],'The car struck the pedestrian on the crossing.');
      }else if(e.type==='vehicle.collision'&&!e.payload['struck']){
        this.record('vehicle.collision',`collision-${e.payload['obstacleId']}`,'serious',[e.id],
          `The car collided with ${String(e.payload['obstacleId']).replace(/-/g,' ')}.`);
      }
      if(e.type==='vehicle.stopped')this.checkStopPosition(e,events);
    }
    this.checkGiveWay(events);
  }

  private checkMirrorBeforeBraking(brake:SimEvent,events:readonly SimEvent[]):void{
    const glance=events.find(e=>e.type==='observation.dwell'&&e.payload['target']==='interior'
      &&e.time<=brake.time&&e.time>=brake.time-R.mirrorLookbackSeconds);
    if(glance){
      this.notes.push(`Checked the interior mirror (${glance.payload['source']}) before slowing.`);
      return;
    }
    const gap=this.input.followerGap();
    const followed=gap!==null&&gap<R.followerRelevantWithin;
    this.record('observation.mirror-before-braking','mirror-before-braking',followed?'minor':'advice',[brake.id],
      followed
        ?`You braked at ${mph(brake.payload['speed'] as number)} mph without a mirror check in the previous ${R.mirrorLookbackSeconds} s, with a vehicle about ${Math.round(gap!)} m behind.`
        :`Check the interior mirror before slowing down, even when nothing seems to be behind.`);
  }

  /** Front of the learner car, as distance along the crossing's road. */
  private frontAlong():number|null{
    const along=this.input.zones.along.get(this.input.crossing.roadId);
    return along===undefined?null:along+this.input.learner().halfLength;
  }

  private checkStopPosition(stop:SimEvent,events:readonly SimEvent[]):void{
    const ped=this.input.pedestrian.state;
    if(ped!=='preparing'&&ped!=='crossing')return;
    const front=this.frontAlong();
    const c=this.input.crossing;
    const giveWay=c.along-c.width/2-c.giveWayOffset;
    if(front===null||front<=giveWay+.3||front>c.along+c.width/2)return;
    const pedEvent=[...events].reverse().find(e=>e.type==='actor.state.changed'&&e.payload['actorId']===this.input.pedestrian.id);
    this.record('crossing.stop-position','crossing-stop-position','minor',[stop.id,...(pedEvent?[pedEvent.id]:[])],
      `You stopped ${(front-giveWay).toFixed(1)} m past the give-way line. Stop at the line so the pedestrian has the whole crossing.`);
  }

  private checkGiveWay(events:readonly SimEvent[]):void{
    const ped=this.input.pedestrian;
    if(ped.state!=='crossing')return;
    const {pose,speed,halfWidth,halfLength}=this.input.learner();
    const c=this.input.crossing;
    const along=this.input.zones.along.get(c.roadId);
    if(along===undefined)return;
    const onCrossing=along+halfLength>c.along-c.width/2&&along-halfLength<c.along+c.width/2;
    const distance=pointToBox(ped.position.x,ped.position.z,pose,halfWidth,halfLength)-PEDESTRIAN_RADIUS;
    const pedEvent=[...events].reverse().find(e=>e.type==='actor.state.changed'&&e.payload['actorId']===ped.id&&e.payload['state']==='crossing');
    const ids=pedEvent?[pedEvent.id]:[];
    if(speed>.5&&distance<R.pedestrianDangerDistance){
      this.conflictSeen=true;
      this.record('crossing.too-close','crossing-conflict','dangerous',ids,
        `The car came within ${Math.max(0,distance).toFixed(1)} m of the pedestrian while moving at ${mph(speed)} mph.`);
    }else if(onCrossing&&speed>.5){
      this.conflictSeen=true;
      this.record('crossing.give-way','crossing-conflict','serious',ids,
        'You drove onto the zebra crossing while a pedestrian was crossing. Give way once someone has stepped onto the crossing.');
    }
  }

  /** Builds the attempt result. Call once when the exercise ends. */
  finish(scenarioId:string,outcome:AttemptResult['outcome'],duration:Seconds):AttemptResult{
    // The attempt can end in the same step as its final events (e.g. a
    // collision); process any evidence not yet seen before building results.
    this.fixedUpdate();
    const approach=this.input.zones.stats.get(R.approachZone);
    if(approach?.entered){
      const v=approach.maxSpeed;
      const ids=[approach.entryEventId,approach.exitEventId].filter((id):id is string=>!!id);
      if(v>R.approachSeriousOver)this.record('approach.speed','approach-speed','serious',ids,
        `You reached ${mph(v)} mph past ${this.input.restriction??'the parked van'}, where a pedestrian could be hidden. At that speed you could not stop for someone stepping out.`);
      else if(v>R.approachIdealMax)this.record('approach.speed','approach-speed','minor',ids,
        `You reached ${mph(v)} mph past ${this.input.restriction??'the parked van'}. Slow to about 20 mph or less where the view of the pavement is blocked.`);
      else this.notes.push(`Approached the restricted view at no more than ${mph(v)} mph.`);
    }
    const ped=this.input.pedestrian;
    if(outcome==='completed'&&ped.state!=='waiting'&&!this.conflictSeen)this.notes.push('Gave way to the pedestrian on the crossing.');
    if(outcome==='left-route')this.record('route.left','route','advice',[],'The exercise ended because the car left the road or turned back.');
    if(outcome==='time-limit')this.record('route.time','time','advice',[],'The exercise ended at its time limit before reaching the end of the road.');

    const findings=this.log.sorted();
    return {scenarioId,rubricVersion:R.version,outcome,findings,notes:[...this.notes],durationSeconds:duration,finishedAt:new Date().toISOString()};
  }

  get current():Finding[]{
    return this.log.current;
  }

  reset():void{
    this.log.reset();
    this.notes.length=0;
    this.cursor=0;
    this.firstApproachBrake=null;
    this.conflictSeen=false;
  }

  dispose():void{}
}
