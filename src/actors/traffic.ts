import {pointAtAlong,sampleRoad} from '../world/roadGeometry';
import type {LiveStop} from '../world/trafficSignals';
import type {KerbFootprint} from '../world/townscape';
import {boxesOverlap} from '../world/obstacles';
import {aroundMini,miniAt,type MiniRoundabout} from '../world/miniRoundabout';
import {junctionMouths} from '../world/junctionControls';
import {drivingView} from '../world/roundabouts';
import {roadHalfWidth} from '../world/roadGeometry';
import {headingFromDirection,type Location,type Pose,type Road,type Seconds,type SimModule,type Vec2} from '../contracts';
const roadLength=(road:Road)=>road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);

/**
 * Background traffic on a generated area's road network: cars that drive the mapped roads in the left lane at a
 * believable speed for the road, pick a way on at each junction, ease past parked cars, give way at mini-roundabouts,
 * keep their distance from each other and slow or stop for the learner's car (on a narrow stretch they give way to it,
 * and one face to face with it backs up to a space). A learner getting nowhere a while (standing, or edging to and
 * fro) is waiting for them: they stop giving way and edge by, beside it or round it. At junctions they follow the
 * Highway Code: out of a side road (give way or STOP lines, as marked) only into a safe gap in the main road's
 * traffic, after a full stop at a STOP line (rules 170–172); turning right off the main road, they wait for oncoming
 * traffic (rule 180). Following is the Intelligent Driver Model (Treiber, Hennecke and Helbing, 2000): smooth, with a
 * safe gap. Scenery: they are solid (the learner can hit them) but never assessed. Cyclists ride among them, near the
 * kerb; cars overtake them with 1.5 m to spare (rule 163) when the road ahead is clear. Traffic gathers at junctions
 * rather than along straight roads: cars come in near junctions and seldom head down the learner's road towards it,
 * and keep out of cul-de-sacs (one that turns into one parks at the end). Kept to the streets round the learner: a
 * car that drifts too far away, stands a long while, or has parked at a dead end comes back elsewhere, always out of
 * the learner's sight (never vanishing in view).
 */

export interface TrafficCar{id:string;kind:'car'|'bus'|'cycle';pose:Pose;speed:number;colour:string;model:number;visible:boolean;halfLength:number;halfWidth:number;
  /** Pulled in and parked at the end of a cul-de-sac (or behind one parked there): not traffic standing about. */
  parked?:boolean}
interface Leg{points:Vec2[];lengths:number[];road:Road|null;dir:1|-1;cruise:number;lane:number;
  /** The node this leg ends at (a road end or a junction), or −1. */
  endNode:number;
  /** Where it turns off into a side road part-way along (the leg ends there). */
  exit?:{road:Road;dir:1|-1}|undefined;
  /** Where on the road the leg ends (metres along the road's own direction). */
  endAlong?:number;
  /** Its turn off into the side road (`exit`) is to the right: across the oncoming lane. */
  rightTurn?:boolean;
  /** A one-way carriageway that meets a two-way road at its start or end (a split): the lane offset kept there, eased
   * to the carriageway's own over SPLIT_EASE metres, so the two directions pass each side of the meeting point. */
  splitStart?:number;splitEnd?:number}
interface Driver{car:TrafficCar;leg:Leg;s:number;lat:number;next:Leg|null;
  /** Buses: seconds left at the current stop, and the stops already served on this leg. */
  dwell:number;served:Set<number>;stop?:number;
  /** Seconds stood still (not at a bus stop): after a while, a car stuck behind another that is also waiting creeps on. */
  waited:number;
  /** Seconds stopped nose to nose with the stopped learner, in each other's way. */
  faceOff?:number;
  /** Waiting behind a parked car (or the learner standing) for traffic coming the other way to pass. */
  heldBack?:boolean;
  /** Tucked in to the kerb to let a stopped learner through a narrow gap (until the learner has gone by). */
  squeezing?:boolean;
  /** Driving on out of a tangle with this car (ignoring it until clear of it). */
  through?:Driver|undefined;
  /** Waved on through a junction where everyone stood waiting for someone else (seconds left). */
  waved?:number;
  /** Edging past the learner standing beside its way, where there is room (seconds left). */
  creep?:number;
  /** Whether the current leg ends with no way on: false, or how far short of its end to stop (metres; worked out near
   * its end, cleared with each new leg). */
  deadEnd?:false|number|undefined;
  /** At the end of a side road (give way or STOP lines) or turning right: stopped at the line (STOP), or going. */
  atLine?:'stopped'|'going'|undefined;
  /** Backing up to make room for the learner (or another car) it met face to face where neither could pass: who it
   * makes room for, and how far it has backed. */
  backing?:{for:string;moved:number;stuck?:number;
    /** More room wanted than the first time (the other could still not get by). */
    extra?:number}|undefined;
  /** Tucked in, waiting for this one to come by (the learner, or a car's id) after backing up; and for how long. */
  yieldTo?:{for:string;waited:number;extra?:number}|undefined;
  /** Diagnostics: what it slowed for last. */
  why?:string}

const HALF_LENGTH=2.2,HALF_WIDTH=.95,BUS={halfLength:5.75,halfWidth:1.275},CYCLE={halfLength:.9,halfWidth:.35};
/** Riding this far in from the kerb (centre of the bicycle, metres). */
const CYCLE_KERB=.85;
/** Room left passing a cyclist (Highway Code rule 163: at least 1.5 m at up to 30 mph). */
const CYCLE_ROOM=1.5;
/** A carriageway narrower than this (metres) has room for one car at a time: traffic gives way to the learner on it. */
const NARROW=5.8;
/** Backing up out of the learner's way: this fast (m/s), at most this far (m). */
const BACK_SPEED=1.6,BACK_MAX=45;
/** Parked cars this far ahead (metres) are passed: the car eases out this fast (m/s sideways) to clear them. */
const PASS_AHEAD=24,SIDEWAYS=1.3;
const ACCEL=1.6,BRAKE=4.5,GAP=7;
/** The Intelligent Driver Model: acceleration and comfortable braking (m/s²), time headway (s), and the gap kept
 * standing behind another car (m). Other things ahead (the learner, a line) keep the wider GAP. */
const IDM={a:ACCEL,b:2.2,T:1.4,s0:2.5};
/** A gap in the main road's traffic taken out of a side road or across the oncoming lane (seconds). */
const SAFE_GAP=4;
const SPLIT_EASE=25;
/** A way on turning more than this far back (about 150°, as cosine) is a U-turn: traffic never takes one. */
const UTURN_COS=.87;
/** The lane offset a car keeps at distance `s` along a leg (left of the road's centre, metres). */
function laneAt(leg:Leg,s:number):number{
  const end=leg.lengths.at(-1)!-s;
  if(leg.splitStart!==undefined&&s<SPLIT_EASE)return leg.splitStart+(leg.lane-leg.splitStart)*s/SPLIT_EASE;
  if(leg.splitEnd!==undefined&&end<SPLIT_EASE)return leg.splitEnd+(leg.lane-leg.splitEnd)*Math.max(0,end)/SPLIT_EASE;
  return leg.lane;
}
/** Cyclists' jerseys (bright, as most are). */
const JERSEYS=['#f97316','#0ea5e9','#facc15','#22c55e','#e11d48','#a855f7'];
const COLOURS=['#1f2a44','#c9ccd1','#7a1e1e','#2e3a2f','#4d5f73','#3f444b','#24476b','#5b6168','#8a8f96','#14161a'];
const mph=(v:number)=>v/2.237;

export interface TrafficOptions{
  count:number;
  /** Parked cars (their centres, and sizes where known): traffic eases towards the crown of the road to pass them. */
  parked:ReadonlyArray<Vec2&Partial<KerbFootprint>>;
  learner:()=>{pose:Pose;speed:number};
  /** How many of `count` are buses (they stop at the bus stops on their way, at the kerb). */
  buses?:number;
  /** How many of `count` are cyclists (after the buses). */
  cycles?:number;
  busStops?:Vec2[];
  seed?:number;
  /** Traffic lights (stop lines and their state now): traffic stops at red, and at amber when it can. */
  signals?:()=>readonly LiveStop[];
}

export class Traffic implements SimModule{
  readonly id='traffic';
  readonly cars:TrafficCar[]=[];
  /** Diagnostics: why each car is slowing or waiting, and for how long it has stood. */
  reasons():Array<{id:string;why:string;waited:number}>{return this.drivers.map(d=>({id:d.car.id,why:d.why??'',waited:d.waited}))}
  private drivers:Driver[]=[];
  private readonly nodes:Array<{x:number;z:number;junction:boolean;radius:number}>=[];
  private readonly minis:MiniRoundabout[]=[];
  /** Road ends at each node: road, and whether the road starts (+1, leaves the node along its direction) there. */
  private readonly ends:Array<Array<{road:Road;dir:1|-1}>>=[];
  private seed:number;

