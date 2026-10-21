import type {AbstractMesh,DirectionalLight,Scene,TransformNode} from '../engine/babylon';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import type {QualityProfile} from '../engine/quality';

/**
 * Sun shadows near the car: one shadow map that follows the car (about 75 m across, redrawn every second frame), so buildings, trees,
 * parked cars, road users and people shade the road. Ground surfaces and markings only receive. Phones use a
 * smaller map; `?shadows=0` turns shadows off (to compare cost).
 */
const HALF=38;
/** Never cast: flat ground surfaces and pads, markings, signs, sky, mirror glass (they would add draw calls for no visible shadow). */
const NO_CAST=/^(sky-dome|verge|streetscape-detail|town-area|signage|merged-(tarmac|pavement|kerb|road-white|grass)|carriageway-|pavement-|kerb-|marking-|mirror-|.*-giveway-|.*-stripe-|.*-zigzag-|.*-stud-|.*-stop-|rb\d-(surface|disc)|exercise-guide)/;

export class SunShadows{
  private readonly generator:ShadowGenerator;
  private sweep=0;
  /** Parts that cast but never receive (the cockpit would otherwise sit in its own roof's shadow). */
  private readonly castOnly:TransformNode[]=[];

  constructor(private readonly scene:Scene,private readonly sun:DirectionalLight,quality:QualityProfile){
    const size=quality.id==='phone'?1024:2048;
    sun.autoUpdateExtends=false;
    sun.orthoLeft=-HALF;sun.orthoRight=HALF;sun.orthoTop=HALF;sun.orthoBottom=-HALF;
    sun.shadowMinZ=1;sun.shadowMaxZ=260;
    this.generator=new ShadowGenerator(size,sun);
    // Poisson sampling: soft-edged and cheap, in one pass. (Hardware PCF drew no shadows at all in testing.)
    this.generator.usePoissonSampling=true;
    this.generator.bias=.0015;
    this.generator.normalBias=.02;
    // Shade keeps some of the sun's light too: soft daylight shadows, not black ones.
    this.generator.setDarkness(.3);
    const map=this.generator.getShadowMap()!;
    // Every second frame: half the cost; at 30 mph a shadow lags under 0.2 m.
    map.refreshRate=2;
    map.renderListPredicate=(mesh:AbstractMesh)=>mesh.isEnabled()&&mesh.isVisible&&!NO_CAST.test(mesh.name);
  }

  /** Once a frame: centre the shadow map on the car; now and then, let new meshes receive shadows. */
  follow(x:number,z:number,dt:number):void{
    const d=this.sun.direction;
    this.sun.position.set(x-d.x*130,-d.y*130,z-d.z*130);
    if((this.sweep-=dt)>0)return;
    this.sweep=1;
    for(const m of this.scene.meshes)
      if(!m.receiveShadows&&m.name!=='sky-dome'&&!this.isCastOnly(m))m.receiveShadows=true;
  }

  castOnlyUnder(node:TransformNode):void{this.castOnly.push(node)}

  /**
   * Road users and people are never darkened by shade (they still cast): hazards stay as readable in the
   * mirrors and ahead as before. The cockpit is cast-only too.
   */
  private isCastOnly(m:AbstractMesh):boolean{
    for(let n:import('../engine/babylon').TransformNode|AbstractMesh|null=m;n;n=n.parent as typeof n)
      if(/^(actor-|people|animated-person|bus-)/.test(n.name))return true;
    return this.castOnly.some(c=>m.isDescendantOf(c));
  }

  /** Diagnostics: shadow casters drawn into the map last frame, and the map size. */
  get stats(){const m=this.generator.getShadowMap()!;return {mapSize:m.getSize().width,casters:m.renderList?.length??0}}

  dispose():void{this.generator.dispose()}
}

/**
 * Shadows are on with a graphics processor and off with software rendering (SwiftShader, llvmpipe: an extra
 * pass there halves the frame rate). `?shadows=1` or `?shadows=0` decides instead.
 */
export function shadowsWanted(search:string,renderer:string):boolean{
  const asked=new URLSearchParams(search).get('shadows');
  if(asked==='1'||asked==='0')return asked==='1';
  return !/swiftshader|llvmpipe|softpipe|software/i.test(renderer);
}

/** The graphics renderer's name, where the browser reports it. */
export function rendererName(gl:WebGLRenderingContext|null):string{
  const info=gl?.getExtension('WEBGL_debug_renderer_info');
  return info&&gl?String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)):'';
}

