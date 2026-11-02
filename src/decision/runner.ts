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
  /** Background traffic (where each is now, and which way and how fast it is going): the car keeps back from any
   * ahead on its way, as from the route's own, and gives way to any on or coming on to a junction it drives through. */
  traffic?():ReadonlyArray<{id:string;x:number;z:number;heading:number;speed:number;halfWidth?:number;halfLength?:number}>;
  /** Waves on a background road user the car has stood waiting for a while (each waiting for the other). */
  waveOn?(id:string):void;
  /** The junctions on the place's roads (mini-roundabouts and roundabouts, as discs). */
  junctions?():ReadonlyArray<{x:number;z:number;radius:number}>;
  /** Traffic lights (each stop line's lane, the heading it stops and its aspect): the car stops at red, and at amber
   * when it can. */
  signals?():ReadonlyArray<{lane:{x:number;z:number};heading:number;state:string}>;
  /** Holds the lights at a stop line (near `at`) green for the car, or releases the hold (null). */
  holdLights?(at:Vec2|null):void;
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
/** A road user standing on a junction this long (seconds) is waiting for the car: the car goes. */
const STANDING_WAITS=4;
/** Stood this long (seconds) held by one background road user, the car waves it on. */
const WAVE_AFTER=8;
/** On the way back, the junctions within this far ahead (metres) are kept clear. */
const RETURN_CLEAR=90;
/** Practising one challenge, the car pulls up this far past it (metres). */
const PRACTICE_RUNOUT=30;
/** The test can end with the car pulled up this far short of the route's end (path metres). */
const END_REACH=60;
/** A road user paced to meet the car eases down to no less than this share of its speed; and reaches its point this
 * long (seconds) after the car is stopped at the line. */
const PACE_LEAST=.4,PACE_MARGIN=.6;
/** A pedestrian may be paced down further: people dawdle (a share of their speed). */
const PACE_LEAST_ON_FOOT=.15;
/** The car's half-width (metres). */
const HALF_WIDTH=.9;
/** Stopped this far short of where the car would touch background traffic ahead (metres, along its way). */
const TRAFFIC_GAP=3.5;
/** And kept at least this far from it sideways (metres, beyond a quarter-metre allowance on the car's width). */
const TRAFFIC_MARGIN=.3;

