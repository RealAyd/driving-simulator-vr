import {IMPROVE,type AttemptResult,type Severity} from '../contracts';

const OUTCOME_TEXT:Record<AttemptResult['outcome'],string>={
  completed:'Exercise finished',
  collision:'Exercise stopped: collision',
  'left-route':'Exercise stopped: left the route',
  'time-limit':'Exercise stopped: time limit',
  abandoned:'Exercise abandoned'
};
const SEVERITY_TEXT:Record<Severity,string>={advice:'Advice',minor:'Minor',serious:'Serious',dangerous:'Dangerous'};

function el<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,className?:string):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}

/** Renders an attempt result. Text only (no innerHTML), so content cannot inject markup. */
export function renderResults(result:AttemptResult,eventTime:(id:string)=>number|undefined,attemptsSaved:number,storage:'indexeddb'|'memory'):void{
  document.getElementById('results-title')!.textContent=OUTCOME_TEXT[result.outcome];
  const worst=result.findings[0]?.severity;
  document.getElementById('results-summary')!.textContent=
    result.findings.length===0?'No findings recorded for this attempt.'
    :`${result.findings.length} finding${result.findings.length===1?'':'s'}; most significant: ${SEVERITY_TEXT[worst!]}.`;

  const list=document.getElementById('results-findings')!;
  list.replaceChildren();
  for(const f of result.findings){
    const item=el('li',undefined,`finding sev-${f.severity}`);
    const head=el('div',undefined,'finding-head');
    head.append(el('span',SEVERITY_TEXT[f.severity],'sev'),el('span',f.upgradedFrom?`(raised from ${SEVERITY_TEXT[f.upgradedFrom]})`:'','upgraded'));
    item.append(head,el('p',f.explanation));
    const evidence=f.eventIds.map(id=>{const t=eventTime(id);return t===undefined?id:`${id} at ${t.toFixed(1)} s`}).join(', ');
    item.append(el('small',`Rule ${f.ruleId} · incident ${f.incidentId}${evidence?` · evidence: ${evidence}`:''}`));
    list.append(item);
  }
  const notes=document.getElementById('results-notes')!;
  // Notes starting with IMPROVE are things to work on; the rest are things done well.
  notes.replaceChildren(...result.notes.map(n=>{
    const item=el('li',n.startsWith(IMPROVE)?n.slice(IMPROVE.length):n);
    if(n.startsWith(IMPROVE))item.classList.add('improve');
    return item;
  }));
  notes.hidden=result.notes.length===0;
  document.getElementById('results-meta')!.textContent=
    `Duration ${result.durationSeconds.toFixed(0)} s · rubric ${result.rubricVersion} (draft, not yet reviewed by an instructor; not DVSA criteria) · `+
    (storage==='indexeddb'?`${attemptsSaved} attempt${attemptsSaved===1?'':'s'} saved on this device`:'results are not saved in this browser');
}

