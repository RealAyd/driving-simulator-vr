import type {Vec2} from '../contracts';
import type {Controls,VehicleParams} from '../vehicle/kinematics';
import {SteeringAssist} from '../vehicle/steeringAssist';
import {assessStage,summarise,type DecisionResult,type Stage,type StageVerdict} from './assess';
import {ACTION_SIGNAL} from './actions';
import type {ChallengeDef,DecisionRoute,StagePlace} from './route';

/**
 * Plays a decision mock test: drives the car along the route (assisted steering, and speed: gently, slowing for
 * bends, stopping at give way lines, keeping back from road users ahead), says each direction in good time, starts
 * the road users scripted for each challenge, and pauses the whole scene at each decision. A choice is judged when
 * submitted (assess.ts); Continue then plays on from it: waiting lets the traffic pass and pauses again for a fresh
 * decision; going drives on. Going where it was unsafe is not driven: the car is held (an intervention, recorded) and
 * the decision comes again once the traffic has passed. Nothing here touches the screen: the app wires it up.
 */

/** A road user the runner can start (a scenario's passing vehicle). */
export interface RunnerActor{
  readonly pose:{position:{x:number;z:number}};
  readonly started:boolean;
  /** Metres driven along its path. */
  readonly travelled:number;
  readonly path:readonly Vec2[];
  setTiming(delaySeconds:number,speed?:number):void;
  reset():void;
}

export interface RunnerScene{
  car():{x:number;z:number;heading:number;speed:number;steerAngle:number};
  actor(id:string):RunnerActor|undefined;
  setSignal(side:'left'|'right'|'off'):void;
  say(text:string):void;
  /** Stop or restart everything (the car, traffic, people, lights): the decision is made with the scene still. */
  freeze(on:boolean):void;
  /** The scene is paused for a decision (the buttons to show); null when it plays on. */
  paused(p:PausedAt|null):void;
  finished(result:DecisionRunResult):void;
}

export interface PausedAt{challenge:ChallengeDef;stage:Stage;place:StagePlace;index:number;of:number}

export interface StageRecord{challengeId:string;stageId:string;sequence:string[];verdict:StageVerdict}
export interface DecisionRunResult extends DecisionResult{
  route:DecisionRoute;
  /** The challenges driven, in order (one when practising). */
  driven:ChallengeDef[];
  records:StageRecord[];
  practice:boolean;
}

/** Cruising speed between challenges (m/s, 25 mph), sideways acceleration round bends and braking (m/s²). */
const CRUISE=11.2,LATERAL=1.6,BRAKING=1.6;
/** Gap kept behind a road user ahead on the path (metres, front to its middle). */
const FOLLOW=7;
/** The car's front is this far ahead of its middle (metres). */
const HALF_LENGTH=2.15;

const along=(path:readonly Vec2[],p:Vec2)=>{
  let best=Infinity,at=0,s=0;
  for(let i=1;i<path.length;i++){
    const a=path[i-1]!,b=path[i]!,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l/l)),d=Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z);
    if(d<best){best=d;at=s+t*l}
    s+=l;
  }
  return at;
};

export class DecisionRunner{
  readonly assist:SteeringAssist;
  readonly records:StageRecord[]=[];
  private phase:'drive'|'paused'|'submitted'|'finished'='drive';
  private challenge=0;
  private stage='';
  /** The stop the car is held at until the challenge's decision lets it go (path metres, its middle). */
  private released=false;
  private said=-1;
  private started=new Set<string>();
  private last:StageRecord|null=null;
  private only:number|null=null;
  private ending=false;
  private readonly at=new Map<object,number>();

  constructor(readonly route:DecisionRoute,readonly path:Vec2[],params:VehicleParams,private readonly scene:RunnerScene){
    this.assist=new SteeringAssist(path,params);
  }

  /** Path metres of a route point (cached). */
  private s(p:Vec2):number{let v=this.at.get(p);if(v===undefined){v=along(this.path,p);this.at.set(p,v)}return v}

