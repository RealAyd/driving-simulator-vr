import {headingFromDirection,type Block,type Building,type Location,type Vec2} from '../contracts';
import type {Palette,StreetLayout,Tree} from './streetscape';
import {CAR_MODELS,PARKED_CAR_COLOURS,kerbCarModels,parkedSize,type CarModelId} from '../assets/carSpecs';
import {onOtherCarriageway,pavementWidthAt,pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from './roadGeometry';

/**
 * Town-centre scenery from map data: building outlines become brick or
 * render walls with windows on each storey, a flat roof behind a parapet and,
 * where a business is mapped in the building, shopfronts on the walls that
 * face a road (generic glazing and a plain fascia; shop names are added by signage.ts). Map
 * trees, mapped bus stops, grass and car-park areas, and street lights at a
 * typical spacing (representative: lights are not mapped here). Pure data,
 * like streetscape.ts, so the drawn walls and their colliders come from the
 * same numbers and can be tested.
 */

export interface TownWall{
  a:Vec2;b:Vec2;
  /** Unit normal pointing out of the building. */
  out:Vec2;
  /** The wall looks onto a road within a few metres of the pavement. */
  facesRoad:boolean;
  /** Ground floor drawn as shopfronts (a mapped business, facing a road). */
  shopfront:boolean;
  /** A home's front: the road-facing wall nearest its road, drawn with front doors (one per house along it). */
  front:boolean;
}
export interface TownBuilding{
  id:string;
  use:Building['use'];
  ring:Vec2[];
  walls:TownWall[];
  height:number;
  levels:number;
  palette:Palette|'stone'|'concrete';
  /** Fascia paint for shopfronts. */
  fascia:string;
  /** Mapped name (OpenStreetMap), if any: chooses what its shop windows show. */
  name?:string;
  roof:'flat'|'pitched';
  detail:'full'|'low';
  roofColour:'slate'|'clay';
  /** Front door paint (homes). */
  doorColour:string;
  y:number;
}
export interface TownArea{kind:'grass'|'parking'|'garden'|'green'|'access'|'street';polygon:Vec2[]}
export interface BusStop{
  id:string;
  /** The pole, at the back of the kerb. */
  x:number;z:number;y:number;
  /** Compass heading the flag faces (towards the road). */
  heading:number;
  /** Direction of the traffic the stop serves (unit vector), and the outward normal from the kerb (away from the road). */
  traffic:Vec2;out:Vec2;
  /** Pavement width behind the pole's kerb, metres. */
  pavement:number;
  name?:string;indicator?:string;shelter:boolean;
}
export interface Obelisk{id:string;x:number;z:number;width:number;height:number;colour:string;y:number}
export interface TownLayout{buildings:TownBuilding[];areas:TownArea[];busStops:BusStop[];obelisks:Obelisk[]}

const STOREY=3.2;
const roadLength=(road:Location['roads'][number])=>road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
const WALL=.3;
const wallLength=(w:TownWall)=>Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z);
/** Furthest a wall can be behind the pavement (widened to shop fronts where mapped) and still count as facing the road, metres. */
const FACING_GAP=6;
const DOOR_COLOURS=['#f2f1ec','#1d2024','#26412f','#1f2b47','#7d1d17','#5b6168','#3d5f6e'];
const FASCIAS=['#1f2a37','#14261c','#3b1f24','#22252a','#2b3a55','#4a3b2a','#0f3d3e'];

/** Point in polygon (ray casting). */
export function insidePolygon(p:Vec2,ring:readonly Vec2[]):boolean{
  let hit=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i]!,b=ring[j]!;
    if((a.z>p.z)!==(b.z>p.z)&&p.x<a.x+(p.z-a.z)*(b.x-a.x)/(b.z-a.z))hit=!hit;
  }
  return hit;
}

/** Distance from a point to a polygon's outline. */
export function distanceToOutline(p:Vec2,ring:readonly Vec2[]):number{
  let best=Infinity;
  for(let i=0;i<ring.length;i++){
    const a=ring[i]!,b=ring[(i+1)%ring.length]!;
    const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2));
    best=Math.min(best,Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t));
  }
  return best;
}

