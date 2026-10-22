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
  /** The kind of junction: a side road off this one, the end of this road (emerging), a mini-roundabout, or
   *  traffic lights. */
  kind:'side'|'end'|'roundabout'|'lights';
  /** Roads join from both sides here (a crossroads). */
  crossroads:boolean;
}
/** A stretch of the route: a road driven one way between two points on it (metres along the road's own direction). */
export interface RouteLeg{road:Road;dir:1|-1;from:number;to:number}
/** A junction and the way taken through it, as a lesson weighs it. */
export type JunctionChoice=Pick<RouteStep,'kind'|'turn'|'crossroads'|'at'>;
export interface PlanOptions{
  /** Roads to take, in order, from the start (a way to a junction the lesson needs), before choosing freely. */
  forced?:Array<{road:Road;dir:1|-1}>;
  /** How much a lesson wants a junction and way through it (0: no preference): taken more often. */
  prefer?:(j:JunctionChoice)=>number;
}
export interface Route{steps:RouteStep[];legs:RouteLeg[];length:number}

const len=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);
const dirAt=(road:Road,along:number,dir:1|-1):Vec2=>{const p=pointAtAlong(road,along);return {x:p.direction.x*dir,z:p.direction.z*dir}};
/** Signed turn from one direction to another, radians: positive is to the right (clockwise). */
const turnAngle=(a:Vec2,b:Vec2)=>Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z);
const ORD=['first','second','third','fourth','fifth'];
/** Sharpest turn a route takes at a side road or road end (radians, about 135°). */
const SHARPEST=2.35;
/** Driving a route can still do from a turn for it to count as leading on (not soon into a dead end). */
const LEADS_ON=800;
/** Where nothing leads on that far: the least a way on must still allow (to drive on, and to pull up). */
const MIN_ONWARD=200;

interface Option{road:Road;dir:1|-1;from:number;angle:number;
  /** The turn measured further along the new road (20 m): a road that bends straight back is a U-turn in effect. */
  overall:number}
