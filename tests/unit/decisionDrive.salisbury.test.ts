import {describe,expect,it} from 'vitest';
import {assessStage} from '../../src/decision/assess';
import {decisionPath} from '../../src/decision/plan';
import {TURN_BUTTONS} from '../../src/decision/turnButtons';
import {SALISBURY_ROUTE_1} from '../../src/decision/routes/salisburyRoute1';
import {SALISBURY_ROUTE_2} from '../../src/decision/routes/salisburyRoute2';
import type {DecisionRoute} from '../../src/decision/route';
import {BACK_TO_CENTRE,TO_NEXT} from '../../src/decision/runner';
import {drive,loadScene,segDistance} from './decisionDrive';

/** The Salisbury pilot routes (content/packs/salisbury/ROUTES.md): authored to the shared rules, and driven headless
 * as decisionDrive.test.ts drives Brentwood's and Chelmsford's. */
const ROUTES:DecisionRoute[]=[SALISBURY_ROUTE_1,SALISBURY_ROUTE_2];

/** Every pause of each route driven right, in order. */
const PAUSES:Record<string,string[]>={
  'salisbury-1':['leave-test-centre/approach','leave-test-centre/clear',
    'st-marks-roundabout/approach','st-marks-roundabout/clear',
    'bishopdown-mini/approach','bishopdown-mini/clear',
    'denison-pull-up/approach','denison-pull-up/stopped',
    'denison-move-off/check','denison-move-off/clear',
    'barrington-lights/approach','barrington-lights/clear',
    'london-road-crossing/approach','london-road-crossing/clear',
    'rougemont-right/approach','rougemont-right/clear'],
  'salisbury-2':['leave-test-centre/approach','leave-test-centre/clear',
    'kelsey-pull-up/approach','kelsey-pull-up/stopped',
    'kelsey-move-off/check','kelsey-move-off/clear',
    'milford-lights/approach','milford-lights/clear',
    'castle-street-lights/approach','castle-street-lights/clear',
    'castle-street-mini/approach','castle-street-mini/clear',
    'castle-roundabout/approach','castle-roundabout/clear',
    'manor-right/approach','manor-right/clear']
};
/** Where each drive ends: back on Rougemont Close by the test centre (its own way in is a driveway, not built). */
const END:Record<string,{x:number;z:number}>={'salisbury-1':{x:-285.4,z:608.7},'salisbury-2':{x:164.6,z:-170.6}};
/** Challenges straight ahead (no turn to signal). */
const AHEAD=new Set(['castle-street-lights','castle-street-mini']);

describe('Salisbury decision routes as authored',()=>{
  for(const route of ROUTES)for(const c of route.challenges){
    it(`${route.id} ${c.id}: every accepted sequence is fault-free, and pressing every button does not pass`,()=>{
      for(const st of c.stages)for(const seq of st.accepted)expect(assessStage(c,st.id,seq).faults,`${st.id}: ${seq.join(', ')}`).toEqual([]);
      const worst=c.stages.flatMap(st=>assessStage(c,st.id,st.buttons).faults.map(f=>f.level));
      expect(worst.some(l=>l==='serious'||l==='dangerous')).toBe(true);
    });
    it(`${route.id} ${c.id}: every button is known, and the scene is set up for each stage`,()=>{
      for(const st of c.stages){
        expect(c.place[st.id],st.id).toBeTruthy();
        for(const b of st.buttons)expect(assessStage(c,st.id,[b]).faults.some(f=>f.ruleId.startsWith('unnecessary-')),`${st.id}: ${b}`).toBe(false);
      }
    });
    it(`${route.id} ${c.id}: the shared rules (one decision before and one after, turn buttons, interior mirror, Give way)`,()=>{
      expect(c.stages.length).toBeLessThanOrEqual(c.id==='leave-test-centre'?3:2);
      if(!AHEAD.has(c.id))expect(c.turn).toBeTruthy();
      for(const st of c.stages){
        if(c.turn&&st.id!=='stopped')for(const b of TURN_BUTTONS)expect(st.buttons,`${st.id}: ${b}`).toContain(b);
        if(st.wait==='give-way'||st.buttons.includes('slow-down')||c.place[st.id]?.pause.kind==='moving')expect(st.buttons,st.id).toContain('mirror-interior');
        if(st.wait)expect(st.wait).toBe('give-way');
      }
    });
  }
  it('eight challenges per route, sixteen different ones for the centre',()=>{
    for(const route of ROUTES)expect(route.challenges.length).toBe(8);
    const places=ROUTES.flatMap(r=>r.challenges.map(c=>c.where));
    expect(new Set(places).size).toBe(16);
  });
});

type Run=Awaited<ReturnType<typeof drive>>;
const keyOf=(p:Run['pauses'][number])=>`${p.at.challenge.id}/${p.at.stage.id}`;
/** Each pause as its challenge depicts it: stopped at a line, or on the move; the road user the moment waits for at its
 * point; the road user that matters close by. */
