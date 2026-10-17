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

/** Outcome of asking for motion access. */
export type TiltPermission='not-asked'|'granted'|'denied'|'not-required'|'unsupported';

type OrientationPermission={requestPermission?:()=>Promise<'granted'|'denied'>};

/** Owns the sensor listener, reading statistics, smoothing and calibration. */
export class TiltSteering{
  permission:TiltPermission='not-asked';
  tuning:TiltTuning=TILT_SENSITIVITY.normal;
  /** True once the driver has set straight ahead (or it was set at the start of a drive). */
  calibrated=false;
  private raw=0;
  private smoothed=0;
  private centre=0;
  private listening=false;
  private readings:number[]=[];
  private readonly onOrientation=(event:DeviceOrientationEvent)=>{
    if(event.beta==null||event.gamma==null)return;
    this.raw=tiltAngle(event.beta,event.gamma,screenAngle());
    const now=performance.now();
    this.readings.push(now);
    while(this.readings.length&&now-this.readings[0]!>1000)this.readings.shift();
    if(this.readings.length===1&&!this.calibrated)this.smoothed=this.raw;
  };

  /**
   * Asks for motion access. Call it directly from a tap handler with no await
   * before it: iOS only shows the prompt inside the user's gesture.
   */
  async requestAccess():Promise<TiltPermission>{
    if(typeof DeviceOrientationEvent==='undefined')return this.permission='unsupported';
    const request=(DeviceOrientationEvent as unknown as OrientationPermission).requestPermission;
    if(request){
      try{
        this.permission=await request.call(DeviceOrientationEvent)==='granted'?'granted':'denied';
      }catch{
        // Refused outright, e.g. inside an embedded frame that is not allowed motion access.
        this.permission='denied';
      }
    }else this.permission='not-required';
    if(this.permission!=='denied'&&!this.listening){
      window.addEventListener('deviceorientation',this.onOrientation);
      this.listening=true;
    }
    return this.permission;
  }

  /** Real sensor readings arrived within the last half second. */
  get receiving():boolean{
    const last=this.readings.at(-1);
    return last!==undefined&&performance.now()-last<500;
  }

  /** Readings in the last second. */
  get rate():number{
    const now=performance.now();
    return this.readings.filter(t=>now-t<=1000).length;
  }

  /** Current lean relative to straight ahead, degrees (positive = turned clockwise). */
  get leanDegrees():number{
    return (this.raw-this.centre)*180/Math.PI;
  }

  /** Makes the phone's current position straight ahead. */
  calibrate():void{
    this.centre=this.raw;
    this.smoothed=this.raw;
    this.calibrated=true;
  }

  /** Smoothed steering −1..1; call once per frame. 0 when no readings are arriving. */
  read(dt:number):number{
    if(!this.receiving)return 0;
    // About 80 ms of smoothing: removes hand jitter without feeling laggy.
    this.smoothed+=(this.raw-this.smoothed)*(1-Math.exp(-dt/0.08));
    return shapeSteer(this.smoothed,this.centre,this.tuning);
  }
}

/** Landscape, by the screen orientation API where available. */
export function isLandscape():boolean{
  const type=screen.orientation?.type;
  return type?type.startsWith('landscape'):innerWidth>innerHeight;
}

function screenAngle():number{
  const angle=screen.orientation?.angle;
  if(typeof angle==='number')return angle;
  return Number((window as unknown as {orientation?:number}).orientation??0);
}
