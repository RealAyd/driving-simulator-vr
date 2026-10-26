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
 * keep their distance from each other and slow or stop for the learner's car. At junctions they follow the Highway
 * Code: out of a side road (give way or STOP lines, as marked) only into a safe gap in the main road's traffic, after
 * a full stop at a STOP line (rules 170–172); turning right off the main road, they wait for oncoming traffic (rule
 * 180). Following is the Intelligent Driver Model (Treiber, Hennecke and Helbing, 2000): smooth, with a safe gap. Scenery: they are solid (the learner
 * can hit them) but never assessed. Kept to the streets round the learner: a car that drifts too far away, or
 * reaches a dead end or the edge of the area, comes back elsewhere out of sight.
 */

export interface TrafficCar{id:string;kind:'car'|'bus';pose:Pose;speed:number;colour:string;model:number;visible:boolean;halfLength:number;halfWidth:number}
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
  dwell:number;served:Set<number>;
  /** Seconds stood still (not at a bus stop): after a while, a car stuck behind another that is also waiting creeps on. */
  waited:number;
  /** Seconds stopped nose to nose with the stopped learner, in each other's way. */
  faceOff?:number;
  /** Tucked in to the kerb to let a stopped learner through a narrow gap (until the learner has gone by). */
  squeezing?:boolean;
  /** Driving on out of a tangle with this car (ignoring it until clear of it). */
  through?:Driver|undefined;
  /** Waved on through a junction where everyone stood waiting for someone else (seconds left). */
  waved?:number;
  /** The current leg ends with no way on (worked out near its end; cleared with each new leg). */
  deadEnd?:boolean|undefined;
  /** At the end of a side road (give way or STOP lines) or turning right: stopped at the line (STOP), or going. */
  atLine?:'stopped'|'going'|undefined;
  /** Diagnostics: what it slowed for last. */
  why?:string}

const HALF_LENGTH=2.2,HALF_WIDTH=.95,BUS={halfLength:5.75,halfWidth:1.275};
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
const COLOURS=['#1f2a44','#c9ccd1','#7a1e1e','#2e3a2f','#4d5f73','#3f444b','#24476b','#5b6168','#8a8f96','#14161a'];
const mph=(v:number)=>v/2.237;

