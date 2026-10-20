/**
 * On-screen steering wheel: drag round it with a thumb as you would turn a wheel. The turn follows the finger's
 * angle around the wheel's centre (unwrapped, so it can go past half a turn), up to full lock either way. Let go and it
 * returns to the centre, as a car's wheel does when you relax your grip, but not instantly.
 */
export interface TouchWheelTuning{
  /** Wheel turn (degrees) that gives full steering. */
  fullLockDeg:number;
  /** How fast it returns to centre when released (degrees per second). */
  returnDegPerSec:number;
}

export const TOUCH_WHEEL:TouchWheelTuning={fullLockDeg:270,returnDegPerSec:300};

/** Smallest signed difference between two angles (degrees), in −180..180. */
export function angleDelta(fromDeg:number,toDeg:number):number{
  return ((toDeg-fromDeg+540)%360+360)%360-180;
}

/** Angle of a point about a centre, degrees clockwise from straight up (screen coordinates: y down). */
export function screenAngle(cx:number,cy:number,x:number,y:number):number{
  return Math.atan2(x-cx,cy-y)*180/Math.PI;
}

export class TouchWheel{
  /** Current wheel turn, degrees, clockwise (steer right) positive. */
  turnDeg=0;
  private grip:number|null=null;

  constructor(private readonly tuning:TouchWheelTuning=TOUCH_WHEEL){}

  get held(){return this.grip!==null}

  /** Finger down at this angle around the centre. */
  grab(angleDeg:number):void{this.grip=angleDeg}

  /** Finger moved to this angle: the wheel turns by the same amount. */
  move(angleDeg:number):void{
    if(this.grip===null)return;
    const lock=this.tuning.fullLockDeg;
    this.turnDeg=Math.max(-lock,Math.min(lock,this.turnDeg+angleDelta(this.grip,angleDeg)));
    this.grip=angleDeg;
  }

  release():void{this.grip=null}

  /** Steering −1..1; while released, the wheel eases back to the centre. */
  update(dt:number):number{
    if(this.grip===null&&this.turnDeg!==0){
      const step=this.tuning.returnDegPerSec*dt;
      this.turnDeg=Math.abs(this.turnDeg)<=step?0:this.turnDeg-Math.sign(this.turnDeg)*step;
    }
    return this.turnDeg/this.tuning.fullLockDeg;
  }

  reset():void{this.turnDeg=0;this.grip=null}
}
