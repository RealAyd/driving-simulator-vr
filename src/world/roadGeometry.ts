import type {Location,Road,Vec2} from '../contracts';

export interface RoadSample{
  roadId:string;
  /** Distance along the centreline from its first point, metres. */
  along:number;
  /** Signed lateral offset: positive to the right of the travel direction. */
  lateral:number;
  /** Unit direction of the centreline segment. */
  direction:Vec2;
  /** Straight-line distance to the centreline (beyond the ends, to the end point). */
  distance:number;
}

export function roadHalfWidth(road:Road):number{
  return road.lanes.count*road.lanes.width/2;
}

/** Pavement width at `along` on one side (−1 left, +1 right of travel): the profile where there is one. */
export function pavementWidthAt(road:Road,along:number,side:number):number{
  const p=road.pavementProfile;
  if(!p||p.length===0)return road.pavementWidth;
  const w=(i:number)=>side<0?p[i]!.left:p[i]!.right;
  if(along<=p[0]!.along)return w(0);
  for(let i=1;i<p.length;i++)if(along<=p[i]!.along){
    const t=(along-p[i-1]!.along)/(p[i]!.along-p[i-1]!.along||1);
    return w(i-1)+(w(i)-w(i-1))*t;
  }
  return w(p.length-1);
}

/** Projects a point onto a road centreline (closest segment). */
export function sampleRoad(road:Road,x:number,z:number):RoadSample{
  let best:RoadSample|null=null;
  let bestDistance=Infinity;
  let along=0;
  for(let i=0;i<road.centreline.length-1;i++){
    const a=road.centreline[i]!,b=road.centreline[i+1]!;
    const dx=b.x-a.x,dz=b.z-a.z;
    const length=Math.hypot(dx,dz);
    if(length===0)continue;
    const ux=dx/length,uz=dz/length;
    const t=Math.max(0,Math.min(length,(x-a.x)*ux+(z-a.z)*uz));
    const px=a.x+ux*t,pz=a.z+uz*t;
    const distance=Math.hypot(x-px,z-pz);
    if(distance<bestDistance){
      bestDistance=distance;
      // Right of travel direction (ux,uz) is (-uz,ux) in this convention.
      const lateral=(x-px)*(-uz)+(z-pz)*ux;
      best={roadId:road.id,along:along+t,lateral,direction:{x:ux,z:uz},distance};
    }
    along+=length;
  }
  if(!best)throw new Error(`Road ${road.id} has no non-zero segments`);
  return best;
}

/** Point and travel direction at a distance along a road centreline. */
export function pointAtAlong(road:Road,along:number):{x:number;z:number;direction:Vec2}{
  let remaining=along;
  for(let i=0;i<road.centreline.length-1;i++){
    const a=road.centreline[i]!,b=road.centreline[i+1]!;
    const length=Math.hypot(b.x-a.x,b.z-a.z);
    const last=i===road.centreline.length-2;
    if(remaining<=length||last){
      const ux=(b.x-a.x)/length,uz=(b.z-a.z)/length;
      return {x:a.x+ux*remaining,z:a.z+uz*remaining,direction:{x:ux,z:uz}};
    }
    remaining-=length;
  }
  throw new Error(`Road ${road.id} has no segments`);
}

export type SurfaceKind='carriageway'|'pavement';

/** Each road's bounding box and the furthest its pavement reaches from the centreline (computed once per road). */
const bounds=new WeakMap<Road,{x0:number;x1:number;z0:number;z1:number;reach:number}>();
function boundsOf(road:Road){
  let b=bounds.get(road);
  if(!b){
    const xs=road.centreline.map(p=>p.x),zs=road.centreline.map(p=>p.z);
    const widest=Math.max(road.pavementWidth,...(road.pavementProfile??[]).flatMap(p=>[p.left,p.right]));
    b={x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs),reach:roadHalfWidth(road)+widest};
    bounds.set(road,b);
  }
  return b;
}
/** Whether (x, z) could be within `reach` of the road (its box, widened): false rules it out without sampling. */
const near=(road:Road,x:number,z:number,reach:number)=>{
  const b=boundsOf(road);
  return x>=b.x0-reach&&x<=b.x1+reach&&z>=b.z0-reach&&z<=b.z1+reach;
};

/**
 * Surface height comes only from authored road data, never from scene
 * meshes, so the vehicle cannot snap onto roofs or decorative objects.
 */
export function surfaceAt(location:Location,x:number,z:number):{height:number;kind:SurfaceKind;roadId:string}|null{
  let result:{height:number;kind:SurfaceKind;roadId:string}|null=null;
  for(const junction of location.junctions)
    if(Math.hypot(x-junction.position.x,z-junction.position.z)<=junction.radius)
      return {height:0,kind:'carriageway',roadId:junction.id};
  for(const road of location.roads){
    if(!near(road,x,z,boundsOf(road).reach))continue;
    const s=sampleRoad(road,x,z),offset=s.distance;
    const half=roadHalfWidth(road);
    if(offset<=half)return {height:road.surfaceHeight,kind:'carriageway',roadId:road.id};
    // A widened pavement stops short of other carriageways (as drawn in buildWorld).
    const width=pavementWidthAt(road,s.along,Math.sign(s.lateral)||1);
    if(offset<=half+width&&!result&&(offset<=half+road.pavementWidth||!onOtherCarriageway(location,x,z,road.id,.4)))
      result={height:road.surfaceHeight+road.kerbHeight,kind:'pavement',roadId:road.id};
  }
  return result;
}

/** True when (x, z) is on any carriageway or junction other than `exceptRoadId`. */
export function onOtherCarriageway(location:Location,x:number,z:number,exceptRoadId:string,margin=0):boolean{
  for(const junction of location.junctions)
    if(Math.hypot(x-junction.position.x,z-junction.position.z)<=junction.radius+margin)return true;
  return location.roads.some(road=>road.id!==exceptRoadId&&near(road,x,z,roadHalfWidth(road)+margin)&&sampleRoad(road,x,z).distance<=roadHalfWidth(road)+margin);
}
