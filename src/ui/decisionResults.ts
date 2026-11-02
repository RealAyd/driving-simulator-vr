import {actionLabel} from '../decision/actions';
import type {DecisionReport} from '../decision/report';

const LEVEL:Record<string,string>={minor:'Minor',serious:'Serious',dangerous:'Dangerous',feedback:'Note'};
const STATUS:Record<string,string>={none:'Well judged',minor:'Minor faults',serious:'Serious fault',dangerous:'Dangerous fault',feedback:'Well judged'};

function el<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,className?:string):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}

/**
 * A decision mock test's results: each challenge with how it went, every decision in the order made (the buttons
 * chosen, the faults marked and why, the right decision there), and a way to practise a challenge again. Text only.
 */
export function renderDecisionResults(target:HTMLElement,report:DecisionReport,practise:(index:number)=>void):void{
  target.replaceChildren();
  target.hidden=false;
  target.append(el('p','The app\'s assessment of your decisions, not a DVSA result.','decision-disclaimer'));
  for(const c of report.challenges){
    const card=el('section',undefined,`decision-result worst-${c.worst??'none'}`);
    const head=el('div',undefined,'decision-result-head');
    head.append(el('h3',c.title),el('span',STATUS[c.worst??'none'],'decision-status'));
    card.append(head,el('p',`${c.where}. “${c.instruction}”`,'decision-where'));
    for(const d of c.decisions){
      const item=el('div',undefined,'decision-step');
      item.append(el('p',d.state,'decision-state'));
      const chose=el('ol',undefined,'decision-chosen');
      d.sequence.forEach((a,i)=>chose.append(el('li',`${i+1}. ${actionLabel(a)}`)));
      if(d.sequence.length===0)chose.append(el('li','Nothing chosen'));
      item.append(chose);
      if(d.intervened)item.append(el('p','The examiner took control and stopped the car.','decision-intervened'));
      if(d.faults.length){
        const faults=el('ul',undefined,'decision-faults');
        for(const f of d.faults){
          const li=el('li',undefined,`sev-${f.level}`);
          li.append(el('b',`${LEVEL[f.level]}: ${f.title}`),el('span',` (${f.heading}). `,'decision-heading'),f.message);
          faults.append(li);
        }
        item.append(faults);
      }
      item.append(el('p',d.explain,'decision-right'));
      card.append(item);
    }
    const again=el('button',report.practice?'Practise it again':'Practise this challenge','decision-practise');
    again.type='button';
    again.addEventListener('click',()=>practise(c.index));
    card.append(again);
    target.append(card);
  }
}
