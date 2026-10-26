import {
  Color3,Color4,CreateBox,Mesh,StandardMaterial,VertexData,
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

/**
 * Soft round glows as one mesh: discs whose light fades from the middle to nothing at the rim, in the vertex colours
 * (no texture: a glow texture sampled on an iPhone came out as coloured speckles). Each disc is centre (x, z), radii
 * across and along, turned by `heading`, its height at each point given by `height` (on the ground: following it, so
 * no part sinks into a sloping road and flickers). Added to what is under it (additive), unlit.
 */
interface Glow{x:number;z:number;rx:number;rz:number;heading:number;height:(x:number,z:number)=>number}
function glows(name:string,scene:Scene,list:readonly Glow[],colour:Color3):Mesh{
  const positions:number[]=[],colours:number[]=[],indices:number[]=[];
  const SEG=20,RINGS:Array<[number,number]>=[[0,1],[.45,.55],[.75,.22],[1,0]];
  for(const g of list){
    const base=positions.length/3,c=Math.cos(g.heading),sn=Math.sin(g.heading);
    for(const [k,[r,a]] of RINGS.entries())for(let i=0;i<(k===0?1:SEG);i++){
      const t=i/SEG*Math.PI*2,lx=Math.cos(t)*g.rx*r,lz=Math.sin(t)*g.rz*r;
      const x=g.x+lx*c-lz*sn,z=g.z+lx*sn+lz*c;
      positions.push(x,g.height(x,z),z);colours.push(1,1,1,a);
    }
    // Centre fan, then quads between rings.
    for(let i=0;i<SEG;i++)indices.push(base,base+1+(i+1)%SEG,base+1+i);
    for(let k=1;k<RINGS.length-1;k++){
      const r0=base+1+(k-1)*SEG,r1=base+1+k*SEG;
      for(let i=0;i<SEG;i++){const j=(i+1)%SEG;indices.push(r0+i,r0+j,r1+j,r0+i,r1+j,r1+i)}
    }
  }
  const mesh=new Mesh(name,scene),data=new VertexData();
  data.positions=positions;data.colors=colours;data.indices=indices;
  const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;
  data.applyToMesh(mesh);
  mesh.hasVertexAlpha=true;
  const m=new StandardMaterial(name,scene);
  // Unlit: the glow colour, faded to nothing at the edge by the vertex alpha.
  m.disableLighting=true;m.diffuseColor=Color3.Black();m.emissiveColor=colour;
  m.alphaMode=1; // additive: light added to what is under it
  // (Blended: the material on its own looks opaque, and the vertex alpha would not fade the edge.)
  m.transparencyMode=2;
  m.backFaceCulling=false;m.fogEnabled=true;m.zOffset=-6;m.disableDepthWrite=true;
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
  /** Each material's own look (the day's), kept to go back to. */
  private readonly saved=new Map<StandardMaterial,{diffuse:Color3;specular:Color3;power:number;emissive:Color3}>();

  constructor(private readonly scene:Scene,private readonly quality:QualityProfile){
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
      // Fixed in the world (driving through the rain, not carrying it along: tied to the camera it looked like water
      // washing forward), in a box 36 m across that wraps round the camera; falling 9 m/s through 12 m and round again.
      const wrap=(v:number)=>((v%36)+36)%36-18;
      const x=camera.x+wrap(sx*36-camera.x),z=camera.z+wrap(sz*36-camera.z),y=camera.y-3+((sy*12-time*9)%12+12)%12;
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
    const list:Glow[]=[];
    for(const l of lamps){
      const f={x:Math.sin(l.heading),z:-Math.cos(l.heading)};
      // The pool on the ground under the lantern (out over the road), and the lantern's own glow.
      list.push({x:l.x+f.x*1.6,z:l.z+f.z*1.6,rx:7,rz:7,heading:0,height:(x,z)=>groundAt(x,z)+l.y+.05});
      list.push({x:l.x+f.x*.8,z:l.z+f.z*.8,rx:.55,rz:.55,heading:0,height:(x,z)=>groundAt(x,z)+l.y+5.7});
    }
    this.pools=glows('weather-lamp-pools',this.scene,list,new Color3(1,.78,.5).scale(.55));
  }

  private setBeam(car:TransformNode|null):void{
    this.beam?.dispose();this.beam=null;
    if(!car)return;
    // The headlights on the road ahead: a long soft oval from just in front of the bumper (car-local, −Z forward).
    const mesh=glows('weather-headlights',this.scene,[{x:0,z:-14,rx:4.2,rz:12,heading:0,height:()=>.06}],new Color3(1,.95,.82).scale(.5));
    mesh.unfreezeWorldMatrix();mesh.parent=car;
    this.beam=mesh;
    this.showLights();
  }

  private lights:'off'|'dipped'|'main'='dipped';
  /** The car's headlights (the Controls panel): no beam with them off; main beam reaches further and brighter. */
  setHeadlights(lights:'off'|'dipped'|'main'):void{
    if(lights===this.lights)return;
    this.lights=lights;this.showLights();
  }
  private showLights(){
    const b=this.beam;
    if(!b)return;
    b.isVisible=this.lights!=='off';
    // (From the bumper, 2.2 m ahead, the oval stretches: main beam about half as far again.)
    b.scaling.set(this.lights==='main'?1.15:1,1,this.lights==='main'?1.6:1);
    (b.material as StandardMaterial).emissiveColor=new Color3(1,.95,.82).scale(this.lights==='main'?.7:.5);
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

  dispose():void{this.pools?.dispose();this.beam?.dispose();this.rain?.dispose()}
}
