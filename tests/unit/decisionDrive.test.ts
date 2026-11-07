import {describe,expect,it} from 'vitest';
import {decisionPath} from '../../src/decision/plan';
import {BRENTWOOD_ROUTE_1} from '../../src/decision/routes/brentwoodRoute1';
import {BRENTWOOD_ROUTE_2} from '../../src/decision/routes/brentwoodRoute2';
import type {DecisionRoute} from '../../src/decision/route';
import {drive,loadScene,segDistance} from './decisionDrive';

/** Every pause of each route driven right, in order. */
const PAUSES:Record<string,string[]>={
  'brentwood-1':['leave-test-centre/footway','leave-test-centre/line','leave-test-centre/clear',
    'station-crossing/approach','station-crossing/line','station-crossing/clear',
    'high-street-lights/approach','high-street-lights/centre','high-street-lights/clear',
    'wilsons-corner/approach','wilsons-corner/line','wilsons-corner/clear',
    'queens-road-meeting/approach','queens-road-meeting/held',
    'rose-valley-pull-up/approach','rose-valley-pull-up/stopped',
    'rose-valley-move-off/check','rose-valley-move-off/clear',
    'king-edward-emerge/approach','king-edward-emerge/line','king-edward-emerge/clear'],
  'brentwood-2':['crescent-road-zebra/approach','crescent-road-zebra/zebra','crescent-road-zebra/clear',
    'kavanaghs-emerge/approach','kavanaghs-emerge/line','kavanaghs-emerge/clear',
    'london-road-pull-up/approach','london-road-pull-up/stopped',
    'london-road-move-off/check','london-road-move-off/clear',
    'brook-street-lights/approach','brook-street-lights/line','brook-street-lights/green','brook-street-lights/clear',
    'eagle-way-crossroads/approach','eagle-way-crossroads/line','eagle-way-crossroads/clear',
    'the-drive-mini/approach',
    'test-centre-entry/approach','test-centre-entry/entrance','test-centre-entry/clear']
};
const ROUTES:DecisionRoute[]=[BRENTWOOD_ROUTE_1,BRENTWOOD_ROUTE_2];

type Run=Awaited<ReturnType<typeof drive>>;
const keyOf=(p:Run['pauses'][number])=>`${p.at.challenge.id}/${p.at.stage.id}`;
/** Each pause as its challenge depicts it: stopped at a line, or on the move; the road user the moment waits for at its
 * point; the road users shown waiting not yet moving. */
function asDepicted(r:Run,route:DecisionRoute){
  for(const p of r.pauses){
    const key=keyOf(p);
    if(p.at.place.pause.kind==='stop')expect(p.car.speed,key).toBeLessThan(.06);
    // (On the move: slowed behind traffic, it may be, but not stopped.)
    else expect(p.car.speed,key).toBeGreaterThan(1.5);
    const w=p.at.place.when;
    if(w){const a=p.actors[w.actor]!;expect(Math.hypot(a.x-w.at.x,a.z-w.at.z),`${key}: ${w.actor} at (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`).toBeLessThan(2)}
  }
  const at=(key:string)=>r.pauses.find(p=>keyOf(p)===key)!;
  const near=(key:string,actor:string)=>{const p=at(key),a=p.actors[actor]!;return Math.hypot(a.x-p.car.position.x,a.z-p.car.position.z)};
  if(route===BRENTWOOD_ROUTE_1){
    // Waiting where they are shown waiting.
    expect(at('station-crossing/approach').actors['station-pedestrian']!.started).toBe(true);
    // The pulled-up car: the cyclist close behind as it is to move off.
    expect(near('rose-valley-move-off/check','cyclist'),'cyclist behind').toBeLessThan(25);
  }else{
    // The van close behind as the car is to pull up, and as it is to move off.
    expect(near('london-road-pull-up/approach','pullup-van'),'van behind').toBeLessThan(30);
    expect(near('london-road-move-off/check','pullup-van'),'van behind').toBeLessThan(20);
    // Stopped in Mascalls Lane, in the way, when the lights turn green.
    expect(at('brook-street-lights/green').actors['brook-car']!.started).toBe(false);
    expect(near('brook-street-lights/green','brook-car'),'silver car in the way').toBeLessThan(30);
  }
}

