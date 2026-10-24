import {Camera,FreeCamera,Matrix,PostProcess,Quaternion,ShaderStore,Vector3,Viewport,type Scene} from '../engine/babylon';
import type {Vec3} from '../contracts';
import {deviceBasis,recentred,rightOf,yawOf,type HeadBasis} from './headOrientation';
import {IPHONE_14_PRO_MAX,METRES_PER_POINT,eyeLayout,type ViewerProfile} from './viewerProfiles';

/**
 * Phone-viewer mode: side-by-side stereo for a phone in a cardboard-style
 * headset, with head tracking from the phone's motion sensors.
 *
 * iPhone Safari has no WebXR, so this is drawn directly: two cameras, one per
 * half of the screen, each followed by a lens-correction (barrel distortion)
 * pass. Mirrors are render targets drawn once per frame and are shared by
 * both eyes.
 */

ShaderStore.ShadersStore['phoneViewerLensFragmentShader']=`
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 lensCentre;
uniform vec2 distortion;
uniform float eyeAspect;
uniform float lensScale;
void main(void){
  // r = 1 at the top and bottom of the eye's image.
  vec2 d=(vUV-lensCentre)*vec2(eyeAspect,1.0)*2.0;
  float r2=dot(d,d);
  float f=(1.0+distortion.x*r2+distortion.y*r2*r2)/lensScale;
  vec2 uv=lensCentre+d*f/(vec2(eyeAspect,1.0)*2.0);
  if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}
  gl_FragColor=texture2D(textureSampler,uv);
}`;

type OrientationPermission={requestPermission?:()=>Promise<'granted'|'denied'>};
export type MotionPermission='not-asked'|'granted'|'denied'|'not-required'|'unsupported';

/** Head orientation from `deviceorientation`, recentred on demand. */
export class HeadTracker{
  permission:MotionPermission='not-asked';
  private raw:{alpha:number;beta:number;gamma:number}|null=null;
  private yaw0=0;
  private stamps:number[]=[];
  private listening=false;
  /** Readings that arrived without usable angles (counted, not used). */
  invalidReadings=0;
  private drift:{startedAt:number;yaw:number}|null=null;
  private readonly onOrientation=(e:DeviceOrientationEvent)=>{
    if(e.alpha==null||e.beta==null||e.gamma==null||![e.alpha,e.beta,e.gamma].every(Number.isFinite)){this.invalidReadings++;return}
    this.raw={alpha:e.alpha,beta:e.beta,gamma:e.gamma};
    const now=performance.now();
    this.stamps.push(now);
    while(this.stamps.length&&now-this.stamps[0]!>1000)this.stamps.shift();
  };

  /** Call directly from a tap handler (iOS shows the prompt only inside the user's gesture). */
  async requestAccess():Promise<MotionPermission>{
    if(typeof DeviceOrientationEvent==='undefined')return this.permission='unsupported';
    const request=(DeviceOrientationEvent as unknown as OrientationPermission).requestPermission;
    if(request){
      try{this.permission=await request.call(DeviceOrientationEvent)==='granted'?'granted':'denied'}
      catch{this.permission='denied'}
    }else this.permission='not-required';
    if(this.permission!=='denied'&&!this.listening){
      window.addEventListener('deviceorientation',this.onOrientation);
      this.listening=true;
    }
    return this.permission;
  }

  stop():void{
    window.removeEventListener('deviceorientation',this.onOrientation);
    this.listening=false;
  }

  get receiving():boolean{
    const last=this.stamps.at(-1);
    return last!==undefined&&performance.now()-last<500;
  }

  get rate():number{
    const now=performance.now();
    return this.stamps.filter(t=>now-t<=1000).length;
  }

  /** Age of the newest reading, milliseconds (Infinity before any). A large age is stale tracking. */
  get readingAge():number{
    const last=this.stamps.at(-1);
    return last===undefined?Infinity:performance.now()-last;
  }

  /**
   * Orientation offset: how far (degrees) the head is from straight ahead
   * right now. Immediately after Recentre it is 0; it is NOT a measure of lag
   * or drift.
   */
  get offsetDeg():number{
    const b=this.basis();
    return b?Math.abs(yawOf(b.forward))*180/Math.PI:NaN;
  }

  /** Drift test: hold the head still; the yaw change per minute is sensor drift (Recentre does not cure it). */
  startDriftTest():void{
    const b=this.basis();
    this.drift=b?{startedAt:performance.now(),yaw:yawOf(b.forward)}:null;
  }

  get driftDegPerMinute():number|null{
    const b=this.basis();
    if(!this.drift||!b)return null;
    const minutes=(performance.now()-this.drift.startedAt)/60000;
    if(minutes<1/60)return null;
    let d=yawOf(b.forward)-this.drift.yaw;
    d=Math.atan2(Math.sin(d),Math.cos(d));
    return d*180/Math.PI/minutes;
  }

  private deviceBasis():HeadBasis|null{
    if(!this.raw)return null;
    return deviceBasis(this.raw.alpha,this.raw.beta,this.raw.gamma,screenAngle());
  }

