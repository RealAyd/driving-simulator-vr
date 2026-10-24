import {forwardFromHeading,rightFromHeading,type Vec2} from '../contracts';
import {aroundMini,miniAt,type MiniRoundabout} from '../world/miniRoundabout';
import {pointAtAlong} from '../world/roadGeometry';
import type {KerbFootprint} from '../world/townscape';
import type {RouteLeg} from './route';

/** The learner's car: half its width and length (metres). */
const HALF_WIDTH=.9,HALF_LENGTH=2.15;
/** Room kept between the learner's car and a parked one beside it (metres): enough that it never clips one. */
const CLEARANCE=.6;
/** How far before and after a parked car the path is fully out (metres, beyond the two cars' half-lengths): the car
 * follows the path a few metres ahead, so it would otherwise turn back in while still alongside. */
const ALONGSIDE=4;

/**
 * The lane path along a mock test route, for assisted steering: points every 3 m in the left lane; past parked
 * cars, out towards the crown of the road (as a driver would), or between cars parked on both sides, easing in and
 * out over several metres. Offsets are metres left of the centreline. Each parked car is passed by its own size
 * (a van is wider than a small hatchback) with a clear gap; one given only as a point is taken as a typical car.
 */
export function routeLanePath(legs:RouteLeg[],parked:ReadonlyArray<Vec2&Partial<KerbFootprint>>,minis:readonly MiniRoundabout[]=[]):Vec2[]{
  const raw:Array<{x:number;z:number;dx:number;dz:number;lane:number;hi:number;lo:number;leg:number}>=[];
  for(const [legIndex,leg] of legs.entries()){
    const n=Math.max(1,Math.ceil(Math.abs(leg.to-leg.from)/3)),lane=leg.road.oneway?0:leg.road.lanes.width/2;
    for(let k=0;k<=n;k++){
      const p=pointAtAlong(leg.road,leg.from+(leg.to-leg.from)*k/n),dx=p.direction.x*leg.dir,dz=p.direction.z*leg.dir;
      let hi=lane,lo=-Infinity;
      for(const c of parked){
        const ox=c.x-p.x,oz=c.z-p.z,along=ox*dx+oz*dz,left=ox*dz-oz*dx;
        if(Math.abs(along)>12||Math.abs(left)>4.5||Math.abs(left)<.3)continue;
        // The parked car's extent along the road and across it.
        const hw=c.halfWidth??.9,hl=c.halfLength??2.2;
        const f=c.heading===undefined?{x:dx,z:dz}:forwardFromHeading(c.heading),r=c.heading===undefined?{x:-dz,z:dx}:rightFromHeading(c.heading);
        const extAlong=hl*Math.abs(f.x*dx+f.z*dz)+hw*Math.abs(r.x*dx+r.z*dz);
        const extAcross=hl*Math.abs(f.x*dz-f.z*dx)+hw*Math.abs(r.x*dz-r.z*dx);
        if(Math.abs(along)>extAlong+HALF_LENGTH+ALONGSIDE)continue;
        const room=extAcross+HALF_WIDTH+CLEARANCE;
        if(left>0)hi=Math.min(hi,left-room);else lo=Math.max(lo,left+room);
      }
      raw.push({x:p.x,z:p.z,dx,dz,lane,hi,lo,leg:legIndex});
    }
  }
  // Each point takes the tightest room needed within 24 m either side (pulled out in good time, back after).
  const lanePoints=raw.map((p,i)=>{
    let hi=p.lane,lo=-Infinity;
    for(let j=Math.max(0,i-8);j<=Math.min(raw.length-1,i+8);j++){hi=Math.min(hi,raw[j]!.hi+Math.abs(j-i)*.3);lo=Math.max(lo,raw[j]!.lo-Math.abs(j-i)*.3)}
    const off=hi>=lo?hi:(hi+lo)/2;
    return {x:p.x+p.dz*off,z:p.z-p.dx*off,leg:p.leg};
  });
  // Corners: the lane lines of two roads meet at an angle (and the lane offsets put the last point of one a little
  // past the first of the next), so the last and first few metres either side of each join are replaced with a
  // smooth curve through the corner, the way a car turns.
  const CUT=5;
  const out:Vec2[]=[];
  for(let leg=0;leg<legs.length;leg++){
    const pts=lanePoints.filter(p=>p.leg===leg);
    if(pts.length===0)continue;
    const start=pts[0]!,end=pts.at(-1)!;
    const kept=pts.filter(p=>(leg===0||Math.hypot(p.x-start.x,p.z-start.z)>CUT)&&(leg===legs.length-1||Math.hypot(p.x-end.x,p.z-end.z)>CUT));
    const prev=leg>0?lanePoints.filter(p=>p.leg===leg-1).at(-1):undefined;
    const from=out.at(-1),to=kept[0];
    if(prev&&from&&to){
      const c={x:(prev.x+start.x)/2,z:(prev.z+start.z)/2};
      // A mini-roundabout: clockwise round its disc (from where the road in meets it to where the road out leaves).
      const mini=miniAt(minis,c);
      if(mini)out.push(...aroundMini(mini,prev,start));
      else for(let k=1;k<6;k++){const t=k/6,u=1-t;out.push({x:u*u*from.x+2*u*t*c.x+t*t*to.x,z:u*u*from.z+2*u*t*c.z+t*t*to.z})}
    }
    for(const p of kept)out.push({x:p.x,z:p.z});
  }
  return out;
}
