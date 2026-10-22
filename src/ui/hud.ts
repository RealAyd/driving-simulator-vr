import {mpsToMph} from '../contracts';
import type {SessionState} from '../app/session';
import type {IndicatorState} from '../vehicle/indicators';

const $=<T extends HTMLElement>(id:string)=>{
  const el=document.getElementById(id);
  if(!el)throw new Error(`Missing #${id} in sim/index.html`);
  return el as T;
};

/** DOM overlays and HUD. Reads simulation state; never changes scoring. */
export class Hud{
  private readonly speed=$('hud-speed');
  private readonly left=$('ind-left');
  private readonly right=$('ind-right');
  private readonly fps=$('hud-fps');
  private readonly status=$('hud-status');

  showOnly(state:SessionState,error?:string|null):void{
    $('screen-loading').hidden=state!=='loading';
    $('screen-start').hidden=state!=='ready';
    $('screen-paused').hidden=state!=='paused';
    $('screen-error').hidden=state!=='error';
    $('screen-results').hidden=state!=='finished';
    $('hud').hidden=state!=='running'&&state!=='paused';
    if(state==='error')$('error-message').textContent=error??'Unknown error';
  }

  private readonly gear=$('hud-gear');

  update(speedMps:number,reverse:boolean,indicator:IndicatorState,lit:boolean,fps:number):void{
    this.speed.textContent=String(Math.round(mpsToMph(Math.abs(speedMps))));
    this.gear.textContent=reverse?'R':'D';
    // The signal buttons show the active state: amber while on, bright while lit.
    const l=this.left.parentElement!,r=this.right.parentElement!;
    l.classList.toggle('lit',indicator==='left'&&lit);
    r.classList.toggle('lit',indicator==='right'&&lit);
    l.classList.toggle('armed',indicator==='left');
    r.classList.toggle('armed',indicator==='right');
    l.setAttribute('aria-pressed',String(indicator==='left'));
    r.setAttribute('aria-pressed',String(indicator==='right'));
    this.fps.textContent=`${Math.round(fps)} fps`;
  }

  private readonly limit=$('hud-limit');
  /** The speed limit sign beside the speed (hidden where none is known); it pulses when the car is over it. */
  setLimit(mph:number|null,speedMps:number):void{
    this.limit.hidden=mph===null;
    if(mph===null)return;
    const text=String(mph);
    if(this.limit.textContent!==text){this.limit.textContent=text;this.limit.setAttribute('aria-label',`Speed limit ${mph} mph`)}
    this.limit.classList.toggle('over',mpsToMph(Math.abs(speedMps))>mph+1);
  }

  setStatus(text:string):void{
    this.status.textContent=text;
  }

  private taskTimer=0;

  /** Shows the task briefly, then folds it away so it does not cover the mirrors. The Task button recalls it. */
  /** Something to act on at once, big in the middle of the screen for a moment (the emergency stop's STOP). */
  flash(text:string):void{
    const el=this.flashEl;
    el.textContent=text;el.hidden=false;
    el.classList.remove('flash-on');void el.offsetWidth;el.classList.add('flash-on');
    clearTimeout(this.flashTimer);
    this.flashTimer=window.setTimeout(()=>{el.hidden=true},1800);
  }
  private readonly flashEl=$('hud-flash');
  private flashTimer=0;

  setTask(text:string,show=true):void{
    $('hud-task').textContent=text;
    this.showTask(show);
  }

  toggleTask():void{
    this.showTask($('hud-task').hidden!==false);
  }

  private showTask(visible:boolean):void{
    $('hud-task').hidden=!visible;
    clearTimeout(this.taskTimer);
    if(visible)this.taskTimer=window.setTimeout(()=>{$('hud-task').hidden=true},7000);
  }
}
