import type {Location} from '../contracts';
import {pavementWidthAt,roadHalfWidth,sampleRoad} from './roadGeometry';

/**
 * The small location label: the street the car is on, the town, and the speed
 * limit where a reference gives one. Representative streets say so rather than
 * borrowing a real name. Display only; never used for scoring.
 */
export interface PlaceLabel{text:string;road:string|null;speedLimitMph:number|null;title:string}

export function placeLabel(location:Location,x:number,z:number,previousRoad:string|null=null):PlaceLabel{
  if(!location.placeName)return {text:'Practice street · representative, not a real place',road:null,speedLimitMph:null,
    title:'A made-up street for practice: its layout does not reproduce a real road.'};
  // In a junction keep the street the car came from, so the label does not flicker between arms.
  if(previousRoad&&location.junctions.some(j=>Math.hypot(x-j.position.x,z-j.position.z)<=j.radius+1)){
    const road=location.roads.find(r=>r.name===previousRoad);
    if(road)return labelFor(location,road);
  }
  let best:{road:Location['roads'][number];distance:number}|null=null;
  for(const road of location.roads){
    if(!road.name)continue;
    const s=sampleRoad(road,x,z);
    if(s.distance>roadHalfWidth(road)+pavementWidthAt(road,s.along,Math.sign(s.lateral)||1))continue;
    if(!best||s.distance<best.distance)best={road,distance:s.distance};
  }
  if(!best){
    const road=previousRoad?location.roads.find(r=>r.name===previousRoad):undefined;
    return road?labelFor(location,road):{text:location.placeName,road:null,speedLimitMph:null,title:''};
  }
  return labelFor(location,best.road);
}

function labelFor(location:Location,road:Location['roads'][number]):PlaceLabel{
  // The limit of any piece of this street (several pieces share a name; only mapped limits count).
  const limits=new Set(location.roads.filter(r=>r.name===road.name&&r.speedLimitMph).map(r=>r.speedLimitMph!));
  const limit=road.speedLimitMph??(limits.size===1?[...limits][0]!:null);
  const source=location.roads.find(r=>r.name===road.name&&r.speedLimitSource)?.speedLimitSource;
  return {
    text:`${road.name} · ${location.placeName}${limit?` · ${limit} mph`:''}`,
    road:road.name!,speedLimitMph:limit,
    title:limit?`Speed limit from map data (${source}); not checked on the ground.`:'No speed limit is recorded in our map data for this street.'
  };
}
