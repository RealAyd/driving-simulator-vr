import type {Location,Vec2} from '../contracts';
import {RoadNetwork} from '../test/route';
import {routeLanePath} from '../test/routePath';
import {surfaceAt} from '../world/roadGeometry';
import {drivingView} from '../world/roundabouts';
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
