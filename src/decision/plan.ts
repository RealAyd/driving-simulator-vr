import type {Block,Location,Vec2} from '../contracts';
import {RoadNetwork} from '../test/route';
import {routeLanePath} from '../test/routePath';
import {surfaceAt} from '../world/roadGeometry';
import {drivingView} from '../world/roundabouts';
import {ringLanes} from '../world/roundaboutLanes';
import type {DecisionRoute} from './route';

/** The lane the car drives on a decision route: planned through the route's points on the place's roads (its
 * roundabouts prepared), as a mock test route is. Null when the points cannot be reached in that order. */
export function decisionPath(place:Location,route:DecisionRoute,parked:ReadonlyArray<Vec2>=[]):Vec2[]|null{
  const net=new RoadNetwork(place);
  const start=net.locate(route.start.x,route.start.z,route.start.headingDeg*Math.PI/180);
  const planned=start&&net.planThrough(start,route.through);
  if(!planned)return null;
  return routeLanePath(planned.legs,parked,drivingView(place).junctions,(x,z)=>surfaceAt(place,x,z)?.kind==='carriageway');
}

/** The junctions the car gives way at as it drives through (mini-roundabouts and roundabouts), as discs: a
 * roundabout's reaches the outer edge of its circulating carriageway. */
export function junctionDiscs(place:Location):Array<{x:number;z:number;radius:number}>{
  return drivingView(place).junctions.map(j=>{
    const ring=ringLanes(j);
    const outer=ring?Math.max(...ring.line.map((p,i)=>Math.hypot(p.x-j.position.x,p.z-j.position.z)+ring.stretch[i]!.count*ring.stretch[i]!.width/2)):j.radius;
    return {x:j.position.x,z:j.position.z,radius:outer};
  });
}

/** The small fixed things at the roadside the car must keep clear of (lamp columns, sign posts, bollards on traffic
 * islands), as footprints the lane path eases away from, as it does from parked cars. */
export function streetFurniture(colliders:ReadonlyArray<Block>):Array<Vec2&{heading:number;halfWidth:number;halfLength:number}>{
  return colliders.filter(c=>c.kind==='wall'&&Math.max(c.size.width,c.size.depth)<FURNITURE_SIZE)
    .map(c=>({x:c.position.x,z:c.position.z,heading:c.headingDeg*Math.PI/180,halfWidth:c.size.width/2+FURNITURE_ROOM,halfLength:c.size.depth/2+FURNITURE_ROOM}));
}
/** Smaller than this (metres, its longer side) is street furniture rather than a wall. */
const FURNITURE_SIZE=1.2;
/** Kept this much further from street furniture than from a parked car (metres): turning, the car's front corner
 * swings out past the line it follows. */
const FURNITURE_ROOM=.6;
