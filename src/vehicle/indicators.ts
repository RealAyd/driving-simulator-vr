import type {Seconds} from '../contracts';

export type IndicatorState='off'|'left'|'right';

/** UK indicators flash at 60–120 per minute; 85/min is used here. */
export const INDICATOR_PERIOD:Seconds=60/85;

export class Indicators{
  state:IndicatorState='off';
  private since:Seconds=0;

  /** Toggles a side; selecting the active side cancels it. Returns the new state. */
  toggle(side:'left'|'right',time:Seconds):IndicatorState{
    this.state=this.state===side?'off':side;
    this.since=time;
    return this.state;
  }

  cancel(time:Seconds):void{
    this.state='off';
    this.since=time;
  }

  /** True during the lit half of the flash cycle. */
  isLit(time:Seconds):boolean{
    if(this.state==='off')return false;
    return ((time-this.since)%INDICATOR_PERIOD)<INDICATOR_PERIOD/2;
  }

  reset():void{
    this.state='off';
    this.since=0;
  }
}
