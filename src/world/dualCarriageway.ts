import type {Location} from '../contracts';
import {pavementWidthAt,pointAtAlong,roadHalfWidth,sampleRoad} from './roadGeometry';

/** How far apart (centreline to centreline, metres) the two halves of a dual carriageway can be. */
const MEDIAN_REACH=25;
const STEP=6;

/**
 * Dual carriageways: the map draws each half as a one-way road, each given pavements both sides, so the two inner
 * pavements met in the middle as a pale paved strip down the road (the owner's report, Basildon, Cranes Farm Road: "a
 * sky blue cast dividing the route"). A real one has a central reservation there (grass, a kerbed island), not a
 * footway: where a one-way road has the other half (one-way the other way) close on its right, it has no pavement on
 * that side. Call once per location, before it is built.
 */
export function centralReservations(location:Location):void{
  const oneway=location.roads.filter(r=>r.oneway&&r.centreline.length>=2);
  const length=(r:typeof oneway[number])=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);
  for(const road of oneway){
    if(road.pavementWidth<=0)continue;
    const L=length(road),half=roadHalfWidth(road);
    const profile:Array<{along:number;left:number;right:number}>=[];
    let any=false;
    for(let along=0;;along=Math.min(L,along+STEP)){
      const p=pointAtAlong(road,along);
      const median=oneway.some(o=>{
        if(o===road)return false;
        const s=sampleRoad(o,p.x,p.z);
        // The other way, on this one's right (both keep left, so each has the other on its right).
        return s.distance<MEDIAN_REACH&&s.distance>half&&s.lateral>0&&p.direction.x*s.direction.x+p.direction.z*s.direction.z<-.7;
      });
      any||=median;
      profile.push({along,left:pavementWidthAt(road,along,-1),right:median?0:pavementWidthAt(road,along,1)});
      if(along>=L)break;
    }
    if(any)road.pavementProfile=profile;
  }
}
