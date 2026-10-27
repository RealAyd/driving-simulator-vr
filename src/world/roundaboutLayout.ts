import type {Location,Road,Vec2} from '../contracts';
import {pointAtAlong,roadHalfWidth} from './roadGeometry';
import {roundaboutRings,type Ring} from './roundabouts';

/**
 * How a roundabout bigger than a mini is built (pure data; buildWorld.ts and signage.ts draw it): a raised central
 * island with a kerb, inside the ring's carriageway; and on each two-way road that meets it, a splitter island
 * (painted hatching between the way in and the way out, a keep-left bollard at its nose), so the two directions are
 * kept apart where they meet the ring. Where the map already splits a road into a way in and a way out before the ring
 * (the space between them is the island), a keep-left bollard stands at that island's nose. Placed by rule.
 */
export interface Island{id:string;centre:Vec2;
  /** The inner edge of the ring's carriageway, in order round the ring (the island's kerb line). */
  outline:Vec2[];
  /** The ring's carriageway half-width, and the road height. */
  half:number;y:number;
  ring:Ring}

export interface Splitter{id:string;road:Road;
  /** Along the road at the ring's edge (where the nose is) and at its far end (the tail, where it narrows to nothing). */
  noseAlong:number;tailAlong:number;
  /** Its widest, at the nose (metres across). */
  width:number;
  /** The direction of travel into the roundabout along the road (+1: the road's own direction). */
  inward:1|-1;
  y:number}

/** A keep-left bollard at a splitter island's nose, facing the traffic coming in (`travel`: its direction). */
export interface Bollard{id:string;at:Vec2;travel:Vec2;y:number;road:Road}

export interface RoundaboutLayout{islands:Island[];splitters:Splitter[];bollards:Bollard[]}

const length=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);
/** A splitter's length, and the most it narrows each lane to (a car's half-width and a margin from the lane's middle). */
const SPLITTER_LENGTH=14,LANE_KEEP=.9+.35;

/** The ring's centreline in order round it (its pieces end to start). */
function ringLine(ring:Ring):Vec2[]{
  const out:Vec2[]=[];
  for(const r of ring.roads)for(const p of r.centreline)if(!out.length||Math.hypot(p.x-out.at(-1)!.x,p.z-out.at(-1)!.z)>.05)out.push(p);
  if(out.length>2&&Math.hypot(out[0]!.x-out.at(-1)!.x,out[0]!.z-out.at(-1)!.z)<.05)out.pop();
  return out;
}

/** How far from the ring's middle its carriageway's outer edge is, in the direction of `p`. */
function outerEdge(ring:Ring,line:Vec2[],half:number,p:Vec2):number{
  const c=ring.position,a=Math.atan2(p.z-c.z,p.x-c.x);
  // The ring's centreline point nearest in angle.
  let best=line[0]!,bd=Infinity;
  for(const q of line){const d=Math.abs(((Math.atan2(q.z-c.z,q.x-c.x)-a+3*Math.PI)%(2*Math.PI))-Math.PI);if(d<bd){bd=d;best=q}}
  return Math.hypot(best.x-c.x,best.z-c.z)+half;
}

const cache=new WeakMap<Location,RoundaboutLayout>();

