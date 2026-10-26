import {Color3,CreateBox,Matrix,Mesh,StandardMaterial,TransformNode,Vector3,VertexData,type AbstractMesh,type Scene} from '../engine/babylon';
import {isStaleImport,reportStaleBuild} from '../app/staleBuild';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import type {AnimationGroup} from '@babylonjs/core/Animations/animationGroup';
import type {BaseTexture} from '@babylonjs/core/Materials/Textures/baseTexture';

import {CAR_MODELS,parkedModelIds,parkedSize,type CarModelId,type CarModelSpec} from './carSpecs';
export {CAR_MODEL,CAR_MODELS,type CarModelSpec} from './carSpecs';

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
      import('@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization'),
      // (The 20-vehicle pack's textures are WebP.)
      import('@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp')
    ]);
    const container=await LoadAssetContainerAsync(url,scene,{pluginExtension:'.glb'});
    // Vertex colours (textures baked into them) are linear in glTF; StandardMaterial expects gamma space, as for the
    // material colours below. Converted once here, so moving and parked copies match (moving ones were too dark).
    const done=new Set<unknown>();
    for(const mesh of container.meshes){
      const geometry=(mesh as Mesh).geometry;
      if(!geometry||done.has(geometry))continue;
      done.add(geometry);
      const colours=mesh.getVerticesData(VertexBuffer.ColorKind);
      if(!colours)continue;
      for(let i=0;i<colours.length;i++)if(i%4!==3)colours[i]=Math.pow(colours[i]!,1/2.2);
      (mesh as Mesh).setVerticesData(VertexBuffer.ColorKind,colours,false,4);
    }
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
        std.backFaceCulling=pbr.backFaceCulling;
        std.specularColor=new Color3(.12,.12,.12);
        // Glass is drawn tinted and solid: see-through glass showed the models' bare insides (a bus looked hollow)
        // and sorted badly against the body.
        if(pbr.alpha<1){
          std.diffuseColor=std.diffuseColor.scale(.28);
          std.specularColor=new Color3(.45,.47,.5);
          std.specularPower=48;
        }
        converted.set(pbr,std);
        container.materials.push(std);
      }
      mesh.material=std;
    }
    return container;
  }catch(error){
    console.warn(`[Driving Practice] model not loaded: ${url}`,error);
    if(isStaleImport(error))reportStaleBuild();
    return null;
  }
}

/**
 * One loaded car model, copied for each road user, with the body recoloured
 * and scaled to the collision length.
 */
export class CarModel{
  private count=0;
  /** Each copy's wheel animation, if the model has one (held paused; rolled by distance). */
  private readonly wheels=new WeakMap<TransformNode,{group:AnimationGroup;metresPerLoop:number}>();

  private constructor(private readonly container:AssetContainer,readonly spec:CarModelSpec){}

  /** Loads the model, or resolves null (callers fall back to simple shapes). */
  static async load(scene:Scene,spec:CarModelSpec,variant:'full'|'parked'='full'):Promise<CarModel|null>{
    const url=variant==='parked'?spec.parkedUrl:spec.url;
    if(!url)return null;
    const container=await loadModel(scene,url);
    return container?new CarModel(container,spec):null;
  }