describe('Brentwood decision routes, driven',()=>{
  for(const route of ROUTES){
    it(`${route.id}: plans a way through the route on the scene's roads`,async()=>{
      const {place,keepClear}=await loadScene(route);
      const path=decisionPath(place,route,keepClear);
      expect(path&&path.length).toBeGreaterThan(500);
    },60_000);
    it(`${route.id}: has cars parked at the kerbs, none on the car's way or the road users' paths`,async()=>{
      const {place,kerb,keepClear}=await loadScene(route);
      const path=decisionPath(place,route,keepClear)!;
      expect(kerb.length).toBeGreaterThan(60);
      // (Passed with room: a car's half-width and a little more from the parked car's side.)
      const near=(line:readonly {x:number;z:number}[])=>kerb.filter(k=>line.some((p,i)=>i>0&&segDistance(line[i-1]!,p,k)<k.halfWidth+1.2));
      expect(near(path)).toEqual([]);
      for(const a of route.actors)expect(near(a.path),a.id).toEqual([]);
    },60_000);
    it(`${route.id}: drives the right answers to a pass: each pause where it should be, the traffic as depicted, nothing hit`,async()=>{
      const r=await drive({},null,0,undefined,route);
      expect(r.result?.passed).toBe(true);
      expect(r.result?.faults).toEqual([]);
      expect(r.pauses.map(keyOf)).toEqual(PAUSES[route.id]);
      asDepicted(r,route);
      expect(r.said).toEqual(route.challenges.map(c=>c.instruction));
      // (A cyclist or van passing the car pulled up at the kerb is the closest: centre to centre.)
      expect(r.closest,r.closestWho).toBeGreaterThan(2.2);
      expect(r.offRoad,r.offAt.join('; ')).toBe(0);
      expect(r.redRun,r.redAt.join('; ')).toBe(0);
      expect(r.fixedHits).toEqual([]);
      // Back into the test centre at the end.
      expect(Math.hypot(r.car.position.x-480,r.car.position.z-14)).toBeLessThan(12);
    },400_000);
  }
  it('holds the car when the learner pulls out of the test centre in front of the silver car, records it, and asks again',async()=>{
    const r=await drive({'leave-test-centre/line':['look-right','signal-left','go']},0);
    expect(r.result?.dangerous).toBe(1);
    expect(r.result?.interventions).toBe(1);
    expect(r.result?.passed).toBe(false);
    expect(r.pauses.map(p=>p.at.stage.id)).toEqual(['footway','line','clear']);
    // Held at the line: the clear pause finds the car where the line pause did.
    expect(Math.hypot(r.pauses[2]!.car.position.x-r.pauses[1]!.car.position.x,r.pauses[2]!.car.position.z-r.pauses[1]!.car.position.z)).toBeLessThan(.5);
    expect(r.closest).toBeGreaterThan(3);
  },120_000);
  it('holds the car behind the van when the learner tries to squeeze past into the oncoming car',async()=>{
    const r=await drive({'queens-road-meeting/approach':['mirror-interior','go']},4);
    expect(r.result?.interventions).toBe(1);
    expect(r.result?.dangerous).toBe(1);
    expect(r.pauses.map(p=>p.at.stage.id)).toEqual(['approach','held']);
    expect(r.pauses[1]!.car.speed).toBeLessThan(.06);
    expect(r.closest).toBeGreaterThan(2.2);
  },120_000);
  it('practises one challenge on its own, from a little before it, and pulls up just past it',async()=>{
    const r=await drive({'rose-valley-move-off/clear':['mirror-right','blind-spot-right','give-way']},6);
    expect(r.result?.practice).toBe(true);
    expect(r.pauses.map(keyOf)).toEqual(['rose-valley-move-off/check','rose-valley-move-off/clear']);
    expect(r.result?.faults.map(f=>f.ruleId)).toEqual(['hesitation']);
    // Not on round the rest of the route.
    expect(Math.hypot(r.car.position.x-790.7,r.car.position.z+573.6)).toBeLessThan(45);
  },120_000);
  it('route 2: waits on green at the Brook Street lights when there is no space to complete the turn',async()=>{
    const r=await drive({'brook-street-lights/green':['look-left','go']},4,0,undefined,BRENTWOOD_ROUTE_2);
    expect(r.result?.interventions).toBe(1);
    expect(r.result?.faults.map(f=>[f.ruleId,f.level])).toEqual([['no-space','serious']]);
    expect(r.pauses.map(p=>p.at.stage.id)).toEqual(['approach','line','green','clear']);
    expect(r.closest).toBeGreaterThan(3);
  },120_000);
});

describe('Brentwood decision routes with background traffic',()=>{
  // Several patterns of traffic (each seed brings the cars in differently).
  for(const route of ROUTES)for(const seed of [4,14]){
    it(`${route.id}: drives the right answers to a pass as depicted, with traffic about (pattern ${seed})`,async()=>{
      const r=await drive({},null,30,seed,route);
      console.log(`${route.id} pattern ${seed}: ${r.nearby.toFixed(1)} road users within 100 m on average, ${r.ahead.toFixed(1)} of them ahead; quiet ${JSON.stringify(r.pauses.map(p=>p.quiet))}; met ${r.metWho}; closest ${r.closestTraffic.toFixed(2)} ${r.closestTrafficWho}; stand ${r.longestStand.toFixed(1)} ${r.standAt}`);
      expect(r.result?.passed).toBe(true);
      expect(r.result?.faults).toEqual([]);
      expect(r.pauses.map(keyOf)).toEqual(PAUSES[route.id]);
      // Each moment as depicted, however the traffic held the car up on the way.
      asDepicted(r,route);
      // No background car coming towards the car in a junction in hand when the scene stops.
      expect(r.pauses.flatMap(p=>p.quiet)).toEqual([]);
      // Nothing touches: background traffic, the route's road users, the learner's car; no red light run.
      expect(r.metWho).toEqual([]);
      expect(r.closestTraffic,r.closestTrafficWho).toBeGreaterThan(.25);
      expect(r.closest).toBeGreaterThan(2.2);
      expect(r.redRun,r.redAt.join('; ')).toBe(0);
      expect(r.offRoad,r.offAt.join('; ')).toBe(0);
      expect(r.fixedHits).toEqual([]);
      // Never stuck: a stand while driving on is a wait at a line or a red light (a long one at a busy junction).
      expect(r.longestStand,r.standAt).toBeLessThan(45);
    },600_000);
  }
});
