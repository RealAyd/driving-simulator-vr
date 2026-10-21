import {groundAt} from '../engine/babylonAdapter';
import {Color3,StandardMaterial,type Mesh,type Scene,type TransformNode} from '../engine/babylon';
import {Geometry,type RGB,type V3} from './streetscapeMesh';
import type {Appearance,FigurePose} from './crowd';
import type {AnimatedPeople} from './animatedPeople';

/** People within this distance of the car are drawn as animated models when there is a free copy. */
const ANIMATED_RANGE=50;

/**
 * Project-owned low-poly people, drawn as thin instances of three shared
 * shapes (a limb/torso prism, a head/hand ball and a hair cap), so any number
 * of people costs three draw calls. Each body part is an instance with its
 * own colour and transform; walking swings the legs and arms from the hips
 * and shoulders, driven by distance walked (simulated time), not frame rate.
 */

export interface Figure{id:string;look:Appearance;pose:(t:number)=>FigurePose;visible?:()=>boolean}

/** 6-sided prism, radius 0.5, hanging from its top (y 0 down to -1); the lowest tenth darker (shoes, cuffs). */
function prismShape():Geometry{
  const g=new Geometry([0,0]),n=6;
  const ring=(y:number,r:number)=>Array.from({length:n},(_,i)=>{const a=(i+.5)/n*Math.PI*2;return [Math.cos(a)*r,y,Math.sin(a)*r] as V3});
  const bands:Array<[number,number,RGB]>=[[0,-.9,[1,1,1]],[-.9,-1,[.32,.32,.32]]];
  for(const [y0,y1,c] of bands){
    const top=ring(y0,.5),bot=ring(y1,.5);
    for(let i=0;i<n;i++){const j=(i+1)%n;const a=(i+.5)/n*Math.PI*2+Math.PI/n;g.flat([bot[i]!,bot[j]!,top[j]!,top[i]!],c,[Math.cos(a),0,Math.sin(a)])}
  }
  g.flat(ring(0,.5),[1,1,1],[0,1,0]);
  g.flat(ring(-1,.5),[.32,.32,.32],[0,-1,0]);
  return g;
}

/** Low-poly ball of radius 0.5 (heads, hands). */
function ballShape(hemisphere=false):Geometry{
  const g=new Geometry([0,0]),rings=hemisphere?2:4,seg=6;
  const pt=(i:number,j:number):V3=>{
    const th=i/4*Math.PI,ph=j/seg*Math.PI*2;
    return [Math.sin(th)*Math.cos(ph)*.5,Math.cos(th)*.5,Math.sin(th)*Math.sin(ph)*.5];
  };
  for(let i=0;i<rings;i++)for(let j=0;j<seg;j++){
    const q=[pt(i,j),pt(i,j+1),pt(i+1,j+1),pt(i+1,j)];
    const m=pt(i+.5,j+.5);
    g.flat(i===0?[q[0]!,q[2]!,q[3]!]:q,[1,1,1],m);
  }
  if(hemisphere){
    const rim=Array.from({length:seg},(_,j)=>pt(rings,j));
    g.flat(rim,[1,1,1],[0,-1,0]);
  }
  return g;
}

/** Row-major 4×4 (Babylon) for: scale, offset `pre` below the pivot, swing about x, move to `o`, turn to heading, place at P. */
function partMatrix(out:Float32Array,k:number,sx:number,sy:number,sz:number,pre:V3,swing:number,o:V3,h:number,P:V3){
  const ca=Math.cos(swing),sa=Math.sin(swing),ch=Math.cos(h),sh=Math.sin(h);
  const yaw=(x:number,y:number,z:number):V3=>[x*ch-z*sh,y,x*sh+z*ch];
  const rx=(x:number,y:number,z:number):V3=>[x,y*ca-z*sa,y*sa+z*ca];
  const r0=yaw(...rx(sx,0,0)),r1=yaw(...rx(0,sy,0)),r2=yaw(...rx(0,0,sz));
  const p=rx(...pre);
  const t=yaw(p[0]+o[0],p[1]+o[1],p[2]+o[2]);
  out.set([r0[0],r0[1],r0[2],0,r1[0],r1[1],r1[2],0,r2[0],r2[1],r2[2],0,t[0]+P[0],t[1]+P[1],t[2]+P[2],1],k*16);
}

class Part{
  matrices=new Float32Array(0);
  colours=new Float32Array(0);
  constructor(readonly mesh:Mesh){}
  resize(n:number){
    if(this.matrices.length===n*16)return;
    this.matrices=new Float32Array(n*16);this.colours=new Float32Array(n*4);
    this.mesh.thinInstanceSetBuffer('matrix',this.matrices,16,false);
    this.mesh.thinInstanceSetBuffer('color',this.colours,4,false);
  }
}

export class PeopleRenderer{
  private readonly figures=new Map<string,Figure>();
  private readonly body:Part;
  private readonly ball:Part;
  private readonly hair:Part;
  private readonly material:StandardMaterial;
  private dirtyColours=true;
  private drawnKey='';

  constructor(scene:Scene,parent:TransformNode){
    this.material=new StandardMaterial('people',scene);
    this.material.diffuseColor=new Color3(1,1,1);
    this.material.specularColor=new Color3(.06,.06,.06);
    this.material.backFaceCulling=true;
    const make=(name:string,g:Geometry)=>{
      const m=g.mesh(name,scene,this.material,parent)!;
      m.alwaysSelectAsActiveMesh=true;
      return new Part(m);
    };
    this.body=make('people-body',prismShape());
    this.ball=make('people-head',ballShape());
    this.hair=make('people-hair',ballShape(true));
  }

