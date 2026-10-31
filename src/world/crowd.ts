import type {Location,Vec2} from '../contracts';
import type {StreetLayout} from './streetscape';
import type {SignPlan} from './signage';
import {nearBuildings} from './townscape';
import {onOtherCarriageway,pavementWidthAt,pointAtAlong,roadHalfWidth,surfaceAt} from './roadGeometry';

/**
 * Background people: a modest number walking along pavements or waiting at
 * bus stops. Scenery only: they never step off the pavement, have no
 * colliders, are not road users and nothing assesses them. They are kept
 * away from assessed hazards (crossings, the learner's start and the
 * nearside behind it, where a cyclist is watched for in the mirrors), and
 * their clothes avoid the paint colours the mirror checks look for.
 * Pure data and pure functions of simulated time, so tests can check every
 * position they can reach.
 */

export type RGB=[number,number,number];
export interface Appearance{top:RGB;legs:RGB;skin:RGB;hair:RGB;height:number;build:number;coat:number;hair_style:0|1|2}
export interface FigurePose{x:number;y:number;z:number;heading:number;stride:number;walking:boolean;
  /** Standing and looking along the road (for example before crossing, or for the bus). */
  look?:'left'|'right'}
export interface Walker{kind:'walker';id:string;a:Vec2;b:Vec2;y:number;speed:number;offset:number;look:Appearance}
export interface Stander{kind:'stander';id:string;x:number;z:number;y:number;heading:number;look:Appearance}
export type Person=Walker|Stander;

// Muted clothing: no yellow, purple or saturated red or blue (the colours the mirror checks look for).
const TOPS:RGB[]=[[.2,.24,.3],[.14,.15,.17],[.82,.82,.8],[.72,.67,.57],[.33,.37,.27],[.18,.32,.26],[.4,.18,.2],[.5,.52,.55],[.15,.36,.4],[.58,.42,.32],[.26,.22,.2]];
const LEGS:RGB[]=[[.16,.17,.2],[.25,.31,.42],[.3,.3,.32],[.45,.42,.36],[.12,.12,.13],[.34,.28,.24]];
const SKIN:RGB[]=[[.87,.7,.6],[.8,.6,.48],[.62,.44,.33],[.45,.31,.22],[.3,.2,.15],[.9,.76,.66]];
// No blond: in shade it reads as the cyclist's yellow to the mirror check.
const HAIR:RGB[]=[[.1,.08,.07],[.25,.17,.11],[.4,.28,.19],[.58,.57,.55],[.16,.12,.1]];

function random(seed:number){
  let a=seed>>>0||1;
  return ()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296};
}

export function appearance(seed:number):Appearance{
  const r=random(seed*2654435761);
  const pick=<T>(l:readonly T[])=>l[Math.floor(r()*l.length)]!;
  return {top:pick(TOPS),legs:pick(LEGS),skin:pick(SKIN),hair:pick(HAIR),height:1.58+r()*.28,build:.9+r()*.25,coat:r()<.35?r()*.3:0,hair_style:Math.floor(r()*3) as 0|1|2};
}

/** Seconds a walker spends at each end of their stretch, turning round: brief, and not looking up and down the road
 * (standing at the kerb looking about reads as waiting to cross, and leaves a driver unsure). */
const pauseOf=(p:Walker)=>TURN+.3+(p.offset*7.1%1.2);
/** Seconds to turn round at the end of a stretch. */
const TURN=1.2;

/**
 * Where a person is at simulated time t. Walkers walk their stretch of pavement, stop at the end, look about,
 * turn round over a second or so and walk back (as someone waiting for a friend or a shop to open would).
 */
