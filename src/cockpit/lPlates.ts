import {Color3,CreateBox,CreatePlane,DynamicTexture,Matrix,Mesh,Ray,StandardMaterial,TransformNode,Vector3} from '../engine/babylon';

/** UK L plate (learner): a red L on a white square, about 18 cm a side (drawn a little larger, to read at a distance). */
const SIZE=.24;

/**
 * L plates on the front and back of the learner's car body (as the law requires when a learner drives), at bumper
 * height, and a driving-school roof box with an L each way: placed on the body's own outline, so they suit whichever
 * car model is drawn. Children of `body`'s parent;
 * shown and hidden with the body by the caller.
 */
export function addLPlates(body:TransformNode):TransformNode{
  const scene=body.getScene(),parent=body.parent as TransformNode;
  const node=new TransformNode('l-plates',scene);
  node.parent=parent;
  // The body's outline in the car's own frame.
  parent.computeWorldMatrix(true);body.computeWorldMatrix(true);
  for(const m of body.getChildMeshes(false))m.computeWorldMatrix(true);
  const {min,max}=body.getHierarchyBoundingVectors(true);
  const toLocal=Matrix.Invert(parent.getWorldMatrix());
  const corners=[0,1,2,3,4,5,6,7].map(i=>Vector3.TransformCoordinates(new Vector3(i&1?max.x:min.x,i&2?max.y:min.y,i&4?max.z:min.z),toLocal));
  const lo=new Vector3(Math.min(...corners.map(c=>c.x)),Math.min(...corners.map(c=>c.y)),Math.min(...corners.map(c=>c.z)));
  const hi=new Vector3(Math.max(...corners.map(c=>c.x)),Math.max(...corners.map(c=>c.y)),Math.max(...corners.map(c=>c.z)));

  const texture=new DynamicTexture('l-plate-texture',{width:128,height:128},scene,true);
  const ctx=texture.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,128,128);
  ctx.strokeStyle='#b8bcc2';ctx.lineWidth=4;ctx.strokeRect(2,2,124,124);
  ctx.fillStyle='#d4141c';
  ctx.fillRect(38,18,22,92);ctx.fillRect(38,88,56,22);
  texture.update();
  const material=new StandardMaterial('l-plate',scene);
  material.diffuseTexture=texture;
  material.emissiveColor=new Color3(.35,.35,.35);
  material.specularColor=Color3.Black();

  // Bumper height (where the number plate was), just proud of each end.
  const y=lo.y+(hi.y-lo.y)*.36;
  for(const [name,z] of [['front',lo.z-.015],['back',hi.z+.015]] as const){
    const plate=CreatePlane(`l-plate-${name}`,{size:SIZE,sideOrientation:Mesh.DOUBLESIDE},scene);
    plate.parent=node;
    plate.position.set((lo.x+hi.x)/2,y,z);
    plate.material=material;
    plate.isPickable=false;
  }
  // The roof box: white, a little behind the middle of the roof, an L facing forward and back.
  const roof=new StandardMaterial('l-roof-box',scene);
  roof.diffuseColor=new Color3(.95,.95,.94);
  roof.specularColor=new Color3(.2,.2,.2);
  const box=CreateBox('l-roof-box',{width:.6,height:.24,depth:.32},scene);
  box.parent=node;box.material=roof;box.isPickable=false;
  const zMid=(lo.z+hi.z)/2,xMid=(lo.x+hi.x)/2;
  // On the roof itself (straight down onto the body; an aerial can stand above it), else the top of the outline.
  const toWorld=parent.getWorldMatrix(),top=Vector3.TransformCoordinates(new Vector3(xMid,hi.y+1,zMid),toWorld);
  const down=Vector3.TransformNormal(new Vector3(0,-1,0),toWorld).normalize();
  let roofY=hi.y;
  const hits=body.getChildMeshes(false).map(m=>new Ray(top,down,10).intersectsMesh(m as Mesh)).filter(h=>h.hit&&h.pickedPoint);
  if(hits.length){
    const nearest=hits.reduce((a,b)=>a.distance<b.distance?a:b);
    roofY=Vector3.TransformCoordinates(nearest.pickedPoint!,toLocal).y;
  }
  box.position.set(xMid,roofY+.11,zMid);
  for(const [name,z] of [['front',zMid-.165],['back',zMid+.165]] as const){
    const plate=CreatePlane(`l-roof-${name}`,{size:.2,sideOrientation:Mesh.DOUBLESIDE},scene);
    plate.parent=node;
    plate.position.set(xMid,roofY+.11,z);
    plate.material=material;
    plate.isPickable=false;
  }
  return node;
}
