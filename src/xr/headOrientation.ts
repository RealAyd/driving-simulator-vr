import type {Vec3} from '../contracts';

/**
 * Head orientation for a phone worn in a viewer, from `deviceorientation`
 * angles. Pure maths (no browser APIs), unit-tested.
 *
 * The device angles are turned into the orientation of a camera looking out
 * of the back of the phone, as the screen is currently rotated (the standard
 * W3C/three.js construction). Axes: +X right, +Y up, −Z forward, the same as
 * the simulator's vehicle-local axes, so a recentred head maps directly onto
 * the driver's head.
 */
type Quat=[number,number,number,number]; // x, y, z, w

const DEG=Math.PI/180;

function multiply(a:Quat,b:Quat):Quat{
  const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b;
  return [ax*bw+aw*bx+ay*bz-az*by,ay*bw+aw*by+az*bx-ax*bz,az*bw+aw*bz+ax*by-ay*bx,aw*bw-ax*bx-ay*by-az*bz];
}

function rotate(q:Quat,v:Vec3):Vec3{
  const [x,y,z,w]=q;
  // v' = v + 2w(q×v) + 2q×(q×v)
  const cx=y*v.z-z*v.y,cy=z*v.x-x*v.z,cz=x*v.y-y*v.x;
  const dx=y*cz-z*cy,dy=z*cx-x*cz,dz=x*cy-y*cx;
  return {x:v.x+2*(w*cx+dx),y:v.y+2*(w*cy+dy),z:v.z+2*(w*cz+dz)};
}

/** Euler angles applied in Y, X, Z order (three.js 'YXZ'). */
function fromEulerYXZ(x:number,y:number,z:number):Quat{
  const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2);
  return [s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3-s1*s2*c3,c1*c2*c3+s1*s2*s3];
}

/** Camera orientation for the phone's current angles (degrees) and screen rotation (degrees, screen.orientation.angle). */
export function deviceQuaternion(alpha:number,beta:number,gamma:number,screenAngle:number):Quat{
  let q=fromEulerYXZ(beta*DEG,alpha*DEG,-gamma*DEG);
  // Look out of the back of the device, not out of its top.
  q=multiply(q,[-Math.SQRT1_2,0,0,Math.SQRT1_2]);
  // Adjust for the screen's rotation (landscape).
  const s=-screenAngle*DEG/2;
  return multiply(q,[0,0,Math.sin(s),Math.cos(s)]);
}

export interface HeadBasis{forward:Vec3;up:Vec3}

/** Forward and up of the head, before recentring. */
export function deviceBasis(alpha:number,beta:number,gamma:number,screenAngle:number):HeadBasis{
  const q=deviceQuaternion(alpha,beta,gamma,screenAngle);
  return {forward:rotate(q,{x:0,y:0,z:-1}),up:rotate(q,{x:0,y:1,z:0})};
}

/** Compass-free yaw of a forward vector (radians, clockwise from −Z). */
export const yawOf=(f:Vec3)=>Math.atan2(f.x,-f.z);

/** Turns a basis about the vertical by −`yaw0`, so that a head facing `yaw0` faces straight ahead. */
export function recentred(b:HeadBasis,yaw0:number):HeadBasis{
  const c=Math.cos(yaw0),s=Math.sin(yaw0);
  // Rotation about +Y by +yaw0 (anticlockwise seen from above) undoes a clockwise yaw.
  const r=(v:Vec3):Vec3=>({x:v.x*c+v.z*s,y:v.y,z:-v.x*s+v.z*c});
  return {forward:r(b.forward),up:r(b.up)};
}

/** Driver-head yaw and pitch (radians) of a recentred basis: yaw positive to the right, pitch positive up. */
export function yawPitch(b:HeadBasis):{yaw:number;pitch:number}{
  return {yaw:yawOf(b.forward),pitch:Math.asin(Math.max(-1,Math.min(1,b.forward.y)))};
}

/** Right-hand vector of a basis (forward × up). */
export function rightOf(b:HeadBasis):Vec3{
  const f=b.forward,u=b.up;
  return {x:f.y*u.z-f.z*u.y,y:f.z*u.x-f.x*u.z,z:f.x*u.y-f.y*u.x};
}
