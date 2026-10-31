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
/** Predictive steering looks this far ahead (seconds, and at least metres at a crawl), weighs the car's heading at the
 * end against the path's this much, and is used while the car is within this many metres of the path (tuned on the
 * mock test routes of many centres: tests/stress/assist.test.ts). */
const PREDICT_SECONDS=.7,PREDICT_METRES=3,PREDICT_HEADING=2,PREDICT_WITHIN=.6;

export class SteeringAssist{
  private lengths:number[]=[];

  constructor(private path:Vec2[],private readonly params:VehicleParams){
    this.setPath(path);
  }

  /** Follow a different path from here on (a mock test route planned again after a wrong turn). */
  setPath(path:Vec2[]):void{
    this.path=path;
    this.last=null;
    this.cutUntil=-Infinity;
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
    // (The first piece that reaches `from`, by halving: a route is a thousand points, and this is asked many times a step.)
    let lo=0,hi=this.path.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(this.lengths[mid+1]!<from)lo=mid+1;else hi=mid}
    for(let i=lo;i<this.path.length-1;i++){
      if(this.lengths[i]!>to)break;
      if(this.lengths[i+1]!<from)continue;
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
    // The wheel already at full lock and the car still running off the path: slower, whatever the bends ahead say (a
    // learner speeding up before the turn is finished).
    const on=this.pointAt(at),off=Math.hypot(on.x-pose.position.x,on.z-pose.position.z);
    if(this.atLock&&off>.3&&speed>2.5)return Math.min(1,.25+off*.25);
    let need=0;
    for(let d=0;d<speed*speed/3+15;d+=2){
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


  /**
   * Predictive steering: each steering input from full left to full right is tried, the car's next PREDICT_SECONDS
   * (at least PREDICT_METRES) simulated with the wheel turning towards it at the rate it can, and the one that keeps
   * the car closest to the path chosen (then refined either side). The wheel's lag and the bends ahead are in the
   * simulation, so the car neither turns in early (cutting a corner) nor runs wide coming out.
   */
  private predictive(pose:Pose,speed:number,at:number):number{
    const p=this.params,v=Math.max(speed,1),T=Math.min(3,Math.max(PREDICT_SECONDS,PREDICT_METRES/v)),steps=8,dt=T/steps,limit=steerLimit(p,speed);
    const cost=(input:number)=>{
      let x=pose.position.x,z=pose.position.z,h=pose.heading,w=this.wheelAngle,c=0,last=at;
      const target=input*limit;
      for(let k=1;k<=steps;k++){
        w+=Math.max(-p.steerRate*dt,Math.min(p.steerRate*dt,target-w));
        const travel=v*dt,turn=travel/p.wheelbase*Math.tan(w);
        x+=Math.sin(h+turn/2)*travel;z+=-Math.cos(h+turn/2)*travel;h+=turn;
        const n=this.nearest(x,z,last-1,last+travel+2);last=n.at;
        c+=n.d*n.d*(1+k/steps);
      }
      // Heading at the end along the path's (so it does not arrive crossing it).
      const a=this.pointAt(last-1),b=this.pointAt(last+1),e=headingDelta(Math.atan2(b.x-a.x,-(b.z-a.z)),h);
      return c+PREDICT_HEADING*e*e;
    };
    // Coarse (every quarter turn of the input), then halving either side of the best: 13 tries.
    let best=0,bestCost=Infinity;
    for(let i=-4;i<=4;i++){const u=i/4,c=cost(u);if(c<bestCost){bestCost=c;best=u}}
    for(const step of [.125,.0625]){
      const around=best;
      for(const u of [around-step,around+step]){if(u<-1||u>1)continue;const c=cost(u);if(c<bestCost){bestCost=c;best=u}}
    }
    return best;
  }

  private wheelAngle=0;

  /** Where along the path (metres) the car is cutting a corner too tight to follow until (the end of the bend). */
  private cutUntil=-Infinity;

  /**
   * Where (metres ahead) a bend within the next few metres that is sharper than the car's wheels allow at `speed`
   * ends (0: none).
   */
  private tightEnd(at:number,speed:number):number{
    const reach=Math.max(8,4+.6*speed),most=steerLimit(this.params,speed)*.97;
    let end=0;
    for(let d=0;d<reach+6;d+=1.5){
      const tight=Math.atan(this.params.wheelbase*Math.abs(this.turnBetween(at+d,at+d+3))/3)>most;
      if(tight&&(d<reach||end))end=d+3;else if(end)break;
    }
    return end;
  }

  /** The last steering asked for was full lock (the bend is tighter than the car can take at this speed). */
  private atLock=false;

  /** Normalised steering input (-1 left … +1 right) for the current pose and speed. */
  steer(pose:Pose&{steerAngle?:number},speed:number):number{
    // (The front wheels' angle now, radians + right, where the caller knows it: the predictive steering starts from it.)
    this.wheelAngle=pose.steerAngle??0;
    const input=this.steerInput(pose,speed);
    this.atLock=Math.abs(input)>.95;
    return input;
  }

  private steerInput(pose:Pose,speed:number):number{
    if(speed<0)return 0;
    const at=this.progress(pose.position.x,pose.position.z);
    // Well off the path at walking pace (pulling out from behind a parked car): a nearer point, so the wheel is turned
    // well over to get out in the room there is.
    const on=this.pointAt(at),off=Math.hypot(on.x-pose.position.x,on.z-pose.position.z);
    // Stopped: the wheels stay straight (waiting to turn, a shunt from behind would push the car into the way of
    // oncoming traffic), except at the kerb about to pull out, when they are set to go round whatever is in front.
    if(speed<.3&&off<=.8)return 0;
    // Near the path: predictive steering (the wheel's lag and the bends ahead in it). Well off it, or pulling out from
    // behind a parked car: pure pursuit, which brings the car back without overshooting.
    // (Except before a bend tighter than the car can take at this speed: there it has to turn in early, cutting the
    // corner, which pure pursuit does.)
    // (Once it has started one, it keeps on until the tight bend is behind it, not switching back and forth.)
    const tight=this.tightEnd(at,speed);
    if(tight>0)this.cutUntil=Math.max(this.cutUntil,at+tight);
    if(off<PREDICT_WITHIN&&at>this.cutUntil)return this.predictive(pose,speed,at);
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
