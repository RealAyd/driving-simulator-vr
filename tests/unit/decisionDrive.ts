/** The decision route driven headless as the app drives it (tests/unit/decisionDrive.test.ts). */
import {parseLocation,type PassingVehicleActorDef} from '../../src/contracts';
import {PassingVehicle} from '../../src/actors/passingVehicle';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {drivingView,prepareRoundabouts} from '../../src/world/roundabouts';
import {roundMinis} from '../../src/world/miniRoundabout';
import {surfaceAt} from '../../src/world/roadGeometry';
import {startRoads,decisionPath,junctionDiscs,routeBlocks,routeParking,streetFurniture} from '../../src/decision/plan';
import {layoutSignage} from '../../src/world/signage';
import {StaticObstacles} from '../../src/world/obstacles';
import {DecisionRunner,type DecisionRunResult,type PausedAt} from '../../src/decision/runner';
import {BRENTWOOD_ROUTE_1} from '../../src/decision/routes/brentwoodRoute1';
import type {DecisionRoute} from '../../src/decision/route';
import {actorDefs} from '../../src/decision/actors';
import {Traffic} from '../../src/actors/traffic';
import {TrafficSignals} from '../../src/world/trafficSignals';
import {layoutStreetscape} from '../../src/world/streetscape';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';

const node=(m:string)=>import(/* @vite-ignore */ m);
const DT=1/60;

/** A route's scene as the app has it: its roads (roundabouts prepared), the cars parked at its kerbs and those the
 * route parks. */
export async function loadScene(route:DecisionRoute=BRENTWOOD_ROUTE_1){
  const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
  const place=parseLocation(JSON.parse(gunzipSync(readFileSync(`public/scenes/${route.scene}.json.gz`)).toString()).location);
  place.blocks.push(...routeBlocks(route));
  prepareRoundabouts(place);
  // (As the app has them: parked cars, and the fixed things the car must not touch.)
  const layout=layoutStreetscape(place)??layoutTownscape(place);
  const colliders=[...place.blocks,...(layout?.colliders??[]),...layoutSignage(place,layout).colliders];
  const furniture=streetFurniture(colliders);
  return {place,kerb:kerbFootprints(layout),furniture,keepClear:[...kerbFootprints(layout),...furniture],obstacles:new StaticObstacles(colliders)};
}
type Box={x:number;z:number;heading:number;halfWidth:number;halfLength:number};
/** Gap between two cars' boxes (metres; about, from their corners and middles), 0 when they touch. */
function gapBetween(a:Box,b:Box):number{
  const pts=(c:Box)=>{const fx=Math.sin(c.heading),fz=-Math.cos(c.heading),rx=-fz,rz=fx;
    return [-1,0,1].flatMap(i=>[-1,1].map(j=>({x:c.x+fx*i*c.halfLength+rx*j*c.halfWidth,z:c.z+fz*i*c.halfLength+rz*j*c.halfWidth})))};
  const inside=(p:{x:number;z:number},c:Box)=>{const dx=p.x-c.x,dz=p.z-c.z,fx=Math.sin(c.heading),fz=-Math.cos(c.heading);
    return Math.max(0,Math.abs(dx*fx+dz*fz)-c.halfLength,Math.abs(dx*fz-dz*fx)-c.halfWidth)};
  return Math.min(...pts(a).map(p=>inside(p,b)),...pts(b).map(p=>inside(p,a)));
}

/**
 * Drives the pilot route headless as the app does: the runner's pedals and steering, the scripted road users, the
 * answers given; with the scene's parked cars, its traffic lights and background traffic (`traffic` road users, two
 * of them buses and two cyclists, as the app has, kept off the junctions in hand).
 */
