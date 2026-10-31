import type {Location,Road,Vec2} from '../contracts';
import {insidePolygon} from './townscape';
import {makeRingLanes,setRingLanes} from './roundaboutLanes';

/**
 * Roundabouts bigger than a mini: the map draws them as a ring of one-way roads round an island (OpenStreetMap's
 * junction=roundabout ways), with no lanes given, so they came out one narrow lane wide and were driven as ordinary
 * roads ("At the junction, turn left" at each piece of the ring). Here they are found (a loop of one-way roads, round,
 * under 800 m: a big interchange's ring is 600 m round), widened to a circulating width, and given to the route planner, the traffic and the assisted steering
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
  // (Those named as a roundabout first: started from a road on to it, a way in and out of a one-way pair can close a
  // loop round with the ring.)
  const oneway=location.roads.filter(r=>r.oneway&&r.centreline.length>=2).sort((p,q)=>Number(/roundabout|circus|gyratory/i.test(q.name??''))-Number(/roundabout|circus|gyratory/i.test(p.name??'')));
  const near=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z)<2;
  const rings:Ring[]=[],used=new Set<Road>();
  for(const first of oneway){
    if(used.has(first))continue;
    // Follow the one-way roads end to start, each way on in turn (at an interchange a slip road leaves where a piece of
    // the ring ends); a ring comes back to the first (or is one closed way).
    const loop=(chain:Road[],total:number):Road[]|null=>{
      const at=chain.at(-1)!,end=at.centreline.at(-1)!;
      if(chain.length===1&&near(at.centreline[0]!,end))return chain;
      if(chain.length>16||total>800)return null;
      // (The ring's own pieces first: those named as it is.)
      const ways=oneway.filter(r=>r!==at&&near(r.centreline[0]!,end)).sort((p,q)=>Number(q.name===at.name)-Number(p.name===at.name));
      for(const r of ways){
        if(r===first)return chain;
        if(chain.includes(r)||used.has(r))continue;
        const found=loop([...chain,r],total+length(r));
        if(found)return found;
      }
      return null;
    };
    const chain=loop([first],length(first));
    if(!chain)continue;
    const total=chain.reduce((n,r)=>n+length(r),0);
    if(total<20||total>800)continue;
    // The middle and radius weighted by length (the map's points bunch on the bends).
    const points=chain.flatMap(r=>r.centreline),segments=chain.flatMap(r=>r.centreline.slice(1).map((p,i)=>{
      const q=r.centreline[i]!;return {x:(p.x+q.x)/2,z:(p.z+q.z)/2,w:Math.hypot(p.x-q.x,p.z-q.z)}}));
    const c={x:segments.reduce((n,s)=>n+s.x*s.w,0)/total,z:segments.reduce((n,s)=>n+s.z*s.w,0)/total};
    const d=points.map(p=>Math.hypot(p.x-c.x,p.z-c.z));
    const radius=segments.reduce((n,s)=>n+Math.hypot(s.x-c.x,s.z-c.z)*s.w,0)/total;
    // Round (a one-way loop round a block is not a roundabout): every point near the mean distance.
    if(radius<4||Math.max(...d.map(x=>Math.abs(x-radius)))>radius*.35)continue;
    // Nor one round a building the map has (a one-way system round a block, a church in the middle of the street).
    if(location.buildings.some(b=>b.source!=='approximate'&&b.footprint.some(p=>insidePolygon(p,points))))continue;
    for(const r of chain)used.add(r);
    rings.push({position:c,radius,reach:Math.max(...d),roads:new Set(chain)});
  }
  found.set(location,rings);
  return rings;
}

/**
 * Rings made ready to build and drive (call once per location, before it is built):
 * - widened to a circulating width (about 6 m: two lanes' worth, as a single-lane roundabout's carriageway is built
 *   wide enough for a lorry), where the map gave one narrow lane;
 * - their islands cleared of the terraced houses the area builder estimated along streets with no mapped buildings
 *   (it took the ring for a street, so it lined the island with houses). A building the map has there stays;
 * - no pavement round the island (the map gives every road one each side): nobody walks there, and nothing that
 *   stands on pavements (people, bins, lamp columns) is put there.
 */
export function prepareRoundabouts(location:Location):void{
  const rings=roundaboutRings(location);
  for(const ring of rings)for(const r of ring.roads)
    if(r.lanes.count*r.lanes.width<6)r.lanes={count:2,width:Math.max(3,Math.min(4.5,r.lanes.width))};
  for(const ring of rings)for(const r of ring.roads){
    // (The island's side of the road: the right, going round clockwise.)
    const k=Math.floor((r.centreline.length-1)/2),a=r.centreline[k]!,b=r.centreline[k+1]!;
    const side=(ring.position.x-a.x)*-(b.z-a.z)+(ring.position.z-a.z)*(b.x-a.x)>0?'right':'left';
    const profile=r.pavementProfile?.length?r.pavementProfile:[0,length(r)].map(along=>({along,left:r.pavementWidth,right:r.pavementWidth}));
    r.pavementProfile=profile.map(p=>({...p,[side]:0}));
  }
  const islands=rings.map(g=>[...g.roads].flatMap(r=>r.centreline));
  location.buildings=location.buildings.filter(b=>b.source!=='approximate'||!islands.some(line=>b.footprint.some(p=>insidePolygon(p,line))));
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
  const roads=location.roads.filter(r=>!rings.some(g=>g.roads.has(r)));
  const view:Location={...location,roads,
    junctions:[...location.junctions,...rings.map((g,i)=>{
      const ring={id:`ring-${i}`,kind:'mini-roundabout' as const,position:g.position,radius:g.reach+1,
        discDiameter:Math.max(1,2*(g.radius-2.4)),entries:[],outline:[...g.roads].flatMap(r=>r.centreline)};
      // Its lanes, and where each way out leaves it (a road starting at it, or a two-way road ending there).
      const near=(p:Vec2)=>Math.hypot(p.x-g.position.x,p.z-g.position.z)<g.reach+4;
      const outs=roads.flatMap(r=>[...(near(r.centreline[0]!)?[r.centreline[0]!]:[]),...(!r.oneway&&near(r.centreline.at(-1)!)?[r.centreline.at(-1)!]:[])]);
      setRingLanes(ring,makeRingLanes([...g.roads],outs));
      return ring;
    })]};
  views.set(location,view);
  return view;
}
