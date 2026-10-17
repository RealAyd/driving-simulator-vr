import {Color3,Mesh,StandardMaterial,VertexData,type Scene,type TransformNode} from '../engine/babylon';
import type {Vec2} from '../contracts';
import {BAY,EAVES,framePoint,type Frame,type House,type HouseUnit,type StreetLayout,type Strip} from './streetscape';
import {brickTexture,detailTexture,REGIONS,roofTexture,type Region} from './sceneryTextures';

/**
 * Geometry for a streetscape layout. Everything static is drawn with three
 * materials (brick, roof, details); vertex colours give each house, door,
 * hedge and fence its colour, so the whole street costs three draw calls
 * (plus the same again in each mirror that is rendering).
 */

type V3=[number,number,number];
type RGB=[number,number,number];

const hex=(h:string):RGB=>{const c=Color3.FromHexString(h);return [c.r,c.g,c.b]};
const COLOURS={
  'red-brick':[.74,.42,.32],'brown-brick':[.6,.42,.33],'buff-brick':[.8,.7,.56],
  'render-cream':[.92,.88,.79],'render-white':[.95,.95,.92],
  slate:[.46,.48,.53],clay:[.66,.4,.32],
  stone:[.84,.82,.76],hedge:[.42,.58,.33],leaves:[.38,.55,.3],fence:[.6,.47,.35],
  lawn:[.46,.62,.36],path:[.86,.84,.79],drive:[.7,.66,.62],bark:[.36,.28,.22],
  lamp:[.36,.4,.4],lantern:[.88,.88,.84],wallBrick:[.68,.42,.33],grate:[1,1,1],shadow:[.16,.16,.17]
} satisfies Record<string,RGB>;
const BRICK_TILE=.9,ROOF_TILE=1;

class Geometry{
  readonly positions:number[]=[];
  readonly normals:number[]=[];
  readonly uvs:number[]=[];
  readonly colors:number[]=[];
  readonly indices:number[]=[];

  /**
   * A flat convex polygon facing `outward` (its back is culled). Without `outward`,
   * or with `twoSided`, both faces are drawn (fence panels, canopies seen from below).
   */
  polygon(points:V3[],uvs:Array<[number,number]>,colour:RGB,outward?:V3,twoSided=false):void{
    // Newell's method for the normal.
    let nx=0,ny=0,nz=0;
    for(let i=0;i<points.length;i++){
      const a=points[i]!,b=points[(i+1)%points.length]!;
      nx+=(a[1]-b[1])*(a[2]+b[2]);ny+=(a[2]-b[2])*(a[0]+b[0]);nz+=(a[0]-b[0])*(a[1]+b[1]);
    }
    const l=Math.hypot(nx,ny,nz)||1;
    nx/=l;ny/=l;nz/=l;
    if(outward&&nx*outward[0]+ny*outward[1]+nz*outward[2]<0){nx=-nx;ny=-ny;nz=-nz}
    // Wind every face the same way as seen from its outside (clockwise, Babylon's front face), so back faces can be culled.
    const ccw=(points.length>2)&&((()=>{
      let cx=0,cy=0,cz=0;
      for(let i=0;i<points.length;i++){
        const a=points[i]!,b=points[(i+1)%points.length]!;
        cx+=(a[1]-b[1])*(a[2]+b[2]);cy+=(a[2]-b[2])*(a[0]+b[0]);cz+=(a[0]-b[0])*(a[1]+b[1]);
      }
      return cx*nx+cy*ny+cz*nz>0;
    })());
    if(ccw){points=[...points].reverse();uvs=[...uvs].reverse()}
    const emit=(pts:V3[],uv:Array<[number,number]>,sx:number,sy:number,sz:number)=>{
      const base=this.positions.length/3;
      pts.forEach((p,i)=>{
        this.positions.push(...p);
        this.normals.push(sx,sy,sz);
        this.uvs.push(...uv[i]!);
        this.colors.push(...colour,1);
      });
      for(let i=1;i<pts.length-1;i++)this.indices.push(base,base+i,base+i+1);
    };
    emit(points,uvs,nx,ny,nz);
    if(!outward||twoSided)emit([...points].reverse(),[...uvs].reverse(),-nx,-ny,-nz);
  }

