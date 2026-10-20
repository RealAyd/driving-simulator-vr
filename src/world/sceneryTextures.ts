import {DynamicTexture,Texture,type Scene} from '../engine/babylon';

/**
 * Project-owned textures drawn at load time (no image files): brick and roof
 * tiles that repeat, and one small sheet of details (windows, doors, hedge,
 * fence boards, paving, drain grates). All are pale or neutral so one texture
 * serves many colours: vertex colours tint them per house.
 */

/** Region of the detail sheet, in texture coordinates (v up). */
export interface Region{u0:number;v0:number;u1:number;v1:number}

const SHEET=512;
/** Pixel rectangles on the detail sheet (x, y from the top-left, width, height). */
const AREAS={
  flat:[2,2,28,28],
  window:[36,4,120,120],
  door:[164,4,56,120],
  hedge:[228,4,120,120],
  boards:[356,4,120,120],
  paving:[4,132,120,120],
  grate:[132,132,56,56],
  grass:[196,132,120,120],
  // Shop window displays (glass with what is behind it), in the style of asset Batch C's shop-shelves tile.
  shelves:[4,260,88,120],
  rail:[100,260,88,120],
  cafe:[196,260,88,120],
  pub:[292,260,88,120],
  office:[388,260,88,120]
} as const;
export type RegionName=keyof typeof AREAS;

function region([x,y,w,h]:readonly number[]):Region{
  // Half a pixel in from each edge so filtering does not pick up neighbours.
  return {u0:(x!+.5)/SHEET,u1:(x!+w!-.5)/SHEET,v0:1-(y!+h!-.5)/SHEET,v1:1-(y!+.5)/SHEET};
}
export const REGIONS=Object.fromEntries(Object.entries(AREAS).map(([k,v])=>[k,region(v)])) as Record<RegionName,Region>;

function random(seed:number){
  let a=seed;
  return ()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296};
}
const grey=(v:number)=>{const c=Math.round(Math.max(0,Math.min(1,v))*255);return `rgb(${c},${c},${c})`};

function texture(scene:Scene,name:string,size:number,draw:(ctx:CanvasRenderingContext2D)=>void,wrap:boolean):DynamicTexture{
  const tex=new DynamicTexture(name,{width:size,height:size},scene,true);
  draw(tex.getContext() as unknown as CanvasRenderingContext2D);
  tex.update(true);
  tex.wrapU=tex.wrapV=wrap?Texture.WRAP_ADDRESSMODE:Texture.CLAMP_ADDRESSMODE;
  tex.anisotropicFilteringLevel=1;
  return tex;
}

/** Running-bond brick, 4 bricks by 12 courses per 0.9 m repeat; light so the vertex colour sets the brick colour. */
export function brickTexture(scene:Scene):DynamicTexture{
  return texture(scene,'scenery-brick',256,ctx=>{
    const rand=random(7);
    ctx.fillStyle=grey(1);
    ctx.fillRect(0,0,256,256);
    const course=256/12,brick=64;
    for(let row=0;row<12;row++){
      const offset=row%2?brick/2:0;
      for(let col=-1;col<5;col++){
        ctx.fillStyle=grey(.72+rand()*.2);
        ctx.fillRect(col*brick+offset+1.5,row*course+1.5,brick-3,course-3);
      }
    }
  },true);
}

/** Roof tiles or slates: overlapping courses with shadowed lower edges, 1 m repeat. */
export function roofTexture(scene:Scene):DynamicTexture{
  return texture(scene,'scenery-roof',256,ctx=>{
    const rand=random(11);
    const rows=8,tile=256/6;
    for(let row=0;row<rows;row++){
      const h=256/rows,offset=row%2?tile/2:0;
      for(let col=-1;col<7;col++){
        ctx.fillStyle=grey(.78+rand()*.16);
        ctx.fillRect(col*tile+offset,row*h,tile-1.5,h);
        ctx.fillStyle=grey(.55);
        ctx.fillRect(col*tile+offset,row*h+h-3,tile-1.5,3);
      }
    }
  },true);
}

