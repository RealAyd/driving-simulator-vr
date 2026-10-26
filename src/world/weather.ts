import {
  Color3,Color4,CreateBox,DynamicTexture,Mesh,StandardMaterial,VertexData,
  type DirectionalLight,type HemisphericLight,type Scene,type TransformNode
} from '../engine/babylon';
import type {QualityProfile} from '../engine/quality';
import type {Lamp} from './streetscape';
import {groundAt} from '../engine/babylonAdapter';

/**
 * Driving conditions: day or night, dry or rain (driving tests run in both). Cheap enough for any phone: the light
 * levels, sky and haze change; at night every street lamp's pool of light is one mesh (one draw call), the car's
 * headlight beam on the road is one more, and traffic's lamps glow; rain is one instanced mesh of streaks round the
 * camera, with a wet road (darker, shinier). No extra lights: each would make every surface dearer to draw.
 */
export type TimeOfDay='day'|'dusk'|'night';
export interface Conditions{time:TimeOfDay;rain:boolean}
export const DAY:Conditions={time:'day',rain:false};

/** The conditions named in the address (?time=night, ?weather=rain), else day and dry. */
export function conditionsFrom(search:string):Conditions{
  const q=new URLSearchParams(search),time=q.get('time');
  return {time:time==='dusk'||time==='night'?time:'day',rain:q.get('weather')==='rain'};
}
/** A conditions choice as one word (the drive's settings): day, night, rain, night-rain. */
export function conditionsName(c:Conditions):string{return c.time==='night'?c.rain?'night-rain':'night':c.rain?'rain':c.time}
export function conditionsFromName(name:string|null|undefined):Conditions{
  switch(name){
    case 'night':return {time:'night',rain:false};
    case 'rain':return {time:'day',rain:true};
    case 'night-rain':return {time:'night',rain:true};
    case 'dusk':return {time:'dusk',rain:false};
    default:return DAY;
  }
}

interface Look{sky:Color3;fog:Color3;fogStart:number;fogEnd:number;hemi:number;hemiColour:Color3;ground:Color3;sun:number;sunColour:Color3;exposure:number;skyGlow:Color3}
const LOOKS:Record<TimeOfDay,Look>={
  day:{sky:new Color3(.76,.83,.88),fog:new Color3(.76,.83,.88),fogStart:180,fogEnd:650,hemi:.68,hemiColour:new Color3(.86,.92,1),ground:new Color3(.42,.43,.4),sun:1.05,sunColour:new Color3(1,.96,.88),exposure:1.12,skyGlow:Color3.White()},
  dusk:{sky:new Color3(.62,.52,.5),fog:new Color3(.55,.5,.52),fogStart:120,fogEnd:520,hemi:.42,hemiColour:new Color3(.8,.78,.9),ground:new Color3(.3,.28,.3),sun:.45,sunColour:new Color3(1,.7,.5),exposure:1.2,skyGlow:new Color3(.75,.62,.62)},
  night:{sky:new Color3(.04,.05,.09),fog:new Color3(.05,.06,.09),fogStart:40,fogEnd:260,hemi:.3,hemiColour:new Color3(.55,.62,.85),ground:new Color3(.18,.18,.2),sun:.1,sunColour:new Color3(.6,.7,1),exposure:1.6,skyGlow:new Color3(.08,.09,.15)}
};

/** A soft round glow (white in the middle, clear at the edge): the lamps' pools and the headlight beam. */
function glowTexture(scene:Scene,name:string):DynamicTexture{
  const t=new DynamicTexture(name,{width:128,height:128},scene,true);
  const g=t.getContext() as CanvasRenderingContext2D;
  const r=g.createRadialGradient(64,64,2,64,64,64);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.45,'rgba(255,255,255,.45)');r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,128,128);
  t.update();t.hasAlpha=true;
  return t;
}