export function layoutRoundabouts(location:Location):RoundaboutLayout{
  const known=cache.get(location);
  if(known)return known;
  const out:RoundaboutLayout={islands:[],splitters:[],bollards:[]};
  roundaboutRings(location).forEach((ring,i)=>{
    const line=ringLine(ring),c=ring.position;
    const first=[...ring.roads][0]!;
    const half=roadHalfWidth(first),y=first.surfaceHeight;
    // The island: the ring's centreline drawn in towards the middle by the carriageway's half-width.
    const outline=line.map(p=>{const d=Math.hypot(p.x-c.x,p.z-c.z)||1,k=Math.max(0,d-half)/d;return {x:c.x+(p.x-c.x)*k,z:c.z+(p.z-c.z)*k}});
    if(ring.radius-half>=1.5)out.islands.push({id:`island-${i}`,centre:c,outline,half,y,ring});
    // Splitters on two-way roads meeting the ring wide enough for one between their lanes.
    for(const road of location.roads){
      if(road.oneway||ring.roads.has(road))continue;
      const L=length(road);
      for(const atEnd of [true,false]){
        const end=atEnd?road.centreline.at(-1)!:road.centreline[0]!;
        if(Math.hypot(end.x-c.x,end.z-c.z)>ring.reach+4)continue;
        // The ring's outer edge along the road (walking out from the end).
        let edge=-1;
        for(let s=0;s<Math.min(L,ring.reach+20);s+=.5){
          const p=pointAtAlong(road,atEnd?L-s:s);
          if(Math.hypot(p.x-c.x,p.z-c.z)>outerEdge(ring,line,half,p)+.3){edge=s;break}
        }
        if(edge<0||edge+SPLITTER_LENGTH+5>L)continue;
        const lane=road.lanes.width/2,width=Math.min(1.2,2*(lane-LANE_KEEP));
        if(width<.5)continue;
        const noseAlong=atEnd?L-edge-.5:edge+.5,tailAlong=atEnd?noseAlong-SPLITTER_LENGTH:noseAlong+SPLITTER_LENGTH;
        const id=`splitter-${i}-${road.id}-${atEnd?'end':'start'}`,b=pointAtAlong(road,atEnd?noseAlong-.6:noseAlong+.6);
        out.splitters.push({id,road,noseAlong,tailAlong,width,inward:atEnd?1:-1,y:road.surfaceHeight});
        out.bollards.push({id:`${id}-bollard`,at:{x:b.x,z:b.z},travel:{x:b.direction.x*(atEnd?1:-1),z:b.direction.z*(atEnd?1:-1)},y:road.surfaceHeight,road});
      }
    }
    // Ways in and out mapped apart (one-way roads, the island between them): a bollard at the island's nose.
    const oneway=location.roads.filter(r=>r.oneway&&!ring.roads.has(r)&&r.centreline.length>=2);
    const near=(p:Vec2)=>Math.hypot(p.x-c.x,p.z-c.z)<ring.reach+4;
    for(const into of oneway){
      if(!near(into.centreline.at(-1)!))continue;
      const L=length(into);
      // Its edge: where it leaves the ring's carriageway (walking back from its end).
      let edge=-1;
      for(let s=0;s<Math.min(L,ring.reach+20);s+=.5){
        const p=pointAtAlong(into,L-s);
        if(Math.hypot(p.x-c.x,p.z-c.z)>outerEdge(ring,line,half,p)+.3){edge=s;break}
      }
      if(edge<0||edge+4>L)continue;
      // The nose: the first point back from the ring where the island between it and the way out on its right (the
      // side the island is on, driving on the left) is wide enough for a bollard.
      const aways=oneway.filter(r=>r!==into&&near(r.centreline[0]!));
      let nose:{at:Vec2;travel:Vec2}|null=null;
      for(let back=edge+1;back<=Math.min(L-1,edge+16)&&!nose;back+=.5){
        const a=pointAtAlong(into,L-back),travel=a.direction,lx=travel.z,lz=-travel.x;
        for(const away of aways){
          let q:Vec2|null=null,qd=Infinity;
          for(let s=0;s<Math.min(length(away),40);s+=.5){
            const p=pointAtAlong(away,s),d=Math.hypot(p.x-a.x,p.z-a.z);
            if(d<qd){qd=d;q=p}
          }
          if(!q||qd>18||(q.x-a.x)*lx+(q.z-a.z)*lz>=0)continue;
          const gap=qd-(roadHalfWidth(into)+roadHalfWidth(away));
          if(gap<1.2)continue;
          const k=roadHalfWidth(into)+gap/2;
          nose={at:{x:a.x+(q.x-a.x)/qd*k,z:a.z+(q.z-a.z)/qd*k},travel};
          break;
        }
      }
      if(nose)out.bollards.push({id:`nose-${i}-${into.id}`,at:nose.at,travel:nose.travel,y:into.surfaceHeight,road:into});
    }
  });
  cache.set(location,out);
  return out;
}

/** The splitter's outline (a long, thin triangle on the road's centre line: wide at the nose, nothing at the tail). */
export function splitterOutline(s:Splitter,steps=8):Vec2[]{
  const left:Vec2[]=[],right:Vec2[]=[];
  for(let k=0;k<=steps;k++){
    const t=k/steps,along=s.noseAlong+(s.tailAlong-s.noseAlong)*t,w=s.width/2*(1-t);
    const p=pointAtAlong(s.road,along),rx=-p.direction.z,rz=p.direction.x;
    left.push({x:p.x-rx*w,z:p.z-rz*w});right.push({x:p.x+rx*w,z:p.z+rz*w});
  }
  return [...left,...right.reverse()];
}