  get state(){return this.phase}
  get current():{challenge:ChallengeDef;stage:Stage}|null{
    const c=this.route.challenges[this.challenge];
    const st=c?.stages.find(x=>x.id===this.stage);
    return c&&st?{challenge:c,stage:st}:null;
  }
  /** Practising one challenge (from the results) rather than the whole test. */
  get practice(){return this.only!==null}

  /** Where the car starts: the route's start, or a little before the challenge practised. */
  startPose(only:number|null=null):{x:number;z:number;heading:number}{
    if(only===null||only===0){const st=this.route.start;return {x:st.x,z:st.z,heading:st.headingDeg*Math.PI/180}}
    const s=Math.max(0,this.s(this.route.challenges[only]!.instructAt)-30),p=this.assist.pointAt(s),q=this.assist.pointAt(s+2);
    return {x:p.x,z:p.z,heading:Math.atan2(q.x-p.x,-(q.z-p.z))};
  }

  /** From the start (the whole test), or practising one challenge. The car must already be at `startPose`. */
  begin(only:number|null=null):void{
    this.only=only;this.challenge=only??0;this.stage=this.route.challenges[this.challenge]!.stages[0]!.id;
    this.phase='drive';this.released=false;this.said=-1;this.started.clear();this.records.length=0;this.last=null;this.ending=false;
    for(const a of this.route.actors){const x=this.scene.actor(a.id);if(x){x.setTiming(1e9);x.reset()}}
    this.assist.setPath(this.path);
    this.scene.setSignal('off');
    this.scene.freeze(false);
    this.scene.paused(null);
  }

  private carS():number{const c=this.scene.car();return this.assist.progress(c.x,c.z)}

  /** The stop the car is held at for the challenge in hand (its middle, path metres), if any. */
  private stopAt():number|null{
    if(this.ending)return this.assist.length-12;
    const c=this.route.challenges[this.challenge];
    if(!c||this.released)return null;
    const from=c.stages.findIndex(x=>x.id===this.stage);
    for(const st of c.stages.slice(Math.max(0,from))){const p=c.place[st.id]!.pause;if(p.kind==='stop')return this.s(p.at)}
    return null;
  }

  /** Pedals and steering for this step (assisted throughout). */
  controls():Controls{
    const car=this.scene.car(),s=this.assist.progress(car.x,car.z);
    const steer=this.assist.steer({position:{x:car.x,y:0,z:car.z},heading:car.heading,steerAngle:car.steerAngle},car.speed);
    let v=this.phase==='drive'?CRUISE:0;
    // Bends ahead: slow enough to follow each, braking gently to it.
    for(let d=0;d<=50;d+=2){
      const k=Math.abs(this.assist.turnBetween(s+d,s+d+6))/6;
      if(k>1e-3)v=Math.min(v,Math.sqrt(LATERAL/k+2*BRAKING*d));
    }
    const stop=this.stopAt();
    if(stop!==null)v=Math.min(v,Math.sqrt(2*BRAKING*Math.max(0,stop-s-.2)));
    // Road users ahead on the way.
    for(const a of this.route.actors){
      const x=this.scene.actor(a.id);
      if(!x?.started)continue;
      for(let d=HALF_LENGTH;d<=45;d+=1.5){
        const p=this.assist.pointAt(s+d);
        if(Math.hypot(p.x-x.pose.position.x,p.z-x.pose.position.z)<2.2){v=Math.min(v,Math.sqrt(2*BRAKING*Math.max(0,d-FOLLOW)));break}
      }
    }
    const want=(v-car.speed)*2.5;
    if(v<.05&&car.speed<.6)return {throttle:0,brake:1,steer};
    return want>=0?{throttle:Math.min(1,want/2.4+.04),brake:0,steer}:{throttle:0,brake:Math.min(1,Math.max(0,(-want-.35)/7.5)),steer};
  }