export function personPose(p:Person,t:number):FigurePose{
  // People waiting look along the road now and then (2 s in every 9 s), each at their own moment.
  if(p.kind==='stander'){const c=((t+p.x*7.3)%9+9)%9;return {x:p.x,y:p.y,z:p.z,heading:p.heading,stride:0,walking:false,...(c<2?{look:c<1?'right' as const:'left' as const}:{})}}
  const dx=p.b.x-p.a.x,dz=p.b.z-p.a.z,L=Math.hypot(dx,dz)||1;
  const ux=dx/L,uz=dz/L;
  const walk=L/p.speed,pause=pauseOf(p),leg=walk+pause,cycle=2*leg;
  const time=p.offset/p.speed+t;
  const c=((time%cycle)+cycle)%cycle,laps=Math.floor(time/cycle);
  const back=c>=leg,inLeg=back?c-leg:c;
  const walking=inLeg<walk;
  const k=walking?inLeg*p.speed:L;
  const along=back?L-k:k;
  const forward=Math.atan2(ux,-uz),reverse=Math.atan2(-ux,uz);
  // Turning at the end of the pause, towards the way back.
  let heading=back?reverse:forward;
  if(!walking&&inLeg>leg-TURN){
    const f=(inLeg-(leg-TURN))/TURN,e=f*f*(3-2*f);
    heading=(back?reverse:forward)+Math.PI*e;
  }
  const stride=(laps*2+(back?1:0))*L+k;
  return {x:p.a.x+ux*along,y:p.y,z:p.a.z+uz*along,heading,stride,walking};
}

export interface CrowdOptions{
  walkers:number;seed:number;
  /** Keep the nearside pavement behind the start clear (a learner moving off from the kerb checks it for cyclists). */
  clearNearsideBehindStart:boolean;
}
/** How many people each kind of place gets (a modest number: they are scenery). */
export function crowdOptions(location:Location):CrowdOptions{
  // Generated areas (a whole test centre's streets) need many more to feel lived in wherever the car goes.
  if(location.streetParking>0)return {walkers:110,seed:31,clearNearsideBehindStart:false};
  return location.placeName?{walkers:28,seed:31,clearNearsideBehindStart:false}:{walkers:9,seed:17,clearNearsideBehindStart:true};
}