  /** A copy parented to `parent`, scaled to `length` metres, with the body in `colour`. */
  instantiate(parent:TransformNode,id:string,colour:string,length:number):TransformNode{
    const entries=this.container.instantiateModelsToScene(name=>`${id}-${name}`,false,{doNotInstantiate:true});
    const holder=new TransformNode(`${id}-model`,parent.getScene());
    holder.parent=parent;
    holder.rotation.y=this.spec.yawOffset;
    holder.scaling.setAll(length/this.spec.length);
    const loop=this.spec.wheelLoopMetres,group=entries.animationGroups[0];
    if(loop&&group){
      group.start(true);group.pause();
      this.wheels.set(holder,{group,metresPerLoop:loop*length/this.spec.length});
    }else for(const g of entries.animationGroups)g.dispose();
    const paint=new StandardMaterial(`${id}-paint-${++this.count}`,parent.getScene());
    paint.diffuseColor=Color3.FromHexString(colour);
    paint.specularColor=new Color3(.25,.25,.25);
    for(const root of entries.rootNodes){
      root.parent=holder;
      for(const mesh of root.getChildMeshes(false) as AbstractMesh[])
        if(mesh.material?.name===this.spec.paintMaterial){
          // A body with its detail in a grey texture (the new set's): painted over it.
          const texture=(mesh.material as StandardMaterial).diffuseTexture;
          if(texture&&!paint.diffuseTexture)paint.diffuseTexture=texture;
          mesh.material=paint;
        }
    }
    if(this.spec.glassShell)this.addGlassShell(holder);
    return holder;
  }

  /** A dark tinted box just inside the body (in the copy's own frame): open window frames show it as glass. */
  private addGlassShell(holder:TransformNode):void{
    holder.computeWorldMatrix(true);
    for(const m of holder.getChildMeshes(false))m.computeWorldMatrix(true);
    const {min,max}=holder.getHierarchyBoundingVectors(true);
    const toLocal=Matrix.Invert(holder.getWorldMatrix());
    const corners=[min,max,new Vector3(min.x,min.y,max.z),new Vector3(max.x,max.y,min.z)].map(p=>Vector3.TransformCoordinates(p,toLocal));
    const lo=new Vector3(Math.min(...corners.map(c=>c.x)),Math.min(...corners.map(c=>c.y)),Math.min(...corners.map(c=>c.z)));
    const hi=new Vector3(Math.max(...corners.map(c=>c.x)),Math.max(...corners.map(c=>c.y)),Math.max(...corners.map(c=>c.z)));
    const size=hi.subtract(lo);
    // Inset 7 cm a side (inside the panels, clear of the mirrors' width), from a quarter of the height to just under the roof.
    const inset=.07,width=size.x-(this.spec.width-2.55)-2*inset;
    const y0=lo.y+size.y*.25,y1=hi.y-size.y*.05;
    const shell=CreateBox(`${holder.name}-glass-shell`,{width:Math.max(.5,width),height:y1-y0,depth:size.z-2*inset-.1},holder.getScene());
    shell.parent=holder;
    shell.position.set((lo.x+hi.x)/2,(y0+y1)/2,(lo.z+hi.z)/2);
    this.shellMaterial??=(()=>{
      const m=new StandardMaterial('vehicle-glass-shell',holder.getScene());
      m.diffuseColor=new Color3(.07,.08,.095);m.specularColor=new Color3(.4,.42,.45);m.specularPower=48;
      return m;
    })();
    shell.material=this.shellMaterial;
    shell.isPickable=false;
  }
  private shellMaterial:StandardMaterial|null=null;

  /** Turns a copy's wheels to match the distance it has travelled (metres, forwards positive). */
  roll(copy:TransformNode,metres:number):void{
    const w=this.wheels.get(copy);
    if(!w)return;
    const t=((metres/w.metresPerLoop)%1+1)%1;
    w.group.goToFrame(w.group.from+t*(w.group.to-w.group.from));
  }