  /** A quad with the whole of an atlas region mapped onto it (corners: bottom-left, bottom-right, top-right, top-left). */
  regionQuad(c:[V3,V3,V3,V3],r:Region,colour:RGB,outward?:V3):void{
    this.polygon(c,[[r.u0,r.v0],[r.u1,r.v0],[r.u1,r.v1],[r.u0,r.v1]],colour,outward);
  }

  /** A flat-coloured polygon (the white texel of the detail sheet). */
  flat(points:V3[],colour:RGB,outward?:V3):void{
    const u=(REGIONS.flat.u0+REGIONS.flat.u1)/2,v=(REGIONS.flat.v0+REGIONS.flat.v1)/2;
    this.polygon(points,points.map(()=>[u,v] as [number,number]),colour,outward);
  }

  mesh(name:string,scene:Scene,material:StandardMaterial,parent:TransformNode):Mesh|null{
    if(this.indices.length===0)return null;
    const mesh=new Mesh(name,scene);
    const data=new VertexData();
    data.positions=this.positions;data.normals=this.normals;data.uvs=this.uvs;data.colors=this.colors;data.indices=this.indices;
    data.applyToMesh(mesh,false);
    mesh.material=material;
    mesh.parent=parent;
    mesh.isPickable=false;
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo=true;
    return mesh;
  }
}

/** A box on the ground given a centre, a forward direction, size and colour; `uv` maps each face. */
function box(g:Geometry,c:Vec2,y:number,f:Vec2,width:number,depth:number,height:number,face:(g:Geometry,q:[V3,V3,V3,V3],out:V3,w:number,h:number)=>void,top=true){
  const a={x:-f.z,z:f.x};
  const P=(u:number,v:number,h:number):V3=>[c.x+a.x*u+f.x*v,y+h,c.z+a.z*u+f.z*v];
  const W=width/2,D=depth/2;
  face(g,[P(-W,D,0),P(W,D,0),P(W,D,height),P(-W,D,height)],[f.x,0,f.z],width,height);
  face(g,[P(W,-D,0),P(-W,-D,0),P(-W,-D,height),P(W,-D,height)],[-f.x,0,-f.z],width,height);
  face(g,[P(W,D,0),P(W,-D,0),P(W,-D,height),P(W,D,height)],[a.x,0,a.z],depth,height);
  face(g,[P(-W,-D,0),P(-W,D,0),P(-W,D,height),P(-W,-D,height)],[-a.x,0,-a.z],depth,height);
  if(top)face(g,[P(-W,-D,height),P(W,-D,height),P(W,D,height),P(-W,D,height)],[0,1,0],width,depth);
}
const flatFace=(colour:RGB)=>(g:Geometry,q:[V3,V3,V3,V3],out:V3)=>g.flat(q,colour,out);
const regionFace=(r:Region,colour:RGB)=>(g:Geometry,q:[V3,V3,V3,V3],out:V3)=>g.regionQuad(q,r,colour,out);
/** Brick faces tiled by their size in metres. */
const brickFace=(colour:RGB)=>(g:Geometry,q:[V3,V3,V3,V3],out:V3,w:number,h:number)=>g.polygon(q,[[0,0],[w/BRICK_TILE,0],[w/BRICK_TILE,h/BRICK_TILE],[0,h/BRICK_TILE]],colour,out);

interface Builders{brick:Geometry;roof:Geometry;detail:Geometry}

