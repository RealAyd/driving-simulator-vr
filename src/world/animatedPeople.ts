import {TransformNode,type Scene} from '../engine/babylon';
import type {AnimationGroup} from '@babylonjs/core/Animations/animationGroup';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import {applyPose} from '../engine/babylonAdapter';
import {loadModel} from '../assets/models';
import type {FigurePose} from './crowd';

/**
 * Animated people (the project owner's Tripo characters, content/assets/register.json): the people nearest the
 * car, and every person who is part of an exercise, are drawn as one of these rigged models walking, standing or
 * looking along the road; everyone else keeps the light instanced figures (peopleMesh.ts). Positions come from
 * the same poses, so where anyone stands or walks is unchanged. Animation follows distance walked and
 * simulated time, never frame rate.
 */

export const PERSON_MODELS=[
  'assets/models/people/person-man-jacket.glb',
  'assets/models/people/person-man-zip-jacket.glb',
  'assets/models/people/person-woman-jacket.glb',
  'assets/models/people/person-older-man-coat.glb'
] as const;
/** Used if a model's height cannot be measured (the four models stand 1.72 to 1.83 m). */
const FALLBACK_HEIGHT=1.78;
/** Walking speed the Walk clip was made for (one 1.1 s stride cycle): the clip advances with distance walked. */
const CLIP_WALK_SPEED=1.3;
/** Copies of each model (people drawn animated at once, at most this many per look). */
const COPIES=3;

type Clip='Walk'|'Idle'|'LookLeft'|'LookRight';
interface Slot{model:number;height:number;node:TransformNode;inner:TransformNode;clips:Map<string,AnimationGroup>;playing:AnimationGroup|null;owner:string|null}

export interface AnimatedFigure{id:string;height:number;pose:FigurePose;priority:boolean}

/**
 * Height of a skinned model as drawn: the skeleton's own scale (the armature carries the character's size) is only
 * applied through the skin, so the mesh's unskinned bounds cannot be used.
 */
function measureHeight(inner:TransformNode,idle:AnimationGroup|undefined):number{
  if(idle){idle.start(false,1);idle.pause();idle.goToFrame(idle.from)}
  inner.computeWorldMatrix(true);
  for(const m of inner.getChildMeshes()){m.computeWorldMatrix(true);m.skeleton?.prepare(true);m.refreshBoundingInfo({applySkeleton:true})}
  const {min,max}=inner.getHierarchyBoundingVectors(true);
  idle?.stop();
  const h=max.y-min.y;
  return Number.isFinite(h)&&h>.5&&h<3?h:FALLBACK_HEIGHT;
}

const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0};

export class AnimatedPeople{
  private readonly slots:Slot[]=[];
  /** Each model's standing height as drawn (metres, skinned, Idle pose): people are scaled from this to their own height. */
  readonly modelHeights:number[]=[];

  private constructor(private readonly scene:Scene,containers:Array<AssetContainer|null>){
    containers.forEach((c,model)=>{
      if(!c)return;
      for(let k=0;k<COPIES;k++){
        const node=new TransformNode(`animated-person-${model}-${k}`,scene);
        const inner=new TransformNode(`animated-person-${model}-${k}-model`,scene);
        inner.parent=node;
        // The models face +Z; the simulator's forward is −Z (as for the car models).
        inner.rotation.y=Math.PI;
        const copy=c.instantiateModelsToScene(n=>`person-${model}-${k}-${n}`,false,{doNotInstantiate:true});
        for(const r of copy.rootNodes)r.parent=inner;
        for(const m of inner.getChildMeshes()){m.isPickable=false;m.alwaysSelectAsActiveMesh=true}
        // Copies' clips are renamed with the copy's prefix: keyed by the clip's own name.
        const prefix=`person-${model}-${k}-`;
        const clips=new Map(copy.animationGroups.map(g=>{g.stop();return [g.name.startsWith(prefix)?g.name.slice(prefix.length):g.name,g] as const}));
        if(k===0)this.modelHeights[model]=measureHeight(inner,clips.get('Idle'));
        node.setEnabled(false);
        this.slots.push({model,height:this.modelHeights[model]!,node,inner,clips,playing:null,owner:null});
      }
    });
  }

  /** Loads the models; null if none can be loaded (the instanced figures are then used for everyone). */
  static async load(scene:Scene):Promise<AnimatedPeople|null>{
    const containers=await Promise.all(PERSON_MODELS.map(url=>loadModel(scene,url)));
    return containers.some(c=>c)?new AnimatedPeople(scene,containers):null;
  }

  get capacity(){return this.slots.length}

  /** The model a person always gets (so the same person keeps the same look as they come and go). */
  modelFor(id:string):number{
    const models=[...new Set(this.slots.map(s=>s.model))];
    return models[hash(id)%models.length]!;
  }

  /**
   * Draws `wanted` (people who are part of an exercise first, then the nearest) with free copies of their model;
   * returns the ids drawn, so the instanced renderer leaves them out.
   */
  update(wanted:AnimatedFigure[],t:number):Set<string>{
    const ordered=[...wanted].sort((a,b)=>Number(b.priority)-Number(a.priority));
    const wantedIds=new Set(ordered.map(f=>f.id));
    // Copies whose person is no longer wanted are freed; people keep the copy they already have.
    for(const s of this.slots)if(s.owner&&!wantedIds.has(s.owner))s.owner=null;
    const drawn=new Set<string>();
    for(const f of ordered){
      // Their own look if a copy is free, else any free copy (moving, not frozen, matters more than the look).
      const slot=this.slots.find(s=>s.owner===f.id)??this.slots.find(s=>s.owner===null&&s.model===this.modelFor(f.id))??this.slots.find(s=>s.owner===null);
      if(!slot)continue;
      slot.owner=f.id;
      drawn.add(f.id);
      this.place(slot,f,t);
    }
    for(const s of this.slots)if(!s.owner||!drawn.has(s.owner)){s.owner=null;s.node.setEnabled(false)}
    return drawn;
  }

  private place(s:Slot,f:AnimatedFigure,t:number){
    s.node.setEnabled(true);
    applyPose(s.node,{position:{x:f.pose.x,y:f.pose.y,z:f.pose.z},heading:f.pose.heading});
    s.inner.scaling.setAll(f.height/s.height);
    // Clip and the time within it: walking follows distance walked; standing idles, looking along the road now and then.
    const clip:Clip=f.pose.walking?'Walk':f.pose.look==='right'?'LookRight':f.pose.look==='left'?'LookLeft':'Idle';
    const g=s.clips.get(clip)??s.clips.get('Idle');
    if(!g)return;
    if(s.playing!==g){s.playing?.stop();g.start(false,1);g.pause();s.playing=g}
    const length=(g.to-g.from)/(g.targetedAnimations[0]?.animation.framePerSecond??30);
    const at=f.pose.walking?f.pose.stride/CLIP_WALK_SPEED:t+(hash(f.id)%97)/10;
    const loop=((at%length)+length)%length;
    g.goToFrame(g.from+(g.to-g.from)*loop/length);
  }

  /** Diagnostics: each animated person's drawn height (metres, as skinned this frame). */
  drawnHeights():Array<{id:string;height:number}>{
    return this.slots.filter(s=>s.owner).map(s=>{
      for(const m of s.inner.getChildMeshes())m.refreshBoundingInfo({applySkeleton:true});
      const {min,max}=s.node.getHierarchyBoundingVectors(true);
      return {id:s.owner!,height:max.y-min.y};
    });
  }

  dispose():void{for(const s of this.slots)s.node.dispose(false,true)}
}
