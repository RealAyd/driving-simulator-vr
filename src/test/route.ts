import type {Location,Road,Vec2} from '../contracts';
import {pointAtAlong,sampleRoad} from '../world/roadGeometry';

/**
 * Mock test routes on a location's road network, and the examiner's directions for them. A route is a series of
 * manoeuvres at junctions (side roads, road ends, mini-roundabouts) from where the learner is, chosen so it never
 * runs into a dead end or the edge of the area. Directions follow the wording examiners use ("Take the next road on
 * the left", "At the end of the road, turn right", "At the roundabout, take the second exit"); where the route just
 * follows the road, nothing is said (the briefing asks the learner to follow the road ahead).
 */

export type Turn='left'|'right'|'ahead';
/** Driving along a road one way, from a point on it (metres along the road's own direction). */
export interface RoadPos{road:Road;dir:1|-1;along:number;
  /** How well the car fits it (from `locate`): metres from the centreline, and the cosine of the angle to the road. */
  fit?:{distance:number;alignment:number}}
export interface RouteStep{
  /** What the examiner says. */
  say:string;
  turn:Turn;
  /** Mini-roundabout exit (1 = first), when at one. */
  exit?:number;
  /** Where the manoeuvre happens. */
  at:Vec2;
  /** The road the learner should be on afterwards, and which way. */
  to:{road:Road;dir:1|-1};
  /** The road it is taken from (the learner is on it before). */
  from:{road:Road;dir:1|-1};
  /** Distance along the route to the manoeuvre (metres from the route's start). */
  distance:number;
}
/** A stretch of the route: a road driven one way between two points on it (metres along the road's own direction). */
export interface RouteLeg{road:Road;dir:1|-1;from:number;to:number}
export interface Route{steps:RouteStep[];legs:RouteLeg[];length:number}

const len=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);
const dirAt=(road:Road,along:number,dir:1|-1):Vec2=>{const p=pointAtAlong(road,along);return {x:p.direction.x*dir,z:p.direction.z*dir}};
/** Signed turn from one direction to another, radians: positive is to the right (clockwise). */
const turnAngle=(a:Vec2,b:Vec2)=>Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z);
const ORD=['first','second','third','fourth','fifth'];
/** Sharpest turn a route takes at a side road or road end (radians, about 135°). */
const SHARPEST=2.35;

interface Option{road:Road;dir:1|-1;from:number;angle:number;
  /** The turn measured further along the new road (20 m): a road that bends straight back is a U-turn in effect. */
  overall:number}
interface Decision{along:number;at:Vec2;kind:'side'|'end';options:Option[];roundabout:boolean;straight:Option|null}

export class RoadNetwork{
  private readonly nodes:Array<{x:number;z:number;junction:boolean;radius:number}>=[];
  private readonly ends:Array<Array<{road:Road;dir:1|-1}>>=[];
  private readonly roadNodes=new Map<Road,[number,number]>();
  private readonly sideRoads=new Map<Road,Array<{along:number;road:Road;dir:1|-1}>>();

  constructor(readonly location:Location){
    for(const j of location.junctions){this.nodes.push({x:j.position.x,z:j.position.z,junction:true,radius:j.radius});this.ends.push([])}
    const nodeAt=(p:Vec2)=>{
      for(let i=0;i<this.nodes.length;i++){const n=this.nodes[i]!;if(Math.hypot(n.x-p.x,n.z-p.z)<(n.junction?n.radius+1.5:3))return i}
      this.nodes.push({x:p.x,z:p.z,junction:false,radius:0});this.ends.push([]);
      return this.nodes.length-1;
    };
    for(const road of location.roads){
      if(road.centreline.length<2)continue;
      const a=nodeAt(road.centreline[0]!),b=nodeAt(road.centreline.at(-1)!);
      this.ends[a]!.push({road,dir:1});
      if(!road.oneway)this.ends[b]!.push({road,dir:-1});
      this.roadNodes.set(road,[a,b]);
    }
    for(const road of location.roads){
      const L=len(road),list:Array<{along:number;road:Road;dir:1|-1}>=[];
      for(const other of location.roads){
        if(other===road||other.centreline.length<2)continue;
        for(const [end,dir] of [[other.centreline[0]!,1],[other.centreline.at(-1)!,-1]] as const){
          if(dir<0&&other.oneway)continue;
          const at=sampleRoad(road,end.x,end.z);
          if(at.distance<7&&at.along>8&&at.along<L-8)list.push({along:at.along,road:other,dir});
        }
      }
      this.sideRoads.set(road,list.sort((p,q)=>p.along-q.along));
    }
  }