/** Quads (four corners each, lying flat or upright) as one mesh with a shared texture. */
function quads(name:string,scene:Scene,corners:number[][],colour:Color3,texture:DynamicTexture):Mesh{
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  corners.forEach((c,i)=>{positions.push(...c);uvs.push(0,0,1,0,1,1,0,1);indices.push(i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3)});
  const mesh=new Mesh(name,scene),data=new VertexData();
  data.positions=positions;data.uvs=uvs;data.indices=indices;
  const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;
  data.applyToMesh(mesh);
  const m=new StandardMaterial(name,scene);
  m.disableLighting=true;m.emissiveColor=colour;m.diffuseTexture=texture;m.opacityTexture=texture;
  m.alphaMode=1; // additive: light added to what is under it
  m.backFaceCulling=false;m.fogEnabled=true;m.zOffset=-4;
  mesh.material=m;mesh.isPickable=false;mesh.freezeWorldMatrix();
  return mesh;
}

export class Weather{
  private conditions:Conditions=DAY;
  private pools:Mesh|null=null;
  private beam:Mesh|null=null;
  private rain:Mesh|null=null;
  private drops:Float32Array|null=null;
  private seeds:Float32Array|null=null;
  private readonly glow:DynamicTexture;
  /** Each material's own look (the day's), kept to go back to. */
  private readonly saved=new Map<StandardMaterial,{diffuse:Color3;specular:Color3;power:number;emissive:Color3}>();

  constructor(private readonly scene:Scene,private readonly quality:QualityProfile){
    this.glow=glowTexture(scene,'weather-glow');
  }

  get current():Conditions{return this.conditions}

  /**
   * The conditions for the place now built (call again after a new place is built, or to change them): `lamps` are
   * its street lamps, `car` the learner's car (the headlight beam goes with it).
   */
  apply(conditions:Conditions,lamps:readonly Lamp[],car:TransformNode):void{
    this.conditions=conditions;
    const scene=this.scene,look=LOOKS[conditions.time];
    const wet=conditions.rain;
    // Rain: a grey sky, closer haze, softer light.
    const grey=(c:Color3,k:number)=>{const l=(c.r+c.g+c.b)/3;return new Color3(c.r+(l-c.r)*k,c.g+(l-c.g)*k,c.b+(l-c.b)*k)};
    const sky=wet?grey(look.sky,.8).scale(conditions.time==='night'?1:.85):look.sky;
    scene.clearColor=new Color4(sky.r,sky.g,sky.b,1);
    scene.fogColor=wet?grey(look.fog,.8).scale(conditions.time==='night'?1:.85):look.fog.clone();
    scene.fogStart=wet?look.fogStart*.45:look.fogStart;
    scene.fogEnd=wet?look.fogEnd*.55:look.fogEnd;
    const hemi=scene.getLightByName('sky-light') as HemisphericLight|null,sun=scene.getLightByName('sun') as DirectionalLight|null;
    const overcast=wet&&conditions.time!=='night';
    if(hemi){hemi.intensity=look.hemi*(overcast?.82:1);hemi.diffuse=overcast?new Color3(.85,.87,.9):look.hemiColour;hemi.groundColor=look.ground}
    if(sun){sun.intensity=look.sun*(wet?.3:1);sun.diffuse=look.sunColour}
    scene.imageProcessingConfiguration.exposure=look.exposure*(overcast?.92:1);
    // The sky dome's gradient is blue (its own colours): under rain cloud it is hidden, leaving the grey behind it.
    const dome=scene.getMeshByName('sky-dome'),skyMaterial=scene.getMaterialByName('sky-dome') as StandardMaterial|null;
    if(dome)dome.isVisible=!overcast;
    if(skyMaterial)skyMaterial.emissiveColor=look.skyGlow;
    // A wet road: darker and shinier (the sky and lamps catch in it); pavements a little darker.
    for(const [name,dark,shine] of [['tarmac',.72,.38],['pavement',.82,.2],['kerb',.85,.15]] as const){
      const m=scene.getMaterialByName(name) as StandardMaterial|null;
      if(!m)continue;
      const base=this.remember(m);
      m.diffuseColor=wet?base.diffuse.scale(dark):base.diffuse.clone();
      m.specularColor=wet?new Color3(shine,shine,shine):base.specular.clone();
      m.specularPower=wet?48:base.power;
    }
    // Traffic's head and tail lamps glow after dark (their own colours).
    for(const m of scene.materials){
      if(!(m instanceof StandardMaterial)||!/^(Light|Red light|Back light)$/.test(m.name))continue;
      const base=this.remember(m);
      m.emissiveColor=conditions.time==='day'?base.emissive.clone():base.diffuse.scale(conditions.time==='night'?.95:.5);
    }
    this.setPools(conditions.time!=='day'?lamps:[]);
    this.setBeam(conditions.time!=='day'?car:null);
    this.setRain(wet);
  }