  private readonly location:Location;
  constructor(place:Location,private readonly options:TrafficOptions){
    // The place as driven: a roundabout's ring is one junction, gone round clockwise.
    const location=this.location=drivingView(place);
    this.seed=options.seed??20261021;
    // Nodes: junctions, then road ends (merged where they meet, within 3 m).
    for(const j of location.junctions){this.nodes.push({x:j.position.x,z:j.position.z,junction:true,radius:j.radius});this.ends.push([]);this.minis.push(j)}
    const nodeAt=(p:Vec2)=>{
      for(let i=0;i<this.nodes.length;i++){const n=this.nodes[i]!;if(Math.hypot(n.x-p.x,n.z-p.z)<(n.junction?n.radius+1.5:3))return i}
      this.nodes.push({x:p.x,z:p.z,junction:false,radius:0});this.ends.push([]);
      return this.nodes.length-1;
    };
    for(const road of location.roads){
      if(road.centreline.length<2)continue;
      const a=nodeAt(road.centreline[0]!),b=nodeAt(road.centreline.at(-1)!);
      // Leaving a node: forwards from its start; backwards from its end unless one way.
      this.ends[a]!.push({road,dir:1});
      if(!road.oneway)this.ends[b]!.push({road,dir:-1});
      this.roadNodes.set(road,[a,b]);
    }
    // Side roads joining part-way along a road (a T-junction: the side road's end meets the road's side, not its end).
    for(const road of location.roads){
      const len=roadLength(road),list:Array<{along:number;road:Road;dir:1|-1}>=[];
      for(const other of location.roads){
        if(other===road||other.centreline.length<2||other.level!==road.level)continue;
        for(const [end,dir] of [[other.centreline[0]!,1],[other.centreline.at(-1)!,-1]] as const){
          if(dir<0&&other.oneway)continue;
          const at=sampleRoad(road,end.x,end.z);
          if(at.distance<7&&at.along>8&&at.along<len-8)list.push({along:at.along,road:other,dir});
        }
      }
      this.sideRoads.set(road,list);
    }
    // Where roads meet (traffic is brought in near these): junctions, road ends three or more roads share, and the
    // points where side roads join part-way along a road.
    for(const [k,n] of this.nodes.entries())if(n.junction||new Set(this.ends[k]!.map(e=>e.road)).size>=3)this.junctionPoints.push({x:n.x,z:n.z});
    for(const [road,list] of this.sideRoads)for(const e of list){const p=pointAtAlong(road,e.along);this.junctionPoints.push({x:p.x,z:p.z})}
    for(const m of junctionMouths(location))
      this.mouths.set(`${m.road.id}|${m.atEnd?1:0}`,{kind:m.kind,main:m.main,point:m.atEnd?m.road.centreline.at(-1)!:m.road.centreline[0]!,lineAlong:m.lineAlong});
    this.reset();
  }
  private readonly roadNodes=new Map<Road,[number,number]>();
  /** Side-road ends with give way or STOP lines (as the road markings have them), by road and end. */
  private readonly mouths=new Map<string,{kind:'give-way'|'stop';main:Road;point:Vec2;lineAlong:number}>();
  private readonly sideRoads=new Map<Road,Array<{along:number;road:Road;dir:1|-1}>>();
  private readonly junctionPoints:Vec2[]=[];
  /** The road the learner is on and which way along it (worked out twice a second), and when it was worked out. */
  private learnerOn:{road:Road;dir:1|-1}|null=null;
  private learnerOnAge=Infinity;
  /** Seconds since the learner last got 3 m on from where it was (standing, or edging to and fro, is waiting). */
  private learnerIdle=0;
  private learnerAnchor:Vec2|null=null;

  /** Buses standing at a bus stop now (`stop`: its index in the options' busStops). */
  atStops():Array<{stop:number;pose:Pose;halfLength:number;halfWidth:number}>{
    return this.drivers.filter(d=>d.dwell>0&&d.stop!==undefined&&d.car.visible).map(d=>({stop:d.stop!,pose:d.car.pose,halfLength:d.car.halfLength,halfWidth:d.car.halfWidth}));
  }

  /** Whether the learner can see a point now (as below). */
  canSee(p:Vec2):boolean{return this.seen(p,this.options.learner())}

  /** Whether the learner can see a point: ahead of it (within 75° of straight ahead) up to 120 m, or anywhere close
   * (mirrors, a glance round). Traffic never vanishes, or appears, where the learner can see. */
  private seen(p:Vec2,learner:{pose:Pose}):boolean{
    const lp=learner.pose.position,dx=p.x-lp.x,dz=p.z-lp.z,d=Math.hypot(dx,dz);
    if(d<30)return true;
    if(d>120)return false;
    return (dx*Math.sin(learner.pose.heading)-dz*Math.cos(learner.pose.heading))/d>Math.cos(75*Math.PI/180);
  }

  /** Heading down the learner's road towards it, from ahead of it: the oncoming traffic kept for junctions. */
  private towardsLearner(road:Road,dir:1|-1,p:Vec2,learner:{pose:Pose}):boolean{
    const on=this.learnerOn;
    if(!on||on.road!==road||on.dir===dir||road.oneway)return false;
    const lp=learner.pose.position,dx=p.x-lp.x,dz=p.z-lp.z;
    return dx*Math.sin(learner.pose.heading)-dz*Math.cos(learner.pose.heading)>0&&Math.hypot(dx,dz)<260;
  }

  private rand(){this.seed=Math.imul(this.seed^(this.seed>>>15),2246822507)+0x9e3779b9>>>0;return (this.seed>>>8)/16777216}

