import {CAR_CONTROLS,type CarControlId,type CarControls} from '../vehicle/carControls';
import type {TellMeQuestion} from '../test/vehicleChecks';

const $=(id:string)=>{
  const el=document.getElementById(id);
  if(!el)throw new Error(`Missing #${id} in sim/index.html`);
  return el;
};

/** Warning lights shown under the speed while on (as on the instrument panel). */
const TELL_TALES:Array<{id:CarControlId|'wipers';text:string;tone:'green'|'blue'|'amber'|'grey'}>=[
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
 * The tell me question on screen: the question and three answers in a shuffled order (by `seed`). Calls `answer`
 * with the chosen text and closes.
 */
export function askTellMe(q:TellMeQuestion,seed:number,answer:(text:string)=>void):void{
  const card=$('hud-question');
  $('hud-question-kind').textContent='Tell me';
  $('hud-question-text').textContent=q.question;
  const options=[q.answer,...q.wrong];
  // Rotate by the seed: the right answer is not always first.
  const k=Math.abs(seed)%3,order=[...options.slice(k),...options.slice(0,k)];
  $('hud-question-choices').replaceChildren(...order.map(text=>{
    const b=document.createElement('button');
    b.type='button';b.textContent=text;
    b.addEventListener('click',()=>{card.hidden=true;answer(text)});
    return b;
  }));
  card.hidden=false;
}

/** Closes the question (the attempt ended or restarted). */
export function hideQuestion():void{$('hud-question').hidden=true}
