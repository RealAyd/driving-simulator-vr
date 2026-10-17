import {SEVERITY_ORDER,type EventSink,type Finding,type Seconds,type Severity} from '../contracts';

/**
 * Findings for one attempt. One real-world incident is counted once: later
 * evidence for the same incident adds its event ids and can raise the
 * severity (recording what it was raised from), never adds a duplicate.
 */
export class FindingLog{
  private readonly findings=new Map<string,Finding>();
  private counter=0;

  constructor(private readonly rubricVersion:string,private readonly sink:EventSink,private readonly now:()=>Seconds){}

  record(ruleId:string,incidentId:string,severity:Severity,eventIds:string[],explanation:string):Finding{
    const existing=this.findings.get(incidentId);
    if(existing){
      for(const id of eventIds)if(!existing.eventIds.includes(id))existing.eventIds.push(id);
      if(SEVERITY_ORDER[severity]>SEVERITY_ORDER[existing.severity]){
        existing.upgradedFrom=existing.severity;
        existing.severity=severity;
        existing.ruleId=ruleId;
        existing.explanation=explanation;
        this.sink.emit('assessment.finding',{findingId:existing.id,incidentId,severity,upgraded:true});
      }
      return existing;
    }
    const finding:Finding={
      id:`finding-${++this.counter}`,ruleId,incidentId,severity,eventIds:[...eventIds],explanation,
      rubricVersion:this.rubricVersion,time:this.now()
    };
    this.findings.set(incidentId,finding);
    this.sink.emit('assessment.finding',{findingId:finding.id,incidentId,severity,ruleId});
    return finding;
  }

  has(incidentId:string):boolean{
    return this.findings.has(incidentId);
  }

  /** Most severe first, then earliest. */
  sorted():Finding[]{
    return [...this.findings.values()].sort((a,b)=>SEVERITY_ORDER[b.severity]-SEVERITY_ORDER[a.severity]||a.time-b.time);
  }

  get current():Finding[]{
    return [...this.findings.values()];
  }

  reset():void{
    this.findings.clear();
    this.counter=0;
  }
}