function asDepicted(r:Run,route:DecisionRoute){
  for(const p of r.pauses){
    const key=keyOf(p);
    if(p.at.place.pause.kind==='stop')expect(p.car.speed,key).toBeLessThan(.06);
    else expect(p.car.speed,key).toBeGreaterThan(1.5);
    const w=p.at.place.when;
    if(w){const a=p.actors[w.actor]!;expect(Math.hypot(a.x-w.at.x,a.z-w.at.z),`${key}: ${w.actor} at (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`).toBeLessThan(2)}
  }
  const at=(key:string)=>r.pauses.find(p=>keyOf(p)===key)!;
  const near=(key:string,actor:string)=>{const p=at(key),a=p.actors[actor]!;return Math.hypot(a.x-p.car.position.x,a.z-p.car.position.z)};
  if(route===SALISBURY_ROUTE_1){
    // The grey car coming up behind as the car is to move off; someone on the crossing in front at the red light.
    expect(near('denison-move-off/check','follow-car'),'grey car behind').toBeLessThan(30);
    expect(near('london-road-crossing/approach','crossing-pedestrian'),'pedestrian ahead').toBeLessThan(30);
  }else{
    expect(near('kelsey-move-off/check','pass-car'),'grey car behind').toBeLessThan(30);
    expect(near('castle-street-lights/approach','castle-pedestrian'),'pedestrian ahead').toBeLessThan(30);
  }
}

describe('Salisbury decision routes, driven',()=>{
  for(const route of ROUTES){
    it(`${route.id}: plans a way on the scene's roads, clear of the cars parked at the kerbs`,async()=>{
      const {place,kerb,keepClear}=await loadScene(route);
      const path=decisionPath(place,route,keepClear)!;
      expect(path&&path.length).toBeGreaterThan(500);
      expect(kerb.length).toBeGreaterThan(60);
      const near=(line:readonly {x:number;z:number}[])=>kerb.filter(k=>line.some((p,i)=>i>0&&segDistance(line[i-1]!,p,k)<k.halfWidth+1.2));
      expect(near(path)).toEqual([]);
      for(const a of route.actors)expect(near(a.path),a.id).toEqual([]);
    },60_000);
    it(`${route.id}: drives the right answers to a pass: each pause where it should be, the traffic as depicted, nothing hit, back at the centre`,async()=>{
      const r=await drive({},null,0,undefined,route);
      expect(r.result?.passed).toBe(true);
      expect(r.result?.faults).toEqual([]);
      expect(r.pauses.map(keyOf)).toEqual(PAUSES[route.id]);
      asDepicted(r,route);
      expect(r.said.filter(t=>t!==TO_NEXT&&t!==BACK_TO_CENTRE)).toEqual(route.challenges.map(c=>c.instruction));
      expect(r.said).toContain(TO_NEXT);
      expect(r.closest,r.closestWho).toBeGreaterThan(2.2);
      expect(r.offRoad,r.offAt.join('; ')).toBe(0);
      expect(r.redRun,r.redAt.join('; ')).toBe(0);
      expect(r.fixedHits).toEqual([]);
      const end=END[route.id]!;
      expect(Math.hypot(r.car.position.x-end.x,r.car.position.z-end.z)).toBeLessThan(12);
    },900_000);
  }
});

describe('Salisbury decision routes with Skip ahead pressed whenever it is offered',()=>{
  for(const route of ROUTES)it(`${route.id}: every challenge still comes, as depicted, with traffic about; the drive is shorter`,async()=>{
    const r=await drive({},null,30,4,route,true);
    console.log(`${route.id} with skips: ${r.skips} skips, ${Math.round(r.driven)} s driven`);
    expect(r.skips).toBeGreaterThan(1);
    expect(r.result?.passed).toBe(true);
    expect(r.result?.faults).toEqual([]);
    expect(r.pauses.map(keyOf)).toEqual(PAUSES[route.id]);
    asDepicted(r,route);
    expect(r.pauses.flatMap(p=>p.quiet)).toEqual([]);
    expect(r.metWho).toEqual([]);
    expect(r.closest).toBeGreaterThan(2.2);
    expect(r.redRun,r.redAt.join('; ')).toBe(0);
    expect(r.offRoad,r.offAt.join('; ')).toBe(0);
    expect(r.fixedHits).toEqual([]);
    expect(Math.hypot(r.car.position.x-END[route.id]!.x,r.car.position.z-END[route.id]!.z)).toBeLessThan(12);
  },1_500_000);
});

describe('Salisbury decision routes with background traffic',()=>{
  for(const route of ROUTES)for(const seed of [4,14]){
    it(`${route.id}: drives the right answers to a pass as depicted, with traffic about (pattern ${seed})`,async()=>{
      const r=await drive({},null,30,seed,route);
      console.log(`${route.id} pattern ${seed}: ${r.nearby.toFixed(1)} road users within 100 m on average; closest ${r.closestTraffic.toFixed(2)} ${r.closestTrafficWho}; stand ${r.longestStand.toFixed(1)} ${r.standAt}`);
      expect(r.result?.passed).toBe(true);
      expect(r.result?.faults).toEqual([]);
      expect(r.pauses.map(keyOf)).toEqual(PAUSES[route.id]);
      asDepicted(r,route);
      expect(r.pauses.flatMap(p=>p.quiet)).toEqual([]);
      expect(r.metWho).toEqual([]);
      expect(r.closestTraffic,r.closestTrafficWho).toBeGreaterThan(.25);
      expect(r.closest).toBeGreaterThan(2.2);
      expect(r.redRun,r.redAt.join('; ')).toBe(0);
      expect(r.offRoad,r.offAt.join('; ')).toBe(0);
      expect(r.fixedHits).toEqual([]);
      expect(r.longestStand,r.standAt).toBeLessThan(45);
    },1_500_000);
  }
});
