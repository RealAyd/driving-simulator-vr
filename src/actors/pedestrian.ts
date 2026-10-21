import type {EventSink,Location,PedestrianActorDef,Seconds,SimModule,Vec2} from '../contracts';
import {pointAtAlong,sampleRoad,surfaceAt} from '../world/roadGeometry';

export type PedestrianState='waiting'|'preparing'|'crossing'|'clear';

/** Returns true if a footprint circle at this point would touch a vehicle. */
export type PathBlocked=(point:Vec2,radius:number)=>boolean;

export const PEDESTRIAN_RADIUS=.3;
/** After crossing: a step up onto the pavement, then on along it (metres), so nobody is left standing at the kerb. */
const STEP_ON=.8,WALK_ON=30;

/**
 * Scripted pedestrian: waiting → preparing to cross → crossing → clear.
 * The scenario decides when the sequence begins. While crossing, the
 * pedestrian pauses rather than walking into a vehicle that is in the way.
 */
export class Pedestrian implements SimModule{
  readonly id:string;
  state:PedestrianState='waiting';
  position:Vec2;
  private pendingDelay:number|null=null;
  private timer=0;
  /** Distance walked on after crossing. */
  private walked=0;
  /**
   * Where they go after crossing (`onwardPath`): up onto the pavement and on along it. Without one they stay at
   * the kerb.
   */
  onward:Vec2[]=[];

  constructor(readonly def:PedestrianActorDef,private readonly events:EventSink,private readonly blocked:PathBlocked=()=>false){
    this.id=def.id;
    this.position={...(def.walkFrom??def.waitAt)};
  }

  /** Still walking along the pavement to the kerb (only with `walkFrom`). */
  get approaching():boolean{
    return this.state==='waiting'&&(this.position.x!==this.def.waitAt.x||this.position.z!==this.def.waitAt.z);
  }

  /** Walking on along the far pavement after crossing. */
  get walkingOn():boolean{return this.state==='clear'&&this.walked<this.onwardLength}
  private get onwardLength():number{let n=0;for(let i=1;i<this.onward.length;i++)n+=Math.hypot(this.onward[i]!.x-this.onward[i-1]!.x,this.onward[i]!.z-this.onward[i-1]!.z);return n}

  /** Where walking on leads, `d` metres from the far kerb along `onward` (straight across if there is no path). */
  private onwardPoint(d:number):Vec2{
    const path=this.onward.length>1?this.onward:[this.def.crossTo,this.def.crossTo];
    for(let i=0;i<path.length-1;i++){
      const a=path[i]!,b=path[i+1]!,l=Math.hypot(b.x-a.x,b.z-a.z);
      if(d<=l||i===path.length-2){const f=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f}}
      d-=l;
    }
    return {...path[path.length-1]!};
  }

  /** Asks the pedestrian to begin crossing after `delay` seconds. Ignored unless waiting. */
  requestCrossing(delay:Seconds):void{
    if(this.state==='waiting'&&this.pendingDelay===null)this.pendingDelay=delay;
  }

  private setState(state:PedestrianState):void{
    this.state=state;
    this.timer=0;
    this.events.emit('actor.state.changed',{actorId:this.id,state,x:this.position.x,z:this.position.z});
  }

  /** Seconds spent so far (for looking about while waiting at the kerb). */
  waited=0;

  fixedUpdate(dt:Seconds):void{
    this.timer+=dt;
    this.waited+=dt;
    if(this.approaching){
      const dx=this.def.waitAt.x-this.position.x,dz=this.def.waitAt.z-this.position.z;
      const remaining=Math.hypot(dx,dz),step=this.def.walkSpeed*dt;
      this.position=step>=remaining?{...this.def.waitAt}:{x:this.position.x+dx/remaining*step,z:this.position.z+dz/remaining*step};
      return;
    }
    if(this.state==='waiting'&&this.pendingDelay!==null){
      this.pendingDelay-=dt;
      if(this.pendingDelay<=0){
        this.pendingDelay=null;
        this.setState('preparing');
      }
    }else if(this.state==='preparing'&&this.timer>=this.def.prepareSeconds){
      this.setState('crossing');
    }else if(this.state==='clear'&&this.walkingOn){
      const next=this.onwardPoint(this.walked+this.def.walkSpeed*dt);
      if(!this.blocked(next,PEDESTRIAN_RADIUS+.2)){this.walked+=this.def.walkSpeed*dt;this.position=next}
    }else if(this.state==='crossing'){
      const dx=this.def.crossTo.x-this.position.x,dz=this.def.crossTo.z-this.position.z;
      const remaining=Math.hypot(dx,dz);
      const step=Math.min(remaining,this.def.walkSpeed*dt);
      if(remaining<1e-6){
        this.setState('clear');
        return;
      }
      const next={x:this.position.x+dx/remaining*step,z:this.position.z+dz/remaining*step};
      if(!this.blocked(next,PEDESTRIAN_RADIUS+.4))this.position=next;
      if(step>=remaining)this.setState('clear');
    }
  }

  reset():void{
    this.state='waiting';
    this.position={...(this.def.walkFrom??this.def.waitAt)};
    this.pendingDelay=null;
    this.timer=0;
    this.walked=0;
    this.waited=0;
  }

  dispose():void{}
}

/**
 * The way on after crossing: a step up onto the far pavement, then along it following the road, the way they were
 * walking before (from `walkFrom`), else ahead along the road; it stops before anything that is not pavement.
 */
export function onwardPath(location:Location,def:PedestrianActorDef):Vec2[]{
  const crossing=location.crossings.find(c=>c.id===def.crossingId);
  const road=crossing&&location.roads.find(r=>r.id===crossing.roadId);
  if(!road)return [];
  const at=sampleRoad(road,def.crossTo.x,def.crossTo.z);
  const side=Math.sign(at.lateral)||1,lateral=Math.abs(at.lateral)+STEP_ON;
  let sign=1;
  if(def.walkFrom){const d=sampleRoad(road,def.waitAt.x,def.waitAt.z).along-sampleRoad(road,def.walkFrom.x,def.walkFrom.z).along;if(d<0)sign=-1}
  const path:Vec2[]=[{...def.crossTo}];
  for(let d=0;d<=WALK_ON;d+=1){
    const p=pointAtAlong(road,at.along+sign*d);
    // Right of the direction (ux,uz) is (-uz,ux).
    const q={x:p.x-p.direction.z*side*lateral,z:p.z+p.direction.x*side*lateral};
    if(surfaceAt(location,q.x,q.z)?.kind!=='pavement')break;
    path.push(q);
  }
  return path;
}
