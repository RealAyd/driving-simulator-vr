import {Color3,CreateBox,CreateTorus,StandardMaterial,TransformNode,type Mesh,type Scene} from '../engine/babylon';
import type {Vec3} from '../contracts';
import type {SeatConfig} from './seat';

/**
 * Right-hand-drive interior and body, parented to the vehicle node so its
 * transform comes from the vehicle pose only. Vehicle-local metres: +X right,
 * +Y up from the road, -Z forward. The pieces share one set of dimensions so
 * pillars, roof, sills and dashboard meet instead of floating.
 */
export const CABIN={
  halfWidth:.88,
  /** Window line: top of the doors and dashboard. */
  sill:.96,
  roof:1.47,
  /** Windscreen base (dashboard front edge) and top (roof header). */
  screenBase:{y:.96,z:-1.15},
  screenTop:{y:1.47,z:-.58},
  /** Where the side windows end at the back (C-pillar). */
  rear:1.15,
  bPillarZ:.45
} as const;

/** Steering-wheel turns per front-wheel angle, for display only. */
export const STEERING_RATIO=4;

export function buildCockpit(scene:Scene,vehicleNode:TransformNode,seat:SeatConfig):{root:TransformNode;wheel:TransformNode;dispose():void}{
  const root=new TransformNode('cockpit',scene);
  root.parent=vehicleNode;
  const mat=(name:string,c:Color3)=>{
    const m=new StandardMaterial(name,scene);
    m.diffuseColor=c;
    m.specularColor=new Color3(.04,.04,.04);
    return m;
  };
  const trim=mat('cockpit-trim',new Color3(.11,.12,.14));
  const dashMat=mat('dashboard',new Color3(.15,.16,.18));
  const paint=mat('car-paint',new Color3(.78,.12,.12));
  const frame=mat('body-frame',new Color3(.07,.07,.08));
  const lining=mat('roof-lining',new Color3(.36,.37,.39));

  const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial)=>{
    const mesh=CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);
    mesh.material=m;
    mesh.parent=root;
    return mesh;
  };
  /** A beam of the body frame between two points (its long axis is local Y). */
  const beam=(name:string,a:Vec3,b:Vec3,w:number,d:number,m:StandardMaterial):Mesh=>{
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
    const length=Math.hypot(dx,dy,dz);
    const mesh=CreateBox(name,{width:w,height:length,depth:d},scene);
    mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
    // Tilt Y towards +Z (back) by the run, then lean sideways.
    mesh.rotation.x=Math.atan2(dz,dy);
    mesh.rotation.z=-Math.atan2(dx,Math.hypot(dy,dz));
    mesh.material=m;
    mesh.parent=root;
    return mesh;
  };
  const C=CABIN,W=C.halfWidth;

  // Dashboard: top at the window line, from the windscreen base back towards the driver.
  const dashDepth=.43;
  box('dashboard',2*W,.26,dashDepth,0,C.sill-.13,C.screenBase.z+dashDepth/2,dashMat);
  // Instrument hood in front of the driver.
  box('instrument-hood',.38,.06,.2,seat.eye.x,C.sill+.03,C.screenBase.z+dashDepth-.12,trim);
  // Bonnet beyond the windscreen: falls gently to the front of the car.
  const bonnet=box('bonnet',1.66,.06,1.25,0,C.sill-.15,C.screenBase.z-.62,paint);
  bonnet.rotation.x=-.08;

  // Body frame. A-pillars run from the dashboard corners to the roof header.
  for(const side of [-1,1]){
    const x=side*(W-.04);
    beam(`a-pillar-${side}`,{x,y:C.screenBase.y,z:C.screenBase.z},{x:side*(W-.06),y:C.screenTop.y,z:C.screenTop.z},.09,.1,frame);
    // Roof side rail from the A-pillar top to the back.
    box(`roof-rail-${side}`,.08,.07,C.rear-C.screenTop.z,side*(W-.06),C.roof,(C.screenTop.z+C.rear)/2,frame);
    // Door: panel up to the window line, with a sill along the top.
    box(`door-${side}`,.06,C.sill-.3,C.rear-C.screenBase.z,side*W,(C.sill+.3)/2,(C.screenBase.z+C.rear)/2,trim);
    box(`window-sill-${side}`,.1,.04,C.rear-C.screenBase.z,side*(W-.02),C.sill,(C.screenBase.z+C.rear)/2,frame);
    box(`b-pillar-${side}`,.08,C.roof-C.sill,.1,side*(W-.04),(C.sill+C.roof)/2,C.bPillarZ,frame);
    box(`c-pillar-${side}`,.12,C.roof-C.sill,.18,side*(W-.06),(C.sill+C.roof)/2,C.rear,frame);
  }
  box('windscreen-header',2*W-.08,.07,.1,0,C.roof,C.screenTop.z,frame);
  box('roof-lining',2*W-.1,.03,C.rear-C.screenTop.z,0,C.roof+.02,(C.screenTop.z+C.rear)/2,lining);
  box('floor',2*W,.04,2.4,0,.3,0,trim);
  box('rear-panel',2*W,C.sill-.3,.06,0,(C.sill+.3)/2,C.rear+.05,trim);

  // Steering column tilted towards the driver; `wheel` spins about the column (local Y).
  const column=new TransformNode('steering-column',scene);
  column.position.set(seat.eye.x,.92,-.52);
  column.rotation.x=Math.PI/2-.45;
  column.parent=root;
  const wheel=new TransformNode('steering-wheel',scene);
  wheel.parent=column;
  const rim=CreateTorus('steering-rim',{diameter:.37,thickness:.035,tessellation:32},scene);
  rim.material=trim;
  rim.parent=wheel;
  // Local −Z is the top of the wheel as the driver sees it, +Z the bottom.
  const part=(name:string,w:number,h:number,d:number,z:number,material:StandardMaterial)=>{
    const mesh=CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.z=z;
    mesh.material=material;
    mesh.parent=wheel;
  };
  part('steering-spoke-cross',.33,.02,.035,.01,trim);
  part('steering-spoke-lower',.035,.02,.16,.09,trim);
  part('steering-hub',.08,.04,.07,0,trim);
  part('steering-top-mark',.03,.04,.025,-.18,mat('steering-mark',new Color3(.85,.55,.1)));

  // Exterior body for other cameras. Seen from inside, its faces are back
  // faces and are culled, so it does not block the driver.
  const body=CreateBox('car-body',{width:1.8,height:1.0,depth:4.3},scene);
  body.position.set(0,.75,0);
  body.material=paint;
  body.parent=root;

  return {root,wheel,dispose:()=>root.dispose(false,true)};
}
