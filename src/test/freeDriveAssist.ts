import type {Pose,Vec2} from '../contracts';
import type {KerbFootprint} from '../world/townscape';
import {SteeringAssist} from '../vehicle/steeringAssist';
import type {VehicleParams} from '../vehicle/kinematics';
import type {IndicatorState} from '../vehicle/indicators';
import type {RoadNetwork} from './route';
import {routeLanePath} from './routePath';

/**
 * Assisted steering when there is no set route (free driving): the lane of the road the car is on, out past parked
 * cars, straight on at junctions, and into the next turning on the side signalled (one turning for each signal: the
 * indicator does not cancel itself here). The way ahead is worked out again as the car nears its end, when the
 * signal changes, and when the driver has steered somewhere else.
 */
export class FreeDriveAssist{
  readonly assist:SteeringAssist;
  private signal:IndicatorState='off';
  /** The signalled turning has been taken: straight on again until the signal changes. */
  private spent=false;
  /** Where (along the path) the signalled turning is, if the path takes one. */
  private turnAt:number|null=null;

  constructor(private readonly net:RoadNetwork,private readonly parked:readonly KerbFootprint[],params:VehicleParams){
    this.assist=new SteeringAssist([{x:0,z:0},{x:0,z:1}],params);
  }

  /** Once a frame: the way ahead kept up to date. */
  update(pose:Pose,signal:IndicatorState):void{
    const {x,z}=pose.position;
    const along=this.assist.progress(x,z),p=this.assist.pointAt(along);
    if(signal!==this.signal){this.signal=signal;this.spent=false}
    else if(this.turnAt!==null&&along>this.turnAt+15){this.spent=true;this.turnAt=null}
    else if(this.assist.length-along>60&&Math.hypot(p.x-x,p.z-z)<4&&this.planned)return;
    const turn=signal==='off'||this.spent?null:signal;
    // From where the car is; at the very end of a road (the map has the street carry on as another road that the
    // junctions do not join), from the road just ahead of the car instead.
    let plan:{path:Vec2[];turnAt:number|null}|null=null;
    for(const ahead of [0,6,12]){
      const pos=this.net.locate(x+Math.sin(pose.heading)*ahead,z-Math.cos(pose.heading)*ahead,pose.heading);
      if(!pos)continue;
      const {legs,turnAt}=this.net.wayAhead(pos,turn);
      const path=routeLanePath(legs,this.parked,this.net.location.junctions);
      if(path.length<2)continue;
      plan={path,turnAt};
      if(pathLength(path)>=15)break;
    }
    if(!plan)return;
    const {path,turnAt}=plan;
    this.assist.setPath(path);
    this.assist.progress(x,z);
    this.planned=true;
    this.turnAt=turnAt;
  }
  private planned=false;
}

const pathLength=(path:readonly Vec2[])=>path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i]!.x,p.z-path[i]!.z),0);
