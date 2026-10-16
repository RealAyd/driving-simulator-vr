import {Vector3,type Scene,type TransformNode} from '@babylonjs/core';
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

/** Applies a pose to a node. Vehicle rotation is applied here only once. */
export function applyPose(node:TransformNode,pose:Pose):void{
  node.position.set(pose.position.x,pose.position.y,pose.position.z);
  node.rotation.set(0,rotationYFromHeading(pose.heading),0);
}
