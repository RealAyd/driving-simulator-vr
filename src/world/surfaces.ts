import {Color3,CreateSphere,DynamicTexture,Mesh,StandardMaterial,Texture,type Scene} from '../engine/babylon';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer';
import {ImageProcessingConfiguration} from '@babylonjs/core/Materials/imageProcessingConfiguration';

/**
 * Ground surfaces and sky (project-owned, drawn procedurally): asphalt with aggregate, 600 mm paving
 * slabs, granite kerb blocks and grass as tiling textures, mapped in world space so every road piece
 * lines up; a gradient sky dome that meets the distance haze; filmic tone mapping.
 */

/** Metres covered by one repeat of each texture. */
export const SURFACE_REPEAT={asphalt:4,paving:2.4,kerb:1.8,grass:3} as const;
export type SurfaceKind=keyof typeof SURFACE_REPEAT;

const SIZE=512;

/** Small deterministic generator so the textures are the same on every load. */
function random(seed:number):()=>number{
  let s=seed>>>0;
  return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296};
}

/** Smooth tiling value noise in 0..1 with `cells` cells across the texture. */
function valueNoise(rand:()=>number,cells:number):(x:number,y:number)=>number{
  const g=Array.from({length:cells*cells},()=>rand());
  const at=(i:number,j:number)=>g[((j%cells+cells)%cells)*cells+((i%cells+cells)%cells)]!;
  const s=(t:number)=>t*t*(3-2*t);
  return (x,y)=>{
    const fx=x/SIZE*cells,fy=y/SIZE*cells,i=Math.floor(fx),j=Math.floor(fy),u=s(fx-i),v=s(fy-j);
    return (at(i,j)*(1-u)+at(i+1,j)*u)*(1-v)+(at(i,j+1)*(1-u)+at(i+1,j+1)*u)*v;
  };
}

type Painter=(img:ImageData,rand:()=>number)=>void;

const put=(img:ImageData,x:number,y:number,r:number,g:number,b:number)=>{
  const i=((y&(SIZE-1))*SIZE+(x&(SIZE-1)))*4;
  img.data[i]=r;img.data[i+1]=g;img.data[i+2]=b;img.data[i+3]=255;
};

const PAINT:Record<SurfaceKind,Painter>={
  asphalt(img,rand){
    const broad=valueNoise(rand,6),fine=valueNoise(rand,48);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const v=80+(broad(x,y)-.5)*14+(fine(x,y)-.5)*10+(rand()-.5)*16;
      put(img,x,y,v,v+1,v+4);
    }
    // Aggregate: light and dark stones a pixel or two across.
    for(let n=0;n<9000;n++){
      const x=Math.floor(rand()*SIZE),y=Math.floor(rand()*SIZE),light=rand()<.55,v=light?100+rand()*45:38+rand()*12;
      put(img,x,y,v,v,v+2);
      if(rand()<.4)put(img,x+1,y,v,v,v+2);
    }
  },
  paving(img,rand){
    const fine=valueNoise(rand,64),SLAB=SIZE/4;
    const tint=Array.from({length:16},()=>(rand()-.5)*14);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const joint=x%SLAB<2||y%SLAB<2;
      const t=tint[Math.floor(y/SLAB)*4+Math.floor(x/SLAB)]!;
      const v=joint?104:150+t+(fine(x,y)-.5)*14+(rand()-.5)*10;
      put(img,x,y,v,v-2,v-6);
    }
  },
  kerb(img,rand){
    const fine=valueNoise(rand,40),BLOCK=SIZE/2;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const joint=x%BLOCK<3;
      const v=joint?120:176+(fine(x,y)-.5)*16+(rand()-.5)*26;
      put(img,x,y,v,v,v-3);
    }
  },
  grass(img,rand){
    const broad=valueNoise(rand,5),clumps=valueNoise(rand,30);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const b=broad(x,y),c=clumps(x,y),n=rand();
      put(img,x,y,64+b*22+c*10+n*18,104+b*26+c*20+n*26,52+b*10+n*12);
    }
  }
};

const cache=new WeakMap<Scene,Map<SurfaceKind,Texture>>();

