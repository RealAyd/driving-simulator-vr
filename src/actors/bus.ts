import {headingFromDirection,type BusRunDef,type Location,type Pose,type Seconds,type SimModule,type Vec2} from '../contracts';
import {pointAtAlong} from '../world/roadGeometry';
import {pointToBox} from '../world/collisions';
import type {LearnerFootprint} from './passingVehicle';

/** A generic single-deck bus (no operator's livery), metres. */
export const BUS_SIZE={halfWidth:1.275,halfLength:5.75,height:3.05};
/** Gentle acceleration from a stop and planned braking into one (m/s²). */
const ACCELERATION=.9,PLANNED_DECEL=1.1;
/** Firmest braking it uses (for the learner's car in its path). */
export const BUS_MAX_DECEL=3.5;
const STOP_GAP=4;

export type BusState='waiting'|'driving'|'calling'|'gone';

/**
 * A background bus on a defined lane path. Speed follows simulated time only:
 * it accelerates gently, brakes so as to halt with its front at each stop, waits,
 * then pulls away; it slows or stops for the learner's car in its path. It
 * never steers round anything and is never assessed.
 */
export class Bus implements SimModule{
  readonly id:string;
  readonly path:Vec2[];
  pose:Pose;
  speed=0;
  state:BusState='waiting';
  private s=0;
  private timer=0;
  private nextCall=0;
  private readonly lengths:number[];
  /** Front-of-bus stopping points along the path (path metres from the start), with dwell times. */
  readonly calls:Array<{at:number;dwell:number}>;

  constructor(readonly def:BusRunDef,location:Location,private readonly learner:(()=>LearnerFootprint)|null=null){
    this.id=def.id;
    const road=location.roads.find(r=>r.id===def.roadId);
    if(!road)throw new Error(`Bus ${def.id} is on missing road ${def.roadId}`);
    const sign=def.direction==='with'?1:-1;
    // Lane centre: the left lane in the direction of travel (UK), half a lane from the centreline of a two-way road,
    // less 0.1 m so that on bends the body keeps clear of the kerb.
    const offset=road.oneway?0:road.lanes.width/2-.1;
    // The path runs for the bus's centre, from half a bus behind `from` to half a bus behind `to`.
    const start=def.from-sign*BUS_SIZE.halfLength,end=def.to-sign*BUS_SIZE.halfLength;
    const steps=Math.max(2,Math.ceil(Math.abs(end-start)/2));
    this.path=Array.from({length:steps+1},(_,i)=>{
      const along=start+(end-start)*i/steps;
      const p=pointAtAlong(road,along);
      const d={x:p.direction.x*sign,z:p.direction.z*sign};
      // Left of the direction of travel is (dz, -dx).
      return {x:p.x+d.z*offset,z:p.z-d.x*offset};
    });
    let total=0;
    this.lengths=this.path.map((p,i)=>{if(i>0)total+=Math.hypot(p.x-this.path[i-1]!.x,p.z-this.path[i-1]!.z);return total});
    this.calls=def.calls.map(c=>({at:Math.abs(c.at-sign*BUS_SIZE.halfLength-start),dwell:c.dwellSeconds})).filter(c=>c.at>0&&c.at<this.length).sort((a,b)=>a.at-b.at);
    this.pose=this.sample(0);
    this.reset();
  }

  get length():number{return this.lengths[this.lengths.length-1]!}
  get visible():boolean{return this.state!=='gone'}
  /** Distance travelled along its path. */
  get travelled():number{return this.s}

  /**
   * The body's pose with its centre `s` along the path: lined up between its axles (3 m ahead and behind on the
   * path), as a real vehicle sits, so it turns smoothly through the kinks of a mapped centreline.
   */
  sample(s:number):Pose{
    const front=this.point(s+3),rear=this.point(s-3);
    return {position:{x:(front.position.x+rear.position.x)/2,y:0,z:(front.position.z+rear.position.z)/2},
      heading:headingFromDirection({x:front.position.x-rear.position.x,z:front.position.z-rear.position.z})};
  }

  /** A point on the path (extended straight beyond its ends). */
  private point(s:number):Pose{
    let i=0;
    while(i<this.path.length-2&&this.lengths[i+1]!<s)i++;
    const a=this.path[i]!,b=this.path[i+1]!;
    const seg=this.lengths[i+1]!-this.lengths[i]!||1;
    const k=(s-this.lengths[i]!)/seg;
    return {position:{x:a.x+(b.x-a.x)*k,y:0,z:a.z+(b.z-a.z)*k},heading:headingFromDirection({x:b.x-a.x,z:b.z-a.z})};
  }

  /** Free distance ahead of the bus's front before the learner's car, or Infinity. */
  private gapToLearner(lookahead=40):number{
    if(!this.learner)return Infinity;
    const l=this.learner();
    for(let d=0;d<=lookahead;d+=.5){
      const p=this.sample(this.s+BUS_SIZE.halfLength+d).position;
      if(this.s+BUS_SIZE.halfLength+d>this.length+BUS_SIZE.halfLength)break;
      if(pointToBox(p.x,p.z,l.pose,l.halfWidth,l.halfLength)<BUS_SIZE.halfWidth+.3)return d;
    }
    return Infinity;
  }

  /** Indicating: the last seconds at a stop before pulling away, and the first seconds after. */
  get indicating():boolean{
    return (this.state==='waiting'||this.state==='calling')&&this.timer<=3&&this.timer>0||this.state==='driving'&&this.sinceDeparture<2.5&&this.departed;
  }
  private sinceDeparture=0;
  private departed=false;

  fixedUpdate(dt:Seconds):void{
    if(this.state==='gone')return;
    if(this.state==='waiting'||this.state==='calling'){
      this.timer-=dt;
      if(this.timer>0)return;
      if(this.state==='calling'&&this.s>=this.length-.01){
        if(this.def.end==='leave')this.state='gone';
        else this.timer=Infinity;
        return;
      }
      this.state='driving';this.departed=true;this.sinceDeparture=0;
    }
    this.sinceDeparture+=dt;
    // Where it must halt next: a call, the end of its path, or short of the learner's car.
    const call=this.calls[this.nextCall];
    const stopAt=call?call.at:this.length;
    let room=stopAt-this.s;
    const gap=this.gapToLearner();
    if(gap<Infinity)room=Math.min(room,gap-STOP_GAP);
    const cruise=this.def.cruiseMph*.44704;
    // The fastest speed from which it can still halt at the stopping point with planned braking: it follows
    // this curve down into a stop, and brakes harder only if the room ahead shrinks (the learner's car).
    const limit=Math.sqrt(2*PLANNED_DECEL*Math.max(room,0));
    if(this.speed>limit)this.speed=Math.max(limit,this.speed-BUS_MAX_DECEL*dt);
    else this.speed=Math.min(cruise,limit,this.speed+ACCELERATION*dt);
    if(room<=1e-3||this.speed*dt>=room){
      // Arrives within this step.
      this.s+=Math.max(0,Math.min(room,this.speed*dt));
      this.speed=0;
      if(this.s>=stopAt-1e-3){
        this.s=stopAt;
        if(call){this.nextCall++;this.state='calling';this.timer=call.dwell}
        else{this.state='calling';this.timer=this.def.end==='leave'?0:Infinity}
      }
    }else this.s+=this.speed*dt;
    this.pose=this.sample(this.s);
  }

  reset():void{
    this.s=0;this.speed=0;this.nextCall=0;this.departed=false;this.sinceDeparture=0;
    this.state='waiting';this.timer=this.def.startDwellSeconds;
    this.pose=this.sample(0);
  }

  dispose():void{}
}