  /** Moves the rain round the camera; call once per frame. */
  update(camera:{x:number;y:number;z:number},time:number):void{
    if(!this.rain||!this.drops||!this.seeds)return;
    const n=this.seeds.length/3,d=this.drops;
    for(let i=0;i<n;i++){
      const sx=this.seeds[i*3]!,sz=this.seeds[i*3+1]!,sy=this.seeds[i*3+2]!;
      // In a box 36 m across round the camera, falling 9 m/s through 12 m and round again.
      const x=camera.x+(sx-.5)*36,z=camera.z+(sz-.5)*36,y=camera.y-3+((sy*12-time*9)%12+12)%12;
      const o=i*16;d[o+12]=x;d[o+13]=y;d[o+14]=z;
    }
    this.rain.thinInstanceBufferUpdated('matrix');
  }

  private remember(m:StandardMaterial){
    let s=this.saved.get(m);
    if(!s){s={diffuse:m.diffuseColor.clone(),specular:m.specularColor.clone(),power:m.specularPower,emissive:m.emissiveColor.clone()};this.saved.set(m,s)}
    return s;
  }

  private setPools(lamps:readonly Lamp[]):void{
    this.pools?.dispose();this.pools=null;
    if(lamps.length===0)return;
    const corners:number[][]=[];
    for(const l of lamps){
      const f={x:Math.sin(l.heading),z:-Math.cos(l.heading)};
      // The pool on the ground under the lantern (out over the road), and the lantern's own glow.
      const cx=l.x+f.x*1.6,cz=l.z+f.z*1.6,r=7,y=groundAt(cx,cz)+l.y+.03;
      corners.push([cx-r,y,cz-r,cx+r,y,cz-r,cx+r,y,cz+r,cx-r,y,cz+r]);
      const hx=l.x+f.x*.8,hz=l.z+f.z*.8,hy=groundAt(hx,hz)+l.y+5.7,g=.55;
      corners.push([hx-g,hy,hz-g,hx+g,hy,hz-g,hx+g,hy,hz+g,hx-g,hy,hz+g]);
    }
    this.pools=quads('weather-lamp-pools',this.scene,corners,new Color3(1,.78,.5).scale(.55),this.glow);
  }

  private setBeam(car:TransformNode|null):void{
    this.beam?.dispose();this.beam=null;
    if(!car)return;
    // The headlights on the road ahead: a long soft oval from just in front of the bumper (car-local, −Z forward).
    const y=.04,w=4.2,near=-2.2,far=-26;
    const mesh=quads('weather-headlights',this.scene,[[-w,y,far,w,y,far,w,y,near,-w,y,near]],new Color3(1,.95,.82).scale(.5),this.glow);
    mesh.unfreezeWorldMatrix();mesh.parent=car;
    this.beam=mesh;
  }

  private setRain(on:boolean):void{
    if(!on){this.rain?.dispose();this.rain=null;this.drops=null;this.seeds=null;return}
    if(this.rain)return;
    const n=this.quality.id==='phone'?600:1200;
    const streak=CreateBox('weather-rain',{width:.015,height:.7,depth:.015},this.scene);
    const m=new StandardMaterial('weather-rain',this.scene);
    m.disableLighting=true;m.emissiveColor=new Color3(.82,.86,.92);m.alpha=.5;m.fogEnabled=false;
    streak.material=m;streak.isPickable=false;
    this.seeds=Float32Array.from({length:n*3},()=>Math.random());
    this.drops=new Float32Array(n*16);
    for(let i=0;i<n;i++){const o=i*16;this.drops[o]=1;this.drops[o+5]=1;this.drops[o+10]=1;this.drops[o+15]=1}
    streak.thinInstanceSetBuffer('matrix',this.drops,16,false);
    // (Round the camera wherever it is: never culled.)
    streak.alwaysSelectAsActiveMesh=true;
    this.rain=streak;
  }

  dispose():void{this.pools?.dispose();this.beam?.dispose();this.rain?.dispose();this.glow.dispose()}
}
