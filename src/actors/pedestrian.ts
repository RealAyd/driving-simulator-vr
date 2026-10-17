import type {EventSink,PedestrianActorDef,Seconds,SimModule,Vec2} from '../contracts';

export type PedestrianState='waiting'|'preparing'|'crossing'|'clear';

/** Returns true if a footprint circle at this point would touch a vehicle. */
export type PathBlocked=(point:Vec2,radius:number)=>boolean;

export const PEDESTRIAN_RADIUS=.3;

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

  constructor(readonly def:PedestrianActorDef,private readonly events:EventSink,private readonly blocked:PathBlocked=()=>false){
    this.id=def.id;
    this.position={...def.waitAt};
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

  fixedUpdate(dt:Seconds):void{
    this.timer+=dt;
    if(this.state==='waiting'&&this.pendingDelay!==null){
      this.pendingDelay-=dt;
      if(this.pendingDelay<=0){
        this.pendingDelay=null;
        this.setState('preparing');
      }
    }else if(this.state==='preparing'&&this.timer>=this.def.prepareSeconds){
      this.setState('crossing');
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
    this.position={...this.def.waitAt};
    this.pendingDelay=null;
    this.timer=0;
  }

  dispose():void{}
}