/** One house: walls, roof, chimneys, windows, doors, sills, bays and porch canopies. */
function house(b:Builders,h:House):void{
  const fr=h.frame,y0=fr.y,H=y0+EAVES,W=h.width,D=h.depth;
  const P=(u:number,v:number,y:number):V3=>{const p=framePoint(fr,u,v);return [p.x,y,p.z]};
  const out=(u:number,v:number):V3=>[fr.ax*u+fr.fx*v,0,fr.az*u+fr.fz*v];
  const rendered=h.palette.startsWith('render');
  const wallColour=COLOURS[h.palette];
  // Wall polygons: brick tiled in metres (u along the wall, v up), or flat render.
  const wall=(points:V3[],uvs:Array<[number,number]>,o:V3)=>rendered?b.detail.flat(points,wallColour,o):b.brick.polygon(points,uvs.map(([u,v])=>[u/BRICK_TILE,v/BRICK_TILE]),wallColour,o);
  const rect=(u0:number,v0:number,u1:number,v1:number,o:V3,uStart=0)=>{
    const len=Math.hypot(u1-u0,v1-v0);
    wall([P(u0,v0,y0),P(u1,v1,y0),P(u1,v1,H),P(u0,v0,H)],[[uStart,0],[uStart+len,0],[uStart+len,EAVES],[uStart,EAVES]],o);
  };
  rect(-W/2,0,W/2,0,out(0,1),-W/2);
  rect(W/2,-D,-W/2,-D,out(0,-1));
  rect(W/2,0,W/2,-D,out(1,0));
  rect(-W/2,-D,-W/2,0,out(-1,0));

  // Roof: terraces have gable ends and a ridge along the street; semis are hipped; detached houses have a front gable.
  const o=.3,eaves=H-.05;
  const roofColour=COLOURS[h.roofColour];
  const roofPlane=(pts:V3[],outV:V3)=>{
    // Tile courses run along the eaves: u along the first edge, v up the slope.
    const [a,bq]=[pts[0]!,pts[1]!];
    const ex=[bq[0]-a[0],bq[1]-a[1],bq[2]-a[2]],el=Math.hypot(...ex) as number;
    const e=ex.map(x=>x/el);
    const uvs=pts.map(p=>{
      const d=[p[0]-a[0],p[1]-a[1],p[2]-a[2]];
      const u=d[0]!*e[0]!+d[1]!*e[1]!+d[2]!*e[2]!;
      const s=Math.hypot(d[0]!-u*e[0]!,d[1]!-u*e[1]!,d[2]!-u*e[2]!);
      return [u/ROOF_TILE,s/ROOF_TILE] as [number,number];
    });
    b.roof.polygon(pts,uvs,roofColour,outV);
  };
  let ridge:number;
  const chimneys:Array<{u:number;v:number;base:number;top:number}>=[];
  if(h.style==='terrace'){
    ridge=H+(D/2+o)*Math.tan(40*Math.PI/180);
    const e=.2;
    roofPlane([P(-W/2-e,o,eaves),P(W/2+e,o,eaves),P(W/2+e,-D/2,ridge),P(-W/2-e,-D/2,ridge)],[fr.fx,1,fr.fz]);
    roofPlane([P(W/2+e,-D-o,eaves),P(-W/2-e,-D-o,eaves),P(-W/2-e,-D/2,ridge),P(W/2+e,-D/2,ridge)],[-fr.fx,1,-fr.fz]);
    for(const s of [-1,1]){
      const u=s*W/2;
      if(rendered)b.detail.flat([P(u,0,H),P(u,-D,H),P(u,-D/2,ridge)],wallColour,out(s,0));
      else b.brick.polygon([P(u,0,H),P(u,-D,H),P(u,-D/2,ridge)],[[0,EAVES/BRICK_TILE],[D/BRICK_TILE,EAVES/BRICK_TILE],[D/2/BRICK_TILE,(ridge-y0)/BRICK_TILE]],wallColour,out(s,0));
    }
    for(let i=0;i<=h.units.length;i++)chimneys.push({u:Math.max(-W/2+.35,Math.min(W/2-.35,-W/2+i*h.units[0]!.width)),v:-D/2,base:ridge-.8,top:ridge+1.1});
  }else if(h.style==='detached'){
    ridge=H+(W/2+o)*Math.tan(38*Math.PI/180);
    roofPlane([P(-W/2-o,-D-o,eaves),P(-W/2-o,o,eaves),P(0,o,ridge),P(0,-D-o,ridge)],[-fr.ax,1,-fr.az]);
    roofPlane([P(W/2+o,o,eaves),P(W/2+o,-D-o,eaves),P(0,-D-o,ridge),P(0,o,ridge)],[fr.ax,1,fr.az]);
    for(const [v,s] of [[0,1],[-D,-1]] as const){
      if(rendered)b.detail.flat([P(-W/2,v,H),P(W/2,v,H),P(0,v,ridge)],wallColour,out(0,s));
      else b.brick.polygon([P(-W/2,v,H),P(W/2,v,H),P(0,v,ridge)],[[-W/2/BRICK_TILE,EAVES/BRICK_TILE],[W/2/BRICK_TILE,EAVES/BRICK_TILE],[0,(ridge-y0)/BRICK_TILE]],wallColour,out(0,s));
    }
    chimneys.push({u:W/2-.45,v:-D*.62,base:H,top:ridge+.4});
  }else{
    ridge=H+(D/2+o)*Math.tan(35*Math.PI/180);
    const r=W/2+o-(D/2+o);
    roofPlane([P(-W/2-o,o,eaves),P(W/2+o,o,eaves),P(r,-D/2,ridge),P(-r,-D/2,ridge)],[fr.fx,1,fr.fz]);
    roofPlane([P(W/2+o,-D-o,eaves),P(-W/2-o,-D-o,eaves),P(-r,-D/2,ridge),P(r,-D/2,ridge)],[-fr.fx,1,-fr.fz]);
    roofPlane([P(W/2+o,o,eaves),P(W/2+o,-D-o,eaves),P(r,-D/2,ridge)],[fr.ax,1,fr.az]);
    roofPlane([P(-W/2-o,-D-o,eaves),P(-W/2-o,o,eaves),P(-r,-D/2,ridge)],[-fr.ax,1,-fr.az]);
    chimneys.push({u:0,v:-D/2,base:ridge-.8,top:ridge+1.1});
  }
  for(const c of chimneys){
    const p=framePoint(fr,c.u,c.v);
    box(b.brick,p,c.base,{x:fr.fx,z:fr.fz},.6,.95,c.top-c.base,brickFace(rendered?COLOURS['red-brick']:wallColour));
    box(b.detail,p,c.top,{x:fr.fx,z:fr.fz},.7,1.05,.08,flatFace(COLOURS.stone));
  }

  // Front openings.
  const front=.015;
  const windowAt=(u:number,sill:number,w:number,hgt:number,v=0)=>{
    b.detail.regionQuad([P(u-w/2,v+front,sill),P(u+w/2,v+front,sill),P(u+w/2,v+front,sill+hgt),P(u-w/2,v+front,sill+hgt)],REGIONS.window,[1,1,1],out(0,1));
    // Sill: front and top faces only (the rest is never seen).
    const sw=w/2+.08;
    b.detail.flat([P(u-sw,v+.12,sill-.07),P(u+sw,v+.12,sill-.07),P(u+sw,v+.12,sill),P(u-sw,v+.12,sill)],COLOURS.stone,out(0,1));
    b.detail.flat([P(u-sw,v,sill),P(u+sw,v,sill),P(u+sw,v+.12,sill),P(u-sw,v+.12,sill)],COLOURS.stone,[0,1,0]);
    if(!rendered)b.detail.flat([P(u-w/2-.08,v+front,sill+hgt),P(u+w/2+.08,v+front,sill+hgt),P(u+w/2+.08,v+front,sill+hgt+.17),P(u-w/2-.08,v+front,sill+hgt+.17)],COLOURS.stone,out(0,1));
  };
  const door=(unit:HouseUnit,u:number)=>{
    b.detail.regionQuad([P(u-.47,front,y0),P(u+.47,front,y0),P(u+.47,front,y0+2.05),P(u-.47,front,y0+2.05)],REGIONS.door,hex(unit.doorColour),out(0,1));
    // Step: front and top faces.
    b.detail.flat([P(u-.55,.32,y0),P(u+.55,.32,y0),P(u+.55,.32,y0+.1),P(u-.55,.32,y0+.1)],COLOURS.stone,out(0,1));
    b.detail.flat([P(u-.55,0,y0+.1),P(u+.55,0,y0+.1),P(u+.55,.32,y0+.1),P(u-.55,.32,y0+.1)],COLOURS.stone,[0,1,0]);
    if(h.style!=='terrace'){
      // Porch canopy.
      const w=.8;
      b.roof.polygon([P(u-w,.85,y0+2.45),P(u+w,.85,y0+2.45),P(u+w,front,y0+2.75),P(u-w,front,y0+2.75)],[[0,0],[2*w,0],[2*w,.9],[0,.9]],roofColour,[fr.fx,1,fr.fz],true);
    }
  };
  const bay=(u:number)=>{
    const w=BAY.width/2,d=BAY.depth,top=y0+BAY.height;
    const sideWall=(s:number)=>wall([P(u+s*w,0,y0),P(u+s*w,d,y0),P(u+s*w,d,top),P(u+s*w,0,top)],[[0,0],[d,0],[d,BAY.height],[0,BAY.height]],out(s,0));
    wall([P(u-w,d,y0),P(u+w,d,y0),P(u+w,d,top),P(u-w,d,top)],[[u-w,0],[u+w,0],[u+w,BAY.height],[u-w,BAY.height]],out(0,1));
    sideWall(-1);sideWall(1);
    windowAt(u,y0+.85,2*w-.3,1.45,d);
    for(const s of [-1,1])b.detail.regionQuad(s<0
      ?[P(u-w-front,.15,y0+.85),P(u-w-front,d-.1,y0+.85),P(u-w-front,d-.1,y0+2.3),P(u-w-front,.15,y0+2.3)]
      :[P(u+w+front,d-.1,y0+.85),P(u+w+front,.15,y0+.85),P(u+w+front,.15,y0+2.3),P(u+w+front,d-.1,y0+2.3)],REGIONS.window,[1,1,1],out(s,0));
    // Lean-to bay roof with hipped ends.
    const e=.12,low=top+.05,high=top+.45;
    b.roof.polygon([P(u-w-e,d+e,low),P(u+w+e,d+e,low),P(u+w,0,high),P(u-w,0,high)],[[0,0],[2*w,0],[2*w,1],[0,1]],roofColour,[fr.fx,1,fr.fz],true);
    for(const s of [-1,1])b.roof.polygon([P(u+s*(w+e),d+e,low),P(u+s*(w+e),0,low),P(u+s*w,0,high)],[[0,0],[1,0],[1,1]],roofColour,[fr.ax*s,1,fr.az*s]);
  };

  if(h.style==='detached'){
    door(h.units[0]!,0);
    for(const s of [-1,1]){windowAt(s*2.5,y0+.9,1.7,1.3);windowAt(s*2.5,y0+3.5,1.5,1.2)}
    windowAt(0,y0+3.6,.7,1);
    windowAt(0,y0+6.4,.9,.9);
  }else for(const unit of h.units){
    const du=unit.door==='left'?unit.u0+.95:unit.u0+unit.width-.95;
    const wu=unit.door==='left'?unit.u0+unit.width*(h.style==='terrace'?.64:.62):unit.u0+unit.width*(h.style==='terrace'?.36:.38);
    door(unit,du);
    const ww=h.style==='terrace'?1.3:1.8;
    if(h.bays)bay(wu);else windowAt(wu,y0+.9,ww,1.35);
    windowAt(wu,y0+3.5,h.style==='terrace'?1.1:1.5,1.2);
    windowAt(du,y0+3.6,.7,1);
    // A rear window per floor, seen through the gaps between houses.
    const ru=unit.u0+unit.width/2;
    for(const sill of [y0+1,y0+3.6])b.detail.regionQuad([P(ru+.6,-D-front,sill),P(ru-.6,-D-front,sill),P(ru-.6,-D-front,sill+1.1),P(ru+.6,-D-front,sill+1.1)],REGIONS.window,[1,1,1],out(0,-1));
  }
}

