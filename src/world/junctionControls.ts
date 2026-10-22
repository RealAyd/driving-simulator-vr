import type {Location,Road,Vec2} from '../contracts';
import {pointAtAlong,roadHalfWidth,sampleRoad} from './roadGeometry';

/**
 * Where a side road meets another road (a T-junction or crossroads mouth) and how traffic coming out is
 * controlled: a STOP sign where the map has one (a solid stop line and STOP on the road), a give way sign where
 * the map has one, and otherwise give way lines (the usual UK marking: double broken lines across the lane, a
 * triangle before them). Not at mini-roundabouts or traffic lights (they have their own). Pure data: the road
 * markings (buildWorld.ts), the signs (signage.ts) and the marking of the drive (mockTest.ts) use it.
 */
export interface JunctionMouth{
  id:string;
  road:Road;
  /** The mouth is at the road's end (true) or its start. */
  atEnd:boolean;
  /** Direction of travel along the road towards the junction. */
  dir:1|-1;
  /** Where the line is across the road (metres along it). */
  lineAlong:number;
  main:Road;
  kind:'give-way'|'stop';
  /** A sign is mapped (STOP, or GIVE WAY): drawn beside the line. */
  signed:boolean;
}

const roadLength=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);

export function junctionMouths(location:Location):JunctionMouth[]{
  const out:JunctionMouth[]=[];
  for(const road of location.roads){
    const len=roadLength(road);
    if(len<12)continue;
    for(const atEnd of [false,true]){
      // One-way roads are only marked where traffic leaves them.
      if(road.oneway&&!atEnd)continue;
      const end=atEnd?road.centreline.at(-1)!:road.centreline[0]!;
      if(location.junctions.some(j=>Math.hypot(j.position.x-end.x,j.position.z-end.z)<=j.radius+4))continue;
      if(location.signals.some(g=>g.stops.some(s=>s.roadId===road.id&&Math.abs(s.along-(atEnd?len:0))<25)))continue;
      // The road it meets, at its side (not its end: that is the same street carrying on, or a bend).
      let main:Road|null=null,mainHalf=0;
      for(const o of location.roads){
        if(o===road||o.level!==road.level)continue;
        const s=sampleRoad(o,end.x,end.z),half=roadHalfWidth(o);
        if(s.distance>half+1.5||s.along<3||s.along>roadLength(o)-3)continue;
        if(!main||s.distance<sampleRoad(main,end.x,end.z).distance){main=o;mainHalf=half}
      }
      if(!main)continue;
      const mapped=atEnd?road.ends?.end:road.ends?.start;
      const back=mainHalf+.5;
      if(back>len-6)continue;
      out.push({id:`mouth-${road.id}-${atEnd?'end':'start'}`,road,atEnd,dir:atEnd?1:-1,lineAlong:atEnd?len-back:back,main,
        kind:mapped??'give-way',signed:!!mapped});
    }
  }
  return out;
}

/**
 * A point on a mouth's road: `back` metres back from the line (away from the junction), `left` metres left of the
 * centreline for traffic going towards the junction.
 */
export function mouthPoint(m:JunctionMouth,back:number,left:number):Vec2&{dir:Vec2}{
  const p=pointAtAlong(m.road,m.lineAlong-m.dir*back),t={x:p.direction.x*m.dir,z:p.direction.z*m.dir};
  return {x:p.x+t.z*left,z:p.z-t.x*left,dir:t};
}

/** Where the line runs across, as left offsets from the centreline: the lane coming out (all of a one-way road). */
export function mouthLane(m:JunctionMouth):[number,number]{
  const half=roadHalfWidth(m.road);
  return m.road.oneway?[-half,half]:[0,half];
}

/** Outside a school: its stretch of kerb (yellow zig-zags, SCHOOL KEEP CLEAR) and the road it is on. */
export interface SchoolFrontage{id:string;road:Road;along:number;
  /** Which side of the centreline (along the road's direction): +1 right, −1 left. */
  side:1|-1;length:number;name?:string}

/** The road outside each school building (the nearest one passing within 40 m of it). */
export function schoolFrontages(location:Location):SchoolFrontage[]{
  const out:SchoolFrontage[]=[];
  for(const b of location.buildings){
    if(b.use!=='school')continue;
    let best:{road:Road;s:ReturnType<typeof sampleRoad>}|null=null;
    for(const p of b.footprint)for(const road of location.roads){
      const s=sampleRoad(road,p.x,p.z);
      if(s.distance<40&&(!best||s.distance<best.s.distance))best={road,s};
    }
    if(!best)continue;
    const len=roadLength(best.road);
    if(len<40||best.s.along<15||best.s.along>len-15)continue;
    if(out.some(f=>f.road===best!.road&&Math.abs(f.along-best!.s.along)<60))continue;
    out.push({id:`school-${b.id}`,road:best.road,along:best.s.along,side:best.s.lateral>=0?1:-1,length:Math.min(30,len-30),...(b.name?{name:b.name}:{})});
  }
  return out;
}
