import {describe,expect,it} from 'vitest';
import {parseLocation,type PassingVehicleActorDef} from '../../src/contracts';
import {PassingVehicle} from '../../src/actors/passingVehicle';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {prepareRoundabouts} from '../../src/world/roundabouts';
import {surfaceAt} from '../../src/world/roadGeometry';
import {decisionPath} from '../../src/decision/plan';
import {DecisionRunner,type DecisionRunResult,type PausedAt} from '../../src/decision/runner';
import {BRENTWOOD_ROUTE_1} from '../../src/decision/routes/brentwoodRoute1';
import {actorDefs} from '../../src/decision/actors';
import {Traffic} from '../../src/actors/traffic';
import {TrafficSignals} from '../../src/world/trafficSignals';
import {layoutStreetscape} from '../../src/world/streetscape';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';

const node=(m:string)=>import(/* @vite-ignore */ m);
const DT=1/60;

/** The pilot's scene as the app has it: its roads (roundabouts prepared) and the cars parked at its kerbs. */
async function loadScene(){
  const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
  const place=parseLocation(JSON.parse(gunzipSync(readFileSync('public/scenes/brentwood-route-1.json.gz')).toString()).location);
  prepareRoundabouts(place);
  return {place,kerb:kerbFootprints(layoutStreetscape(place)??layoutTownscape(place))};
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
async function drive(answers:Record<string,string[]>,only:number|null=null,traffic=0,seed?:number){
  const {place,kerb}=await loadScene();
  const route=BRENTWOOD_ROUTE_1,path=decisionPath(place,route,kerb)!;
  let car:VehicleState={position:{x:0,y:0,z:0},heading:0,speed:0,steerAngle:0};
  const learner=()=>({pose:{position:car.position,heading:car.heading},halfWidth:.9,halfLength:2.15,speed:car.speed});
  const actors=new Map(actorDefs(route).map(d=>[d.id,new PassingVehicle(d as PassingVehicleActorDef,learner)]));
  const lights=new TrafficSignals(place);
  let runner!:DecisionRunner;
  const busStops=place.furniture.filter(f=>f.kind==='bus-stop').map(f=>f.position);
  const background=traffic>0?new Traffic(place,{count:traffic,buses:2,cycles:2,busStops,parked:kerb,learner:()=>({pose:learner().pose,speed:car.speed}),signals:()=>lights.stops,...(seed===undefined?{}:{seed}),
    keepClear:()=>runner?.keepClear()??[],oncoming:true,careful:true,range:180,
    others:()=>[...actors.values()].filter(a=>a.present).map(a=>({id:a.id,pose:a.pose,speed:a.started?a.speed:0,halfLength:a.size.halfLength}))}):null;
  const others=()=>(background?.cars??[]).filter(c=>c.visible);
  for(const a of actors.values()){
    a.followsLearner=a.def.yieldsToLearner;a.goneAtEnd=true;
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
    traffic:()=>others().map(c=>c.pose.position),
    signals:()=>lights.stops,
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
        return dx*fx+dz*fz>-3&&towards&&p.challenge.quiet.some(q=>Math.hypot(c.pose.position.x-q.x,c.pose.position.z-q.z)<q.radius);
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
  let closestTraffic=Infinity,closestTrafficWho='';const metWho:string[]=[];
  for(let t=0;t<600&&!result;t+=DT){
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
      if(g<closestTraffic){closestTraffic=g;closestTrafficWho=`${c.kind} ${c.id} at ${t.toFixed(1)} s (${c.pose.position.x.toFixed(1)}, ${c.pose.position.z.toFixed(1)}) heading ${Math.round(c.pose.heading*180/Math.PI)} ${c.speed.toFixed(1)} m/s (${background!.reasons().find(x=>x.id===c.id)?.why}); the car (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)}) heading ${Math.round(car.heading*180/Math.PI)} ${car.speed.toFixed(1)} m/s`}
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
      if(side<2.5&&ahead(before)>0&&ahead(car)<=0)redRun++;
    }
    // How much traffic is about: background road users within 100 m (averaged over the drive).
    nearSum+=others().filter(c=>Math.hypot(c.pose.position.x-car.position.x,c.pose.position.z-car.position.z)<100).length;nearSteps++;
    {const fx=Math.sin(car.heading),fz=-Math.cos(car.heading);aheadSum+=others().filter(c=>{const dx=c.pose.position.x-car.position.x,dz=c.pose.position.z-car.position.z,d=Math.hypot(dx,dz);return d<100&&(dx*fx+dz*fz)/d>.5}).length}
    if(surfaceAt(place,car.position.x,car.position.z)?.kind!=='carriageway')offRoad++;
    // (Standing while driving on: waiting for traffic, not for a decision.)
    stood=car.speed<.1&&runner.state==='drive'?stood+DT:0;if(stood>longestStand){longestStand=stood;standAt=`${t.toFixed(1)} s (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)})`}
    runner.update();
  }
  return {result:result as DecisionRunResult|null,pauses,said,signals,closest,closestWho,offRoad,car,closestTraffic,closestTrafficWho,met,metWho,redRun,longestStand,standAt,nearby:nearSum/Math.max(1,nearSteps),ahead:aheadSum/Math.max(1,nearSteps)};
}

const segDistance=(a:{x:number;z:number},b:{x:number;z:number},p:{x:number;z:number})=>{
  const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l));
  return Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z);
};

