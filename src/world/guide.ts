import {Color3,CreateDisc,CreateGround,StandardMaterial,TransformNode,type Scene} from '../engine/babylon';
import {rotationYFromHeading} from '../engine/babylonAdapter';
import type {Vec2} from '../contracts';

/**
 * Painted guidance for an exercise: green chevrons along the intended path
 * and white arrows for the traffic direction. Decorative only.
 */
export function buildGuide(scene:Scene,path:Vec2[],arrows:Vec2[]):{dispose():void}{
  const root=new TransformNode('exercise-guide',scene);
  const green=new StandardMaterial('guide-green',scene);
  green.diffuseColor=new Color3(.2,.8,.45);
  green.emissiveColor=new Color3(.1,.45,.25);
  green.alpha=.7;
  const white=new StandardMaterial('guide-white',scene);
  white.diffuseColor=new Color3(.95,.95,.93);
  white.emissiveColor=new Color3(.25,.25,.25);
  const chevron=(x:number,z:number,heading:number,size:number,mat:StandardMaterial,name:string)=>{
    // A triangle pointing along `heading`.
    const tri=CreateDisc(name,{radius:size,tessellation:3},scene);
    tri.rotation.x=Math.PI/2;
    tri.rotation.y=rotationYFromHeading(heading)+Math.PI/2;
    tri.position.set(x,.015,z);
    tri.material=mat;
    tri.parent=root;
  };
  // Chevrons every 1.5 m along the path.
  let carry=0;
  for(let i=0;i<path.length-1;i++){
    const a=path[i]!,b=path[i+1]!;
    const len=Math.hypot(b.x-a.x,b.z-a.z);
    const heading=Math.atan2(b.x-a.x,-(b.z-a.z));
    for(let s=carry;s<len;s+=1.5)chevron(a.x+(b.x-a.x)*s/len,a.z+(b.z-a.z)*s/len,heading,.32,green,`guide-chevron-${i}-${s.toFixed(1)}`);
    carry=(carry-len)%1.5;
    if(carry<0)carry+=1.5;
  }
  // Lane arrows: a stem and a head, pointing the way traffic flows (north, -Z).
  arrows.forEach((p,i)=>{
    const stem=CreateGround(`guide-arrow-stem-${i}`,{width:.25,height:2.2},scene);
    stem.position.set(p.x,.012,p.z+1.1);
    stem.material=white;
    stem.parent=root;
    chevron(p.x,p.z-.2,0,.65,white,`guide-arrow-head-${i}`);
  });
  return {dispose:()=>root.dispose(false,true)};
}
