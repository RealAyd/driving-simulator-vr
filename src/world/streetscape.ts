import {headingFromDirection,type Block,type Frontage,type Location,type Road,type Vec2} from '../contracts';
import {CAR_MODELS,PARKED_CAR_COLOURS,type CarModelId} from '../assets/carSpecs';
import {pointAtAlong,roadHalfWidth,sampleRoad} from './roadGeometry';

/**
 * Residential streetscape layout: houses from a few reusable variants, front
 * and back gardens, boundaries, paths, drives, street lights, gullies, trees,
 * bins and cars on drives. Pure data (no engine), so the same layout gives the
 * scene geometry (streetscapeMesh.ts) and the collision boxes, and can be tested.
 */

/** A house's ground frame: origin at the middle of its front wall; f points out of the front (to the road), a across it. */
export interface Frame{ox:number;oz:number;fx:number;fz:number;ax:number;az:number;y:number}
export const framePoint=(fr:Frame,u:number,v:number):Vec2=>({x:fr.ox+fr.ax*u+fr.fx*v,z:fr.oz+fr.az*u+fr.fz*v});
const frameHeading=(fr:Frame)=>headingFromDirection({x:fr.fx,z:fr.fz});

export type HouseStyle='terrace'|'semi'|'semi-bay'|'detached';
export type Palette='red-brick'|'brown-brick'|'buff-brick'|'render-cream'|'render-white';
export type BoundaryKind='wall'|'hedge'|'fence';

export interface HouseUnit{
  /** Left edge (u) and width of this dwelling. */
  u0:number;
  width:number;
  door:'left'|'right';
  doorColour:string;
}
export interface House{
  id:string;
  style:HouseStyle;
  palette:Palette;
  roofColour:'slate'|'clay';
  frame:Frame;
  width:number;
  depth:number;
  units:HouseUnit[];
  /** Ground-floor bay windows (semi-bay). */
  bays:boolean;
}
/** A straight wall, hedge or fence between two ground points. */
export interface Strip{kind:BoundaryKind;a:Vec2;b:Vec2;height:number;thickness:number;y:number}
/** A flat surface (path or drive) as a quadrilateral, corners in order. */
export interface Pad{kind:'path'|'drive';corners:[Vec2,Vec2,Vec2,Vec2];y:number}
export interface Lamp{x:number;z:number;heading:number;y:number}
export interface Tree{x:number;z:number;height:number;radius:number;y:number}
export interface Bin{x:number;z:number;heading:number;colour:string;y:number}
export interface Drain{x:number;z:number;heading:number;y:number}
export interface DriveCar{id:string;model:CarModelId;colour:string;x:number;z:number;heading:number;y:number}

export interface StreetLayout{
  houses:House[];
  strips:Strip[];
  pads:Pad[];
  lamps:Lamp[];
  trees:Tree[];
  bins:Bin[];
  drains:Drain[];
  cars:DriveCar[];
  /** Simple collision boxes matching what is drawn (houses, bays, boundaries, lamp columns, cars on drives). */
  colliders:Block[];
}

/** Variant dimensions (metres). */
export const STYLE={
  terrace:{units:4,unitWidth:4.8,depth:8,gap:1.2},
  semi:{units:2,unitWidth:5.6,depth:8.4,gap:3.2},
  'semi-bay':{units:2,unitWidth:5.6,depth:8.4,gap:3.2},
  detached:{units:1,unitWidth:8.6,depth:8.6,gap:3.4}
} as const;
export const EAVES=5.3;
export const BAY={width:2.5,depth:.75,height:2.85};
const DOOR_COLOURS=['#f2f1ec','#1d2024','#26412f','#1f2b47','#7d1d17','#5b6168','#3d5f6e'];
const BIN_COLOURS=['#2a2c2f','#22432a','#1f3150','#4a3524'];
const BOUNDARY_HEIGHT={wall:.75,hedge:1.05,fence:.95} as const;
const THICKNESS={wall:.24,hedge:.7,fence:.06} as const;
/** Distance from the back of the pavement to a front boundary's centre line, so it stands inside the garden. */
const inset=(kind:BoundaryKind)=>THICKNESS[kind]/2+.08;

