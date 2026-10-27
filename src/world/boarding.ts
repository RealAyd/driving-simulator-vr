import type {Pose,Vec2} from '../contracts';
import type {FigurePose} from './crowd';

/**
 * People waiting at a bus stop get on a bus that pulls up there: each walks to the bus's front door (on the nearside)
 * and is gone inside it before the bus pulls away. Others turn up to wait in their place later, once the stop is out
 * of the learner's sight (never appearing in view). Pure state, stepped with simulated time.
 */
export interface StandingBus{stop:number;pose:Pose;halfLength:number;halfWidth:number}

/** Seconds the bus stands at the stop (traffic.ts): everyone is on board before it goes. */
const ON_BOARD_BY=5;
const WALK=1.3;
/** Seconds after boarding before others can be waiting there again (out of the learner's sight). */
const NEXT_ARRIVAL=40;

interface Waiting{stop:number;x:number;z:number;state:'waiting'|'boarding'|'gone';from:Vec2;door:Vec2;start:number;speed:number;goneAt:number}

export class BusStopBoarding{
  private readonly people=new Map<string,Waiting>();

  /** `stops` as Traffic's bus stops (indices match `StandingBus.stop`); `standers` the people waiting about them. */
  constructor(stops:readonly Vec2[],standers:ReadonlyArray<{id:string;x:number;z:number}>){
    for(const s of standers){
      let stop=-1,best=8;
      stops.forEach((p,k)=>{const d=Math.hypot(p.x-s.x,p.z-s.z);if(d<best){best=d;stop=k}});
      if(stop>=0)this.people.set(s.id,{stop,x:s.x,z:s.z,state:'waiting',from:{x:s.x,z:s.z},door:{x:s.x,z:s.z},start:0,speed:WALK,goneAt:0});
    }
  }

  /** Each step: the buses standing at stops now, the time, and whether the learner can see a point. */
  update(t:number,standing:readonly StandingBus[],seen:(p:Vec2)=>boolean):void{
    for(const w of this.people.values()){
      if(w.state==='waiting'){
        const bus=standing.find(b=>b.stop===w.stop);
        if(!bus)continue;
        const h=bus.pose.heading,fx=Math.sin(h),fz=-Math.cos(h),lx=-Math.cos(h),lz=-Math.sin(h);
        const along=bus.halfLength-1.3,out=bus.halfWidth+.35;
        w.door={x:bus.pose.position.x+fx*along+lx*out,z:bus.pose.position.z+fz*along+lz*out};
        w.from={x:w.x,z:w.z};w.start=t;w.state='boarding';
        w.speed=Math.max(WALK,Math.hypot(w.door.x-w.x,w.door.z-w.z)/ON_BOARD_BY);
      }
      else if(w.state==='boarding'){
        if(t-w.start>=Math.hypot(w.door.x-w.from.x,w.door.z-w.from.z)/w.speed){w.state='gone';w.goneAt=t}
      }
      else if(t-w.goneAt>NEXT_ARRIVAL&&!seen(w))w.state='waiting';
    }
  }

  visible(id:string):boolean{return this.people.get(id)?.state!=='gone'}

  /** The person's pose: as waiting (`base`), or walking to the bus's door. */
  pose(id:string,base:FigurePose,t:number):FigurePose{
    const w=this.people.get(id);
    if(w?.state!=='boarding')return base;
    const dx=w.door.x-w.from.x,dz=w.door.z-w.from.z,length=Math.hypot(dx,dz)||1;
    const walked=Math.min(length,(t-w.start)*w.speed),k=walked/length;
    return {x:w.from.x+dx*k,y:base.y,z:w.from.z+dz*k,heading:Math.atan2(dx,-dz),stride:walked,walking:true};
  }
}
