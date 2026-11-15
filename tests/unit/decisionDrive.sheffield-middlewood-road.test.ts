import {describe,expect,it} from 'vitest';
import {decisionPath} from '../../src/decision/plan';
import {SHEFFIELD_MIDDLEWOOD_ROUTE_1} from '../../src/decision/routes/sheffieldMiddlewoodRoute1';
import {SHEFFIELD_MIDDLEWOOD_ROUTE_2} from '../../src/decision/routes/sheffieldMiddlewoodRoute2';
import {assessStage} from '../../src/decision/assess';
import {TURN_BUTTONS} from '../../src/decision/turnButtons';
import type {DecisionRoute} from '../../src/decision/route';
import {drive,loadScene,segDistance} from './decisionDrive';
import {BACK_TO_CENTRE,TO_NEXT} from '../../src/decision/runner';

/** Sheffield (Middlewood Road)'s decision routes driven headless (as tests/unit/decisionDrive.test.ts drives Brentwood
 * and Chelmsford): every pause of each route driven right, in order. */
const PAUSES:Record<string,string[]>={
  'sheffield-middlewood-road-1':['leave-test-centre/footway','leave-test-centre/line','leave-test-centre/clear',
    'langsett-right/approach','langsett-right/clear',
    'worrall-emerge/approach','worrall-emerge/clear',
    'wadsley-pull-up/approach','wadsley-pull-up/stopped',
    'wadsley-move-off/check','wadsley-move-off/clear',
    'middlewood-crossing/approach','middlewood-crossing/clear',
    'catch-bar-lights/approach','catch-bar-lights/clear',
    'winn-gardens-right/approach','winn-gardens-right/clear'],
  'sheffield-middlewood-road-2':['leave-test-centre/approach','leave-test-centre/clear',
    'parkside-lights/approach','parkside-lights/green','parkside-lights/clear',
    'southey-green-right/approach','southey-green-right/clear',
    'southey-green-roundabout/approach','southey-green-roundabout/clear',
    'wordsworth-pull-up/approach','wordsworth-pull-up/stopped',
    'wordsworth-move-off/check','wordsworth-move-off/clear',
    'wordsworth-emerge/approach','wordsworth-emerge/clear',
    'herries-lights/approach','herries-lights/clear']
};
/** Where each drive ends: back in the test centre's car park off Winn Gardens. */
const END:Record<string,{x:number;z:number}>={
  'sheffield-middlewood-road-1':{x:-69,z:-612.5},'sheffield-middlewood-road-2':{x:-844,z:-772.8}
};
const ROUTES:DecisionRoute[]=[SHEFFIELD_MIDDLEWOOD_ROUTE_1,SHEFFIELD_MIDDLEWOOD_ROUTE_2];

type Run=Awaited<ReturnType<typeof drive>>;
const keyOf=(p:Run['pauses'][number])=>`${p.at.challenge.id}/${p.at.stage.id}`;
/** Each pause as its challenge depicts it: stopped at a line, or on the move; the road user the moment waits for at its
 * point. */
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
  if(route===SHEFFIELD_MIDDLEWOOD_ROUTE_1){
    // The pedestrian about to cross the way out in front; the grey car close behind as the car is to move off.
    expect(near('leave-test-centre/footway','tc-pedestrian'),'pedestrian in front').toBeLessThan(9);
    expect(near('wadsley-move-off/check','wadsley-car'),'grey car behind').toBeLessThan(30);
  }else if(route===SHEFFIELD_MIDDLEWOOD_ROUTE_2){
    // Still on the crossing as the lights turn green; the cyclist close behind as the car is to move off.
    expect(near('parkside-lights/green','parkside-pedestrian'),'pedestrian ahead').toBeLessThan(12);
    expect(near('wordsworth-move-off/check','cyclist'),'cyclist behind').toBeLessThan(30);
  }
}

/** The rules every route keeps (as tests/unit/decision.test.ts checks the routes in DECISION_ROUTES). */
describe('Sheffield (Middlewood Road) decision challenges as authored',()=>{
  // (Two hazards at one place: someone on the footway then a car (leaving the car park); red lights then someone
  // crossing on green (Leppings Lane).)
  const third=new Set(['leave-test-centre','parkside-lights']);
  const ahead=new Set(['middlewood-crossing','catch-bar-lights']);
  for(const route of ROUTES)for(const c of route.challenges){
    it(`${route.id} ${c.id}: accepted orders fault-free, every button known, every button pressed fails, turns show both signals and all mirrors`,()=>{
      for(const st of c.stages)for(const seq of st.accepted)expect(assessStage(c,st.id,seq).faults,`${st.id}: ${seq.join(', ')}`).toEqual([]);
      const worst=c.stages.flatMap(st=>assessStage(c,st.id,st.buttons).faults.map(f=>f.level));
      expect(worst.some(l=>l==='serious'||l==='dangerous')).toBe(true);
      for(const st of c.stages)for(const b of st.buttons)expect(assessStage(c,st.id,[b]).faults.some(f=>f.ruleId.startsWith('unnecessary-')),`${st.id}: ${b}`).toBe(false);
      if(c.turn)for(const st of c.stages.filter(x=>x.id!=='stopped'))for(const b of TURN_BUTTONS)expect(st.buttons,`${st.id}: ${b}`).toContain(b);
      for(const st of c.stages){
        expect(c.place[st.id],st.id).toBeTruthy();
        if(st.wait)expect(st.wait).toBe('give-way');
        if(st.wait==='give-way'||st.buttons.includes('slow-down')||c.place[st.id]?.pause.kind==='moving')expect(st.buttons,`${c.id}/${st.id}`).toContain('mirror-interior');
      }
      expect(c.stages.length,c.id).toBeLessThanOrEqual(third.has(c.id)?3:2);
      if(!ahead.has(c.id))expect(c.turn,c.id).toBeTruthy();
    });
  }
});

describe('Sheffield (Middlewood Road) decision routes, driven',()=>{
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

describe('Sheffield (Middlewood Road) decision routes with Skip ahead pressed whenever it is offered',()=>{
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

describe('Sheffield (Middlewood Road) decision routes with background traffic',()=>{
  for(const route of ROUTES)for(const seed of [4,14]){
    it(`${route.id}: drives the right answers to a pass as depicted, with traffic about (pattern ${seed})`,async()=>{
      const r=await drive({},null,30,seed,route);
      console.log(`${route.id} pattern ${seed}: ${r.nearby.toFixed(1)} road users within 100 m on average, ${r.ahead.toFixed(1)} of them ahead; quiet ${JSON.stringify(r.pauses.map(p=>p.quiet))}; met ${r.metWho}; closest ${r.closestTraffic.toFixed(2)} ${r.closestTrafficWho}; stand ${r.longestStand.toFixed(1)} ${r.standAt}`);
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