  /**
   * A road driven one way from `from` (metres along the road's own direction; its start by default), as points every
   * 3 m in the direction of travel. Now and then it turns off into a side road part-way along: the leg then ends there.
   */
  private legOf(road:Road,dir:1|-1,from?:number,bus=false,cycle=false):Leg{
    const len=roadLength(road);
    const a0=from??(dir>0?0:len);
    let a1=dir>0?len:0,exit:Leg['exit'];
    for(const e of (this.sideRoads.get(road)??[]).filter(e=>dir>0?e.along>a0+10:e.along<a0-10).sort((p,q)=>dir*(p.along-q.along))){
      if(bus&&e.road.markings.centre==='none')continue;
      if(this.rand()<.3){a1=e.along;exit={road:e.road,dir:e.dir};break}
    }
    const n=Math.max(1,Math.ceil(Math.abs(a1-a0)/3));
    const points:Vec2[]=[];
    for(let k=0;k<=n;k++){const p=pointAtAlong(road,a0+(a1-a0)*k/n);points.push({x:p.x,z:p.z})}
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]!+Math.hypot(points[i]!.x-points[i-1]!.x,points[i]!.z-points[i-1]!.z));
    const limit=road.speedLimitMph?mph(road.speedLimitMph):road.markings.centre==='none'?mph(22):mph(29);
    // Cyclists ride near the kerb; cars and buses in the middle of the lane (of the road, one way).
    const lane=cycle?(road.oneway?roadHalfWidth(road):road.lanes.width)-CYCLE_KERB:road.oneway?0:road.lanes.width/2;
    const [na,nb]=this.roadNodes.get(road)!;
    // A one-way carriageway meeting a two-way road (the two-way road's own lane offset there).
    // (One carrying straight on from it, as the map draws a split: not a side road meeting it there.)
    const twoWayAt=(node:number)=>{
      const mine=pointAtAlong(road,node===na?0:len).direction;
      return this.ends[node]!.find(e=>{
        if(e.road===road||e.road.oneway)return false;
        const theirs=pointAtAlong(e.road,e.dir>0?0:roadLength(e.road)).direction;
        return Math.abs(mine.x*theirs.x+mine.z*theirs.z)>.85;
      })?.road.lanes.width;
    };
    const fromStart=a0===(dir>0?0:len),toEnd=!exit&&a1===(dir>0?len:0);
    const splitStart=road.oneway&&fromStart?twoWayAt(dir>0?na:nb):undefined,splitEnd=road.oneway&&toEnd?twoWayAt(dir>0?nb:na):undefined;
    // Turning off to the right (across the oncoming lane): the side road leaves to the right of the way of travel.
    let rightTurn=false;
    if(exit){
      const t=pointAtAlong(road,a1).direction,way={x:t.x*dir,z:t.z*dir};
      const out=pointAtAlong(exit.road,exit.dir>0?0:roadLength(exit.road)).direction,o={x:out.x*exit.dir,z:out.z*exit.dir};
      rightTurn=!road.oneway&&o.x*way.z-o.z*way.x<-.3;
    }
    return {points,lengths,road,dir,cruise:cycle?mph(11+this.rand()*4):Math.min(limit,mph(30))*(.85+this.rand()*.12),lane,endNode:exit?-1:dir>0?nb:na,exit,endAlong:a1,rightTurn,
      ...(splitStart!==undefined?{splitStart:splitStart/2}:{}),...(splitEnd!==undefined?{splitEnd:splitEnd/2}:{})};
  }

  /** Through a node from one leg to the next: clockwise round a mini-roundabout's disc, else a short curve. */
  private connector(from:Leg,to:Leg):Leg{
    const a=from.points.at(-1)!,b=to.points[0]!,n=from.endNode>=0?this.nodes[from.endNode]!:null;
    const mini=n?.junction?miniAt(this.minis,n):null;
    const c={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
    const pts:Vec2[]=mini?aroundMini(mini,a,b):[];
    if(!mini)for(let k=0;k<=8;k++){const t=k/8,u=1-t;pts.push({x:u*u*a.x+2*u*t*c.x+t*t*b.x,z:u*u*a.z+2*u*t*c.z+t*t*b.z})}
    const lengths=[0];for(let i=1;i<pts.length;i++)lengths.push(lengths[i-1]!+Math.hypot(pts[i]!.x-pts[i-1]!.x,pts[i]!.z-pts[i-1]!.z));
    // Where a two-way road splits into one-way carriageways (or they join into one), the map has them meet at one
    // point: each direction keeps to its own side of the two-way road through it, not the middle (head on).
    const split=!!from.road&&!!to.road&&from.road.oneway!==to.road.oneway;
    return {points:pts,lengths,road:null,dir:1,cruise:n?.junction?4.5:Math.min(6,to.cruise),lane:split?Math.max(from.lane,to.lane):Math.min(from.lane,to.lane),endNode:-1};
  }

  /** The way on at the end of a leg: a side road it turns into, or another road at the node (not straight back). */
  private choose(leg:Leg,kind:TrafficCar['kind'],learner:{pose:Pose}):Leg|null{
    let options=this.waysOn(leg,kind);
    // Not into a road that leads nowhere (it stops at the edge of the area, where the map data ends): a car there
    // would have to vanish in view. Only when there is nothing else. (A bus, kept to the through roads, takes a side
    // road rather than one of those.)
    const leads=(o:{road:Road;dir:1|-1})=>this.waysOn(this.probe(o.road,o.dir),kind).length>0;
    if(kind==='bus'&&!options.some(leads))options=this.waysOn(leg,'car');
    if(options.length===0)return null;
    // Nor into a cul-de-sac, however deep (every way on from it ends at a dead end): only roads it can drive on from,
    // and with a way on at their end where there is one (not out to the edge of the map, to stand at the end).
    const keeps=options.filter(o=>this.keepsGoing(o.road,o.dir)),best=keeps.filter(leads);
    const onward=best.length?best:keeps.length?keeps:options.filter(leads);
    let pick=onward.length?onward:options;
    // Seldom down the learner's road towards it (oncoming traffic is kept for junctions): another way where there is one.
    const end=leg.points.at(-1)!;
    const away=pick.filter(o=>!this.towardsLearner(o.road,o.dir,end,learner));
    if(away.length&&away.length<pick.length&&this.rand()<.95)pick=away;
    return pick[Math.floor(this.rand()*pick.length)]!.make();
  }

  /**
   * Whether a road driven one way leads on (some way on from it goes round and round, or off the edge of the mapped
   * area, where the road carries on), as opposed to into a cul-de-sac. Worked out once for the area: every road-way
   * ending with no way on inside the area is trimmed, then every one whose ways on have all been trimmed, until none
   * is left to trim.
   */
  private keepsGoing(road:Road,dir:1|-1):boolean{
    if(!this.keeps){
      const key=(r:Road,d:1|-1)=>`${r.id}/${d}`;
      const points=this.location.roads.flatMap(r=>r.centreline);
      const x0=Math.min(...points.map(p=>p.x)),x1=Math.max(...points.map(p=>p.x)),z0=Math.min(...points.map(p=>p.z)),z1=Math.max(...points.map(p=>p.z));
      const atEdge=(p:Vec2)=>Math.min(p.x-x0,x1-p.x,p.z-z0,z1-p.z)<40;
      const out=new Map<string,string[]>(),into=new Map<string,string[]>();
      for(const r of this.location.roads)for(const d of r.oneway?[1] as const:[1,-1] as const){
        const k=key(r,d),next=this.waysOn(this.probe(r,d),'car').map(o=>key(o.road,o.dir));
        // (Off the edge of the area, or a main road that just stops (where the map data was cut off): a way on that is
        // never trimmed.)
        if(atEdge(d>0?r.centreline.at(-1)!:r.centreline[0]!)||(!next.length&&r.markings.centre!=='none'))next.push('off the map');
        out.set(k,next);
        for(const n of next){if(!into.has(n))into.set(n,[]);into.get(n)!.push(k)}
      }
      const left=new Map([...out].map(([k,v])=>[k,v.length]));
      const trimmed=new Set([...left].filter(([,n])=>n===0).map(([k])=>k)),queue=[...trimmed];
      while(queue.length)for(const p of into.get(queue.pop()!)??[]){
        if(trimmed.has(p))continue;
        const n=left.get(p)!-1;left.set(p,n);
        if(n===0){trimmed.add(p);queue.push(p)}
      }
      this.keeps=new Set([...out.keys()].filter(k=>!trimmed.has(k)));
    }
    return this.keeps.has(`${road.id}/${dir}`);
  }
  private keeps:Set<string>|null=null;

  /** The end of a road driven one way, as a leg (to ask what way on there is from it). */
  private probe(road:Road,dir:1|-1):Leg{
    const [na,nb]=this.roadNodes.get(road)!;
    // (Its last two points, so that a way back almost the way it came counts as none, as for a car there.)
    const c=road.centreline,a=dir>0?c.at(-2)!:c[1]!,b=dir>0?c.at(-1)!:c[0]!;
    return {points:[a,b],lengths:[0,Math.hypot(b.x-a.x,b.z-a.z)],road,dir,cruise:0,lane:0,endNode:dir>0?nb:na};
  }

  /** The ways on at the end of a leg (none: a dead end, such as a road leaving the area, or only a U-turn). */
  private waysOn(leg:Leg,kind:TrafficCar['kind']):Array<{road:Road;dir:1|-1;make:()=>Leg}>{
    const bus=kind==='bus',cycle=kind==='cycle';
    if(!leg.road)return [];
    if(leg.exit){const exit=leg.exit;return [{road:exit.road,dir:exit.dir,make:()=>this.legOf(exit.road,exit.dir,undefined,bus,cycle)}]}
    const end=leg.points.at(-1)!;
    let options:Array<{road:Road;dir:1|-1;at?:number;make:()=>Leg}>=[];
    if(leg.endNode>=0)for(const e of this.ends[leg.endNode]!)if(e.road!==leg.road)options.push({road:e.road,dir:e.dir,make:()=>this.legOf(e.road,e.dir,undefined,bus,cycle)});
    // The end of a side road at a T-junction: on to the road it meets, either way (unless one way).
    for(const road of this.location.roads){
      if(road===leg.road||(leg.road&&road.level!==leg.road.level))continue;
      const at=sampleRoad(road,end.x,end.z);
      if(at.distance>7||at.along<3||at.along>roadLength(road)-3)continue;
      options.push({road,dir:1,at:at.along,make:()=>this.legOf(road,1,at.along,bus,cycle)});
      if(!road.oneway)options.push({road,dir:-1,at:at.along,make:()=>this.legOf(road,-1,at.along,bus,cycle)});
    }
    // Buses keep to the through roads where they can.
    if(bus&&options.some(o=>o.road.markings.centre!=='none'))options=options.filter(o=>o.road.markings.centre!=='none');
    // Never back the way it came (a U-turn): the other carriageway of a split road, or a road leaving almost straight
    // back. Where that is the only way on, it is a dead end.
    const prev=leg.points.at(-2);
    if(prev){
      const ax=end.x-prev.x,az=end.z-prev.z,al=Math.hypot(ax,az)||1;
      options=options.filter(o=>{
        const along=o.at??(o.dir>0?0:roadLength(o.road));
        const d=pointAtAlong(o.road,along).direction;
        return (ax*d.x+az*d.z)*o.dir/al>-UTURN_COS;
      });
    }
    return options.map(({road,dir,make})=>({road,dir,make}));
  }

  private at(leg:Leg,s:number):{x:number;z:number;dir:Vec2}{
    const L=leg.lengths;
    let i=1;while(i<L.length-1&&L[i]!<s)i++;
    const a=leg.points[i-1]!,b=leg.points[i]!,seg=(L[i]!-L[i-1]!)||1,t=Math.min(1,Math.max(0,(s-L[i-1]!)/seg));
    return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dir:{x:(b.x-a.x)/seg,z:(b.z-a.z)/seg}};
  }

  /** Buses first, then cyclists, then cars. */
  private kindOf(i:number):TrafficCar['kind']{
    const buses=this.options.buses??0;
    return i<buses?'bus':i<buses+(this.options.cycles??0)?'cycle':'car';
  }

  private newCar(i:number):TrafficCar{
    const kind=this.kindOf(i),size=kind==='bus'?BUS:kind==='cycle'?CYCLE:{halfLength:HALF_LENGTH,halfWidth:HALF_WIDTH};
    return {id:`traffic-${i}`,kind,pose:{position:{x:0,y:0,z:0},heading:0},speed:0,
      colour:kind==='bus'?'#c8102e':kind==='cycle'?JERSEYS[i%JERSEYS.length]!:COLOURS[i%COLOURS.length]!,model:i,visible:false,...size};
  }

  /** The road the learner is on now (twice a second). */
  private updateLearnerOn(learner:{pose:Pose},dt:number){
    this.learnerOnAge+=dt;
    if(this.learnerOnAge<.5)return;
    this.learnerOnAge=0;
    const lp=learner.pose.position,fx=Math.sin(learner.pose.heading),fz=-Math.cos(learner.pose.heading);
    let best:{road:Road;dir:1|-1;distance:number}|null=null;
    for(const road of this.location.roads){
      const s=sampleRoad(road,lp.x,lp.z);
      if(s.distance>roadHalfWidth(road)+2||(best&&s.distance>=best.distance))continue;
      best={road,dir:s.direction.x*fx+s.direction.z*fz>=0?1:-1,distance:s.distance};
    }
    this.learnerOn=best?{road:best.road,dir:best.dir}:null;
  }

  /**
   * Brings a road user in on a road near where roads meet, 60–260 m from the learner and out of its sight, clear of
   * other traffic; seldom heading down the learner's road towards it.
   */
  private spawn(d:Driver|null,i:number):Driver{
    const kind=d?.car.kind??this.kindOf(i),isBus=kind==='bus',isCycle=kind==='cycle';
    // Buses keep to the through roads (a centre line), where the bus stops are; cyclists to roads of 30 mph or less.
    const all=this.location.roads.filter(r=>roadLength(r)>30);
    const main=all.filter(r=>r.markings.centre!=='none'),slow=all.filter(r=>(r.speedLimitMph??30)<=30);
    const roads=isBus&&main.length?main:isCycle&&slow.length?slow:all;
    const learnerNow=this.options.learner(),learner=learnerNow.pose.position;
    this.learnerOnAge=Infinity;this.updateLearnerOn(learnerNow,0);
    for(let tries=0;tries<80;tries++){
      const road=roads[Math.floor(this.rand()*roads.length)]!;
      const dir:1|-1=road.oneway||this.rand()<.5?1:-1;
      const leg=this.legOf(road,dir,undefined,isBus,isCycle);
      const s=10+this.rand()*(leg.lengths.at(-1)!-20);
      const p=this.at(leg,s);
      const dist=Math.hypot(p.x-learner.x,p.z-learner.z);
      if(dist<60||dist>260||this.seen(p,learnerNow))continue;
      // Near where roads meet, mostly: traffic gathers at junctions, not along straight roads.
      if(tries<60&&!this.junctionPoints.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<70)&&this.rand()<.75)continue;
      if(this.towardsLearner(road,dir,p,learnerNow)&&this.rand()<.95)continue;
      // Not on a road that leads nowhere (it would stand at the edge of the area, or the end of a cul-de-sac, in the way).
      // (Where the area has no such road at all: any road with a way on.)
      if(!leg.exit&&(!this.keepsGoing(road,dir)&&(this.keeps!.size>0||this.waysOn(this.probe(road,dir),kind).length===0)))continue;
      // Clear of other traffic: well clear on the same road (a car appearing just ahead of one coming the other way,
      // perhaps out passing parked cars, would meet it head on).
      if(this.drivers.some(o=>{
        if(o===d||!o.car.visible)return false;
        const apart=Math.hypot(o.car.pose.position.x-p.x,o.car.pose.position.z-p.z);
        return apart<20||o.leg.road===road&&apart<70;
      }))continue;
      // Not on top of a parked car (it would appear out of it), nor just behind one with no room to pull out.
      if(this.options.parked.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<9))continue;
      // Not just short of traffic lights (a car appearing there could not stop for red).
      if((this.options.signals?.()??[]).some(st=>Math.hypot(st.lane.x-p.x,st.lane.z-p.z)<50))continue;
      const car=d?.car??this.newCar(i);
      car.visible=true;car.parked=false;
      car.speed=leg.cruise*.8;
      const driver:Driver={car,leg,s,lat:leg.lane,next:null,dwell:0,served:new Set(),waited:0};
      this.place(driver);
      return driver;
    }
    const car=d?.car??this.newCar(i);
    car.visible=false;
    return {car,leg:this.legOf(roads[0]!,1,undefined,isBus,isCycle),s:0,lat:0,next:null,dwell:0,served:new Set(),waited:0};
  }

  private place(d:Driver){
    const p=this.at(d.leg,d.s);
    // Left of travel (UK) is (dz, −dx).
    d.car.pose={position:{x:p.x+p.dir.z*d.lat,y:0,z:p.z-p.dir.x*d.lat},heading:headingFromDirection(p.dir)};
  }

  /**
   * A knot at a junction: every car at it has stood a while, each giving way to another (as at a busy mini-roundabout
   * where a bus going round cannot get by the car waiting to come on). As drivers do, the one waiting longest (one
   * already on it first) is waved on: it no longer gives way to those standing, only to moving traffic and what is
   * right in front of it.
   */
  private unknot(dt:Seconds):void{
    for(const d of this.drivers)if(d.waved)d.waved=Math.max(0,d.waved-dt);
    for(const [k,n] of this.nodes.entries()){
      // (Junctions, and road ends three or more roads share: a crossroads or T-junction.)
      if(!n.junction&&new Set(this.ends[k]!.map(e=>e.road)).size<3)continue;
      // (The queues behind them, following, are not part of the knot.)
      const here=this.drivers.filter(d=>d.car.visible&&!d.why?.startsWith('behind')&&Math.hypot(d.car.pose.position.x-n.x,d.car.pose.position.z-n.z)<n.radius+14);
      if(here.length<2||here.some(d=>d.waved||d.car.speed>.3)||Math.max(...here.map(d=>d.waited))<6)continue;
      let pick:Driver|undefined=[...here].sort((a,b)=>Number(!!b.leg.road===false)-Number(!!a.leg.road===false)||b.waited-a.waited)[0]!;
      // And the one it is held up by (and so on): that one may be able to drive away from it.
      for(let k=0;k<4&&pick&&!pick.waved;k++){
        pick.waved=6;
        const by:string|undefined=/(?:blocked by|crossing|waiting for|behind) (\S+)/.exec(pick.why??'')?.[1];
        pick=by?this.drivers.find(x=>x.car.id===by):undefined;
      }
    }
  }

  fixedUpdate(dt:Seconds):void{
    const learner=this.options.learner();
    this.updateLearnerOn(learner,dt);
    {
      const lp=learner.pose.position,a=this.learnerAnchor;
      if(!a||Math.hypot(lp.x-a.x,lp.z-a.z)>3){this.learnerAnchor={x:lp.x,z:lp.z};this.learnerIdle=0}else this.learnerIdle+=dt;
    }
    this.unknot(dt);
    for(const [i,d] of this.drivers.entries()){
      const car=d.car;
      if(!car.visible){if(this.rand()<.02)this.drivers[i]=this.spawn(d,i);continue}
      const pos=car.pose.position,fwd={x:Math.sin(car.pose.heading),z:-Math.cos(car.pose.heading)};
      if(d.backing){this.backUp(d,learner,dt);continue}
      // What is ahead in this car's path (a box 3.8 m wide, 40 m long): traffic going the same way, and the learner.
      let gap=Infinity;
      let why='';
      // What is nearest ahead: how fast it is going this way, and whether it is a car followed (a closer gap).
      let leadSpeed=0,following=false;
      const ahead=(x:number,z:number,len:number,what='traffic',speed=0)=>{
        const dx=x-pos.x,dz=z-pos.z,along=dx*fwd.x+dz*fwd.z,side=Math.abs(dx*fwd.z-dz*fwd.x);
        if(along>0&&along<40&&side<car.halfWidth+1.15&&along-len-car.halfLength<gap){gap=along-len-car.halfLength;why=what;leadSpeed=Math.max(0,speed);following=what.startsWith('behind')}
      };
      const oncoming:Array<{along:number}>=[];
      // Meeting a car out past parked cars on a narrow street: the one in its lane tucks in to its kerb and waits
      // (tuck); the one out passing squeezes by, closer to the parked cars (tight).
      let tuck=false,tight=false,blocked=false;
      // On or at a junction (going round a roundabout, or waiting at its edge): passing parked cars is not what is going on.
      const atJunction=(x:Driver)=>{
        if(!x.leg.road)return true;
        const n=x.leg.endNode>=0?this.nodes[x.leg.endNode]!:null;
        return !!n?.junction&&Math.hypot(x.car.pose.position.x-n.x,x.car.pose.position.z-n.z)<n.radius+10;
      };
      for(const o of this.drivers){
        if(o===d||!o.car.visible)continue;
        const op=o.car.pose.position,ofx=Math.sin(o.car.pose.heading),ofz=-Math.cos(o.car.pose.heading);
        // Two cars tangled together (met in a junction, each waiting for the other): the first of them drives on
        // out of it, as if it had been waved through; the other waits until it has gone.
        const apart=Math.hypot(op.x-pos.x,op.z-pos.z);
        if(d.through===o&&apart>car.halfLength+o.car.halfLength+2)d.through=undefined;
        if(!d.through&&d.waited>3&&o.waited>3&&o.car.speed<.3&&this.drivers.indexOf(o)>i&&apart<car.halfLength+o.car.halfLength+.5)d.through=o;
        if(d.through===o)continue;
        const facing=fwd.x*ofx+fwd.z*ofz;
        if(facing>.3){
          // Following: unless both have been waiting a long time (a knot at a junction), then only the nose-to-tail gap counts.
          if(d.waited<8||o.car.speed>.3){
            ahead(op.x,op.z,o.car.halfLength,`behind ${o.car.id}`,o.car.speed*facing);
            // And its back (round a bend the middle of a long bus is off to one side: its back is what is followed).
            ahead(op.x-ofx*(o.car.halfLength-.5),op.z-ofz*(o.car.halfLength-.5),.5,`behind ${o.car.id}`,o.car.speed*facing);
          }
          else{const dx=op.x-pos.x,dz=op.z-pos.z;if(dx*fwd.x+dz*fwd.z<o.car.halfLength+car.halfLength+1.5)ahead(op.x,op.z,o.car.halfLength,`behind ${o.car.id}`)}
        }
        // Across the road ahead (turning in or out of a side road): stop for it if it is moving, or if it is waiting
        // and has the turn first (two cars waiting for each other take turns, by their order), or is right in front.
        else if(facing>=-.5){
          const dx=op.x-pos.x,dz=op.z-pos.z,close=Math.hypot(dx,dz)<car.halfLength+o.car.halfLength+1;
          const first=this.drivers.indexOf(o)<i;
          if(o.car.speed>.3||(!d.waved&&(close||d.waited<2||(first&&d.waited<8))))ahead(op.x,op.z,o.car.halfLength*.6+1,`crossing ${o.car.id}`);
        }
        else if(facing<-.5){
          const dx=op.x-pos.x,dz=op.z-pos.z,along=dx*fwd.x+dz*fwd.z,side=Math.abs(dx*fwd.z-dz*fwd.x);
          if(along>0&&along<40&&side<4)oncoming.push({along});
          const narrow=!atJunction(d)&&!atJunction(o);
          const oOut=narrow&&o.lat<o.leg.lane-.4,meOut=narrow&&d.lat<d.leg.lane-.4,near=along>0&&along<40&&side<car.halfWidth+o.car.halfWidth+.8;
          // Out past parked cars with it coming: carry on by it (it tucks in), stopping only while there is no room.
          if(meOut&&!oOut&&near){tight=true;if(side<car.halfWidth+o.car.halfWidth+.05){blocked=true;ahead(op.x,op.z,o.car.halfLength+1.5,`facing ${o.car.id}`)}}
          // In this lane with it coming out past parked cars: tuck in and wait well back for it.
          else if(oOut&&!meOut&&near){tuck=true;ahead(op.x,op.z,o.car.halfLength+9,`waiting for ${o.car.id}`)}
          // Nose to nose in the same strip of road (a narrow street): stop well short.
          // (Waved on out of a knot: not for one standing still, which it is turning past.)
          else if(side<1.5&&!(d.waved&&o.car.speed<.3))ahead(op.x,op.z,o.car.halfLength+3,`facing ${o.car.id}`);
          // Coming out past parked cars on its side towards this one (this one still in its lane): wait well back,
          // so it can pass them and pull back in before the two meet.
          else if(narrow&&o.lat<o.leg.lane-.4&&d.lat>d.leg.lane-.4&&side<car.halfWidth+o.car.halfWidth+.6)ahead(op.x,op.z,o.car.halfLength+9,`waiting for ${o.car.id}`);
        }
      }
      // The learner: followed when moving; when stopped in this lane, passed like a parked car (below) once there is room.
      const lx=learner.pose.position.x-pos.x,lz=learner.pose.position.z-pos.z;
      const learnerLeft=lx*fwd.z-lz*fwd.x,learnerAlong=lx*fwd.x+lz*fwd.z;
      // Where the learner is across the road (+: this car's side), measured where it is (on a bend, across this car's
      // heading it looks nearer the middle of this car's way than it is).
      const lAt=this.at(d.leg,Math.max(0,Math.min(d.leg.lengths.at(-1)!,d.s+learnerAlong)));
      const learnerAcross=(learner.pose.position.x-lAt.x)*lAt.dir.z-(learner.pose.position.z-lAt.z)*lAt.dir.x;
      const aligned=Math.cos(learner.pose.heading-car.pose.heading)>.85;
      // (Or, getting nowhere a while, facing it on its side of the road: passed the same way.)
      const facingIdle=this.learnerIdle>5&&Math.cos(learner.pose.heading-car.pose.heading)<-.85;
      // Round the learner on the right: from its right side to the far kerb, or to a car parked there beside it (`edge`,
      // across the road from the middle, not from where this car happens to be). Gone round where there is room for
      // this car, with a little to spare.
      let right:{room:number;edge:number}|undefined;
      const roundRight=()=>right??=(()=>{
        let edge=d.leg.road?-roadHalfWidth(d.leg.road):0;
        for(const q of this.options.parked){
          const al=(q.x-pos.x)*fwd.x+(q.z-pos.z)*fwd.z;
          if(Math.abs(al-learnerAlong)>(q.halfLength??2.2)+3)continue;
          const at=this.at(d.leg,Math.max(0,Math.min(d.leg.lengths.at(-1)!,d.s+al)));
          const qLat=(q.x-at.x)*at.dir.z-(q.z-at.z)*at.dir.x;
          if(qLat<-.5)edge=Math.max(edge,qLat+(q.halfWidth??.9));
        }
        return {room:learnerAcross-.9-edge,edge};
      })();
      const canGoRound=(spare:number)=>d.leg.road!==null&&learnerAcross>.05&&roundRight().room>=2*car.halfWidth+spare;
      const learnerStopped=(Math.abs(learner.speed)<.5||this.learnerIdle>5)&&(aligned||facingIdle)&&canGoRound(.1);
      // Coming the other way (moving, or waiting out in the road): parked cars on this side are passed after it.
      // Counted 15 m nearer than it is: a learner can be slow through a narrow gap, so traffic waits in good time.
      // (Not a learner getting nowhere, waiting for traffic to come by.)
      if(this.learnerIdle<5&&Math.cos(learner.pose.heading-car.pose.heading)<-.5&&learnerAlong>0&&learnerAlong<60&&Math.abs(learnerLeft)<4)oncoming.push({along:learnerAlong-15});
      // Nose to nose with the learner stopped in a gap one car wide (parked cars on both sides): after a moment,
      // tuck in to this side's kerb so the learner can come through, and stay there until they have gone by.
      const facingLearner=Math.cos(learner.pose.heading-car.pose.heading)<-.5&&learnerAlong>-3&&learnerAlong<25;
      if(!facingLearner)d.squeezing=false;
      else if((Math.abs(learner.speed)<.5||this.learnerIdle>5)&&learnerAlong<20&&d.waited>2&&d.leg.road!==null&&d.leg.lane>0)d.squeezing=true;
      const squeeze=!!d.squeezing;
      // Coming towards this car out past parked cars on its own side (near or over the middle of the road): there is
      // not room for both, so wait well back, tucked in to this side's kerb, until it is back in its lane or by.
      const learnerOut=this.learnerIdle<5&&Math.cos(learner.pose.heading-car.pose.heading)<-.5&&learnerAlong>0&&learnerAlong<40&&learnerLeft+d.lat>-1.1&&d.leg.road!==null&&d.leg.lane>0;
      if(learnerOut)ahead(learner.pose.position.x,learner.pose.position.z,12,'learner passing');
      // The learner standing beside its way (in a junction, side on, or squeezed by): after a moment it edges past at a
      // walking pace, as drivers do, while its body a little further on is clear of the learner's (each waiting for the
      // other is no way out).
      const lp=learner.pose.position;
      // (Standing, or backing away to make room: the owner's report, reversing to let a car through.)
      const roomToCreep=learner.speed<.3&&!boxesOverlap(
        {id:'next',cx:pos.x+fwd.x*1.6,cz:pos.z+fwd.z*1.6,heading:car.pose.heading,halfW:car.halfWidth+.25,halfD:car.halfLength+.25},
        {id:'learner',cx:lp.x,cz:lp.z,heading:learner.pose.heading,halfW:.9,halfD:2.15});
      if(roomToCreep&&d.waited>4)d.creep=3;
      d.creep=roomToCreep&&d.creep?Math.max(0,d.creep-dt):0;
      // Turning through a junction (a curve): the learner is in its way only if the curve it drives comes close to it
      // (a straight line ahead of it would point at the learner beside the turn: the owner's report of cars standing
      // in junctions).
      const turning=!d.leg.road;
      const learnerOnWay=turning?this.alongWay(d,lp,15,car.halfWidth+.9+.5):Infinity;
      if(d.creep){/* edging by: the learner is not in its way */}
      else if(turning){if(learnerOnWay<Infinity&&learnerOnWay-car.halfLength-2.15<gap){gap=learnerOnWay-car.halfLength-2.15+GAP*.6;why='learner';leadSpeed=0;following=false}}
      else if(squeeze){if(Math.abs(d.lat-learnerAcross)<car.halfWidth+.9+(this.learnerIdle>12?0:.05))ahead(learner.pose.position.x,learner.pose.position.z,2.2,'learner')}
      else if(!(learnerStopped&&learnerLeft>2.15))ahead(learner.pose.position.x,learner.pose.position.z,2.2,'learner');
      // Traffic lights ahead in this lane: stop about 1.5 m short of the line at red (and red and amber), and at
      // amber unless too close to stop comfortably (3 m/s²). Seen from far enough off to stop for them, braking
      // steadily (lightStop: metres to where it stops).
      let lightStop=Infinity;
      for(const st of this.options.signals?.()??[]){
        if(st.state==='green'||Math.cos(st.heading-car.pose.heading)<.8)continue;
        const dx=st.lane.x-pos.x,dz=st.lane.z-pos.z,along=dx*fwd.x+dz*fwd.z;
        const front=along-car.halfLength;
        // (Wider where the car keeps to one side of its carriageway, coming out of a split.)
        if(front<-.5||along>70||Math.abs(dx*fwd.z-dz*fwd.x)>2.5+Math.abs(d.lat-d.leg.lane))continue;
        if(st.state==='amber'&&front<car.speed*car.speed/6+1)continue;
        // (Its distance along the car's way, not through the strip ahead: on a bend the line is off to one side.)
        if(front-1.5+GAP<gap){gap=front-1.5+GAP;why='lights';leadSpeed=0;following=false}
        lightStop=Math.min(lightStop,front-1.5);
      }
      let target=d.leg.cruise;
      if(lightStop<Infinity)target=Math.min(target,Math.sqrt(2*2.5*Math.max(0,lightStop)));
      // Anything ahead but a vehicle followed (the learner, a line, a car to wait for): stop GAP short of it, as before.
      // A vehicle followed: the Intelligent Driver Model keeps the gap (below).
      if(gap<Infinity&&!following)target=Math.min(target,Math.max(0,(gap-GAP)*.55));
      // About to touch the learner's car (turning in beside it, squeezing past it): stop, whatever else applies.
      {
        const lx=learner.pose.position.x-pos.x,lz=learner.pose.position.z-pos.z;
        const along=lx*fwd.x+lz*fwd.z,side=Math.abs(lx*fwd.z-lz*fwd.x);
        // (Except creeping on past it, the other way, while it is stopped (or getting nowhere) and there is room: frozen alongside with
        // centimetres to spare, the learner would clip it moving off.)
        // (Stood in the way a long while, it is edged past with next to nothing to spare.)
        const creepPast=(Math.abs(learner.speed)<.3||this.learnerIdle>5)&&Math.cos(learner.pose.heading-car.pose.heading)<-.8&&!boxesOverlap(
          {id:'next',cx:pos.x+fwd.x*.6,cz:pos.z+fwd.z*.6,heading:car.pose.heading,halfW:car.halfWidth+(this.learnerIdle>12?0:.1),halfD:car.halfLength+.1},
          {id:'learner',cx:learner.pose.position.x,cz:learner.pose.position.z,heading:learner.pose.heading,halfW:.9,halfD:2.15});
        if(turning?learnerOnWay<car.halfLength+2.5:along>-1&&along<car.halfLength+3.2&&side<car.halfWidth+1.25){
          if(creepPast||d.creep){target=Math.min(target,1.5);why='learner (creeping past)'}
          else{target=0;car.speed=Math.min(car.speed,.5);why='learner'}
        }
      }
      // The end of a road: slow for the turn; at a mini-roundabout or a T-junction, give way to anyone nearer to it.
      const remaining=d.leg.lengths.at(-1)!-d.s;
      if(d.leg.road&&remaining<20){
        const node=d.leg.endNode>=0?this.nodes[d.leg.endNode]!:null;
        const point=node?.junction?{x:node.x,z:node.z}:d.leg.points.at(-1)!;
        const reach=node?.junction?node.radius+4:10;
        target=Math.min(target,Math.max(3.5,remaining*.45));
        const mine=Math.hypot(pos.x-point.x,pos.z-point.z);
        const busy=this.drivers.some(o=>{
          if(o===d||!o.car.visible||d.through===o)return false;
          // (Not one waiting at its give way or STOP line out of a side road: it is waiting for this one. Nor one standing
          // for the learner: until the learner moves it goes nowhere, and this car may be what the learner waits for.)
          if(o.car.speed<.3&&(o.why==='giving way'||o.why==='stop line'||o.why==='learner'||o.why?.endsWith('for learner')))return false;
          const r=Math.hypot(o.car.pose.position.x-point.x,o.car.pose.position.z-point.z);
          // Nearer the junction and moving, or nearer and waiting with the turn first.
          // (A bus standing at a stop just past the junction keeps it busy: there is no room to turn in beside it.)
          if(o.dwell>0&&r<reach+o.car.halfLength)return true;
          // (Nor one pulling away from it with its back still in the mouth, where this car would turn in: a bus
          // creeping up to that stop.)
          const ofx=Math.sin(o.car.pose.heading),ofz=-Math.cos(o.car.pose.heading);
          const bx=o.car.pose.position.x-ofx*(o.car.halfLength-.3)-point.x,bz=o.car.pose.position.z-ofz*(o.car.halfLength-.3)-point.z;
          if(Math.hypot(bx,bz)<car.halfWidth+o.car.halfWidth+1.5&&bx*ofx+bz*ofz>-1&&r>Math.hypot(bx,bz))return true;
          // At a roundabout, give way to traffic from the right: one coming up to it on the right, moving, about as near.
          if(node?.junction&&o.leg.road&&o.leg.endNode===d.leg.endNode&&o.car.speed>.3&&r<reach+6&&r<mine+4){
            const ox=o.car.pose.position.x-pos.x,oz=o.car.pose.position.z-pos.z;
            if(ox*-fwd.z+oz*fwd.x>1)return true;
          }
          return r<reach&&r<mine-.5&&(o.car.speed>.3||d.waited<2||this.drivers.indexOf(o)<i||d.waited<8);
        })||(()=>{
          // The learner holds the junction while moving through it or standing in it, not when parked near it; nor
          // once it has stood a while, letting this car go (each waiting for the other: this one goes first).
          const r=Math.hypot(learner.pose.position.x-point.x,learner.pose.position.z-point.z);
          if(r<reach&&r<5&&d.waited>5&&Math.abs(learner.speed)<.3&&!d.waved){d.waved=6;return false}
          return r<reach&&(Math.abs(learner.speed)>.5||(r<5&&!d.waved));
        })();
        // Out of a side road with give way or STOP lines: wait at the line for a safe gap in the main road's traffic
        // (and stop there first at STOP); turning right off the main road, wait for a gap in the oncoming traffic.
        const mouth=!d.leg.exit?this.mouths.get(`${d.leg.road.id}|${d.leg.dir>0?1:0}`):undefined;
        if(mouth&&d.atLine!=='going'){
          const toLine=remaining-Math.abs((d.leg.endAlong??0)-mouth.lineAlong)-car.halfLength;
          if(mouth.kind==='stop'&&car.speed<.15&&toLine<2.5)d.atLine='stopped';
          const clear=!this.mainRoadComing(d,mouth.main,mouth.point,learner);
          // (Decided at the line, where the main road can be seen: not from further back, where a fast car may come.)
          if(clear&&(mouth.kind==='stop'?d.atLine==='stopped':toLine<2.5))d.atLine='going';
          else if(toLine<20){target=Math.min(target,Math.max(0,(toLine-.3)*.6));if(toLine<4)why=clear?'stop line':'giving way'}
        }
        else if(d.leg.rightTurn&&d.atLine!=='going'&&remaining<25){
          const clear=!this.oncomingComing(d,learner);
          if(clear&&remaining<8)d.atLine='going';
          else if(!clear){target=Math.min(target,Math.max(0,(remaining-1.5)*.6));if(remaining<5)why='turning right'}
        }
        else if(busy&&!mouth&&node?.junction&&!d.waved){
          // Waiting to go on to a roundabout: the nose at its edge, never in the way round (the map's roads often end
          // at its middle, so the road's end is not where to stop: a car stopped there blocks those going round).
          // (A metre and a half back from it: a bus going round swings its back end out over the edge.)
          const toEdge=mine-node.radius-1.5-car.halfLength;
          if(toEdge<8){target=Math.min(target,Math.max(0,(toEdge-.5)*.6));if(toEdge<2)why='junction busy'}
        }
        else if(busy&&remaining<7&&!mouth&&!d.waved){target=0;why='junction busy'}
      }
      // A dead end (a cul-de-sac, or the edge of the area): stop short of it, pulled in and parked, and go only once the
      // learner cannot see (below).
      if(d.leg.road&&remaining<40){
        if(d.deadEnd===undefined){
          const end=d.leg.points.at(-1)!;
          // (Other roads meeting where it ends (the map cut off just past a junction): it stops short of them, not
          // across the junction.)
          d.deadEnd=this.waysOn(d.leg,car.kind).length>0?false:this.location.roads.some(r=>r!==d.leg.road&&sampleRoad(r,end.x,end.z).distance<12)?12:0;
        }
        if(d.deadEnd!==false){
          const short=d.deadEnd;
          target=Math.min(target,Math.sqrt(2*2.5*Math.max(0,remaining-short-car.halfLength-1)));
          // (Queued behind one parked there: it parks too.)
          const ahead=why.startsWith('behind ')?this.drivers.find(x=>x.car.id===why.slice(7)):undefined;
          if(remaining<short+car.halfLength+2||(ahead?.car.parked&&car.speed<.2))why='dead end';
        }
      }
      // Meeting the learner where there is room for only one (a narrow street, or parked cars between the two on the
      // learner's side, which it must pull out round): wait for it, tucked in, short of the narrow part, so it can come
      // through (the owner's report: cars that saw the learner coming came on regardless). Parked cars on this car's
      // own side: it waits behind them (passing parked cars, below). Only while the learner is coming: one standing
      // still a while (waiting for this car, or pulled up) is not, and it comes on.
      let giveWay=false;
      if(d.leg.road&&!d.leg.road.oneway&&car.kind!=='cycle'&&!d.yieldTo&&this.learnerIdle<5&&Math.cos(learner.pose.heading-car.pose.heading)<-.6
        &&learnerAlong>car.halfLength&&learnerAlong<70&&sampleRoad(d.leg.road,learner.pose.position.x,learner.pose.position.z).distance<roadHalfWidth(d.leg.road)+.8){
        const full=roadHalfWidth(d.leg.road)*2;
        let narrowAt=Infinity;
        if(full-1.9<5.2)for(const q of this.options.parked){
          const dx=q.x-pos.x,dz=q.z-pos.z,along=dx*fwd.x+dz*fwd.z,left=dx*fwd.z-dz*fwd.x;
          if(along>0&&along<learnerAlong&&left<-.5&&left>-(full/2+1.5))narrowAt=Math.min(narrowAt,along-(q.halfLength??2.2));
        }
        if(narrowAt<Infinity||full<NARROW){
          giveWay=true;
          // Short of it, with room for the learner to come back in past it (or, a narrow street, well short of the learner).
          const stop=narrowAt<Infinity?narrowAt-car.halfLength-10:learnerAlong-car.halfLength-2.15-10;
          target=Math.min(target,Math.max(0,stop*.55));
          if(target<.5)why='giving way to learner';
        }
      }
      // Buses: pull up at each bus stop on their side, wait, then go on.
      if(car.kind==='bus'){
        if(d.dwell>0){d.dwell-=dt;target=0}
        else for(const [k,stop] of (this.options.busStops??[]).entries()){
          if(d.served.has(k))continue;
          const dx=stop.x-pos.x,dz=stop.z-pos.z,along=dx*fwd.x+dz*fwd.z,left=dx*fwd.z-dz*fwd.x;
          if(along<-2||along>40||left<.5||left>7)continue;
          // The bus's front stops level with the stop.
          const toFront=along-car.halfLength;
          target=Math.min(target,Math.max(0,toFront*.45));
          if(toFront<1.2&&car.speed<.4){d.dwell=8;d.stop=k;d.served.add(k)}
          break;
        }
      }
      // Bends: no faster than a comfortable sideways acceleration allows.
      const p0=this.at(d.leg,d.s),p1=this.at(d.leg,Math.min(d.leg.lengths.at(-1)!,d.s+12));
      const turn=Math.abs(Math.atan2(p0.dir.x*p1.dir.z-p0.dir.z*p1.dir.x,p0.dir.x*p1.dir.x+p0.dir.z*p1.dir.z));
      if(turn>.15)target=Math.min(target,Math.max(4,Math.sqrt(2.6*12/turn)));
      // Parked cars on this side ahead: ease towards the crown of the road to pass them, back to the lane after;
      // with traffic coming the other way, wait behind them until it has passed.
      let want=laneAt(d.leg,d.s);
      if((squeeze||learnerOut)&&d.leg.road)want=Math.min(d.leg.lane+.55,d.leg.road.lanes.width*d.leg.road.lanes.count/2-car.halfWidth-.1);
      const obstacles=learnerStopped&&learnerAlong>-7&&learnerAlong<30?[...this.options.parked,learner.pose.position]:this.options.parked;
      // The nearest one ahead (or still alongside).
      let pass:{q:Vec2&Partial<KerbFootprint>;along:number;left:number;isLearner:boolean;qHalfLength:number}|null=null;
      // (The learner standing beyond the nearest parked car: out far enough for both.)
      let learnerToPass:{along:number;left:number}|null=null;
      // (Out alongside a parked car on its side: it cannot pull back in here.)
      let alongside=false;
      if(d.leg.lane>0&&car.kind!=='bus')for(const q of obstacles){
        const dx=q.x-pos.x,dz=q.z-pos.z,along=dx*fwd.x+dz*fwd.z;
        if(along>=PASS_AHEAD||along<-8)continue;
        // How far it is to this car's left, measured across the road where it stands (on a bend, measured across
        // this car's own heading, a car parked at the kerb ahead looks to be nearly straight ahead).
        const at=this.at(d.leg,Math.max(0,Math.min(d.leg.lengths.at(-1)!,d.s+along)));
        const left=(q.x-at.x)*at.dir.z-(q.z-at.z)*at.dir.x-d.lat;
        const isLearner=q===learner.pose.position;
        const qHalfLength=isLearner?2.15:(q as Partial<KerbFootprint>).halfLength??2.2;
        // (Alongside one on its side, measured from its lane: out round the learner it is further to the left.)
        if(!isLearner&&Math.abs(along)<qHalfLength+car.halfLength+.5&&left>.4&&d.lat+left-d.leg.lane<3.2)alongside=true;
        // Behind it once the two cars no longer overlap along the road (and a little more).
        if(along<-(qHalfLength+car.halfLength+.5)||along>=PASS_AHEAD||(isLearner?!canGoRound(.1):left<=.4)||left>=3.2)continue;
        if(!pass||along<pass.along)pass={q,along,left,isLearner,qHalfLength};
        if(isLearner)learnerToPass={along,left};
      }
      if(!pass)d.heldBack=false;
      if(pass){
        const {q,along,left,isLearner,qHalfLength}=pass;
        // Not yet out, and someone coming: wait behind it until they have passed. Once out alongside it, carry on
        // past it (oncoming traffic waits): never back into the lane through it.
        // Out but not yet alongside it, and no room to squeeze by a car coming: back into the lane behind it, and wait
        // there until nothing is coming (not edging out again into the same squeeze: held back).
        const behind=along>qHalfLength+car.halfLength+.8;
        d.heldBack=behind&&!alongside&&((oncoming.some(o=>o.along<along+25)&&(d.lat>d.leg.lane-.2||!!d.heldBack))||blocked);
        if(d.heldBack){target=Math.min(target,Math.max(0,(along-qHalfLength-car.halfLength-2.5)*.5));car.speed=Math.min(car.speed,target+.5);if(target<.5&&!why)why='held back'}
        else if(!isLearner){
          // Out far enough to clear its side (its own width, not a typical car's) with a little room.
          const qHalfWidth=(q as Partial<KerbFootprint>).halfWidth??.9;
          want=Math.min(d.leg.lane,d.lat+left-qHalfWidth-car.halfWidth-(tight?.15:.35));
        }
        // Out round the learner: well clear of it, as far as the road (and anything parked on the far side) allows.
        if(!d.heldBack&&learnerToPass)
          want=Math.min(want,Math.max(roundRight().edge+car.halfWidth+.05,Math.min(d.leg.lane-2.6,d.lat+learnerToPass.left-.9-car.halfWidth-.4)));
      }
      // Tucked in for a car coming out past parked cars (not while alongside a parked car on this side).
      const besideParked=!!pass&&!pass.isLearner&&pass.along<pass.qHalfLength+car.halfLength+1;
      if(tuck&&!besideParked&&d.leg.road)want=Math.max(want,Math.min(d.leg.lane+.55,d.leg.road.lanes.width*d.leg.road.lanes.count/2-car.halfWidth-.1));
      // A cyclist ahead in this lane: pass it with 1.5 m to spare (rule 163) when the road ahead is clear of oncoming
      // traffic and no junction is close; otherwise stay behind it, following, as any slower vehicle.
      if(car.kind!=='cycle'&&d.leg.road&&!giveWay)for(const o of this.drivers){
        if(o.car.kind!=='cycle'||!o.car.visible||o===d)continue;
        const dx=o.car.pose.position.x-pos.x,dz=o.car.pose.position.z-pos.z,along=dx*fwd.x+dz*fwd.z,left=dx*fwd.z-dz*fwd.x;
        if(along<-(car.halfLength+2)||along>30||Math.cos(o.car.pose.heading-car.pose.heading)<.8||Math.abs(left)>3)continue;
        // (Already alongside: carry on past it.)
        if(along<car.halfLength+1||(!oncoming.some(x=>x.along<along+70)&&remaining>along+25))
          want=Math.min(want,d.lat+left-(CYCLE.halfWidth+car.halfWidth+CYCLE_ROOM));
      }
      const tuckIn=d.leg.road?Math.min(d.leg.lane+.55,d.leg.road.lanes.width*d.leg.road.lanes.count/2-car.halfWidth-.1):d.leg.lane;
      // (At a dead end it pulls in to the kerb, as if parked, out of the way of anything behind.)
      if((giveWay||why==='dead end')&&!besideParked)want=Math.max(want,tuckIn);
      // Tucked in after backing up: wait there for the one it made room for to come by.
      if(d.yieldTo){
        const y=d.yieldTo,them=this.other(y.for,learner);
        y.waited+=dt;
        const along=them?(them.pose.position.x-pos.x)*fwd.x+(them.pose.position.z-pos.z)*fwd.z:-Infinity;
        // (The learner getting nowhere a while, standing or edging to and fro, is waiting for it: it goes, edging by,
        // and does not back up for the learner again for a while. Only where there is room to get by it: beside it, or
        // round it on the right; stood a long while, with next to nothing to spare.)
        const spare=this.learnerIdle>12?0:.03;
        const roomBy=d.lat-learnerAcross>=car.halfWidth+.9+spare||canGoRound(spare);
        const learnerWaiting=y.for==='learner'&&this.learnerIdle>5&&y.waited>5&&roomBy;
        if(learnerWaiting)d.faceOff=-15;
        if(!them||!this.inWay(d,them.pose.position,40)||y.waited>40||learnerWaiting)d.yieldTo=undefined;
        // Still in its way (it stands close, not getting by): back up further, for more room.
        else if(y.waited>4&&Math.abs(them.speed)<.3&&along<car.halfLength+them.halfLength+12&&(y.extra??0)<24){
          d.yieldTo=undefined;d.backing={for:y.for,moved:0,extra:(y.extra??0)+8};
        }
        else{target=0;why=`letting ${y.for} by`;want=Math.max(want,tuckIn)}
      }
      d.lat+=Math.max(-SIDEWAYS*dt,Math.min(SIDEWAYS*dt,want-d.lat));
      // Its whole body a little further on against every other vehicle's (a bus's corner sweeping round a turn, a car
      // waiting at a give way line beside the way in): hold where moving on would run into one it is not touching yet.
      if(car.speed>.05||target>.05){
        const step=.5+car.speed*.4,boxOf=(c:TrafficCar,ahead=0)=>({id:c.id,cx:c.pose.position.x+Math.sin(c.pose.heading)*ahead,cz:c.pose.position.z-Math.cos(c.pose.heading)*ahead,heading:c.pose.heading,halfW:c.halfWidth,halfD:c.halfLength+.1});
        const next=boxOf(car,step),now=boxOf(car);
        for(const o of this.drivers){
          // (Not one coming the other way: squeezing past each other on a narrow street is handled above, by centimetres.)
          if(o===d||!o.car.visible||d.through===o||Math.cos(o.car.pose.heading-car.pose.heading)<-.7)continue;
          // (Waved on out of a knot: it edges by those standing still, as drivers squeeze past each other.)
          if(d.waved&&o.car.speed<.3)continue;
          const ob=boxOf(o.car);
          if(boxesOverlap(next,ob)&&!boxesOverlap(now,ob)){target=0;car.speed=Math.min(car.speed,1);why=`blocked by ${o.car.id}`;break}
        }
      }
      if(following&&gap<Infinity&&target>=.05){
        // The Intelligent Driver Model: towards the speed wanted, keeping a gap that grows with speed and closing speed.
        const v=car.speed;
        const sStar=IDM.s0+Math.max(0,v*IDM.T+v*(v-leadSpeed)/(2*Math.sqrt(IDM.a*IDM.b)));
        const acc=IDM.a*(1-Math.pow(Math.min(3,v/target),4)-(sStar/Math.max(.1,gap))**2);
        car.speed=Math.max(0,v+Math.max(-BRAKE,Math.min(IDM.a,acc))*dt);
      }
      else car.speed=car.speed<target?Math.min(target,car.speed+ACCEL*dt):Math.max(target,car.speed-BRAKE*dt);
      // (Waiting at a red light is not being stuck.)
      d.waited=car.speed<.2&&d.dwell<=0&&why!=='lights'?d.waited+dt:0;
      d.why=why;
      d.s+=car.speed*dt;
      // On to the next leg (through the junction), or away if there is none.
      while(d.s>=d.leg.lengths.at(-1)!){
        const over=d.s-d.leg.lengths.at(-1)!;
        if(d.leg.road===null){
          if(!d.next){if(this.seen(car.pose.position,learner)){d.s=d.leg.lengths.at(-1)!;car.speed=0;break}car.visible=false;break}
          d.leg=d.next;d.next=null;d.s=over;d.deadEnd=undefined;d.atLine=undefined;continue;
        }
        const next=this.choose(d.leg,car.kind,learner);
        // No way on (the edge of the area): it waits there while the learner can see it, and goes once it cannot.
        if(!next){if(this.seen(car.pose.position,learner)){d.s=d.leg.lengths.at(-1)!;car.speed=0;break}car.visible=false;break}
        d.next=next;d.leg=this.connector(d.leg,next);d.s=over;d.deadEnd=undefined;d.atLine=undefined;
      }
      if(!car.visible)continue;
      this.place(d);
      // Nothing vanishes where the learner can see (the owner's report: cars blocking the road, then gone after a
      // moment). Out of its sight, a car standing a long time comes back elsewhere, as if it had turned off.
      const inView=this.seen(car.pose.position,learner);
      const fromLearner=Math.hypot(car.pose.position.x-learner.pose.position.x,car.pose.position.z-learner.pose.position.z);
      if(d.waited>20&&!inView){car.visible=false;continue}
      // Stopped at a dead end (the end of a cul-de-sac, or the edge of the area), pulled in and parked: gone once out of
      // the learner's sight.
      car.parked=d.why==='dead end'&&car.speed<.2;
      if(car.parked&&!inView){car.visible=false;car.parked=false;continue}
      // Nose to nose with another car where neither can get by (a narrow street), both standing: the one further from
      // the learner backs up to a space and lets the other through (out of the learner's sight, it turns off instead).
      if(d.why?.startsWith('facing ')&&d.waited>6&&!d.yieldTo){
        const o=this.drivers.find(x=>x.car.id===d.why!.slice(7));
        if(o&&o.car.visible&&o.car.speed<.3&&!o.backing){
          const backer=fromLearner>=Math.hypot(o.car.pose.position.x-learner.pose.position.x,o.car.pose.position.z-learner.pose.position.z)?d:o;
          const other=backer===d?o:d;
          if(!this.seen(backer.car.pose.position,learner)){backer.car.visible=false;other.waited=0}
          else backer.backing={for:other.car.id,moved:0};
          if(!d.car.visible||d.backing)continue;
        }
      }
      // Nose to nose with the learner, both standing, in each other's way (the learner out in the road past parked
      // cars, this car by its own): it backs up to a space and waits there for the learner to come through. Held up by
      // the learner close by at any angle (round a tight turn, side on), it backs up too if the learner is ahead of it.
      // Out of the learner's sight it may turn off instead. While the learner backs off to make room, it waits: once
      // there is room it drives through.
      {
        const lx=learner.pose.position.x-car.pose.position.x,lz=learner.pose.position.z-car.pose.position.z;
        const along=lx*fwd.x+lz*fwd.z,side=Math.abs(lx*fwd.z-lz*fwd.x);
        const noseToNose=Math.cos(learner.pose.heading-car.pose.heading)<-.5&&along>0&&along<25&&side<car.halfWidth+1.3;
        const heldUp=d.why?.startsWith('learner')&&Math.hypot(lx,lz)<car.halfLength+2.15+2;
        // (The learner edging to and fro, getting nowhere, counts as standing.)
        const learnerStands=Math.abs(learner.speed)<.5||this.learnerIdle>3;
        d.faceOff=(noseToNose||heldUp)&&car.speed<1&&learnerStands?(d.faceOff??0)+dt:noseToNose||heldUp?d.faceOff??0:0;
        if(d.faceOff>3&&!d.yieldTo&&along>0&&(noseToNose||heldUp)){d.faceOff=0;d.backing={for:'learner',moved:0};continue}
        if(d.faceOff>10&&!inView){d.faceOff=0;car.visible=false;continue}
      }
      // Too far from the learner: come back somewhere nearer, out of sight.
      if(Math.hypot(car.pose.position.x-learner.pose.position.x,car.pose.position.z-learner.pose.position.z)>320)car.visible=false;
    }
  }

  /**
   * How far along its way (up to `reach` m, on into the next road) this car would first come within `clear` m of a
   * point: Infinity if it never would. Its way, not a straight line ahead: round a turn, they differ.
   */
  private alongWay(d:Driver,p:Vec2,reach:number,clear:number):number{
    for(let k=0;k<=reach;k+=1){
      let s=d.s+k,leg=d.leg;
      if(s>leg.lengths.at(-1)!){
        if(!d.next)break;
        s-=leg.lengths.at(-1)!;leg=d.next;
        if(s>leg.lengths.at(-1)!)break;
      }
      const q=this.at(leg,s),lat=leg===d.leg?d.lat:laneAt(leg,s);
      if(Math.hypot(p.x-(q.x+q.dir.z*lat),p.z-(q.z-q.dir.x*lat))<clear)return k;
    }
    return Infinity;
  }

  /** Whether a point is in this car's way: ahead of it (up to `reach` m) and across its width, with room to spare. */
  private inWay(d:Driver,p:Vec2,reach:number,margin=2.4):boolean{
    const c=d.car,dx=p.x-c.pose.position.x,dz=p.z-c.pose.position.z,fx=Math.sin(c.pose.heading),fz=-Math.cos(c.pose.heading);
    const along=dx*fx+dz*fz;
    return along>-c.halfLength&&along<reach&&Math.abs(dx*fz-dz*fx)<c.halfWidth+margin;
  }

  /** Where the learner or a car (by id) is now, while it is about: its pose, speed and half length. */
  private other(id:string,learner:{pose:Pose;speed:number}):{pose:Pose;speed:number;halfLength:number}|null{
    if(id==='learner')return {pose:learner.pose,speed:learner.speed,halfLength:2.15};
    const o=this.drivers.find(x=>x.car.id===id);
    return o&&o.car.visible?{pose:o.car.pose,speed:o.car.speed,halfLength:o.car.halfLength}:null;
  }

  /**
   * Whether a car tucked in here leaves room for one coming the other way: nothing parked beside it on its own side
   * (it could not tuck in), nor on the other side beside it or within `ahead` metres in front (the other would have to
   * pull out round that, into this car).
   */
  private roomToPass(d:Driver,ahead:number):boolean{
    const p=d.car.pose.position,fx=Math.sin(d.car.pose.heading),fz=-Math.cos(d.car.pose.heading),hl=d.car.halfLength;
    return !this.options.parked.some(q=>{
      const dx=q.x-p.x,dz=q.z-p.z,along=dx*fx+dz*fz,left=dx*fz-dz*fx,ql=q.halfLength??2.2;
      if(Math.abs(left)>5)return false;
      return left>0?Math.abs(along)<hl+ql+1:along>-(hl+ql+2)&&along<hl+ql+ahead;
    });
  }

  /**
   * Backing up out of the way of one met face to face where neither could get by (a narrow street, parked cars):
   * slowly back along its way until there is a clear stretch of kerb beside it to tuck in to, with room in front for
   * the other to come by; then, tucked in, it waits for it (yieldTo). Never into what is behind it: traffic standing
   * close behind backs up too, and it stops short of the learner.
   */
  private backUp(d:Driver,learner:{pose:Pose;speed:number},dt:number){
    const b=d.backing!,car=d.car,pos=car.pose.position,fwd={x:Math.sin(car.pose.heading),z:-Math.cos(car.pose.heading)};
    const them=this.other(b.for,learner);
    const room=them?(them.pose.position.x-pos.x)*fwd.x+(them.pose.position.z-pos.z)*fwd.z-car.halfLength-them.halfLength:Infinity;
    // Done: the other is no longer in its way (gone by, turned away, moved aside); or there is room now. Face to face,
    // room for it beside a clear kerb; side on (in a junction), a few metres back out of its way.
    const gone=!them||!this.inWay(d,them.pose.position,40);
    const facing=!!them&&Math.cos(them.pose.heading-car.pose.heading)<-.5;
    const clear=facing?room>6+(b.extra??0)&&this.roomToPass(d,10+(b.extra??0)):room>4+(b.extra??0)&&b.moved>=3;
    // (Back along the way it came: its road, or its way through a junction.)
    let stuck=d.s<=.5||b.moved>=BACK_MAX;
    for(const o of this.drivers){
      if(o===d||!o.car.visible)continue;
      const dx=o.car.pose.position.x-pos.x,dz=o.car.pose.position.z-pos.z,along=dx*fwd.x+dz*fwd.z,side=Math.abs(dx*fwd.z-dz*fwd.x);
      if(along<0&&-along<car.halfLength+o.car.halfLength+1.5&&side<2.2){
        stuck=true;
        if(!o.backing&&!o.yieldTo&&o.car.speed<.5&&Math.cos(o.car.pose.heading-car.pose.heading)>.5)o.backing={for:car.id,moved:0};
      }
    }
    if(b.for!=='learner'){
      const dx=learner.pose.position.x-pos.x,dz=learner.pose.position.z-pos.z,along=dx*fwd.x+dz*fwd.z;
      if(along<0&&-along<car.halfLength+5&&Math.abs(dx*fwd.z-dz*fwd.x)<2.4)stuck=true;
    }
    // (Held up behind: waits a moment for what is behind to back too, then makes do with the room there is.)
    b.stuck=stuck?(b.stuck??0)+dt:0;
    if(gone||clear){
      d.backing=undefined;
      if(!gone)d.yieldTo={for:b.for,waited:0,...(b.extra?{extra:b.extra}:{})};
      car.speed=0;d.waited=0;
    }
    // Cannot back (just out of a junction, traffic behind): on as before, creeping past where there is room, and not
    // backing again for a while.
    else if(b.stuck>4){d.backing=undefined;d.faceOff=-10;car.speed=0;d.waited=0}else if(!stuck){
      const back=Math.min(d.s,BACK_SPEED*dt);
      d.s-=back;b.moved+=back;car.speed=0;
    }
    if(d.leg.road){
      const tuck=Math.min(d.leg.lane+.55,d.leg.road.lanes.width*d.leg.road.lanes.count/2-car.halfWidth-.1);
      d.lat+=Math.max(-SIDEWAYS*dt,Math.min(SIDEWAYS*dt,tuck-d.lat));
    }
    d.why=`backing for ${b.for}`;
    this.place(d);
  }

  /**
   * Main-road traffic that makes pulling out of a side road unsafe: a car (or the learner) coming along the main road
   * that would reach the mouth within a safe gap, or one at the mouth or in the junction now.
   */
  private mainRoadComing(d:Driver,main:Road,point:Vec2,learner:{pose:Pose;speed:number}):boolean{
    const coming=(p:Vec2,heading:number,speed:number,halfLength:number)=>{
      const dx=point.x-p.x,dz=point.z-p.z,dist=Math.hypot(dx,dz);
      if(dist<halfLength+4)return true;
      const toward=(Math.sin(heading)*dx-Math.cos(heading)*dz)/(dist||1);
      return toward>.5&&dist<80&&(dist-halfLength)/Math.max(speed,.5)<SAFE_GAP;
    };
    for(const o of this.drivers){
      if(o===d||!o.car.visible||d.through===o)continue;
      // (Not one standing there waiting for this car: each waiting for the other is no way out.)
      if(o.car.speed<.3&&o.why?.split(' ').at(-1)===d.car.id)continue;
      const op=o.car.pose.position;
      if(o.leg.road===main&&coming(op,o.car.pose.heading,o.car.speed,o.car.halfLength))return true;
      // Turning in the junction now (between roads).
      if(o.leg.road===null&&Math.hypot(op.x-point.x,op.z-point.z)<9&&o.car.speed>.3)return true;
    }
    // (The learner standing still there, or getting nowhere, while this car has waited a while is letting it out: not
    // coming.)
    if((Math.abs(learner.speed)<.3||this.learnerIdle>5)&&d.waited>5)return false;
    const lp=learner.pose.position;
    return sampleRoad(main,lp.x,lp.z).distance<roadHalfWidth(main)+1&&coming(lp,learner.pose.heading,Math.abs(learner.speed),2.15);
  }

  /** Oncoming traffic (or the learner) that makes turning right off the main road unsafe now. */
  private oncomingComing(d:Driver,learner:{pose:Pose;speed:number}):boolean{
    const point=d.leg.points.at(-1)!,road=d.leg.road;
    const coming=(p:Vec2,heading:number,speed:number,halfLength:number)=>{
      const dx=point.x-p.x,dz=point.z-p.z,dist=Math.hypot(dx,dz);
      const toward=(Math.sin(heading)*dx-Math.cos(heading)*dz)/(dist||1);
      if(toward<.3)return false;
      return dist<halfLength+5||(dist<80&&(dist-halfLength)/Math.max(speed,.5)<SAFE_GAP);
    };
    for(const o of this.drivers){
      if(o===d||!o.car.visible||o.leg.road!==road||o.leg.dir===d.leg.dir)continue;
      if(coming(o.car.pose.position,o.car.pose.heading,o.car.speed,o.car.halfLength))return true;
    }
    const lp=learner.pose.position,facing=Math.cos(learner.pose.heading-d.car.pose.heading)<-.5;
    return !!road&&facing&&sampleRoad(road,lp.x,lp.z).distance<roadHalfWidth(road)+1&&coming(lp,learner.pose.heading,Math.abs(learner.speed),2.15);
  }

  /** Collision box of a car (for the learner's collisions). */
  static readonly size={halfWidth:HALF_WIDTH,halfLength:HALF_LENGTH};
  static readonly busSize=BUS;

  /** New positions for every car (a new attempt). The car objects stay the same: visuals and collisions hold them. */
  reset():void{
    const old=this.drivers;
    this.drivers=[];
    for(let i=0;i<this.options.count;i++){
      const d=this.spawn(old[i]??null,i);
      this.drivers.push(d);
      if(!this.cars.includes(d.car))this.cars.push(d.car);
    }
  }

  dispose():void{}
}

