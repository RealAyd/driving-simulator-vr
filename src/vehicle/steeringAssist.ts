import {headingDelta,type Pose,type Vec2} from '../contracts';
import {steerLimit,type VehicleParams} from './kinematics';

/**
 * Optional steering assistance: pure-pursuit path following along a lane
 * path, so a learner on a touchscreen can concentrate on observation, speed
 * and decisions. It only proposes a steering input; the driver's own
 * steering always overrides it, and its use is recorded in the results.
 */
/** Sideways acceleration the assisted car slows to round a bend (m/s²): gentle, so it follows the curve. */
const BEND_LATERAL=2;

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

  /** Diagnostics: the path's points within `r` metres of (x, z). */
  near(x:number,z:number,r:number):Vec2[]{return this.path.filter(p=>Math.hypot(p.x-x,p.z-z)<r)}

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

  /** How much the path turns (radians, signed) between two distances along it. */
  turnBetween(a:number,b:number):number{
    const p0=this.pointAt(a),p1=this.pointAt(a+1.5),q0=this.pointAt(b-1.5),q1=this.pointAt(b);
    const h0=Math.atan2(p1.x-p0.x,-(p1.z-p0.z)),h1=Math.atan2(q1.x-q0.x,-(q1.z-q0.z));
    return headingDelta(h1,h0);
  }

  /**
   * Braking (0–1) so the car is slow enough for the bends ahead: a speed at which it follows each bend (a gentle
   * sideways acceleration), reached with gentle braking. Not the speed a test expects (slower), only what keeps the
   * assisted car on the road.
   */
  brakeFor(pose:Pose,speed:number):number{
    if(speed<2)return 0;
    const at=this.progress(pose.position.x,pose.position.z);
    let need=0;
    for(let d=2;d<speed*speed/3+15;d+=2){
      const turn=Math.abs(this.turnBetween(at+d,at+d+6));
      if(turn<.05)continue;
      const radius=6/turn,allowed=Math.max(3,Math.sqrt(BEND_LATERAL*radius));
      // Deceleration needed to be at the allowed speed by then.
      need=Math.max(need,(speed*speed-allowed*allowed)/(2*Math.max(1,d)));
    }
    return need<.4?0:Math.min(1,need/this.params.brakeDeceleration*1.3);
  }

  /** A path to follow while reversing (a manoeuvre): points in the order the car goes over them. */
  private reversePath:SteeringAssist|null=null;
  setReversePath(path:Vec2[]|null):void{this.reversePath=path&&path.length>1?new SteeringAssist(path,this.params):null}
  get canReverse():boolean{return !!this.reversePath}

  /**
   * Steering while reversing along the reverse path: pure pursuit on a point behind the car. Going backwards the
   * wheels turn the car's tail the other way, so the input is the opposite of going forwards.
   */
  steerReverse(pose:Pose,speed:number):number{
    const r=this.reversePath;
    if(!r||speed>-.2)return 0;
    const v=Math.abs(speed),lookahead=Math.max(2.5,2.5+.5*v);
    const target=r.pointAt(r.progress(pose.position.x,pose.position.z)+lookahead);
    const dx=target.x-pose.position.x,dz=target.z-pose.position.z;
    // Measured from the way the car is moving (backwards).
    const alpha=headingDelta(Math.atan2(dx,-dz),pose.heading+Math.PI);
    const wheel=-Math.atan(2*this.params.wheelbase*Math.sin(Math.max(-Math.PI/2,Math.min(Math.PI/2,alpha)))/lookahead);
    return Math.max(-1,Math.min(1,wheel/steerLimit(this.params,v)));
  }

  /** Normalised steering input (-1 left … +1 right) for the current pose and speed. */
  steer(pose:Pose,speed:number):number{
    if(speed<0)return 0;
    const at=this.progress(pose.position.x,pose.position.z);
    // Well off the path at walking pace (pulling out from behind a parked car): a nearer point, so the wheel is turned
    // well over to get out in the room there is.
    const on=this.pointAt(at),off=Math.hypot(on.x-pose.position.x,on.z-pose.position.z);
    // Stopped: the wheels stay straight (waiting to turn, a shunt from behind would push the car into the way of
    // oncoming traffic), except at the kerb about to pull out, when they are set to go round whatever is in front.
    if(speed<.3&&off<=.8)return 0;
    const lookahead=speed<5&&off>.8?2.5+.6*speed:Math.min(15,Math.max(4,4+.6*speed));
    const target=this.pointAt(at+lookahead);
    const dx=target.x-pose.position.x,dz=target.z-pose.position.z;
    const alpha=headingDelta(Math.atan2(dx,-dz),pose.heading);
    // Path behind or beside the car (gone past a turn): full lock towards it rather than sin(alpha), which fades out.
    if(Math.abs(alpha)>Math.PI/2)return Math.sign(alpha);
    const wheel=Math.atan(2*this.params.wheelbase*Math.sin(alpha)/lookahead);
    return Math.max(-1,Math.min(1,wheel/steerLimit(this.params,speed)));
  }
}
