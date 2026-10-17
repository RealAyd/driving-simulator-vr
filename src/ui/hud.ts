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

  update(speedMps:number,indicator:IndicatorState,lit:boolean,fps:number):void{
    this.speed.textContent=String(Math.round(mpsToMph(speedMps)));
    this.left.classList.toggle('lit',indicator==='left'&&lit);
    this.right.classList.toggle('lit',indicator==='right'&&lit);
    this.left.classList.toggle('armed',indicator==='left');
    this.right.classList.toggle('armed',indicator==='right');
    this.fps.textContent=`${Math.round(fps)} fps`;
  }

  setStatus(text:string):void{
    this.status.textContent=text;
  }

  private taskTimer=0;

  /** Shows the task briefly, then folds it away so it does not cover the mirrors. */
  setTask(text:string):void{
    $('hud-task').textContent=text;
    this.showTask(true);
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
