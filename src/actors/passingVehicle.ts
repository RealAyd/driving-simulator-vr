import {headingFromDirection,type EventSink,type PassingVehicleActorDef,type Pose,type Seconds,type SimModule} from '../contracts';
import {pointToBox} from '../world/collisions';

export const BODY_SIZE={car:{halfWidth:.9,halfLength:2.15},cyclist:{halfWidth:.3,halfLength:.9},pedestrian:{halfWidth:.3,halfLength:.3}} as const;

/** The learner's car as other road users see it. */
export interface LearnerFootprint{pose:Pose;halfWidth:number;halfLength:number;
  /** Its speed (m/s), for a road user following it. */
  speed?:number}

/** Gap kept behind the learner's car when this road user has to stop for it. */
const STOP_GAP=3;
/** Braking firmer than this counts as an avoiding response the learner caused (m/s²). */
export const AVOIDING_DECEL=1.5;
const ACCELERATION={car:2.5,cyclist:1.2,pedestrian:1.5};
/** A car signals for a turn on its path from this far before it (metres). */
const SIGNAL_AHEAD=35;
/** A turn of more than this in all (radians, 35 degrees) is signalled for. */
const SIGNAL_TURN=.6;
/** Turning faster than this (radians in 6 m: a curve tighter than about 40 m radius) is turning, not a bend. */
const TURNING=.15;
const MAX_DECEL={car:7.5,cyclist:4.5,pedestrian:3};

/**
 * Drives a fixed lane path (an overtaking car, a cyclist). If it yields to the
 * learner, it brakes when the learner's car is in its path ahead and follows
 * or waits behind it, and reports the braking as evidence. It never steers
 * round the learner.
 */
export class PassingVehicle implements SimModule{
  readonly id:string;
  pose:Pose;
  speed:number;
  private s=0;
  private waited=0;
  private delay:number;
  private cruise:number;
  private braking=false;
  private harsh=false;
  private readonly lengths:number[];
  /** Its signal along its path, a metre at a time (cars only). */
  private readonly signalPlan:ReadonlyArray<'left'|'right'|'off'>;
  /** Follows the learner's car when it is ahead on the path (keeping a gap of about a second), rather than only
   * braking for it: a car behind it on a decision route. Set by the app; not part of the scenario file. */
  followsLearner=false;
  /** Drawn (and solid) while waiting to start, not only once moving: a car waiting at a junction. Set by the app. */
  shownWaiting=false;
  /** Its speed held to at most this now (m/s), or null: a decision test paces a road user to meet the learner's car
   * at the moment depicted. Set by the runner. */
  pace:number|null=null;
  /** Other traffic on the roads (background cars): followed when on its path ahead, keeping a gap. Set by the app. */
  traffic:(()=>ReadonlyArray<LearnerFootprint>)|null=null;

  constructor(
    readonly def:PassingVehicleActorDef,
    private readonly learner:(()=>LearnerFootprint)|null=null,
    private readonly events:EventSink|null=null
  ){
    this.id=def.id;
    this.delay=def.delaySeconds;
    this.cruise=def.speed;
    this.speed=def.speed;
    let total=0;
    this.lengths=def.path.map((p,i)=>{
      if(i>0)total+=Math.hypot(p.x-def.path[i-1]!.x,p.z-def.path[i-1]!.z);
      return total;
    });
    this.pose=this.sample(0);
    this.signalPlan=def.body==='car'?this.planSignals():[];
  }

