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

  constructor(private readonly path:Vec2[],private readonly params:VehicleParams){
    let s=0;
    this.lengths=path.map((p,i)=>{
      if(i>0)s+=Math.hypot(p.x-path[i-1]!.x,p.z-path[i-1]!.z);
      return s;
    });
  }

  /** Distance along the path of the point closest to (x, z). */
  progress(x:number,z:number):number{
    let best=Infinity,at=0;
    for(let i=0;i<this.path.length-1;i++){
      const a=this.path[i]!,b=this.path[i+1]!;
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
      const t=Math.max(0,Math.min(len,((x-a.x)*dx+(z-a.z)*dz)/len));
      const d=Math.hypot(a.x+dx/len*t-x,a.z+dz/len*t-z);
      if(d<best){best=d;at=this.lengths[i]!+t}
    }
    return at;
  }

  /** Point on the path at distance s (clamped to its ends). */
  pointAt(s:number):Vec2{
    const total=this.lengths[this.lengths.length-1]!;
    const target=Math.max(0,Math.min(total,s));
    let i=0;
    while(i<this.path.length-2&&this.lengths[i+1]!<target)i++;
    const a=this.path[i]!,b=this.path[i+1]!;
    const seg=this.lengths[i+1]!-this.lengths[i]!||1;
    const k=(target-this.lengths[i]!)/seg;
    return {x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k};
  }

  /** Normalised steering input (-1 left … +1 right) for the current pose and speed. */
  steer(pose:Pose,speed:number):number{
    if(speed<.3)return 0;
    const lookahead=Math.min(15,Math.max(4,4+.6*speed));
    const target=this.pointAt(this.progress(pose.position.x,pose.position.z)+lookahead);
    const dx=target.x-pose.position.x,dz=target.z-pose.position.z;
    const alpha=headingDelta(Math.atan2(dx,-dz),pose.heading);
    const wheel=Math.atan(2*this.params.wheelbase*Math.sin(alpha)/lookahead);
    return Math.max(-1,Math.min(1,wheel/steerLimit(this.params,speed)));
  }
}
