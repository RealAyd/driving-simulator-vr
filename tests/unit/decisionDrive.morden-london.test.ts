import {describe,expect,it} from 'vitest';
import {assessStage} from '../../src/decision/assess';
import {decisionPath} from '../../src/decision/plan';
import {TURN_BUTTONS} from '../../src/decision/turnButtons';
import {MORDEN_ROUTE_1} from '../../src/decision/routes/mordenRoute1';
import {MORDEN_ROUTE_2} from '../../src/decision/routes/mordenRoute2';
import type {DecisionRoute} from '../../src/decision/route';
import {BACK_TO_CENTRE,TO_NEXT} from '../../src/decision/runner';
import {drive,loadScene,segDistance} from './decisionDrive';

/** The Morden (London) pilot routes: the authoring rules every route keeps (tests/unit/decision.test.ts), and each
 * route driven headless with the right answers, without and with background traffic, and with Skip ahead. */
const ROUTES:DecisionRoute[]=[MORDEN_ROUTE_1,MORDEN_ROUTE_2];

/** Every pause of each route driven right, in order. */
const PAUSES:Record<string,string[]>={
  'morden-london-1':['leave-test-centre/approach','leave-test-centre/green','leave-test-centre/clear',
    'forest-road-mini/approach','forest-road-mini/clear',
    'forest-pull-up/approach','forest-pull-up/stopped',
    'forest-move-off/check','forest-move-off/clear',
    'reigate-emerge/approach','reigate-emerge/clear',
    'sutton-zebra/approach','sutton-zebra/clear',
    'elm-road-emerge/approach','elm-road-emerge/clear',
    'centre-right/approach','centre-right/clear'],
  'morden-london-2':['leave-test-centre/line','leave-test-centre/left','leave-test-centre/clear',
    'tudor-zebra/approach','tudor-zebra/clear',
    'beverley-roundabout/approach','beverley-roundabout/clear',
    'cannon-hill-lights/approach','cannon-hill-lights/clear',
    'churston-mini/approach','churston-mini/clear',
    'churston-pull-up/approach','churston-pull-up/stopped',
    'churston-move-off/check','churston-move-off/clear',
    'hillcross-emerge/approach','hillcross-emerge/clear']
};
/** Where each drive ends: back in the test centre's service road (route 1, in by the Epsom Road end), or on Tudor
 * Drive at its way out (route 2). */
const END:Record<string,{x:number;z:number}>={'morden-london-1':{x:-770.4,z:151.5},'morden-london-2':{x:466,z:537.5}};
/** Challenges that go ahead (no turn to signal). */
const AHEAD=new Set(['leave-test-centre','sutton-zebra','tudor-zebra','beverley-roundabout','churston-mini']);

const levels=(v:{faults:{level:string}[]})=>v.faults.map(f=>f.level);

describe('Morden routes as authored',()=>{
  for(const route of ROUTES){
    it(`${route.id}: eight challenges, the decision rules every route keeps`,()=>{
      expect(route.challenges).toHaveLength(8);
      expect(new Set(route.challenges.map(c=>c.id)).size).toBe(8);
      for(const c of route.challenges){
        // One decision before and one after; a third only leaving the test centre (two hazards at one place).
        expect(c.stages.length,c.id).toBeLessThanOrEqual(c.id==='leave-test-centre'?3:2);
        if(!AHEAD.has(c.id)||route===MORDEN_ROUTE_2&&c.id==='leave-test-centre')expect(c.turn,c.id).toBeTruthy();
        for(const st of c.stages){
          expect(c.place[st.id],`${c.id}/${st.id}`).toBeTruthy();
          for(const seq of st.accepted)expect(assessStage(c,st.id,seq).faults,`${c.id}/${st.id}: ${seq.join(', ')}`).toEqual([]);
          for(const b of st.buttons)expect(assessStage(c,st.id,[b]).faults.some(f=>f.ruleId.startsWith('unnecessary-')),`${c.id}/${st.id}: ${b}`).toBe(false);
          if(st.wait)expect(st.wait).toBe('give-way');
          expect(st.buttons).not.toContain('wait');
          if(st.wait==='give-way'||st.buttons.includes('slow-down')||c.place[st.id]?.pause.kind==='moving')expect(st.buttons,`${c.id}/${st.id}`).toContain('mirror-interior');
          if(c.turn&&st.id!=='stopped')for(const b of TURN_BUTTONS)expect(st.buttons,`${c.id}/${st.id}: ${b}`).toContain(b);
        }
        // Pressing every button never passes.
        expect(c.stages.flatMap(st=>levels(assessStage(c,st.id,st.buttons))).some(l=>l==='serious'||l==='dangerous'),c.id).toBe(true);
      }
    });
    it(`${route.id}: plans a way through the route on the scene's roads, clear of the cars parked at the kerbs`,async()=>{
      const {place,kerb,keepClear}=await loadScene(route);
      const path=decisionPath(place,route,keepClear)!;
      expect(path&&path.length).toBeGreaterThan(500);
      expect(kerb.length).toBeGreaterThan(60);
      const near=(line:readonly {x:number;z:number}[])=>kerb.filter(k=>line.some((p,i)=>i>0&&segDistance(line[i-1]!,p,k)<k.halfWidth+1.2));
      expect(near(path)).toEqual([]);
      for(const a of route.actors)expect(near(a.path),a.id).toEqual([]);
    },120_000);
  }
});

