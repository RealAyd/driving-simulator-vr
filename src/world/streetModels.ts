import {TransformNode,type Scene} from '../engine/babylon';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import type {Location} from '../contracts';
import {loadModel} from '../assets/models';
import type {Shelter} from './signage';

/**
 * Street furniture models from asset Batch A (content/assets/register.json), used in place of the
 * simple drawn shapes wherever the scene already puts that object: Belisha beacons at zebras,
 * signal heads where an exercise runs signals, and bus shelters at mapped stops. Positions,
 * colliders and scoring are unchanged; where a model cannot load the drawn shape stays.
 * Models are in metres, origin at ground level, front facing +Z.
 */
export const STREET_MODELS={
  beacon:'assets/models/street/batch-a-belisha-beacon.glb',
  shelter:'assets/models/street/batch-a-bus-shelter-modern.glb',
  signalGreen:'assets/models/street/batch-a-uk-vehicle-signal-green.glb'
} as const;
export type StreetModelId=keyof typeof STREET_MODELS;

/** The shelter model's frame (pillar span and depth) that the planned footprint is fitted to. */
const SHELTER_MODEL={length:4.4,depth:1.55};

export class StreetModels{
  private copies=0;

  private constructor(private readonly scene:Scene,private readonly models:Map<StreetModelId,AssetContainer>){}

  /** Loads every model; any that fail are left out (the drawn shapes are kept for those). */
  static async load(scene:Scene):Promise<StreetModels>{
    const entries=await Promise.all((Object.keys(STREET_MODELS) as StreetModelId[]).map(async id=>[id,await loadModel(scene,STREET_MODELS[id])] as const));
    return new StreetModels(scene,new Map(entries.filter((e):e is readonly [StreetModelId,AssetContainer]=>e[1]!==null)));
  }

  get available():StreetModelId[]{return [...this.models.keys()]}
  has(id:StreetModelId):boolean{return this.models.has(id)}

  /** A static copy under `parent`; `rotationY` turns the model's +Z front (right-handed scene). */
  private place(id:StreetModelId,parent:TransformNode,name:string,x:number,y:number,z:number,rotationY:number,scale?:{x:number;z:number}):TransformNode|null{
    const container=this.models.get(id);
    if(!container)return null;
    const holder=new TransformNode(`${name}-model`,this.scene);
    holder.parent=parent;
    holder.position.set(x,y,z);
    holder.rotation.y=rotationY;
    if(scale)holder.scaling.set(scale.x,1,scale.z);
    const copy=container.instantiateModelsToScene(n=>`${name}-${n}-${this.copies++}`,false,{doNotInstantiate:true});
    for(const root of copy.rootNodes)root.parent=holder;
    for(const mesh of holder.getChildMeshes()){mesh.isPickable=false;mesh.freezeWorldMatrix()}
    return holder;
  }

  /** Belisha beacons drawn by buildWorld (a pole and globe each side of every zebra) become the model. */
  replaceBeacons(root:TransformNode,location:Location):number{
    if(!this.has('beacon'))return 0;
    let n=0;
    for(const crossing of location.crossings)for(const side of [-1,1]){
      const pole=root.getChildMeshes(false,m=>m.name===`${crossing.id}-beacon-pole-${side}`)[0];
      const globe=root.getChildMeshes(false,m=>m.name===`${crossing.id}-beacon-${side}`)[0];
      if(!pole)continue;
      // The drawn pole is 2.6 m tall, centred 1.3 m above the footway.
      if(!this.place('beacon',root,pole.name,pole.position.x,pole.position.y-1.3,pole.position.z,0))continue;
      pole.setEnabled(false);
      globe?.setEnabled(false);
      n++;
    }
    return n;
  }

  /** Bus shelters at the planned footprints (signage.ts), fitted to the footprint the collider uses. */
  placeShelters(parent:TransformNode,shelters:readonly Shelter[]):number{
    let n=0;
    for(const s of shelters){
      // The model's open front (+Z) faces the road: the opposite of `back`.
      const facing=Math.atan2(-s.back.x,-s.back.z);
      if(this.place('shelter',parent,s.id,s.x,s.y,s.z,facing,{x:s.length/SHELTER_MODEL.length,z:s.depth/SHELTER_MODEL.depth}))n++;
    }
    return n;
  }

  /**
   * Signal heads drawn by buildSignalHeads (signals.ts) for green signals become the model, which shows
   * green. Their nodes face the approaching traffic with the head's front on local −Z.
   */
  replaceSignalHeads(states:Record<string,'green'>):number{
    if(!this.has('signalGreen'))return 0;
    const root=this.scene.getTransformNodeByName('signal-heads');
    if(!root)return 0;
    let n=0;
    for(const node of root.getChildTransformNodes(true)){
      const crossingId=node.name.replace(/^signal-/,'').replace(/--?1$/,'');
      if(states[crossingId]!=='green')continue;
      if(!this.place('signalGreen',node,node.name,0,0,0,Math.PI))continue;
      for(const mesh of node.getChildMeshes(true))mesh.setEnabled(false);
      n++;
    }
    return n;
  }
}