  get count(){return this.figures.size}

  add(figure:Figure):void{this.figures.set(figure.id,figure);this.dirtyColours=true}
  remove(id:string):void{this.figures.delete(id);this.dirtyColours=true}
  ids():string[]{return [...this.figures.keys()]}

  /** Rigged, animated models for exercise figures and the people nearest the car (set once they have loaded). */
  animated:AnimatedPeople|null=null;
  /** Ids drawn by the animated models in the last update. */
  animatedIds=new Set<string>();

  /** Places every figure for simulated time t; people further than `range` from `near` are not drawn. */
  update(t:number,near?:{x:number;z:number},range=140):void{
    let list:Array<{f:Figure;pose:FigurePose}>=[];
    for(const f of this.figures.values()){
      if(!(f.visible?.()??true))continue;
      const pose=f.pose(t);
      if(near&&Math.hypot(pose.x-near.x,pose.z-near.z)>range)continue;
      list.push({f,pose});
    }
    if(this.animated&&near){
      // Exercise figures always, then the nearest people within ANIMATED_RANGE.
      const d=(p:FigurePose)=>Math.hypot(p.x-near.x,p.z-near.z);
      const wanted=list.filter(({f,pose})=>f.id.startsWith('actor-')||d(pose)<ANIMATED_RANGE)
        .sort((a,b)=>Number(b.f.id.startsWith('actor-'))-Number(a.f.id.startsWith('actor-'))||d(a.pose)-d(b.pose))
        .map(({f,pose})=>({id:f.id,height:f.look.height,pose,priority:f.id.startsWith('actor-')}));
      this.animatedIds=this.animated.update(wanted,t);
      list=list.filter(({f})=>!this.animatedIds.has(f.id));
    }
    const key=list.map(x=>x.f.id).join();
    if(key!==this.drawnKey){this.drawnKey=key;this.dirtyColours=true}
    const n=list.length;
    const resized=this.body.matrices.length!==n*7*16;
    this.body.resize(n*7);this.ball.resize(n);this.hair.resize(n);
    if(resized)this.dirtyColours=true;
    list.forEach(({f,pose},i)=>this.place(f,pose,i));
    if(this.dirtyColours){
      list.forEach(({f},i)=>this.colour(f.look,i));
      for(const p of [this.body,this.ball,this.hair])p.mesh.thinInstanceBufferUpdated('color');
      this.dirtyColours=false;
    }
    for(const p of [this.body,this.ball,this.hair]){p.mesh.thinInstanceBufferUpdated('matrix');p.mesh.thinInstanceCount=p.matrices.length/16}
  }

  private colour(look:Appearance,i:number){
    const set=(p:Part,k:number,c:RGB)=>p.colours.set([c[0],c[1],c[2],1],k*4);
    set(this.body,i*7,look.legs);set(this.body,i*7+1,look.legs);
    set(this.body,i*7+2,look.top);set(this.body,i*7+3,look.top);set(this.body,i*7+4,look.top);
    set(this.body,i*7+5,look.skin);set(this.body,i*7+6,look.skin);
    set(this.ball,i,look.skin);
    set(this.hair,i,look.hair);
  }

  private place(f:Figure,pose:FigurePose,i:number){
    const L=f.look,k=L.height/1.75,w=L.build;
    // On the ground (terrain): poses are flat.
    const P:V3=[pose.x,pose.y+groundAt(pose.x,pose.z),pose.z];
    // Facing: heading clockwise from north; the figure's forward is −z.
    const h=pose.heading;
    const phase=pose.stride/(.78*k)*Math.PI;
    const swing=pose.walking?Math.sin(phase)*.42:0;
    const arm=pose.walking?Math.sin(phase)*.32:.04;
    const bob=pose.walking?Math.abs(Math.cos(phase))*.025:0;
    const hip=.9*k+bob,shoulder=1.43*k+bob;
    const B=this.body.matrices,H=this.ball.matrices;
    partMatrix(B,i*7,.15*k,hip,.16*k,[0,0,0],swing,[-.095*k*w,hip,0],h,P);
    partMatrix(B,i*7+1,.15*k,hip,.16*k,[0,0,0],-swing,[.095*k*w,hip,0],h,P);
    partMatrix(B,i*7+2,.38*k*w,(.6+L.coat)*k,.23*k,[0,0,0],0,[0,shoulder+.02*k,0],h,P);
    partMatrix(B,i*7+3,.09*k,.6*k,.1*k,[0,0,0],-arm,[-.235*k*w,shoulder,0],h,P);
    partMatrix(B,i*7+4,.09*k,.6*k,.1*k,[0,0,0],arm,[.235*k*w,shoulder,0],h,P);
    // Hands: short prisms below the sleeves.
    partMatrix(B,i*7+5,.08*k,.11*k,.08*k,[0,-.58*k,0],-arm,[-.235*k*w,shoulder,0],h,P);
    partMatrix(B,i*7+6,.08*k,.11*k,.08*k,[0,-.58*k,0],arm,[.235*k*w,shoulder,0],h,P);
    partMatrix(H,i,.21*k,.25*k,.23*k,[0,0,0],0,[0,1.6*k+bob,0],h,P);
    const hs=[[.225,.27,.24],[.23,.3,.26],[.235,.34,.28]][L.hair_style]!;
    partMatrix(this.hair.matrices,i,hs[0]!*k,hs[1]!*k,hs[2]!*k,[0,0,0],0,[0,1.62*k+bob,.012*k],h,P);
  }

  dispose():void{
    for(const p of [this.body,this.ball,this.hair])p.mesh.dispose();
    this.material.dispose();
  }
}
