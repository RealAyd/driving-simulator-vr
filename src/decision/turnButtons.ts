import type {Stage,StageRule} from './assess';
import type {ChallengeDef,DecisionRoute} from './route';

/** Shown at every stage of a challenge with a turn (the owner's rule): the learner always chooses among them. The
 * interior mirror too: before slowing down or giving way, it is the first check. */
export const TURN_BUTTONS=['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'] as const;

/** Stages where the car stands still to be secured (handbrake, neutral), not a decision about the turn. */
const SECURING=new Set(['stopped']);

/**
 * Each stage of a challenge with a turn shows both signals and all three mirrors, before its decision buttons. One
 * the stage's rules do not already mark: a mirror is harmless (neutral); the signal for the way the car is going is
 * harmless too (kept on); the other way is a serious fault (it misleads everyone round the car).
 */
export function withTurnButtons(route:DecisionRoute):DecisionRoute{
  return {...route,challenges:route.challenges.map(c=>c.turn?{...c,stages:c.stages.map(st=>SECURING.has(st.id)?st:turnStage(c,st,c.turn!))}:c)};
}

function turnStage(c:ChallengeDef,st:Stage,turn:'left'|'right'):Stage{
  const missing=TURN_BUTTONS.filter(b=>!st.buttons.includes(b));
  if(!missing.length)return st;
  // (Before the decision buttons: they stay last.)
  const decision=new Set([st.go,st.wait].filter(Boolean));
  const at=st.buttons.findIndex(b=>decision.has(b));
  const buttons=at<0?[...st.buttons,...missing]:[...st.buttons.slice(0,at),...missing,...st.buttons.slice(at)];
  const named=new Set([...st.neutral??[],...st.accepted.flat(),...st.rules.flatMap(r=>'action' in r?[r.action]:[])]);
  const wrong=turn==='left'?'signal-right':'signal-left';
  const neutral=[...st.neutral??[]],rules:StageRule[]=[...st.rules];
  for(const b of missing){
    if(named.has(b))continue;
    if(b===wrong)rules.push({kind:'distractor',id:`wrong-signal`,action:b,fault:{level:'serious',heading:'Signals - correctly',
      title:'Signal for the wrong way',message:`You are going ${turn}: a ${turn==='left'?'right':'left'} signal misleads everyone round you.`}});
    else neutral.push(b);
  }
  return {...st,buttons,neutral,rules};
}