  /** Once a simulation step (after the car and the road users have moved). */
  update():void{
    if(this.phase!=='drive')return;
    const car=this.scene.car(),s=this.carS();
    if(this.ending){if(car.speed<.05&&s>=this.assist.length-13)this.finish();return}
    const c=this.route.challenges[this.challenge];
    if(!c){this.ending=true;return}
    if(this.said<this.challenge&&s>=this.s(c.instructAt)){this.said=this.challenge;this.scene.say(c.instruction)}
    for(const st of c.starts){
      const key=`${c.id}/${st.actor}`;
      if(!this.started.has(key)&&s>=this.s(st.at)){
        this.started.add(key);
        const x=this.scene.actor(st.actor);
        if(x){x.setTiming(st.delay);x.reset()}
      }
    }
    if(this.released){
      // Past the challenge: the signal goes off, and the next challenge (or the end of the route) is in hand.
      if(s>=this.s(c.endAt)){
        this.scene.setSignal('off');
        if(this.only!==null||this.challenge+1>=this.route.challenges.length){this.ending=true;return}
        this.challenge++;this.released=false;this.stage=this.route.challenges[this.challenge]!.stages[0]!.id;
      }
      return;
    }
    const place=c.place[this.stage]!,pause=place.pause;
    const there=pause.kind==='moving'?s>=this.s(pause.at):car.speed<.05&&s>=this.s(pause.at)-1.2;
    if(!there)return;
    if(place.when){
      const x=this.scene.actor(place.when.actor);
      if(x&&!(x.started&&x.travelled>=this.actorAt(place.when.actor,place.when.at)))return;
    }
    this.phase='paused';
    this.scene.freeze(true);
    const stage=c.stages.find(x=>x.id===this.stage)!;
    this.scene.paused({challenge:c,stage,place,index:this.challenge,of:this.route.challenges.length});
  }

  private actorAt(id:string,p:Vec2):number{
    const key=`${id}@${p.x},${p.z}`;
    let v=this.actorMarks.get(key);
    if(v===undefined){v=along(this.route.actors.find(a=>a.id===id)?.path??[],p);this.actorMarks.set(key,v)}
    return v;
  }
  private readonly actorMarks=new Map<string,number>();

  /** The learner's answer for the paused stage (buttons pressed, in order): judged now. */
  submit(sequence:readonly string[]):StageVerdict{
    const c=this.route.challenges[this.challenge]!;
    if(this.phase!=='paused')throw new Error('Not paused for a decision');
    const history=new Map(this.records.filter(r=>r.challengeId===c.id).map(r=>[r.stageId,r.sequence] as const));
    const verdict=assessStage(c,this.stage,sequence,history);
    this.last={challengeId:c.id,stageId:this.stage,sequence:[...sequence],verdict};
    this.records.push(this.last);
    // The signal shown is the last one chosen (a wrong one stays on: it is what the other road users would see).
    const signal=[...sequence].reverse().map(a=>ACTION_SIGNAL[a]).find(Boolean);
    if(signal)this.scene.setSignal(signal);
    this.phase='submitted';
    return verdict;
  }

  /** Plays on from the last decision. */
  continue():void{
    if(this.phase!=='submitted'||!this.last)return;
    const {verdict}=this.last;
    if(verdict.next==='done')this.released=true;
    else this.stage=verdict.next;
    this.phase='drive';
    this.scene.paused(null);
    this.scene.freeze(false);
  }

  private finish():void{
    this.phase='finished';
    const driven=this.only!==null?[this.route.challenges[this.only]!]:this.route.challenges.slice();
    const result=summarise(driven.map(c=>c.id),this.records.map(r=>({challengeId:r.challengeId,verdict:r.verdict})));
    this.scene.freeze(true);
    this.scene.finished({...result,route:this.route,driven,records:[...this.records],practice:this.only!==null});
  }
}
