import type {Seconds} from '../contracts';

/**
 * Fixed-step simulation clock. Movement and assessment advance in identical
 * steps regardless of frame rate; rendering interpolates with `alpha`.
 */
export class FixedStepClock{
  time:Seconds=0;
  private accumulator=0;
  private paused=false;

  constructor(readonly step:Seconds=1/60,readonly maxStepsPerFrame=5){
    if(!(step>0))throw new Error('Clock step must be positive');
  }

  /** Runs `onStep` for each whole step contained in `realDelta`. */
  advance(realDelta:Seconds,onStep:(dt:Seconds,time:Seconds)=>void):number{
    if(this.paused||!(realDelta>0))return 0;
    // A long hitch (tab switch, debugger) must not fast-forward the world.
    this.accumulator+=Math.min(realDelta,this.step*this.maxStepsPerFrame);
    let steps=0;
    while(this.accumulator>=this.step&&steps<this.maxStepsPerFrame){
      this.accumulator-=this.step;
      this.time+=this.step;
      steps++;
      onStep(this.step,this.time);
    }
    return steps;
  }

  /** Fraction of a step between the previous and current state, 0..1. */
  get alpha():number{
    return Math.min(1,this.accumulator/this.step);
  }

  get isPaused():boolean{return this.paused}

  pause():void{this.paused=true}

  resume():void{this.paused=false}

  reset():void{
    this.time=0;
    this.accumulator=0;
  }
}
