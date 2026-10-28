import {parseLocation,type Location} from '../../src/contracts';
import {Traffic,type TrafficOptions} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {prepareRoundabouts,drivingView} from '../../src/world/roundabouts';
import {RoadNetwork} from '../../src/test/route';
import {routeLanePath} from '../../src/test/routePath';

/**
 * A learner driving a real route through the background traffic (the harness for trafficDrives.test.ts): along the assisted
 * steering's path at a steady town speed, stopping for anything in its way, as a careful learner would. Measures what
 * the owner saw on their drives: cars vanishing in sight, cars coming the other way on the learner's road, the learner
 * held up, and traffic standing about.
 */
export interface DriveReport{
  /** Driven to the end of the route (within 15 minutes). */
  completed:boolean;
  metres:number;seconds:number;
  /** Cars that disappeared while the learner could see them (ahead within 120 m, or anywhere within 30 m). */
  vanishedInView:number;
  /** Different cars met coming the other way, close by on the learner's road (per kilometre driven). */
  oncomingPerKm:number;
  /** Seconds the learner stood waiting for traffic in its way (not at lights). */
  learnerHeld:number;
  /** The longest the learner stood in one go. */
  learnerLongestHold:number;
  /** Times the learner backed off to make room (held up 20 s). */
  backedOff:number;
  /** The longest any car stood still. */
  carLongestStand:number;
  /** Cars visible near the learner on average (within 150 m). */
  nearby:number;
}

const node=(m:string)=>import(/* @vite-ignore */ m);
export async function loadCentre(id:string):Promise<Location>{
  const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
  const loc=parseLocation(JSON.parse(gunzipSync(readFileSync(`public/centres/${id}.json.gz`)).toString()).location);
  prepareRoundabouts(loc);
  // The start the app uses (main.ts settleStart): facing somewhere to go, not into the dead end of a centre's yard.
  const b=new RoadNetwork(loc).startNear(loc.spawn.position.x,loc.spawn.position.z,loc.spawn.headingDeg*Math.PI/180);
  loc.spawn={...loc.spawn,position:{x:b.x,z:b.z},headingDeg:(b.heading*180/Math.PI+360)%360};
  return loc;
}

export function seenBy(learner:{x:number;z:number;heading:number},p:{x:number;z:number}):boolean{
  const dx=p.x-learner.x,dz=p.z-learner.z,d=Math.hypot(dx,dz);
  if(d<30)return true;
  if(d>120)return false;
  const ahead=(dx*Math.sin(learner.heading)-dz*Math.cos(learner.heading))/d;
  return ahead>Math.cos(75*Math.PI/180);
}

