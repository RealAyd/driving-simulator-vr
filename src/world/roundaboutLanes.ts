import type {Vec2} from '../contracts';

/**
 * The lanes of a roundabout bigger than a mini, and the way round it in a lane (pure geometry: roundabouts.ts fills it
 * in for each ring; traffic.ts and routePath.ts drive it; the marking and the instructor judge by it).
 *
 * Which lane, by the owner's rules (an approved driving instructor), checked against the Highway Code (rule 186):
 * - the first exit (or any exit to the left): the left lane, signalling left on the approach;
 * - the second exit, straight on: the second lane (the right lane on a two-lane roundabout, the middle of three);
 * - exits to the right and all the way round: the right lane, signalling right on the approach;
 * - the third exit of five or more on a three-lane roundabout (about twelve o'clock): the middle or the right lane;
 * - from a one-lane way in, on to the lane needed; then out one lane at a time as the exits before yours go by,
 *   checking the mirror on that side first, in the left lane by your exit (or leaving from the right lane where the
 *   way out has two lanes);
 * - in the wrong lane, go round again rather than cut across.
 * Rule 186 leaves intermediate exits to "the appropriate lane", unless signs or markings say otherwise: where the map
 * gives lane arrows they decide (lanesFor's `marked`).
 *
 * Lanes are numbered from the left (1: the outside of the ring, going round clockwise, the island on the right).
 */
export interface RingLanes{
  /** The ring's centreline in the way of travel (a closed loop, its first point not repeated), and the distance along
   * it at each point. */
  line:Vec2[];at:number[];length:number;
  /** The most lanes it has anywhere, and each stretch's own (from each point to the next: an interchange's ring has
   * more lanes in places, and lanes are kept to the carriageway there is). */
  lanes:number;stretch:Array<{count:number;width:number}>;
  /** Where each way out leaves the ring (distance along `line`). */
  exits:number[];
}

const known=new WeakMap<object,RingLanes>();
/** The lanes of a ring junction (from drivingView), if it is one. */
export function ringLanes(junction:object):RingLanes|undefined{return known.get(junction)}
export function setRingLanes(junction:object,lanes:RingLanes):void{known.set(junction,lanes)}

/** From the ring's roads in order round it, and the points where the ways out leave it. */
export function makeRingLanes(pieces:ReadonlyArray<{centreline:readonly Vec2[];lanes:{count:number;width:number}}>,exits:readonly Vec2[]):RingLanes{
  const line:Vec2[]=[],stretch:RingLanes['stretch']=[];
  for(const r of pieces)for(const p of r.centreline)if(!line.length||Math.hypot(p.x-line.at(-1)!.x,p.z-line.at(-1)!.z)>.05){
    line.push({x:p.x,z:p.z});stretch.push({count:r.lanes.count,width:r.lanes.width});
  }
  if(line.length>2&&Math.hypot(line[0]!.x-line.at(-1)!.x,line[0]!.z-line.at(-1)!.z)<.05){line.pop();stretch.pop()}
  // (A point's stretch is the road it starts: the last point of a piece starts the next one's.)
  for(let i=0;i<line.length;i++)stretch[i]=stretch[(i+1)%line.length]!;
  const at=[0];
  for(let i=1;i<line.length;i++)at.push(at[i-1]!+Math.hypot(line[i]!.x-line[i-1]!.x,line[i]!.z-line[i-1]!.z));
  const length=at.at(-1)!+Math.hypot(line[0]!.x-line.at(-1)!.x,line[0]!.z-line.at(-1)!.z);
  const r:RingLanes={line,at,length,lanes:Math.max(...stretch.map(x=>x.count)),stretch,exits:[]};
  // (Only roads that start at the ring itself: a big interchange's middle is far from its edge.)
  r.exits=exits.map(p=>project(r,p)).filter(q=>Math.abs(q.left)<r.lanes*1.8+2).map(q=>q.along).sort((a,b)=>a-b);
  return r;
}