/** Walls, hedges and fences; long runs are split so fence boards and hedge texture keep their scale. */
function boundary(b:Builders,s:Strip):void{
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);
  if(len<.05)return;
  const f={x:dx/len,z:dz/len};
  const piece=s.kind==='wall'?len:s.kind==='hedge'?2.2:1.83;
  const n=Math.max(1,Math.round(len/piece));
  for(let i=0;i<n;i++){
    const c={x:s.a.x+dx*(i+.5)/n,z:s.a.z+dz*(i+.5)/n};
    // Box forward is along the strip: width = thickness, depth = piece length.
    if(s.kind==='wall'){
      box(b.brick,c,s.y,f,s.thickness,len/n,s.height-.06,brickFace(COLOURS.wallBrick));
      box(b.detail,c,s.y+s.height-.06,f,s.thickness+.06,len/n+.02,.06,flatFace(COLOURS.stone));
    }else if(s.kind==='hedge')box(b.detail,c,s.y,f,s.thickness,len/n,s.height,regionFace(REGIONS.hedge,COLOURS.hedge));
    else{
      // Fence panels are thin: one double-sided quad each.
      const h=len/n/2,a={x:c.x-f.x*h,z:c.z-f.z*h},e={x:c.x+f.x*h,z:c.z+f.z*h};
      b.detail.regionQuad([[a.x,s.y,a.z],[e.x,s.y,e.z],[e.x,s.y+s.height,e.z],[a.x,s.y+s.height,a.z]],REGIONS.boards,COLOURS.fence);
    }
  }
}

