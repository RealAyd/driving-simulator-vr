import {applyPose,rotationYFromHeading} from '../engine/babylonAdapter';
import {Color3,CreateBox,CreateCylinder,CreateSphere,StandardMaterial,TransformNode,type Scene} from '../engine/babylon';
import type {CarModel} from '../assets/models';
import type {FollowingVehicle} from './followingVehicle';
import type {Pedestrian} from './pedestrian';

function mat(scene:Scene,name:string,colour:Color3):StandardMaterial{
  const m=new StandardMaterial(name,scene);
  m.diffuseColor=colour;
  m.specularColor=new Color3(.1,.1,.1);
  return m;
}

/** Placeholder pedestrian figure (about 1.7 m tall). */
export function pedestrianVisual(scene:Scene,ped:Pedestrian){
  const root=new TransformNode(`actor-${ped.id}`,scene);
  const body=CreateCylinder(`${ped.id}-body`,{height:1.1,diameterTop:.38,diameterBottom:.32},scene);
  body.position.y=.95;body.material=mat(scene,`${ped.id}-coat`,new Color3(.12,.2,.38));body.parent=root;
  const legs=CreateBox(`${ped.id}-legs`,{width:.3,height:.45,depth:.2},scene);
  legs.position.y=.22;legs.material=mat(scene,`${ped.id}-trousers`,new Color3(.15,.15,.17));legs.parent=root;
  const head=CreateSphere(`${ped.id}-head`,{diameter:.24},scene);
  head.position.y=1.62;head.material=mat(scene,`${ped.id}-skin`,new Color3(.78,.6,.48));head.parent=root;
  return {
    update(){
      root.position.set(ped.position.x,0,ped.position.z);
      const dx=ped.def.crossTo.x-ped.def.waitAt.x,dz=ped.def.crossTo.z-ped.def.waitAt.z;
      root.rotation.y=rotationYFromHeading(Math.atan2(dx,-dz));
    },
    dispose:()=>root.dispose(false,true)
  };
}

/**
 * Body for other vehicles: the car model when one is loaded (scaled to the
 * collision length), otherwise simple shapes; or a cyclist on a bicycle.
 * `visible`: hidden until the road user sets off, so a waiting actor never sits in the road.
 */
export function vehicleVisual(scene:Scene,id:string,colour:string,pose:()=>import('../contracts').Pose,shape:'car'|'cyclist'='car',visible:()=>boolean=()=>true,model:CarModel|null=null,length=4.3){
  const root=new TransformNode(`actor-${id}`,scene);
  if(shape==='car'&&model){
    model.instantiate(root,id,colour,length);
    return {update(){root.setEnabled(visible());applyPose(root,pose())},dispose:()=>root.dispose(false,true)};
  }
  const paint=mat(scene,`${id}-paint`,Color3.FromHexString(colour));
  if(shape==='cyclist'){
    const bike=CreateBox(`${id}-bike`,{width:.12,height:.7,depth:1.7},scene);
    bike.position.y=.45;bike.material=mat(scene,`${id}-frame`,new Color3(.12,.12,.14));bike.parent=root;
    const rider=CreateCylinder(`${id}-rider`,{height:.9,diameterTop:.36,diameterBottom:.3},scene);
    rider.position.set(0,1.25,.1);rider.material=paint;rider.parent=root;
    const helmet=CreateSphere(`${id}-helmet`,{diameter:.28},scene);
    helmet.position.set(0,1.8,-.05);helmet.material=paint;helmet.parent=root;
    return {update(){root.setEnabled(visible());applyPose(root,pose())},dispose:()=>root.dispose(false,true)};
  }
  const body=CreateBox(`${id}-body`,{width:1.8,height:.75,depth:4.3},scene);
  body.position.y=.6;body.material=paint;body.parent=root;
  // Windows dark, roof in body colour, as on a real car.
  const cabin=CreateBox(`${id}-cabin`,{width:1.6,height:.45,depth:2.2},scene);
  cabin.position.set(0,1.18,.25);cabin.material=mat(scene,`${id}-glass`,new Color3(.12,.14,.18));cabin.parent=root;
  const roof=CreateBox(`${id}-roof`,{width:1.62,height:.08,depth:2.0},scene);
  roof.position.set(0,1.44,.3);roof.material=paint;roof.parent=root;
  return {
    update(){root.setEnabled(visible());applyPose(root,pose())},
    dispose:()=>root.dispose(false,true)
  };
}