type Box={x:number;z:number;heading:number;halfWidth:number;halfLength:number};
/** Roughly how far apart two boxes are (metres; 0 or less: they touch), from each one's corners and side middles. */
function boxGap(a:Box,b:Box):number{
  const pts=(c:Box)=>{const fx=Math.sin(c.heading),fz=-Math.cos(c.heading),rx=-fz,rz=fx;
    return [-1,0,1].flatMap(i=>[-1,1].map(j=>({x:c.x+fx*i*c.halfLength+rx*j*c.halfWidth,z:c.z+fz*i*c.halfLength+rz*j*c.halfWidth})))};
  const out=(p:{x:number;z:number},c:Box)=>{const dx=p.x-c.x,dz=p.z-c.z,fx=Math.sin(c.heading),fz=-Math.cos(c.heading);
    return Math.max(Math.abs(dx*fx+dz*fz)-c.halfLength,Math.abs(dx*fz-dz*fx)-c.halfWidth)};
  return Math.min(...pts(a).map(p=>out(p,b)),...pts(b).map(p=>out(p,a)));
}
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
  /** Diagnostics: what last held the car to its speed (a bend, a stop, a road user, traffic, a junction, lights). */
  heldBy='';
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
    this.phase='drive';this.released=false;this.said=-1;this.clearing=0;this.handAt=null;this.endWait=0;this.started.clear();this.records.length=0;this.last=null;this.ending=false;
    for(const a of this.route.actors){const x=this.scene.actor(a.id);if(x){x.setTiming(1e9);x.reset()}}
    this.assist.setPath(this.path);
    this.showWaiting();
    this.heldKey='-';this.holdLights();
    this.scene.setSignal('off');
    this.scene.freeze(false);
    this.scene.paused(null);
  }

  private carS():number{const c=this.scene.car();return this.assist.progress(c.x,c.z)}

  /** Where the drive ends (path metres): the route's end; practising one challenge, a little past it. */
  private endS():number{
    const full=this.assist.length-12;
    return this.only===null?full:Math.min(full,this.s(this.route.challenges[this.only]!.endAt)+PRACTICE_RUNOUT);
  }

  /** The stop the car is held at for the challenge in hand (its middle, path metres), if any. */
  private stopAt():number|null{
    if(this.ending)return this.endS();
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
    // (What holds the car to its speed now: diagnostics.)
    this.heldBy='';
    const lim=(now:number,cap:number,why:string)=>{if(cap<now){this.heldBy=why;return cap}return now};
    // Bends ahead: slow enough to follow each, braking gently to it.
    for(let d=0;d<=50;d+=2){
      const k=Math.abs(this.assist.turnBetween(s+d,s+d+6))/6;
      if(k>1e-3)v=lim(v,Math.sqrt(LATERAL/k+2*BRAKING*d),'bend');
    }
    const stop=this.stopAt();
    if(stop!==null)v=lim(v,Math.sqrt(2*BRAKING*Math.max(0,stop-s-.2)),'stop');
    // Road users ahead on the way: the route's own (by where they are), and background traffic (by its outline: one
    // alongside, cutting in or turning across is kept clear of too).
    for(const a of this.route.actors){
      const x=this.scene.actor(a.id);
      if(!x?.started)continue;
      const q=x.pose.position;
      for(let d=HALF_LENGTH;d<=45;d+=1.5){
        const p=this.assist.pointAt(s+d);
        if(Math.hypot(p.x-q.x,p.z-q.z)<2.2){v=lim(v,Math.sqrt(2*BRAKING*Math.max(0,d-FOLLOW)),'road user');break}
      }
    }
    for(const q of this.scene.traffic?.()??[]){
      if(Math.hypot(q.x-car.x,q.z-car.z)>50)continue;
      // (Where it is, and where it will be in a second.)
      const other={x:q.x,z:q.z,heading:q.heading,halfWidth:q.halfWidth??.9,halfLength:q.halfLength??2.2};
      const soon={...other,x:q.x+Math.sin(q.heading)*q.speed,z:q.z-Math.cos(q.heading)*q.speed};
      for(let d=0;d<=45;d+=1.5){
        const p=this.assist.pointAt(s+d),r=this.assist.pointAt(s+d+1);
        const me={x:p.x,z:p.z,heading:Math.atan2(r.x-p.x,-(r.z-p.z)),halfWidth:HALF_WIDTH+.25,halfLength:HALF_LENGTH};
        if(Math.min(boxGap(me,other),boxGap(me,soon))<TRAFFIC_MARGIN){
          // (Stopped a car's length short of where it would touch; at once, where it already nearly does.)
          v=lim(v,Math.sqrt(2*BRAKING*Math.max(0,d-TRAFFIC_GAP)),`traffic ${q.id}`);
          break;
        }
      }
    }
    // A mini-roundabout or roundabout on the way (one the car is not already on): given way to traffic on it, or coming
    // on to it, before going on. (One standing on it a while is waiting for the car, so is not waited for.)
    for(const j of this.scene.junctions?.()??[]){
      if(Math.hypot(car.x-j.x,car.z-j.z)<j.radius+2)continue;
      let at=-1;
      for(let d=0;d<=40;d+=1.5){const p=this.assist.pointAt(s+d);if(Math.hypot(p.x-j.x,p.z-j.z)<j.radius+1){at=d;break}}
      if(at<0)continue;
      const busy=(this.scene.traffic?.()??[]).find(q=>{
        const d=Math.hypot(q.x-j.x,q.z-j.z);
        if(d<j.radius+1.5)return (this.standing.get(q.id)??0)<STANDING_WAITS;
        return d<j.radius+12&&q.speed>.5&&(Math.sin(q.heading)*(j.x-q.x)-Math.cos(q.heading)*(j.z-q.z))/d>.5;
      });
      if(busy)v=lim(v,Math.sqrt(2*BRAKING*Math.max(0,at-HALF_LENGTH-1)),`junction busy (${busy.id})`);
    }
    // Traffic lights on the way: stopped for at red (and red and amber), and at amber unless too close to stop.
    for(const st of this.scene.signals?.()??[]){
      if(st.state==='green'||Math.cos(st.heading-car.heading)<.8)continue;
      for(let d=0;d<=60;d+=1.5){
        const p=this.assist.pointAt(s+d);
        if(Math.hypot(p.x-st.lane.x,p.z-st.lane.z)>2.5)continue;
        const room=d-HALF_LENGTH-1;
        if(!(st.state==='amber'&&room<car.speed*car.speed/6+1))v=lim(v,Math.sqrt(2*BRAKING*Math.max(0,room)),'lights');
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
  private paceFor(c:ChallengeDef,stage:string,s:number,speed:number):void{
    const place=c.place[stage];
    if(!place?.when)return;
    const x=this.scene.actor(place.when.actor),def=this.route.actors.find(a=>a.id===place.when!.actor);
    if(!x?.started||!def||!('pace' in x))return;
    const left=this.actorAt(def.id,place.when.at)-x.travelled,d=Math.max(0,this.s(place.pause.at)-s);
    if(left<=0)return;
    // When the car is there: on the move, at its speed now; stopping at a line, braking gently (BRAKING) to it.
    const v=Math.max(speed,2),brake=v*v/(2*BRAKING);
    const eta=place.pause.kind==='moving'?d/v:d<=brake?2*d/v:(d-brake)/v+v/BRAKING;
    x.pace=Math.max(def.speed*(def.kind==='pedestrian'?PACE_LEAST_ON_FOOT:PACE_LEAST),Math.min(def.speed,left/(eta+PACE_MARGIN)));
  }

  private heldWho='';
  private heldFor=0;
  /** Seconds each background road user has stood still (one standing on a junction a while is waiting for the car). */
  private readonly standing=new Map<string,number>();

  /** Once a simulation step (after the car and the road users have moved). */
  update():void{
    if(this.phase!=='drive')return;
    for(const q of this.scene.traffic?.()??[])this.standing.set(q.id,q.speed<.3?(this.standing.get(q.id)??0)+1/60:0);
    // Stood a while for one background road user, in the way or on the junction ahead (waiting, it may be, for the
    // car): it is waved on.
    {
      const by=this.heldBy.match(/^traffic (\S+)$|^junction busy \((\S+)\)$/)?.slice(1).find(Boolean)??'',car0=this.scene.car();
      this.heldFor=by&&by===this.heldWho&&car0.speed<.1?this.heldFor+1/60:0;this.heldWho=by;
      if(by&&this.heldFor>WAVE_AFTER){this.scene.waveOn?.(by);this.heldFor=0}
    }
    const car=this.scene.car(),s=this.carS();
    // Paced: the road user the stage in hand waits for, and that of the next challenge's first stage (already on its
    // way while this one finishes).
    for(const a of this.route.actors){const x=this.scene.actor(a.id);if(x&&'pace' in x)x.pace=null}
    if(!this.ending){
      const c=this.route.challenges[this.challenge];
      if(c&&!this.released)this.paceFor(c,this.stage,s,car.speed);
      for(const n of this.inHand())if(this.route.challenges.indexOf(n)>this.challenge)this.paceFor(n,n.stages[0]!.id,s,car.speed);
    }
    this.showWaiting();
    this.holdLights();
    // At the end of the route: pulled up at its end, or stood a moment short of it (behind traffic there).
    if(this.ending){
      this.endWait=car.speed<.05?this.endWait+1/60:0;
      const end=this.endS();
      if(car.speed<.05&&(s>=end-1||s>=end-END_REACH&&this.endWait>2))this.finish();
      return;
    }
    const c=this.route.challenges[this.challenge];
    if(!c){this.ending=true;return}
    if(this.said<this.challenge&&s>=this.s(c.instructAt)){this.said=this.challenge;this.scene.say(c.instruction)}
    // Road users set going: the challenge's, and those of the next one in hand (already on their way while this one
    // finishes, where junctions come close together).
    for(const ch of new Set([c,...this.inHand()]))for(const st of ch.starts){
      const key=`${ch.id}/${st.actor}`;
      if(!this.started.has(key)&&s>=this.s(st.at)){
        // (Not on top of background traffic at the start of its way: it sets off once the spot is clear.)
        const from=this.route.actors.find(a=>a.id===st.actor)?.path[0];
        if(from&&!this.route.actors.find(a=>a.id===st.actor)?.waits&&(this.scene.traffic?.()??[]).some(q=>Math.hypot(q.x-from.x,q.z-from.z)<8))continue;
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
  keepClear():ReadonlyArray<{x:number;z:number;radius:number}>{
    if(this.phase==='finished')return [];
    if(this.ending)return this.nextJunctions();
    return this.inHand().flatMap(c=>c.quiet);
  }

  /** On the way back after the last challenge, the junctions just ahead are kept clear (the drive back is not part of
   * the test: it must not stick in a busy junction). Worked out once a step. */
  private nextJunctions():ReadonlyArray<{x:number;z:number;radius:number}>{
    const car=this.scene.car();
    if(this.nextAt&&this.nextAt.x===car.x&&this.nextAt.z===car.z)return this.next;
    this.nextAt={x:car.x,z:car.z};
    const s=this.carS(),out:Array<{x:number;z:number;radius:number}>=[];
    for(const j of this.scene.junctions?.()??[])for(let d=0;d<=RETURN_CLEAR;d+=3){
      const p=this.assist.pointAt(s+d);
      if(Math.hypot(p.x-j.x,p.z-j.z)<j.radius+2){out.push({x:j.x,z:j.z,radius:j.radius+10});break}
    }
    return this.next=out;
  }
  private next:ReadonlyArray<{x:number;z:number;radius:number}>=[];
  private nextAt:{x:number;z:number}|null=null;

  /** The challenges in hand: from a little before each direction is given until the car is past it. (Worked out once
   * a step: traffic asks often.) */
  private inHand():ChallengeDef[]{
    const car=this.scene.car();
    if(this.handAt&&this.handAt.x===car.x&&this.handAt.z===car.z)return this.hand;
    const s=this.carS(),list=this.only!==null?[this.route.challenges[this.only]!]:this.route.challenges;
    this.handAt={x:car.x,z:car.z};
    return this.hand=list.filter(c=>s>=this.s(c.instructAt)-QUIET_BEFORE&&s<=this.s(c.endAt)+5);
  }
  private hand:ChallengeDef[]=[];
  private handAt:{x:number;z:number}|null=null;

  /** The lights of a challenge in hand held green for the car (released once it is past). */
  private holdLights():void{
    const at=this.phase==='finished'?null:this.inHand().find(c=>c.lights)?.lights??null;
    const key=at?`${at.x},${at.z}`:'';
    if(key===this.heldKey)return;
    this.heldKey=key;
    this.scene.holdLights?.(at);
  }
  private heldKey='';

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
    this.holdLights();
    const driven=this.only!==null?[this.route.challenges[this.only]!]:this.route.challenges.slice();
    const result=summarise(driven.map(c=>c.id),this.records.map(r=>({challengeId:r.challengeId,verdict:r.verdict})));
    this.scene.freeze(true);
    this.scene.finished({...result,route:this.route,driven,records:[...this.records],practice:this.only!==null});
  }
}
