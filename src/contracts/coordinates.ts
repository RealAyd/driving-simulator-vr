import type {Metres,Radians} from './units';

/**
 * World coordinate convention (right-handed, metres):
 *   +X  east / right
 *   +Y  up
 *   -Z  north / forward at heading 0
 * Heading is measured clockwise from north (compass style), in radians.
 *
 * Vehicle-local and seat-local frames use the same axes relative to the
 * vehicle: +X right, +Y up, -Z forward. Engine-specific conversions live only
 * in src/engine/babylonAdapter.ts.
 */
export interface Vec3{x:Metres;y:Metres;z:Metres}
export interface Vec2{x:Metres;z:Metres}

export interface Pose{
  position:Vec3;
  heading:Radians;
}

const TAU=Math.PI*2;

/** Wraps a heading into [0, 2π). */
export function normalizeHeading(heading:Radians):Radians{
  return ((heading%TAU)+TAU)%TAU;
}

/** Signed smallest difference a-b in (-π, π]. */
export function headingDelta(a:Radians,b:Radians):Radians{
  const d=normalizeHeading(a-b);
  return d>Math.PI?d-TAU:d;
}

export function forwardFromHeading(heading:Radians):Vec2{
  return {x:Math.sin(heading),z:-Math.cos(heading)};
}

export function rightFromHeading(heading:Radians):Vec2{
  return {x:Math.cos(heading),z:Math.sin(heading)};
}

export function headingFromDirection(direction:Vec2):Radians{
  return normalizeHeading(Math.atan2(direction.x,-direction.z));
}

/** Converts a point in a pose's local frame (+X right, -Z forward) to world. */
export function localToWorld(pose:Pose,local:Vec3):Vec3{
  const f=forwardFromHeading(pose.heading);
  const r=rightFromHeading(pose.heading);
  return {
    x:pose.position.x+r.x*local.x-f.x*local.z,
    y:pose.position.y+local.y,
    z:pose.position.z+r.z*local.x-f.z*local.z
  };
}

/** Rotates a local direction (+X right, -Z forward) into world space. */
export function localDirectionToWorld(heading:Radians,local:Vec3):Vec3{
  return localToWorld({position:{x:0,y:0,z:0},heading},local);
}
