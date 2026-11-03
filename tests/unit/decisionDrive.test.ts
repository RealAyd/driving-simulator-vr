import {describe,expect,it} from 'vitest';
import {decisionPath} from '../../src/decision/plan';
import {BRENTWOOD_ROUTE_1} from '../../src/decision/routes/brentwoodRoute1';
import {drive,loadScene,segDistance} from './decisionDrive';

/** Every pause of route 1 driven right, in order. */
const PAUSES=['queens-road-roundabout/approach','queens-road-roundabout/line','queens-road-roundabout/clear','chatham-way-mini/line',
  'high-street-lights/approach','high-street-lights/clear','western-road-mini/line','western-road-mini/clear',
  'william-hunter-way-zebra/approach','william-hunter-way-zebra/clear','william-hunter-way-mini/line','wilsons-corner/line','wilsons-corner/clear',
  'queens-road-mini/line'];

type Run=Awaited<ReturnType<typeof drive>>;
/** Each pause as its challenge depicts it: stopped at a line, or on the move; the road user the moment waits for at its
 * point; the road users shown waiting not yet moving. */
function asDepicted(r:Run){
  for(const p of r.pauses){
    const key=`${p.at.challenge.id}/${p.at.stage.id}`;
    if(p.at.place.pause.kind==='stop')expect(p.car.speed,key).toBeLessThan(.06);
    else expect(p.car.speed,key).toBeGreaterThan(3);
    const w=p.at.place.when;
    if(w){const a=p.actors[w.actor]!;expect(Math.hypot(a.x-w.at.x,a.z-w.at.z),`${key}: ${w.actor} at (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`).toBeLessThan(2)}
  }
  const at=(key:string)=>r.pauses.find(p=>`${p.at.challenge.id}/${p.at.stage.id}`===key)!;
  const near=(key:string,actor:string)=>{const p=at(key),a=p.actors[actor]!;return Math.hypot(a.x-p.car.position.x,a.z-p.car.position.z)};
  // Close behind on the roundabout approach and at the zebra.
  expect(near('queens-road-roundabout/approach','grey-car'),'grey car behind').toBeLessThan(25);
  expect(near('william-hunter-way-zebra/approach','silver-car'),'silver car behind').toBeLessThan(25);
  // Waiting where they are shown waiting.
  expect(at('chatham-way-mini/line').actors['carpark-car']!.started).toBe(false);
  expect(at('william-hunter-way-zebra/approach').actors['zebra-pedestrian']!.started).toBe(false);
  expect(at('queens-road-mini/line').actors['white-van']!.started).toBe(false);
}

