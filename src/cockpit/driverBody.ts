import {Quaternion,TransformNode,Vector3,type Scene} from '../engine/babylon';
import {loadModel} from '../assets/models';
import type {Vec3} from '../contracts';

/**
 * The driver, seen from their own eyes: one of the owner's people models (content/assets/register.json) sitting in
 * the driver's seat, arms in their sleeves reaching the hands on the wheel. Posed in code each frame (no animation
 * clip): seated legs, a slight recline, the arms by two-bone IK to the wrists of the modelled hands in
 * cockpitModel.ts (the people models' own hands are too coarse to be seen this close, so they are folded away, as is
 * the head: the camera is where the eyes are). Display only. If the model cannot load, the simple arms stay.
 */

export const DRIVER_MODEL='assets/models/people/person-man-jacket.glb';

/** A grip on the rim as the wheel is now: where the hand holds it, and the wheel's centre and top. */
export interface Grip{point:Vector3;wrist:Vector3;centre:Vector3;top:Vector3;toDriver:Vector3}

const bone=(root:TransformNode,name:string)=>root.getChildTransformNodes(false).find(n=>n.name.endsWith(`mixamorig:${name}`))??null;

/** World rotation of a node (after computeWorldMatrix). */
const worldRot=(n:TransformNode)=>{n.computeWorldMatrix(true);return n.absoluteRotationQuaternion.clone()};

/** Sets a node's local rotation so that its world rotation becomes `q`. */
function setWorldRot(n:TransformNode,q:Quaternion){
  const parent=n.parent as TransformNode|null;
  const pq=parent?worldRot(parent):Quaternion.Identity();
  n.rotationQuaternion=Quaternion.Inverse(pq).multiply(q);
  n.computeWorldMatrix(true);
}

/** Turns a bone so that the direction to its child (in the bone's frame, `axis`) points along world `dir`. */
function aim(n:TransformNode,axis:Vector3,dir:Vector3){
  const q=worldRot(n);
  const now=axis.applyRotationQuaternion(q).normalize();
  const delta=new Quaternion();
  Quaternion.FromUnitVectorsToRef(now,dir.normalizeToNew(),delta);
  setWorldRot(n,delta.multiply(q));
}

interface Arm{side:-1|1;arm:TransformNode;fore:TransformNode;hand:TransformNode;upperLen:number;foreLen:number;
  armAxis:Vector3;foreAxis:Vector3;rest:Map<TransformNode,Quaternion>}

export class DriverBody{
  private constructor(private readonly root:TransformNode,private readonly arms:Arm[],private readonly shoulderOf:(a:Arm)=>Vector3){}