export interface TrafficOptions{
  count:number;
  /** Parked cars (their centres, and sizes where known): traffic eases towards the crown of the road to pass them. */
  parked:ReadonlyArray<Vec2&Partial<KerbFootprint>>;
  learner:()=>{pose:Pose;speed:number};
  /** How many of `count` are buses (they stop at the bus stops on their way, at the kerb). */
  buses?:number;
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
    for(const m of junctionMouths(location))
      this.mouths.set(`${m.road.id}|${m.atEnd?1:0}`,{kind:m.kind,main:m.main,point:m.atEnd?m.road.centreline.at(-1)!:m.road.centreline[0]!,lineAlong:m.lineAlong});
    this.reset();
  }
  private readonly roadNodes=new Map<Road,[number,number]>();
  /** Side-road ends with give way or STOP lines (as the road markings have them), by road and end. */
  private readonly mouths=new Map<string,{kind:'give-way'|'stop';main:Road;point:Vec2;lineAlong:number}>();
  private readonly sideRoads=new Map<Road,Array<{along:number;road:Road;dir:1|-1}>>();

  private rand(){this.seed=Math.imul(this.seed^(this.seed>>>15),2246822507)+0x9e3779b9>>>0;return (this.seed>>>8)/16777216}

  /**
   * A road driven one way from `from` (metres along the road's own direction; its start by default), as points every
   * 3 m in the direction of travel. Now and then it turns off into a side road part-way along: the leg then ends there.
   */
  private legOf(road:Road,dir:1|-1,from?:number,bus=false):Leg{
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
    const lane=road.oneway?0:road.lanes.width/2;
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
    return {points,lengths,road,dir,cruise:Math.min(limit,mph(30))*(.85+this.rand()*.12),lane,endNode:exit?-1:dir>0?nb:na,exit,endAlong:a1,rightTurn,
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
  private choose(leg:Leg,bus=false):Leg|null{
    const options=this.waysOn(leg,bus);
    if(options.length===0)return null;
    // Not into a road that leads nowhere (it stops at the edge of the area, where the map data ends): a car there
    // would have to vanish in view. Only when there is nothing else.
    const onward=options.filter(o=>this.waysOn(this.probe(o.road,o.dir),bus).length>0);
    const pick=onward.length?onward:options;
    return pick[Math.floor(this.rand()*pick.length)]!.make();
  }

  /** The end of a road driven one way, as a leg (to ask what way on there is from it). */
  private probe(road:Road,dir:1|-1):Leg{
    const [na,nb]=this.roadNodes.get(road)!;
    return {points:[dir>0?road.centreline.at(-1)!:road.centreline[0]!],lengths:[0],road,dir,cruise:0,lane:0,endNode:dir>0?nb:na};
  }

  /** The ways on at the end of a leg (none: a dead end, such as a road leaving the area, or only a U-turn). */
  private waysOn(leg:Leg,bus:boolean):Array<{road:Road;dir:1|-1;make:()=>Leg}>{
    if(!leg.road)return [];
    if(leg.exit){const exit=leg.exit;return [{road:exit.road,dir:exit.dir,make:()=>this.legOf(exit.road,exit.dir,undefined,bus)}]}
    const end=leg.points.at(-1)!;
    let options:Array<{road:Road;dir:1|-1;at?:number;make:()=>Leg}>=[];
    if(leg.endNode>=0)for(const e of this.ends[leg.endNode]!)if(e.road!==leg.road)options.push({road:e.road,dir:e.dir,make:()=>this.legOf(e.road,e.dir,undefined,bus)});
    // The end of a side road at a T-junction: on to the road it meets, either way (unless one way).
    for(const road of this.location.roads){
      if(road===leg.road||(leg.road&&road.level!==leg.road.level))continue;
      const at=sampleRoad(road,end.x,end.z);
      if(at.distance>7||at.along<3||at.along>roadLength(road)-3)continue;
      options.push({road,dir:1,at:at.along,make:()=>this.legOf(road,1,at.along,bus)});
      if(!road.oneway)options.push({road,dir:-1,at:at.along,make:()=>this.legOf(road,-1,at.along,bus)});
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

  private newCar(i:number):TrafficCar{
    const bus=i<(this.options.buses??0);
    return {id:`traffic-${i}`,kind:bus?'bus':'car',pose:{position:{x:0,y:0,z:0},heading:0},speed:0,colour:bus?'#c8102e':COLOURS[i%COLOURS.length]!,model:i,visible:false,
      halfLength:bus?BUS.halfLength:HALF_LENGTH,halfWidth:bus?BUS.halfWidth:HALF_WIDTH};
  }

  /** Places a car on a random road, 90–260 m from the learner and clear of other traffic. */
  private spawn(d:Driver|null,i:number):Driver{
    const isBus=(d?.car.kind??(i<(this.options.buses??0)?'bus':'car'))==='bus';
    // Buses keep to the through roads (a centre line), where the bus stops are.
    const all=this.location.roads.filter(r=>roadLength(r)>30);
    const main=all.filter(r=>r.markings.centre!=='none');
    const roads=isBus&&main.length?main:all;
    const learner=this.options.learner().pose.position;
    for(let tries=0;tries<60;tries++){
      const road=roads[Math.floor(this.rand()*roads.length)]!;
      const dir:1|-1=road.oneway||this.rand()<.5?1:-1;
      const leg=this.legOf(road,dir,undefined,isBus);
      const s=10+this.rand()*(leg.lengths.at(-1)!-20);
      const p=this.at(leg,s);
      const dist=Math.hypot(p.x-learner.x,p.z-learner.z);
      if(dist<90||dist>260)continue;
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
      car.visible=true;
      car.speed=leg.cruise*.8;
      const driver:Driver={car,leg,s,lat:leg.lane,next:null,dwell:0,served:new Set(),waited:0};
      this.place(driver);
      return driver;
    }
    const car=d?.car??this.newCar(i);
    car.visible=false;
    return {car,leg:this.legOf(roads[0]!,1),s:0,lat:0,next:null,dwell:0,served:new Set(),waited:0};
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
    for(const n of this.nodes){
      if(!n.junction)continue;
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
    this.unknot(dt);
    for(const [i,d] of this.drivers.entries()){
      const car=d.car;
      if(!car.visible){if(this.rand()<.02)this.drivers[i]=this.spawn(d,i);continue}
      const pos=car.pose.position,fwd={x:Math.sin(car.pose.heading),z:-Math.cos(car.pose.heading)};
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
          else{const dx=op.x-pos.x,dz=op.z-pos.z;if(dx*fwd.x+dz*fwd.z<o.car.halfLength+car.halfLength+1.5)ahead(op.x,op.z,o.car.halfLength)}
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
          else if(side<1.5)ahead(op.x,op.z,o.car.halfLength+3,`facing ${o.car.id}`);
          // Coming out past parked cars on its side towards this one (this one still in its lane): wait well back,
          // so it can pass them and pull back in before the two meet.
          else if(narrow&&o.lat<o.leg.lane-.4&&d.lat>d.leg.lane-.4&&side<car.halfWidth+o.car.halfWidth+.6)ahead(op.x,op.z,o.car.halfLength+9,`waiting for ${o.car.id}`);
        }
      }
      // The learner: followed when moving; when stopped in this lane, passed like a parked car (below) once there is room.
      const lx=learner.pose.position.x-pos.x,lz=learner.pose.position.z-pos.z;
      const learnerLeft=lx*fwd.z-lz*fwd.x,learnerAlong=lx*fwd.x+lz*fwd.z;
      const aligned=Math.cos(learner.pose.heading-car.pose.heading)>.85;
      const learnerStopped=Math.abs(learner.speed)<.5&&learnerLeft>-.8&&aligned&&d.leg.road!==null;
      // Coming the other way (moving, or waiting out in the road): parked cars on this side are passed after it.
      // Counted 15 m nearer than it is: a learner can be slow through a narrow gap, so traffic waits in good time.
      if(Math.cos(learner.pose.heading-car.pose.heading)<-.5&&learnerAlong>0&&learnerAlong<60&&Math.abs(learnerLeft)<4)oncoming.push({along:learnerAlong-15});
      // Nose to nose with the learner stopped in a gap one car wide (parked cars on both sides): after a moment,
      // tuck in to this side's kerb so the learner can come through, and stay there until they have gone by.
      const facingLearner=Math.cos(learner.pose.heading-car.pose.heading)<-.5&&learnerAlong>-3&&learnerAlong<25;
      if(!facingLearner)d.squeezing=false;
      else if(Math.abs(learner.speed)<.5&&learnerAlong<20&&d.waited>2&&d.leg.road!==null&&d.leg.lane>0)d.squeezing=true;
      const squeeze=!!d.squeezing;
      // Coming towards this car out past parked cars on its own side (near or over the middle of the road): there is
      // not room for both, so wait well back, tucked in to this side's kerb, until it is back in its lane or by.
      const learnerOut=Math.cos(learner.pose.heading-car.pose.heading)<-.5&&learnerAlong>0&&learnerAlong<40&&learnerLeft+d.lat>-1.1&&d.leg.road!==null&&d.leg.lane>0;
      if(learnerOut)ahead(learner.pose.position.x,learner.pose.position.z,12,'learner passing');
      if(squeeze){if(Math.abs(learnerLeft)<car.halfWidth+.95)ahead(learner.pose.position.x,learner.pose.position.z,2.2,'learner')}
      else if(!(learnerStopped&&learnerLeft>2.15))ahead(learner.pose.position.x,learner.pose.position.z,2.2,'learner');
      // Traffic lights ahead in this lane: stop about 1.5 m short of the line at red (and red and amber), and at
      // amber unless too close to stop comfortably (3 m/s²).
      for(const st of this.options.signals?.()??[]){
        if(st.state==='green'||Math.cos(st.heading-car.pose.heading)<.8)continue;
        const dx=st.lane.x-pos.x,dz=st.lane.z-pos.z,along=dx*fwd.x+dz*fwd.z;
        const front=along-car.halfLength;
        // (Wider where the car keeps to one side of its carriageway, coming out of a split.)
        if(front<-.5||along>45||Math.abs(dx*fwd.z-dz*fwd.x)>2.5+Math.abs(d.lat-d.leg.lane))continue;
        if(st.state==='amber'&&front<car.speed*car.speed/6+1)continue;
        // (Its distance along the car's way, not through the strip ahead: on a bend the line is off to one side.)
        if(front-1.5+GAP<gap){gap=front-1.5+GAP;why='lights';leadSpeed=0;following=false}
      }
      let target=d.leg.cruise;
      // Anything ahead but a vehicle followed (the learner, a line, a car to wait for): stop GAP short of it, as before.
      // A vehicle followed: the Intelligent Driver Model keeps the gap (below).
      if(gap<Infinity&&!following)target=Math.min(target,Math.max(0,(gap-GAP)*.55));
      // About to touch the learner's car (turning in beside it, squeezing past it): stop, whatever else applies.
      {
        const lx=learner.pose.position.x-pos.x,lz=learner.pose.position.z-pos.z;
        const along=lx*fwd.x+lz*fwd.z,side=Math.abs(lx*fwd.z-lz*fwd.x);
        // (Except creeping on past it, the other way, while it is stopped and there is room: frozen alongside with
        // centimetres to spare, the learner would clip it moving off.)
        const creepPast=Math.abs(learner.speed)<.3&&Math.cos(learner.pose.heading-car.pose.heading)<-.8&&!boxesOverlap(
          {id:'next',cx:pos.x+fwd.x*.6,cz:pos.z+fwd.z*.6,heading:car.pose.heading,halfW:car.halfWidth+.1,halfD:car.halfLength+.1},
          {id:'learner',cx:learner.pose.position.x,cz:learner.pose.position.z,heading:learner.pose.heading,halfW:.9,halfD:2.15});
        if(along>-1&&along<car.halfLength+3.2&&side<car.halfWidth+1.25){
          if(creepPast){target=Math.min(target,1.5);why='learner (creeping past)'}
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
          const r=Math.hypot(o.car.pose.position.x-point.x,o.car.pose.position.z-point.z);
          // Nearer the junction and moving, or nearer and waiting with the turn first.
          // (A bus standing at a stop just past the junction keeps it busy: there is no room to turn in beside it.)
          if(o.dwell>0&&r<reach+o.car.halfLength)return true;
          // At a roundabout, give way to traffic from the right: one coming up to it on the right, moving, about as near.
          if(node?.junction&&o.leg.road&&o.leg.endNode===d.leg.endNode&&o.car.speed>.3&&r<reach+6&&r<mine+4){
            const ox=o.car.pose.position.x-pos.x,oz=o.car.pose.position.z-pos.z;
            if(ox*-fwd.z+oz*fwd.x>1)return true;
          }
          return r<reach&&r<mine-.5&&(o.car.speed>.3||d.waited<2||this.drivers.indexOf(o)<i||d.waited<8);
        })||(()=>{
          // The learner holds the junction while moving through it or standing in it, not when parked near it.
          const r=Math.hypot(learner.pose.position.x-point.x,learner.pose.position.z-point.z);
          return r<reach&&(Math.abs(learner.speed)>.5||r<5);
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
        // A dead end (the edge of the area): stop short of it, and go only once the learner cannot see (below).
        d.deadEnd??=this.waysOn(d.leg,car.kind==='bus').length===0;
        if(d.deadEnd){target=Math.min(target,Math.max(0,(remaining-car.halfLength-1)*.5));if(remaining<car.halfLength+2)why='dead end'}
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
          if(toFront<1.2&&car.speed<.4){d.dwell=8;d.served.add(k)}
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
      if(d.leg.lane>0&&car.kind==='car')for(const q of obstacles){
        const dx=q.x-pos.x,dz=q.z-pos.z,along=dx*fwd.x+dz*fwd.z;
        if(along>=PASS_AHEAD||along<-8)continue;
        // How far it is to this car's left, measured across the road where it stands (on a bend, measured across
        // this car's own heading, a car parked at the kerb ahead looks to be nearly straight ahead).
        const at=this.at(d.leg,Math.max(0,Math.min(d.leg.lengths.at(-1)!,d.s+along)));
        const left=(q.x-at.x)*at.dir.z-(q.z-at.z)*at.dir.x-d.lat;
        const isLearner=q===learner.pose.position;
        const qHalfLength=isLearner?2.15:(q as Partial<KerbFootprint>).halfLength??2.2;
        // Behind it once the two cars no longer overlap along the road (and a little more).
        if(along<-(qHalfLength+car.halfLength+.5)||along>=PASS_AHEAD||left<=(isLearner?-.8:.4)||left>=3.2)continue;
        if(!pass||along<pass.along)pass={q,along,left,isLearner,qHalfLength};
      }
      if(pass){
        const {q,along,left,isLearner,qHalfLength}=pass;
        // Not yet out, and someone coming: wait behind it until they have passed. Once out alongside it, carry on
        // past it (oncoming traffic waits): never back into the lane through it.
        // Out but not yet alongside it, and no room to squeeze by a car coming: back into the lane behind it.
        if(((oncoming.some(o=>o.along<along+25)&&d.lat>d.leg.lane-.2)||blocked)&&along>qHalfLength+car.halfLength+.8){target=Math.min(target,Math.max(0,(along-qHalfLength-car.halfLength-2.5)*.5));car.speed=Math.min(car.speed,target+.5)}
        else if(isLearner)want=d.leg.lane-2.6;
        else{
          // Out far enough to clear its side (its own width, not a typical car's) with a little room.
          const qHalfWidth=(q as Partial<KerbFootprint>).halfWidth??.9;
          want=Math.min(d.leg.lane,d.lat+left-qHalfWidth-car.halfWidth-(tight?.15:.35));
        }
      }
      // Tucked in for a car coming out past parked cars (not while alongside a parked car on this side).
      const besideParked=!!pass&&!pass.isLearner&&pass.along<pass.qHalfLength+car.halfLength+1;
      if(tuck&&!besideParked&&d.leg.road)want=Math.max(want,Math.min(d.leg.lane+.55,d.leg.road.lanes.width*d.leg.road.lanes.count/2-car.halfWidth-.1));
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
          if(!d.next){car.visible=false;break}
          d.leg=d.next;d.next=null;d.s=over;d.deadEnd=undefined;d.atLine=undefined;continue;
        }
        const next=this.choose(d.leg,car.kind==='bus');
        if(!next){car.visible=false;break}
        d.next=next;d.leg=this.connector(d.leg,next);d.s=over;d.deadEnd=undefined;d.atLine=undefined;
      }
      if(!car.visible)continue;
      this.place(d);
      // Knotted (waiting a long time) well away from the learner: come back elsewhere, as if it had turned off.
      const fromLearner=Math.hypot(car.pose.position.x-learner.pose.position.x,car.pose.position.z-learner.pose.position.z);
      // (Behind the learner it can go after a while too: the learner cannot see it leave.)
      const lfx=Math.sin(learner.pose.heading),lfz=-Math.cos(learner.pose.heading);
      const behindLearner=(car.pose.position.x-learner.pose.position.x)*lfx+(car.pose.position.z-learner.pose.position.z)*lfz<-3;
      if((d.waited>20&&fromLearner>50)||(d.waited>25&&behindLearner)){car.visible=false;continue}
      // Nose to nose with another car on a narrow street for 10 s (it standing too): neither can get by, so the one
      // further from the learner goes (as if into a drive), as with the learner (below).
      if(d.why?.startsWith('facing ')&&d.waited>10){
        const o=this.drivers.find(x=>x.car.id===d.why!.slice(7));
        if(o&&o.car.visible&&o.car.speed<.3){
          if(fromLearner>=Math.hypot(o.car.pose.position.x-learner.pose.position.x,o.car.pose.position.z-learner.pose.position.z)){car.visible=false;continue}
          o.car.visible=false;d.waited=0;
        }
      }
      // Stopped at a dead end: gone as soon as it is out of the learner's sight.
      if(d.why==='dead end'&&car.speed<.2&&(behindLearner||fromLearner>90)){car.visible=false;continue}
      // Nose to nose with the learner, stopped, and in the way (the learner out in the road past parked cars, this
      // car waiting by its own): neither can get by, so after a while it goes (as if into a drive) rather than leave
      // both waiting for ever. The learner backing off or edging to and fro counts as waiting too (the owner's report,
      // Folkestone: the clock restarted each time they moved, so the car never went); 20 s whatever the learner does.
      {
        const lx=learner.pose.position.x-car.pose.position.x,lz=learner.pose.position.z-car.pose.position.z;
        const along=lx*fwd.x+lz*fwd.z,side=Math.abs(lx*fwd.z-lz*fwd.x);
        const noseToNose=Math.cos(learner.pose.heading-car.pose.heading)<-.5&&along>0&&along<25&&side<car.halfWidth+1.3;
        // (Creeping a metre while the learner edges back does not start the wait again: only the two getting clear.)
        // Or held up by the learner close by at any angle (round a tight turn, the two cars side on, or touching: the
        // owner's report, a small roundabout where neither could get by).
        const heldUp=d.why?.startsWith('learner')&&Math.hypot(lx,lz)<car.halfLength+2.15+2;
        d.faceOff=noseToNose||heldUp?(d.faceOff??0)+(car.speed<1?dt*(learner.speed<.5?1:.5):0):0;
        if(d.faceOff>10){d.faceOff=0;car.visible=false;continue}
      }
      // Too far from the learner: come back somewhere nearer, out of sight.
      if(Math.hypot(car.pose.position.x-learner.pose.position.x,car.pose.position.z-learner.pose.position.z)>320)car.visible=false;
    }
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
      const op=o.car.pose.position;
      if(o.leg.road===main&&coming(op,o.car.pose.heading,o.car.speed,o.car.halfLength))return true;
      // Turning in the junction now (between roads).
      if(o.leg.road===null&&Math.hypot(op.x-point.x,op.z-point.z)<9&&o.car.speed>.3)return true;
    }
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