  /**
   * Where it signals: for each turn on its path (a stretch turning one way, more than SIGNAL_TURN in all), from
   * SIGNAL_AHEAD before it until it has turned, the turn before taking precedence where they overlap (two
   * mini-roundabouts, one after the other: the first turn, then the second). A bend in the road is not a turn. Where
   * the scenario says (round a roundabout), as it says.
   */
  private planSignals():Array<'left'|'right'|'off'>{
    const n=Math.floor(this.length)+1,heading=(s:number)=>this.sample(Math.max(0,Math.min(this.length,s))).heading;
    const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
    // Turning this way now: its heading 3 m on against 3 m back.
    const rate=Array.from({length:n},(_,s)=>{const r=wrap(heading(s+3)-heading(s-3));return Math.abs(r)<TURNING?0:Math.sign(r)});
    const plan:Array<'left'|'right'|'off'>=Array.from({length:n},()=>'off');
    let taken=-1;
    for(let a=0;a<n;){
      if(rate[a]===0){a++;continue}
      // (The same way on after a straight metre or three: still the same turn.)
      let b=a;
      for(let k=a+1;k<n&&(rate[k]===rate[a]||(rate[k]===0&&k-b<=3));k++)if(rate[k]===rate[a])b=k;
      const turn=wrap(heading(b+3)-heading(a-3));
      if(Math.abs(turn)>SIGNAL_TURN){
        const side=turn>0?'right':'left';
        for(let s=Math.max(0,a-SIGNAL_AHEAD,taken+1);s<=b;s++)plan[s]=side;
        taken=b;
      }
      a=b+1;
    }
    for(const g of this.def.signals??[]){
      const from=Math.floor(this.along(g.from)),to=Math.ceil(this.along(g.to));
      for(let s=Math.max(0,from);s<=Math.min(n-1,to);s++)plan[s]=g.side;
    }
    return plan;
  }

