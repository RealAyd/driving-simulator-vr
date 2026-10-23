/**
 * Picture sharpness on phones: the scene is drawn at fewer pixels than the screen has (a Babylon hardware scaling
 * level above 1) to keep the frame rate up, which looks blurry on a sharp phone screen. This starts at the
 * profile's level and steps to a sharper one while the phone keeps up (a steady frame rate near 60), and back
 * when it struggles (never coarser than where it started, or than a given coarsest level). A level that could not be kept up is not tried again for a minute, so it does not
 * keep switching. Pure: main.ts feeds it the frame rate and applies the level.
 */
/** Device pixels per drawn pixel, coarsest first (1: every pixel the screen has). */
export const SCALE_LEVELS=[3,2,1.5,1.25,1] as const;
const SLOW=42,FAST=56,SLOW_FOR=3,FAST_FOR=6,RETRY_AFTER=60;

export class AdaptiveScale{
  private index:number;
  private slowFor=0;
  private fastFor=0;
  /** When each level was last given up on (seconds). */
  private failed=new Map<number,number>();
  private time=0;
  private readonly floor:number;
  private readonly slowFps:number;
  /** `coarsest`: the coarsest level it may step back to (by default where it starts); `slowFps`: below this frame
   * rate for a few seconds, it steps back (a headset keeps sharpness down to a lower rate: its text must be read). */
  constructor(start:number,coarsest=start,options:{slowFps?:number}={}){
    this.slowFps=options.slowFps??SLOW;
    const at=(level:number)=>{const i=SCALE_LEVELS.findIndex(l=>l<=level);return i<0?SCALE_LEVELS.length-1:i};
    this.index=at(start);
    this.floor=Math.min(this.index,at(coarsest));
  }
  get level():number{return SCALE_LEVELS[this.index]!}
  /** The frame rate over the last `dt` seconds; returns the new level when it changes. */
  update(dt:number,fps:number):number|null{
    this.time+=dt;
    this.slowFor=fps<this.slowFps?this.slowFor+dt:0;
    this.fastFor=fps>FAST?this.fastFor+dt:0;
    if(this.slowFor>=SLOW_FOR&&this.index>this.floor){
      this.failed.set(this.index,this.time);
      this.index--;this.slowFor=0;this.fastFor=0;
      return this.level;
    }
    const finer=this.index+1;
    if(this.fastFor>=FAST_FOR&&finer<SCALE_LEVELS.length&&this.time-(this.failed.get(finer)??-Infinity)>RETRY_AFTER){
      this.index=finer;this.slowFor=0;this.fastFor=0;
      return this.level;
    }
    return null;
  }
}