describe('the Brentwood pilot, driven',()=>{
  it('plans a way through the route on the scene\'s roads',async()=>{
    const {place,kerb}=await loadScene();
    const path=decisionPath(place,BRENTWOOD_ROUTE_1,kerb);
    expect(path&&path.length).toBeGreaterThan(50);
  });
  it('has cars parked at the kerbs, none on the car\'s way or the road users\' paths',async()=>{
    const {place,kerb}=await loadScene();
    const path=decisionPath(place,BRENTWOOD_ROUTE_1,kerb)!;
    expect(kerb.length).toBeGreaterThan(60);
    const near=(line:readonly {x:number;z:number}[])=>kerb.filter(k=>line.some((p,i)=>i>0&&segDistance(line[i-1]!,p,k)<k.halfWidth+2));
    expect(near(path)).toEqual([]);
    for(const a of BRENTWOOD_ROUTE_1.actors)expect(near(a.path)).toEqual([]);
  });
  it('drives the right answers to a pass: each pause where it should be, the traffic as depicted, nothing hit',async()=>{
    const r=await drive({});
    expect(r.result?.passed).toBe(true);
    expect(r.result?.faults).toEqual([]);
    expect(r.pauses.map(p=>`${p.at.challenge.id}/${p.at.stage.id}`)).toEqual(['queens-road-roundabout/approach','queens-road-roundabout/line','queens-road-roundabout/clear','chatham-way-mini/line']);
    const [approach,line,clear,mini]=r.pauses;
    console.log('PAUSES',JSON.stringify(r.pauses.map(p=>({stage:p.at.stage.id,car:{x:+p.car.position.x.toFixed(1),z:+p.car.position.z.toFixed(1),v:+p.car.speed.toFixed(1)},actors:p.actors}))),'closest',r.closest.toFixed(1),r.closestWho,'offroad',r.offRoad);
    // On the approach: moving, about 35 m out; the grey car close behind.
    expect(approach!.car.speed).toBeGreaterThan(6);
    const grey=approach!.actors['grey-car']!;
    expect(Math.hypot(grey.x-approach!.car.position.x,grey.z-approach!.car.position.z)).toBeLessThan(25);
    // At the line: stopped, the blue car on the ring to the right, coming round.
    expect(line!.car.speed).toBeLessThan(.06);
    const blue=line!.actors['blue-car']!;
    expect(Math.hypot(blue.x-78.1,blue.z-63)).toBeLessThan(2);
    // Clear: the blue car gone up Kings Road.
    expect(clear!.actors['blue-car']!.z).toBeLessThan(20);
    // The mini-roundabout: stopped at the line, the white car waiting at the car park exit.
    expect(mini!.car.speed).toBeLessThan(.06);
    expect(mini!.actors['carpark-car']!.started).toBe(false);
    expect(r.said).toEqual(BRENTWOOD_ROUTE_1.challenges.map(c=>c.instruction));
    expect(r.signals).toContain('left');
    expect(r.closest).toBeGreaterThan(4.5);
    expect(r.offRoad).toBe(0);
  },60_000);
  it('holds the car when the learner pulls out in front of the blue car, records it, and asks again',async()=>{
    const r=await drive({'queens-road-roundabout/line':['look-right','go']});
    expect(r.result?.dangerous).toBe(1);
    expect(r.result?.interventions).toBe(1);
    expect(r.result?.passed).toBe(false);
    expect(r.pauses.map(p=>p.at.stage.id)).toEqual(['approach','line','clear','line']);
    // Held at the line: the clear pause finds the car where the line pause did.
    expect(Math.hypot(r.pauses[2]!.car.position.x-r.pauses[1]!.car.position.x,r.pauses[2]!.car.position.z-r.pauses[1]!.car.position.z)).toBeLessThan(.5);
    expect(r.closest).toBeGreaterThan(3);
  },60_000);
  it('practises one challenge on its own, from a little before it',async()=>{
    const r=await drive({'chatham-way-mini/line':['look-right','give-way']},1);
    expect(r.result?.practice).toBe(true);
    expect(r.pauses.map(p=>p.at.challenge.id)).toEqual(['chatham-way-mini']);
    expect(r.result?.faults.map(f=>f.ruleId)).toEqual(['hesitation']);
  },60_000);
});

