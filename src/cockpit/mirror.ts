import {degToRad,localDirectionToWorld,localToWorld,type Pose,type Radians,type Vec3} from '../contracts';
import {
  Color3,CreateBox,CreatePlane,FreeCamera,Matrix,RenderTargetTexture,StandardMaterial,Vector3,
  type AbstractMesh,type Mesh,type Scene,type TransformNode
} from '../engine/babylon';
import type {QualityProfile} from '../engine/quality';

/**
 * A functioning mirror: a camera in the same world renders what is behind
 * the car into the mirror glass. Vehicle-local coordinates (+X right,
 * +Y up from the road, -Z forward).
 */
export interface MirrorSpec{
  id:string;
  /** Centre of the glass. */
  glass:Vec3;
  width:number;
  height:number;
  /** Mirror camera position (where the reflected view is taken from). */
  viewpoint:Vec3;
  /** Camera direction relative to the car: π looks straight back. */
  viewYaw:Radians;
  /** Horizontal field of view of the reflected image. */
  horizontalFov:Radians;
  /** Where the mirror is fixed to the car (windscreen or door); a stem or arm joins it to the glass. */
  mount:Vec3;
}

/**
 * Hangs from the windscreen just below the roof header, on the car's centre
 * line. From the right-hand driver's eye it is about 27° left and 9° up.
 */
export const INTERIOR_MIRROR:Readonly<MirrorSpec>=Object.freeze({
  id:'interior',
  glass:{x:0,y:1.33,z:-.64},
  width:.25,
  height:.07,
  viewpoint:{x:0,y:1.33,z:-.64},
  viewYaw:Math.PI,
  horizontalFov:degToRad(24),
  mount:{x:0,y:1.43,z:-.66}
});

/**
 * Driver's (right) door mirror at the front corner of the side window: flat
 * glass, adjusted the usual way so the inner edge just shows the car's own side.
 */
export const RIGHT_DOOR_MIRROR:Readonly<MirrorSpec>=Object.freeze({
  id:'right-door',
  glass:{x:1.01,y:1.03,z:-.86},
  width:.2,
  height:.13,
  viewpoint:{x:1.04,y:1.03,z:-.85},
  viewYaw:Math.PI-degToRad(8),
  horizontalFov:degToRad(18),
  mount:{x:.89,y:.9,z:-.95}
});

/**
 * Passenger (left) door mirror: convex glass, so a wider view, inner edge on
 * the car's own side. Needs a head turn from the right-hand seat.
 */
export const LEFT_DOOR_MIRROR:Readonly<MirrorSpec>=Object.freeze({
  id:'left-door',
  glass:{x:-1.01,y:1.03,z:-.86},
  width:.2,
  height:.13,
  viewpoint:{x:-1.04,y:1.03,z:-.85},
  viewYaw:Math.PI+degToRad(9),
  horizontalFov:degToRad(26),
  mount:{x:-.89,y:.9,z:-.95}
});

export const ALL_MIRRORS=[INTERIOR_MIRROR,RIGHT_DOOR_MIRROR,LEFT_DOOR_MIRROR] as const;

export class Mirror{
  readonly camera:FreeCamera;
  readonly texture:RenderTargetTexture;
  readonly glass:Mesh;
  private housing:Mesh|null=null;
  private arm:Mesh|null=null;
  private readonly material:StandardMaterial;

