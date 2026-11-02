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

const node=(m:string)=>import(/* @vite-ignore */ m);
const DT=1/60;

/** Drives the pilot route headless: the runner's pedals and steering, the scripted road users, the answers given. */
async function drive(answers:Record<string,string[]>,only:number|null=null){
  const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
  const place=parseLocation(JSON.parse(gunzipSync(readFileSync('public/scenes/brentwood-route-1.json.gz')).toString()).location);
  prepareRoundabouts(place);
  const route=BRENTWOOD_ROUTE_1,path=decisionPath(place,route)!;
  let car:VehicleState={position:{x:0,y:0,z:0},heading:0,speed:0,steerAngle:0};
  const actors=new Map(actorDefs(route).map(d=>[d.id,new PassingVehicle(d as PassingVehicleActorDef,()=>({pose:{position:car.position,heading:car.heading},halfWidth:.9,halfLength:2.15,speed:car.speed}))]));
  for(const a of actors.values())a.followsLearner=a.def.yieldsToLearner;
  let frozen=false,result:DecisionRunResult|null=null;
  const pauses:Array<{at:PausedAt;car:VehicleState;actors:Record<string,{x:number;z:number;started:boolean}>}>=[];
  const said:string[]=[],signals:string[]=[];
  let pending:PausedAt|null=null;
  const runner=new DecisionRunner(route,path,LEARNER_CAR,{
    car:()=>({x:car.position.x,z:car.position.z,heading:car.heading,speed:car.speed,steerAngle:car.steerAngle}),
    actor:id=>actors.get(id),
    setSignal:s=>signals.push(s),say:t=>said.push(t),freeze:on=>{frozen=on},
    paused:p=>{if(p){pending=p;pauses.push({at:p,car:{...car},actors:Object.fromEntries([...actors].map(([id,a])=>[id,{x:a.pose.position.x,z:a.pose.position.z,started:a.started}]))})}},
    finished:r=>{result=r}
  });
  const start=runner.startPose(only);
  car={position:{x:start.x,y:0,z:start.z},heading:start.heading,speed:0,steerAngle:0};
  for(const a of actors.values())a.reset();
  runner.begin(only);
  let closest=Infinity,offRoad=0,closestWho='';
  for(let t=0;t<400&&!result;t+=DT){
    if(pending){
      const p:PausedAt=pending;pending=null;
      runner.submit(answers[`${p.challenge.id}/${p.stage.id}`]??p.stage.accepted[0]!);
      runner.continue();
    }
    if(frozen)continue;
    car=stepVehicle(car,runner.controls(),LEARNER_CAR,DT);
    for(const a of actors.values()){a.fixedUpdate(DT);const d=Math.hypot(a.pose.position.x-car.position.x,a.pose.position.z-car.position.z);if(a.started&&d<closest){closest=d;closestWho=`${a.id} at ${t.toFixed(1)} s (${car.position.x.toFixed(1)}, ${car.position.z.toFixed(1)})`}}
    if(surfaceAt(place,car.position.x,car.position.z)?.kind!=='carriageway')offRoad++;
    runner.update();
  }
  return {result:result as DecisionRunResult|null,pauses,said,signals,closest,closestWho,offRoad,car};
}

describe('the Brentwood pilot, driven',()=>{
  it('plans a way through the route on the scene\'s roads',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
    const place=parseLocation(JSON.parse(gunzipSync(readFileSync('public/scenes/brentwood-route-1.json.gz')).toString()).location);
    prepareRoundabouts(place);
    const path=decisionPath(place,BRENTWOOD_ROUTE_1);
    expect(path&&path.length).toBeGreaterThan(50);
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
