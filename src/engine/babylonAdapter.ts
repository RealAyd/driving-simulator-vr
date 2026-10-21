import {Vector3,type Scene,type TransformNode} from './babylon';
import type {Pose,Radians,Vec3} from '../contracts';

/**
 * The only place that converts between the world contract and Babylon.
 * The scene runs right-handed so Babylon axes match the contract directly:
 * +X right/east, +Y up, -Z forward/north. A compass heading (clockwise from
 * north) is a negative rotation about +Y.
 */
export function configureScene(scene:Scene):void{
  scene.useRightHandedSystem=true;
}

export function toVector3(v:Vec3):Vector3{
  return new Vector3(v.x,v.y,v.z);
}

export function rotationYFromHeading(heading:Radians):number{
  return -heading;
}

export function headingFromRotationY(rotationY:number):Radians{
  return -rotationY;
}

/**
 * Ground height under a point (the location's terrain, world/terrain.ts), or flat. Poses stay flat (driving and
 * assessment are 2D); what is drawn is lifted onto the ground here.
 */
let ground:(x:number,z:number)=>number=()=>0;
export function setGround(fn:((x:number,z:number)=>number)|null):void{ground=fn??(()=>0)}
export function groundAt(x:number,z:number):number{return ground(x,z)}

/** A pose lifted onto the ground: for the camera and mirrors, which are placed from the learner's pose. */
export function onGround(pose:Pose):Pose{
  return {...pose,position:{...pose.position,y:pose.position.y+ground(pose.position.x,pose.position.z)}};
}

/** Applies a pose to a node, on the ground. Vehicle rotation is applied here only once. */
export function applyPose(node:TransformNode,pose:Pose):void{
  node.position.set(pose.position.x,pose.position.y+ground(pose.position.x,pose.position.z),pose.position.z);
  node.rotation.set(0,rotationYFromHeading(pose.heading),0);
}
