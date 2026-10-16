import {WebXRState,type Scene,type TransformNode,type WebXRDefaultExperience} from '../engine/babylon';

export interface XrSupport{
  available:boolean;
  reason:string;
}

/** Feature detection only; says nothing about comfort or performance. */
export async function detectXr(nav:Navigator=navigator):Promise<XrSupport>{
  const xr=(nav as Navigator&{xr?:{isSessionSupported(mode:string):Promise<boolean>}}).xr;
  if(!xr)return {available:false,reason:'WebXR is not available in this browser'};
  try{
    return (await xr.isSessionSupported('immersive-vr'))
      ?{available:true,reason:'immersive-vr supported'}
      :{available:false,reason:'This device does not offer immersive VR'};
  }catch(error){
    return {available:false,reason:`WebXR check failed: ${(error as Error).message}`};
  }
}

/**
 * Seated headset session. The XR camera is parented to the seat node, which
 * the app moves with the vehicle each frame; the headset only adds the
 * physical head pose. No forced head pitch or camera shake is applied.
 */
export class SeatedXr{
  private experience:WebXRDefaultExperience|null=null;
  onExit:()=>void=()=>{};

  constructor(private readonly scene:Scene,private readonly seatNode:TransformNode){}

  async enter():Promise<void>{
    // WebXR code is loaded only when someone actually enters VR.
    const {WebXRDefaultExperience}=await import('@babylonjs/core/XR/webXRDefaultExperience');
    this.experience??=await WebXRDefaultExperience.CreateAsync(this.scene,{
      disableDefaultUI:true,
      disableTeleportation:true,
      disableNearInteraction:true,
      disablePointerSelection:true,
      optionalFeatures:false
    });
    const base=this.experience.baseExperience;
    await base.enterXRAsync('immersive-vr','local');
    base.camera.parent=this.seatNode;
    base.camera.position.set(0,0,0);
    base.sessionManager.onXRSessionEnded.addOnce(()=>this.onExit());
  }

  /** Makes the current physical head position the seat position. */
  recentre():void{
    this.experience?.baseExperience.sessionManager.resetReferenceSpace();
  }

  get active():boolean{
    return this.experience?.baseExperience.state===WebXRState.IN_XR;
  }

  async exit():Promise<void>{
    if(this.active)await this.experience!.baseExperience.exitXRAsync();
  }

  dispose():void{
    this.experience?.dispose();
    this.experience=null;
  }
}
