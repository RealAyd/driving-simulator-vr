import {headingFromDirection,type Block,type Location,type Vec2} from '../contracts';
import type {StreetLayout} from './streetscape';
import {distanceToOutline,insidePolygon,type BusStop} from './townscape';
import {brandSign} from './brandSigns';
import {pavementWidthAt,pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from './roadGeometry';

/**
 * Where signs stand: street-name plates at junctions, the mini-roundabout sign
 * at each entry, bus stop flags and shelters, and shop names on fascias. Pure
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
  |{kind:'fascia';text:string;background:string};

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
  /** Largest width the panel may take (fascias are sized to their lettering). */
  maxWidth?:number;
  posts:Post[];
  /** How the position was chosen (documentation and review). */
  placement:string;
}

export interface Shelter{
  id:string;
  /** Centre of the shelter's footprint at ground level. */
  x:number;z:number;y:number;
  /** Long axis (along the kerb) and the direction from its open front to its back panel. */
  axis:Vec2;back:Vec2;
  length:number;depth:number;height:number;
}

export interface SignPlan{panels:SignPanel[];shelters:Shelter[];colliders:Block[]}

const roadLength=(road:Location['roads'][number])=>road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
const left=(d:Vec2):Vec2=>({x:d.z,z:-d.x});
const PLATE_HEIGHT=.3;
// Raised on posts (lower edge 2.1 m, like other signs over a footway), so a plate never hides traffic at a junction.
const PLATE_BOTTOM=2.1;
/** Mini-roundabout sign (diagram 611.1): 600 mm disc, lower edge 2.1 m above the footway. */
const DISC=.6,DISC_BOTTOM=2.1;

export function layoutSignage(location:Location,layout:StreetLayout|null):SignPlan{
  const plan:SignPlan={panels:[],shelters:[],colliders:[]};
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
    const width=Math.min(2.2,Math.max(1.1,text.length*.11+.35));
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

  // ---- Bus stops: a flag across the traffic on a tall pole, and a shelter where one is mapped. ----
  for(const s of stops)busStopSigns(plan,s,p=>onPavement(p)&&clearOfBuildings(p,.3));

  // ---- Shop names (map data only) on the fascia of the longest shopfront facing a road. ----
  for(const t of layout?.town?.buildings??[]){
    const name=location.buildings.find(b=>b.id===t.id)?.name;
    // Background buildings get no shop names, except a branded store (its sign reads from a distance).
    if(!name||(t.detail==='low'&&!brandSign(name)))continue;
    const wall=t.walls.filter(w=>w.shopfront).sort((a,b)=>Math.hypot(b.b.x-b.a.x,b.b.z-b.a.z)-Math.hypot(a.b.x-a.a.x,a.b.z-a.a.z))[0];
    if(!wall)continue;
    const len=Math.hypot(wall.b.x-wall.a.x,wall.b.z-wall.a.z);
    const mid={x:(wall.a.x+wall.b.x)/2+wall.out.x*.075,z:(wall.a.z+wall.b.z)/2+wall.out.z*.075};
    plan.panels.push({id:`fascia-${t.id}`,face:{kind:'fascia',text:name,background:t.fascia},x:mid.x,y:t.y+3.175,z:mid.z,normal:wall.out,
      width:Math.min(len-.6,6),height:.46,maxWidth:Math.min(len-.6,6),twoSided:false,round:false,posts:[],placement:'shop fascia (name from map data)'});
  }
  return plan;
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
    if(!corners.every(fits))continue;
    plan.shelters.push({id:`${s.id}-shelter`,x:centre.x,z:centre.z,y:s.y,axis:s.traffic,back,length,depth,height:2.45});
    plan.colliders.push({id:`${s.id}-shelter`,kind:'wall',position:centre,headingDeg:headingFromDirection(s.traffic)*180/Math.PI,
      size:{width:depth,depth:length,height:2.45},occludes:false,shape:'box'});
    return;
  }
}