export function layoutCrowd(location:Location,layout:StreetLayout|null,signs:SignPlan,options=crowdOptions(location)):Person[]{
  const people:Person[]=[];
  const rand=random(options.seed);
  // Obstacles on pavements: lamp columns, trees, sign posts, bus stop poles and shelters, bins.
  const points:Array<{x:number;z:number;r:number}>=[
    ...(layout?.lamps??[]).map(l=>({x:l.x,z:l.z,r:.6})),
    ...(layout?.trees??[]).map(t=>({x:t.x,z:t.z,r:.9})),
    ...(layout?.bins??[]).map(b=>({x:b.x,z:b.z,r:.8})),
    ...(layout?.town?.busStops??[]).map(s=>({x:s.x,z:s.z,r:.6})),
    ...signs.panels.flatMap(p=>p.posts.map(q=>({x:q.x,z:q.z,r:.5})))
  ];
  // Obstacles by 4 m grid cell (thousands of lamps and trees in a city).
  const cell=(x:number,z:number)=>`${Math.floor(x/4)},${Math.floor(z/4)}`;
  const grid=new Map<string,typeof points>();
  for(const o of points){const k=cell(o.x,o.z);(grid.get(k)??grid.set(k,[]).get(k)!).push(o)}
  const blocked=(p:Vec2,margin:number)=>{
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)
      if(grid.get(cell(p.x+4*i,p.z+4*j))?.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<o.r+margin-.3))return true;
    return false;
  };
  const inShelter=(p:Vec2,margin:number)=>signs.shelters.some(s=>{
    const dx=p.x-s.x,dz=p.z-s.z;
    return Math.abs(dx*s.axis.x+dz*s.axis.z)<s.length/2+margin&&Math.abs(dx*s.back.x+dz*s.back.z)<s.depth/2+margin;
  });
  const nearBuilding=nearBuildings(location.buildings);
  // Kept clear of assessed hazards: crossings (zebra crossings widely), parked vans that hide a pedestrian,
  // and the learner's start (the nearside behind it is where a cyclist is checked for in the mirrors).
  const crossingsAt=location.crossings.map(c=>{
    const at=pointAtAlong(location.roads.find(r=>r.id===c.roadId)!,c.along);
    return {x:at.x,z:at.z,r:c.kind==='zebra'?45:8};
  });
  const excluded=(p:Vec2)=>{
    for(const c of crossingsAt)if(Math.hypot(p.x-c.x,p.z-c.z)<c.r)return true;
    if(location.blocks.some(b=>b.vehicleModel&&Math.hypot(p.x-b.position.x,p.z-b.position.z)<20))return true;
    const sp=location.spawn,h=sp.headingDeg*Math.PI/180;
    const f={x:Math.sin(h),z:-Math.cos(h)};
    const dx=p.x-sp.position.x,dz=p.z-sp.position.z;
    const ahead=dx*f.x+dz*f.z,lateralLeft=dx*f.z-dz*f.x;
    if(Math.hypot(dx,dz)<6)return true;
    if(options.clearNearsideBehindStart&&lateralLeft>0&&ahead>-70&&ahead<15&&lateralLeft<12)return true;
    return false;
  };
  const clear=(p:Vec2,margin=.55)=>{
    const s=surfaceAt(location,p.x,p.z);
    if(s?.kind!=='pavement')return false;
    if(location.junctions.some(j=>Math.hypot(p.x-j.position.x,p.z-j.position.z)<j.radius+3))return false;
    if(onOtherCarriageway(location,p.x,p.z,s.roadId,.8))return false;
    if(blocked(p,margin))return false;
    return !inShelter(p,.45)&&!nearBuilding(p,.45)&&!excluded(p);
  };

  // Waiting at bus stops: one in or by each shelter and one by the pole, looking up the road for the bus.
  for(const s of layout?.town?.busStops??[]){
    const shelter=signs.shelters.find(x=>x.id===`${s.id}-shelter`);
    const facing=Math.atan2(-s.traffic.x,s.traffic.z);
    const spots:Array<{x:number;z:number;heading:number}>=[];
    if(shelter)spots.push({x:shelter.x-shelter.back.x*(shelter.depth/2+.45)+shelter.axis.x*.6,z:shelter.z-shelter.back.z*(shelter.depth/2+.45)+shelter.axis.z*.6,heading:facing});
    spots.push({x:s.x+s.out.x*.7-s.traffic.x*1.2,z:s.z+s.out.z*.7-s.traffic.z*1.2,heading:facing});
    for(const spot of spots){
      const surface=surfaceAt(location,spot.x,spot.z);
      if(surface?.kind!=='pavement'||excluded(spot)||nearBuilding(spot,.4))continue;
      people.push({kind:'stander',id:`waiting-${people.length}`,...spot,y:surface.height,look:appearance(people.length*7+3)});
    }
  }

  // Walkers: candidate stretches of pavement along every road, each side, one person per stretch.
  const candidates:Array<{a:Vec2;b:Vec2;y:number}>=[];
  for(const road of location.roads){
    if(road.pavementWidth<1.5)continue;
    const length=road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
    const half=roadHalfWidth(road);
    for(const side of [-1,1])for(let start=4;start+14<length-4;start+=26){
      const pw=pavementWidthAt(road,start,side);
      const lateral=half+(pw>4.5&&rand()<.5?pw-1.2:Math.min(pw*.62,2.4));
      const at=(along:number)=>{const p=pointAtAlong(road,along);return {x:p.x-p.direction.z*side*lateral,z:p.z+p.direction.x*side*lateral}};
      // The longest clear run (at least 12 m) within this 24 m stretch.
      let runStart=-1,best:[number,number]|null=null;
      for(let s=start;s<=Math.min(start+24,length-4)+1e-6;s+=1){
        const ok=s<=length-4&&clear(at(s));
        if(ok&&runStart<0)runStart=s;
        if((!ok||s+1>Math.min(start+24,length-4))&&runStart>=0){
          const end=ok?s:s-1;
          if(end-runStart>=12&&(!best||end-runStart>best[1]-best[0]))best=[runStart,end];
          runStart=-1;
        }
      }
      if(!best)continue;
      const a=at(best[0]),b=at(best[1]);
      // People walk the straight line between the ends: on a curved road check that line itself, body width included.
      const len=Math.hypot(b.x-a.x,b.z-a.z),ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
      let straight=true;
      for(let d=0;d<=len&&straight;d+=.5){
        const p={x:a.x+ux*d,z:a.z+uz*d};
        straight=clear(p)&&[[.35,0],[-.35,0],[0,.35],[0,-.35]].every(([dx,dz])=>surfaceAt(location,p.x+dx!,p.z+dz!)?.kind==='pavement');
      }
      if(!straight)continue;
      candidates.push({a,b,y:road.surfaceHeight+road.kerbHeight});
    }
  }
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[candidates[i],candidates[j]]=[candidates[j]!,candidates[i]!]}
  for(const c of candidates.slice(0,options.walkers)){
    const n=people.length;
    people.push({kind:'walker',id:`walker-${n}`,a:c.a,b:c.b,y:c.y,speed:1.15+rand()*.4,offset:rand()*60,look:appearance(n*13+5)});
  }
  return people;
}
