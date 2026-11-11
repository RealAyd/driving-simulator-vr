import type {Block,Location,Vec2} from '../contracts';
import {RoadNetwork} from '../test/route';
import {routeLanePath} from '../test/routePath';
import {surfaceAt} from '../world/roadGeometry';
import {drivingView} from '../world/roundabouts';
import {ringLanes} from '../world/roundaboutLanes';
import {CAR_MODELS,PANEL_VAN,parkedSize} from '../assets/carSpecs';
import type {KerbFootprint} from '../world/townscape';
import type {DecisionRoute} from './route';

/** The lane the car drives on a decision route: planned through the route's points on the place's roads (its
 * roundabouts prepared), as a mock test route is. Null when the points cannot be reached in that order. */
export function decisionPath(place:Location,route:DecisionRoute,parked:ReadonlyArray<Vec2>=[]):Vec2[]|null{
  const net=new RoadNetwork(place);
  const start=net.locate(route.start.x,route.start.z,route.start.headingDeg*Math.PI/180);
  // (Searched as far as a long route needs: a test route runs to several kilometres.)
  const planned=start&&net.planThrough(start,route.through,20,PLAN_REACH);
  if(!planned)return null;
  const lane=routeLanePath(planned.legs,[...parked,...routeParking(route)],drivingView(place).junctions,(x,z)=>surfaceAt(place,x,z)?.kind==='carriageway');
  return shifted(lane,route.shifts??[]);
}

/** The road a route starts on (a test centre's way out, or the estate road it is on) and the rest of that road by name,
 * end to end: background traffic keeps off it (on a dead-end estate road, a car meeting the learner's face to face has
 * nowhere to go). */
export function startRoads(place:Location,route:DecisionRoute):ReadonlySet<string>{
  const near=(r:Location['roads'][number])=>Math.min(...r.centreline.map(q=>Math.hypot(q.x-route.start.x,q.z-route.start.z)));
  const first=place.roads.reduce((a,b)=>near(b)<near(a)?b:a);
  const out=new Set([first.id]);
  if(!first.name)return out;
  const ends=(r:Location['roads'][number])=>[r.centreline[0]!,r.centreline.at(-1)!];
  for(let grew=true;grew;){
    grew=false;
    for(const r of place.roads)if(!out.has(r.id)&&r.name===first.name&&ends(r).some(e=>place.roads.some(o=>out.has(o.id)&&ends(o).some(f=>Math.hypot(e.x-f.x,e.z-f.z)<1))))
      {out.add(r.id);grew=true}
  }
  return out;
}

/** The car model a route's parked car is drawn with. */
const ROUTE_CAR='batch-b-saloon';

/** The vehicles a route parks (route.parked) as the location's blocks: drawn and solid as the map's own are. */
export function routeBlocks(route:DecisionRoute):Block[]{
  return (route.parked??[]).map((v,i)=>{
    const size=v.kind==='van'?{width:PANEL_VAN.width,depth:PANEL_VAN.length,height:PANEL_VAN.height}:(s=>({width:s.width,depth:s.length,height:s.height}))(parkedSize(CAR_MODELS[ROUTE_CAR]));
    return {id:`route-parked-${i}`,kind:'parked-vehicle' as const,vehicleModel:v.kind==='van'?PANEL_VAN.id:ROUTE_CAR,position:{x:v.x,z:v.z},headingDeg:v.headingDeg,size,occludes:true,shape:'box' as const,
      ...(v.colour?{colour:v.colour}:{})};
  });
}

/** A route's parked vehicles as kerb footprints: the car's way, and traffic, pass them as they do cars at the kerb. */
export function routeParking(route:DecisionRoute):KerbFootprint[]{
  return routeBlocks(route).map(b=>({x:b.position.x,z:b.position.z,heading:b.headingDeg*Math.PI/180,halfWidth:b.size.width/2,halfLength:b.size.depth/2}));
}

/** Eased in over this far (metres) at each end of a shift. */
const SHIFT_EASE=14;

/** The way moved to the left by each shift between its points (pulled in to the kerb), easing in before and out
 * after (a smooth step over SHIFT_EASE metres). */
export function shifted(path:Vec2[],shifts:DecisionRoute['shifts']&{}):Vec2[]{
  if(!shifts.length)return path;
  const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]!+Math.hypot(path[i]!.x-path[i-1]!.x,path[i]!.z-path[i-1]!.z));
  const sAt=(p:Vec2)=>{let best=Infinity,s=0;path.forEach((q,i)=>{const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<best){best=d;s=cum[i]!}});return s};
  const spans=shifts.map(h=>({a:sAt(h.from),b:sAt(h.to),left:h.left}));
  const smooth=(t:number)=>{const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u)};
  return path.map((p,i)=>{
    const s=cum[i]!;let left=0;
    for(const sp of spans)left+=sp.left*Math.min(smooth((s-sp.a+SHIFT_EASE)/SHIFT_EASE),smooth((sp.b+SHIFT_EASE-s)/SHIFT_EASE));
    if(!left)return p;
    const q=path[Math.min(path.length-1,i+1)]!,o=path[Math.max(0,i-1)]!,dx=q.x-o.x,dz=q.z-o.z,l=Math.hypot(dx,dz)||1;
    // (Left of the direction of travel: x east, z south.)
    return {x:p.x+dz/l*left,z:p.z-dx/l*left};
  });
}

/** How far the way is searched for (metres driven). */
const PLAN_REACH=12000;

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
