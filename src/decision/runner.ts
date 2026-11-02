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
  /** Its speed held to at most this now (m/s), or null: paced to meet the car at the moment depicted. */
  pace?:number|null;
  /** Seen waiting at the start of its path before it moves (set while its challenge is in hand). */
  shownWaiting?:boolean;
  readonly speed?:number;
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
  /** Background traffic (where each is now): the car keeps back from any ahead on its way, as from the route's own. */
  traffic?():ReadonlyArray<{x:number;z:number}>;
  /** Traffic lights (each stop line's lane, the heading it stops and its aspect): the car stops at red, and at amber
   * when it can. */
  signals?():ReadonlyArray<{lane:{x:number;z:number};heading:number;state:string}>;
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
/** Background traffic keeps out of a challenge's quiet circles from this far (path metres) before its direction is
 * given until the car is past it. */
const QUIET_BEFORE=150;
/** The test can end with the car pulled up this far short of the route's end (path metres). */
const END_REACH=60;
/** A road user paced to meet the car eases down to no less than this share of its speed; and reaches its point this
 * long (seconds) after the car is stopped at the line. */
const PACE_LEAST=.4,PACE_MARGIN=.6;
/** Longest wait at a line for background traffic ahead to clear the junction before the scene stops (seconds). */
const CLEARING=6;

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
    this.phase='drive';this.released=false;this.said=-1;this.clearing=0;this.endWait=0;this.started.clear();this.records.length=0;this.last=null;this.ending=false;
    for(const a of this.route.actors){const x=this.scene.actor(a.id);if(x){x.setTiming(1e9);x.reset()}}
    this.assist.setPath(this.path);
    this.showWaiting();
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
    // Road users ahead on the way: the route's own, and background traffic.
    const ahead:Array<{x:number;z:number}>=[];
    for(const a of this.route.actors){const x=this.scene.actor(a.id);if(x?.started)ahead.push(x.pose.position)}
    for(const q of this.scene.traffic?.()??[])if(Math.hypot(q.x-car.x,q.z-car.z)<50)ahead.push(q);
    for(const q of ahead){
      for(let d=HALF_LENGTH;d<=45;d+=1.5){
        const p=this.assist.pointAt(s+d);
        if(Math.hypot(p.x-q.x,p.z-q.z)<2.2){v=Math.min(v,Math.sqrt(2*BRAKING*Math.max(0,d-FOLLOW)));break}
      }
    }
    // Traffic lights on the way: stopped for at red (and red and amber), and at amber unless too close to stop.
    for(const st of this.scene.signals?.()??[]){
      if(st.state==='green'||Math.cos(st.heading-car.heading)<.8)continue;
      for(let d=0;d<=60;d+=1.5){
        const p=this.assist.pointAt(s+d);
        if(Math.hypot(p.x-st.lane.x,p.z-st.lane.z)>2.5)continue;
        const room=d-HALF_LENGTH-1;
        if(!(st.state==='amber'&&room<car.speed*car.speed/6+1))v=Math.min(v,Math.sqrt(2*BRAKING*Math.max(0,room)));
        break;
      }
    }
    const want=(v-car.speed)*2.5;
    if(v<.05&&car.speed<.6)return {throttle:0,brake:1,steer};
    return want>=0?{throttle:Math.min(1,want/2.4+.04),brake:0,steer}:{throttle:0,brake:Math.min(1,Math.max(0,(-want-.35)/7.5)),steer};
  }

  /**
   * The road user a stage waits for, paced so it reaches its point no sooner than the car reaches the line (held up on
   * the way, by traffic ahead, the car would otherwise find it already gone by): eased down to as little as PACE_LEAST
   * of its speed, never stopped. Free again once the moment has come.
   */
  private paceFor(c:ChallengeDef,s:number,speed:number):void{
    for(const a of this.route.actors){const x=this.scene.actor(a.id);if(x&&'pace' in x)x.pace=null}
    if(this.released)return;
    const place=c.place[this.stage];
    if(!place?.when||place.pause.kind!=='stop')return;
    const x=this.scene.actor(place.when.actor),def=this.route.actors.find(a=>a.id===place.when!.actor);
    if(!x?.started||!def||!('pace' in x))return;
    const left=this.actorAt(def.id,place.when.at)-x.travelled,d=Math.max(0,this.s(place.pause.at)-s);
    if(left<=0)return;
    // When the car is stopped at the line: braking gently (BRAKING) from where it is, at its speed now.
    const v=Math.max(speed,2),brake=v*v/(2*BRAKING);
    const eta=d<=brake?2*d/v:(d-brake)/v+v/BRAKING;
    x.pace=Math.max(def.speed*PACE_LEAST,Math.min(def.speed,left/(eta+PACE_MARGIN)));
  }

  /** Once a simulation step (after the car and the road users have moved). */
  update():void{
    if(this.phase!=='drive')return;
    const car=this.scene.car(),s=this.carS();
    {const c=this.route.challenges[this.challenge];if(c&&!this.ending)this.paceFor(c,s,car.speed)}
    this.showWaiting();
    // At the end of the route: pulled up at its end, or stood a moment short of it (behind traffic there).
    if(this.ending){
      this.endWait=car.speed<.05?this.endWait+1/60:0;
      if(car.speed<.05&&(s>=this.assist.length-13||s>=this.assist.length-END_REACH&&this.endWait>2))this.finish();
      return;
    }
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
    // Stopped at a line: background traffic ahead in the junction (a car the learner followed in, going on through)
    // is let clear first, for a few seconds at most. (Not where the moment is set by a road user's position.)
    if(pause.kind==='stop'&&!place.when&&this.clearing<CLEARING&&this.trafficAhead(c)){this.clearing+=1/60;return}
    this.clearing=0;
    this.phase='paused';
    this.scene.freeze(true);
    const stage=c.stages.find(x=>x.id===this.stage)!;
    this.scene.paused({challenge:c,stage,place,index:this.challenge,of:this.route.challenges.length});
  }

  /** Background traffic in the challenge's quiet circles ahead of the car (not queued behind it). */
  private trafficAhead(c:ChallengeDef):boolean{
    const car=this.scene.car(),fx=Math.sin(car.heading),fz=-Math.cos(car.heading);
    return (this.scene.traffic?.()??[]).some(q=>(q.x-car.x)*fx+(q.z-car.z)*fz>3&&c.quiet.some(z=>Math.hypot(q.x-z.x,q.z-z.z)<z.radius));
  }
  private clearing=0;
  private endWait=0;

  private actorAt(id:string,p:Vec2):number{
    const key=`${id}@${p.x},${p.z}`;
    let v=this.actorMarks.get(key);
    if(v===undefined){v=along(this.route.actors.find(a=>a.id===id)?.path??[],p);this.actorMarks.set(key,v)}
    return v;
  }
  private readonly actorMarks=new Map<string,number>();

  /** Where background traffic keeps out now: the quiet circles of each challenge in hand (from a little before its
   * direction is given until the car is past it). */
  keepClear():Array<{x:number;z:number;radius:number}>{
    if(this.phase==='finished')return [];
    const out:Array<{x:number;z:number;radius:number}>=[];
    for(const c of this.inHand())out.push(...c.quiet);
    return out;
  }

  /** The challenges in hand: from a little before each direction is given until the car is past it. */
  private inHand():ChallengeDef[]{
    const s=this.carS(),list=this.only!==null?[this.route.challenges[this.only]!]:this.route.challenges;
    return list.filter(c=>s>=this.s(c.instructAt)-QUIET_BEFORE&&s<=this.s(c.endAt)+5);
  }

  /** A road user seen waiting (a car at a junction) is there only while its challenge is in hand: from out of the
   * learner's sight, while the junction is kept clear (traffic going by it before then would have to get past it). */
  private showWaiting():void{
    const shown=new Set(this.inHand().flatMap(c=>c.starts.map(st=>st.actor)));
    for(const a of this.route.actors){
      const x=this.scene.actor(a.id);
      if(x&&a.waits&&'shownWaiting' in x)x.shownWaiting=shown.has(a.id);
    }
  }

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
