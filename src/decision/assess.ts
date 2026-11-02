/**
 * Decision mock tests: the learner sees a junction paused at the moment of decision, picks the observations and
 * actions in order, and the choice is judged against what the picture shows. Pure: no scene, no clock, no DOM.
 *
 * Judging works from rules, not from one model answer, so any safe order the rules allow passes:
 * - `before`: an action needs others earlier (mirrors before signalling). Missed at the moment the action is taken and
 *   recorded then: a check made afterwards does not undo it.
 * - `required`: something that has to be done in this stage (a look right before going), judged when submitted.
 * - `unsafe`: a decision that would put the road users shown at risk (the car is held: an intervention).
 * - `hesitation`: waiting when the stage shows a clear, safe opportunity. Only in such stages, and only from the
 *   decision chosen: time spent reading or thinking while paused never counts.
 * - `distractor`: a plausible wrong action, with its own fault level (or feedback only).
 * Anything pressed that no rule, neutral list or accepted sequence names is an unnecessary action (feedback only).
 */

/** A fault level on this app's scale (minor, serious, dangerous), or feedback with no fault. */
export type FaultLevel='minor'|'serious'|'dangerous'|'feedback';

export interface Fault{
  level:FaultLevel;
  /** Marking sheet heading it falls under (DL25 wording), for the results. */
  heading:string;
  title:string;
  /** What went wrong in this situation, and what to do instead. */
  message:string;
}

export type StageRule=
  |{kind:'before';id:string;action:string;
    /** Each of these must come before `action` (in this stage, or earlier in the challenge with `scope`). */
    needs:readonly string[];
    /** Enough that one of `needs` came first (a look either way, say). */
    any?:boolean;scope?:'stage'|'challenge';fault:Fault}
  |{kind:'required';id:string;
    /** One of these must be in the stage's sequence... */
    anyOf:readonly string[];
    /** ...when the learner decides this (default: whatever is decided). */
    when?:'go'|'wait';scope?:'stage'|'challenge';fault:Fault}
  |{kind:'unsafe';id:string;action:string;fault:Fault}
  |{kind:'hesitation';id:string;fault:Fault}
  |{kind:'distractor';id:string;action:string;fault:Fault};

export interface Stage{
  id:string;
  /** The buttons shown, in the order shown (the observations, the actions and the plausible wrong ones). */
  buttons:readonly string[];
  /** The action that commits (goes), and the one that waits, where this stage asks for a decision. */
  go?:string;wait?:string;
  /** What the picture shows: going is safe ('go'), waiting is needed ('wait'), or no decision yet ('approach'). */
  safe:'go'|'wait'|'approach';
  rules:readonly StageRule[];
  /** Harmless here: no fault and no credit. */
  neutral?:readonly string[];
  /** Safe sequences (each judged fault-free; checked by the tests). */
  accepted:readonly (readonly string[])[];
  /** Where the challenge goes next: after waiting, after going, or after an approach stage. */
  next:{wait?:string;go?:string;then?:string};
  /** What the right decision was here and why (results screen). */
  explain:string;
}

export interface ChallengeLogic{
  id:string;
  stages:readonly Stage[];
}

export interface RecordedFault extends Fault{
  challengeId:string;stageId:string;ruleId:string;
  /** Position in the stage's sequence at which it was committed (null: judged at the end, an omission). */
  at:number|null;
}

export interface StageVerdict{
  decision:'go'|'wait'|'none';
  faults:RecordedFault[];
  /** The simulator held the car: going here was unsafe. */
  intervened:boolean;
  /** The stage that follows ('done' ends the challenge). */
  next:string;
}

/** Actions done earlier in this challenge (for rules scoped to the challenge). */
export type ChallengeHistory=ReadonlyMap<string,readonly string[]>;

