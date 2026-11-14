import {describeDrive} from './recent';

/**
 * The learner's profile on the account screen (GET /api/profile): how many drives of each kind, their best mock test,
 * the areas that cost them most, how their mock tests have gone, and their last drives with how each went.
 */

type Mode='lesson'|'test'|'free';
type Test={passed:boolean;driving:number;serious:number;dangerous:number;finished:boolean};
export interface Profile{
  totals:Record<Mode,number>&{minutes:number};
  recent:Array<{scenario:string;mode:Mode;at:string;outcome:string;test?:Test;lesson?:{title:string;good:number;improve:number}}>;
  best:{tests:number;passes:number;fewestFaults:number|null;bestAt:string|null;scenario:string|null}|null;
  weak:Array<{label:string;times:number;serious:number;dangerous:number}>;
  progress:Array<{at:string;driving:number;serious:number;dangerous:number;passed:boolean}>;
  /** Their UK leaderboard badge this week. */
  badge?:1|10|25|null;
}

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls?:string,text?:string)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
};
const day=(iso:string)=>new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const plural=(n:number,one:string,many=`${one}s`)=>`${n} ${n===1?one:many}`;

/** A test's result in a few words: "Passed · 4 driving faults", "Not passed · 1 serious". */
export function testText(t:Test):string{
  if(!t.finished)return 'Ended early';
  const worst=t.dangerous?plural(t.dangerous,'dangerous','dangerous'):t.serious?plural(t.serious,'serious','serious'):null;
  return t.passed?`Passed · ${plural(t.driving,'driving fault')}`:`Not passed · ${worst??plural(t.driving,'driving fault')}`;
}

const OUTCOME:Record<string,string>={completed:'Completed',collision:'Ended: collision','left-route':'Ended: left the route','time-limit':'Ended: out of time',abandoned:'Ended early'};

/** Fills `box` with the profile; hidden while there is nothing driven yet. */
export function renderProfile(box:HTMLElement,p:Profile):void{
  const driven=p.totals.lesson+p.totals.test+p.totals.free;
  box.hidden=!driven&&!p.recent.length;
  if(box.hidden){box.replaceChildren();return}
  const parts:HTMLElement[]=[];
  if(p.badge){const b=el('p','profile-badge');b.append(el('span',`badge badge-${p.badge}`,`Top ${p.badge}%`),' in the UK this week');parts.push(b)}
  // The totals.
  const stats=el('div','profile-stats');
  for(const [n,label] of [[p.totals.test,'Mock tests'],[p.totals.lesson,'Lessons'],[p.totals.free,'Free drives'],[p.totals.minutes,'Minutes']] as const){
    const s=el('div','profile-stat');s.append(el('b','',String(n)),el('span','',label));stats.append(s);
  }
  parts.push(stats);
  // The best mock test.
  if(p.best){
    const b=el('div','profile-best');
    b.append(el('span','profile-kicker','Best mock test'),
      el('b','',p.best.passes?`Passed with ${plural(p.best.fewestFaults??0,'driving fault')}`:'Not passed yet'),
      el('span','',`${p.best.passes} of ${plural(p.best.tests,'test')} passed`));
    parts.push(b);
  }
  // What to work on.
  if(p.weak.length){
    const list=el('ul','profile-weak');
    for(const w of p.weak){
      const li=el('li');
      li.append(el('span','',w.label),el('b','',`${w.times}×`));
      if(w.dangerous)li.append(el('em','sev-d',`${w.dangerous} dangerous`));
      else if(w.serious)li.append(el('em','sev-s',`${w.serious} serious`));
      list.append(li);
    }
    parts.push(el('h3','','Weak areas'),list);
  }
  // Faults per mock test, oldest to newest.
  if(p.progress.length>1){
    const W=300,H=90,gap=6,max=Math.max(5,...p.progress.map(t=>t.driving+t.serious+t.dangerous));
    const bw=(W-gap*(p.progress.length-1))/p.progress.length;
    const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H+16}`);svg.setAttribute('class','profile-chart');svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`Faults in your last ${p.progress.length} mock tests: ${p.progress.map(t=>t.driving+t.serious+t.dangerous).join(', ')}`);
    p.progress.forEach((t,i)=>{
      const v=t.driving+t.serious+t.dangerous,h=Math.max(3,(v/max)*H),x=i*(bw+gap);
      const r=document.createElementNS(NS,'rect');
      for(const [k,val] of Object.entries({x,y:H-h,width:bw,height:h,rx:4,class:t.passed?'pass':'fail'}))r.setAttribute(k,String(val));
      const label=document.createElementNS(NS,'text');
      for(const [k,val] of Object.entries({x:x+bw/2,y:H+13,'text-anchor':'middle'}))label.setAttribute(k,String(val));
      label.textContent=String(v);
      svg.append(r,label);
    });
    parts.push(el('h3','','Faults per mock test'),svg as unknown as HTMLElement);
  }
  // The last drives.
  if(p.recent.length){
    const list=el('ul','profile-recent');
    for(const d of p.recent){
      const li=el('li');
      const what=el('div');what.append(el('b','',describeDrive(d)),el('span','',day(d.at)));
      const how=d.test?testText(d.test):d.lesson?`${d.lesson.good} good · ${d.lesson.improve} to improve`:OUTCOME[d.outcome]??'Completed';
      li.append(what,el('span',d.test?(d.test.passed?'ok':'no'):'',how));
      list.append(li);
    }
    parts.push(el('h3','','Recent drives'),list);
  }
  box.replaceChildren(...parts);
}
