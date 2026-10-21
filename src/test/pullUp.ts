import type {Location,Road,Vec2} from '../contracts';
import {roadHalfWidth,sampleRoad} from '../world/roadGeometry';

/**
 * Pulling up on the left at the end of a mock test: where the car stopped, measured for the examiner (has it
 * stopped at the side of the road?) and for the marking (close to the kerb, and somewhere safe and convenient:
 * not near a junction, on a crossing's zig-zags, at a bus stop or tight behind a parked car; Highway Code
 * rules 239–243).
 */

/** Half the learner car's width (metres). */
const HALF_WIDTH=.9;

export interface StopPlace{
  road:Road;
  /** Gap between the car's nearside and the left kerb (metres; negative: over the kerb). */
  kerbGap:number;
  /** True when the car stopped on the right-hand side of a two-way road. */
  rightSide:boolean;
}

/** Where a car at (x, z) facing `heading` has stopped, relative to the nearest road's left kerb. */
export function stopPlace(location:Location,x:number,z:number,heading:number):StopPlace|null{
  let best:{road:Road;s:ReturnType<typeof sampleRoad>}|null=null;
  for(const road of location.roads){const s=sampleRoad(road,x,z);if(!best||s.distance<best.s.distance)best={road,s}}
  if(!best||best.s.distance>12)return null;
  const fwd={x:Math.sin(heading),z:-Math.cos(heading)};
  const dir=best.s.direction.x*fwd.x+best.s.direction.z*fwd.z>=0?1:-1;
  // Metres to the right of the centreline, in the way the car faces.
  const right=best.s.lateral*dir;
  const half=roadHalfWidth(best.road);
  return {road:best.road,kerbGap:half+right-HALF_WIDTH,rightSide:!best.road.oneway&&right>.5};
}

/** Places where two roads meet: road ends that join another road, and mini-roundabouts. */
export function junctionPoints(location:Location):Vec2[]{
  const out:Vec2[]=location.junctions.map(j=>({x:j.position.x,z:j.position.z}));
  for(const road of location.roads){
    for(const end of [road.centreline[0],road.centreline.at(-1)]){
      if(!end)continue;
      if(location.roads.some(o=>o!==road&&sampleRoad(o,end.x,end.z).distance<7)&&!out.some(p=>Math.hypot(p.x-end.x,p.z-end.z)<5))out.push({x:end.x,z:end.z});
    }
  }
  return out;
}

export interface PullUpFault{key:string;severity:'minor'|'serious';text:string}

/** The faults in where the car pulled up (none: a good place, close to the kerb). */
export function judgePullUp(location:Location,junctions:Vec2[],parked:Vec2[],x:number,z:number,heading:number):PullUpFault[]{
  const out:PullUpFault[]=[];
  const place=stopPlace(location,x,z,heading);
  if(!place)return [{key:'nowhere',severity:'minor',text:'Normal stops: did not pull up at the side of a road.'}];
  const name=place.road.name??'the road';
  if(place.rightSide)out.push({key:'right-side',severity:'minor',text:`Normal stops: pulled up on the right-hand side of ${name}, not on the left as asked.`});
  else if(place.kerbGap>1)out.push({key:'kerb',severity:'minor',text:`Normal stops: stopped ${place.kerbGap.toFixed(1)} m from the kerb (draft: within 1 m, parallel to it, so others can pass).`});
  const near=junctions.reduce((d,p)=>Math.min(d,Math.hypot(p.x-x,p.z-z)),Infinity);
  if(near<10)out.push({key:'junction',severity:'minor',text:`Normal stops: stopped ${near.toFixed(0)} m from a junction (Highway Code rule 243: not within 10 m of a junction).`});
  for(const c of location.crossings){
    const road=location.roads.find(r=>r.id===c.roadId);
    if(!road)continue;
    const s=sampleRoad(road,x,z);
    if(s.distance>roadHalfWidth(road)+1)continue;
    // The zig-zag area: the marks either side (2 m each), or 15 m where they are not recorded (signal crossings).
    const reach=c.width/2+(c.zigzagMarks>0?c.zigzagMarks*2:15);
    if(Math.abs(s.along-c.along)<reach){
      out.push({key:'zig-zags',severity:'serious',text:`Normal stops: stopped on the zig-zag lines of the ${c.kind==='zebra'?'zebra':'signal'} crossing on ${name} (an offence; it hides people crossing).`});
      break;
    }
  }
  const fwd={x:Math.sin(heading),z:-Math.cos(heading)};
  for(const f of location.furniture){
    if(f.kind!=='bus-stop')continue;
    const dx=f.position.x-x,dz=f.position.z-z,left=dx*fwd.z-dz*fwd.x;
    if(Math.abs(dx*fwd.x+dz*fwd.z)<12&&left>0&&left<7){out.push({key:'bus-stop',severity:'minor',text:'Normal stops: stopped at a bus stop.'});break}
  }
  for(const p of parked){
    const dx=p.x-x,dz=p.z-z,along=dx*fwd.x+dz*fwd.z,side=Math.abs(dx*fwd.z-dz*fwd.x);
    // Car lengths 4.2 m: a gap under 1.5 m between bumpers leaves no room to drive away.
    if(along>0&&side<1.5&&along-4.2<1.5){out.push({key:'parked',severity:'minor',text:'Normal stops: stopped too close behind a parked car to drive away without reversing.'});break}
  }
  return out;
}