  /** Makes the current head direction straight ahead. */
  recentre():boolean{
    const b=this.deviceBasis();
    if(!b)return false;
    this.yaw0=yawOf(b.forward);
    return true;
  }

  /** Head forward and up relative to straight ahead (vehicle-local axes), or null without readings. */
  basis():HeadBasis|null{
    const b=this.deviceBasis();
    return b?recentred(b,this.yaw0):null;
  }
}

function screenAngle():number{
  const angle=screen.orientation?.angle;
  if(typeof angle==='number')return angle;
  return Number((window as unknown as {orientation?:number}).orientation??0);
}

/** The two eye cameras and their lens correction. */
export class PhoneViewer{
  private readonly eyes:[FreeCamera,FreeCamera];
  private lens:[PostProcess,PostProcess]|null=null;
  private profile:ViewerProfile|null=null;
  /** Real size of a CSS pixel on this phone, metres (from the phone's screen width setting). */
  private metresPerPoint=METRES_PER_POINT;
  active=false;

  constructor(private readonly scene:Scene,private readonly main:Camera){
    const eye=(name:string,x:number)=>{
      const c=new FreeCamera(name,Vector3.Zero(),scene);
      c.inputs.clear();
      c.minZ=.05;
      c.maxZ=3000;
      c.viewport=new Viewport(x,0,.5,1);
      c.rotationQuaternion=new Quaternion();
      return c;
    };
    this.eyes=[eye('viewer-eye-left',0),eye('viewer-eye-right',.5)];
  }

  enter(profile:ViewerProfile):void{
    this.profile=profile;
    this.active=true;
    this.layout();
    this.scene.activeCameras=[...this.eyes];
  }

  exit():void{
    this.active=false;
    this.scene.activeCameras=[];
    this.scene.activeCamera=this.main;
    for(const p of this.lens??[])p.dispose();
    this.lens=null;
  }

  setProfile(profile:ViewerProfile):void{
    this.profile=profile;
    if(this.active)this.layout();
  }

  /** This phone's real size of a CSS pixel, metres (the pictures must sit under the lenses on any phone). */
  setMetresPerPoint(m:number):void{
    if(!(m>0)||m===this.metresPerPoint)return;
    this.metresPerPoint=m;
    if(this.active)this.layout();
  }

  /** Recomputes projections and lens passes (on entering, profile change and resize). */
  layout():void{
    const profile=this.profile;
    if(!profile||!this.active)return;
    const engine=this.scene.getEngine();
    const screenAspect=engine.getRenderWidth()/Math.max(1,engine.getRenderHeight());
    // The drawing area's real size (the two pictures must sit under the lenses whatever room the page has).
    const canvas=engine.getRenderingCanvas();
    const cssWidth=canvas?.clientWidth||window.innerWidth,cssHeight=canvas?.clientHeight||window.innerHeight;
    const l=eyeLayout(profile,cssWidth>0?cssWidth*this.metresPerPoint:IPHONE_14_PRO_MAX.width,screenAspect,cssHeight>0?cssHeight*this.metresPerPoint:IPHONE_14_PRO_MAX.height);
    const fov=profile.fovDeg*Math.PI/180;
    this.eyes.forEach((c,i)=>{
      const shift=i===0?l.shift.left:l.shift.right;
      c.freezeProjectionMatrix(Matrix.PerspectiveFovRH(fov,l.aspect,c.minZ,c.maxZ).multiply(Matrix.Translation(shift,l.vshift,0)));
    });
    for(const p of this.lens??[])p.dispose();
    this.lens=null;
    if(profile.k1===0&&profile.k2===0)return;
    this.lens=this.eyes.map((c,i)=>{
      const p=new PostProcess(`viewer-lens-${i}`,'phoneViewerLens',['lensCentre','distortion','eyeAspect','lensScale'],null,1,c);
      const centre=i===0?l.centre.left:l.centre.right;
      p.onApply=effect=>{
        effect.setFloat2('lensCentre',centre,l.vcentre);
        effect.setFloat2('distortion',profile.k1,profile.k2);
        effect.setFloat('eyeAspect',l.aspect);
        effect.setFloat('lensScale',l.scale);
      };
      return p;
    }) as [PostProcess,PostProcess];
  }

  /** Places both eyes: `eye` is the midpoint between them; `head` in world axes. */
  update(eye:Vec3,head:HeadBasis):void{
    const ipd=this.profile?.ipd??.063;
    const r=rightOf(head);
    const f=new Vector3(head.forward.x,head.forward.y,head.forward.z),u=new Vector3(head.up.x,head.up.y,head.up.z);
    this.eyes.forEach((c,i)=>{
      const s=(i===0?-.5:.5)*ipd;
      c.position.set(eye.x+r.x*s,eye.y+r.y*s,eye.z+r.z*s);
      Quaternion.FromLookDirectionRHToRef(f,u,c.rotationQuaternion!);
    });
  }

  get cameras():readonly FreeCamera[]{return this.eyes}
}
