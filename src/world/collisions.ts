import type {Pose} from '../contracts';
import type {CollisionQuery} from '../vehicle/vehicleController';
import {boxesOverlap} from './obstacles';

/** A moving road user's ground footprint, read each step. */
export interface DynamicFootprint{
  id:string;
  /** Oriented rectangle (vehicles) or a circle (pedestrians). */
  shape():{kind:'box';pose:Pose;halfWidth:number;halfLength:number}|{kind:'circle';x:number;z:number;radius:number};
  /** False while the road user is not in the scene yet (waiting to set off). */
  active?():boolean;
}

/** Distance from a point to an oriented rectangle (0 inside). */
export function pointToBox(x:number,z:number,pose:Pose,halfWidth:number,halfLength:number):number{
  const dx=x-pose.position.x,dz=z-pose.position.z;
  const fx=Math.sin(pose.heading),fz=-Math.cos(pose.heading);
  const along=dx*fx+dz*fz;
  const side=dx*Math.cos(pose.heading)+dz*Math.sin(pose.heading);
  const ox=Math.max(0,Math.abs(side)-halfWidth),oz=Math.max(0,Math.abs(along)-halfLength);
  return Math.hypot(ox,oz);
}

/** Static obstacles plus moving road users, as one collision query. */
export class CompositeCollisions implements CollisionQuery{
  constructor(private readonly fixed:CollisionQuery,private readonly dynamic:DynamicFootprint[]){}

  firstCollision(pose:Pose,halfWidth:number,halfLength:number):string|null{
    for(const actor of this.dynamic){
      if(actor.active&&!actor.active())continue;
      const s=actor.shape();
      if(s.kind==='circle'){
        if(pointToBox(s.x,s.z,pose,halfWidth,halfLength)<s.radius)return actor.id;
      }else if(boxesOverlap(
        {id:'v',cx:pose.position.x,cz:pose.position.z,heading:pose.heading,halfW:halfWidth,halfD:halfLength},
        {id:actor.id,cx:s.pose.position.x,cz:s.pose.position.z,heading:s.pose.heading,halfW:s.halfWidth,halfD:s.halfLength}
      ))return actor.id;
    }
    return this.fixed.firstCollision(pose,halfWidth,halfLength);
  }
}
