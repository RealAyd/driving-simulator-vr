import {Color3,DynamicTexture,StandardMaterial,Texture,type Mesh,type Scene,type TransformNode} from '../engine/babylon';
import {box,flatFace,Geometry,prism,type RGB,type V3} from './streetscapeMesh';
import type {Region} from './sceneryTextures';
import {CANOPY_FASCIA,PUMP_ALONG,PUMP_APART,type Canopy,type Shelter,type SignFace,type SignPanel,type SignPlan} from './signage';
import {hex} from './streetscapeMesh';

/**
 * Draws a sign plan: every face is lettered at load time onto one shared
 * texture sheet (no image files, no fonts downloaded), and all panels, posts
 * and shelters go into one mesh with one material. Text is plain lettering:
 * no logos, symbols copied from operators, or route numbers.
 */

const FONT='"Helvetica Neue",Helvetica,Arial,sans-serif';
const SHEET_WIDTH=1024;
/** Pixels per metre for each kind of face. */
const DENSITY={'street-name':240,'mini-roundabout':213,'bus-flag':280,fascia:110,'name-board':90,cross:200,hanging:220,stop:200,'give-way':200,'speed-limit':213,school:200,'roundabout-ahead':200,'keep-left':213,chevrons:160} as const;

interface Entry{key:string;w:number;h:number;draw:(ctx:CanvasRenderingContext2D,w:number,h:number)=>void;x?:number;y?:number}

/** A sheet of lettered faces packed in shelves. */
class FaceSheet{
  private readonly entries=new Map<string,Entry>();
  width=SHEET_WIDTH;height=0;
  add(e:Entry):string{if(!this.entries.has(e.key))this.entries.set(e.key,e);return e.key}
  pack():void{
    const list=[...this.entries.values()].sort((a,b)=>b.h-a.h);
    let x=0,y=0,shelf=0;
    for(const e of list){
      if(x+e.w+2>this.width){x=0;y+=shelf+2;shelf=0}
      e.x=x+1;e.y=y+1;x+=e.w+2;shelf=Math.max(shelf,e.h);
    }
    const needed=y+shelf+2;
    this.height=2**Math.ceil(Math.log2(Math.max(64,needed)));
  }
  region(key:string):Region{
    const e=this.entries.get(key)!;
    return {u0:(e.x!+.5)/this.width,u1:(e.x!+e.w-.5)/this.width,v0:1-(e.y!+e.h-.5)/this.height,v1:1-(e.y!+.5)/this.height};
  }
  texture(scene:Scene):DynamicTexture{
    const tex=new DynamicTexture('signage-sheet',{width:this.width,height:this.height},scene,true);
    const ctx=tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0,0,this.width,this.height);
    for(const e of this.entries.values()){
      ctx.save();
      ctx.translate(e.x!,e.y!);
      ctx.beginPath();ctx.rect(0,0,e.w,e.h);ctx.clip();
      e.draw(ctx,e.w,e.h);
      ctx.restore();
    }
    tex.update(true);
    tex.wrapU=tex.wrapV=Texture.CLAMP_ADDRESSMODE;
    tex.anisotropicFilteringLevel=4;
    return tex;
  }
}

function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

let measureCtx:CanvasRenderingContext2D|null=null;
function textWidth(text:string,font:string):number{
  measureCtx??=document.createElement('canvas').getContext('2d')!;
  measureCtx.font=font;
  return measureCtx.measureText(text).width;
}
/** Largest bold font size (px) up to `size` at which `text` fits `width` pixels. */
function fit(text:string,size:number,width:number,weight='700'):string{
  let s=size;
  while(s>8&&textWidth(text,`${weight} ${s}px ${FONT}`)>width)s-=1;
  return `${weight} ${s}px ${FONT}`;
}

/** UK street nameplate: black lettering on white with a black border. */
function drawStreetName(text:string){
  return (ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    ctx.fillStyle='#f7f7f2';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#111';ctx.lineWidth=Math.max(2,h*.05);ctx.strokeRect(h*.08,h*.08,w-h*.16,h-h*.16);
    ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=fit(text,Math.round(h*.56),w-h*.5);
    ctx.fillText(text,w/2,h*.54);
  };
}