  /** Adds this model's triangles, posed in the world and with colours baked in (body in `colour`), to `target`. */
  bakeInto(target:BakedGeometry,scene:Scene,colour:string,x:number,y:number,z:number,heading:number):void{
    const entries=this.container.instantiateModelsToScene(name=>`bake-${name}`,false,{doNotInstantiate:true});
    const holder=new TransformNode('bake',scene);
    holder.position.set(x,y,z);
    holder.rotation.y=-heading+this.spec.yawOffset;
    const size=parkedSize(this.spec),centreHeight=size.height*.45;
    holder.scaling.setAll(size.scale);
    for(const root of entries.rootNodes)root.parent=holder;
    const paint=Color3.FromHexString(colour);
    const p=new Vector3(),n=new Vector3();
    for(const mesh of holder.getChildMeshes(false)){
      if(!(mesh instanceof Mesh)||mesh.getTotalVertices()===0)continue;
      const world=mesh.computeWorldMatrix(true);
      const positions=mesh.getVerticesData(VertexBuffer.PositionKind)!,normals=mesh.getVerticesData(VertexBuffer.NormalKind),indices=mesh.getIndices()!;
      // Glass tinted dark, as the moving cars' is (pale glass on a white or silver car read as one colour).
      const own=(mesh.material as StandardMaterial|null)?.diffuseColor??Color3.Gray();
      const c=mesh.material?.name===this.spec.paintMaterial?paint:GLASS.test(mesh.material?.name??'')?own.scale(.28):own;
      // Colours baked into the vertices (the new set's parked models, from their textures), where there are some.
      const vc=mesh.material?.name===this.spec.paintMaterial?null:mesh.getVerticesData(VertexBuffer.ColorKind);
      const stride=vc&&positions.length?vc.length/(positions.length/3):4;
      // (Already in gamma space: converted at load.)
      const colourAt=(v:number):[number,number,number]=>vc?[vc[v*stride]!,vc[v*stride+1]!,vc[v*stride+2]!]:[c.r,c.g,c.b];
      const base=target.positions.length/3;
      if(normals){
        for(let i=0;i<positions.length;i+=3){
          Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,p);
          Vector3.TransformNormalFromFloatsToRef(normals[i]!,normals[i+1]!,normals[i+2]!,world,n);n.normalize();
          target.positions.push(p.x,p.y,p.z);target.normals.push(n.x,n.y,n.z);target.colors.push(...colourAt(i/3),1);
        }
        for(const i of indices)target.indices.push(base+i);
        continue;
      }
      // No normals (simplified parked-car models): each face's normal points out of the car (their triangles do not
      // all wind the same way, and an inward roof or window was unlit: one colour with a black top), and the faces
      // meeting at a corner share their average (smooth, not crumpled facets).
      const w:number[]=[];
      for(let i=0;i<positions.length;i+=3){
        Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,p);
        w.push(p.x,p.y,p.z);
      }
      const smooth=new Float32Array(positions.length);
      for(let t=0;t<indices.length;t+=3){
        const [a,b2,d]=[indices[t]!*3,indices[t+1]!*3,indices[t+2]!*3];
        const e1=new Vector3(w[b2]!-w[a]!,w[b2+1]!-w[a+1]!,w[b2+2]!-w[a+2]!),e2=new Vector3(w[d]!-w[a]!,w[d+1]!-w[a+1]!,w[d+2]!-w[a+2]!);
        Vector3.CrossToRef(e1,e2,n);// (length: twice the area, so larger faces count for more)
        const cx=(w[a]!+w[b2]!+w[d]!)/3-x,cy=(w[a+1]!+w[b2+1]!+w[d+1]!)/3-(y+centreHeight),cz=(w[a+2]!+w[b2+2]!+w[d+2]!)/3-z;
        if(n.x*cx+n.y*cy+n.z*cz<0)n.scaleInPlace(-1);
        for(const k of [a,b2,d]){smooth[k]!+=n.x;smooth[k+1]!+=n.y;smooth[k+2]!+=n.z}
      }
      for(let k=0;k<w.length;k+=3){
        const len=Math.hypot(smooth[k]!,smooth[k+1]!,smooth[k+2]!)||1;
        target.positions.push(w[k]!,w[k+1]!,w[k+2]!);target.normals.push(smooth[k]!/len,smooth[k+1]!/len,smooth[k+2]!/len);target.colors.push(...colourAt(k/3),1);
      }
      for(const i of indices)target.indices.push(base+i);
    }
    entries.dispose();
    holder.dispose();
  }
}