describe('Brentwood route 1, driven',()=>{
  it('plans a way through the route on the scene\'s roads',async()=>{
    const {place,keepClear}=await loadScene();
    const path=decisionPath(place,BRENTWOOD_ROUTE_1,keepClear);
    expect(path&&path.length).toBeGreaterThan(50);
  });
  it('has cars parked at the kerbs, none on the car\'s way or the road users\' paths',async()=>{
    const {place,kerb,keepClear}=await loadScene();
    const path=decisionPath(place,BRENTWOOD_ROUTE_1,keepClear)!;
    expect(kerb.length).toBeGreaterThan(60);
    const near=(line:readonly {x:number;z:number}[])=>kerb.filter(k=>line.some((p,i)=>i>0&&segDistance(line[i-1]!,p,k)<k.halfWidth+2));
    expect(near(path)).toEqual([]);
    for(const a of BRENTWOOD_ROUTE_1.actors)expect(near(a.path)).toEqual([]);
  });
  it('drives the right answers to a pass: each pause where it should be, the traffic as depicted, nothing hit',async()=>{
    const r=await drive({});
    expect(r.result?.passed).toBe(true);
    expect(r.result?.faults).toEqual([]);
    expect(r.pauses.map(p=>`${p.at.challenge.id}/${p.at.stage.id}`)).toEqual(PAUSES);
    asDepicted(r);
    expect(r.said).toEqual(BRENTWOOD_ROUTE_1.challenges.map(c=>c.instruction));
    expect(r.signals).toContain('left');
    // (The green car going by in the other lane after the William Hunter Way mini-roundabout is the closest.)
    expect(r.closest,r.closestWho).toBeGreaterThan(3);
    expect(r.offRoad).toBe(0);
    expect(r.redRun,r.redAt.join('; ')).toBe(0);
    expect(r.fixedHits).toEqual([]);
  },300_000);
  it('holds the car when the learner pulls out in front of the blue car, records it, and asks again',async()=>{
    const r=await drive({'queens-road-roundabout/line':['look-right','go']},0);
    expect(r.result?.dangerous).toBe(1);
    expect(r.result?.interventions).toBe(1);
    expect(r.result?.passed).toBe(false);
    expect(r.pauses.map(p=>p.at.stage.id)).toEqual(['approach','line','clear']);
    // Held at the line: the clear pause finds the car where the line pause did.
    expect(Math.hypot(r.pauses[2]!.car.position.x-r.pauses[1]!.car.position.x,r.pauses[2]!.car.position.z-r.pauses[1]!.car.position.z)).toBeLessThan(.5);
    expect(r.closest).toBeGreaterThan(3);
  },120_000);
  it('holds the car short of the zebra when the learner goes on with the pedestrian about to cross',async()=>{
    const r=await drive({'william-hunter-way-zebra/approach':['mirror-interior','go']},4);
    expect(r.result?.interventions).toBe(1);
    expect(r.result?.dangerous).toBe(1);
    expect(r.pauses.map(p=>p.at.stage.id)).toEqual(['approach','clear']);
    // Stopped short of the crossing, the pedestrian over it.
    const clear=r.pauses[1]!;
    expect(clear.car.speed).toBeLessThan(.06);
    expect(Math.hypot(clear.actors['zebra-pedestrian']!.x-150,clear.actors['zebra-pedestrian']!.z+456.4)).toBeLessThan(2);
    expect(r.closest).toBeGreaterThan(3);
  },120_000);
  it('practises one challenge on its own, from a little before it, and pulls up just past it',async()=>{
    const r=await drive({'chatham-way-mini/line':['look-right','give-way']},1);
    expect(r.result?.practice).toBe(true);
    expect(r.pauses.map(p=>p.at.challenge.id)).toEqual(['chatham-way-mini']);
    expect(r.result?.faults.map(f=>f.ruleId)).toEqual(['hesitation']);
    // Not on round the rest of the route.
    expect(Math.hypot(r.car.position.x+43,r.car.position.z+250)).toBeLessThan(45);
  },120_000);
});

describe('Brentwood route 1 with background traffic',()=>{
  // Several patterns of traffic (each seed brings the cars in differently).
  for(const seed of [4,14]){
    it(`drives the right answers to a pass as depicted, with traffic about (pattern ${seed})`,async()=>{
      const r=await drive({},null,30,seed);
      console.log(`pattern ${seed}: ${r.nearby.toFixed(1)} road users within 100 m on average, ${r.ahead.toFixed(1)} of them ahead; quiet ${JSON.stringify(r.pauses.map(p=>p.quiet))}; met ${r.metWho}; closest ${r.closestTraffic.toFixed(2)} ${r.closestTrafficWho}; stand ${r.longestStand.toFixed(1)} ${r.standAt}`);
      expect(r.result?.passed).toBe(true);
      expect(r.result?.faults).toEqual([]);
      expect(r.pauses.map(p=>`${p.at.challenge.id}/${p.at.stage.id}`)).toEqual(PAUSES);
      // Each moment as depicted, however the traffic held the car up on the way.
      asDepicted(r);
      // No background car coming towards the car in a junction in hand when the scene stops.
      expect(r.pauses.flatMap(p=>p.quiet)).toEqual([]);
      // Nothing touches: background traffic, the route's road users, the learner's car; no red light run.
      expect(r.metWho).toEqual([]);
      // (A bus passing the other way, each in its lane, comes within half a metre; a car the car stood and waved on
      // squeezes by within a quarter of a metre.)
      expect(r.closestTraffic,r.closestTrafficWho).toBeGreaterThan(.25);
      expect(r.closest).toBeGreaterThan(3);
      expect(r.redRun,r.redAt.join('; ')).toBe(0);
      expect(r.offRoad).toBe(0);
      expect(r.fixedHits).toEqual([]);
      // Never stuck: a stand while driving on is a wait at a line or a red light (a long one at a busy junction).
      expect(r.longestStand,r.standAt).toBeLessThan(45);
    },400_000);
  }
});
