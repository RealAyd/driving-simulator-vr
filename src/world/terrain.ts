import {InstancedMesh,Mesh,type AbstractMesh,type TransformNode} from '../engine/babylon';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer';

/**
 * Real ground heights (tools/terrain/build_terrain.mjs, content/terrain/<location>.json): a grid in the
 * location's frame, heights relative to its origin. The world is built flat and then laid on the ground
 * (`drape`); road users are lifted by `applyPose` (engine/babylonAdapter.ts). Driving, collisions and
 * assessment stay in 2D: slopes are visual.
 */
export interface TerrainData{
  locationId:string;attribution:string;
  cell:number;x0:number;z0:number;cols:number;rows:number;heights:number[];
}

export class Terrain{
  constructor(readonly data:TerrainData){}

  /** Ground height at a point (bilinear; the edge value outside the grid). */
  heightAt(x:number,z:number):number{
    const {cell,x0,z0,cols,rows,heights}=this.data;
    const fx=Math.min(Math.max((x-x0)/cell,0),cols-1.0001),fz=Math.min(Math.max((z-z0)/cell,0),rows-1.0001);
    const c=Math.floor(fx),r=Math.floor(fz),u=fx-c,v=fz-r;
    const h=(i:number,j:number)=>heights[j*cols+i]!;
    return (h(c,r)*(1-u)+h(c+1,r)*u)*(1-v)+(h(c,r+1)*(1-u)+h(c+1,r+1)*u)*v;
  }

  /** The grid's extent (for the ground mesh). */
  get extent(){const d=this.data;return {x0:d.x0,z0:d.z0,width:(d.cols-1)*d.cell,depth:(d.rows-1)*d.cell,cols:d.cols,rows:d.rows}}
  get lowest():number{return Math.min(...this.data.heights)}
}

/** Terrain for a location, if one has been built. */
const files=import.meta.glob('../../content/terrain/*.json',{eager:true,import:'default'}) as Record<string,TerrainData>;
export function terrainFor(locationId:string):Terrain|null{
  const data=Object.values(files).find(d=>d.locationId===locationId);
  return data?new Terrain(data):null;
}

/** Lifts moving things: heights per frame, never baked into geometry. */
const skip=(m:AbstractMesh)=>m.name==='sky-dome'||m.name==='verge-beyond'||m.hasThinInstances||!!m.skeleton;

/**
 * Lays everything under `root` on the ground. Meshes with their own geometry are bent vertex by vertex
 * (walls stay vertical: a wall's top and foot share x and z); shared geometry (instances, copies of one
 * model) is lifted whole, by the height under the copy's own node.
 */
export function drape(root:TransformNode,terrain:Terrain):void{
  const lifted=new Set<TransformNode>();
  root.computeWorldMatrix(true);
  for(const mesh of root.getChildMeshes(false)){
    if(skip(mesh))continue;
    const shared=mesh instanceof InstancedMesh||(mesh instanceof Mesh&&(mesh.geometry?.meshes.length??0)>1);
    if(shared||!(mesh instanceof Mesh)){
      // The copy's own node: the ancestor just below the root.
      let node:TransformNode=mesh;
      while(node.parent&&node.parent!==root)node=node.parent as TransformNode;
      if(lifted.has(node))continue;
      lifted.add(node);
      const p=node.getAbsolutePosition();
      node.position.y+=terrain.heightAt(p.x,p.z);
      for(const m of node.getChildMeshes(false))if(m.isWorldMatrixFrozen){m.unfreezeWorldMatrix();m.computeWorldMatrix(true);m.freezeWorldMatrix()}
      continue;
    }
    const positions=mesh.getVerticesData(VertexBuffer.PositionKind);
    if(!positions)continue;
    const frozen=mesh.isWorldMatrixFrozen;
    const w=mesh.computeWorldMatrix(true).m;
    // Static scenery is only turned about the vertical: a world height change is a local one divided by the y scale.
    const sy=w[5]||1;
    for(let i=0;i<positions.length;i+=3){
      const lx=positions[i]!,ly=positions[i+1]!,lz=positions[i+2]!;
      const x=lx*w[0]!+ly*w[4]!+lz*w[8]!+w[12]!,z=lx*w[2]!+ly*w[6]!+lz*w[10]!+w[14]!;
      positions[i+1]=ly+terrain.heightAt(x,z)/sy;
    }
    mesh.setVerticesData(VertexBuffer.PositionKind,positions,false);
    mesh.refreshBoundingInfo();
    if(frozen){mesh.unfreezeWorldMatrix();mesh.computeWorldMatrix(true);mesh.freezeWorldMatrix()}
  }
}
