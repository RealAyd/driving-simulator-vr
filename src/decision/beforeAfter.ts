import type {Stage} from './assess';
import type {ChallengeDef,DecisionRoute,StagePlace} from './route';

/**
 * The owner's rule: one decision before and one after at each challenge (an extra one only where two different hazards
 * meet at one place, as a pedestrian and then a car leaving the test centre). A challenge written as an approach
 * (mirrors, signal) and a decision at the line becomes one "before" decision, taken close in, where the junction and
 * what is coming are both in view: the checks, the signal and the decision in one order. The "after" decision (going
 * once it is clear) stays as it is.
 */
export interface BeforeMerge{
  /** The stage that stays first (its id is kept), and the one merged into it (dropped). */
  first:string;second:string;
  /** Where the merged decision is taken (on the move, close in) and what the camera shows. */
  place:StagePlace;
}

export function withBeforeAfter(route:DecisionRoute,merges:Readonly<Record<string,BeforeMerge>>):DecisionRoute{
  return {...route,challenges:route.challenges.map(c=>merges[c.id]?merged(c,merges[c.id]!):c)};
}

function merged(c:ChallengeDef,m:BeforeMerge):ChallengeDef{
  const a=c.stages.find(s=>s.id===m.first),b=c.stages.find(s=>s.id===m.second);
  if(!a||!b)throw new Error(`${c.id}: no stage ${a?m.second:m.first} to merge`);
  const rules=[...a.rules,...b.rules.filter(r=>!a.rules.some(x=>x.id===r.id))];
  const actions=new Set(rules.flatMap(r=>'action' in r?[r.action]:[]));
  const unique=(xs:readonly string[])=>[...new Set(xs)];
  const stage:Stage={
    id:a.id,
    buttons:unique([...a.buttons,...b.buttons]),
    ...(b.go?{go:b.go}:{}),...(b.wait?{wait:b.wait}:{}),
    safe:b.safe,
    rules,
    neutral:unique([...a.neutral??[],...b.neutral??[]]).filter(x=>!actions.has(x)),
    // (Each safe order of the checks, then each safe order of the decision.)
    accepted:a.accepted.flatMap(x=>b.accepted.map(y=>[...x,...y])),
    next:b.next,
    explain:`${a.explain} ${b.explain}`
  };
  const place={...c.place,[a.id]:m.place};
  delete place[b.id];
  return {...c,stages:c.stages.filter(s=>s!==b).map(s=>s===a?stage:s),place};
}
