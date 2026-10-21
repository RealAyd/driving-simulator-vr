import type {EventSink,Pose,Seconds,SimModule} from '../contracts';
import {Indicators} from './indicators';
import {LEARNER_CAR,stepVehicle,type Controls,type VehicleParams,type VehicleState} from './kinematics';

/** Answers the surface height under a point, or null where there is no road. */
export type SurfaceKind='carriageway'|'pavement'|'none';

export interface SurfaceQuery{
  surfaceHeightAt(x:number,z:number):number|null;
  groundHeight:number;
  /** Optional classification used for surface-change events. */
  surfaceKindAt?(x:number,z:number):SurfaceKind;
}

/** Answers whether a vehicle footprint at a pose overlaps an obstacle. */
export interface CollisionQuery{
  firstCollision(pose:Pose,halfWidth:number,halfLength:number):string|null;
}

export interface ControlSource{
  read():Controls;
}

const STOPPED_BELOW=.15;
/** Distance a car must back off before a new contact counts as a new incident. */
const CONTACT_RELEASE=.3;

/**
 * Sole owner of the learner vehicle's movement. Other modules read `pose`
 * or `interpolatedPose`; they never write the vehicle state.
 */
export class VehicleController implements SimModule{
  readonly id='vehicle';
  readonly indicators=new Indicators();
  readonly halfWidth=.9;
  readonly halfLength=2.15;
  state:VehicleState;
  private previous:VehicleState;
  private stopped=true;
  private colliding:string|null=null;
  private braking=false;
  surfaceKind:SurfaceKind='carriageway';

  constructor(
    private spawn:Pose,
    private readonly controls:ControlSource,
    private readonly surface:SurfaceQuery,
    private readonly collisions:CollisionQuery,
    private readonly events:EventSink,
    readonly params:VehicleParams=LEARNER_CAR
  ){
    this.state=this.initialState();
    this.previous=this.state;
  }

  private initialState():VehicleState{
    const {x,z}=this.spawn.position;
    return {position:{x,y:this.heightAt(x,z),z},heading:this.spawn.heading,speed:0,steerAngle:0};
  }

  private heightAt(x:number,z:number):number{
    return this.surface.surfaceHeightAt(x,z)??this.surface.groundHeight;
  }

  fixedUpdate(dt:Seconds):void{
    this.previous=this.state;
    const controls=this.controls.read();
    // Braking evidence: one event each time the driver starts braking while moving.
    const brakingNow=controls.brake>0&&Math.abs(this.state.speed)>1;
    if(brakingNow&&!this.braking)this.events.emit('vehicle.braking',{speed:this.state.speed});
    this.braking=controls.brake>0;
    let next=stepVehicle(this.state,controls,this.params,dt);
    next={...next,position:{...next.position,y:this.heightAt(next.position.x,next.position.z)}};

    const hit=this.collisions.firstCollision(next,this.halfWidth,this.halfLength);
    if(hit){
      // Stop at the last free position; report each contact once.
      next={...this.state,speed:0};
      if(this.colliding!==hit)this.events.emit('vehicle.collision',{obstacleId:hit,speed:this.state.speed});
      this.colliding=hit;
    }else if(this.colliding&&this.collisions.firstCollision(next,this.halfWidth+CONTACT_RELEASE,this.halfLength+CONTACT_RELEASE)!==this.colliding){
      // Creeping forward against the same obstacle is one incident; it ends
      // only once the car has clearly moved away.
      this.colliding=null;
    }

    if(this.stopped&&Math.abs(next.speed)>=STOPPED_BELOW){
      this.stopped=false;
      this.events.emit('vehicle.moving',{speed:next.speed,reverse:next.speed<0});
    }else if(!this.stopped&&Math.abs(next.speed)<STOPPED_BELOW){
      this.stopped=true;
      this.events.emit('vehicle.stopped',{x:next.position.x,z:next.position.z});
    }
    this.state=next;
    if(this.surface.surfaceKindAt){
      const kind=this.surface.surfaceKindAt(next.position.x,next.position.z);
      if(kind!==this.surfaceKind){
        this.events.emit('vehicle.surface.changed',{from:this.surfaceKind,to:kind});
        this.surfaceKind=kind;
      }
    }
  }

  toggleIndicator(side:'left'|'right',time:Seconds):void{
    const state=this.indicators.toggle(side,time);
    this.events.emit('vehicle.indicator.changed',{state});
  }

  get pose():Pose{
    return {position:this.state.position,heading:this.state.heading};
  }

  /** Pose blended between the last two fixed steps for smooth rendering. */
  interpolatedPose(alpha:number):Pose{
    const a=this.previous,b=this.state;
    let dh=b.heading-a.heading;
    if(dh>Math.PI)dh-=Math.PI*2;
    if(dh<-Math.PI)dh+=Math.PI*2;
    return {
      position:{
        x:a.position.x+(b.position.x-a.position.x)*alpha,
        y:a.position.y+(b.position.y-a.position.y)*alpha,
        z:a.position.z+(b.position.z-a.position.z)*alpha
      },
      heading:a.heading+dh*alpha
    };
  }

  /** Moves the start position (a different location); takes effect on the next reset. */
  setSpawn(spawn:Pose):void{
    this.spawn=spawn;
  }

  reset():void{
    this.state=this.initialState();
    this.previous=this.state;
    this.stopped=true;
    this.colliding=null;
    this.braking=false;
    this.surfaceKind='carriageway';
    this.indicators.reset();
  }

  dispose():void{}
}
