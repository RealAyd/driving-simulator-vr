import {
  Color3,DirectionalLight,HemisphericLight,MeshBuilder,StandardMaterial,TransformNode,Vector3,
  type Mesh,type Scene
} from '@babylonjs/core';
import {degToRad,type Location,type Road} from '../contracts';
import {rotationYFromHeading} from '../engine/babylonAdapter';
import type {QualityProfile} from '../engine/quality';
import {roadHalfWidth} from './roadGeometry';

export interface BuiltWorld{
  root:TransformNode;
  /** Meshes that can hide hazards from the driver (used by later stages). */
  occluders:Mesh[];
  dispose():void;
}

const SKY=new Color3(.62,.76,.88);

function material(scene:Scene,name:string,color:Color3,specular=.05):StandardMaterial{
  const m=new StandardMaterial(name,scene);
  m.diffuseColor=color;
  m.specularColor=new Color3(specular,specular,specular);
  return m;
}

/** Offsets a centreline sideways; positive offset is to the right of travel. */
function offsetLine(road:Road,offset:number,y:number):Vector3[]{
  const pts=road.centreline;
  return pts.map((p,i)=>{
    const a=pts[Math.max(0,i-1)]!,b=pts[Math.min(pts.length-1,i+1)]!;
    const len=Math.hypot(b.x-a.x,b.z-a.z)||1;
    const ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
    return new Vector3(p.x+(-uz)*offset,y,p.z+ux*offset);
  });
}

function strip(scene:Scene,name:string,road:Road,from:number,to:number,y:number,mat:StandardMaterial,parent:TransformNode):Mesh{
  const mesh=MeshBuilder.CreateRibbon(name,{pathArray:[offsetLine(road,from,y),offsetLine(road,to,y)],sideOrientation:2},scene);
  mesh.material=mat;
  mesh.parent=parent;
  return mesh;
}

/** Dashed or solid line markings laid along a centreline offset. */
function markings(scene:Scene,road:Road,offset:number,dash:number,gap:number,width:number,mat:StandardMaterial,parent:TransformNode,y:number){
  const pts=road.centreline;
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i]!,b=pts[i+1]!;
    const len=Math.hypot(b.x-a.x,b.z-a.z);
    const ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
    const heading=Math.atan2(ux,-uz);
    const step=gap>0?dash+gap:len;
    for(let s=0;s<len;s+=step){
      const l=Math.min(gap>0?dash:len,len-s);
      const c=s+l/2;
      const line=MeshBuilder.CreateGround(`marking-${road.id}-${offset}-${i}-${s}`,{width,height:l},scene);
      line.position.set(a.x+ux*c+(-uz)*offset,y,a.z+uz*c+ux*offset);
      line.rotation.y=rotationYFromHeading(heading);
      line.material=mat;
      line.parent=parent;
    }
  }
}

export function buildWorld(scene:Scene,location:Location,quality:QualityProfile):BuiltWorld{
  scene.clearColor.set(SKY.r,SKY.g,SKY.b,1);
  scene.ambientColor=new Color3(.3,.3,.3);
  const root=new TransformNode(`location-${location.id}`,scene);

  const hemi=new HemisphericLight('sky-light',new Vector3(0,1,0),scene);
  hemi.intensity=.75;
  hemi.groundColor=new Color3(.35,.38,.33);
  const sun=new DirectionalLight('sun',new Vector3(-.4,-1,.3),scene);
  sun.intensity=.65;

  const tarmac=material(scene,'tarmac',new Color3(.24,.25,.27));
  const pavement=material(scene,'pavement',new Color3(.58,.57,.55));
  const kerb=material(scene,'kerb',new Color3(.7,.7,.68));
  const grass=material(scene,'grass',new Color3(.33,.47,.27));
  const white=material(scene,'road-white',new Color3(.95,.95,.93));
  white.emissiveColor=new Color3(.25,.25,.25);

  const ground=MeshBuilder.CreateGround('verge',{width:2000,height:2000},scene);
  ground.position.y=-.02;
  ground.material=grass;
  ground.parent=root;

  for(const road of location.roads){
    const half=roadHalfWidth(road);
    const y=road.surfaceHeight;
    strip(scene,`carriageway-${road.id}`,road,-half,half,y,tarmac,root);
    for(const side of [-1,1]){
      const inner=side*half,outer=side*(half+road.pavementWidth);
      strip(scene,`pavement-${road.id}-${side}`,road,inner,outer,y+road.kerbHeight,pavement,root);
      // Kerb face between carriageway and raised pavement.
      const face=MeshBuilder.CreateRibbon(`kerb-${road.id}-${side}`,{
        pathArray:[offsetLine(road,inner,y),offsetLine(road,inner,y+road.kerbHeight)],sideOrientation:2
      },scene);
      face.material=kerb;
      face.parent=root;
    }
    const lineY=y+.006;
    if(road.markings.centre==='dashed')markings(scene,road,0,3,6,.1,white,root,lineY);        // UK centre line: short dash, long gap
    else if(road.markings.centre==='hazard')markings(scene,road,0,6,3,.15,white,root,lineY);   // hazard warning line
    else if(road.markings.centre==='solid')markings(scene,road,0,0,0,.1,white,root,lineY);
    if(road.markings.edges)for(const side of [-1,1])markings(scene,road,side*(half-.2),0,0,.1,white,root,lineY);
  }

  const occluders:Mesh[]=[];
  const blockColours:Record<string,Color3>={
    building:new Color3(.66,.45,.36),
    wall:new Color3(.55,.5,.45),
    hedge:new Color3(.2,.36,.18),
    'parked-vehicle':new Color3(.85,.86,.88)
  };
  const blockMaterials=new Map<string,StandardMaterial>();
  for(const block of location.blocks){
    if(quality.decorativeDetail==='reduced'&&!block.occludes)continue;
    let mat=blockMaterials.get(block.kind);
    if(!mat){
      mat=material(scene,`block-${block.kind}`,blockColours[block.kind]!);
      blockMaterials.set(block.kind,mat);
    }
    const box=MeshBuilder.CreateBox(block.id,{width:block.size.width,depth:block.size.depth,height:block.size.height},scene);
    box.position.set(block.position.x,block.size.height/2,block.position.z);
    box.rotation.y=rotationYFromHeading(degToRad(block.headingDeg));
    box.material=mat;
    box.parent=root;
    if(block.occludes)occluders.push(box);
  }

  return {
    root,
    occluders,
    dispose(){
      root.dispose(false,true);
      hemi.dispose();
      sun.dispose();
    }
  };
}