/** A tapering n-sided prism (tree trunks, lamp columns). */
function prism(g:Geometry,x:number,z:number,y:number,height:number,r0:number,r1:number,colour:RGB,sides=6){
  for(let i=0;i<sides;i++){
    const a0=i/sides*Math.PI*2,a1=(i+1)/sides*Math.PI*2,am=(a0+a1)/2;
    g.flat([[x+Math.cos(a0)*r0,y,z+Math.sin(a0)*r0],[x+Math.cos(a1)*r0,y,z+Math.sin(a1)*r0],[x+Math.cos(a1)*r1,y+height,z+Math.sin(a1)*r1],[x+Math.cos(a0)*r1,y+height,z+Math.sin(a0)*r1]],colour,[Math.cos(am),0,Math.sin(am)]);
  }
}

/** A low-poly leafy crown (squashed sphere with the hedge texture). */
function crown(g:Geometry,x:number,y:number,z:number,rx:number,ry:number,colour:RGB){
  const rings=4,seg=6,r=REGIONS.hedge;
  const pt=(i:number,j:number):V3=>{
    const th=i/rings*Math.PI,ph=j/seg*Math.PI*2;
    return [x+Math.sin(th)*Math.cos(ph)*rx,y+Math.cos(th)*ry,z+Math.sin(th)*Math.sin(ph)*rx];
  };
  for(let i=0;i<rings;i++)for(let j=0;j<seg;j++){
    const q=[pt(i,j),pt(i,j+1),pt(i+1,j+1),pt(i+1,j)];
    const m=pt(i+.5,j+.5);
    const uv=(a:number,c:number):[number,number]=>[r.u0+(r.u1-r.u0)*a,r.v0+(r.v1-r.v0)*c];
    g.polygon(q,[uv(0,0),uv(1,0),uv(1,1),uv(0,1)],colour,[m[0]-x,m[1]-y,m[2]-z]);
  }
}