/** The detail sheet: see AREAS. */
export function detailTexture(scene:Scene):DynamicTexture{
  return texture(scene,'scenery-detail',SHEET,ctx=>{
    const rand=random(3);
    ctx.fillStyle=grey(1);
    ctx.fillRect(0,0,SHEET,SHEET);
    // Window: white frame, two casements and a top light, glass darker at the bottom (sky reflected at the top).
    {
      const [x,y,w,h]=AREAS.window;
      const glass=ctx.createLinearGradient(0,y,0,y+h);
      glass.addColorStop(0,'#8ea3b4');glass.addColorStop(.45,'#3c4a56');glass.addColorStop(1,'#1f272e');
      ctx.fillStyle='#f4f4f0';ctx.fillRect(x,y,w,h);
      ctx.fillStyle=glass;
      const f=8,bar=5,top=Math.round(h*.3);
      ctx.fillRect(x+f,y+f,w-2*f,top-f-bar/2);
      ctx.fillRect(x+f,y+top+bar/2,(w-2*f-bar)/2,h-top-f-bar/2);
      ctx.fillRect(x+f+(w-2*f+bar)/2,y+top+bar/2,(w-2*f-bar)/2,h-top-f-bar/2);
    }
    // Door: four panels, glazed top light, letterbox and knob (the panels are tinted by the door colour).
    {
      const [x,y,w,h]=AREAS.door;
      ctx.fillStyle=grey(.93);ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#2c3640';ctx.fillRect(x+6,y+5,w-12,16);
      ctx.strokeStyle=grey(.7);ctx.lineWidth=2;
      for(const [px,py,pw,ph] of [[9,28,16,38],[31,28,16,38],[9,74,16,40],[31,74,16,40]])ctx.strokeRect(x+px!,y+py!,pw!,ph!);
      ctx.fillStyle=grey(.25);ctx.fillRect(x+20,y+68,16,3);ctx.fillRect(x+w-9,y+70,4,4);
    }
    // Hedge and tree leaves: dappled.
    {
      const [x,y,w,h]=AREAS.hedge;
      ctx.fillStyle=grey(.8);ctx.fillRect(x,y,w,h);
      for(let i=0;i<900;i++){ctx.fillStyle=grey(.55+rand()*.45);ctx.fillRect(x+rand()*(w-4),y+rand()*(h-4),2+rand()*4,2+rand()*3)}
    }
    // Close-boarded fence: vertical boards with a rail.
    {
      const [x,y,w,h]=AREAS.boards;
      for(let i=0;i<w;i+=10){ctx.fillStyle=grey(.82+rand()*.12);ctx.fillRect(x+i,y,9,h);ctx.fillStyle=grey(.6);ctx.fillRect(x+i+9,y,1,h)}
      ctx.fillStyle=grey(.7);ctx.fillRect(x,y,w,5);
    }
    // Paving slabs.
    {
      const [x,y,w,h]=AREAS.paving;
      ctx.fillStyle=grey(.7);ctx.fillRect(x,y,w,h);
      for(let i=0;i<4;i++)for(let j=0;j<4;j++){ctx.fillStyle=grey(.86+rand()*.1);ctx.fillRect(x+i*30+1,y+j*30+1,28,28)}
    }
    // Gully grate.
    {
      const [x,y,w,h]=AREAS.grate;
      ctx.fillStyle=grey(.18);ctx.fillRect(x,y,w,h);
      ctx.fillStyle=grey(.05);for(let i=6;i<w-4;i+=7)ctx.fillRect(x+i,y+6,3,h-12);
    }
    // Shop window displays: an interior lit from above, what the business shows, then reflections on the glass.
    {
      const goods=['#c8553d','#e0b44c','#4f8fa8','#7fae5a','#d9d2c3','#8a5a9e','#3d6fb6','#e07b39','#b9c4c9'];
      const pick=()=>goods[Math.floor(rand()*goods.length)]!;
      const interior=(x:number,y:number,w:number,h:number,top:string,bottom:string)=>{
        const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,top);g.addColorStop(1,bottom);
        ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
        ctx.fillStyle='rgba(255,244,214,.55)';ctx.fillRect(x,y,w,4);
      };
      {
        const [x,y,w,h]=AREAS.shelves;
        interior(x,y,w,h,'#6f7478','#3b4044');
        for(let k=0;k<4;k++){
          const sy=y+18+k*26;
          for(let i=x+3;i<x+w-6;){const bw=5+rand()*7,bh=8+rand()*12;ctx.fillStyle=pick();ctx.fillRect(i,sy+18-bh,bw,bh);i+=bw+1+rand()*2}
          ctx.fillStyle='#c9ccce';ctx.fillRect(x,sy+18,w,3);
        }
      }
      {
        const [x,y,w,h]=AREAS.rail;
        interior(x,y,w,h,'#7a746c','#40403e');
        ctx.fillStyle='#bfc3c6';ctx.fillRect(x+4,y+26,w-8,3);
        for(let i=x+6;i<x+w-10;i+=7+rand()*3){ctx.fillStyle=pick();ctx.fillRect(i,y+29,7,40+rand()*30);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(i+6,y+29,1,40)}
        ctx.fillStyle='#d8d3c8';ctx.fillRect(x+w/2-8,y+18,16,62);ctx.fillStyle=pick();ctx.fillRect(x+w/2-10,y+40,20,34);
      }
      {
        const [x,y,w,h]=AREAS.cafe;
        interior(x,y,w,h,'#a0835f','#5a4532');
        for(let i=0;i<3;i++){const lx=x+14+i*30;ctx.fillStyle='#2a2a2a';ctx.fillRect(lx,y,1,16);ctx.fillStyle='#ffe7a8';ctx.beginPath();ctx.arc(lx,y+19,5,0,Math.PI*2);ctx.fill()}
        ctx.fillStyle='#e9e2d4';ctx.fillRect(x+4,y+40,w-8,18);
        for(let i=x+8;i<x+w-8;i+=12){ctx.fillStyle=pick();ctx.fillRect(i,y+44,8,10)}
        ctx.fillStyle='#3a2a1e';ctx.fillRect(x,y+84,w,10);
        for(const tx of [x+18,x+58]){ctx.fillStyle='#d8cdb8';ctx.fillRect(tx-10,y+92,20,3);ctx.fillStyle='#3a2a1e';ctx.fillRect(tx-1,y+95,2,18)}
      }
      {
        const [x,y,w,h]=AREAS.pub;
        interior(x,y,w,h,'#7a4b2a','#2e1a10');
        for(let i=0;i<3;i++){const lx=x+14+i*30;ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(lx,y+16,4,0,Math.PI*2);ctx.fill()}
        for(let k=0;k<2;k++)for(let i=x+6;i<x+w-6;i+=5){ctx.fillStyle=['#5a7d3c','#8a2f24','#c9a24b','#d9d2c3'][Math.floor(rand()*4)]!;ctx.fillRect(i,y+30+k*16,3,11)}
        ctx.fillStyle='#4a2c18';ctx.fillRect(x,y+66,w,30);ctx.fillStyle='#8a5a33';ctx.fillRect(x,y+64,w,4);
        ctx.fillStyle='#d8c9a0';for(let i=x+10;i<x+w-6;i+=22)ctx.fillRect(i,y+54,3,10);
      }
      {
        const [x,y,w,h]=AREAS.office;
        interior(x,y,w,h,'#c9cdd0','#7d8387');
        for(let i=0;i<3;i++){ctx.fillStyle=pick();ctx.fillRect(x+6+i*27,y+14,22,30);ctx.fillStyle='#f4f4f0';ctx.fillRect(x+9+i*27,y+18,16,6)}
        ctx.fillStyle='#5b636a';ctx.fillRect(x+6,y+74,w-12,6);
        for(const dx of [x+16,x+52]){ctx.fillStyle='#2c3238';ctx.fillRect(dx,y+58,16,12);ctx.fillStyle='#8fb3cc';ctx.fillRect(dx+2,y+60,12,8)}
        ctx.fillStyle='#5b636a';ctx.fillRect(x+10,y+80,3,26);ctx.fillRect(x+w-13,y+80,3,26);
      }
      // Glass: a sky reflection at the top and two diagonal highlights on every display.
      for(const key of ['shelves','rail','cafe','pub','office'] as const){
        const [x,y,w,h]=AREAS[key];
        const sky=ctx.createLinearGradient(0,y,0,y+h*.45);sky.addColorStop(0,'rgba(190,210,225,.45)');sky.addColorStop(1,'rgba(190,210,225,0)');
        ctx.fillStyle=sky;ctx.fillRect(x,y,w,h);
        ctx.fillStyle='rgba(255,255,255,.12)';
        for(const o of [.15,.55]){ctx.beginPath();ctx.moveTo(x+w*o,y+h);ctx.lineTo(x+w*o+14,y+h);ctx.lineTo(x+w*o+44,y);ctx.lineTo(x+w*o+30,y);ctx.closePath();ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.beginPath();ctx.moveTo(x+w*o,y+h);ctx.lineTo(x+w*o+14,y+h);ctx.lineTo(x+w*o+44,y);ctx.lineTo(x+w*o+30,y);ctx.closePath();ctx.fill();ctx.restore()}
      }
    }
    // Grass.
    {
      const [x,y,w,h]=AREAS.grass;
      ctx.fillStyle=grey(.86);ctx.fillRect(x,y,w,h);
      for(let i=0;i<600;i++){ctx.fillStyle=grey(.72+rand()*.28);ctx.fillRect(x+rand()*(w-2),y+rand()*(h-3),1.5,3)}
    }
  },false);
}
