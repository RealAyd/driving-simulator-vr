import {forwardFromHeading,headingDelta,type FollowingVehicleActorDef,type Pose,type Seconds,type SimModule} from '../contracts';

interface TrailPoint{x:number;z:number;heading:number;s:number}

export const FOLLOWER_HALF_LENGTH=2.15;
export const FOLLOWER_HALF_WIDTH=.9;
const CAR_LENGTH=4.3;
const MAX_ACCEL=1.5;
const COMFORT_DECEL=2.5;
const MAX_DECEL=8;
const MIN_GAP=3;
const TRAIL_SPACING=.25;

/**
 * A car that follows the learner along the learner's own driven path,
 * keeping a gap with the Intelligent Driver Model. It waits until the
 * learner has moved off, then holds its distance and stops behind it.
 * It reads the learner's pose; it never moves the learner.
 */
export class FollowingVehicle implements SimModule{
  readonly id:string;
  speed=0;
  pose:Pose;
  private trail:TrailPoint[]=[];
  private learnerS=0;
  private s=0;
  private last:Pose;
  private started=false;

  constructor(readonly def:FollowingVehicleActorDef,private readonly learner:()=>Pose,private readonly learnerSpeed:()=>number){
    this.id=def.id;
    this.last=learner();
    this.pose=this.last;
    this.reset();
  }

  /** Straight trail behind the learner's start so the follower has a path. */
  private seedTrail(start:Pose):void{
    const f=forwardFromHeading(start.heading);
    this.trail=[];
    for(let s=-this.def.startBehind-20;s<=0;s+=1)
      this.trail.push({x:start.position.x+f.x*s,z:start.position.z+f.z*s,heading:start.heading,s});
  }

  private record(p:Pose):void{
    const last=this.trail[this.trail.length-1]!;
    const d=Math.hypot(p.position.x-this.last.position.x,p.position.z-this.last.position.z);
    this.learnerS+=d;
    this.last=p;
    if(this.learnerS-last.s>=TRAIL_SPACING)
      this.trail.push({x:p.position.x,z:p.position.z,heading:p.heading,s:this.learnerS});
    // Drop trail far behind the follower.
    while(this.trail.length>2&&this.trail[1]!.s<this.s-5)this.trail.shift();
  }

  private sample(s:number):Pose{
    const t=this.trail;
    let i=t.length-2;
    while(i>0&&t[i]!.s>s)i--;
    const a=t[Math.max(0,i)]!,b=t[Math.min(t.length-1,i+1)]!;
    const k=b.s===a.s?0:Math.min(1,Math.max(0,(s-a.s)/(b.s-a.s)));
    return {
      position:{x:a.x+(b.x-a.x)*k,y:0,z:a.z+(b.z-a.z)*k},
      heading:a.heading+headingDelta(b.heading,a.heading)*k
    };
  }

  get gap():number{
    return this.learnerS-this.s-CAR_LENGTH;
  }

  fixedUpdate(dt:Seconds):void{
    this.record(this.learner());
    if(!this.started&&this.learnerS>2)this.started=true;
    if(this.started){
      const leaderSpeed=this.learnerSpeed();
      const gap=Math.max(.01,this.gap);
      const v=this.speed,v0=this.def.desiredSpeed;
      const desiredGap=MIN_GAP+v*this.def.headway+v*(v-leaderSpeed)/(2*Math.sqrt(MAX_ACCEL*COMFORT_DECEL));
      let accel=MAX_ACCEL*(1-Math.pow(v/v0,4)-Math.pow(Math.max(MIN_GAP,desiredGap)/gap,2));
      accel=Math.max(-MAX_DECEL,accel);
      this.speed=Math.max(0,v+accel*dt);
      if(this.gap<=.5)this.speed=0;
      this.s=Math.min(this.s+this.speed*dt,this.learnerS-CAR_LENGTH-.5);
    }
    this.pose=this.sample(this.s);
  }

  reset():void{
    const start=this.learner();
    this.last=start;
    this.learnerS=0;
    this.s=-this.def.startBehind;
    this.speed=0;
    this.started=false;
    this.seedTrail(start);
    this.pose=this.sample(this.s);
  }

  dispose():void{}
}
