import {CAR_CONTROLS,type CarControlId,type CarControls} from '../vehicle/carControls';
import {DVSA_SOURCE,tellMeChoices,type TellMeQuestion} from '../test/vehicleChecks';

const $=(id:string)=>{
  const el=document.getElementById(id);
  if(!el)throw new Error(`Missing #${id} in sim/index.html`);
  return el;
};

/** Warning lights shown under the speed while on (as on the instrument panel). */
const TELL_TALES:Array<{id:CarControlId;text:string;tone:'green'|'blue'|'amber'|'grey'}>=[
  {id:'dipped',text:'Dipped',tone:'green'},
  {id:'main-beam',text:'Main beam',tone:'blue'},
  {id:'rear-fog',text:'Rear fog',tone:'amber'},
  {id:'front-demist',text:'Demist',tone:'amber'},
  {id:'rear-demister',text:'Rear demist',tone:'amber'},
  {id:'wipers',text:'Wipers',tone:'grey'},
  {id:'window',text:'Window open',tone:'grey'}
];

/**
 * The Controls panel (lights, washers, demisters, horn, window), its button in the top bar, and the tell-tales.
 * A press closes the panel so the view is clear again.
 */
export class CarControlsPanel{
  private readonly panel=$('hud-controls');
  private readonly toggle=$('hud-controls-toggle');
  private readonly tellTales=$('hud-telltales');
  private readonly buttons=new Map<CarControlId,HTMLButtonElement>();
  private shown='';

  constructor(private readonly controls:CarControls,press:(id:CarControlId)=>void){
    for(const def of CAR_CONTROLS){
      const b=document.createElement('button');
      b.type='button';
      b.textContent=def.label;
      b.dataset['carControl']=def.id;
      if(def.kind==='toggle')b.setAttribute('aria-pressed','false');
      b.addEventListener('click',()=>{press(def.id);this.open(false)});
      this.panel.append(b);
      this.buttons.set(def.id,b);
    }
    this.toggle.addEventListener('click',()=>this.open(!!this.panel.hidden));
  }

  open(show:boolean):void{
    this.panel.hidden=!show;
    this.toggle.setAttribute('aria-expanded',String(show));
  }

  /** Pressed states and tell-tales (the DOM changes only when something did). */
  update():void{
    const on=TELL_TALES.filter(t=>t.id==='wipers'?this.controls.wiping.front||this.controls.wiping.rear:this.controls.isOn(t.id));
    const key=on.map(t=>t.id).join();
    if(key===this.shown)return;
    this.shown=key;
    this.tellTales.replaceChildren(...on.map(t=>{const s=document.createElement('span');s.className=`tt tt-${t.tone}`;s.textContent=t.text;return s}));
    for(const def of CAR_CONTROLS)if(def.kind==='toggle')this.buttons.get(def.id)!.setAttribute('aria-pressed',String(this.controls.isOn(def.id)));
  }
}

/**
 * The tell me question on screen: DVSA's question and three of DVSA's answers (its answer to this question and to
 * two others), in an order set by `seed`. A choice is marked at once (DVSA's answer in green, a wrong choice in red,
 * and what it means on the test); "Start the drive" then closes it and calls `answer` with the chosen text.
 */
export function askTellMe(q:TellMeQuestion,seed:number,answer:(text:string)=>void):void{
  const card=$('hud-question'),after=$('hud-question-after'),feedback=$('hud-question-feedback'),go=$('hud-question-go') as HTMLButtonElement;
  $('hud-question-kind').textContent='Tell me';
  $('hud-question-text').textContent=q.question;
  after.hidden=true;
  const buttons=tellMeChoices(q,seed).map(text=>{
    const b=document.createElement('button');
    b.type='button';b.textContent=text;
    b.addEventListener('click',()=>{
      const right=text===q.short;
      for(const x of buttons){x.disabled=true;x.classList.toggle('right',x.textContent===q.short);x.classList.toggle('wrong',x===b&&!right)}
      feedback.textContent=`${right?'Correct.':'Not quite: the right answer is in green. On the test that is one driving fault.'} DVSA’s answer: “${q.answer}”`;
      feedback.classList.toggle('ok',right);
      after.hidden=false;
      go.onclick=()=>{card.hidden=true;answer(text)};
      go.focus({preventScroll:true});
    });
    return b;
  });
  $('hud-question-choices').replaceChildren(...buttons);
  $('hud-question-source').textContent=`Question and answers: ${DVSA_SOURCE}`;
  card.hidden=false;
}

/** Closes the question (the attempt ended or restarted). */
export function hideQuestion():void{$('hud-question').hidden=true}
