import type {Location,Road,Vec2} from '../contracts';
import {pointAtAlong,roadHalfWidth,sampleRoad} from './roadGeometry';
import {roundaboutRings} from './roundabouts';

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
  /** How the line slants across the road (metres further back per metre left of the centreline; `lineAlong` is where
   * it crosses the centreline): 0, straight across, except on to a roundabout, where it follows the ring's edge
   * (diagram 1003), which roads usually meet at a slant. */
  skew:number;
}

const roadLength=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);

export function junctionMouths(location:Location):JunctionMouth[]{
  const out:JunctionMouth[]=[];
  const rings=roundaboutRings(location);
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
      // On to a roundabout (the map often splits its ring where each road meets it: the piece nearest, end or not).
      const ring=rings.find(g=>!g.roads.has(road)&&Math.hypot(end.x-g.position.x,end.z-g.position.z)<g.reach+4);
      if(ring)for(const o of ring.roads){
        const s=sampleRoad(o,end.x,end.z);
        if(s.distance<roadHalfWidth(o)+1.5&&(!main||!ring.roads.has(main)||s.distance<sampleRoad(main,end.x,end.z).distance)){main=o;mainHalf=roadHalfWidth(o)}
      }
      if(!main)continue;
      const mapped=atEnd?road.ends?.end:road.ends?.start;
      let back=mainHalf+.5,skew=0;
      if(ring&&ring.roads.has(main)){
        // The line where each side of the way in leaves the ring's carriageway (its outer edge, wherever the road meets
        // it), and straight between.
        const dir=atEnd?1:-1,ringHalf=mainHalf;
        const backAt=(left:number)=>{
          for(let b=0;b<Math.min(len-6,ring.reach+20);b+=.25){
            const p=pointAtAlong(road,atEnd?len-b:b),t={x:p.direction.x*dir,z:p.direction.z*dir},q={x:p.x+t.z*left,z:p.z-t.x*left};
            if([...ring.roads].every(r=>sampleRoad(r,q.x,q.z).distance>ringHalf+.3))return b;
          }
          return null;
        };
        const [from,to]=road.oneway?[-roadHalfWidth(road),roadHalfWidth(road)]:[0,roadHalfWidth(road)];
        const a=from+.3,c=to-.3,ba=backAt(a),bc=backAt(c);
        if(ba===null||bc===null)continue;
        skew=(bc-ba)/(c-a);back=ba-skew*a;
      }
      if(back>len-6)continue;
      out.push({id:`mouth-${road.id}-${atEnd?'end':'start'}`,road,atEnd,dir:atEnd?1:-1,lineAlong:atEnd?len-back:back,main,
        kind:mapped??'give-way',signed:!!mapped,skew});
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

/** A point on the line itself (`row` metres back from it), `left` metres left of the centreline: as `mouthPoint`, with
 * the line's slant. */
export function mouthLinePoint(m:JunctionMouth,row:number,left:number):Vec2&{dir:Vec2}{
  return mouthPoint(m,row+m.skew*left,left);
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