/** Mini-roundabout sign (diagram 611.1): three white arrows circulating clockwise on a blue disc. */
function drawMiniRoundabout(ctx:CanvasRenderingContext2D,w:number,h:number){
  const c=w/2,R=w/2;
  ctx.fillStyle='#e8e8e8';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#0b4ea2';ctx.beginPath();ctx.arc(c,c,R-1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=w*.1;ctx.lineCap='butt';
  const r=R*.5,head=w*.15;
  for(let k=0;k<3;k++){
    // Canvas angles grow clockwise on screen (y down), the direction of circulation.
    const a0=-Math.PI/2+k*2*Math.PI/3+.5,a1=a0+1.05;
    ctx.beginPath();ctx.arc(c,c,r,a0,a1);ctx.stroke();
    const tip={x:c+Math.cos(a1+.5)*r,y:c+Math.sin(a1+.5)*r};
    const radial={x:Math.cos(a1),y:Math.sin(a1)};
    ctx.beginPath();
    ctx.moveTo(tip.x,tip.y);
    ctx.lineTo(c+radial.x*(r+head),c+radial.y*(r+head));
    ctx.lineTo(c+radial.x*(r-head),c+radial.y*(r-head));
    ctx.closePath();ctx.fill();
  }
}

/** Bus stop flag: "BUS STOP" band, a bus symbol, the stop name and its letter. No operator branding or routes. */
function drawBusFlag(name:string,indicator:string|null){
  return (ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    ctx.fillStyle='#fbfbf7';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#1b1b1b';ctx.lineWidth=3;ctx.strokeRect(1.5,1.5,w-3,h-3);
    const band=h*.2;
    ctx.fillStyle='#b3201c';ctx.fillRect(3,3,w-6,band);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=fit('BUS STOP',Math.round(band*.62),w-14);
    ctx.fillText('BUS STOP',w/2,3+band/2+1);
    // Bus symbol (side view).
    const bx=w*.18,by=band+h*.07,bw=w*.64,bh=h*.17;
    ctx.fillStyle='#1b1b1b';
    roundRect(ctx,bx,by,bw,bh,bh*.18);ctx.fill();
    ctx.fillStyle='#fbfbf7';
    for(let i=0;i<4;i++)ctx.fillRect(bx+bw*(.07+i*.215),by+bh*.15,bw*.17,bh*.36);
    ctx.fillStyle='#1b1b1b';
    for(const f of [.22,.78]){ctx.beginPath();ctx.arc(bx+bw*f,by+bh,bh*.22,0,Math.PI*2);ctx.fill()}
    // Stop name, on up to two lines.
    ctx.fillStyle='#111';
    const words=name.split(' ');
    const lines=words.length>1&&textWidth(name,`700 ${Math.round(h*.1)}px ${FONT}`)>w-14?[words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')]:[name];
    const nameTop=by+bh+h*.08,lh=h*.11;
    lines.forEach((line,i)=>{ctx.font=fit(line,Math.round(h*.1),w-14);ctx.fillText(line,w/2,nameTop+lh*(i+.5))});
    if(indicator){
      const y=nameTop+lh*lines.length+h*.04,bhh=h*.14;
      ctx.fillStyle='#1b1b1b';roundRect(ctx,w*.12,y,w*.76,bhh,bhh*.25);ctx.fill();
      ctx.fillStyle='#fff';ctx.font=fit(indicator,Math.round(bhh*.62),w*.7);ctx.fillText(indicator,w/2,y+bhh/2+1);
    }
  };
}

/** A business's name in its chain's or trade's colours (fascias and name boards). */
function drawLettering(text:string,background:string,colour:string,weight:string,scale:number){
  return (ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
    ctx.fillStyle=colour;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=fit(text,Math.round(h*scale),w-h*.4,weight);
    ctx.fillText(text,w/2,h*.54);
  };
}

/** Sides and the angle of the first corner (counter-clockwise from the right, y up) of each sign shape. */
const SHAPES={octagon:{n:8,start:Math.PI/8},'triangle-up':{n:3,start:Math.PI/2},'triangle-down':{n:3,start:-Math.PI/2}} as const;
/** A shape's outline on the canvas, inscribed in the face's circle and scaled by `k` towards the centre. */
function shapePath(ctx:CanvasRenderingContext2D,w:number,h:number,shape:keyof typeof SHAPES,k:number){
  const {n,start}=SHAPES[shape];
  ctx.beginPath();
  for(let i=0;i<n;i++){
    const a=start+i*2*Math.PI/n,x=w/2+Math.cos(a)*w/2*k,y=h/2-Math.sin(a)*h/2*k;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
  ctx.closePath();
}
/** STOP (diagram 601.1): white STOP on a red octagon with a white edge. */
function drawStop(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle='#fff';shapePath(ctx,w,h,'octagon',1);ctx.fill();
  ctx.fillStyle='#c8102e';shapePath(ctx,w,h,'octagon',.9);ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=fit('STOP',Math.round(h*.3),w*.72);ctx.fillText('STOP',w/2,h/2+2);
}
/** GIVE WAY (diagram 602): a red-bordered white triangle, point down, GIVE WAY in black. */
function drawGiveWay(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle='#c8102e';shapePath(ctx,w,h,'triangle-down',1);ctx.fill();
  ctx.fillStyle='#fff';shapePath(ctx,w,h,'triangle-down',.72);ctx.fill();
  ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=fit('GIVE',Math.round(h*.11),w*.4);ctx.fillText('GIVE',w/2,h*.33);
  ctx.font=fit('WAY',Math.round(h*.11),w*.32);ctx.fillText('WAY',w/2,h*.45);
}
/** Speed limit (diagram 670): the number in a red ring; the national limit (diagram 671): a black diagonal band. */
function drawSpeedLimit(mph:number){
  return (ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    const c=w/2,R=w/2;
    ctx.fillStyle='#e8e8e8';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(c,c,R-1,0,Math.PI*2);ctx.fill();
    if(mph>=60){
      ctx.save();ctx.beginPath();ctx.arc(c,c,R-3,0,Math.PI*2);ctx.clip();
      ctx.translate(c,c);ctx.rotate(Math.PI/4);ctx.fillStyle='#111';ctx.fillRect(-R,-R*.16,2*R,R*.32);ctx.restore();
      ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c,c,R-2,0,Math.PI*2);ctx.stroke();
      return;
    }
    ctx.strokeStyle='#c8102e';ctx.lineWidth=R*.2;ctx.beginPath();ctx.arc(c,c,R*.89,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=fit(String(mph),Math.round(h*.42),w*.56);ctx.fillText(String(mph),c,c+3);
  };
}
/** Children going to or from school (diagram 545): two children walking, in a red-bordered warning triangle. */
function drawSchool(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle='#c8102e';shapePath(ctx,w,h,'triangle-up',1);ctx.fill();
  ctx.fillStyle='#fff';shapePath(ctx,w,h,'triangle-up',.72);ctx.fill();
  ctx.fillStyle='#111';ctx.strokeStyle='#111';ctx.lineCap='round';
  const child=(x:number,top:number,s:number)=>{
    ctx.beginPath();ctx.arc(x,top,s*.11,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=s*.13;ctx.beginPath();ctx.moveTo(x,top+s*.15);ctx.lineTo(x-s*.04,top+s*.5);ctx.stroke();
    ctx.lineWidth=s*.09;
    ctx.beginPath();ctx.moveTo(x-s*.04,top+s*.5);ctx.lineTo(x-s*.2,top+s*.78);ctx.moveTo(x-s*.04,top+s*.5);ctx.lineTo(x+s*.12,top+s*.78);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,top+s*.22);ctx.lineTo(x+s*.18,top+s*.42);ctx.moveTo(x,top+s*.22);ctx.lineTo(x-s*.18,top+s*.4);ctx.stroke();
  };
  child(w*.43,h*.4,h*.32);child(w*.58,h*.44,h*.27);
}

/** Roundabout ahead (diagram 510): three black arrows circulating clockwise, in a red-bordered warning triangle. */
function drawRoundaboutAhead(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle='#c8102e';shapePath(ctx,w,h,'triangle-up',1);ctx.fill();
  ctx.fillStyle='#fff';shapePath(ctx,w,h,'triangle-up',.72);ctx.fill();
  circulatingArrows(ctx,w/2,h*.6,w*.13,w*.045,'#111');
}
/** Keep left (diagram 610): a white arrow pointing down to the left on a blue disc. */
function drawKeepLeft(ctx:CanvasRenderingContext2D,w:number,h:number){
  const c=w/2,R=w/2;
  ctx.fillStyle='#e8e8e8';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#0b4ea2';ctx.beginPath();ctx.arc(c,c,R-1,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(c,c);ctx.rotate(Math.PI/4);
  ctx.fillStyle='#fff';
  const L=R*.62,t=R*.13,head=R*.3;
  ctx.fillRect(-t,-L,2*t,2*L-head*.9);
  ctx.beginPath();ctx.moveTo(-head,L-head);ctx.lineTo(head,L-head);ctx.lineTo(0,L+head*.15);ctx.closePath();ctx.fill();
  ctx.restore();
}
/** Chevrons on a roundabout's island (diagram 515): black chevrons pointing left (the way round) on white. */
function drawChevrons(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle='#fbfbf7';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#111';
  const n=Math.max(3,Math.round(w/h*1.2)),step=w/n,t=step*.32;
  for(let k=0;k<n;k++){
    const x=k*step+step*.3;
    ctx.beginPath();
    ctx.moveTo(x+step*.45,h*.12);ctx.lineTo(x+step*.45+t,h*.12);ctx.lineTo(x+t,h/2);ctx.lineTo(x+step*.45+t,h*.88);
    ctx.lineTo(x+step*.45,h*.88);ctx.lineTo(x,h/2);ctx.closePath();ctx.fill();
  }
  ctx.strokeStyle='#111';ctx.lineWidth=Math.max(2,h*.04);ctx.strokeRect(1,1,w-2,h-2);
}
/** Three arrows circulating clockwise round (cx, cy) (canvas angles grow clockwise on screen). */
function circulatingArrows(ctx:CanvasRenderingContext2D,cx:number,cy:number,r:number,line:number,colour:string){
  ctx.strokeStyle=colour;ctx.fillStyle=colour;ctx.lineWidth=line;ctx.lineCap='butt';
  const head=line*1.5;
  for(let k=0;k<3;k++){
    const a0=-Math.PI/2+k*2*Math.PI/3+.5,a1=a0+1.05;
    ctx.beginPath();ctx.arc(cx,cy,r,a0,a1);ctx.stroke();
    const tip={x:cx+Math.cos(a1+.5)*r,y:cy+Math.sin(a1+.5)*r},radial={x:Math.cos(a1),y:Math.sin(a1)};
    ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(cx+radial.x*(r+head),cy+radial.y*(r+head));ctx.lineTo(cx+radial.x*(r-head),cy+radial.y*(r-head));
    ctx.closePath();ctx.fill();
  }
}

/** A chemist's green cross (lit), on a dark square. */
function drawCross(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle='#1d2421';ctx.fillRect(0,0,w,h);
  const a=w*.27,t=w*.12;
  ctx.fillStyle='#2fd36a';
  ctx.fillRect(w/2-t,h/2-a,2*t,2*a);ctx.fillRect(w/2-a,h/2-t,2*a,2*t);
  ctx.fillStyle='#b6f5cb';
  ctx.fillRect(w/2-t*.45,h/2-a*.9,t*.9,a*1.8);ctx.fillRect(w/2-a*.9,h/2-t*.45,a*1.8,t*.9);
}

/** A pub's hanging sign: its name in gilt lettering on a dark board, with a frame. */
function drawHanging(text:string){
  return (ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    ctx.fillStyle='#3a1f1a';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#c9a14a';ctx.lineWidth=w*.04;ctx.strokeRect(w*.05,h*.05,w*.9,h*.9);
    ctx.fillStyle='#e3c779';ctx.textAlign='center';ctx.textBaseline='middle';
    const words=text.replace(/^the /i,'THE ').split(' ');
    const lines:string[]=[];
    for(const word of words){const last=lines.at(-1);if(last&&textWidth(`${last} ${word}`,`700 ${Math.round(h*.13)}px ${FONT}`)<w*.78)lines[lines.length-1]=`${last} ${word}`;else lines.push(word)}
    const shown=lines.slice(0,4),lh=h*.8/Math.max(3,shown.length);
    shown.forEach((line,i)=>{ctx.font=fit(line,Math.round(lh*.75),w*.8);ctx.fillText(line,w/2,h/2+(i-(shown.length-1)/2)*lh)});
  };
}

function faceEntry(face:SignFace,panel:SignPanel):Entry{
  const d=DENSITY[face.kind];
  switch(face.kind){
    case 'street-name':return {key:`street-name:${face.text}:${panel.width}`,w:Math.round(panel.width*d),h:Math.round(panel.height*d),draw:drawStreetName(face.text)};
    case 'mini-roundabout':return {key:'mini-roundabout',w:128,h:128,draw:drawMiniRoundabout};
    case 'bus-flag':return {key:`bus-flag:${face.name}:${face.indicator}`,w:Math.round(panel.width*d),h:Math.round(panel.height*d),draw:drawBusFlag(face.name,face.indicator)};
    case 'fascia':return {key:`fascia:${face.text}:${face.background}:${face.colour}:${panel.width.toFixed(2)}:${panel.height}`,w:Math.round(panel.width*d),h:Math.round(panel.height*d),
      draw:drawLettering(face.text,face.background,face.colour,face.weight,face.full?.7:.6)};
    case 'name-board':return {key:`board:${face.text}:${face.background}:${face.colour}:${panel.width.toFixed(2)}:${panel.height}`,w:Math.round(panel.width*d),h:Math.round(panel.height*d),
      draw:drawLettering(face.text,face.background,face.colour,face.weight,.62)};
    case 'cross':return {key:'cross',w:120,h:120,draw:drawCross};
    case 'hanging':return {key:`hanging:${face.text}`,w:Math.round(panel.width*d),h:Math.round(panel.height*d),draw:drawHanging(face.text)};
    case 'stop':return {key:'stop',w:150,h:150,draw:drawStop};
    case 'give-way':return {key:'give-way',w:172,h:172,draw:drawGiveWay};
    case 'speed-limit':return {key:`speed-limit:${face.mph}`,w:128,h:128,draw:drawSpeedLimit(face.mph)};
    case 'school':return {key:'school',w:172,h:172,draw:drawSchool};
    case 'roundabout-ahead':return {key:'roundabout-ahead',w:172,h:172,draw:drawRoundaboutAhead};
    case 'keep-left':return {key:'keep-left',w:96,h:96,draw:drawKeepLeft};
    case 'chevrons':return {key:`chevrons:${panel.width}`,w:Math.round(panel.width*d),h:Math.round(panel.height*d),draw:drawChevrons};
  }
}

const POST:RGB=[.42,.45,.47],BACK:RGB=[.55,.57,.58],FRAME:RGB=[.2,.21,.22],GLASS:RGB=[.5,.6,.64],ROOF:RGB=[.28,.29,.3],WHITE:RGB=[1,1,1],POSTER:RGB=[.86,.84,.74];

/** A flat panel's corners (bottom-left, bottom-right, top-right, top-left as seen from the front). */
function panelCorners(p:SignPanel,offset=0):[V3,V3,V3,V3]{
  const r={x:p.normal.z,z:-p.normal.x};
  const W=p.width/2,H=p.height/2;
  const P=(u:number,v:number):V3=>[p.x+r.x*u+p.normal.x*offset,p.y+v,p.z+r.z*u+p.normal.z*offset];
  return [P(-W,-H),P(W,-H),P(W,H),P(-W,H)];
}

function drawPanel(g:Geometry,p:SignPanel,region:Region):void{
  const n:V3=[p.normal.x,0,p.normal.z],back:V3=[-p.normal.x,0,-p.normal.z];
  const uv=(u:number,v:number):[number,number]=>[region.u0+(region.u1-region.u0)*u,region.v0+(region.v1-region.v0)*v];
  if(p.round||p.shape){
    const r={x:p.normal.z,z:-p.normal.x},R=p.width/2,{n:n16,start}=p.shape?SHAPES[p.shape]:{n:16,start:0};
    const ring=(k:number,off:number,mirror:boolean)=>{
      const a=start+k/n16*Math.PI*2,u=Math.cos(a),v=Math.sin(a);
      return {pt:[p.x+r.x*u*R+p.normal.x*off,p.y+v*R,p.z+r.z*u*R+p.normal.z*off] as V3,uv:uv((mirror?-u:u)*.5+.5,v*.5+.5)};
    };
    const front=Array.from({length:n16},(_,k)=>ring(k,.012,false));
    g.polygon(front.map(f=>f.pt),front.map(f=>f.uv),WHITE,n);
    const rear=Array.from({length:n16},(_,k)=>ring(k,0,true));
    g.flat(rear.map(f=>f.pt),BACK,back);
    return;
  }
  const front=panelCorners(p,.012);
  g.polygon(front,[uv(0,0),uv(1,0),uv(1,1),uv(0,1)],WHITE,n);
  const rear=panelCorners(p,-.012);
  if(p.twoSided)g.polygon([rear[1],rear[0],rear[3],rear[2]],[uv(0,0),uv(1,0),uv(1,1),uv(0,1)],WHITE,back);
  else if(p.posts.length>0)g.flat(rear,BACK,back);
  // Edges, so the panel has some thickness side-on.
  if(p.posts.length>0){
    const [a,b,c,d]=front,[e,f,h,i]=rear;
    for(const q of [[b,f,h,c],[e,a,d,i],[d,c,h,i],[a,e,f,b]] as V3[][])g.flat(q,BACK);
  }
}

function drawShelter(g:Geometry,s:Shelter):void{
  const A=s.axis,B=s.back,L=s.length/2,D=s.depth/2;
  const P=(u:number,v:number,h:number):V3=>[s.x+A.x*u+B.x*v,s.y+h,s.z+A.z*u+B.z*v];
  const pillar=(u:number,v:number)=>box(g,{x:s.x+A.x*u+B.x*v,z:s.z+A.z*u+B.z*v},s.y,A,.06,.06,s.height,flatFace(FRAME));
  for(const u of [-L,0,L])pillar(u,D);
  for(const u of [-L,L])pillar(u,-D);
  // Back panel and end panels (glass, both sides; the downstream end an advertising panel), roof.
  g.flat([P(-L,D,.15),P(L,D,.15),P(L,D,2.2),P(-L,D,2.2)],GLASS,undefined,true);
  g.flat([P(-L,-D+.1,.15),P(-L,D,.15),P(-L,D,2.2),P(-L,-D+.1,2.2)],GLASS,undefined,true);
  box(g,{x:s.x+A.x*L+B.x*.05,z:s.z+A.z*L+B.z*.05},s.y+.1,B,s.depth-.1,.12,2.15,flatFace(FRAME));
  for(const side of [1,-1])g.flat(((u:number)=>[P(u,-D+.12,.3),P(u,D-.08,.3),P(u,D-.08,2.05),P(u,-D+.12,2.05)])(L+side*.065) as V3[],POSTER,[A.x*side,0,A.z*side]);
  const roof=(off:number)=>[P(-L-.1,-D-.15,s.height+off),P(L+.1,-D-.15,s.height+off),P(L+.1,D+.1,s.height+off),P(-L-.1,D+.1,s.height+off)] as V3[];
  g.flat(roof(.06),ROOF,[0,1,0]);
  g.flat(roof(0),ROOF,[0,-1,0]);
  for(const [a,b] of [[0,1],[1,2],[2,3],[3,0]] as const){const t=roof(.06),u=roof(0);g.flat([u[a]!,u[b]!,t[b]!,t[a]!],ROOF)}
  // Rails top and bottom of the glass, and a bench.
  g.flat([P(-L,D-.01,2.2),P(L,D-.01,2.2),P(L,D-.01,2.3),P(-L,D-.01,2.3)],FRAME,undefined,true);
  box(g,{x:s.x+B.x*(D-.3),z:s.z+B.z*(D-.3)},s.y+.45,A,s.length*.6,.32,.05,flatFace(FRAME));
}

/** A projecting sign's bracket: an arm from the wall over the sign, and two short hangers down to it. */
function drawBracket(g:Geometry,p:SignPanel):void{
  const a=p.bracket!,dx=p.x-a.x,dz=p.z-a.z,len=Math.hypot(dx,dz)+p.width*.1;
  const f={x:dx/(Math.hypot(dx,dz)||1),z:dz/(Math.hypot(dx,dz)||1)};
  box(g,{x:a.x+f.x*len/2,z:a.z+f.z*len/2},a.y,f,.05,len,.05,flatFace(FRAME));
  const top=p.y+p.height/2;
  for(const k of [-.35,.35]){
    const c={x:p.x+p.normal.z*k*p.width,z:p.z-p.normal.x*k*p.width};
    if(a.y>top)box(g,c,top,f,.02,.02,a.y-top,flatFace(FRAME),false);
  }
}

/** A petrol station's canopy: a deep slab in the chain's colour on columns, white beneath, over two pump islands. */
function drawCanopy(g:Geometry,c:Canopy):void{
  const colour=hex(c.background),under:RGB=[.93,.93,.92];
  const centre={x:c.x,z:c.z};
  box(g,centre,c.y+c.height,c.away,c.length,c.width,CANOPY_FASCIA,flatFace(colour));
  g.flat(((y:number)=>{
    const A=c.axis,B=c.away,L=c.length/2,W=c.width/2,P=(u:number,v:number):V3=>[c.x+A.x*u+B.x*v,y,c.z+A.z*u+B.z*v];
    return [P(-L,-W),P(L,-W),P(L,W),P(-L,W)];
  })(c.y+c.height-.01),under,[0,-1,0]);
  for(const a of [-1,1]){
    const at={x:c.x+c.axis.x*a*c.length*PUMP_ALONG,z:c.z+c.axis.z*a*c.length*PUMP_ALONG};
    // Island, column and a pump at each end.
    box(g,at,c.y,c.away,.9,PUMP_APART*2+1.6,.18,flatFace([.75,.74,.7]));
    prism(g,at.x,at.z,c.y,c.height,.16,.16,[.85,.85,.84],8);
    for(const k of [-1,1]){
      const pump={x:at.x+c.away.x*k*PUMP_APART,z:at.z+c.away.z*k*PUMP_APART};
      box(g,pump,c.y+.18,c.away,.55,.75,1.45,flatFace([.86,.86,.86]));
      box(g,pump,c.y+1.3,c.away,.57,.77,.33,flatFace(colour));
    }
  }
}

export interface BuiltSignage{mesh:Mesh|null;faces:number;sheet:{width:number;height:number};dispose():void}

export function buildSignage(scene:Scene,plan:SignPlan,parent:TransformNode):BuiltSignage{
  if(plan.panels.length===0&&plan.shelters.length===0&&plan.canopies.length===0)return {mesh:null,faces:0,sheet:{width:0,height:0},dispose(){}};
  const sheet=new FaceSheet();
  // Fascias are as wide as their lettering (within the shopfront).
  for(const p of plan.panels){
    if(p.face.kind!=='fascia'&&p.face.kind!=='name-board')continue;
    const full=p.face.kind==='fascia'&&!!p.face.full,scale=full?.7:p.face.kind==='fascia'?.6:.62;
    if(full)p.height=.6;
    const density=DENSITY[p.face.kind],h=Math.round(p.height*density);
    const needed=(textWidth(p.face.text,`${p.face.weight} ${Math.round(h*scale)}px ${FONT}`)+h*.6)/density;
    // A chain's colours run along the whole fascia of its shopfront (up to 6 m); other names are as wide as their lettering.
    p.width=Math.max(1,full?Math.max(needed,p.maxWidth??p.width):Math.min(p.maxWidth??p.width,needed));
  }
  const keys=plan.panels.map(p=>sheet.add(faceEntry(p.face,p)));
  sheet.add({key:'white',w:6,h:6,draw:(ctx,w,h)=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h)}});
  sheet.pack();
  const white=sheet.region('white');
  const g=new Geometry([(white.u0+white.u1)/2,(white.v0+white.v1)/2]);
  plan.panels.forEach((p,i)=>{
    drawPanel(g,p,sheet.region(keys[i]!));
    for(const q of p.posts)prism(g,q.x,q.z,q.y,q.height,q.radius,q.radius,POST,6);
    if(p.bracket)drawBracket(g,p);
  });
  for(const s of plan.shelters)drawShelter(g,s);
  for(const c of plan.canopies)drawCanopy(g,c);
  const material=new StandardMaterial('signage',scene);
  material.diffuseTexture=sheet.texture(scene);
  material.specularColor=new Color3(.05,.05,.05);
  // Signs are retroreflective and lit: a little self-illumination keeps lettering legible in shade.
  material.emissiveColor=new Color3(.14,.14,.14);
  material.backFaceCulling=true;
  material.freeze();
  const mesh=g.mesh('signage',scene,material,parent);
  return {mesh,faces:plan.panels.length,sheet:{width:sheet.width,height:sheet.height},dispose(){mesh?.dispose();material.diffuseTexture?.dispose();material.dispose()}};
}