  /** How far along its path (metres) a point is: where the path comes nearest it. */
  private along(p:{x:number;z:number}):number{
    let best=Infinity,at=0;
    for(let i=1;i<this.def.path.length;i++){
      const a=this.def.path[i-1]!,b=this.def.path[i]!,dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1;
      const k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2));
      const d=Math.hypot(a.x+dx*k-p.x,a.z+dz*k-p.z);
      if(d<best){best=d;at=this.lengths[i-1]!+k*Math.sqrt(l2)}
    }
    return at;
  }

  /** Which way it is signalling now (a car on its way, or waiting to go). */
  get indicating():'left'|'right'|'off'{
    if(!this.present||(this.def.repeat?false:this.s>=this.length))return 'off';
    return this.signalPlan[Math.min(this.signalPlan.length-1,Math.round(this.s))]??'off';
  }

  get length():number{return this.lengths[this.lengths.length-1]!}

  get size(){return BODY_SIZE[this.def.body]}

  /** Name used in feedback. */
  get name():string{return this.def.name??this.def.id.replace(/-/g,' ')}

  /** Metres driven along its path. */
  get travelled():number{return this.s}

  /** The path it drives. */
  get path(){return this.def.path}

  /** True once it has started moving (after its delay). */
  get started():boolean{return this.waited>=this.delay}

  /** Gone once at the end of its path (turned off, out of the way of the traffic behind), rather than left standing
   * there. Set by the app. */
  goneAtEnd=false;

  /** Drawn and solid now: on its way (or at its path's end, unless gone), or waiting where it is shown waiting. */
  get present():boolean{return this.started?!(this.goneAtEnd&&!this.def.repeat&&this.s>=this.length):this.shownWaiting}

  /** Timing for this attempt (variants); takes effect from the next reset. */
  setTiming(delaySeconds:number,speed?:number):void{
    this.delay=delaySeconds;
    this.cruise=speed??this.def.speed;
  }

  private sample(s:number):Pose{
    let i=0;
    while(i<this.def.path.length-2&&this.lengths[i+1]!<s)i++;
    const a=this.def.path[i]!,b=this.def.path[i+1]!;
    const seg=this.lengths[i+1]!-this.lengths[i]!||1;
    const k=Math.max(0,Math.min(1,(s-this.lengths[i]!)/seg));
    return {position:{x:a.x+(b.x-a.x)*k,y:0,z:a.z+(b.z-a.z)*k},heading:headingFromDirection({x:b.x-a.x,z:b.z-a.z})};
  }

  /** Free distance ahead along the path before the learner's car, or Infinity. */
  gapToLearner(lookahead=45):number{
    return this.learner?this.gapTo(this.learner(),lookahead):Infinity;
  }

  /** Free distance ahead along the path before a road user, or Infinity. */
  private gapTo(l:LearnerFootprint,lookahead=45):number{
    const {halfWidth,halfLength}=this.size;
    if(Math.hypot(l.pose.position.x-this.pose.position.x,l.pose.position.z-this.pose.position.z)>lookahead+halfLength+l.halfLength+2)return Infinity;
    for(let d=0;d<=lookahead;d+=.5){
      const p=this.sample(this.s+halfLength+d).position;
      if(pointToBox(p.x,p.z,l.pose,l.halfWidth,l.halfLength)<halfWidth+.25)return d;
    }
    return Infinity;
  }

  fixedUpdate(dt:Seconds):void{
    if(this.waited<this.delay){this.waited+=dt;return}
    let target=this.pace===null?this.cruise:Math.min(this.cruise,this.pace);
    if(this.speed>target)this.speed=Math.max(target,this.speed-1.5*dt);
    if(this.def.yieldsToLearner&&this.learner&&this.followsLearner){
      const gap=this.gapToLearner();
      if(gap<Infinity){
        const ahead=Math.max(0,this.learner().speed??0);
        target=Math.max(0,Math.min(this.cruise,ahead+.6*(gap-STOP_GAP-1.2*ahead)));
        if(this.speed>target)this.speed=Math.max(target,this.speed-Math.min(MAX_DECEL[this.def.body],Math.max(1.5,(this.speed-target)*2))*dt);
      }
    }else if(this.def.yieldsToLearner&&this.learner){
      const gap=this.gapToLearner();
      // Deceleration needed to stop STOP_GAP short of the learner's car.
      const need=gap<Infinity?this.speed*this.speed/(2*Math.max(gap-STOP_GAP,.1)):0;
      if(need>.3||gap<STOP_GAP+.5){
        target=0;
        const decel=Math.min(MAX_DECEL[this.def.body],Math.max(need,1));
        this.speed=Math.max(0,this.speed-decel*dt);
        if(need>=AVOIDING_DECEL&&!this.braking){
          this.braking=true;
          this.events?.emit('actor.avoiding',{actorId:this.id,requiredDecel:+need.toFixed(2),gap:+gap.toFixed(1),speed:+this.speed.toFixed(1)});
        }
        if(need>=MAX_DECEL[this.def.body]*.6&&!this.harsh){
          this.harsh=true;
          this.events?.emit('actor.avoiding',{actorId:this.id,requiredDecel:+need.toFixed(2),gap:+gap.toFixed(1),speed:+this.speed.toFixed(1),harsh:true});
        }
      }else if(gap===Infinity){
        this.braking=false;
        this.harsh=false;
      }
    }
    // Background traffic ahead on its path: followed with a gap, as the learner is.
    for(const o of this.traffic?.()??[]){
      const gap=this.gapTo(o);
      if(gap===Infinity)continue;
      const lead=Math.max(0,o.speed??0),want=Math.max(0,Math.min(this.cruise,lead+.6*(gap-STOP_GAP-1.2*lead)));
      if(want<target){
        target=want;
        if(this.speed>target)this.speed=Math.max(target,this.speed-Math.min(MAX_DECEL[this.def.body],Math.max(1.5,(this.speed-target)*2))*dt);
      }
    }
    if(target>0&&this.speed<target)this.speed=Math.min(target,this.speed+ACCELERATION[this.def.body]*dt);
    this.s+=this.speed*dt;
    if(this.s>this.length)this.s=this.def.repeat?0:this.length;
    this.pose=this.sample(this.s);
  }

  reset():void{
    this.s=0;
    this.pace=null;
    this.waited=0;
    this.speed=this.cruise;
    this.braking=false;
    this.harsh=false;
    this.pose=this.sample(0);
  }

  dispose():void{}
}