/** `watch`, if given, sees each step (to find out what holds the learner up). */
export function driveRoute(loc:Location,seed:number,options:Partial<TrafficOptions>={},metres=1500,speed=7,
  watch?:(step:{t:number;hold:number;traffic:Traffic;learner:{x:number;z:number;heading:number}})=>void):DriveReport{
  const layout=layoutTownscape(loc)!;
  const parked=kerbFootprints(layout);
  const net=new RoadNetwork(loc),sp=loc.spawn;
  const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
  const path=routeLanePath(net.plan(start,metres,seed).legs,parked,drivingView(loc).junctions);
  const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]!+Math.hypot(path[i]!.x-path[i-1]!.x,path[i]!.z-path[i-1]!.z));
  const total=cum.at(-1)!;
  // (Held up by a car close on its right, the learner edges up to a metre towards its own kerb, as a driver squeezing
  // by would: `nudge`, metres to the left of the path.)
  let nudge=0;
  const at=(s:number)=>{let i=1;while(i<cum.length-1&&cum[i]!<s)i++;const a=path[i-1]!,b=path[i]!,t=Math.min(1,Math.max(0,(s-cum[i-1]!)/((cum[i]!-cum[i-1]!)||1)));
    const h=Math.atan2(b.x-a.x,-(b.z-a.z)),lx=-Math.cos(h),lz=-Math.sin(h);
    return {x:a.x+(b.x-a.x)*t+lx*nudge,z:a.z+(b.z-a.z)*t+lz*nudge,heading:h}};
  let s=0,v=0;
  const p0=at(0);
  const learner={pose:{position:{x:p0.x,y:0,z:p0.z},heading:p0.heading},speed:0};
  const traffic=new Traffic(loc,{count:14,buses:2,cycles:2,busStops:loc.furniture.filter(f=>f.kind==='bus-stop').map(f=>f.position),
    parked,learner:()=>learner,seed,...options});
  const dt=1/30;
  const visibleBefore=new Map<string,boolean>(),still=new Map<string,number>();
  const oncoming=new Set<string>();
  let vanished=0,held=0,hold=0,longestHold=0,carLongest=0,t=0,nearbySum=0,steps=0,backOff=0,backedOff=0;
  while(s<total-5&&t<900){
    // The learner: on along the path, stopping short of anything in its way (2 m either side of the path, 9 m ahead).
    const here=at(s),fx=Math.sin(here.heading),fz=-Math.cos(here.heading);
    const blocked=traffic.cars.some(c=>{
      if(!c.visible)return false;
      for(const k of [3,6,9]){
        const q=at(Math.min(total,s+k)),dx=c.pose.position.x-q.x,dz=c.pose.position.z-q.z;
        // (Held up a while by one standing still, it squeezes by with a little room, as a learner would.)
        const width=hold>8&&c.speed<.3?.9+c.halfWidth+.25:1.9+c.halfWidth-.9;
        if(Math.abs(dx*fz-dz*fx)<width&&Math.abs(dx*fx+dz*fz)<c.halfLength+1.5)return true;
      }
      return false;
    });
    // Which side the nearest car in the way is on (to nudge away from it).
    const onRight=traffic.cars.some(c=>{
      if(!c.visible)return false;
      const dx=c.pose.position.x-here.x,dz=c.pose.position.z-here.z,along=dx*fx+dz*fz,left=dx*fz-dz*fx;
      return along>0&&along<12&&left<0&&left>-3.5;
    });
    nudge=blocked&&onRight?Math.min(1,nudge+.5*dt):Math.max(0,nudge-.3*dt);
    v=blocked?Math.max(0,v-6*dt):Math.min(speed,v+2*dt);
    // Held up 20 s: it backs off 4 m to make room, as the owner did (traffic should then find its way through).
    if(backOff>0){v=-1.5;backOff-=dt}
    else if(hold>20){backOff=2.7;hold=0;backedOff++}
    if(blocked&&v<.2&&v>=0){held+=dt;hold+=dt;longestHold=Math.max(longestHold,hold)}else if(v>=0)hold=0;
    s=Math.max(0,s+v*dt);
    const p=at(s);
    learner.pose={position:{x:p.x,y:0,z:p.z},heading:p.heading};learner.speed=v;
    traffic.fixedUpdate(dt);
    watch?.({t,hold,traffic,learner:{x:p.x,z:p.z,heading:p.heading}});
    const L={x:p.x,z:p.z,heading:p.heading};
    for(const c of traffic.cars){
      const was=visibleBefore.get(c.id)??false;
      if(was&&!c.visible&&seenBy(L,c.pose.position))vanished++;
      visibleBefore.set(c.id,c.visible);
      if(!c.visible){still.delete(c.id);continue}
      const st=c.speed<.2?(still.get(c.id)??0)+dt:0;still.set(c.id,st);carLongest=Math.max(carLongest,st);
      const dx=c.pose.position.x-p.x,dz=c.pose.position.z-p.z,along=dx*Math.sin(p.heading)-dz*Math.cos(p.heading),side=Math.abs(dx*Math.cos(p.heading)+dz*Math.sin(p.heading));
      if(Math.cos(c.pose.heading-p.heading)<-.7&&along>0&&along<30&&side<5)oncoming.add(c.id);
      if(Math.hypot(dx,dz)<150)nearbySum++;
    }
    t+=dt;steps++;
  }
  return {completed:s>=total-5,backedOff,metres:s,seconds:t,vanishedInView:vanished,oncomingPerKm:oncoming.size/Math.max(.1,s/1000),learnerHeld:held,learnerLongestHold:longestHold,
    carLongestStand:carLongest,nearby:nearbySum/Math.max(1,steps)};
}
