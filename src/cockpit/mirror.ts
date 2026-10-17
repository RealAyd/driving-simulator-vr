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
}

export const INTERIOR_MIRROR:Readonly<MirrorSpec>=Object.freeze({
  id:'interior',
  glass:{x:0,y:1.43,z:-.62},
  width:.28,
  height:.08,
  viewpoint:{x:0,y:1.43,z:-.62},
  viewYaw:Math.PI,
  horizontalFov:degToRad(24)
});

/** Driver's (right) door mirror: flat glass, aimed slightly outward. */
export const RIGHT_DOOR_MIRROR:Readonly<MirrorSpec>=Object.freeze({
  id:'right-door',
  glass:{x:.99,y:1.02,z:-.67},
  width:.17,
  height:.11,
  viewpoint:{x:1.02,y:1.02,z:-.66},
  viewYaw:Math.PI-degToRad(12),
  horizontalFov:degToRad(18)
});

/** Passenger (left) door mirror: convex glass, so a wider view. */
export const LEFT_DOOR_MIRROR:Readonly<MirrorSpec>=Object.freeze({
  id:'left-door',
  glass:{x:-.99,y:1.02,z:-.67},
  width:.17,
  height:.11,
  viewpoint:{x:-1.02,y:1.02,z:-.66},
  viewYaw:Math.PI+degToRad(12),
  horizontalFov:degToRad(26)
});

export const ALL_MIRRORS=[INTERIOR_MIRROR,RIGHT_DOOR_MIRROR,LEFT_DOOR_MIRROR] as const;

export class Mirror{
  readonly camera:FreeCamera;
  readonly texture:RenderTargetTexture;
  readonly glass:Mesh;
  private housing:Mesh|null=null;
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
    this.texture.renderListPredicate=(mesh:AbstractMesh)=>mesh!==this.glass&&!mesh.isDescendantOf(this.ownCar);
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
    // Door mirrors get a housing fixed to the back of the glass, so it turns
    // with the glass and never covers it.
    if(spec.id!=='interior'){
      this.housing=CreateBox(`mirror-housing-${spec.id}`,{width:spec.width+.03,height:spec.height+.03,depth:.06},scene);
      this.housing.parent=this.glass;
      this.housing.position.z=-.035;
      const shell=new StandardMaterial(`mirror-housing-${spec.id}`,scene);
      shell.diffuseColor=new Color3(.09,.1,.12);
      this.housing.material=shell;
    }
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
    this.glass.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.camera.dispose();
  }
}
