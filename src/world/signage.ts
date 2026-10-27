import {headingFromDirection,type Block,type Location,type Vec2} from '../contracts';
import type {StreetLayout} from './streetscape';
import {distanceToOutline,insidePolygon,type BusStop} from './townscape';
import {brandSign,TRADE_SIGNS,tradeFromName} from './brandSigns';
import {pavementWidthAt,pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from './roadGeometry';
import {junctionMouths,mouthPoint,schoolFrontages} from './junctionControls';
import {layoutRoundabouts} from './roundaboutLayout';
import {roundaboutRings} from './roundabouts';

/**
 * Where signs stand: street-name plates at junctions, the mini-roundabout sign
 * at each entry, STOP and GIVE WAY signs where the map has them, speed limit
 * signs where the limit changes, school warning signs, bus stop flags and
 * shelters, and shop names on fascias. Pure
 * data (like streetscape.ts and townscape.ts), so placements and their
 * colliders can be tested; signageMesh.ts draws them.
 *
 * Names come only from the location's data (OpenStreetMap for Brentwood). Sign
 * positions are not mapped: each is placed by rule and recorded as estimated.
 * Nothing here affects scoring.
 */

export type SignFace=
  |{kind:'street-name';text:string}
  |{kind:'mini-roundabout'}
  |{kind:'bus-flag';name:string;indicator:string|null}
  |{kind:'fascia';text:string;background:string;colour:string;weight:string;
    /** A chain's sign: its colours run the whole fascia (others are as wide as their lettering). */
    full?:boolean}
  /** A business's name on a board on its wall (set-back stores, churches, schools). */
  |{kind:'name-board';text:string;background:string;colour:string;weight:string}
  /** A chemist's green cross, projecting from the wall. */
  |{kind:'cross'}
  /** A pub's hanging sign: its name on a dark board. */
  |{kind:'hanging';text:string}
  /** Regulatory and warning signs (TSRGD diagrams 601.1, 602, 670/671, 545). */
  |{kind:'stop'}|{kind:'give-way'}|{kind:'speed-limit';mph:number}|{kind:'school'}
  /** At roundabouts: the warning ahead (diagram 510), keep left at a splitter's nose (610), chevrons on the island (515). */
  |{kind:'roundabout-ahead'}|{kind:'keep-left'}|{kind:'chevrons'};

export interface Post{x:number;z:number;y:number;height:number;radius:number}

export interface SignPanel{
  id:string;
  face:SignFace;
  /** Centre of the panel. */
  x:number;y:number;z:number;
  /** Horizontal direction the front faces (unit vector). */
  normal:Vec2;
  width:number;height:number;
  /** Drawn on both faces (free-standing plates and flags); otherwise a plain back. */
  twoSided:boolean;
  /** Circular sign (drawn as a disc). */
  round:boolean;
  /** Other sign shapes, inscribed in a circle `width` across. */
  shape?:'octagon'|'triangle-up'|'triangle-down';
  /** Largest width the panel may take (fascias are sized to their lettering). */
  maxWidth?:number;
  posts:Post[];
  /** How the position was chosen (documentation and review). */
  placement:string;
  /** Hung from a bracket fixed to the wall at this point (projecting signs). */
  bracket?:{x:number;y:number;z:number};
}

/** A petrol station's canopy over its pumps (position estimated round the mapped station). */
export interface Canopy{
  id:string;x:number;z:number;y:number;
  /** Along the road, and away from it. */
  axis:Vec2;away:Vec2;
  length:number;width:number;height:number;
  /** Fascia round the canopy edge: the chain's or a plain one. */
  text:string;background:string;colour:string;
}

export interface Shelter{
  id:string;
  /** Centre of the shelter's footprint at ground level. */
  x:number;z:number;y:number;
  /** Long axis (along the kerb) and the direction from its open front to its back panel. */
  axis:Vec2;back:Vec2;
  length:number;depth:number;height:number;
}

export interface SignPlan{panels:SignPanel[];shelters:Shelter[];canopies:Canopy[];colliders:Block[]}

const roadLength=(road:Location['roads'][number])=>road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
const left=(d:Vec2):Vec2=>({x:d.z,z:-d.x});
// A little larger than the usual 0.3 m plate, so the name reads on a phone screen from a car's length or two away.
const PLATE_HEIGHT=.36;
// Raised on posts (lower edge 1.8 m: above a car's roof line and a child's head), so a plate never hides traffic or
// people at a junction, yet low enough to be in a driver's view.
const PLATE_BOTTOM=1.8;
/** Mini-roundabout sign (diagram 611.1): 600 mm disc, lower edge 2.1 m above the footway. */
const DISC=.6,DISC_BOTTOM=2.1;
/** STOP (750 mm octagon), GIVE WAY and warning triangles (about 750 mm a side): their circle, and lower edge. */
const OCTAGON=.75,TRIANGLE=.86,SIGN_BOTTOM=2.1;
/** A keep-left sign (diagram 610) on a splitter's bollard: its disc, lower edge, and the bollard's radius. */
const KEEP_LEFT=.45,KEEP_LEFT_BOTTOM=.75,BOLLARD=.2;
/** Chevrons on a roundabout's island (diagram 515): the board's height and its lower edge above the island. */
const CHEVRON_HEIGHT=.6,CHEVRON_BOTTOM=.5;
/** Petrol station canopy: the depth of its edge fascia, and where the pump islands stand (share of its length out
 * from the middle; metres either side of the centre line). */
export const CANOPY_FASCIA=.9,PUMP_ALONG=.32,PUMP_APART=1;

export function layoutSignage(location:Location,layout:StreetLayout|null):SignPlan{
  const plan:SignPlan={panels:[],shelters:[],canopies:[],colliders:[]};
  const lamps=layout?.lamps??[],trees=layout?.trees??[],stops=layout?.town?.busStops??[];
  const buildings=location.buildings;
  const clearOfFurniture=(p:Vec2,margin:number)=>
    !lamps.some(l=>Math.hypot(l.x-p.x,l.z-p.z)<margin)&&!trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<margin+.3)&&
    !stops.some(s=>Math.hypot(s.x-p.x,s.z-p.z)<margin+.5)&&
    !plan.panels.some(s=>s.posts.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<margin+.3));
  const onPavement=(p:Vec2)=>surfaceAt(location,p.x,p.z)?.kind==='pavement';
  const clearOfBuildings=(p:Vec2,margin:number)=>!buildings.some(b=>insidePolygon(p,b.footprint)||distanceToOutline(p,b.footprint)<margin);
  const height=(p:Vec2)=>surfaceAt(location,p.x,p.z)?.height??0;
  const post=(p:Vec2,h:number,radius:number):Post=>({x:p.x,z:p.z,y:height(p),height:h,radius});
  const collider=(id:string,p:Vec2,size:number,h:number)=>plan.colliders.push({id,kind:'wall',position:{x:p.x,z:p.z},headingDeg:0,size:{width:size,depth:size,height:h},occludes:false,shape:'box'});

  // ---- Street-name plates: one per street at each junction or side-road mouth, on a pavement corner. ----
  // Free-standing plates on two posts, set along the street they name so traffic on the other road reads them.
  const ends:Array<{road:Location['roads'][number];at:Vec2;into:Vec2;key:string;clearFrom:number}>=[];
  for(const road of location.roads){
    if(!road.name)continue;
    const length=roadLength(road);
    for(const start of [true,false]){
      const end=start?road.centreline[0]!:road.centreline.at(-1)!;
      const inner=pointAtAlong(road,start?Math.min(length,8):Math.max(0,length-8));
      const into={x:inner.x-end.x,z:inner.z-end.z};
      const l=Math.hypot(into.x,into.z)||1;into.x/=l;into.z/=l;
      const junction=location.junctions.find(j=>Math.hypot(j.position.x-end.x,j.position.z-end.z)<=j.radius+2);
      if(junction){ends.push({road,at:junction.position,into,key:`${junction.id}:${road.name}`,clearFrom:junction.radius+2.5});continue}
      // A side road's mouth on another, differently named road.
      const main=location.roads.find(r=>r.id!==road.id&&r.name!==road.name&&sampleRoad(r,end.x,end.z).distance<=roadHalfWidth(r)+.5);
      if(main)ends.push({road,at:end,into,key:`${main.id}:${road.name}`,clearFrom:roadHalfWidth(main)+pavementWidthAt(main,sampleRoad(main,end.x,end.z).along,1)+.8});
    }
  }
  const placed=new Set<string>();
  for(const e of ends){
    if(placed.has(e.key))continue;
    const text=e.road.name!;
    const width=Math.min(2.6,Math.max(1.3,text.length*.13+.4));
    const half=roadHalfWidth(e.road);
    search:for(let d=e.clearFrom+width/2;d<=e.clearFrom+width/2+9;d+=1)for(const side of [-1,1]){
      const s=sampleRoad(e.road,e.at.x+e.into.x*d,e.at.z+e.into.z*d);
      const pw=pavementWidthAt(e.road,s.along,side);
      if(pw<1.2)continue;
      const lateral=half+Math.min(Math.max(.9,pw*.55),pw-.35);
      // Right of the road's direction is (-dz, dx).
      const p=pointAtAlong(e.road,s.along);
      const c={x:p.x-p.direction.z*side*lateral,z:p.z+p.direction.x*side*lateral};
      const ends2=[-1,1].map(k=>({x:c.x+e.into.x*k*(width/2-.08),z:c.z+e.into.z*k*(width/2-.08)}));
      if(![c,...ends2].every(p=>onPavement(p)&&clearOfBuildings(p,.5)&&clearOfFurniture(p,1)))continue;
      const y=height(c);
      plan.panels.push({id:`street-name-${plan.panels.length}`,face:{kind:'street-name',text},x:c.x,y:y+PLATE_BOTTOM+PLATE_HEIGHT/2,z:c.z,
        normal:left(e.into),width,height:PLATE_HEIGHT,twoSided:true,round:false,
        posts:ends2.map(p=>post(p,PLATE_BOTTOM+PLATE_HEIGHT,.035)),
        placement:`estimated: corner of ${text} ${d.toFixed(0)} m from the junction, ${side<0?'left':'right'} side`});
      ends2.forEach((p,k)=>collider(`street-name-${plan.panels.length}-post-${k}`,p,.1,PLATE_BOTTOM+PLATE_HEIGHT));
      placed.add(e.key);
      break search;
    }
  }

  // ---- Mini-roundabout sign (diagram 611.1) on the left of every entry, facing approaching traffic. ----
  for(const j of location.junctions){
    if(j.kind!=='mini-roundabout')continue;
    for(const roadId of j.entries){
      const road=location.roads.find(r=>r.id===roadId);
      if(!road)continue;
      const length=roadLength(road);
      const atEnd=Math.hypot(road.centreline.at(-1)!.x-j.position.x,road.centreline.at(-1)!.z-j.position.z)<=j.radius+2;
      const half=roadHalfWidth(road);
      for(let back=j.radius+2;back<=j.radius+14;back+=1){
        const p=pointAtAlong(road,atEnd?length-back:back);
        const travel=atEnd?p.direction:{x:-p.direction.x,z:-p.direction.z};
        const l=left(travel);
        const off=half+.55;
        const c={x:p.x+l.x*off,z:p.z+l.z*off};
        if(!onPavement(c)||!clearOfBuildings(c,.4)||!clearOfFurniture(c,1.2))continue;
        const y=height(c);
        plan.panels.push({id:`mini-roundabout-${j.id}-${road.id}`,face:{kind:'mini-roundabout'},x:c.x,y:y+DISC_BOTTOM+DISC/2,z:c.z,
          normal:{x:-travel.x,z:-travel.z},width:DISC,height:DISC,twoSided:false,round:true,
          posts:[post(c,DISC_BOTTOM+DISC*.9,.04)],placement:`estimated: left of the ${road.name??road.id} entry, ${back.toFixed(0)} m from the junction centre`});
        collider(`mini-roundabout-${j.id}-${road.id}-post`,c,.1,DISC_BOTTOM+DISC);
        break;
      }
    }
  }

  // ---- Upright signs facing traffic on the left of a road, a little way back from a point on it. ----
  const standing=(id:string,face:SignFace,road:Location['roads'][number],at:(back:number)=>{x:number;z:number;dir:Vec2},
    backs:number[],size:number,shape:'octagon'|'triangle-up'|'triangle-down'|'round',why:string,side:1|-1=1)=>{
    const half=roadHalfWidth(road);
    for(const back of backs){
      const p=at(back),l0=left(p.dir),l={x:l0.x*side,z:l0.z*side};
      for(const off of [half+.55,half+.9]){
        const c={x:p.x+l.x*off,z:p.z+l.z*off};
        if(!onPavement(c)||!clearOfBuildings(c,.4)||!clearOfFurniture(c,1))continue;
        // Not on a corner: well back from every other road's kerb, where a turning car could clip the post.
        if(location.roads.some(o=>o!==road&&sampleRoad(o,c.x,c.z).distance<roadHalfWidth(o)+2.5))continue;
        const y=height(c);
        plan.panels.push({id,face,x:c.x,y:y+SIGN_BOTTOM+size/2,z:c.z,normal:{x:-p.dir.x,z:-p.dir.z},width:size,height:size,
          twoSided:false,round:shape==='round',...(shape==='round'?{}:{shape}),
          posts:[post(c,SIGN_BOTTOM+size*.8,.04)],placement:`estimated: ${why}, ${back.toFixed(0)} m back`});
        collider(`${id}-post`,c,.1,SIGN_BOTTOM+size);
        return true;
      }
    }
    return false;
  };
  // STOP and GIVE WAY signs, beside the line, where the map has one (unsigned give way lines have none).
  for(const m of junctionMouths(location)){
    if(!m.signed)continue;
    standing(`${m.id}-sign`,{kind:m.kind},m.road,b=>mouthPoint(m,b,0),[1,2,3,4,5,6,8],m.kind==='stop'?OCTAGON:TRIANGLE,
      m.kind==='stop'?'octagon':'triangle-down',`${m.kind==='stop'?'STOP':'GIVE WAY'} at the ${m.road.name??m.road.id} mouth`);
  }
  // Speed limit signs where one road runs on into another with a different mapped limit, facing traffic entering it
  // (both sides of the road on a two-way road, as terminal signs are).
  for(const road of location.roads){
    const mph=road.speedLimitMph;
    if(!mph)continue;
    const length=roadLength(road);
    if(length<15)continue;
    for(const atEnd of [false,true]){
      if(road.oneway&&atEnd)continue;
      const end=atEnd?road.centreline.at(-1)!:road.centreline[0]!;
      const before=location.roads.find(o=>o!==road&&o.speedLimitMph&&o.speedLimitMph!==mph&&
        [o.centreline[0]!,o.centreline.at(-1)!].some(e=>Math.hypot(e.x-end.x,e.z-end.z)<3));
      if(!before)continue;
      // Traffic entering the road (its direction of travel), the sign standing `back` metres in from the end.
      const enter=(back:number)=>{const p=pointAtAlong(road,atEnd?length-back:back);return {x:p.x,z:p.z,dir:atEnd?{x:-p.direction.x,z:-p.direction.z}:p.direction}};
      const face:SignFace={kind:'speed-limit',mph};
      const why=`${mph} mph from ${before.speedLimitMph} mph on ${road.name??road.id}`;
      standing(`speed-${road.id}-${atEnd?'end':'start'}-l`,face,road,enter,[4,6,8,10,12],DISC,'round',why);
      if(!road.oneway)standing(`speed-${road.id}-${atEnd?'end':'start'}-r`,face,road,enter,[4,6,8,10,12],DISC,'round',why,-1);
    }
  }
  // School warning signs (children going to or from school) on each approach to a school's frontage.
  for(const f of schoolFrontages(location)){
    const length=roadLength(f.road);
    for(const dir of [1,-1] as const){
      if(f.road.oneway&&dir<0)continue;
      const signAt=f.along-dir*(f.length/2+25);
      if(signAt<5||signAt>length-5)continue;
      standing(`${f.id}-warning-${dir}`,{kind:'school'},f.road,b=>{const p=pointAtAlong(f.road,signAt-dir*b);return {x:p.x,z:p.z,dir:{x:p.direction.x*dir,z:p.direction.z*dir}}},
        [0,3,6,9],TRIANGLE,'triangle-up',`school ahead on ${f.road.name??f.road.id}`);
    }
  }

  // ---- Roundabouts bigger than a mini (roundaboutLayout.ts): a keep-left sign on each splitter's nose, chevrons on
  // the island facing each way in, and the warning sign on the approach. ----
  const {islands,bollards}=layoutRoundabouts(location);
  for(const b of bollards){
    plan.panels.push({id:`${b.id}-keep-left`,face:{kind:'keep-left'},x:b.at.x,y:b.y+KEEP_LEFT_BOTTOM+KEEP_LEFT/2,z:b.at.z,
      normal:{x:-b.travel.x,z:-b.travel.z},width:KEEP_LEFT,height:KEEP_LEFT,twoSided:false,round:true,
      posts:[{x:b.at.x,z:b.at.z,y:b.y,height:KEEP_LEFT_BOTTOM,radius:BOLLARD}],
      placement:`estimated: the splitter island's nose on ${b.road.name??b.road.id} at the roundabout`});
    collider(b.id,b.at,2*BOLLARD,KEEP_LEFT_BOTTOM+KEEP_LEFT);
  }
  roundaboutRings(location).forEach((ring,i)=>{
    const island=islands.find(x=>x.ring===ring);
    for(const road of location.roads){
      if(ring.roads.has(road))continue;
      const length=roadLength(road);
      for(const atEnd of [true,false]){
        // Ways in: the end that meets the ring, driven towards it.
        if(road.oneway&&!atEnd)continue;
        const end=atEnd?road.centreline.at(-1)!:road.centreline[0]!;
        if(Math.hypot(end.x-ring.position.x,end.z-ring.position.z)>ring.reach+4)continue;
        const toward=(back:number)=>{const p=pointAtAlong(road,atEnd?length-back:back);return {x:p.x,z:p.z,dir:atEnd?p.direction:{x:-p.direction.x,z:-p.direction.z}}};
        // The warning, far enough back to slow for it (further on faster roads).
        const edge=Math.max(0,ring.reach+roadHalfWidth(road)-Math.hypot(end.x-ring.position.x,end.z-ring.position.z));
        const far=(road.speedLimitMph??30)>40?[110,100,120,90]:[60,70,50,80,45];
        const backs=far.map(b=>b+edge).filter(b=>b<length-5);
        if(backs.length)standing(`roundabout-${i}-${road.id}-${atEnd?'end':'start'}-ahead`,{kind:'roundabout-ahead'},road,toward,backs,TRIANGLE,'triangle-up',
          `roundabout ahead on ${road.name??road.id}`);
        // Chevrons on the island, where the way in points at it.
        if(!island||island.ring.radius-island.half<3)continue;
        const m=toward(Math.min(length,edge+8));
        let best:Vec2|null=null,bd=Infinity;
        for(const q of island.outline){
          const dx=q.x-m.x,dz=q.z-m.z,along=dx*m.dir.x+dz*m.dir.z,side=Math.abs(dx*m.dir.z-dz*m.dir.x);
          if(along>0&&side+along*.1<bd){bd=side+along*.1;best=q}
        }
        if(!best)continue;
        const c=island.centre,d=Math.hypot(best.x-c.x,best.z-c.z)||1,inset=Math.min(1.2,d*.3);
        const at={x:best.x+(c.x-best.x)/d*inset,z:best.z+(c.z-best.z)/d*inset};
        const width=island.ring.radius>14?2.4:1.6,r={x:-m.dir.z,z:m.dir.x};
        const posts=[-1,1].map(k=>({x:at.x+r.x*k*(width/2-.15),z:at.z+r.z*k*(width/2-.15),y:island.y+.12,height:CHEVRON_BOTTOM+CHEVRON_HEIGHT,radius:.04}));
        plan.panels.push({id:`roundabout-${i}-${road.id}-${atEnd?'end':'start'}-chevrons`,face:{kind:'chevrons'},x:at.x,y:island.y+.12+CHEVRON_BOTTOM+CHEVRON_HEIGHT/2,z:at.z,
          normal:{x:-m.dir.x,z:-m.dir.z},width,height:CHEVRON_HEIGHT,twoSided:false,round:false,posts,
          placement:`estimated: on the island, facing the way in from ${road.name??road.id}`});
        posts.forEach((p,k)=>collider(`roundabout-${i}-${road.id}-${atEnd?'end':'start'}-chevrons-${k}`,p,.1,CHEVRON_BOTTOM+CHEVRON_HEIGHT));
      }
    }
  });

  // ---- Bus stops: a flag across the traffic on a tall pole, and a shelter where one is mapped. ----
  for(const s of stops)busStopSigns(plan,s,p=>onPavement(p)&&clearOfBuildings(p,.3));

  // ---- Businesses (map data only): each named shop's fascia in its chain's or its trade's colours, a name board
  // on the road side of a store set back behind its car park (and of a named church or school), a chemist's green
  // cross and a pub's hanging sign. ----
  for(const t of layout?.town?.buildings??[]){
    const b=location.buildings.find(x=>x.id===t.id);
    const name=b?.name;
    if(!b||!name)continue;
    const trade=b.business??(b.use==='shop'?tradeFromName(name)??'shop':null);
    const brand=brandSign(name,b.brand);
    const tradeStyle=trade?TRADE_SIGNS[trade]:null;
    const style={background:brand?.background??(tradeStyle?.background||t.fascia),colour:brand?.colour??tradeStyle?.colour??'#f1ead6',
      weight:brand?.weight??tradeStyle?.weight??'600'};
    const text=brand?.text??name;
    const wall=t.walls.filter(w=>w.shopfront).sort((a,b)=>Math.hypot(b.b.x-b.a.x,b.b.z-b.a.z)-Math.hypot(a.b.x-a.a.x,a.b.z-a.a.z))[0];
    if(wall){
      const len=Math.hypot(wall.b.x-wall.a.x,wall.b.z-wall.a.z);
      const mid={x:(wall.a.x+wall.b.x)/2+wall.out.x*.075,z:(wall.a.z+wall.b.z)/2+wall.out.z*.075};
      const width=Math.min(len-.6,6);
      plan.panels.push({id:`fascia-${t.id}`,face:{kind:'fascia',text,...style,full:!!brand},x:mid.x,y:t.y+3.175,z:mid.z,normal:wall.out,
        width,height:.46,maxWidth:width,twoSided:false,round:false,posts:[],placement:'shop fascia (name from map data)'});
      // Projecting signs at the end of the fascia, square to the street so they are seen along it.
      const along={x:(wall.b.x-wall.a.x)/len,z:(wall.b.z-wall.a.z)/len};
      const end={x:mid.x+along.x*(width/2-.2),z:mid.z+along.z*(width/2-.2)};
      const out=(d:number)=>({x:end.x+wall.out.x*d,z:end.z+wall.out.z*d});
      if(trade==='pharmacy'){
        const c=out(.5);
        plan.panels.push({id:`cross-${t.id}`,face:{kind:'cross'},x:c.x,y:t.y+3.55,z:c.z,normal:along,width:.6,height:.6,twoSided:true,round:false,
          posts:[],placement:'chemist\'s projecting cross (estimated position)',bracket:{x:end.x,y:t.y+3.85,z:end.z}});
      }else if(trade==='pub'){
        const c=out(.62);
        plan.panels.push({id:`hanging-${t.id}`,face:{kind:'hanging',text:name},x:c.x,y:t.y+3.0,z:c.z,normal:along,width:.72,height:.92,twoSided:true,round:false,
          posts:[],placement:'pub sign on a bracket (estimated position)',bracket:{x:end.x,y:t.y+3.55,z:end.z}});
      }
      continue;
    }
    // No shopfront on a road (a store behind its car park; a church; a school): a board high on the wall that
    // faces the nearest road, sized to be read from it.
    if(!['shop','church','school','civic'].includes(b.use))continue;
    const board=nameBoardWall(location,t.walls);
    if(!board)continue;
    const len=Math.hypot(board.b.x-board.a.x,board.b.z-board.a.z);
    const big=b.use==='shop'&&t.ring.length>0&&len>12;
    const width=Math.min(len-1,big?Math.min(10,len*.5):4.5),height=big?1.1:.6;
    if(width<1.5)continue;
    const mid={x:(board.a.x+board.b.x)/2+board.out.x*.08,z:(board.a.z+board.b.z)/2+board.out.z*.08};
    const civicStyle={background:'#f4f2ec',colour:'#1f2a36',weight:'700'};
    const boardStyle=b.use==='shop'?style:civicStyle;
    plan.panels.push({id:`board-${t.id}`,face:{kind:'name-board',text,...boardStyle},x:mid.x,y:t.y+Math.min(t.height-height/2-.3,big?4.6:3.4),z:mid.z,
      normal:board.out,width,height,maxWidth:width,twoSided:false,round:false,posts:[],placement:'name board on the wall facing the road (name from map data)'});
  }

  // ---- Petrol stations: a canopy over the pumps beside the road, with the chain's fascia, and a price board. ----
  for(const [i,f] of location.furniture.entries()){
    if(f.kind!=='fuel-station')continue;
    const brand=brandSign(f.name??'',f.brand);
    const style=brand??{text:f.name??'PETROL',background:TRADE_SIGNS.fuel.background,colour:TRADE_SIGNS.fuel.colour,weight:'800'};
    const facing=f.facingDeg*Math.PI/180,toRoad={x:Math.sin(facing),z:-Math.cos(facing)},axis={x:-toRoad.z,z:toRoad.x};
    const H=4.8;
    // The canopy as near the mapped point as it fits (smaller on a tight forecourt): clear of the carriageway and
    // of buildings.
    const tries=[[14,8],[10,7]].flatMap(([L,W])=>[0,-3,3,-6,6,9,12].flatMap(back=>[0,-4,4,-8,8].map(side=>({L:L!,W:W!,back,side}))));
    for(const {L,W,back,side} of tries){
      const c={x:f.position.x-toRoad.x*back+axis.x*side,z:f.position.z-toRoad.z*back+axis.z*side};
      const corners=[-1,1].flatMap(a=>[-1,1].map(k=>({x:c.x+axis.x*a*L/2+toRoad.x*k*W/2,z:c.z+axis.z*a*L/2+toRoad.z*k*W/2})));
      // Every point of the canopy (a grid over it, not only its corners) off the carriageway and clear of buildings,
      // and no building's corner under it.
      const grid=[-1,-.5,0,.5,1].flatMap(a=>[-1,0,1].map(k=>({x:c.x+axis.x*a*L/2+toRoad.x*k*W/2,z:c.z+axis.z*a*L/2+toRoad.z*k*W/2})));
      if(!grid.every(p=>surfaceAt(location,p.x,p.z)?.kind!=='carriageway'&&clearOfBuildings(p,.5))||
        buildings.some(b=>b.footprint.some(q=>insidePolygon(q,corners.length===4?[corners[0]!,corners[1]!,corners[3]!,corners[2]!]:corners))))continue;
      plan.canopies.push({id:`fuel-${i}`,x:c.x,z:c.z,y:height(c),axis,away:{x:-toRoad.x,z:-toRoad.z},length:L,width:W,height:H,text:style.text,background:style.background,colour:style.colour});
      // Columns (and the pump islands between them) are solid.
      for(const a of [-1,1])for(const k of [-1,1]){
        const p={x:c.x+axis.x*a*L*PUMP_ALONG+toRoad.x*k*PUMP_APART,z:c.z+axis.z*a*L*PUMP_ALONG+toRoad.z*k*PUMP_APART};
        collider(`fuel-${i}-pump-${a}-${k}`,p,.9,1.6);
      }
      // The chain's name on the canopy's edge, facing the road and facing the forecourt.
      for(const side of [1,-1]){
        const n={x:toRoad.x*side,z:toRoad.z*side};
        plan.panels.push({id:`fuel-${i}-canopy-${side}`,face:{kind:'name-board',text:style.text,background:style.background,colour:style.colour,weight:style.weight},
          x:c.x+n.x*(W/2+.02),y:height(c)+H+CANOPY_FASCIA/2,z:c.z+n.z*(W/2+.02),normal:n,width:L*.6,height:CANOPY_FASCIA*.85,maxWidth:L*.6,
          twoSided:false,round:false,posts:[],placement:'petrol station canopy fascia'});
      }
      // The price board by the road, end on to the traffic.
      const totem={x:c.x+toRoad.x*(W/2+2)+axis.x*(L/2),z:c.z+toRoad.z*(W/2+2)+axis.z*(L/2)};
      if(surfaceAt(location,totem.x,totem.z)?.kind!=='carriageway'){
        plan.panels.push({id:`fuel-${i}-totem`,face:{kind:'name-board',text:style.text,background:style.background,colour:style.colour,weight:style.weight},
          x:totem.x,y:height(totem)+3.2,z:totem.z,normal:axis,width:1.4,height:1.2,twoSided:true,round:false,
          posts:[post({x:totem.x-toRoad.x*.4,z:totem.z-toRoad.z*.4},2.6,.07),post({x:totem.x+toRoad.x*.4,z:totem.z+toRoad.z*.4},2.6,.07)],
          placement:'petrol station sign by the road (estimated position)'});
        collider(`fuel-${i}-totem`,totem,1,3.8);
      }
      break;
    }
  }
  return plan;
}

