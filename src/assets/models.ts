import {Color3,StandardMaterial,TransformNode,type AbstractMesh,type Scene} from '../engine/babylon';
import type {AssetContainer} from '@babylonjs/core/assetContainer';

/** A vehicle model shipped in public/assets (see content/assets/register.json). */
export interface CarModelSpec{
  id:string;
  /** Relative to the page. */
  url:string;
  /** Material that is the body paint, recoloured per road user. */
  paintMaterial:string;
  /** Turn needed to face the simulator's forward (-Z); the model faces +Z. */
  yawOffset:number;
  /** Model length in its own units (metres), to scale to a collision length. */
  length:number;
}

export const CAR_MODEL:CarModelSpec={
  id:'quaternius-normal-car-1',
  url:'assets/models/vehicles/quaternius-normal-car-1.glb',
  paintMaterial:'Blue',
  yawOffset:Math.PI,
  length:4.22
};

/**
 * One loaded car model, copied for each road user. glTF's physically based
 * materials are swapped for StandardMaterial of the same colour: cheaper on
 * phones and lit like the rest of the scene.
 */
export class CarModel{
  private count=0;

  private constructor(private readonly container:AssetContainer,readonly spec:CarModelSpec){}

  /** Loads the model, or resolves null (callers fall back to simple shapes). */
  static async load(scene:Scene,spec:CarModelSpec):Promise<CarModel|null>{
    try{
      const [{LoadAssetContainerAsync}]=await Promise.all([
        import('@babylonjs/core/Loading/sceneLoader'),
        import('@babylonjs/loaders/glTF/2.0/glTFLoader'),
        // Our GLBs store quantised vertex data (see tools/assets).
        import('@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization')
      ]);
      const container=await LoadAssetContainerAsync(spec.url,scene,{pluginExtension:'.glb'});
      for(const mesh of container.meshes){
        const pbr=mesh.material as (StandardMaterial&{albedoColor?:Color3})|null;
        if(!pbr)continue;
        const std=new StandardMaterial(pbr.name,scene);
        // glTF colours are linear; StandardMaterial expects gamma space.
        std.diffuseColor=(pbr.albedoColor??Color3.Gray()).toGammaSpace();
        std.specularColor=new Color3(.12,.12,.12);
        mesh.material=std;
        container.materials.push(std);
      }
      return new CarModel(container,spec);
    }catch(error){
      console.warn('[Driving Practice] car model not loaded; using simple shapes',error);
      return null;
    }
  }

  /** A copy parented to `parent`, scaled to `length` metres, with the body in `colour`. */
  instantiate(parent:TransformNode,id:string,colour:string,length:number):TransformNode{
    const entries=this.container.instantiateModelsToScene(name=>`${id}-${name}`,false,{doNotInstantiate:true});
    const holder=new TransformNode(`${id}-model`,parent.getScene());
    holder.parent=parent;
    holder.rotation.y=this.spec.yawOffset;
    holder.scaling.setAll(length/this.spec.length);
    const paint=new StandardMaterial(`${id}-paint-${++this.count}`,parent.getScene());
    paint.diffuseColor=Color3.FromHexString(colour);
    paint.specularColor=new Color3(.25,.25,.25);
    for(const root of entries.rootNodes){
      root.parent=holder;
      for(const mesh of root.getChildMeshes(false) as AbstractMesh[])
        if(mesh.material?.name===this.spec.paintMaterial)mesh.material=paint;
    }
    return holder;
  }
}