interface Decision{along:number;at:Vec2;kind:'side'|'end';options:Option[];roundabout:boolean;straight:Option|null;crossroads:boolean}

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
        if(other===road||other.centreline.length<2||other.level!==road.level)continue;
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
      // A road joining opposite, within a few metres: a crossroads.
      const crossroads=(this.sideRoads.get(road)??[]).some(x=>x!==e&&Math.abs(x.along-e.along)<10&&Math.sign(optionFrom(x,x.along).angle)===-Math.sign(o.angle));
      out.push({along:e.along,at:{x:p.x,z:p.z},kind:'side',options:[o],roundabout:false,straight:null,crossroads});
    }
    const endAlong=dir>0?L:0;
    const [na,nb]=this.roadNodes.get(road)!;
    const node=dir>0?nb:na;
    const options:Option[]=[];
    for(const e of this.ends[node]!)if(e.road!==road)options.push(optionFrom(e,endAlong));
    // T-junction: the road ends at the side of a through road.
    const end=pointAtAlong(road,endAlong);
    for(const other of this.location.roads){
      if(other===road||other.level!==road.level)continue;
      const at=sampleRoad(other,end.x,end.z);
      if(at.distance>7||at.along<3||at.along>len(other)-3)continue;
      options.push(optionFrom({road:other,dir:1},endAlong,at.along));
      if(!other.oneway)options.push(optionFrom({road:other,dir:-1},endAlong,at.along));
    }
    const n=this.nodes[node]!;
    // At a mini-roundabout every exit counts (they are numbered); elsewhere no doubling back.
    if(!n.junction)for(let k=options.length-1;k>=0;k--)if(!this.fit(options[k]!))options.splice(k,1);
    const straight=options.filter(o=>Math.abs(o.angle)<.6).sort((a,b)=>Math.abs(a.angle)-Math.abs(b.angle))[0]??null;
    const crossroads=!!straight&&options.some(o=>o.angle<-.6)&&options.some(o=>o.angle>.6);
    out.push({along:endAlong,at:n.junction?{x:n.x,z:n.z}:{x:end.x,z:end.z},kind:'end',options,roundabout:n.junction,straight,crossroads});
    return out;
  }

  /**
   * A route of about `target` metres from a position: at each junction it sometimes turns (side roads), and at
   * road ends it picks a way on, never straight back and never into a dead end. Deterministic for a seed.
   */
  plan(start:RoadPos,target:number,seed=1,options:PlanOptions={}):Route{
    let state=seed>>>0||1;
    const rand=()=>{state=Math.imul(state^(state>>>15),2246822507)+0x9e3779b9>>>0;return (state>>>8)/16777216};
    let best:Route={steps:[],legs:[],length:0};
    for(let attempt=0;attempt<60;attempt++){
      const steps:RouteStep[]=[],legs:RouteLeg[]=[];
      let pos=start,distance=0,ok=true,lastSay='',stuck=false;
      // Roads already driven: a route should not go round the same block twice.
      const key=(r:Road)=>r.name??r.id;
      const driven=new Map<string,number>([[key(start.road),1]]);
      const uses=(r:Road)=>driven.get(key(r))??0;
      const forced=[...(options.forced??[])];
      const want=(d:Decision,o:Option)=>options.prefer?.(this.choice(d,o))??0;
      while(distance<target&&steps.length<80){
        const ds=this.decisions(pos);
        // A road that ends in a dead end (the edge of the area): the last side road off it is the way on.
        const end=ds.at(-1),deadEnd=!!end&&end.kind==='end'&&!end.options.some(o=>this.leadsOn(o));
        // (Where nothing leads on far, as on a few streets with no loops: the side road that goes furthest, if it
        // goes further than the way on at the end.)
        const furthest=(os:Option[])=>Math.max(0,...os.map(o=>this.reach(o)));
        const sides=ds.filter(d=>d.kind==='side');
        const lastSide=!deadEnd?undefined:[...sides].reverse().find(d=>this.leadsOn(d.options[0]!))
          ??sides.filter(d=>this.reach(d.options[0]!)>furthest(end!.options)+50).sort((a,b)=>this.reach(b.options[0]!)-this.reach(a.options[0]!))[0];
        let taken:{d:Decision;o:Option}|null=null;
        for(const d of ds){
          // On the way to a junction the lesson needs: the roads given, in order.
          const next=forced[0];
          if(next){
            const o=d.options.find(x=>x.road===next.road&&x.dir===next.dir);
            if(o){forced.shift();taken={d,o};break}
            if(d.kind==='side')continue;
            forced.length=0;
          }
          if(d.kind==='side'){
            // Not straight after the last manoeuvre (room to signal), and not every road: more often when a lesson
            // wants this turn.
            const o=d.options[0]!,keen=want(d,o)>0;
            if(d===lastSide){taken={d,o};break}
            if(Math.abs(d.along-pos.along)>35&&uses(o.road)<=(keen?1:0)&&rand()<(keen?.85:.3)&&this.leadsOn(o)){taken={d,o};break}
            continue;
          }
          let viable=d.options.filter(o=>this.leadsOn(o));
          // Nothing leads on far: the way that goes furthest, while it leaves room to drive on and pull up.
          if(viable.length===0){const far=furthest(d.options);if(far>=MIN_ONWARD)viable=d.options.filter(o=>this.reach(o)>=far-1)}
          // Into a dead end (the edge of the area): the route ends at the last junction (no use if it is the first).
          if(viable.length===0){ok=steps.length>0;stuck=true;break}
          // Short links (a few metres between two junctions on the map) only when there is nothing else: two
          // manoeuvres moments apart are confusing to follow.
          const room=(o:Option)=>o.dir>0?len(o.road)-o.from:o.from;
          if(viable.some(o=>room(o)>40))viable=viable.filter(o=>room(o)>40);
          // A lesson's kind of turn wherever there is one (most of the time: some variety).
          if(options.prefer&&rand()<.85){const keen=viable.filter(x=>want(d,x)>0);if(keen.length)viable=keen}
          const least=Math.min(...viable.map(o=>uses(o.road)));
          viable=viable.filter(o=>uses(o.road)===least);
          // Prefer going on (ahead) sometimes, turning otherwise; or what the lesson wants.
          let o:Option;
          if(options.prefer&&viable.some(x=>want(d,x)>0)){
            const w=viable.map(x=>1+3*Math.max(0,want(d,x))),total=w.reduce((a,b)=>a+b,0);
            let r=rand()*total,i=0;
            while(i<viable.length-1&&r>=w[i]!){r-=w[i]!;i++}
            o=viable[i]!;
          }else o=d.straight&&viable.includes(d.straight)&&rand()<.45?d.straight:viable[Math.floor(rand()*viable.length)]!;
          taken={d,o};
        }
        if(!ok||!taken||stuck)break;
        const {d,o}=taken;
        distance+=Math.abs(d.along-pos.along);
        const turn:Turn=Math.abs(o.angle)<.6?'ahead':o.angle>0?'right':'left';
        let say:string;
        let exit:number|undefined;
        // Traffic lights at the junction: the examiner names them ("At the traffic lights, turn left").
        const lights=!d.roundabout&&this.location.signals.some(g=>g.kind==='junction'&&Math.hypot(g.position.x-d.at.x,g.position.z-d.at.z)<35);
        if(lights){
          const sameRoad=!!o.road.name&&o.road.name===pos.road.name;
          say=turn==='ahead'?(sameRoad?'':'At the traffic lights, go straight ahead.'):`At the traffic lights, turn ${turn}.`;
        }else if(d.roundabout){
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
        if(say)steps.push({say,turn,...(exit?{exit}:{}),at:d.at,to:{road:o.road,dir:o.dir},from:{road:pos.road,dir:pos.dir},distance,
          kind:this.choice(d,o).kind,crossroads:d.crossroads});
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

  /** The junction and way through it, as a lesson weighs it. */
  private choice(d:Decision,o:Option):JunctionChoice{
    const lights=!d.roundabout&&this.location.signals.some(g=>g.kind==='junction'&&Math.hypot(g.position.x-d.at.x,g.position.z-d.at.z)<35);
    // Where this road carries straight on, turning off it is turning into a side road (the map often splits a
    // road at every junction, so it shows as a road end); only with no way ahead is it emerging from a road end.
    // (At a crossroads the priority is not known from the map: it counts as a road end, with care both ways.)
    const kind=d.roundabout?'roundabout':lights?'lights':d.kind==='side'||d.straight&&!d.crossroads?'side':'end';
    return {kind,turn:Math.abs(o.angle)<.6?'ahead':o.angle>0?'right':'left',crossroads:d.crossroads,at:d.at};
  }

  /**
   * The roads to take from `start` to the nearest junction a lesson needs (`goal`), through it, by the shortest
   * way (within `reach` metres); null when there is none.
   */
  wayTo(start:RoadPos,goal:(j:JunctionChoice)=>boolean,seed=1,reach=1600):{way:Array<{road:Road;dir:1|-1}>;at:Vec2;end:RoadPos}|null{
    const key=(p:RoadPos)=>`${p.road.id}|${p.dir}|${Math.round(p.along)}`;
    const dist=new Map<string,number>([[key(start),0]]);
    const prev=new Map<string,{from:string;road:Road;dir:1|-1}>();
    const open:Array<[number,RoadPos]>=[[0,start]];
    let best:{cost:number;from:string;through:Option;at:Vec2}|null=null;
    while(open.length){
      open.sort((a,b)=>a[0]-b[0]);
      const [cost,pos]=open.shift()!,k=key(pos);
      if(cost>(dist.get(k)??Infinity)||cost>reach||(best&&cost>=best.cost))continue;
      for(const d of this.decisions(pos)){
        const c=cost+Math.abs(d.along-pos.along);
        const viable=d.options.filter(o=>this.leadsOn(o));
        const through=viable.filter(o=>goal(this.choice(d,o)));
        if(through.length&&(!best||c<best.cost))best={cost:c,from:k,through:through[Math.abs(seed)%through.length]!,at:d.at};
        for(const o of viable){
          const np:RoadPos={road:o.road,dir:o.dir,along:o.from},nk=key(np);
          if(c<(dist.get(nk)??Infinity)){dist.set(nk,c);prev.set(nk,{from:k,road:o.road,dir:o.dir});open.push([c,np])}
        }
      }
    }
    if(!best)return null;
    const way:Array<{road:Road;dir:1|-1}>=[];
    for(let k=best.from;prev.has(k);k=prev.get(k)!.from)way.unshift({road:prev.get(k)!.road,dir:prev.get(k)!.dir});
    way.push({road:best.through.road,dir:best.through.dir});
    return {way,at:best.at,end:{road:best.through.road,dir:best.through.dir,along:best.through.from}};
  }

  /**
   * The best of many routes for a purpose (a lesson's junctions): the highest `score` among routes of at least
   * 70% of `target`, trying seeds from `seed`.
   */
  planFor(start:RoadPos,target:number,seed:number,score:(route:Route)=>number,tries=30,options:PlanOptions={}):Route{
    let best:{route:Route;score:number}|null=null;
    for(let k=0;k<tries;k++){
      const route=this.plan(start,target,seed+k*7919,options);
      if(route.length<target*.7&&best)continue;
      const sc=score(route);
      if(!best||sc>best.score)best={route,score:sc};
    }
    return best!.route;
  }

  /**
   * The way ahead for free driving (no route): along the road from `pos`; the next turning on the side signalled
   * (`turn`, at least `from` metres on); at a road's end the way signalled, else straight on, else the way that leads
   * furthest. About `metres` long, or to a dead end; with how far along it the signalled turning is (null: none).
   */
  wayAhead(pos:RoadPos,turn:'left'|'right'|null,metres=220,from=8):{legs:RouteLeg[];turnAt:number|null}{
    const legs:RouteLeg[]=[];
    const side=(o:Option)=>Math.abs(o.angle)<.6?null:o.angle>0?'right':'left';
    let at=pos,driven=0,want=turn,turnAt:number|null=null;
    // (Further while the turning signalled is still to come.)
    while((driven<metres||want&&driven<700)&&legs.length<16){
      const ds=this.decisions(at);
      let taken:{d:Decision;o:Option}|null=null;
      for(const d of ds){
        const to=Math.abs(d.along-at.along);
        if(d.kind==='side'){
          const o=d.options[0]!;
          if(want&&side(o)===want&&driven+to>=from&&this.reach(o)>0){taken={d,o};break}
          continue;
        }
        const os=d.options.filter(o=>this.reach(o)>0);
        const pick=(list:Option[])=>[...list].sort((a,b)=>this.reach(b)-this.reach(a)||Math.abs(a.angle)-Math.abs(b.angle))[0];
        const o=(want?pick(os.filter(x=>side(x)===want)):undefined)??(d.straight&&os.includes(d.straight)?d.straight:undefined)??pick(os);
        if(o)taken={d,o};
      }
      const end=taken?taken.d.along:at.dir>0?len(at.road):0;
      legs.push({road:at.road,dir:at.dir,from:at.along,to:end});
      driven+=Math.abs(end-at.along);
      if(!taken)break;
      if(want&&side(taken.o)===want){want=null;turnAt=driven}
      at={road:taken.o.road,dir:taken.o.dir,along:taken.o.from};
      // Stopped at a junction: some of the road beyond it too (a path ending at a corner would not turn into it).
      if(!(driven<metres||want&&driven<700)||legs.length>=16){
        const room=at.dir>0?len(at.road)-at.along:at.along;
        legs.push({road:at.road,dir:at.dir,from:at.along,to:at.along+at.dir*Math.min(80,room)});
      }
    }
    return {legs,turnAt};
  }

  /** Metres to a dead end or the edge of the area ahead (Infinity when the road ends at a junction). */
  roomAhead(pos:RoadPos):number{
    const end=this.decisions(pos).at(-1);
    return !end||end.options.length>0?Infinity:Math.abs(end.along-pos.along);
  }

  /**
   * Whether driving on along an option leads on: at least LEADS_ON metres more driving are possible from it, however
   * many junctions later, without a dead end or the edge of the area (a road whose every way on soon ends in one
   * does not lead on).
   */
  leadsOn(o:{road:Road;dir:1|-1;from:number}):boolean{return this.reach(o)>=LEADS_ON}
  /** How far one can drive on from an option (metres, up to LEADS_ON), by the longest way. */
  reach(o:{road:Road;dir:1|-1;from:number}):number{
    const reach=this.reaches(),k=this.stateKey(o.road,o.dir,o.from);
    // (Every option is one of the places reached from a road's start; anything else, by its own ways on.)
    return reach.get(k)??this.onward({road:o.road,dir:o.dir,along:o.from},reach);
  }
  private stateKey(road:Road,dir:number,from:number){return `${road.id}|${dir}|${Math.round(from)}`}
  private onward(pos:RoadPos,reach:Map<string,number>):number{
    let best=0;
    for(const d of this.decisions(pos)){
      const to=Math.abs(d.along-pos.along);
      best=Math.max(best,to);
      for(const o of d.options)best=Math.max(best,to+(reach.get(this.stateKey(o.road,o.dir,o.from))??0));
    }
    return Math.min(LEADS_ON,best);
  }
  /**
   * Every place a route can be (a road, a direction, where it joined it), all of them reached from any road's start,
   * and how far one can drive on from each (worked out again until nothing changes; capped, so it settles).
   */
  private reaches():Map<string,number>{
    if(this.reachOf)return this.reachOf;
    const states=new Map<string,RoadPos>();
    const queue:RoadPos[]=this.location.roads.flatMap(r=>[{road:r,dir:1 as const,along:0},...(r.oneway?[]:[{road:r,dir:-1 as const,along:len(r)}])]);
    for(const p of queue)states.set(this.stateKey(p.road,p.dir,p.along),p);
    while(queue.length){
      const pos=queue.pop()!;
      for(const d of this.decisions(pos))for(const o of d.options){
        const k=this.stateKey(o.road,o.dir,o.from);
        if(!states.has(k)){const p={road:o.road,dir:o.dir,along:o.from};states.set(k,p);queue.push(p)}
      }
    }
    // Each place's ways on: [metres to the junction, the place it leads to (none: just the road to its end)].
    const ways=new Map<string,Array<[number,string|null]>>();
    for(const [k,p] of states)ways.set(k,this.decisions(p).flatMap(d=>{
      const to=Math.abs(d.along-p.along);
      return [[to,null] as [number,string|null],...d.options.map(o=>[to,this.stateKey(o.road,o.dir,o.from)] as [number,string|null])];
    }));
    const reach=new Map<string,number>([...states.keys()].map(k=>[k,0]));
    for(let changed=true,round=0;changed&&round<500;round++){
      changed=false;
      for(const [k,w] of ways){
        let r=0;
        for(const [to,next] of w)r=Math.max(r,to+(next?reach.get(next)??0:0));
        r=Math.min(LEADS_ON,r);
        if(r>reach.get(k)!+.5){reach.set(k,r);changed=true}
      }
    }
    return this.reachOf=reach;
  }
  private reachOf:Map<string,number>|null=null;
}