/**
 * Whether a point is inside one of these buildings or within `margin` of its outline: the same answer as trying every
 * building, but only those whose box comes near the point are tried (thousands of footprints in a town, asked at
 * every metre of pavement). Buildings by 20 m cell, each in every cell its box comes within 2 m of.
 */
export function nearBuildings(buildings:ReadonlyArray<{footprint:readonly Vec2[]}>):(p:Vec2,margin:number)=>boolean{
  const boxes=buildings.map(b=>{
    const xs=b.footprint.map(q=>q.x),zs=b.footprint.map(q=>q.z);
    return {b,x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)};
  });
  const cells=new Map<string,typeof boxes>(),cell=(x:number,z:number)=>`${Math.floor(x/20)},${Math.floor(z/20)}`;
  for(const box of boxes)for(let cx=Math.floor((box.x0-2)/20);cx<=Math.floor((box.x1+2)/20);cx++)for(let cz=Math.floor((box.z0-2)/20);cz<=Math.floor((box.z1+2)/20);cz++){
    const k=`${cx},${cz}`;(cells.get(k)??cells.set(k,[]).get(k)!).push(box);
  }
  return (p,margin)=>(margin<=2?cells.get(cell(p.x,p.z))??[]:boxes).some(({b,x0,x1,z0,z1})=>p.x>x0-margin&&p.x<x1+margin&&p.z>z0-margin&&p.z<z1+margin
    &&(insidePolygon(p,b.footprint)||distanceToOutline(p,b.footprint)<margin));
}

function hash(s:string):number{
  let h=2166136261;
  for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
  return h>>>0;
}

function paletteFor(b:Building):TownBuilding['palette']{
  const pick=<T>(list:readonly T[])=>list[hash(b.id)%list.length]!;
  switch(b.use){
    case 'church':return 'stone';
    case 'parking':return 'concrete';
    case 'school':return 'red-brick';
    case 'utility':return 'brown-brick';
    case 'residential':return pick(['red-brick','brown-brick','buff-brick','red-brick'] as const);
    case 'shop':return pick(['buff-brick','red-brick','render-white','render-cream','brown-brick','red-brick'] as const);
    default:return pick(['buff-brick','render-white','red-brick'] as const);
  }
}

