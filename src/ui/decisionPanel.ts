import type {StageVerdict} from '../decision/assess';
import {actionLabel} from '../decision/actions';
import type {PausedAt} from '../decision/runner';

const byId=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const LEVEL:Record<string,string>={minor:'Minor',serious:'Serious',dangerous:'Dangerous',feedback:'Note'};

export interface DecisionPanelHooks{
  /** An observation button was pressed: show what it sees (the camera turns there for a moment). */
  look(action:string):void;
  submit(sequence:readonly string[]):StageVerdict;
  continue():void;
}

/**
 * The paused decision: the examiner's direction, where the car is, the buttons for this situation; the order chosen
 * shows as numbered steps (Undo takes the last back). Done asks "Finished your observations?": No goes back to the
 * buttons, Yes submits the order for marking and shows Continue. A mock test says only that it was recorded (or that
 * the examiner took control); practice shows the marking and the right decision there and then.
 */
export class DecisionPanel{
  private sequence:string[]=[];
  private at:PausedAt|null=null;
  private practice=false;

  constructor(private readonly hooks:DecisionPanelHooks){
    byId('decision-undo').addEventListener('click',()=>{this.sequence.pop();this.render()});
    byId('decision-done').addEventListener('click',()=>this.confirming(true));
    byId('decision-no').addEventListener('click',()=>this.confirming(false));
    byId('decision-yes').addEventListener('click',()=>this.submit());
    byId('decision-continue').addEventListener('click',()=>{this.hide();this.hooks.continue()});
  }

  get open(){return !byId('decision-panel').hidden}

  show(at:PausedAt,practice:boolean):void{
    this.at=at;this.practice=practice;this.sequence=[];
    byId('decision-step').textContent=practice?'Practice':`Challenge ${at.index+1} of ${at.of}`;
    byId('decision-instruction').textContent=at.challenge.instruction;
    byId('decision-state').textContent=at.place.state;
    byId('decision-confirm').hidden=true;byId('decision-after').hidden=true;byId('decision-choose').hidden=false;
    const buttons=byId('decision-buttons');
    buttons.replaceChildren(...at.stage.buttons.map(id=>{
      const b=document.createElement('button');
      b.type='button';b.dataset['action']=id;b.textContent=actionLabel(id);
      if(id===at.stage.go||id===at.stage.wait)b.classList.add('decide');
      b.addEventListener('click',()=>this.press(id));
      return b;
    }));
    byId('decision-panel').hidden=false;
    this.render();
  }

  hide():void{byId('decision-panel').hidden=true;this.at=null}

  private decided(){const st=this.at?.stage;return !!st&&this.sequence.some(a=>a===st.go||a===st.wait)}

  private press(id:string):void{
    if(!this.at||this.decided()||!byId('decision-confirm').hidden)return;
    // (Pressing the same observation twice in a row adds nothing.)
    if(this.sequence.at(-1)!==id)this.sequence.push(id);
    this.hooks.look(id);
    this.render();
  }

  private render():void{
    const list=byId('decision-sequence');
    list.replaceChildren(...this.sequence.map(a=>{const li=document.createElement('li');li.textContent=actionLabel(a);return li}));
    list.hidden=this.sequence.length===0;
    const locked=this.decided();
    for(const b of byId('decision-buttons').querySelectorAll<HTMLButtonElement>('button'))b.disabled=locked;
    byId<HTMLButtonElement>('decision-undo').disabled=this.sequence.length===0;
  }

  private confirming(on:boolean):void{
    byId('decision-confirm').hidden=!on;byId('decision-choose').hidden=on;
    if(on)byId('decision-yes').focus();
  }

  private submit():void{
    const verdict=this.hooks.submit(this.sequence);
    byId('decision-confirm').hidden=true;
    byId('decision-after').hidden=false;
    const note=byId('decision-note'),feedback=byId('decision-feedback');
    feedback.replaceChildren();
    if(this.practice&&this.at){
      const marked=verdict.faults.filter(f=>f.level!=='feedback');
      note.textContent=marked.length===0?'Well judged.':`${marked.length} fault${marked.length===1?'':'s'}.`;
      for(const f of verdict.faults){
        const li=document.createElement('li');li.className=`sev-${f.level}`;
        const b=document.createElement('b');b.textContent=`${LEVEL[f.level]}: ${f.title}. `;
        li.append(b,f.message);feedback.append(li);
      }
      const right=document.createElement('li');right.className='right';right.textContent=this.at.stage.explain;feedback.append(right);
    }else note.textContent=verdict.intervened?'The examiner took control and stopped the car.':'Recorded.';
    byId('decision-continue').focus();
  }
}
