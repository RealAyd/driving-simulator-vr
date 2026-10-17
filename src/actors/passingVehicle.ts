import {headingFromDirection,type PassingVehicleActorDef,type Pose,type Seconds,type SimModule} from '../contracts';

export const BODY_SIZE={car:{halfWidth:.9,halfLength:2.15},cyclist:{halfWidth:.3,halfLength:.9}} as const;

/**
 * Drives a fixed lane path at constant speed (an overtaking car, a cyclist
 * filtering past). Scripted and repeatable so mirror and blind-spot views
 * can be checked; it does not react to the learner.
 */
export class PassingVehicle implements SimModule{
  readonly id:string;
  pose:Pose;
  private s=0;
  private waited=0;
  private readonly lengths:number[];

  constructor(readonly def:PassingVehicleActorDef){
    this.id=def.id;
    let total=0;
    this.lengths=def.path.map((p,i)=>{
      if(i>0)total+=Math.hypot(p.x-def.path[i-1]!.x,p.z-def.path[i-1]!.z);
      return total;
    });
    this.pose=this.sample(0);
  }

  get length():number{return this.lengths[this.lengths.length-1]!}

  get size(){return BODY_SIZE[this.def.body]}

  private sample(s:number):Pose{
    let i=0;
    while(i<this.def.path.length-2&&this.lengths[i+1]!<s)i++;
    const a=this.def.path[i]!,b=this.def.path[i+1]!;
    const seg=this.lengths[i+1]!-this.lengths[i]!||1;
    const k=Math.max(0,Math.min(1,(s-this.lengths[i]!)/seg));
    return {position:{x:a.x+(b.x-a.x)*k,y:0,z:a.z+(b.z-a.z)*k},heading:headingFromDirection({x:b.x-a.x,z:b.z-a.z})};
  }

  fixedUpdate(dt:Seconds):void{
    if(this.waited<this.def.delaySeconds){this.waited+=dt;return}
    this.s+=this.def.speed*dt;
    if(this.s>this.length)this.s=this.def.repeat?0:this.length;
    this.pose=this.sample(this.s);
  }

  reset():void{
    this.s=0;
    this.waited=0;
    this.pose=this.sample(0);
  }

  dispose():void{}
}