  length(road:Road){return len(road)}

  /** Where a car at (x, z) heading `heading` is: the nearest road, and which way along it. */
  locate(x:number,z:number,heading:number):RoadPos|null{
    let best:{road:Road;s:ReturnType<typeof sampleRoad>}|null=null;
    for(const road of this.location.roads){const s=sampleRoad(road,x,z);if(!best||s.distance<best.s.distance)best={road,s}}
    if(!best||best.s.distance>12)return null;
    const fwd={x:Math.sin(heading),z:-Math.cos(heading)};
    const dot=best.s.direction.x*fwd.x+best.s.direction.z*fwd.z,dir:1|-1=dot>=0?1:-1;
    const fit={distance:best.s.distance,alignment:Math.abs(dot)};
    if(dir<0&&best.road.oneway)return {road:best.road,dir:1,along:best.s.along,fit};
    return {road:best.road,dir,along:best.s.along,fit};
  }

  /** The decisions ahead on a road driven one way from `along`: side roads, then the road's end. */
  private decisions(pos:RoadPos):Decision[]{
    const {road,dir,along}=pos,L=len(road);
    const out:Decision[]=[];
    const optionFrom=(o:{road:Road;dir:1|-1},at:number,from?:number):Option=>{
      const start=from??(o.dir>0?0:len(o.road));
      const along=(m:number)=>o.dir>0?Math.min(start+m,len(o.road)):Math.max(start-m,0);
      const inDir=dirAt(road,at,dir),p0=pointAtAlong(o.road,start),p1=pointAtAlong(o.road,along(20));
      return {road:o.road,dir:o.dir,from:start,angle:turnAngle(inDir,dirAt(o.road,along(6),o.dir)),overall:turnAngle(inDir,{x:p1.x-p0.x,z:p1.z-p0.z})};
    };
    for(const e of (this.sideRoads.get(road)??[]).filter(e=>dir>0?e.along>along+4:e.along<along-4).sort((p,q)=>dir*(p.along-q.along))){
      const p=pointAtAlong(road,e.along);
      const o=optionFrom(e,e.along);
      // Not a side road that doubles back (joining at a sharp angle): almost a U-turn, not a test manoeuvre.
      if(!this.fit(o))continue;
      out.push({along:e.along,at:{x:p.x,z:p.z},kind:'side',options:[o],roundabout:false,straight:null});
    }
    const endAlong=dir>0?L:0;
    const [na,nb]=this.roadNodes.get(road)!;
    const node=dir>0?nb:na;
    const options:Option[]=[];
    for(const e of this.ends[node]!)if(e.road!==road)options.push(optionFrom(e,endAlong));
    // T-junction: the road ends at the side of a through road.
    const end=pointAtAlong(road,endAlong);
    for(const other of this.location.roads){
      if(other===road)continue;
      const at=sampleRoad(other,end.x,end.z);
      if(at.distance>7||at.along<3||at.along>len(other)-3)continue;
      options.push(optionFrom({road:other,dir:1},endAlong,at.along));
      if(!other.oneway)options.push(optionFrom({road:other,dir:-1},endAlong,at.along));
    }
    const n=this.nodes[node]!;
    // At a mini-roundabout every exit counts (they are numbered); elsewhere no doubling back.
    if(!n.junction)for(let k=options.length-1;k>=0;k--)if(!this.fit(options[k]!))options.splice(k,1);
    const straight=options.filter(o=>Math.abs(o.angle)<.6).sort((a,b)=>Math.abs(a.angle)-Math.abs(b.angle))[0]??null;
    out.push({along:endAlong,at:n.junction?{x:n.x,z:n.z}:{x:end.x,z:end.z},kind:'end',options,roundabout:n.junction,straight});
    return out;
  }