describe('the Brentwood pilot with background traffic',()=>{
  // Several patterns of traffic (each seed brings the cars in differently).
  for(const seed of [1,4,7,9,10,14]){
    it(`drives the right answers to a pass as depicted, with traffic about (pattern ${seed})`,async()=>{
      const r=await drive({},null,30,seed);
      console.log(`pattern ${seed}: ${r.nearby.toFixed(1)} road users within 100 m on average, ${r.ahead.toFixed(1)} of them ahead; quiet ${JSON.stringify(r.pauses.map(p=>p.quiet))}; met ${r.metWho}; closest ${r.closestTraffic.toFixed(2)} ${r.closestTrafficWho}; stand ${r.longestStand.toFixed(1)} ${r.standAt}`);
      expect(r.result?.passed).toBe(true);
      expect(r.result?.faults).toEqual([]);
      expect(r.pauses.map(p=>`${p.at.challenge.id}/${p.at.stage.id}`)).toEqual(['queens-road-roundabout/approach','queens-road-roundabout/line','queens-road-roundabout/clear','chatham-way-mini/line']);
      // The blue car where the line pause depicts it, however the traffic held the car up on the way.
      const line=r.pauses[1]!.actors['blue-car']!;
      expect(Math.hypot(line.x-78.1,line.z-63)).toBeLessThan(2);
      // No background car coming towards the car in a junction in hand when the scene stops.
      expect(r.pauses.flatMap(p=>p.quiet)).toEqual([]);
      // Nothing touches: background traffic, the route's road users, the learner's car; no red light run.
      expect(r.metWho).toEqual([]);
      // (A bus passing the other way, each in its lane, comes within half a metre.)
      expect(r.closestTraffic,r.closestTrafficWho).toBeGreaterThan(.3);
      expect(r.closest).toBeGreaterThan(4.5);
      expect(r.redRun).toBe(0);
      expect(r.offRoad).toBe(0);
      // Never stuck: the longest stand while driving on is the wait for the blue car at the line.
      expect(r.longestStand,r.standAt).toBeLessThan(16);
    },120_000);
  }
  it('still holds the car when the learner pulls out in front of the blue car',async()=>{
    const r=await drive({'queens-road-roundabout/line':['look-right','go']},null,30,4);
    expect(r.result?.interventions).toBe(1);
    expect(r.pauses.map(p=>p.at.stage.id)).toEqual(['approach','line','clear','line']);
    expect(r.metWho).toEqual([]);
  },120_000);
});