export function layoutTownscape(location:Location):StreetLayout|null{
  if(location.buildings.length===0&&location.trees.length===0&&location.townLampSpacing===0&&location.furniture.length===0)return null;
  const out:StreetLayout={houses:[],strips:[],pads:[],lamps:[],trees:[],bins:[],drains:[],cars:[],colliders:[],
    town:{buildings:[],areas:[],busStops:[],obelisks:[]}};
  const town=out.town!;

  // Buildings: walls with outward normals; colliders are the walls themselves (0.3 m thick, just inside the outline).
  // (Not one mapped across a road: an arch or a building over a lane, drawn solid, would wall the road off.)
  const roadPoints=new Map<string,Vec2[]>(),cell=(x:number,z:number)=>`${Math.floor(x/10)},${Math.floor(z/10)}`;
  for(const r of location.roads)r.centreline.forEach((p,i)=>{
    const q=r.centreline[i+1];if(!q)return;
    const L=Math.hypot(q.x-p.x,q.z-p.z);
    for(let t=0;t<=L;t+=2){const k=L?t/L:0,pt={x:p.x+(q.x-p.x)*k,z:p.z+(q.z-p.z)*k},c=cell(pt.x,pt.z);(roadPoints.get(c)??roadPoints.set(c,[]).get(c)!).push(pt)}
  });
  const acrossRoad=(ring:readonly Vec2[])=>{
    const xs=ring.map(p=>p.x),zs=ring.map(p=>p.z);
    for(let cx=Math.floor(Math.min(...xs)/10);cx<=Math.floor(Math.max(...xs)/10);cx++)
      for(let cz=Math.floor(Math.min(...zs)/10);cz<=Math.floor(Math.max(...zs)/10);cz++)
        for(const pt of roadPoints.get(`${cx},${cz}`)??[])if(insidePolygon(pt,ring))return true;
    return false;
  };
  // (Each road's box, out as far as a wall it faces can be: a wall outside it does not face that road.)
  const roadBoxes=location.roads.map(road=>{
    const xs=road.centreline.map(p=>p.x),zs=road.centreline.map(p=>p.z);
    const pave=Math.max(road.pavementWidth,...(road.pavementProfile??[]).flatMap(q=>[q.left,q.right]));
    const m=roadHalfWidth(road)+pave+FACING_GAP+1;
    return {road,length:roadLength(road),x0:Math.min(...xs)-m,x1:Math.max(...xs)+m,z0:Math.min(...zs)-m,z1:Math.max(...zs)+m};
  });
  for(const b of location.buildings){
    if(acrossRoad(b.footprint))continue;
    const ring=[...b.footprint];
    const first=ring[0]!,last=ring.at(-1)!;
    if(first.x===last.x&&first.z===last.z)ring.pop();
    const walls:TownWall[]=[],gaps:number[]=[];
    for(let i=0;i<ring.length;i++){
      const a=ring[i]!,c=ring[(i+1)%ring.length]!;
      const len=Math.hypot(c.x-a.x,c.z-a.z);
      if(len<.05)continue;
      let n={x:-(c.z-a.z)/len,z:(c.x-a.x)/len};
      const mid={x:(a.x+c.x)/2,z:(a.z+c.z)/2};
      if(insidePolygon({x:mid.x+n.x*.05,z:mid.z+n.z*.05},ring))n={x:-n.x,z:-n.z};
      // Faces a road: a carriageway is in front of this wall, with at most a small forecourt between the wall and
      // the back of the pavement (pavements are widened to the shop fronts where map data shows them).
      let roadGap=Infinity;
      for(const {road,length,x0,x1,z0,z1} of roadBoxes){
        if(mid.x<x0||mid.x>x1||mid.z<z0||mid.z>z1)continue;
        const s=sampleRoad(road,mid.x,mid.z);
        // Only a road that runs past the wall (not one that ends before it).
        if(s.along<=.01||s.along>=length-.01)continue;
        const gap=s.distance-roadHalfWidth(road)-pavementWidthAt(road,s.along,Math.sign(s.lateral)||1);
        if(gap>FACING_GAP)continue;
        const p=pointAtAlong(road,s.along);
        const toRoad={x:(p.x-mid.x)/(s.distance||1),z:(p.z-mid.z)/(s.distance||1)};
        if(toRoad.x*n.x+toRoad.z*n.z>.4)roadGap=Math.min(roadGap,gap);
      }
      const facesRoad=roadGap<Infinity;
      walls.push({a,b:c,out:n,facesRoad,shopfront:b.use==='shop'&&facesRoad&&len>=2.5,front:false});
      gaps.push(roadGap);
      out.colliders.push({id:`${b.id}-wall-${i}`,kind:'building',position:{x:mid.x-n.x*WALL/2,z:mid.z-n.z*WALL/2},
        headingDeg:headingFromDirection({x:c.x-a.x,z:c.z-a.z})*180/Math.PI,size:{width:WALL,depth:len,height:b.height},occludes:true,shape:'box'});
    }
    // A home's front door is on the wall nearest its street (a corner house has one front, not two).
    if(b.use==='residential'){
      const k=gaps.reduce((best,g,i)=>g<gaps[best]!?i:best,0);
      if(gaps[k]!<Infinity&&wallLength(walls[k]!)>=2.5)walls[k]!.front=true;
    }
    town.buildings.push({id:b.id,doorColour:DOOR_COLOURS[hash(`${b.id}-door`)%DOOR_COLOURS.length]!,use:b.use,...(b.name?{name:b.name}:{}),ring,walls,height:b.height,levels:b.levels??Math.max(1,Math.round((b.height-.6)/STOREY)),
      palette:paletteFor(b),fascia:FASCIAS[hash(b.id)%FASCIAS.length]!,roof:b.roof,detail:b.detail,roofColour:hash(b.id)%3===0?'clay':'slate',y:-.02});
  }
  const inBuilding=nearBuildings(location.buildings);

  // Map trees (OSM), with a trunk collider; none on a carriageway.
  location.trees.forEach((t,i)=>{
    const surface=surfaceAt(location,t.x,t.z);
    if(surface?.kind==='carriageway')return;
    const h=hash(`tree-${i}`);
    const tree:Tree={x:t.x,z:t.z,height:7.5+(h%100)/40,radius:2.1+((h>>8)%100)/120,y:surface?surface.height:-.02};
    out.trees.push(tree);
    out.colliders.push({id:`tree-${i}`,kind:'wall',position:{x:t.x,z:t.z},headingDeg:0,size:{width:.45,depth:.45,height:4},occludes:true,shape:'box'});
  });

  for(const area of location.areas)town.areas.push({kind:area.kind,polygon:area.polygon});

  for(const [i,f] of location.furniture.entries()){
    if(f.kind!=='bus-stop')continue;
    const surface=surfaceAt(location,f.position.x,f.position.z);
    // The road beside the stop: traffic on this side runs with the kerb on its left (UK).
    const road=location.roads.reduce((best,r)=>{
      const s=sampleRoad(r,f.position.x,f.position.z);
      return !best||s.distance<best.s.distance?{r,s}:best;
    },null as null|{r:Location['roads'][number];s:ReturnType<typeof sampleRoad>})!;
    const side=Math.sign(road.s.lateral)||1;
    const dir=road.s.direction;
    // Lateral is positive to the right of the centreline direction; on that side traffic runs against it (driving on the left).
    const traffic=location.drivingSide==='left'&&side>0&&!road.r.oneway?{x:-dir.x,z:-dir.z}:dir;
    const outN={x:-dir.z*side,z:dir.x*side};
    town.busStops.push({id:`bus-stop-${i}`,x:f.position.x,z:f.position.z,heading:f.facingDeg*Math.PI/180,y:surface?surface.height:0,
      traffic,out:outN,pavement:pavementWidthAt(road.r,road.s.along,side),...(f.name?{name:f.name}:{}),...(f.indicator?{indicator:f.indicator}:{}),shelter:f.shelter});
    out.colliders.push({id:`bus-stop-${i}`,kind:'wall',position:f.position,headingDeg:0,size:{width:.2,depth:.2,height:3.1},occludes:false,shape:'box'});
  }
  for(const block of location.blocks)if(block.shape==='obelisk')
    town.obelisks.push({id:block.id,x:block.position.x,z:block.position.z,width:block.size.width,height:block.size.height,colour:block.colour??'#b9b4a8',y:0});

  // Street lights at the back of the kerb and gullies in the gutter, along every road, clear of junctions,
  // crossings, other carriageways, buildings and trees. Not mapped here: a typical spacing, not surveyed.
  const spacing=location.townLampSpacing;
  const crossingsOn=(roadId:string)=>location.crossings.filter(c=>c.roadId===roadId);
  const nearJunction=(p:Vec2,extra:number)=>location.junctions.some(j=>Math.hypot(p.x-j.position.x,p.z-j.position.z)<j.radius+extra);
  for(const road of location.roads){
    if(road.pavementWidth<=0)continue;
    const half=roadHalfWidth(road);
    const length=road.centreline.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
    const at=(along:number,lateral:number)=>{
      const p=pointAtAlong(road,along);
      return {x:p.x-p.direction.z*lateral,z:p.z+p.direction.x*lateral,direction:p.direction};
    };
    const clear=(along:number,side:number,lateral:number)=>{
      const p=at(along,side*lateral);
      const outer=at(along,side*(half+Math.min(road.pavementWidth,pavementWidthAt(road,along,side))));
      if(nearJunction(p,4))return null;
      if(onOtherCarriageway(location,p.x,p.z,road.id,.4)||onOtherCarriageway(location,outer.x,outer.z,road.id,.2))return null;
      // (Nor in any road's surface as the car meets it: a junction's mouth or a turning circle.)
      if(surfaceAt(location,p.x,p.z)?.kind==='carriageway')return null;
      if(crossingsOn(road.id).some(c=>Math.abs(c.along-along)<c.width/2+5))return null;
      if(inBuilding(p,.8)||out.trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<1.5))return null;
      return p;
    };
    if(spacing>0)for(const side of [-1,1])for(let s=side<0?6:6+spacing/2;s<length-4;s+=spacing){
      const p=clear(s,side,half+.45);
      if(!p||out.lamps.some(l=>Math.hypot(l.x-p.x,l.z-p.z)<spacing*.6))continue;
      const heading=headingFromDirection({x:p.direction.z*side,z:-p.direction.x*side});
      out.lamps.push({x:p.x,z:p.z,heading,y:road.surfaceHeight+road.kerbHeight});
      const lamp:Block={id:`lamp-${out.lamps.length}`,kind:'wall',position:{x:p.x,z:p.z},headingDeg:heading*180/Math.PI,size:{width:.3,depth:.3,height:6},occludes:true,shape:'box'};
      out.colliders.push(lamp);
    }
    if(spacing>0)for(const side of [-1,1])for(let s=8;s<length-2;s+=24){
      const p=at(s,side*(half-.25));
      if(nearJunction(p,1)||onOtherCarriageway(location,p.x,p.z,road.id,.2))continue;
      out.drains.push({x:p.x,z:p.z,heading:headingFromDirection(p.direction),y:road.surfaceHeight+.008});
    }
  }
  if(location.streetParking>0)parkAtKerbs(location,out);
  return out;
}