  /**
   * A route of about `target` metres from a position: at each junction it sometimes turns (side roads), and at
   * road ends it picks a way on, never straight back and never into a dead end. Deterministic for a seed.
   */
  plan(start:RoadPos,target:number,seed=1):Route{
    let state=seed>>>0||1;
    const rand=()=>{state=Math.imul(state^(state>>>15),2246822507)+0x9e3779b9>>>0;return (state>>>8)/16777216};
    let best:Route={steps:[],legs:[],length:0};
    for(let attempt=0;attempt<60;attempt++){
      const steps:RouteStep[]=[],legs:RouteLeg[]=[];
      let pos=start,distance=0,ok=true,lastSay='';
      // Roads already driven: a route should not go round the same block twice.
      const key=(r:Road)=>r.name??r.id;
      const driven=new Map<string,number>([[key(start.road),1]]);
      const uses=(r:Road)=>driven.get(key(r))??0;
      while(distance<target&&steps.length<20){
        const ds=this.decisions(pos);
        let taken:{d:Decision;o:Option}|null=null;
        for(const d of ds){
          if(d.kind==='side'){
            // Not straight after the last manoeuvre (room to signal), and not every road.
            if(Math.abs(d.along-pos.along)>35&&uses(d.options[0]!.road)===0&&rand()<.3&&this.leadsOn(d.options[0]!)){taken={d,o:d.options[0]!};break}
            continue;
          }
          let viable=d.options.filter(o=>this.leadsOn(o));
          if(viable.length===0){ok=false;break}
          // Short links (a few metres between two junctions on the map) only when there is nothing else: two
          // manoeuvres moments apart are confusing to follow.
          const room=(o:Option)=>o.dir>0?len(o.road)-o.from:o.from;
          if(viable.some(o=>room(o)>40))viable=viable.filter(o=>room(o)>40);
          const least=Math.min(...viable.map(o=>uses(o.road)));
          viable=viable.filter(o=>uses(o.road)===least);
          // Prefer going on (ahead) sometimes, turning otherwise.
          const o=d.straight&&viable.includes(d.straight)&&rand()<.45?d.straight:viable[Math.floor(rand()*viable.length)]!;
          taken={d,o};
        }
        if(!ok||!taken)break;
        const {d,o}=taken;
        distance+=Math.abs(d.along-pos.along);
        const turn:Turn=Math.abs(o.angle)<.6?'ahead':o.angle>0?'right':'left';
        let say:string;
        let exit:number|undefined;
        if(d.roundabout){
          // Exits counted clockwise from the left (UK), the way the learner would count them.
          const order=[...d.options].sort((a,b)=>a.angle-b.angle);
          exit=order.indexOf(o)+1;
          const way=turn==='ahead'?', that\'s straight ahead':turn==='left'?', that\'s to the left':', that\'s to the right';
          say=`At the roundabout, take the ${ORD[exit-1]??`${exit}th`} exit${way}.`;
        }else if(d.kind==='side'){
          // "The next road" unless a road on the same side comes first.
          const sameSide=ds.filter(x=>x.kind==='side'&&x.along*pos.dir<d.along*pos.dir&&Math.sign(x.options[0]!.angle)===Math.sign(o.angle)).length;
          say=`Take the ${sameSide===0?'next':ORD[sameSide]} road on the ${turn==='right'?'right':'left'}.`;
        }else if(d.straight&&turn!=='ahead'){
          say=`At the junction, turn ${turn}.`;
        }else if(turn==='ahead'){
          // Only where there is a real choice and a different road ahead; the same road carrying on is "follow the road".
          const sameRoad=!!o.road.name&&o.road.name===pos.road.name;
          say=d.options.length>1&&!sameRoad?'At the junction, go straight ahead.':'';
        }else{
          say=`At the end of the road, turn ${turn}.`;
        }
        if(say&&say===lastSay&&steps.length>0&&distance-steps.at(-1)!.distance<40)say=`Then ${say[0]!.toLowerCase()}${say.slice(1)}`;
        lastSay=say;
        if(say)steps.push({say,turn,...(exit?{exit}:{}),at:d.at,to:{road:o.road,dir:o.dir},from:{road:pos.road,dir:pos.dir},distance});
        legs.push({road:pos.road,dir:pos.dir,from:pos.along,to:d.along});
        pos={road:o.road,dir:o.dir,along:o.from};
        driven.set(key(o.road),uses(o.road)+1);
      }
      if(ok&&distance>best.length){best={steps,legs,length:distance};if(distance>=target)break}
    }
    return best;
  }

  /**
   * Whether a turn suits a test route: not one that doubles back (a sharp angle, or a lane that bends round to run
   * back beside the road just left), and not onto an unnamed road (service roads and lanes; the examiner names none).
   */
  private fit(o:Option):boolean{
    return Math.abs(o.angle)<=SHARPEST&&Math.abs(o.overall)<=SHARPEST&&!!o.road.name;
  }

  /** Whether driving on along an option leads to another decision (not a dead end or the edge of the area). */
  private leadsOn(o:Option):boolean{
    const ds=this.decisions({road:o.road,dir:o.dir,along:o.from});
    return ds.some(d=>d.kind==='side'||d.options.length>0);
  }
}