export interface ParkedFootprint{x:number;z:number;y:number;heading:number;width:number;length:number}

export interface BuiltStreetscape{meshes:Mesh[];dispose():void}

/** Section size for the street's meshes: each view (and each mirror) draws only the sections in front of it. */
const CHUNK=200;

/** Builds the street's meshes under `parent`. `parked` adds a soft ground shadow under each parked car. */
export function buildStreetscape(scene:Scene,layout:StreetLayout,parent:TransformNode,parked:ParkedFootprint[]):BuiltStreetscape{
  const chunks=new Map<string,Builders>();
  const at=(x:number,z:number):Builders=>{
    const key=`${Math.floor(x/CHUNK)},${Math.floor(z/CHUNK)}`;
    let b=chunks.get(key);
    if(!b){b={brick:new Geometry(),roof:new Geometry(),detail:new Geometry()};chunks.set(key,b)}
    return b;
  };
  for(const h of layout.houses)house(at(h.frame.ox,h.frame.oz),h);
  for(const s of layout.strips)boundary(at((s.a.x+s.b.x)/2,(s.a.z+s.b.z)/2),s);
  for(const p of layout.pads){
    const b=at(p.corners[0].x,p.corners[0].z);
    const y=p.y;
    const pts=p.corners.map(c=>[c.x,y,c.z] as V3);
    b.detail.regionQuad(pts as [V3,V3,V3,V3],REGIONS.paving,p.kind==='path'?COLOURS.path:COLOURS.drive,[0,1,0]);
  }
  for(const l of layout.lamps){
    const b=at(l.x,l.z);
    prism(b.detail,l.x,l.z,l.y,6,.09,.06,COLOURS.lamp);
    const f={x:Math.sin(l.heading),z:-Math.cos(l.heading)};
    box(b.detail,{x:l.x+f.x*.35,z:l.z+f.z*.35},l.y+5.9,f,.08,.75,.08,flatFace(COLOURS.lamp));
    box(b.detail,{x:l.x+f.x*.8,z:l.z+f.z*.8},l.y+5.78,f,.26,.6,.14,flatFace(COLOURS.lantern));
  }
  for(const t of layout.trees){
    const b=at(t.x,t.z);
    prism(b.detail,t.x,t.z,t.y,t.height*.55,.16*t.radius/2,.1*t.radius/2,COLOURS.bark,4);
    crown(b.detail,t.x,t.y+t.height-t.radius*.95,t.z,t.radius,t.radius*1.05,COLOURS.leaves);
  }
  for(const bin of layout.bins){
    const b=at(bin.x,bin.z);
    const f={x:Math.sin(bin.heading),z:-Math.cos(bin.heading)};
    box(b.detail,bin,bin.y,f,.58,.72,1,flatFace(hex(bin.colour)));
    box(b.detail,bin,bin.y+1,f,.62,.78,.05,flatFace(hex(bin.colour).map(c=>c*.8) as RGB));
  }
  for(const d of layout.drains){
    const b=at(d.x,d.z);
    const f={x:Math.sin(d.heading),z:-Math.cos(d.heading)},a={x:-f.z,z:f.x};
    const P=(u:number,v:number):V3=>[d.x+a.x*u+f.x*v,d.y,d.z+a.z*u+f.z*v];
    b.detail.regionQuad([P(-.2,-.25),P(.2,-.25),P(.2,.25),P(-.2,.25)],REGIONS.grate,COLOURS.grate,[0,1,0]);
  }
  for(const c of parked){
    const b=at(c.x,c.z);
    const f={x:Math.sin(c.heading),z:-Math.cos(c.heading)},a={x:-f.z,z:f.x};
    const P=(u:number,v:number):V3=>[c.x+a.x*u+f.x*v,c.y+.004,c.z+a.z*u+f.z*v];
    const w=c.width/2+.05,l=c.length/2+.05;
    b.detail.flat([P(-w,-l),P(w,-l),P(w,l),P(-w,l)],COLOURS.shadow,[0,1,0]);
  }

  const material=(name:string,texture:import('../engine/babylon').DynamicTexture)=>{
    const m=new StandardMaterial(name,scene);
    m.diffuseTexture=texture;
    m.specularColor=new Color3(.04,.04,.04);
    m.backFaceCulling=true;
    m.freeze();
    return m;
  };
  const materials=[material('scenery-brick',brickTexture(scene)),material('scenery-roof',roofTexture(scene)),material('scenery-detail',detailTexture(scene))];
  const meshes=[...chunks].flatMap(([key,b])=>[
    b.brick.mesh(`streetscape-brick-${key}`,scene,materials[0]!,parent),
    b.roof.mesh(`streetscape-roof-${key}`,scene,materials[1]!,parent),
    b.detail.mesh(`streetscape-detail-${key}`,scene,materials[2]!,parent)
  ]).filter((m):m is Mesh=>m!==null);
  return {
    meshes,
    dispose(){
      for(const m of meshes)m.dispose();
      for(const m of materials){m.diffuseTexture?.dispose();m.dispose()}
    }
  };
}
