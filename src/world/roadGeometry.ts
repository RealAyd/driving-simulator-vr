import type {Location,Road,Vec2} from '../contracts';

export interface RoadSample{
  roadId:string;
  /** Distance along the centreline from its first point, metres. */
  along:number;
  /** Signed lateral offset: positive to the right of the travel direction. */
  lateral:number;
  /** Unit direction of the centreline segment. */
  direction:Vec2;
}

export function roadHalfWidth(road:Road):number{
  return road.lanes.count*road.lanes.width/2;
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
      best={roadId:road.id,along:along+t,lateral,direction:{x:ux,z:uz}};
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

/**
 * Surface height comes only from authored road data, never from scene
 * meshes, so the vehicle cannot snap onto roofs or decorative objects.
 */
export function surfaceAt(location:Location,x:number,z:number):{height:number;kind:SurfaceKind;roadId:string}|null{
  let result:{height:number;kind:SurfaceKind;roadId:string}|null=null;
  for(const road of location.roads){
    const sample=sampleRoad(road,x,z);
    const offset=Math.abs(sample.lateral);
    const half=roadHalfWidth(road);
    if(offset<=half)return {height:road.surfaceHeight,kind:'carriageway',roadId:road.id};
    if(offset<=half+road.pavementWidth&&!result)
      result={height:road.surfaceHeight+road.kerbHeight,kind:'pavement',roadId:road.id};
  }
  return result;
}