/** Window glass, by its material's name in the parked models. */
const GLASS=/screen|glass|window/i;

export interface BakedGeometry{positions:number[];normals:number[];colors:number[];indices:number[]}

/** Loads every parked-car model once (null where one cannot load). */
export async function loadCarModels(scene:Scene):Promise<Map<CarModelId,CarModel|null>>{
  const ids=parkedModelIds();
  const models=await Promise.all(ids.map(id=>CarModel.load(scene,CAR_MODELS[id],'parked')));
  return new Map(ids.map((id,i)=>[id,models[i]!]));
}

export interface ParkedCar{model:CarModelId;colour:string;x:number;y:number;z:number;heading:number}

/**
 * All parked cars of a location as one static mesh with one material (colours
 * baked into the vertices): a single draw call however many cars there are.
 * A car whose model is missing is drawn as a plain box of the same size.
 */
export function bakeParkedCars(scene:Scene,parent:TransformNode,cars:ParkedCar[],models:Map<CarModelId,CarModel|null>):Mesh[]{
  if(cars.length===0)return [];
  const material=new StandardMaterial('parked-cars',scene);
  material.specularColor=new Color3(.22,.22,.22);
  material.backFaceCulling=false;
  // One mesh per 100 m section, so each view draws only the cars in front of it, and none further than 160 m away
  // (a generated area has hundreds of parked cars).
  const sections=new Map<string,ParkedCar[]>();
  for(const car of cars){
    const key=`${Math.floor(car.x/100)},${Math.floor(car.z/100)}`;
    sections.set(key,[...(sections.get(key)??[]),car]);
  }
  return [...sections].map(([key,list])=>{
    const mesh=bakeSection(scene,parent,`parked-cars-${key}`,list,models,material);
    mesh.addLODLevel(160,null);
    return mesh;
  });
}

function bakeSection(scene:Scene,parent:TransformNode,name:string,cars:ParkedCar[],models:Map<CarModelId,CarModel|null>,material:StandardMaterial):Mesh{
  const g:BakedGeometry={positions:[],normals:[],colors:[],indices:[]};
  for(const car of cars){
    const model=models.get(car.model);
    if(model){model.bakeInto(g,scene,car.colour,car.x,car.y,car.z,car.heading);continue}
    const spec=parkedSize(CAR_MODELS[car.model]);
    const box=VertexData.CreateBox({width:spec.width,depth:spec.length,height:spec.height*.85});
    const c=Color3.FromHexString(car.colour),base=g.positions.length/3;
    const cos=Math.cos(car.heading),sin=Math.sin(car.heading);
    for(let i=0;i<box.positions!.length;i+=3){
      const [x,y,z]=[box.positions![i]!,box.positions![i+1]!+spec.height*.425,box.positions![i+2]!];
      // Local −Z is the car's forward; turn clockwise by the heading.
      g.positions.push(car.x+x*cos-z*sin,car.y+y,car.z+x*sin+z*cos);
      const [nx,ny,nz]=[box.normals![i]!,box.normals![i+1]!,box.normals![i+2]!];
      g.normals.push(nx*cos-nz*sin,ny,nx*sin+nz*cos);
      g.colors.push(c.r,c.g,c.b,1);
    }
    for(const i of box.indices!)g.indices.push(base+i);
  }
  const mesh=new Mesh(name,scene);
  const data=new VertexData();
  data.positions=g.positions;data.normals=g.normals;data.colors=g.colors;data.indices=g.indices;
  data.applyToMesh(mesh,false);
  mesh.material=material;
  mesh.parent=parent;
  mesh.isPickable=false;
  mesh.freezeWorldMatrix();
  return mesh;
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
  'quaternius-downtown-building-small-1':{url:'assets/models/buildings/quaternius-downtown-building-small-1.glb',storage:'public'},
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