  /** Loads and seats the driver; null if the model is not available. */
  static async load(scene:Scene,parent:TransformNode,eye:Vec3):Promise<DriverBody|null>{
    const container=await loadModel(scene,DRIVER_MODEL);
    if(!container)return null;
    const root=new TransformNode('driver-body',scene);
    root.parent=parent;
    const inner=new TransformNode('driver-body-model',scene);
    inner.parent=root;
    // The models face +Z; the car's forward is −Z.
    inner.rotation.y=Math.PI;
    const copy=container.instantiateModelsToScene(n=>`driver-${n}`,false,{doNotInstantiate:true});
    for(const r of copy.rootNodes)r.parent=inner;
    for(const g of copy.animationGroups)g.stop();
    for(const m of inner.getChildMeshes()){m.isPickable=false;m.alwaysSelectAsActiveMesh=true;m.receiveShadows=false}
    const need=(name:string)=>{const b=bone(inner,name);if(!b)throw new Error(`driver model has no ${name}`);return b};
    try{
      // Everything posed through rotation quaternions.
      for(const n of inner.getChildTransformNodes(false))if(!n.rotationQuaternion)n.rotationQuaternion=Quaternion.FromEulerVector(n.rotation);
      root.computeWorldMatrix(true);
      for(const n of inner.getChildTransformNodes(false))n.computeWorldMatrix(true);
      const pos=(n:TransformNode)=>{n.computeWorldMatrix(true);return n.getAbsolutePosition().clone()};
      const localAxis=(_:TransformNode,child:TransformNode)=>child.position.normalizeToNew();
      const fwd=Vector3.TransformNormal(new Vector3(0,0,-1),parent.getWorldMatrix()).normalize();
      const up=Vector3.TransformNormal(new Vector3(0,1,0),parent.getWorldMatrix()).normalize();

      // Seated: thighs forward and a little up, shins down to the pedals.
      for(const side of ['Left','Right']){
        const thigh=need(`${side}UpLeg`),shin=need(`${side}Leg`),foot=need(`${side}Foot`);
        aim(thigh,localAxis(thigh,shin),fwd.add(up.scale(.12)));
        aim(shin,localAxis(shin,foot),up.scale(-1).add(fwd.scale(.45)));
      }
      // A slight recline.
      const spine=need('Spine');
      aim(spine,localAxis(spine,need('Spine1')),up.add(fwd.scale(-.18)));

      // Size: scaled to an adult's reach (shoulder joint to wrist about 0.6 m), so the hands reach the wheel with the
      // elbows a little bent, as in a correct seating position.
      const lArm=need('LeftArm'),reach=Vector3.Distance(pos(lArm),pos(need('LeftForeArm')))+Vector3.Distance(pos(need('LeftForeArm')),pos(need('LeftHand')));
      if(reach>.05)inner.scaling.setAll(.6/reach);
      // Placed so the head sits just behind the eyes.
      const head=need('Head');
      const eyeWorld=Vector3.TransformCoordinates(new Vector3(eye.x,eye.y,eye.z),parent.getWorldMatrix());
      const target=eyeWorld.subtract(fwd.scale(.02)).subtract(up.scale(.06));
      const toLocal=parent.getWorldMatrix().clone().invert();
      root.position.addInPlace(Vector3.TransformNormal(target.subtract(pos(head)),toLocal));
      // Fold the head and neck away: the camera is at the eyes.
      need('Neck').scaling.setAll(.001);

      const arms=([['Left',-1],['Right',1]] as const).map(([side,s])=>{
        const arm=need(`${side}Arm`),fore=need(`${side}ForeArm`),hand=need(`${side}Hand`);
        const rest=new Map<TransformNode,Quaternion>();
        for(const n of [arm,fore])rest.set(n,n.rotationQuaternion!.clone());
        const a={side:s,arm,fore,hand,upperLen:Vector3.Distance(pos(arm),pos(fore)),foreLen:Vector3.Distance(pos(fore),pos(hand)),
          armAxis:localAxis(arm,fore),foreAxis:localAxis(fore,hand),rest} satisfies Arm;
        hand.scaling.setAll(.001);
        // Slimmer sleeves (the bones run along their local Y): seen from the seat, the cuffs would hide the hands.
        fore.scaling.set(.72,1,.72);
        arm.scaling.set(.85,1,.85);
        return a;
      });
      return new DriverBody(root,arms,a=>pos(a.arm));
    }catch(error){
      console.warn('[Driving Practice] driver model not posed',error);
      root.dispose(false,true);
      return null;
    }
  }

  /** Brings the arms to the hands on the grips (left, right) as the wheel is now. */
  update(grips:[Grip,Grip]):void{
    for(const a of this.arms){
      for(const [n,q] of a.rest)n.rotationQuaternion!.copyFrom(q);
      const g=grips[a.side<0?0:1];
      const wrist=g.wrist;
      this.lastWrists[a.side<0?0:1]=wrist;
      const radial=g.point.subtract(g.centre).normalize();
      // Two-bone IK: the elbow bent down and a little out to the side.
      const S=this.shoulderOf(a);
      const toW=wrist.subtract(S);
      const d=Math.min(toW.length(),(a.upperLen+a.foreLen)*.999);
      const dir=toW.normalize();
      const pole=new Vector3(0,-1,0).add(radial.scale(.5));
      const bend=pole.subtract(dir.scale(Vector3.Dot(pole,dir))).normalize();
      const x=(a.upperLen*a.upperLen-a.foreLen*a.foreLen+d*d)/(2*d);
      const h=Math.sqrt(Math.max(0,a.upperLen*a.upperLen-x*x));
      const elbow=S.add(dir.scale(x)).add(bend.scale(h));
      aim(a.arm,a.armAxis,elbow.subtract(S));
      aim(a.fore,a.foreAxis,wrist.subtract(elbow));
    }
  }

  private lastWrists:Vector3[]=[];
  /** Diagnostics: shoulder, elbow-free wrist target and the hand bone where it ended up (world, metres). */
  debug(){
    return this.arms.map((a,i)=>{a.hand.computeWorldMatrix(true);return {side:a.side,shoulder:this.shoulderOf(a).asArray(),target:this.lastWrists[i]?.asArray(),
      hand:a.hand.getAbsolutePosition().asArray(),upper:a.upperLen,fore:a.foreLen}});
  }

  dispose():void{this.root.dispose(false,true)}
}