/** A car parked at the kerb as other road users must pass it: where, which way, and its half-size (metres). */
export interface KerbFootprint extends Vec2{heading:number;halfWidth:number;halfLength:number}
/** The cars parked at the kerbs in a layout, with their drawn sizes. */
export function kerbFootprints(layout:StreetLayout|null):KerbFootprint[]{
  return (layout?.cars??[]).filter(c=>c.id.startsWith('kerb-car')).map(c=>{
    const size=parkedSize(CAR_MODELS[c.model]);
    return {x:c.x,z:c.z,heading:c.heading,halfWidth:size.width/2,halfLength:size.length/2};
  });
}

/** The everyday cars parked on residential streets (most often the smaller ones). */

/**
 * Cars parked along residential streets (two-way, no centre line): nose to tail at the kerb with gaps, on one side of
 * each street only (the owner's call: the other side stays clear, so two cars can always meet and pass with one
 * giving way at a gap), clear of junctions, side-road mouths, crossings and their zig-zags, bus stops, lamp columns
 * and the learner's start. Deterministic for a location.
 */
/** No parking this close to another road's carriageway (metres): Highway Code rule 243, 10 m from a junction. */
const JUNCTION_CLEAR=10;

function parkAtKerbs(location:Location,out:StreetLayout):void{
  const sp=location.spawn.position;
  let seed=2166136261;
  const rand=()=>{seed=Math.imul(seed^(seed>>>15),2246822507)+0x9e3779b9>>>0;return (seed>>>8)/16777216};
  const parked:Array<{x:number;z:number;road:string;side:number;along:number;length:number}>=[];
  // Each road's outline, widened by the clearance kept from junctions (a quick test before measuring to it).
  const boxes=location.roads.map(road=>{
    const xs=road.centreline.map(p=>p.x),zs=road.centreline.map(p=>p.z),m=JUNCTION_CLEAR+roadHalfWidth(road);
    return {road,box:{x0:Math.min(...xs)-m,x1:Math.max(...xs)+m,z0:Math.min(...zs)-m,z1:Math.max(...zs)+m}};
  });
  for(const road of location.roads){
    if(road.oneway||road.lanes.count<2||road.markings.centre!=='none'||road.pavementWidth<=0)continue;
    const half=roadHalfWidth(road);
    const length=road.centreline.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
    // The side parked on: one per street, from its id (deterministic, varied from street to street).
    const parkedSide=[...road.id].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261)%2?1:-1;
    for(const side of [parkedSide]){
      for(let s=14+rand()*6;s<length-14;){
        const kerb=kerbCarModels(),model=kerb[Math.floor(rand()*kerb.length)]!;
        const size=parkedSize(CAR_MODELS[model]);
        const along=s+size.length/2;
        s+=size.length+1.2+(rand()<.3?4+rand()*8:0);
        if(rand()>location.streetParking)continue;
        const p=pointAtAlong(road,along);
        const lateral=half-size.width/2+.05;
        const c={x:p.x-p.direction.z*side*lateral,z:p.z+p.direction.x*side*lateral};
        const ends=[-1,1].map(k=>pointAtAlong(road,along+k*(size.length/2+1)));
        const kerbOf=(q:{x:number;z:number;direction:Vec2})=>({x:q.x-q.direction.z*side*(half+.3),z:q.z+q.direction.x*side*(half+.3)});
        if(location.junctions.some(j=>Math.hypot(c.x-j.position.x,c.z-j.position.z)<j.radius+14))continue;
        // Not on a bend (rule 243): the road turns little over the car's length and a few metres either side.
        const [d0,d1]=[-1,1].map(k=>pointAtAlong(road,along+k*(size.length/2+5)).direction);
        if(d0!.x*d1!.x+d0!.z*d1!.z<Math.cos(.3))continue;
        // Nor just round a sharp corner, where a car coming round has not straightened up yet.
        const [e0,e1]=[-1,1].map(k=>pointAtAlong(road,along+k*(size.length/2+14)).direction);
        if(e0!.x*e1!.x+e0!.z*e1!.z<Math.cos(.6))continue;
        // Nor across a kink in the kerb (a straight car there sticks out into the road at one end).
        {
          const h=headingFromDirection(p.direction),fx=Math.sin(h),fz=-Math.cos(h),rx=Math.cos(h),rz=Math.sin(h);
          const inner=Math.min(...[-1,1].flatMap(a=>[-1,1].map(b=>Math.abs(sampleRoad(road,c.x+fx*a*size.length/2+rx*b*size.width/2,c.z+fz*a*size.length/2+rz*b*size.width/2).lateral))));
          if(half-inner>size.width+.25)continue;
        }
        // Not within 10 m of a junction (Highway Code rule 243), whether or not the junction is listed: no other
        // road's carriageway within 10 m of either end of the car. (A car turning in has straightened up by then.)
        if(boxes.some(({road:o,box})=>o.id!==road.id&&ends.some(q=>q.x>box.x0&&q.x<box.x1&&q.z>box.z0&&q.z<box.z1&&sampleRoad(o,q.x,q.z).distance-roadHalfWidth(o)<JUNCTION_CLEAR-1)))continue;
        // A side road joins here (its carriageway at the kerb, or just ahead or behind): keep the mouth clear.
        if([p,...ends].some(q=>{const k=kerbOf(q);return onOtherCarriageway(location,k.x,k.z,road.id,6)}))continue;
        if(location.crossings.some(x=>x.roadId===road.id&&Math.abs(x.along-along)<(x.kind==='zebra'?x.zigzagMarks*2+8:14)))continue;
        if(out.town?.busStops.some(b=>Math.hypot(b.x-c.x,b.z-c.z)<22))continue;
        if(out.lamps.some(l=>Math.hypot(l.x-c.x,l.z-c.z)<size.length/2+.3))continue;
        if(Math.hypot(c.x-sp.x,c.z-sp.z)<30)continue;
        if(location.blocks.some(b=>Math.hypot(b.position.x-c.x,b.position.z-c.z)<12))continue;
        // Not overlapping another parked car (one on a crossing street's kerb, at a corner).
        if(parked.some(q=>Math.hypot(q.x-c.x,q.z-c.z)<size.length+.6))continue;
        const heading=headingFromDirection(side<0?p.direction:{x:-p.direction.x,z:-p.direction.z});
        parked.push({...c,road:road.id,side,along,length:size.length});
        const id=`kerb-car-${out.cars.length}`;
        out.cars.push({id,model,colour:PARKED_CAR_COLOURS[Math.floor(rand()*PARKED_CAR_COLOURS.length)]!,x:c.x,z:c.z,heading,y:road.surfaceHeight+.006});
        out.colliders.push({id,kind:'parked-vehicle',position:c,headingDeg:heading*180/Math.PI,size:{width:size.width*.9,depth:size.length,height:size.height},occludes:true,shape:'box'});
      }
    }
  }
}
