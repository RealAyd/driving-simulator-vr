import {Color3,StandardMaterial,TransformNode,type AbstractMesh,type Scene} from '../engine/babylon';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import type {BaseTexture} from '@babylonjs/core/Materials/Textures/baseTexture';

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

/** The glTF PBR material properties we carry over (Babylon's PBRMaterial). */
interface GltfMaterial{
  name:string;
  albedoColor?:Color3;
  albedoTexture?:BaseTexture|null;
  emissiveColor?:Color3;
  emissiveTexture?:BaseTexture|null;
  alpha:number;
  backFaceCulling:boolean;
}

/**
 * Loads a GLB into an asset container, or resolves null (missing file, e.g. a
 * licensed asset that is not deployed). glTF's physically based materials are
 * swapped for StandardMaterial with the same colours and textures: cheaper on
 * phones and lit like the rest of the scene.
 */
export async function loadModel(scene:Scene,url:string):Promise<AssetContainer|null>{
  try{
    const [{LoadAssetContainerAsync}]=await Promise.all([
      import('@babylonjs/core/Loading/sceneLoader'),
      import('@babylonjs/loaders/glTF/2.0/glTFLoader'),
      // Our GLBs store quantised vertex data (see tools/assets).
      import('@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization')
    ]);
    const container=await LoadAssetContainerAsync(url,scene,{pluginExtension:'.glb'});
    const converted=new Map<unknown,StandardMaterial>();
    for(const mesh of container.meshes){
      const pbr=mesh.material as unknown as GltfMaterial|null;
      if(!pbr)continue;
      let std=converted.get(pbr);
      if(!std){
        std=new StandardMaterial(pbr.name,scene);
        // glTF colours are linear; StandardMaterial expects gamma space.
        std.diffuseColor=(pbr.albedoColor??Color3.Gray()).toGammaSpace();
        if(pbr.albedoTexture)std.diffuseTexture=pbr.albedoTexture;
        if(pbr.emissiveColor)std.emissiveColor=pbr.emissiveColor.toGammaSpace();
        if(pbr.emissiveTexture)std.emissiveTexture=pbr.emissiveTexture;
        std.alpha=pbr.alpha;
        std.backFaceCulling=pbr.backFaceCulling;
        std.specularColor=new Color3(.12,.12,.12);
        converted.set(pbr,std);
        container.materials.push(std);
      }
      mesh.material=std;
    }
    return container;
  }catch(error){
    console.warn(`[Driving Practice] model not loaded: ${url}`,error);
    return null;
  }
}

/**
 * One loaded car model, copied for each road user, with the body recoloured
 * and scaled to the collision length.
 */
export class CarModel{
  private count=0;

  private constructor(private readonly container:AssetContainer,readonly spec:CarModelSpec){}

  /** Loads the model, or resolves null (callers fall back to simple shapes). */
  static async load(scene:Scene,spec:CarModelSpec):Promise<CarModel|null>{
    const container=await loadModel(scene,spec.url);
    return container?new CarModel(container,spec):null;
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

/** Static scenery models by asset id (content/assets/register.json). */
export interface PropAsset{
  url:string;
  /**
   * public: shipped in the repository. private: licence does not allow public
   * redistribution (or is unconfirmed); the file exists only where it was
   * built locally or deployed privately, and is skipped when absent.
   */
  storage:'public'|'private';
}

export const PROP_ASSETS:Record<string,PropAsset>={
  'a3js-london-terrace-house-low':{url:'assets/licensed/a3js-london-terrace-house-low.glb',storage:'private'},
  'cadmando-traffic-lights':{url:'assets/licensed/cadmando-traffic-lights.glb',storage:'private'},
  supermarket:{url:'assets/licensed/supermarket.glb',storage:'private'}
};

/** Loads each scenery model once and places copies; missing models are skipped. */
export class PropLibrary{
  private readonly loaded=new Map<string,Promise<AssetContainer|null>>();
  /** Asset ids that loaded, for the About panel. */
  readonly available=new Set<string>();

  constructor(private readonly scene:Scene){}

  private container(assetId:string):Promise<AssetContainer|null>{
    const asset=PROP_ASSETS[assetId];
    if(!asset)return Promise.resolve(null);
    if(!this.loaded.has(assetId))this.loaded.set(assetId,(async()=>{
      // A private asset is often simply not deployed: check first so a missing file is quiet.
      if(asset.storage==='private'){
        const head=await fetch(asset.url,{method:'HEAD'}).catch(()=>null);
        if(!head?.ok||/text\/html/.test(head.headers.get('content-type')??''))return null;
      }
      const c=await loadModel(this.scene,asset.url);
      if(c)this.available.add(assetId);
      return c;
    })());
    return this.loaded.get(assetId)!;
  }

  /**
   * Places a copy under `parent` at a ground position. `facingDeg` is the
   * compass direction the model's front faces (models are authored facing +Z,
   * which is south in the simulator). Resolves null if the model is unavailable.
   */
  async place(parent:TransformNode,assetId:string,name:string,x:number,z:number,facingDeg:number):Promise<TransformNode|null>{
    const c=await this.container(assetId);
    if(!c||parent.isDisposed())return null;
    const entries=c.instantiateModelsToScene(n=>`${name}-${n}`,false,{doNotInstantiate:true});
    const holder=new TransformNode(name,this.scene);
    holder.parent=parent;
    holder.position.set(x,0,z);
    // Front +Z (compass 180) turned clockwise to face `facingDeg`; RH scene: rotation.y = -clockwise.
    holder.rotation.y=-(facingDeg-180)*Math.PI/180;
    for(const root of entries.rootNodes)root.parent=holder;
    return holder;
  }
}
