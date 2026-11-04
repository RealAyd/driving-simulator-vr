import {forwardFromHeading,rightFromHeading,type Vec2} from '../contracts';
import {aroundMini,miniAt,roundMinis,type MiniRoundabout} from '../world/miniRoundabout';
import {aroundRing,onRing,ringLanes} from '../world/roundaboutLanes';
import {keepLeftOffset,pointAtAlong,roadHalfWidth} from '../world/roadGeometry';
import type {KerbFootprint} from '../world/townscape';
import type {RouteLeg} from './route';

/** The learner's car: half its width and length (metres). */
const HALF_WIDTH=.9,HALF_LENGTH=2.15;
/** Room kept between the learner's car and a parked one beside it (metres): enough that it never clips one. */
const CLEARANCE=.6;
/** How far before and after a parked car the path is fully out (metres, beyond the two cars' half-lengths): the car
 * follows the path a few metres ahead, so it would otherwise turn back in while still alongside. */
const ALONGSIDE=4;
/** The tightest circle (metres, the car's middle) the learner's car drives round a mini-roundabout: it can turn no
 * tighter than about 4.3 m. */
const TIGHTEST_TURN=4.7;
/** Kept this far from the left kerb, eased over for something on the right (metres). */
const KERB_ROOM=.3;

/** Turning right by more than this at the end of a leg (radians) takes the right-hand lane of a one-way road. */
const RIGHT_TURN=.5;

/**
 * The lane along a leg (metres left of the centreline): the left lane; on a one-way road of two lanes or more, the
 * left-hand lane, or the right-hand lane for a right turn at its end (Highway Code rule 186, and rule 177 for a
 * right turn off a one-way street).
 */
function laneFor(leg:RouteLeg,next:RouteLeg|undefined):number{
  const {count,width}=leg.road.lanes;
  if(!leg.road.oneway||count<2)return keepLeftOffset(leg.road,HALF_WIDTH);
  const outer=(count-1)*width/2;
  if(!next)return outer;
  const a=pointAtAlong(leg.road,leg.to).direction,b=pointAtAlong(next.road,next.from).direction;
  const ax=a.x*leg.dir,az=a.z*leg.dir,bx=b.x*next.dir,bz=b.z*next.dir;
  // (Positive: to the right, clockwise.)
  const turn=Math.atan2(ax*bz-az*bx,ax*bx+az*bz);
  return turn>RIGHT_TURN?-outer:outer;
}

/**
 * The lane path along a mock test route, for assisted steering: points every 3 m in the left lane; past parked
 * cars, out towards the crown of the road (as a driver would), or between cars parked on both sides, easing in and
 * out over several metres. Offsets are metres left of the centreline. Each parked car is passed by its own size
 * (a van is wider than a small hatchback) with a clear gap; one given only as a point is taken as a typical car.
 */
