import {headingFromDirection,type EventSink,type PassingVehicleActorDef,type Pose,type Seconds,type SimModule} from '../contracts';
import {pointToBox} from '../world/collisions';

export const BODY_SIZE={car:{halfWidth:.9,halfLength:2.15},cyclist:{halfWidth:.3,halfLength:.9}} as const;

/** The learner's car as other road users see it. */
export interface LearnerFootprint{pose:Pose;halfWidth:number;halfLength:number}

/** Gap kept behind the learner's car when this road user has to stop for it. */
const STOP_GAP=3;
/** Braking firmer than this counts as an avoiding response the learner caused (m/s²). */
export const AVOIDING_DECEL=1.5;
const ACCELERATION={car:2.5,cyclist:1.2};
const MAX_DECEL={car:7.5,cyclist:4.5};

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
  }

  get length():number{return this.lengths[this.lengths.length-1]!}

  get size(){return BODY_SIZE[this.def.body]}

  /** Name used in feedback. */
  get name():string{return this.def.name??this.def.id.replace(/-/g,' ')}

  /** True once it has started moving (after its delay). */
  get started():boolean{return this.waited>=this.delay}

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
    if(!this.learner)return Infinity;
    const l=this.learner();
    const {halfWidth,halfLength}=this.size;
    for(let d=0;d<=lookahead;d+=.5){
      const p=this.sample(this.s+halfLength+d).position;
      if(pointToBox(p.x,p.z,l.pose,l.halfWidth,l.halfLength)<halfWidth+.25)return d;
    }
    return Infinity;
  }

  fixedUpdate(dt:Seconds):void{
    if(this.waited<this.delay){this.waited+=dt;return}
    let target=this.cruise;
    if(this.def.yieldsToLearner&&this.learner){
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
    if(target>0)this.speed=Math.min(target,this.speed+ACCELERATION[this.def.body]*dt);
    this.s+=this.speed*dt;
    if(this.s>this.length)this.s=this.def.repeat?0:this.length;
    this.pose=this.sample(this.s);
  }

  reset():void{
    this.s=0;
    this.waited=0;
    this.speed=this.cruise;
    this.braking=false;
    this.harsh=false;
    this.pose=this.sample(0);
  }

  dispose():void{}
}
