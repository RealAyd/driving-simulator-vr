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
  grass:[196,132,120,120]
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
    // Grass.
    {
      const [x,y,w,h]=AREAS.grass;
      ctx.fillStyle=grey(.86);ctx.fillRect(x,y,w,h);
      for(let i=0;i<600;i++){ctx.fillStyle=grey(.72+rand()*.28);ctx.fillRect(x+rand()*(w-2),y+rand()*(h-3),1.5,3)}
    }
  },false);
}