type Run=Awaited<ReturnType<typeof drive>>;
const keyOf=(p:Run['pauses'][number])=>`${p.at.challenge.id}/${p.at.stage.id}`;
/** Each pause as its challenge depicts it: stopped at a line, or on the move; the road user the moment waits for at its
 * point; the road users that make the moment close by. */
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
  if(route===MORDEN_ROUTE_1){
    // Still crossing Sutton Common Road, across the junction, as the lights turn green; the cyclist close behind as
    // the car is to move off; the silver car coming through the lights as the car waits to turn in.
    expect(near('leave-test-centre/green','crossing-pedestrian'),'pedestrian ahead').toBeLessThan(50);
    expect(near('forest-move-off/check','cyclist'),'cyclist behind').toBeLessThan(25);
    expect(near('centre-right/approach','stonecot-car'),'silver car coming').toBeLessThan(90);
  }else{
    // The white car close as the car waits to pull out, then the blue car out of the lights; the grey car close
    // behind as the car is to move off.
    expect(near('leave-test-centre/line','tudor-car'),'white car').toBeLessThan(30);
    expect(near('leave-test-centre/left','lights-car'),'blue car').toBeLessThan(30);
    expect(near('churston-move-off/check','churston-car'),'grey car behind').toBeLessThan(25);
  }
}
/** What every drive checks: a pass, every pause as depicted, nothing hit, no red light run, on the road, back at the
 * end. */
function drivenRight(r:Run,route:DecisionRoute){
  expect(r.result?.passed).toBe(true);
  expect(r.result?.faults).toEqual([]);
  expect(r.pauses.map(keyOf)).toEqual(PAUSES[route.id]);
  asDepicted(r,route);
  expect(r.closest,r.closestWho).toBeGreaterThan(2.2);
  expect(r.offRoad,r.offAt.join('; ')).toBe(0);
  expect(r.redRun,r.redAt.join('; ')).toBe(0);
  expect(r.fixedHits).toEqual([]);
  const end=END[route.id]!;
  expect(Math.hypot(r.car.position.x-end.x,r.car.position.z-end.z)).toBeLessThan(12);
}
/** And with traffic about: none of it in a junction in hand when the scene stops, nothing touching, never stuck. */
function trafficRight(r:Run){
  expect(r.pauses.flatMap(p=>p.quiet)).toEqual([]);
  expect(r.metWho).toEqual([]);
  expect(r.closestTraffic,r.closestTrafficWho).toBeGreaterThan(.25);
  expect(r.longestStand,r.standAt).toBeLessThan(45);
}

describe('Morden routes, driven',()=>{
  for(const route of ROUTES){
    it(`${route.id}: drives the right answers to a pass, each pause as depicted, nothing hit`,async()=>{
      const r=await drive({},null,0,undefined,route);
      drivenRight(r,route);
      // The directions, in order; and between challenges far apart, that the drive goes on to the next.
      expect(r.said.filter(t=>t!==TO_NEXT&&t!==BACK_TO_CENTRE)).toEqual(route.challenges.map(c=>c.instruction));
      expect(r.said).toContain(TO_NEXT);
    },900_000);
    for(const seed of [4,14])it(`${route.id}: with background traffic (pattern ${seed})`,async()=>{
      const r=await drive({},null,30,seed,route);
      console.log(`${route.id} pattern ${seed}: closest traffic ${r.closestTraffic.toFixed(2)} ${r.closestTrafficWho}; stand ${r.longestStand.toFixed(1)} ${r.standAt}`);
      drivenRight(r,route);
      trafficRight(r);
    },1_500_000);
    it(`${route.id}: with Skip ahead pressed whenever it is offered, every challenge still comes as depicted`,async()=>{
      const r=await drive({},null,30,4,route,true);
      console.log(`${route.id} with skips: ${r.skips} skips, ${Math.round(r.driven)} s driven`);
      expect(r.skips).toBeGreaterThan(1);
      drivenRight(r,route);
      trafficRight(r);
    },1_500_000);
  }
});
