import type {FaultLevel,RecordedFault} from './assess';
import type {DecisionRunResult} from './runner';

/** A decision mock test as saved with the attempt and shown on the results screen (plain data). */
export interface DecisionReport{
  route:string;title:string;
  /** One challenge practised from the results (not the whole test). */
  practice:boolean;
  passed:boolean;minor:number;serious:number;dangerous:number;interventions:number;
  challenges:Array<{
    id:string;title:string;where:string;instruction:string;
    /** Where in the route (0-based), for practising it again. */
    index:number;
    worst:FaultLevel|null;
    /** Each decision: what was chosen, what was marked, and what the right decision was there. */
    decisions:Array<{stageId:string;state:string;sequence:string[];faults:RecordedFault[];explain:string;intervened:boolean}>;
  }>;
}

export function decisionReport(r:DecisionRunResult):DecisionReport{
  return {
    route:r.route.id,title:r.route.title,practice:r.practice,
    passed:r.passed,minor:r.minor,serious:r.serious,dangerous:r.dangerous,interventions:r.interventions,
    challenges:r.driven.map(c=>({
      id:c.id,title:c.title,where:c.where,instruction:c.instruction,index:r.route.challenges.indexOf(c),
      worst:r.challenges.find(x=>x.id===c.id)?.worst??null,
      decisions:r.records.filter(x=>x.challengeId===c.id).map(x=>({
        stageId:x.stageId,state:c.place[x.stageId]?.state??'',sequence:x.sequence,faults:x.verdict.faults,
        explain:c.stages.find(s=>s.id===x.stageId)?.explain??'',intervened:x.verdict.intervened
      }))
    }))
  };
}