  constructor(
    private readonly scene:Scene,
    vehicleNode:TransformNode,
    /** Meshes belonging to the learner car itself are never seen in its mirrors. */
    private readonly ownCar:TransformNode,
    readonly spec:MirrorSpec,
    quality:QualityProfile,
    driverEye:Vec3
  ){
    const width=quality.mirrorResolution;
    const height=Math.max(32,Math.round(width*spec.height/spec.width));
    this.texture=new RenderTargetTexture(`mirror-${spec.id}`,{width,height},scene,false);
    this.texture.refreshRate=quality.mirrorUpdateInterval;
    // Mirror glass, housings and arms belong to the learner car too. Door
    // mirrors see the car's own side (its body hides what is directly behind
    // it); the interior mirror looks out through the rear window.
    const seesOwnBody=spec.id!=='interior';
    this.texture.renderListPredicate=(mesh:AbstractMesh)=>!mesh.name.startsWith('mirror-')
      &&(!mesh.isDescendantOf(this.ownCar)||(seesOwnBody&&mesh.name==='car-body'));
    // A mirror reverses left and right relative to a camera looking backwards.
    this.texture.uScale=-1;
    this.texture.uOffset=1;

    this.camera=new FreeCamera(`mirror-camera-${spec.id}`,Vector3.Zero(),scene);
    this.camera.inputs.clear();
    this.camera.minZ=.2;
    this.camera.maxZ=600;
    // Fix the projection to the mirror's own shape. Otherwise Babylon may
    // size it from the canvas, narrowing and stretching the reflection.
    const aspect=spec.width/spec.height;
    const verticalFov=2*Math.atan(Math.tan(spec.horizontalFov/2)/aspect);
    this.camera.fov=verticalFov;
    this.camera.freezeProjectionMatrix(Matrix.PerspectiveFovRH(verticalFov,aspect,this.camera.minZ,this.camera.maxZ));
    this.texture.activeCamera=this.camera;
    scene.customRenderTargets.push(this.texture);

    this.material=new StandardMaterial(`mirror-glass-${spec.id}`,scene);
    this.material.disableLighting=true;
    this.material.emissiveTexture=this.texture;
    this.material.diffuseColor=Color3.Black();
    this.material.backFaceCulling=false;

    this.glass=CreatePlane(`mirror-glass-${spec.id}`,{width:spec.width,height:spec.height},scene);
    this.glass.material=this.material;
    this.glass.parent=vehicleNode;
    this.glass.position.set(spec.glass.x,spec.glass.y,spec.glass.z);
    // Turn and tilt the glass toward the driver's eye (cosmetic; the
    // reflected view comes from the mirror camera).
    const toEye={x:driverEye.x-spec.glass.x,y:driverEye.y-spec.glass.y,z:driverEye.z-spec.glass.z};
    this.glass.rotation.y=Math.atan2(toEye.x,toEye.z);
    this.glass.rotation.x=Math.atan2(-toEye.y,Math.hypot(toEye.x,toEye.z));
    // Every mirror has a frame/housing fixed to the back of the glass, so it
    // turns with the glass and never covers it, and a stem or arm to its mount.
    const shell=new StandardMaterial(`mirror-housing-${spec.id}`,scene);
    shell.diffuseColor=new Color3(.06,.06,.07);
    const border=spec.id==='interior'?.024:.036;
    this.housing=CreateBox(`mirror-housing-${spec.id}`,{width:spec.width+border,height:spec.height+border,depth:spec.id==='interior'?.03:.07},scene);
    this.housing.parent=this.glass;
    this.housing.position.z=spec.id==='interior'?-.018:-.04;
    this.housing.material=shell;
    // The arm meets the back of the housing (further from the eye than the
    // glass), so from the driver's seat it is hidden behind the mirror.
    const toward={x:spec.mount.x-spec.glass.x,y:spec.mount.y-spec.glass.y,z:spec.mount.z-spec.glass.z};
    const reach=Math.hypot(toward.x,toward.y,toward.z)||1;
    const inset=Math.min(spec.width,spec.height)*.3;
    const away={x:-toEye.x,y:-toEye.y,z:-toEye.z},awayLen=Math.hypot(away.x,away.y,away.z)||1;
    const g={
      x:spec.glass.x+toward.x/reach*inset+away.x/awayLen*.05,
      y:spec.glass.y+toward.y/reach*inset+away.y/awayLen*.05,
      z:spec.glass.z+toward.z/reach*inset+away.z/awayLen*.05
    },m=spec.mount;
    const length=Math.hypot(m.x-g.x,m.y-g.y,m.z-g.z);
    const thick=spec.id==='interior'?.022:.04;
    this.arm=CreateBox(`mirror-arm-${spec.id}`,{width:thick,height:length,depth:thick},scene);
    this.arm.parent=vehicleNode;
    this.arm.position.set((g.x+m.x)/2,(g.y+m.y)/2,(g.z+m.z)/2);
    this.arm.rotation.x=Math.atan2(m.z-g.z,m.y-g.y);
    this.arm.rotation.z=-Math.atan2(m.x-g.x,Math.hypot(m.y-g.y,m.z-g.z));
    this.arm.material=shell;
  }

  private active=true;

  /**
   * Renders the mirror only while its glass is on screen; a mirror nobody
   * can see costs a whole extra render of the scene.
   */
  setActive(active:boolean):void{
    if(active===this.active)return;
    this.active=active;
    const list=this.scene.customRenderTargets;
    const index=list.indexOf(this.texture);
    if(active&&index<0)list.push(this.texture);
    if(!active&&index>=0)list.splice(index,1);
  }

  get isActive():boolean{return this.active}

  /** Renders every `frames` frames: 1 while the driver is looking at this mirror. */
  setRefresh(frames:number):void{
    if(this.texture.refreshRate!==frames)this.texture.refreshRate=frames;
  }

  /** Moves the mirror camera with the car. Call once per rendered frame. */
  update(vehicle:Pose):void{
    const p=localToWorld(vehicle,this.spec.viewpoint);
    const d=localDirectionToWorld(vehicle.heading,{x:Math.sin(this.spec.viewYaw),y:0,z:-Math.cos(this.spec.viewYaw)});
    this.camera.position.set(p.x,p.y,p.z);
    this.camera.setTarget(new Vector3(p.x+d.x,p.y+d.y,p.z+d.z));
  }

  dispose():void{
    const index=this.scene.customRenderTargets.indexOf(this.texture);
    if(index>=0)this.scene.customRenderTargets.splice(index,1);
    this.housing?.dispose(false,true);
    this.arm?.dispose(false,true);
    this.glass.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.camera.dispose();
  }
}
