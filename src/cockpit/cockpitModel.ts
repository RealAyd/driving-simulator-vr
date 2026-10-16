import {Color3,MeshBuilder,StandardMaterial,TransformNode,type Scene} from '@babylonjs/core';
import type {SeatConfig} from './seat';

/**
 * Placeholder right-hand-drive interior and body, parented to the vehicle
 * node so its transform comes from the vehicle pose only. The dashboard top
 * sits low enough that the road is visible from about 6 m ahead.
 */
export function buildCockpit(scene:Scene,vehicleNode:TransformNode,seat:SeatConfig):{dispose():void}{
  const root=new TransformNode('cockpit',scene);
  root.parent=vehicleNode;
  const mat=(name:string,c:Color3)=>{
    const m=new StandardMaterial(name,scene);
    m.diffuseColor=c;
    m.specularColor=new Color3(.04,.04,.04);
    return m;
  };
  const trim=mat('cockpit-trim',new Color3(.09,.1,.12));
  const paint=mat('car-paint',new Color3(.78,.12,.12));
  const glassFrame=mat('pillar',new Color3(.05,.05,.06));

  const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial)=>{
    const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);
    mesh.material=m;
    mesh.parent=root;
    return mesh;
  };
  // Full-width dashboard: top at 0.95 m, so the road is visible ~8 m ahead.
  box('dashboard',1.76,.22,.55,0,.84,-.98,trim);
  box('bonnet',1.7,.08,1.3,0,.78,-1.9,paint);
  // Interior shell so nothing outside shows through the doors, floor or roof.
  for(const side of [-1,1]){
    box(`door-${side}`,.06,.62,2.3,side*.88,.62,.05,trim);
  }
  box('floor',1.76,.04,2.6,0,.3,.05,trim);
  box('front-bulkhead',1.76,.46,.05,0,.52,-1.24,trim);
  box('roof-lining',1.76,.04,1.9,0,1.58,.45,trim);
  box('rear-panel',1.76,1.3,.06,0,.95,1.2,trim);

  const wheel=MeshBuilder.CreateTorus('steering-wheel',{diameter:.38,thickness:.035,tessellation:32},scene);
  wheel.position.set(seat.eye.x,.93,-.5);
  wheel.rotation.x=Math.PI/2-.45;
  wheel.material=trim;
  wheel.parent=root;

  // Thin A-pillars and a slim windscreen header frame the view.
  for(const side of [-1,1]){
    const pillar=MeshBuilder.CreateCylinder(`a-pillar-${side}`,{height:.78,diameter:.07},scene);
    pillar.position.set(side*.82,1.24,-.86);
    pillar.rotation.x=-.8;
    pillar.material=glassFrame;
    pillar.parent=root;
  }
  box('windscreen-header',1.76,.05,.12,0,1.56,-.52,glassFrame);

  // Exterior body for other cameras (mirrors, later). Seen from inside, its
  // faces are back faces and are culled, so it does not block the driver.
  const body=MeshBuilder.CreateBox('car-body',{width:1.8,height:1.0,depth:4.3},scene);
  body.position.set(0,.75,0);
  body.material=paint;
  body.parent=root;

  return {dispose:()=>root.dispose(false,true)};
}
