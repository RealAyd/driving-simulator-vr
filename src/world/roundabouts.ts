import type {Location,Road,Vec2} from '../contracts';

/**
 * Roundabouts bigger than a mini: the map draws them as a ring of one-way roads round an island (OpenStreetMap's
 * junction=roundabout ways), with no lanes given, so they came out one narrow lane wide and were driven as ordinary
 * roads ("At the junction, turn left" at each piece of the ring). Here they are found (a loop of one-way roads, round,
 * under 400 m), widened to a circulating width, and given to the route planner, the traffic and the assisted steering
 * as a junction, like a mini-roundabout: one decision with numbered exits ("At the roundabout, take the second
 * exit"), driven clockwise round the island.
 */
export interface Ring{position:Vec2;
  /** Mean distance of the ring's centreline from its middle (metres). */
  radius:number;
  /** The farthest the ring's centreline goes from its middle: roads ending within it join the roundabout. */
  reach:number;
  roads:Set<Road>}

const length=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);
const found=new WeakMap<Location,Ring[]>();

/** The location's roundabout rings (worked out once per location). */
export function roundaboutRings(location:Location):Ring[]{
  const known=found.get(location);
  if(known)return known;
  const oneway=location.roads.filter(r=>r.oneway&&r.centreline.length>=2);
  const near=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z)<2;
  const rings:Ring[]=[],used=new Set<Road>();
  for(const first of oneway){
    if(used.has(first))continue;
    // Follow the one-way roads end to start; a ring comes back to the first (or is one closed way).
    const chain=[first];let at=first,closed=near(first.centreline[0]!,first.centreline.at(-1)!);
    for(let k=0;k<16&&!closed;k++){
      const end=at.centreline.at(-1)!;
      const next=oneway.find(r=>r!==at&&near(r.centreline[0]!,end)&&(r===first||!chain.includes(r)&&!used.has(r)));
      if(!next)break;
      if(next===first){closed=true;break}
      chain.push(next);at=next;
    }
    if(!closed)continue;
    const total=chain.reduce((n,r)=>n+length(r),0);
    if(total<20||total>400)continue;
    // The middle and radius weighted by length (the map's points bunch on the bends).
    const points=chain.flatMap(r=>r.centreline),segments=chain.flatMap(r=>r.centreline.slice(1).map((p,i)=>{
      const q=r.centreline[i]!;return {x:(p.x+q.x)/2,z:(p.z+q.z)/2,w:Math.hypot(p.x-q.x,p.z-q.z)}}));
    const c={x:segments.reduce((n,s)=>n+s.x*s.w,0)/total,z:segments.reduce((n,s)=>n+s.z*s.w,0)/total};
    const d=points.map(p=>Math.hypot(p.x-c.x,p.z-c.z));
    const radius=segments.reduce((n,s)=>n+Math.hypot(s.x-c.x,s.z-c.z)*s.w,0)/total;
    // Round (a one-way loop round a block is not a roundabout): every point near the mean distance.
    if(radius<4||Math.max(...d.map(x=>Math.abs(x-radius)))>radius*.35)continue;
    for(const r of chain)used.add(r);
    rings.push({position:c,radius,reach:Math.max(...d),roads:new Set(chain)});
  }
  found.set(location,rings);
  return rings;
}

/**
 * The rings widened to a circulating width (about 6 m: two lanes' worth, as a single-lane roundabout's carriageway is
 * built wide enough for a lorry), where the map gave one narrow lane. Call once per location, before it is built.
 */
export function widenRoundabouts(location:Location):void{
  for(const ring of roundaboutRings(location))for(const r of ring.roads)
    if(r.lanes.count*r.lanes.width<6)r.lanes={count:2,width:Math.max(3,Math.min(4.5,r.lanes.width))};
}

const views=new WeakMap<Location,Location>();

/**
 * The place as the route planner, the traffic and the assisted steering drive it: each ring is one junction (like a
 * mini-roundabout, with numbered exits, gone round clockwise on the ring's centreline: the "disc" is the island, sized
 * so that the way round, 2.4 m clear of it, is the centreline), and its pieces are not roads of their own.
 * The same object every time for a place (so it can key caches); the place itself, with no rings.
 */
export function drivingView(location:Location):Location{
  const rings=roundaboutRings(location);
  if(!rings.length)return location;
  const known=views.get(location);
  if(known)return known;
  const view:Location={...location,roads:location.roads.filter(r=>!rings.some(g=>g.roads.has(r))),
    junctions:[...location.junctions,...rings.map((g,i)=>{
      const ring={id:`ring-${i}`,kind:'mini-roundabout' as const,position:g.position,radius:g.reach+1,
        discDiameter:Math.max(1,2*(g.radius-2.4)),entries:[],outline:[...g.roads].flatMap(r=>r.centreline)};
      return ring;
    })]};
  views.set(location,view);
  return view;
}