/** The tiling texture for a surface (made once per scene). */
export function surfaceTexture(scene:Scene,kind:SurfaceKind):Texture{
  let m=cache.get(scene);
  if(!m){m=new Map();cache.set(scene,m)}
  let t=m.get(kind);
  // A world's materials and textures are disposed with it when the location changes: make a new one then.
  if(!t||!t.getInternalTexture()){
    const tex=new DynamicTexture(`surface-${kind}`,{width:SIZE,height:SIZE},scene,true);
    const ctx=tex.getContext() as unknown as CanvasRenderingContext2D;
    const img=ctx.createImageData(SIZE,SIZE);
    PAINT[kind](img,random(kind.length*7919+kind.charCodeAt(0)));
    ctx.putImageData(img,0,0);
    tex.update(true);
    tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;
    // Roads are seen at grazing angles: anisotropic filtering keeps them sharp into the distance.
    tex.anisotropicFilteringLevel=8;
    t=tex;
    m.set(kind,t);
  }
  return t;
}

/** Puts a surface texture on a material: the texture carries the colour, the material only tints it. */
export function texture(material:StandardMaterial,kind:SurfaceKind,tint=new Color3(1,1,1)):void{
  material.diffuseTexture=surfaceTexture(material.getScene(),kind);
  material.diffuseColor=tint;
}

/**
 * World-space texture coordinates (mesh vertices already in world space, as merged static meshes are):
 * horizontal surfaces from x and z; steep faces (kerb faces) along the face and up it.
 */
export function mapWorldUVs(mesh:Mesh,kind:SurfaceKind):void{
  const p=mesh.getVerticesData(VertexBuffer.PositionKind),n=mesh.getVerticesData(VertexBuffer.NormalKind);
  if(!p)return;
  const world=mesh.computeWorldMatrix(true).m,repeat=SURFACE_REPEAT[kind];
  const uv=new Float32Array(p.length/3*2);
  for(let i=0,k=0;i<p.length;i+=3,k+=2){
    const lx=p[i]!,ly=p[i+1]!,lz=p[i+2]!;
    const x=lx*world[0]!+ly*world[4]!+lz*world[8]!+world[12]!;
    const y=lx*world[1]!+ly*world[5]!+lz*world[9]!+world[13]!;
    const z=lx*world[2]!+ly*world[6]!+lz*world[10]!+world[14]!;
    const steep=n?Math.abs(n[i+1]!)<.5:false;
    uv[k]=(steep?x+z:x)/repeat;
    uv[k+1]=(steep?y*3:z)/repeat;
  }
  mesh.setVerticesData(VertexBuffer.UVKind,uv,false,2);
}

/**
 * Sky: a dome that follows the camera (main view and mirrors), pale haze at the horizon to blue overhead.
 * Radius inside the mirror cameras' far plane (600 m) so the mirrors see it too.
 */
export function buildSky(scene:Scene,horizon:Color3,zenith:Color3):Mesh{
  const sky=CreateSphere('sky-dome',{diameter:1100,segments:16,sideOrientation:Mesh.BACKSIDE},scene);
  const p=sky.getVerticesData(VertexBuffer.PositionKind)!;
  const colours=new Float32Array(p.length/3*4);
  for(let i=0,k=0;i<p.length;i+=3,k+=4){
    const h=Math.max(0,p[i+1]!/550),t=Math.pow(h,.55);
    colours[k]=horizon.r+(zenith.r-horizon.r)*t;colours[k+1]=horizon.g+(zenith.g-horizon.g)*t;colours[k+2]=horizon.b+(zenith.b-horizon.b)*t;colours[k+3]=1;
  }
  sky.setVerticesData(VertexBuffer.ColorKind,colours);
  const m=new StandardMaterial('sky-dome',scene);
  m.disableLighting=true;
  m.diffuseColor=Color3.Black();
  m.emissiveColor=Color3.White();
  m.backFaceCulling=false;
  m.fogEnabled=false;
  sky.material=m;
  sky.infiniteDistance=true;
  sky.isPickable=false;
  sky.applyFog=false;
  return sky;
}

/** Filmic tone mapping and a little contrast: brighter highlights, richer shade (cheap: one pass in the materials). */
export function configureTone(scene:Scene):void{
  const ip=scene.imageProcessingConfiguration;
  ip.toneMappingEnabled=true;
  ip.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure=1.3;
  ip.contrast=1.12;
}
