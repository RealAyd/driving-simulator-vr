/**
 * Tilt-to-steer: hold the phone in landscape like a steering wheel and turn it.
 *
 * Uses `deviceorientation` beta/gamma (gravity-referenced, consistent on iOS
 * and Android) rather than raw accelerometer values, whose signs have differed
 * between browsers. The angle is the sideways lean of the screen relative to
 * gravity, so it works whether the phone is held upright or tipped back.
 */

const DEG=Math.PI/180;

/** Screen-relative lean of the phone, in radians; positive = turned clockwise (steer right). */
export function tiltAngle(betaDeg:number,gammaDeg:number,screenAngleDeg:number):number{
  const b=betaDeg*DEG,g=gammaDeg*DEG,s=screenAngleDeg*DEG;
  // Unit "up" vector in device axes (x right, y top, z out of the screen in portrait).
  const ux=-Math.cos(b)*Math.sin(g),uy=Math.sin(b);
  // Screen-right axis in device axes for the current screen rotation.
  const right=ux*Math.cos(s)-uy*Math.sin(s);
  // Turning the phone clockwise makes "up" lean towards the screen's left.
  return Math.asin(Math.max(-1,Math.min(1,-right)));
}

export interface TiltTuning{
  /** Lean, in degrees, that gives full steering. */
  fullLockDeg:number;
  /** Lean, in degrees, ignored around the centre. */
  deadZoneDeg:number;
}

export const TILT_SENSITIVITY:Record<'gentle'|'normal'|'sharp',TiltTuning>={
  gentle:{fullLockDeg:40,deadZoneDeg:3},
  normal:{fullLockDeg:28,deadZoneDeg:2.5},
  sharp:{fullLockDeg:18,deadZoneDeg:2}
};

/** Maps a lean (relative to the calibrated centre) to steering −1..1. */
export function shapeSteer(angle:number,centre:number,tuning:TiltTuning):number{
  const lean=(angle-centre)/DEG;
  const magnitude=Math.abs(lean)-tuning.deadZoneDeg;
  if(magnitude<=0)return 0;
  const x=Math.min(1,magnitude/(tuning.fullLockDeg-tuning.deadZoneDeg));
  // Gentle near the centre for lane keeping, still reaching full lock.
  return Math.sign(lean)*(0.35*x+0.65*x*x);
}

export type TiltStatus='off'|'waiting'|'active'|'denied'|'unavailable';

type OrientationPermission={requestPermission?:()=>Promise<'granted'|'denied'>};

/** Owns the sensor listener, smoothing and calibration. */
export class TiltSteering{
  status:TiltStatus='off';
  tuning:TiltTuning=TILT_SENSITIVITY.normal;
  private raw=0;
  private smoothed=0;
  private centre=0;
  private needsCentre=true;
  private lastReading=0;
  private readonly onOrientation=(event:DeviceOrientationEvent)=>{
    if(event.beta==null||event.gamma==null)return;
    this.raw=tiltAngle(event.beta,event.gamma,screenAngle());
    this.lastReading=performance.now();
    if(this.needsCentre){this.centre=this.raw;this.smoothed=this.raw;this.needsCentre=false}
    if(this.status==='waiting')this.status='active';
  };

  /**
   * Must be called from a tap: iOS only grants motion access inside a user gesture.
   * Resolves once readings arrive, or with the reason they did not.
   */
  async enable():Promise<TiltStatus>{
    if(typeof DeviceOrientationEvent==='undefined')return this.status='unavailable';
    const request=(DeviceOrientationEvent as unknown as OrientationPermission).requestPermission;
    if(request){
      try{
        if(await request.call(DeviceOrientationEvent)!=='granted')return this.status='denied';
      }catch{
        // Refused outright, e.g. inside an embedded frame that is not allowed motion access.
        return this.status='denied';
      }
    }
    this.status='waiting';
    this.needsCentre=true;
    window.addEventListener('deviceorientation',this.onOrientation);
    // Desktop browsers expose the API but never deliver readings.
    await new Promise(resolve=>setTimeout(resolve,1500));
    if(this.status==='waiting'){this.disable();this.status='unavailable'}
    return this.status;
  }

  disable():void{
    window.removeEventListener('deviceorientation',this.onOrientation);
    this.status='off';
    this.smoothed=this.centre=this.raw=0;
  }

  /** Makes the phone's current position the straight-ahead position. */
  recentre():void{
    this.centre=this.raw;
    this.smoothed=this.raw;
  }

  /** Smoothed steering −1..1; call once per frame. */
  read(dt:number):number{
    if(this.status!=='active')return 0;
    // About 80 ms of smoothing: removes hand jitter without feeling laggy.
    this.smoothed+=(this.raw-this.smoothed)*(1-Math.exp(-dt/0.08));
    return shapeSteer(this.smoothed,this.centre,this.tuning);
  }

  /** True when the sensor has gone quiet (e.g. the page lost sensor access). */
  get stale():boolean{
    return this.status==='active'&&performance.now()-this.lastReading>1000;
  }
}

function screenAngle():number{
  const angle=screen.orientation?.angle;
  if(typeof angle==='number')return angle;
  return Number((window as unknown as {orientation?:number}).orientation??0);
}