export async function drive(answers:Record<string,string[]>,only:number|null=null,traffic=0,seed?:number,route:DecisionRoute=BRENTWOOD_ROUTE_1){
  const {place,kerb,keepClear,obstacles}=await loadScene(route);
  const path=decisionPath(place,route,keepClear)!;
  const junctions=junctionDiscs(place);
  let car:VehicleState={position:{x:0,y:0,z:0},heading:0,speed:0,steerAngle:0};
  const learner=()=>({pose:{position:car.position,heading:car.heading},halfWidth:.9,halfLength:2.15,speed:car.speed});
  const minis=drivingView(place).junctions;
  const actors=new Map(actorDefs(route).map(d=>[d.id,new PassingVehicle((d.body==='car'?{...d,path:roundMinis(d.path,minis)}:d) as PassingVehicleActorDef,learner)]));
  const lights=new TrafficSignals(place);
  let runner!:DecisionRunner;
  const busStops=place.furniture.filter(f=>f.kind==='bus-stop').map(f=>f.position);
  const background=traffic>0?new Traffic(place,{count:traffic,buses:2,cycles:2,busStops,parked:[...kerb,...routeParking(route)],learner:()=>({pose:learner().pose,speed:car.speed}),signals:()=>lights.stops,...(seed===undefined?{}:{seed}),
    keepClear:()=>runner?.keepClear()??[],oncoming:true,careful:true,range:180,offLimits:startRoads(place,route),
    others:()=>[...actors.values()].filter(a=>a.present).map(a=>({id:a.id,pose:a.pose,speed:a.started?a.speed:0,halfLength:a.size.halfLength}))}):null;
  const others=()=>(background?.cars??[]).filter(c=>c.visible);
  for(const a of actors.values()){
    a.followsLearner=a.def.yieldsToLearner;a.goneAtEnd=!route.actors.find(x=>x.id===a.id)?.parks;
    a.signals=()=>lights.stops;
    a.traffic=()=>others().map(c=>({pose:c.pose,halfWidth:c.halfWidth,halfLength:c.halfLength,speed:c.speed}));
  }
  let frozen=false,result:DecisionRunResult|null=null;
  type Seen={x:number;z:number;started:boolean};
  const pauses:Array<{at:PausedAt;car:VehicleState;actors:Record<string,Seen>;quiet:string[]}>=[];
  const said:string[]=[],signals:string[]=[];
  let pending:PausedAt|null=null;
  runner=new DecisionRunner(route,path,LEARNER_CAR,{
    car:()=>({x:car.position.x,z:car.position.z,heading:car.heading,speed:car.speed,steerAngle:car.steerAngle}),
    actor:id=>actors.get(id),
    traffic:()=>{const why=new Map((background?.reasons()??[]).map(r=>[r.id,r.why]));return others().map(c=>({id:c.id,x:c.pose.position.x,z:c.pose.position.z,heading:c.pose.heading,speed:c.speed,halfWidth:c.halfWidth,halfLength:c.halfLength,why:why.get(c.id)??''}))},
    junctions:()=>junctions,
    waveOn:id=>background?.waveOn(id),
    retire:id=>{background?.retire(id);retired.push(id)},
    signals:()=>lights.stops,
    holdLights:(at,aspect)=>lights.hold(at,aspect),
    setSignal:s=>signals.push(s),say:t=>said.push(t),freeze:on=>{frozen=on},
    paused:p=>{
      if(!p)return;
      pending=p;
      // Background traffic in the challenge's quiet circles when it stops (there should be none).
      // (Queued behind the car, or ahead of it going away, is not in the picture the decision is about: one coming
      // towards it is.)
      const fx=Math.sin(car.heading),fz=-Math.cos(car.heading);
      const inQuiet=others().filter(c=>{
        const dx=c.pose.position.x-car.position.x,dz=c.pose.position.z-car.position.z;
        const towards=-(Math.sin(c.pose.heading)*dx-Math.cos(c.pose.heading)*dz)>0;
        // (Within 45 m: what is in the picture; one far up the road is not.)
        return dx*fx+dz*fz>-3&&Math.hypot(dx,dz)<45&&towards&&p.challenge.quiet.some(q=>Math.hypot(c.pose.position.x-q.x,c.pose.position.z-q.z)<q.radius);
      });
      pauses.push({at:p,car:{...car},actors:Object.fromEntries([...actors].map(([id,a])=>[id,{x:a.pose.position.x,z:a.pose.position.z,started:a.started}])),
        quiet:inQuiet.map(c=>`${c.id} (${c.pose.position.x.toFixed(0)}, ${c.pose.position.z.toFixed(0)})`)});
    },
    finished:r=>{result=r}
  });
  const start=runner.startPose(only);
  car={position:{x:start.x,y:0,z:start.z},heading:start.heading,speed:0,steerAngle:0};
  for(const a of actors.values())a.reset();
  runner.begin(only);
  background?.reset();
  let closest=Infinity,offRoad=0,closestWho='',redRun=0,stood=0,longestStand=0,met=0,standAt='',nearSum=0,nearSteps=0,aheadSum=0;
  let closestTraffic=Infinity,closestTrafficWho='';const fixedHits:string[]=[];const offAt:string[]=[];const retired:string[]=[];const redAt:string[]=[];const metWho:string[]=[];
  for(let t=0;t<2400&&!result;t+=DT){
    if(pending){
      const p:PausedAt=pending;pending=null;
      runner.submit(answers[`${p.challenge.id}/${p.stage.id}`]??p.stage.accepted[0]!);
      runner.continue();
    }
    if(frozen)continue;
    const before=car;
    car=stepVehicle(car,runner.controls(),LEARNER_CAR,DT);
    lights.fixedUpdate(DT);
    for(const a of actors.values()){a.fixedUpdate(DT);const d=Math.hypot(a.pose.position.x-car.position.x,a.pose.position.z-car.position.z);if(a.started&&a.present&&d<closest){closest=d;closestWho=`${a.id} at ${t.toFixed(1)} s (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)})`}}
    background?.fixedUpdate(DT);
    // Background traffic: how close it comes to the learner's car and to the route's own road users (boxes).
    const me={x:car.position.x,z:car.position.z,heading:car.heading,halfWidth:.9,halfLength:2.15};
    for(const c of others()){
      const box={x:c.pose.position.x,z:c.pose.position.z,heading:c.pose.heading,halfWidth:c.halfWidth,halfLength:c.halfLength};
      const g=gapBetween(me,box);
      // (A bus, its rigid length swinging wide round a mini-roundabout past the car waiting there, may come within a
      // hand's width: counted as 0.2 m further off, so measured against a tenth of a metre rather than three.)
      const counted=c.kind==='bus'?g+.2:g;
      if(counted<closestTraffic){closestTraffic=counted;closestTrafficWho=`${c.kind} ${c.id} at ${t.toFixed(1)} s (${c.pose.position.x.toFixed(1)}, ${c.pose.position.z.toFixed(1)}) heading ${Math.round(c.pose.heading*180/Math.PI)} ${c.speed.toFixed(1)} m/s (${background!.reasons().find(x=>x.id===c.id)?.why}); the car (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)}) heading ${Math.round(car.heading*180/Math.PI)} ${car.speed.toFixed(1)} m/s`}
      if(g<1)met++;
      for(const a of actors.values())if(a.present&&gapBetween({x:a.pose.position.x,z:a.pose.position.z,heading:a.pose.heading,...a.size},box)<.05){
        met++;if(metWho.length<3)metWho.push(`${c.kind} ${c.id} heading ${Math.round(c.pose.heading*180/Math.PI)} (${background!.reasons().find(x=>x.id===c.id)?.why}) and ${a.id} at ${t.toFixed(1)} s (${c.pose.position.x.toFixed(1)}, ${c.pose.position.z.toFixed(1)}) and (${a.pose.position.x.toFixed(1)}, ${a.pose.position.z.toFixed(1)})`)}
    }
    // Through a red light: the car's front crossing a stop line facing it.
    for(const st of lights.stops){
      if(st.state!=='red'||Math.cos(st.heading-car.heading)<.8)continue;
      const fx=Math.sin(car.heading),fz=-Math.cos(car.heading);
      const ahead=(p:VehicleState)=>(st.lane.x-p.position.x-fx*2.15)*fx+(st.lane.z-p.position.z-fz*2.15)*fz;
      const side=Math.abs((st.lane.x-car.position.x)*fz-(st.lane.z-car.position.z)*fx);
      if(side<2.5&&ahead(before)>0&&ahead(car)<=0){redRun++;redAt.push(`${t.toFixed(1)} s at (${st.lane.x.toFixed(1)}, ${st.lane.z.toFixed(1)})`)}
    }
    // How much traffic is about: background road users within 100 m (averaged over the drive).
    nearSum+=others().filter(c=>Math.hypot(c.pose.position.x-car.position.x,c.pose.position.z-car.position.z)<100).length;nearSteps++;
    {const fx=Math.sin(car.heading),fz=-Math.cos(car.heading);aheadSum+=others().filter(c=>{const dx=c.pose.position.x-car.position.x,dz=c.pose.position.z-car.position.z,d=Math.hypot(dx,dz);return d<100&&(dx*fx+dz*fz)/d>.5}).length}
    if(surfaceAt(place,car.position.x,car.position.z)?.kind!=='carriageway'){offRoad++;if(offAt.length<4)offAt.push(`${t.toFixed(1)} s (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)}) ${surfaceAt(place,car.position.x,car.position.z)?.kind}`)}
    // Touching anything fixed (a lamp column, a bollard, a parked car, a wall), as the app stops the car for.
    {const hit=obstacles.firstCollision({position:car.position,heading:car.heading},.9,2.15);if(hit&&!hit.startsWith('edge-barrier')&&fixedHits.length<5&&!fixedHits.some(h=>h.startsWith(hit+' ')))fixedHits.push(`${hit} at ${t.toFixed(1)} s (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)})`)}
    // (Standing while driving on: waiting for traffic, not for a decision.)
    stood=car.speed<.1&&runner.state==='drive'?stood+DT:0;if(stood>longestStand){longestStand=stood;standAt=`${t.toFixed(1)} s (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)}) held by ${runner.heldBy}${(()=>{const w=runner.heldBy.match(/(traffic-\d+)/)?.[1];const c=w&&others().find(x=>x.id===w);return c?`: ${c.kind} at (${c.pose.position.x.toFixed(1)}, ${c.pose.position.z.toFixed(1)}) heading ${Math.round(c.pose.heading*180/Math.PI)}, ${background!.reasons().find(x=>x.id===w)?.why}`:''})()}`}
    runner.update();
  }
  // (Where each road user ended up, and what held the car last: diagnostics for a drive that did not finish.)
  const final=Object.fromEntries([...actors].map(([id,a])=>[id,`(${a.pose.position.x.toFixed(1)}, ${a.pose.position.z.toFixed(1)}) ${a.started?'started':'waiting'} ${a.speed.toFixed(1)} m/s`]));
  const near=others().filter(c=>Math.hypot(c.pose.position.x-car.position.x,c.pose.position.z-car.position.z)<60).map(c=>`${c.id} (${c.pose.position.x.toFixed(0)}, ${c.pose.position.z.toFixed(0)}) ${c.speed.toFixed(1)} ${background!.reasons().find(x=>x.id===c.id)?.why}`);
  return {final,near,heldBy:runner.heldBy,result:result as DecisionRunResult|null,pauses,said,signals,closest,closestWho,offRoad,offAt,car,closestTraffic,closestTrafficWho,met,metWho,redRun,redAt,fixedHits,retired,longestStand,standAt,nearby:nearSum/Math.max(1,nearSteps),ahead:aheadSum/Math.max(1,nearSteps)};
}

export const segDistance=(a:{x:number;z:number},b:{x:number;z:number},p:{x:number;z:number})=>{
  const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l));
  return Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z);
};

