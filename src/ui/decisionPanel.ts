import type {StageVerdict} from '../decision/assess';
import {actionLabel} from '../decision/actions';
import type {PausedAt} from '../decision/runner';

const byId=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
/** Remembered once the picture has been dragged during a decision. */
const DRAGGED='dp-decision-dragged';
const dragged=()=>{try{return localStorage.getItem(DRAGGED)==='1'}catch{return false}};
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
    // Hidden to see the whole road while paused; the tab on the left brings it back.
    byId('decision-minimise').addEventListener('click',()=>this.minimise(true));
    byId('decision-expand').addEventListener('click',()=>this.minimise(false));
  }

  get open(){return !byId('decision-panel').hidden||!byId('decision-expand').hidden}

  /** The challenge put away (the whole road in view) or brought back. */
  minimise(on:boolean):void{
    if(!this.at)return;
    byId('decision-panel').hidden=on;byId('decision-expand').hidden=!on;
    (on?byId('decision-expand'):byId('decision-minimise')).focus();
  }

  show(at:PausedAt,practice:boolean):void{
    this.at=at;this.practice=practice;this.sequence=[];
    byId('decision-step').textContent=practice?'Practice':`Challenge ${at.index+1} of ${at.of}`;
    byId('decision-instruction').textContent=at.challenge.instruction;
    byId('decision-state').textContent=at.place.state;
    byId('decision-confirm').hidden=true;byId('decision-after').hidden=true;byId('decision-choose').hidden=false;
    const buttons=byId('decision-buttons');
    // (The decision, giving way or going, comes last: the checks and actions are chosen first.)
    const decide=(id:string)=>id===at.stage.go||id===at.stage.wait;
    buttons.replaceChildren(...[...at.stage.buttons.filter(id=>!decide(id)),...at.stage.buttons.filter(decide)].map(id=>{
      const b=document.createElement('button');
      b.type='button';b.dataset['action']=id;b.textContent=actionLabel(id);
      if(id===at.stage.go||id===at.stage.wait)b.classList.add('decide');
      b.addEventListener('click',()=>this.press(id));
      return b;
    }));
    // (On the right where what matters is on the left.)
    const right=at.place.panel==='right';
    byId('decision-panel').classList.toggle('dp-right',right);byId('decision-expand').classList.toggle('dp-right',right);
    // (The picture can be dragged to look round: shown until the first drag.)
    const hint=byId('decision-drag-hint');hint.classList.toggle('dp-right',right);hint.hidden=dragged();
    byId('decision-panel').hidden=false;byId('decision-expand').hidden=true;
    this.render();
  }

  hide():void{byId('decision-panel').hidden=true;byId('decision-expand').hidden=true;byId('decision-drag-hint').hidden=true;this.at=null}

  /** The picture has been dragged: the hint is not shown again. */
  dragged():void{
    byId('decision-drag-hint').hidden=true;
    try{localStorage.setItem(DRAGGED,'1')}catch{/* not kept: shown again next time */}
  }

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