export function routeLanePath(legs:RouteLeg[],parked:ReadonlyArray<Vec2&Partial<KerbFootprint>>,minis:readonly MiniRoundabout[]=[],
  onRoad?:(x:number,z:number)=>boolean):Vec2[]{
  const raw:Array<{x:number;z:number;dx:number;dz:number;lane:number;hi:number;lo:number;leg:number;edge:number}>=[];
  for(const [legIndex,leg] of legs.entries()){
    const n=Math.max(1,Math.ceil(Math.abs(leg.to-leg.from)/3)),lane=laneFor(leg,legs[legIndex+1]);
    for(let k=0;k<=n;k++){
      const p=pointAtAlong(leg.road,leg.from+(leg.to-leg.from)*k/n),dx=p.direction.x*leg.dir,dz=p.direction.z*leg.dir;
      let hi=lane,lo=-Infinity;
      for(const c of parked){
        const ox=c.x-p.x,oz=c.z-p.z,along=ox*dx+oz*dz,left=ox*dz-oz*dx;
        // (On the centre line, such as a traffic island's bollard: passed on the right, keeping left.)
        if(Math.abs(along)>12||Math.abs(left)>4.5)continue;
        // The parked car's extent along the road and across it.
        const hw=c.halfWidth??.9,hl=c.halfLength??2.2;
        const f=c.heading===undefined?{x:dx,z:dz}:forwardFromHeading(c.heading),r=c.heading===undefined?{x:-dz,z:dx}:rightFromHeading(c.heading);
        const extAlong=hl*Math.abs(f.x*dx+f.z*dz)+hw*Math.abs(r.x*dx+r.z*dz);
        const extAcross=hl*Math.abs(f.x*dz-f.z*dx)+hw*Math.abs(r.x*dz-r.z*dx);
        if(Math.abs(along)>extAlong+HALF_LENGTH+ALONGSIDE)continue;
        const room=extAcross+HALF_WIDTH+CLEARANCE;
        if(left>=.3)hi=Math.min(hi,left-room);else lo=Math.max(lo,left+room);
      }
      // (How far left the car can go: to just short of the left kerb.)
      const edge=Math.max(lane,roadHalfWidth(leg.road)-HALF_WIDTH-KERB_ROOM);
      raw.push({x:p.x,z:p.z,dx,dz,lane,hi,lo,leg:legIndex,edge});
    }
  }
  // Each point takes the tightest room needed within 24 m ahead (pulled out in good time) and 12 m behind (back in
  // soon after, out of the way of traffic coming the other way: a car out in the road for 24 m after passing met cars
  // turning out of junctions head on).
  // Turning into a road with a car parked a little way in, the car turns in already easing out towards the crown (it
  // has no straight run to ease out on): from the corner, the first 24 m of the road turned into ease out three times
  // as early.
  const legStart=raw.map(p=>raw.findIndex(q=>q.leg===p.leg)); // (index of the first point of each point's leg)
  const lanePoints=raw.map((p,i)=>{
    let hi=p.lane,lo=-Infinity;
    for(let j=Math.max(0,i-8);j<=Math.min(raw.length-1,i+8);j++){
      const turnedIn=p.leg>0&&raw[j]!.leg===p.leg&&j>i&&j-legStart[i]!<=8;
      const ease=Math.abs(j-i)*(j<i?.6:.3);
      hi=Math.min(hi,raw[j]!.hi+(turnedIn?.1*Math.abs(j-i):ease));lo=Math.max(lo,raw[j]!.lo-ease);
    }
    // Pressed from the right (a traffic island's bollard) with nothing on the left: over to the left as far as it
    // needs, short of the kerb; between things both sides, the middle of the gap.
    const off=hi>=lo?hi:hi>=p.lane?Math.min(lo,p.edge):(hi+lo)/2;
    return {x:p.x+p.dz*off,z:p.z-p.dx*off,leg:p.leg};
  });
  // Corners: the lane lines of two roads meet at an angle (and the lane offsets put the last point of one a little
  // past the first of the next), so the last and first few metres either side of each join are replaced with a
  // smooth curve through the corner, the way a car turns.
  // The curve starts and ends CUT metres either side of the join: 5 m (about a 5 m radius for a right angle, a turn
  // into a side road). A sharper turn (a road meeting at an acute angle) would ask for a tighter curve than the car can
  // turn (about 4.3 m at the least): there the curve is as wide as it can be (up to 12 m) with the whole car still on
  // the carriageway along it (`onRoad`, where given).
  const byLeg=legs.map((_,leg)=>lanePoints.filter(p=>p.leg===leg));
  // The mini-roundabout at a join between two legs, to be driven round its disc. Where the roads meet at its middle
  // (mapped as one point) the lanes' ends are beside each other there, not either side of the disc: a curve round the
  // disc between them went all the way round. There the join is a corner like any other, which keeps the disc on
  // the right (the lane lines cross to the left of it, UK).
  const roundMini=(q:Vec2,r:Vec2)=>{
    const m=miniAt(minis,{x:(q.x+r.x)/2,z:(q.z+r.z)/2});
    if(!m||ringLanes(m))return m;
    return Math.hypot(q.x-m.position.x,q.z-m.position.z)<m.radius/2&&Math.hypot(r.x-m.position.x,r.z-m.position.z)<m.radius/2?null:m;
  };
  const curve=(prev:Vec2,start:Vec2,from:Vec2,to:Vec2)=>{
    const c={x:(prev.x+start.x)/2,z:(prev.z+start.z)/2},out:Vec2[]=[];
    for(let k=1;k<6;k++){const t=k/6,u=1-t;out.push({x:u*u*from.x+2*u*t*c.x+t*t*to.x,z:u*u*from.z+2*u*t*c.z+t*t*to.z})}
    return out;
  };
  const beyond=(pts:readonly Vec2[],from:Vec2,cut:number)=>pts.find(p=>Math.hypot(p.x-from.x,p.z-from.z)>cut);
  const cutAt=legs.map((_,leg)=>{
    const a=byLeg[leg-1],b=byLeg[leg];
    if(!onRoad||!a||a.length<2||!b||b.length<2)return 5;
    const p=a.at(-2)!,q=a.at(-1)!,r=b[0]!,t=b[1]!;
    if(roundMini(q,r))return 5;
    const turn=Math.abs(Math.atan2((q.x-p.x)*(t.z-r.z)-(q.z-p.z)*(t.x-r.x),(q.x-p.x)*(t.x-r.x)+(q.z-p.z)*(t.z-r.z)));
    const want=Math.min(12,5*Math.tan(Math.min(turn,2.6)/2));
    for(let cut=Math.floor(want);cut>5;cut--){
      const from=beyond([...a].reverse(),q,cut),to=beyond(b,r,cut);
      if(!from||!to)continue;
      const pts=[from,...curve(q,r,from,to),to];
      // The car's sides along the curve on the carriageway.
      if(pts.every((m,i)=>{const n=pts[Math.min(i+1,pts.length-1)]!,o=pts[Math.max(i-1,0)]!,dx=n.x-o.x,dz=n.z-o.z,l=Math.hypot(dx,dz)||1;
        return onRoad(m.x,m.z)&&onRoad(m.x-dz/l*HALF_WIDTH,m.z+dx/l*HALF_WIDTH)&&onRoad(m.x+dz/l*HALF_WIDTH,m.z-dx/l*HALF_WIDTH)}))return cut;
    }
    return 5;
  });
  const out:Vec2[]=[];
  for(let leg=0;leg<legs.length;leg++){
    const pts=byLeg[leg]!;
    if(pts.length===0)continue;
    const start=pts[0]!,end=pts.at(-1)!,cutStart=cutAt[leg]!,cutEnd=cutAt[leg+1]??5;
    const kept=pts.filter(p=>(leg===0||Math.hypot(p.x-start.x,p.z-start.z)>cutStart)&&(leg===legs.length-1||Math.hypot(p.x-end.x,p.z-end.z)>cutEnd));
    const prev=leg>0?lanePoints.filter(p=>p.leg===leg-1).at(-1):undefined;
    const from=out.at(-1),to=kept[0];
    if(prev&&from&&to){
      const c={x:(prev.x+start.x)/2,z:(prev.z+start.z)/2};
      // A mini-roundabout: clockwise round its disc (from where the road in meets it to where the road out leaves).
      const mini=roundMini(prev,start),ring=mini?ringLanes(mini):undefined;
      if(ring){
        // A bigger roundabout: from where the way in reaches the ring's edge, round in the lane for the exit (out a
        // lane at a time past the exits before), to where the way out leaves it (roundaboutLanes.ts).
        while(out.length>2&&onRing(ring,out.at(-1)!,.5))out.pop();
        const next=pts.slice(1).find(p=>!onRing(ring,p,.5))??kept[0]??start,from2=out.at(-2)??prev,a2=out.at(-1)??prev;
        // (The way out's direction where the car joins it, not further on where it may bend.)
        const i=pts.indexOf(next as typeof pts[number]),before=pts[i-1]&&i>0?pts[i-1]!:next,after=pts[i+1]??next;
        const dir=(p:Vec2,q:Vec2)=>{const l=Math.hypot(q.x-p.x,q.z-p.z)||1;return {x:(q.x-p.x)/l,z:(q.z-p.z)/l}};
        out.push(...aroundRing(ring,a2,next,dir(from2,a2),before!==next?dir(before,next):dir(next,after)).points.slice(1));
        for(const p of kept)if(!onRing(ring,p,.5)&&p!==next)out.push({x:p.x,z:p.z});
        continue;
      }
      if(mini)out.push(...aroundMini(mini,prev,start,TIGHTEST_TURN));
      else out.push(...curve(prev,start,from,to));
    }
    for(const p of kept)out.push({x:p.x,z:p.z});
  }
  // (Where the map has a mini-roundabout as one point, the joins above cross its disc: taken round it.)
  return roundMinis(out,minis.filter(m=>!ringLanes(m)),TIGHTEST_TURN,onRoad);
}
