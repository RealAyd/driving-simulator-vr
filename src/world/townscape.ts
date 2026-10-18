import {headingFromDirection,type Block,type Building,type Location,type Vec2} from '../contracts';
import type {Palette,StreetLayout,Tree} from './streetscape';
import {onOtherCarriageway,pavementWidthAt,pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from './roadGeometry';

/**
 * Town-centre scenery from map data: building outlines become brick or
 * render walls with windows on each storey, a flat roof behind a parapet and,
 * where a business is mapped in the building, shopfronts on the walls that
 * face a road (generic glazing and a plain fascia: no names or signs). Map
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
  roof:'flat'|'pitched';
  detail:'full'|'low';
  roofColour:'slate'|'clay';
  y:number;
}
export interface TownArea{kind:'grass'|'parking'|'garden'|'green'|'access'|'street';polygon:Vec2[]}
export interface BusStop{x:number;z:number;heading:number;y:number}
export interface Obelisk{id:string;x:number;z:number;width:number;height:number;colour:string;y:number}
export interface TownLayout{buildings:TownBuilding[];areas:TownArea[];busStops:BusStop[];obelisks:Obelisk[]}

const STOREY=3.2;
const roadLength=(road:Location['roads'][number])=>road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
const WALL=.3;
/** Furthest a wall can be behind the pavement (widened to shop fronts where mapped) and still count as facing the road, metres. */
const FACING_GAP=6;
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
  for(const b of location.buildings){
    const ring=[...b.footprint];
    const first=ring[0]!,last=ring.at(-1)!;
    if(first.x===last.x&&first.z===last.z)ring.pop();
    const walls:TownWall[]=[];
    for(let i=0;i<ring.length;i++){
      const a=ring[i]!,c=ring[(i+1)%ring.length]!;
      const len=Math.hypot(c.x-a.x,c.z-a.z);
      if(len<.05)continue;
      let n={x:-(c.z-a.z)/len,z:(c.x-a.x)/len};
      const mid={x:(a.x+c.x)/2,z:(a.z+c.z)/2};
      if(insidePolygon({x:mid.x+n.x*.05,z:mid.z+n.z*.05},ring))n={x:-n.x,z:-n.z};
      // Faces a road: a carriageway is in front of this wall, with at most a small forecourt between the wall and
      // the back of the pavement (pavements are widened to the shop fronts where map data shows them).
      const facesRoad=location.roads.some(road=>{
        const s=sampleRoad(road,mid.x,mid.z);
        // Only a road that runs past the wall (not one that ends before it).
        if(s.along<=.01||s.along>=roadLength(road)-.01)return false;
        const gap=s.distance-roadHalfWidth(road)-pavementWidthAt(road,s.along,Math.sign(s.lateral)||1);
        if(gap>FACING_GAP)return false;
        const p=pointAtAlong(road,s.along);
        const toRoad={x:(p.x-mid.x)/(s.distance||1),z:(p.z-mid.z)/(s.distance||1)};
        return toRoad.x*n.x+toRoad.z*n.z>.4;
      });
      walls.push({a,b:c,out:n,facesRoad,shopfront:b.use==='shop'&&facesRoad&&len>=2.5});
      out.colliders.push({id:`${b.id}-wall-${i}`,kind:'building',position:{x:mid.x-n.x*WALL/2,z:mid.z-n.z*WALL/2},
        headingDeg:headingFromDirection({x:c.x-a.x,z:c.z-a.z})*180/Math.PI,size:{width:WALL,depth:len,height:b.height},occludes:true,shape:'box'});
    }
    town.buildings.push({id:b.id,use:b.use,ring,walls,height:b.height,levels:b.levels??Math.max(1,Math.round((b.height-.6)/STOREY)),
      palette:paletteFor(b),fascia:FASCIAS[hash(b.id)%FASCIAS.length]!,roof:b.roof,detail:b.detail,roofColour:hash(b.id)%3===0?'clay':'slate',y:-.02});
  }
  const inBuilding=(p:Vec2,margin:number)=>location.buildings.some(b=>insidePolygon(p,b.footprint)||distanceToOutline(p,b.footprint)<margin);

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
    town.busStops.push({x:f.position.x,z:f.position.z,heading:f.facingDeg*Math.PI/180,y:surface?surface.height:0});
    out.colliders.push({id:`bus-stop-${i}`,kind:'wall',position:f.position,headingDeg:0,size:{width:.2,depth:.2,height:2.9},occludes:false,shape:'box'});
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
  return out;
}
