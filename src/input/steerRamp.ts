/**
 * Turns on/off steering (buttons, keys) into a gradual input: a tap gives a
 * small correction, holding builds up to full lock. Releasing or reversing
 * takes effect at once.
 */
export class SteerRamp{
  value=0;

  constructor(private readonly start=.15,private readonly ratePerSecond=1.4){}

  update(target:number,dt:number):number{
    if(target===0||Math.sign(target)!==Math.sign(this.value))this.value=target===0?0:Math.sign(target)*this.start;
    else this.value=Math.sign(target)*Math.min(Math.abs(target),Math.abs(this.value)+this.ratePerSecond*dt);
    return this.value;
  }

  reset():void{
    this.value=0;
  }
}