/** Small deterministic PRNG (mulberry32). */
function random(seed:number){
  let a=seed>>>0;
  return ()=>{
    a=(a+0x6d2b79f5)>>>0;
    let t=a;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

/** Point and smoothed travel direction at `along` (chord over ±6 m so houses do not kink at polyline corners). */
function roadPoint(road:Road,total:number,along:number){
  const p=pointAtAlong(road,Math.max(0,Math.min(total,along)));
  const a=pointAtAlong(road,Math.max(0,along-6)),b=pointAtAlong(road,Math.min(total,along+6));
  const l=Math.hypot(b.x-a.x,b.z-a.z)||1;
  const d={x:(b.x-a.x)/l,z:(b.z-a.z)/l};
  return {x:p.x,z:p.z,d,r:{x:-d.z,z:d.x}};
}

const roadLength=(road:Road)=>road.centreline.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);

function box(id:string,kind:Block['kind'],c:Vec2,heading:number,width:number,depth:number,height:number):Block{
  return {id,kind,position:{x:c.x,z:c.z},headingDeg:heading*180/Math.PI,size:{width,depth,height},occludes:kind!=='hedge'};
}

export function layoutStreetscape(location:Location):StreetLayout|null{
  const spec=location.streetscape;
  if(!spec)return null;
  const road=location.roads.find(r=>r.id===spec.roadId)!;
  const total=roadLength(road);
  const half=roadHalfWidth(road);
  const kerbTop=road.surfaceHeight+road.kerbHeight;
  // Gardens are at ground level (the grass ground plane, just below the road), a step down from the pavement.
  const ground=road.surfaceHeight-.02;
  const pavementBack=half+road.pavementWidth;
  const out:StreetLayout={houses:[],strips:[],pads:[],lamps:[],trees:[],bins:[],drains:[],cars:[],colliders:[]};
  const rand=random(spec.seed*7919+13);
  const pick=<T>(list:readonly T[])=>list[Math.floor(rand()*list.length)]!;

  // Kerbside spans (per side) that must stay free of drives: parked cars and given spots.
  const kerbside:Array<{side:number;from:number;to:number}>=[];
  for(const b of location.blocks)if(b.kind==='parked-vehicle'){
    const s=sampleRoad(road,b.position.x,b.position.z);
    if(s.distance<=half+.5)kerbside.push({side:Math.sign(s.lateral),from:s.along-b.size.depth/2-1,to:s.along+b.size.depth/2+1});
  }
  for(const p of spec.noDrivesAt){
    const s=sampleRoad(road,p.x,p.z);
    kerbside.push({side:Math.sign(s.lateral),from:s.along-4,to:s.along+4});
  }
  const driveAllowed=(side:number,from:number,to:number)=>!kerbside.some(k=>k.side===side&&k.to>from&&k.from<to);
  /** Along-spans of openings in the front boundary (paths, drives) per side, to keep lamps clear of them. */
  const openings:Array<{side:number;from:number;to:number}>=[];

  /** Ground point at `along`, `lateral` metres from the centreline on `side` (−1 left, +1 right of travel). */
  const at=(along:number,side:number,lateral:number):Vec2=>{
    const p=roadPoint(road,total,along);
    return {x:p.x+p.r.x*side*lateral,z:p.z+p.r.z*side*lateral};
  };
  const strip=(kind:BoundaryKind,a:Vec2,b:Vec2,id:string,height:number=BOUNDARY_HEIGHT[kind])=>{
    const thickness=THICKNESS[kind];
    out.strips.push({kind,a,b,height,thickness,y:ground});
    const l=Math.hypot(b.x-a.x,b.z-a.z);
    if(l<.05)return;
    out.colliders.push(box(id,kind==='hedge'?'hedge':'wall',{x:(a.x+b.x)/2,z:(a.z+b.z)/2},headingFromDirection({x:b.x-a.x,z:b.z-a.z}),thickness,l,height));
  };

  spec.frontages.forEach((frontage:Frontage,fi)=>{
    const side=frontage.side==='left'?-1:1;
    const back=pavementBack+frontage.setback;
    // Plan the row first: styles in order; near the end, a shorter terrace or a detached house instead of a pair.
    const plan:Array<{style:HouseStyle;units:number}>=[];
    for(let used=0;;){
      let style:HouseStyle=frontage.styles[plan.length%frontage.styles.length]!;
      let unitCount:number=STYLE[style].units;
      const room=frontage.to-frontage.from-used;
      if(unitCount*STYLE[style].unitWidth>room){
        if(style==='terrace')unitCount=Math.min(unitCount,Math.floor(room/STYLE.terrace.unitWidth));
        else if(STYLE.detached.unitWidth<=room){style='detached';unitCount=1}
        if(unitCount<(style==='terrace'?2:1)||unitCount*STYLE[style].unitWidth>room)break;
      }
      plan.push({style,units:unitCount});
      used+=unitCount*STYLE[style].unitWidth+STYLE[style].gap;
    }
    // Spread what is left over the gaps between houses (wider drives and alleys), so the row reaches its end.
    const planned=plan.reduce((n,p,i)=>n+p.units*STYLE[p.style].unitWidth+(i<plan.length-1?STYLE[p.style].gap:0),0);
    const extraGap=plan.length>1?Math.min(1.6,(frontage.to-frontage.from-planned)/(plan.length-1)):0;
    let cursor=frontage.from,k=0;
    const plots:Array<{from:number;to:number;gapTo:number}>=[];
    for(const step of plan){
      const style=step.style;
      const dims={...STYLE[style],units:step.units,gap:STYLE[style].gap+(k<plan.length-1?extraGap:0)};
      const width=dims.units*dims.unitWidth;
      const centre=cursor+width/2;
      const p=roadPoint(road,total,centre);
      // Front faces the road: f = towards the centreline.
      const f={x:-p.r.x*side,z:-p.r.z*side};
      const origin=at(centre,side,back);
      const frame:Frame={ox:origin.x,oz:origin.z,fx:f.x,fz:f.z,ax:-f.z,az:f.x,y:ground};
      const id=`f${fi}-h${k}`;
      const palette=frontage.palettes[k%frontage.palettes.length]!;
      const units:HouseUnit[]=[];
      for(let i=0;i<dims.units;i++){
        // Semis have doors on the outer sides; terraces alternate in pairs; detached in the middle-left.
        const door:'left'|'right'=style==='terrace'?(i%2===0?'left':'right'):dims.units===2?(i===0?'left':'right'):'left';
        units.push({u0:-width/2+i*dims.unitWidth,width:dims.unitWidth,door,doorColour:pick(DOOR_COLOURS)});
      }
      const house:House={id,style,palette,roofColour:palette.startsWith('render')||style==='terrace'?'slate':(k+fi)%2===0?'clay':'slate',frame,width,depth:dims.depth,units,bays:style==='semi-bay'};
      out.houses.push(house);
      const heading=frameHeading(frame);
      out.colliders.push(box(`${id}-house`,'building',framePoint(frame,0,-dims.depth/2),heading,width,dims.depth,EAVES+3));

      // Front garden: boundary along the pavement with a gap for each path; side boundaries between gardens.
      const kind:BoundaryKind=style==='terrace'?pick(['wall','wall','fence'] as const):pick(['wall','hedge','hedge','fence'] as const);
      const setback=frontage.setback;
      // Along the pavement, positions follow the road exactly (houses are straight; a road may curve).
      const kerbPoint=(u:number,extra:number)=>at(centre+side*u,side,pavementBack+extra);
      const doorU=(unit:HouseUnit)=>unit.door==='left'?unit.u0+.95:unit.u0+unit.width-.95;
      let u=-width/2;
      units.forEach((unit,i)=>{
        const du=doorU(unit);
        strip(kind,kerbPoint(u,inset(kind)),kerbPoint(du-.55,inset(kind)),`${id}-u${i}-front-a`);
        strip(kind,kerbPoint(du+.55,inset(kind)),kerbPoint(unit.u0+unit.width,inset(kind)),`${id}-u${i}-front-b`);
        u=unit.u0+unit.width;
        out.pads.push({kind:'path',corners:[kerbPoint(du-.5,0),kerbPoint(du+.5,0),framePoint(frame,du+.5,0),framePoint(frame,du-.5,0)],y:ground+.008});
        const pathAlong=sampleRoad(road,framePoint(frame,du,setback).x,framePoint(frame,du,setback).z).along;
        openings.push({side,from:pathAlong-.8,to:pathAlong+.8});
        if(i>0)strip(style==='terrace'?'wall':'fence',framePoint(frame,unit.u0,setback-.3),framePoint(frame,unit.u0,.1),`${id}-u${i}-side`,.9);
        if(rand()<.35){
          const bu=du+(unit.door==='left'?.9:-.9);
          const c=framePoint(frame,bu,setback-.75);
          out.bins.push({x:c.x,z:c.z,heading:heading+Math.PI,colour:pick(BIN_COLOURS),y:ground});
        }
        if(rand()<.08)out.bins.push({...framePoint(frame,doorU(unit)+(unit.door==='left'?1.6:-1.6),setback-.75),heading:heading+Math.PI,colour:pick(BIN_COLOURS),y:ground});
      });
      // Outer side boundaries of the front garden (the drive or alley is beside them).
      const sideKind:BoundaryKind=style==='terrace'?'wall':kind==='hedge'?'hedge':'fence';
      const su=width/2-THICKNESS[sideKind]/2;
      strip(sideKind,framePoint(frame,-su,setback-.3),framePoint(frame,-su,.1),`${id}-side-l`,.9);
      strip(sideKind,framePoint(frame,su,setback-.3),framePoint(frame,su,.1),`${id}-side-r`,.9);

      // Back garden: fences between gardens up to the rear fence.
      const rear=-(dims.depth+frontage.backGarden);
      for(let i=0;i<=dims.units;i++){
        const fu=-width/2+i*dims.unitWidth;
        strip('fence',framePoint(frame,fu,-dims.depth),framePoint(frame,fu,rear),`${id}-back-${i}`,1.8);
      }
      // Trees: some front gardens, more back gardens (they show above the roofs).
      if(style!=='terrace'&&rand()<.3){
        const unit=pick(units);
        const tu=unit.door==='left'?unit.u0+unit.width-1.8:unit.u0+1.8;
        const c=framePoint(frame,tu,setback*.5);
        out.trees.push({...c,height:5.5+rand()*2,radius:1.6+rand()*.6,y:ground});
      }
      if(rand()<.55){
        const c=framePoint(frame,(rand()-.5)*width*.8,rear+3+rand()*3);
        out.trees.push({...c,height:8+rand()*3,radius:2.4+rand()*.8,y:ground});
      }

      plots.push({from:cursor,to:cursor+width,gapTo:cursor+width+dims.gap});
      // The gap beside the house: a drive (semis, detached) or an alley (terraces), closed by a tall gate at the back.
      const g0=cursor+width,g1=cursor+width+dims.gap;
      if(g1<=frontage.to){
        const gateA=at(g0+.05,side,back+1.5),gateB=at(g1-.05,side,back+1.5);
        strip('fence',gateA,gateB,`${id}-gate`,1.8);
        if(style!=='terrace'&&driveAllowed(side,g0-.5,g1+.5)){
          out.pads.push({kind:'drive',corners:[at(g0+.1,side,pavementBack),at(g1-.1,side,pavementBack),at(g1-.1,side,back+1.5),at(g0+.1,side,back+1.5)],y:ground+.006});
          openings.push({side,from:g0-.3,to:g1+.3});
          if(rand()<spec.carsOnDrives){
            const model=pick(['quaternius-normal-car-1','quaternius-normal-car-2','quaternius-suv','quaternius-normal-car-2'] as const);
            const car=CAR_MODELS[model];
            const centre=at((g0+g1)/2,side,pavementBack+.6+car.length/2);
            // Driven in forwards: facing the house.
            const carHeading=headingFromDirection({x:-f.x,z:-f.z});
            const carId=`${id}-drive-car`;
            out.cars.push({id:carId,model,colour:pick(PARKED_CAR_COLOURS),x:centre.x,z:centre.z,heading:carHeading,y:ground+.006});
            out.colliders.push(box(carId,'parked-vehicle',centre,carHeading,car.width,car.length,car.height));
          }
        }else{
          // No drive here: the front boundary continues across the gap.
          strip(kind,at(g0,side,pavementBack+inset(kind)),at(g1,side,pavementBack+inset(kind)),`${id}-gap-front`);
        }
      }
      cursor=g1;k++;
    }
    // The fence at the end of the back gardens (the gardens themselves are the grass ground).
    const first=plots[0],last=plots.at(-1);
    if(!first||!last)return;
    const rearLateral=back+STYLE[frontage.styles[0]!].depth+frontage.backGarden;
    const end=Math.min(last.gapTo,frontage.to);
    for(let s=first.from;s<end;s+=8){
      const s1=Math.min(end,s+8);
      strip('fence',at(s,side,rearLateral),at(s1,side,rearLateral),`f${fi}-rear-${s.toFixed(0)}`,1.8);
    }
    // Ends of the frontage: close the gardens.
    strip('fence',at(first.from,side,pavementBack+.3),at(first.from,side,rearLateral),`f${fi}-end-a`,1.8);
    strip('fence',at(end,side,pavementBack+.3),at(end,side,rearLateral),`f${fi}-end-b`,1.8);
  });

  // Street lights at the kerb edge, alternating sides, clear of paths and drives.
  if(spec.lampSpacing>0){
    let side=-1;
    for(let s=spec.frontages.reduce((m,f)=>Math.min(m,f.from),Infinity)+6;s<total-4;s+=spec.lampSpacing){
      let along=s;
      for(let tries=0;tries<6&&openings.some(o=>o.side===side&&along>o.from-.6&&along<o.to+.6);tries++)along+=1.5;
      const c=at(along,side,half+.45);
      const p=roadPoint(road,total,along);
      const heading=headingFromDirection({x:-p.r.x*side,z:-p.r.z*side});
      out.lamps.push({x:c.x,z:c.z,heading,y:kerbTop});
      out.colliders.push(box(`lamp-${out.lamps.length}`,'wall',c,heading,.3,.3,6));
      side=-side;
    }
  }
  // Road gullies in the gutter.
  if(spec.drainSpacing>0)for(const side of [-1,1])for(let s=spec.drainSpacing*(side<0?.5:1);s<total;s+=spec.drainSpacing){
    const c=at(s,side,half-.25);
    const p=roadPoint(road,total,s);
    out.drains.push({x:c.x,z:c.z,heading:headingFromDirection(p.d),y:road.surfaceHeight+.008});
  }
  return out;
}