/** Forward distance round the ring from `from` to `to` (both distances along it). */
export const ahead=(r:RingLanes,from:number,to:number)=>((to-from)%r.length+r.length)%r.length;

/** The nearest point of the ring's centreline: how far along, and how far to its left (outward). */
export function project(r:RingLanes,p:Vec2):{along:number;left:number}{
  let best={along:0,left:0,d:Infinity};
  for(let i=0;i<r.line.length;i++){
    const a=r.line[i]!,b=r.line[(i+1)%r.line.length]!,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(l*l))),qx=a.x+dx*t,qz=a.z+dz*t,d=Math.hypot(p.x-qx,p.z-qz);
    // Left of travel is (dz, −dx).
    if(d<best.d)best={along:r.at[i]!+t*l,left:(p.x-qx)*dz/l-(p.z-qz)*dx/l,d};
  }
  return {along:best.along,left:best.left};
}

/** The point `left` metres left of the centreline, `along` metres round. */
export function pointAt(r:RingLanes,along:number,left:number):Vec2&{dir:Vec2}{
  const s=((along%r.length)+r.length)%r.length;
  let i=0;while(i<r.line.length-1&&r.at[i+1]!<=s)i++;
  const a=r.line[i]!,b=r.line[(i+1)%r.line.length]!,l=Math.hypot(b.x-a.x,b.z-a.z)||1,t=(s-r.at[i]!)/l;
  const dir={x:(b.x-a.x)/l,z:(b.z-a.z)/l};
  return {x:a.x+(b.x-a.x)*t+dir.z*left,z:a.z+(b.z-a.z)*t-dir.x*left,dir};
}

/** The lanes where the ring is `along` metres round. */
export function stretchAt(r:RingLanes,along:number):{count:number;width:number}{
  const s=((along%r.length)+r.length)%r.length;
  let i=0;while(i<r.line.length-1&&r.at[i+1]!<=s)i++;
  return r.stretch[i]!;
}

/** A lane's middle, metres left of the centreline (outward), `along` metres round (where the ring has fewer lanes,
 * the inner ones are one). */
export function laneOffset(r:RingLanes,lane:number,along:number):number{
  const {count,width}=stretchAt(r,along);
  return ((count+1)/2-Math.min(lane,count))*width;
}

/** The lane a point is in (1: the left, outside; 0 off the ring's carriageway). */
export function laneAt(r:RingLanes,p:Vec2):number{
  const {along,left}=project(r,p),{count,width}=stretchAt(r,along);
  if(Math.abs(left)>count*width/2+.3)return 0;
  return Math.max(1,Math.min(count,Math.round((count+1)/2-left/width)));
}

export type RingTurn='left'|'ahead'|'right';

/**
 * The lanes to approach and go on to the ring in (see the rules above), for exit `exit` (1: the first) of `exits`,
 * going `turn`. `marked`: the lanes the map's arrows give for that way, where it gives them (they decide).
 */
export function lanesFor(lanes:number,exit:number,exits:number,turn:RingTurn,marked?:readonly number[]):number[]{
  if(marked?.length)return [...marked];
  if(lanes<2)return [1];
  if(exit<=1||turn==='left')return [1];
  if(turn==='ahead')return [Math.min(2,lanes)];
  if(lanes>=3&&exit===3&&exits>=5)return [lanes-1,lanes];
  return [lanes];
}

/** The lane to be in `passed` exits round, for exit `exit` entered in `lane`: out one lane per exit at the end. */
export const laneAfter=(lane:number,exit:number,passed:number)=>Math.max(1,Math.min(lane,exit-passed));

/** Which way a movement through the ring goes, from the way in to the way out (as the route planner says it). */
export function turnOf(inDir:Vec2,outDir:Vec2):RingTurn{
  const right=outDir.x*-inDir.z+outDir.z*inDir.x,fwd=outDir.x*inDir.x+outDir.z*inDir.z,angle=Math.atan2(right,fwd);
  return Math.abs(angle)<.6?'ahead':angle>0||Math.abs(angle)>2.8?'right':'left';
}