/** The wall to hang a name board on: the longest that faces a road, else the one facing the nearest road. */
function nameBoardWall(location:Location,walls:readonly import('./townscape').TownWall[]){
  const len=(w:import('./townscape').TownWall)=>Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z);
  const facing=walls.filter(w=>w.facesRoad).sort((a,b)=>len(b)-len(a))[0];
  if(facing)return facing;
  let best:{w:import('./townscape').TownWall;score:number}|null=null;
  for(const w of walls){
    if(len(w)<3)continue;
    const mid={x:(w.a.x+w.b.x)/2,z:(w.a.z+w.b.z)/2};
    for(const r of location.roads){
      const s=sampleRoad(r,mid.x,mid.z);
      if(s.distance>80)continue;
      const p=pointAtAlong(r,s.along),to={x:(p.x-mid.x)/(s.distance||1),z:(p.z-mid.z)/(s.distance||1)};
      const facingIt=to.x*w.out.x+to.z*w.out.z;
      if(facingIt<.5)continue;
      const score=facingIt*len(w)/(1+s.distance/20);
      if(!best||score>best.score)best={w,score};
    }
  }
  return best?.w??null;
}

/** A bus stop's flag and timetable on its pole, and its shelter if mapped. */
function busStopSigns(plan:SignPlan,s:BusStop,fits:(p:Vec2)=>boolean):void{
  // Flag on the road side of the pole, square to the traffic so drivers see its face on approach.
  const flagW=.5,flagH=.78,bottom=2.25;
  const c={x:s.x-s.out.x*.27,z:s.z-s.out.z*.27};
  plan.panels.push({id:`${s.id}-flag`,face:{kind:'bus-flag',name:s.name??'Bus stop',indicator:s.indicator??null},x:c.x,y:s.y+bottom+flagH/2,z:c.z,
    normal:{x:-s.traffic.x,z:-s.traffic.z},width:flagW,height:flagH,twoSided:true,round:false,
    posts:[{x:s.x,z:s.z,y:s.y,height:3.1,radius:.045}],placement:'mapped stop position (OSM node), pole at the back of the kerb'});
  if(!s.shelter)return;
  // A shelter for passengers waiting behind the flag (upstream), a metre back from the kerb, its back panel
  // towards the shops and a clear walkway behind it. Position estimated (OSM maps the stop, not the shelter).
  const length=3.3,depth=Math.min(1.4,Math.max(1,s.pavement-1.6));
  const back=s.out;
  const fromKerb=1.1+depth/2;
  for(const upstream of [4,6,8,2.5,10]){
    const centre={x:s.x-s.traffic.x*upstream+back.x*(fromKerb-.5),z:s.z-s.traffic.z*upstream+back.z*(fromKerb-.5)};
    const corners=[-1,1].flatMap(a=>[-1,1].map(b=>({x:centre.x+s.traffic.x*a*length/2+back.x*b*depth/2,z:centre.z+s.traffic.z*a*length/2+back.z*b*depth/2})));
    if(![...corners,centre].every(fits))continue;
    plan.shelters.push({id:`${s.id}-shelter`,x:centre.x,z:centre.z,y:s.y,axis:s.traffic,back,length,depth,height:2.45});
    plan.colliders.push({id:`${s.id}-shelter`,kind:'wall',position:centre,headingDeg:headingFromDirection(s.traffic)*180/Math.PI,
      size:{width:depth,depth:length,height:2.45},occludes:false,shape:'box'});
    return;
  }
}
