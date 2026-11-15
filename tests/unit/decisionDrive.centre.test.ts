import {describe,expect,it} from 'vitest';
import {assessStage} from '../../src/decision/assess';
import {decisionPath} from '../../src/decision/plan';
import {TURN_BUTTONS} from '../../src/decision/turnButtons';
import {DECISION_ROUTES} from '../../src/decision/routes';
import type {DecisionRoute} from '../../src/decision/route';
import {BACK_TO_CENTRE,JAM_AFTER,TO_NEXT} from '../../src/decision/runner';
import {drive,loadScene,segDistance} from './decisionDrive';

/**
 * Any centre's decision routes, checked and driven headless as the pilots were: the authoring rules, the planned way
 * clear of parked cars, and each route driven with the right answers, without and with background traffic (patterns
 * 4 and 14), and with Skip ahead. A new centre needs no test file of its own for these; only checks of its own
 * moments (a cyclist close behind as the car moves off) go in one.
 *
 *   CENTRE=morden-london npx vitest run tests/unit/decisionDrive.centre.test.ts        (a centre's routes)
 *   ROUTES=morden-london-1 npx vitest run tests/unit/decisionDrive.centre.test.ts      (one route)
 *
 * Driving takes minutes a route, so nothing runs without CENTRE or ROUTES.
 */
const env=(k:string)=>(globalThis as {process?:{env:Record<string,string|undefined>}}).process?.env[k];
const wanted=env('ROUTES')?.split(',').map(s=>s.trim()).filter(Boolean);
const centre=env('CENTRE');
const ROUTES:DecisionRoute[]=DECISION_ROUTES.filter(r=>wanted?wanted.includes(r.id):!!centre&&r.id.replace(/-\d+$/,'')===centre);

const levels=(v:{faults:{level:string}[]})=>v.faults.map(f=>f.level);
type Run=Awaited<ReturnType<typeof drive>>;
const keyOf=(p:Run['pauses'][number])=>`${p.at.challenge.id}/${p.at.stage.id}`;

(ROUTES.length?describe:describe.skip)(`decision routes${centre?` for ${centre}`:''}: as authored`,()=>{
  for(const route of ROUTES){
    it(`${route.id}: eight challenges, the decision rules every route keeps`,()=>{
      expect(route.challenges).toHaveLength(8);
      expect(new Set(route.challenges.map(c=>c.id)).size).toBe(8);
      for(const c of route.challenges){
        // (The number of stages and the turn each says are checked for every route in tests/unit/decision.test.ts.)
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
      const near=(line:readonly {x:number;z:number}[])=>kerb.filter(k=>line.some((p,i)=>i>0&&segDistance(line[i-1]!,p,k)<k.halfWidth+1.2));
      expect(near(path)).toEqual([]);
      for(const a of route.actors)expect(near(a.path),a.id).toEqual([]);
    },120_000);
  }
});

/** Every pause in order (each stage of each challenge); each as depicted: stopped at a line or on the move, the road
 * user the moment waits for at its point. */
function drivenRight(r:Run,route:DecisionRoute,end:{x:number;z:number}){
  expect(r.result?.passed).toBe(true);
  expect(r.result?.faults).toEqual([]);
  expect(r.pauses.map(keyOf)).toEqual(route.challenges.flatMap(c=>c.stages.map(st=>`${c.id}/${st.id}`)));
  for(const p of r.pauses){
    const key=keyOf(p);
    if(p.at.place.pause.kind==='stop')expect(p.car.speed,key).toBeLessThan(.06);
    else expect(p.car.speed,key).toBeGreaterThan(1.5);
    const w=p.at.place.when;
    if(w){const a=p.actors[w.actor]!;expect(Math.hypot(a.x-w.at.x,a.z-w.at.z),`${key}: ${w.actor} at (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`).toBeLessThan(2)}
  }
  expect(r.closest,r.closestWho).toBeGreaterThan(2.2);
  expect(r.offRoad,r.offAt.join('; ')).toBe(0);
  expect(r.redRun,r.redAt.join('; ')).toBe(0);
  expect(r.fixedHits).toEqual([]);
  expect(Math.hypot(r.car.position.x-end.x,r.car.position.z-end.z),'at the end of the route').toBeLessThan(12);
}
/** With traffic: none of it in a junction in hand when the scene stops, nothing touching, never stuck (a queue is
 * cleared after JAM_AFTER seconds, so a stand can reach that and no more). */
function trafficRight(r:Run){
  expect(r.pauses.flatMap(p=>p.quiet)).toEqual([]);
  expect(r.metWho).toEqual([]);
  expect(r.closestTraffic,r.closestTrafficWho).toBeGreaterThan(.25);
  expect(r.longestStand,r.standAt).toBeLessThan(JAM_AFTER+2);
}
async function endOf(route:DecisionRoute){
  const {place,keepClear}=await loadScene(route);
  return decisionPath(place,route,keepClear)!.at(-1)!;
}

(ROUTES.length?describe:describe.skip)(`decision routes${centre?` for ${centre}`:''}: driven`,()=>{
  for(const route of ROUTES){
    it(`${route.id}: drives the right answers to a pass, each pause as depicted, nothing hit`,async()=>{
      const r=await drive({},null,0,undefined,route);
      drivenRight(r,route,await endOf(route));
      expect(r.said.filter(t=>t!==TO_NEXT&&t!==BACK_TO_CENTRE)).toEqual(route.challenges.map(c=>c.instruction));
    },1_800_000);
    for(const seed of [4,14])it(`${route.id}: with background traffic (pattern ${seed})`,async()=>{
      const r=await drive({},null,30,seed,route);
      console.log(`${route.id} pattern ${seed}: closest traffic ${r.closestTraffic.toFixed(2)} ${r.closestTrafficWho}; stand ${r.longestStand.toFixed(1)} ${r.standAt}`);
      drivenRight(r,route,await endOf(route));
      trafficRight(r);
    },2_400_000);
    it(`${route.id}: with Skip ahead pressed whenever it is offered, every challenge still comes as depicted`,async()=>{
      const r=await drive({},null,30,4,route,true);
      console.log(`${route.id} with skips: ${r.skips} skips, ${Math.round(r.driven)} s driven`);
      expect(r.skips).toBeGreaterThan(0);
      drivenRight(r,route,await endOf(route));
      trafficRight(r);
    },2_400_000);
  }
});
