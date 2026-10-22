import {headingDelta,type Pose,type Vec2} from '../contracts';
import {steerLimit,type VehicleParams} from './kinematics';

/**
 * Optional steering assistance: pure-pursuit path following along a lane
 * path, so a learner on a touchscreen can concentrate on observation, speed
 * and decisions. It only proposes a steering input; the driver's own
 * steering always overrides it, and its use is recorded in the results.
 */
export class SteeringAssist{
  private lengths:number[]=[];

  constructor(private path:Vec2[],private readonly params:VehicleParams){
    this.setPath(path);
  }

  /** Follow a different path from here on (a mock test route planned again after a wrong turn). */
  setPath(path:Vec2[]):void{
    this.path=path;
    this.last=null;
    let s=0;
    this.lengths=path.map((p,i)=>{
      if(i>0)s+=Math.hypot(p.x-path[i-1]!.x,p.z-path[i-1]!.z);
      return s;
    });
  }

  /** The path's length (metres). */
  get length():number{return this.lengths.at(-1)??0}

  /** Where the car was last found along the path (a route can pass the same road twice, once each way). */
  private last:number|null=null;

  /**
   * Distance along the path of the point closest to (x, z): searched a little behind and ahead of where the car
   * was last, so a route that comes back along the same street (the other way) is not mistaken for the part being
   * driven. Anywhere further (a reset, or well off the path) searches the whole path.
   */
  progress(x:number,z:number):number{
    const near=this.last===null?null:this.nearest(x,z,this.last-15,this.last+40);
    const found=near&&near.d<8?near:this.nearest(x,z,-Infinity,Infinity,1.5);
    this.last=found.at;
    return found.at;
  }

  /** Nearest point between `from` and `to` along the path; with `earliest`, the first part of the path that comes
   * within that many metres of the nearest (where a route comes back the same way, the part driven first). */
  private nearest(x:number,z:number,from:number,to:number,earliest=0){
    let best=Infinity,at=0;
    for(let i=0;i<this.path.length-1;i++){
      if(this.lengths[i+1]!<from||this.lengths[i]!>to)continue;
      const a=this.path[i]!,b=this.path[i+1]!;
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
      // The last segment runs on past its end, so progress keeps growing there.
      const last=i===this.path.length-2;
      const t=Math.max(0,Math.min(last?Infinity:len,((x-a.x)*dx+(z-a.z)*dz)/len));
      const d=Math.hypot(a.x+dx/len*t-x,a.z+dz/len*t-z);
      if(d<best-earliest){best=d;at=this.lengths[i]!+t}
    }
    return {at,d:best};
  }

  /**
   * Point on the path at distance s. Beyond the end it continues along the
   * last segment, so the target never falls behind the car and the assist
   * never tries to turn it round.
   */
  pointAt(s:number):Vec2{
    const total=this.lengths[this.lengths.length-1]!;
    const target=Math.max(0,s);
    let i=0;
    while(i<this.path.length-2&&this.lengths[i+1]!<Math.min(target,total))i++;
    const a=this.path[i]!,b=this.path[i+1]!;
    const seg=this.lengths[i+1]!-this.lengths[i]!||1;
    const k=(target-this.lengths[i]!)/seg;
    return {x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k};
  }

  /** Direction of travel along the path nearest to (x, z), as a heading (radians). */
  headingAt(x:number,z:number):number{
    const s=this.progress(x,z);
    const a=this.pointAt(s-1),b=this.pointAt(s+1);
    return Math.atan2(b.x-a.x,-(b.z-a.z));
  }

  /** Normalised steering input (-1 left … +1 right) for the current pose and speed. */
  steer(pose:Pose,speed:number):number{
    if(speed<.3)return 0;
    const lookahead=Math.min(15,Math.max(4,4+.6*speed));
    const target=this.pointAt(this.progress(pose.position.x,pose.position.z)+lookahead);
    const dx=target.x-pose.position.x,dz=target.z-pose.position.z;
    const alpha=headingDelta(Math.atan2(dx,-dz),pose.heading);
    // Path behind or beside the car (gone past a turn): full lock towards it rather than sin(alpha), which fades out.
    if(Math.abs(alpha)>Math.PI/2)return Math.sign(alpha);
    const wheel=Math.atan(2*this.params.wheelbase*Math.sin(alpha)/lookahead);
    return Math.max(-1,Math.min(1,wheel/steerLimit(this.params,speed)));
  }
}