export interface WayRound{points:Vec2[];
  /** The exit taken (1: the first), of how many, which way, and the lane on to the ring. */
  exit:number;exits:number;turn:RingTurn;lane:number;
  /** Distance along `points` where each move out a lane begins. */
  shifts:number[]}

/**
 * The way round from `a` (where the way in meets the ring) to `b` (where the way out leaves it), going `inDir` at a
 * and `outDir` at b: on to the ring in its lane (`pick` chooses among the lanes allowed), round in it, out a lane at a
 * time past the exits before, and off. Points about every 1.5 m.
 */
export function aroundRing(r:RingLanes,a:Vec2,b:Vec2,inDir:Vec2,outDir:Vec2,pick:(allowed:number[])=>number=l=>l[0]!,marked?:readonly number[]):WayRound{
  const pa=project(r,a),pb=project(r,b);
  let span=ahead(r,pa.along,pb.along);
  // Back the way it came (a U-turn): all the way round.
  if(span<6)span+=r.length;
  // The exits on the way (not the one it came in by, nor its own).
  const between=r.exits.map(e=>ahead(r,pa.along,e)).filter(d=>d>4&&d<span-4).sort((x,y)=>x-y);
  const exits=r.exits.filter(e=>{const d=ahead(r,pa.along,e);return d>4&&d<r.length-4}).length+(span>r.length-4?1:0);
  const exit=between.length+1,turn=span>r.length-4?'right':turnOf(inDir,outDir);
  const lane=pick(lanesFor(r.lanes,exit,Math.max(exit,exits),turn,marked));
  // Each move out starts a few metres past the exit it follows.
  const laneAtS=(s:number)=>laneAfter(lane,exit,between.filter(d=>s>d+3).length);
  const step=1.5,n=Math.max(6,Math.ceil(span/step));
  const raw:number[]=[];
  for(let k=0;k<=n;k++)raw.push(laneOffset(r,laneAtS(span*k/n),pa.along+span*k/n));
  // Lane changes eased over about 15 m.
  const w=Math.max(1,Math.round(7.5/(span/n)));
  const smooth=raw.map((_,k)=>{let s=0,c=0;for(let j=Math.max(0,k-w);j<=Math.min(n,k+w);j++){s+=raw[j]!;c++}return s/c});
  // On and off: carrying straight on from the way in, turning into the lane over up to 10 m; and lining up with the
  // way out over the last 5 m (not sliding along the ring outside its edge, over the kerb at the corner).
  const ease=(t:number)=>t<=0?0:t>=1?1:t*t*(3-2*t);
  const edge=Math.min(10,span/3),offEdge=Math.min(5,span/4);
  const points:Vec2[]=[];
  for(let k=0;k<=n;k++){
    const s=span*k/n,p=pointAt(r,pa.along+s,smooth[k]!);
    let x=p.x,z=p.z;
    const on=ease(s/edge),off=ease((span-s)/offEdge);
    x=a.x+inDir.x*s+(x-a.x-inDir.x*s)*on;z=a.z+inDir.z*s+(z-a.z-inDir.z*s)*on;
    x=b.x-outDir.x*(span-s)+(x-b.x+outDir.x*(span-s))*off;z=b.z-outDir.z*(span-s)+(z-b.z+outDir.z*(span-s))*off;
    points.push({x,z});
  }
  points[0]={x:a.x,z:a.z};points[n]={x:b.x,z:b.z};
  // (Where the move out starts: the easing begins half its length before the lane changes.)
  const shifts=between.filter((d,i)=>laneAfter(lane,exit,i+1)<laneAfter(lane,exit,i)).map(d=>Math.max(0,d+3-7.5));
  return {points,exit,exits:Math.max(exit,exits),turn,lane,shifts};
}

/** On the ring's carriageway (with `margin` metres more at each side). */
export function onRing(r:RingLanes,p:Vec2,margin=0):boolean{
  const {along,left}=project(r,p),{count,width}=stretchAt(r,along);
  return Math.abs(left)<=count*width/2+margin;
}