/** Judges one stage's sequence (the buttons pressed, in order). */
export function assessStage(challenge:ChallengeLogic,stageId:string,sequence:readonly string[],history:ChallengeHistory=new Map()):StageVerdict{
  const stage=challenge.stages.find(s=>s.id===stageId);
  if(!stage)throw new Error(`No stage ${stageId} in ${challenge.id}`);
  const faults:RecordedFault[]=[];
  const record=(rule:{id:string;fault:Fault},at:number|null)=>{
    if(faults.some(f=>f.ruleId===rule.id))return;
    faults.push({...rule.fault,challengeId:challenge.id,stageId,ruleId:rule.id,at});
  };
  const earlier=new Set([...history].filter(([id])=>id!==stageId).flatMap(([,seq])=>seq));
  // The decision is the first of go and wait (the buttons lock once one is chosen; a second is ignored).
  const decidedAt=sequence.findIndex(a=>a===stage.go||a===stage.wait);
  const decision:'go'|'wait'|'none'=decidedAt<0?'none':sequence[decidedAt]===stage.go?'go':'wait';
  const judged=decidedAt<0?sequence:sequence.slice(0,decidedAt+1);
  const named=new Set<string>([...stage.neutral??[],...stage.accepted.flat(),stage.go??'',stage.wait??'']);
  for(const r of stage.rules)if('action' in r)named.add(r.action);
  const done=new Set<string>();
  judged.forEach((a,i)=>{
    if(done.has(a))return;
    for(const r of stage.rules){
      if(r.kind==='before'&&r.action===a){
        const has=(n:string)=>done.has(n)||(r.scope==='challenge'&&earlier.has(n));
        if(r.any?!r.needs.some(has):!r.needs.every(has))record(r,i);
      }
      else if((r.kind==='distractor'||r.kind==='unsafe')&&r.action===a)record(r,i);
    }
    if(!named.has(a))record({id:`unnecessary-${a}`,fault:{level:'feedback',heading:'Planning',title:'Not needed here',message:'Nothing in this situation called for that. Keep to the checks and actions that matter here.'}},i);
    done.add(a);
  });
  for(const r of stage.rules){
    if(r.kind==='required'&&(!r.when||r.when===decision)){
      const has=(n:string)=>done.has(n)||(r.scope==='challenge'&&earlier.has(n));
      if(!r.anyOf.some(has))record(r,null);
    }
    if(r.kind==='hesitation'&&stage.safe==='go'&&decision!=='go')record(r,null);
  }
  const intervened=decision==='go'&&stage.safe==='wait';
  const next=stage.safe==='approach'?stage.next.then??'done':decision==='go'&&!intervened?stage.next.go??'done'
    :stage.safe==='go'?stage.next.go??'done':stage.next.wait??'done';
  return {decision,faults,intervened,next};
}

const WORST:Record<FaultLevel,number>={feedback:0,minor:1,serious:2,dangerous:3};

export interface DecisionResult{
  /** The app's assessment (not a DVSA result): no serious or dangerous fault, and at most 15 minor ones. */
  passed:boolean;
  minor:number;serious:number;dangerous:number;
  interventions:number;
  faults:RecordedFault[];
  /** Per challenge: the worst fault level (null: none), in the order driven. */
  challenges:{id:string;worst:FaultLevel|null}[];
}

/** The test so far: every fault recorded, in the order made, with the counts and the app's verdict. */
export function summarise(order:readonly string[],verdicts:readonly {challengeId:string;verdict:StageVerdict}[]):DecisionResult{
  const faults=verdicts.flatMap(v=>v.verdict.faults);
  const count=(l:FaultLevel)=>faults.filter(f=>f.level===l).length;
  const minor=count('minor'),serious=count('serious'),dangerous=count('dangerous');
  return {
    passed:serious===0&&dangerous===0&&minor<=15,minor,serious,dangerous,
    interventions:verdicts.filter(v=>v.verdict.intervened).length,
    faults,
    challenges:order.map(id=>{
      const levels=faults.filter(f=>f.challengeId===id).map(f=>f.level);
      return {id,worst:levels.length?levels.reduce((a,b)=>WORST[b]>WORST[a]?b:a):null};
    })
  };
}

/** The worse of two levels. */
export const worse=(a:FaultLevel|null,b:FaultLevel|null):FaultLevel|null=>a===null?b:b===null?a:WORST[b]>WORST[a]?b:a;
