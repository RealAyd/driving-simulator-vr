import {
  Color3,CreateBox,CreateCylinder,CreateDisc,CreateGround,CreateRibbon,CreateSphere,DynamicTexture,Mesh,DirectionalLight,HemisphericLight,StandardMaterial,TransformNode,Vector3,
  VertexData,Scene
} from '../engine/babylon';
import {degToRad,type Location,type Road} from '../contracts';
import {rotationYFromHeading} from '../engine/babylonAdapter';
import type {QualityProfile} from '../engine/quality';
import {onOtherCarriageway,pavementWidthAt,pointAtAlong,roadHalfWidth,sampleRoad} from './roadGeometry';
import {buildSky,configureTone,mapWorldUVs,texture,type SurfaceKind} from './surfaces';
import {junctionMouths,mouthLane,mouthPoint,schoolFrontages} from './junctionControls';
import {layoutRoundabouts,splitterOutline} from './roundaboutLayout';
import {roundaboutRings} from './roundabouts';
import type {Terrain} from './terrain';

export interface BuiltWorld{
  root:TransformNode;
  /** Meshes that can hide hazards from the driver (used by later stages). */
  occluders:Mesh[];
  /** The sun (casts the shadows near the car, shadows.ts). */
  sun:DirectionalLight;
  dispose():void;
}

/** Haze at the horizon (also the fog colour) and the sky overhead. */
const SKY=new Color3(.76,.83,.88),ZENITH=new Color3(.34,.55,.82);

function material(scene:Scene,name:string,color:Color3,specular=.05):StandardMaterial{
  const m=new StandardMaterial(name,scene);
  m.diffuseColor=color;
  m.specularColor=new Color3(specular,specular,specular);
  return m;
}

/** Dashed or solid line markings laid along a centreline offset (not yet parented). */
function markings(scene:Scene,road:Road,offset:number,dash:number,gap:number,width:number,y:number):Mesh[]{
  const out:Mesh[]=[];
  const end=road.centreline.at(-1)!;
  const total=sampleRoad(road,end.x,end.z).along;
  // Solid lines are laid in short pieces so they follow curves.
  const piece=gap>0?dash:1,step=gap>0?dash+gap:1;
  for(let s=offset===0?road.markings.centreFrom:0;s<total;s+=step){
    const l=Math.min(piece,total-s);
    const p=pointAtAlong(road,s+l/2);
    const line=CreateGround(`marking-${road.id}-${offset}-${s.toFixed(1)}`,{width,height:l+(gap>0?0:.05)},scene);
    line.position.set(p.x+(-p.direction.z)*offset,y,p.z+p.direction.x*offset);
    line.rotation.y=rotationYFromHeading(Math.atan2(p.direction.x,-p.direction.z));
    out.push(line);
  }
  return out;
}

interface Sample{x:number;z:number;rx:number;rz:number;along:number}

/**
 * Centreline points with the right-of-travel unit vector: at most `step` apart
 * where `dense` says detail is needed (junctions, other roads), else `sparse`.
 */
function resample(road:Road,dense:(x:number,z:number)=>boolean,step=1,sparse=8):Sample[]{
  const pts=road.centreline,out:Sample[]=[];
  let along=0;
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i]!,b=pts[i+1]!;
    const len=Math.hypot(b.x-a.x,b.z-a.z);
    if(len===0)continue;
    const ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
    // Coarse first, then fine wherever a coarse piece touches something that needs detail.
    const coarse=Math.max(1,Math.ceil(len/sparse));
    const needsDetail=Array.from({length:coarse+1},(_,k)=>dense(a.x+ux*len*k/coarse,a.z+uz*len*k/coarse)).some(Boolean);
    const n=needsDetail?Math.max(1,Math.ceil(len/step)):coarse;
    for(let k=0;k<n;k++)out.push({x:a.x+ux*len*k/n,z:a.z+uz*len*k/n,rx:-uz,rz:ux,along:along+len*k/n});
    along+=len;
    if(i===pts.length-2)out.push({x:b.x,z:b.z,rx:-uz,rz:ux,along});
  }
  // Average directions at the original corners so offset edges do not kink.
  for(let i=1;i<out.length-1;i++){
    const p=out[i-1]!,q=out[i+1]!;
    const dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz)||1;
    out[i]={...out[i]!,rx:-dz/l,rz:dx/l};
  }
  return out;
}

const at=(s:Sample,offset:number,y:number)=>new Vector3(s.x+s.rx*offset,y,s.z+s.rz*offset);

/** Ribbons between two offsets, one per run of samples that `keep` accepts. */
function strips(scene:Scene,name:string,samples:Sample[],fromOffset:number|((s:Sample)=>number),toOffset:number|((s:Sample)=>number),y0:number,y1:number,keep:(s:Sample)=>boolean,parent:TransformNode):Mesh[]{
  const from=typeof fromOffset==='number'?()=>fromOffset:fromOffset,to=typeof toOffset==='number'?()=>toOffset:toOffset;
  const meshes:Mesh[]=[];
  let run:Sample[]=[];
  const flush=()=>{
    if(run.length>=2){
      const mesh=CreateRibbon(`${name}-${meshes.length}`,{pathArray:[run.map(s=>at(s,from(s),y0)),run.map(s=>at(s,to(s),y1))],sideOrientation:2},scene);
      mesh.parent=parent;
      meshes.push(mesh);
    }
    run=[];
  };
  for(const s of samples){if(keep(s))run.push(s);else flush()}
  flush();
  return meshes;
}

export function buildWorld(scene:Scene,location:Location,quality:QualityProfile,terrain:Terrain|null=null):BuiltWorld{
  scene.clearColor.set(SKY.r,SKY.g,SKY.b,1);
  // Light haze: distant houses fade into the sky rather than ending against it (mirrors included).
  scene.fogMode=Scene.FOGMODE_LINEAR;
  scene.fogColor=SKY.clone();
  scene.fogStart=180;
  scene.fogEnd=650;
  scene.ambientColor=new Color3(.3,.3,.3);
  configureTone(scene);
  const root=new TransformNode(`location-${location.id}`,scene);
  buildSky(scene,SKY,ZENITH).parent=root;

  // Sky fill (slightly blue) weaker than the sun, as on a clear day: faces away from the sun and shadows stay readable.
  const hemi=new HemisphericLight('sky-light',new Vector3(0,1,0),scene);
  hemi.intensity=.68;
  hemi.diffuse=new Color3(.86,.92,1);
  hemi.groundColor=new Color3(.42,.43,.4);
  // Afternoon sun from the south-west, low enough for shadows to model buildings and cars.
  const sun=new DirectionalLight('sun',new Vector3(-.45,-.8,.4),scene);
  sun.intensity=1.05;
  sun.diffuse=new Color3(1,.96,.88);

  const tarmac=material(scene,'tarmac',new Color3(.24,.25,.27));
  const pavement=material(scene,'pavement',new Color3(.58,.57,.55));
  const kerb=material(scene,'kerb',new Color3(.7,.7,.68));
  // The ground between roads and buildings: grass verges, or paving in a town centre.
  const grass=material(scene,'grass',location.ground==='paved'?new Color3(.6,.59,.56):new Color3(.33,.47,.27));
  // Textured surfaces (surfaces.ts): the texture carries the colour.
  texture(tarmac,'asphalt');
  texture(pavement,'paving');
  texture(kerb,'kerb');
  texture(grass,location.ground==='paved'?'paving':'grass');
  const surfaceOf=new Map<StandardMaterial,SurfaceKind>([[tarmac,'asphalt'],[pavement,'paving'],[kerb,'kerb'],[grass,location.ground==='paved'?'paving':'grass']]);
  const white=material(scene,'road-white',new Color3(.95,.95,.93));
  white.emissiveColor=new Color3(.25,.25,.25);

  // Subdivided: one huge two-triangle plane loses depth precision where it is clipped near the camera, and the grass
  // 2 cm below then shows through the road (seen in software rendering from some viewpoints).
  const ground=CreateGround('verge',{width:2000,height:2000,subdivisions:40},scene);
  // A paved town ground sits a little lower, so the areas drawn on it (gardens, car parks, paths) stay clearly above it.
  ground.position.y=location.ground==='paved'?-.06:-.02;
  ground.material=grass;
  ground.parent=root;
  mapWorldUVs(ground,surfaceOf.get(grass)!);
  if(terrain){
    // On real ground: a grid over the terrain (one square per terrain cell) that is laid on it with everything else,
    // a little lower again so it never shows through the road between the road's edges; the flat plane beyond, below it.
    const e=terrain.extent;
    // Large areas (a whole test centre's streets): one square per two cells, a little lower again (gentle London slopes).
    const step=e.cols*e.rows>40_000?2:1;
    const near=CreateGround('verge-terrain',{width:e.width,height:e.depth,subdivisionsX:Math.ceil((e.cols-1)/step),subdivisionsY:Math.ceil((e.rows-1)/step)},scene);
    near.position.set(e.x0+e.width/2,ground.position.y-(step>1?.14:.08),e.z0+e.depth/2);
    near.material=grass;
    near.parent=root;
    near.computeWorldMatrix(true);
    mapWorldUVs(near,surfaceOf.get(grass)!);
    ground.position.y=terrain.lowest-1;
    ground.name='verge-beyond';
  }

  // Static meshes are merged per material at the end to keep draw calls low on phones.
  const byMaterial=new Map<StandardMaterial,Mesh[]>();
  const add=(mat:StandardMaterial,...meshes:Mesh[])=>{
    for(const m of meshes)m.material=mat;
    byMaterial.set(mat,[...(byMaterial.get(mat)??[]),...meshes]);
  };
  const inJunction=(x:number,z:number,extra=0)=>location.junctions.some(j=>Math.hypot(x-j.position.x,z-j.position.z)<=j.radius+extra);
  // A roundabout's ring: no footway round the inside (its island is drawn instead, below).
  const rings=roundaboutRings(location);
  const islandSide=(road:Road):number=>{
    const ring=rings.find(g=>g.roads.has(road));
    if(!ring)return 0;
    const a=road.centreline[0]!,b=road.centreline[1]!,rx=-(b.z-a.z),rz=b.x-a.x;
    return (ring.position.x-a.x)*rx+(ring.position.z-a.z)*rz>0?1:-1;
  };

  for(const road of location.roads){
    const half=roadHalfWidth(road);
    const y=road.surfaceHeight;
    const samples=resample(road,(x,z)=>inJunction(x,z,road.pavementWidth+8)||onOtherCarriageway(location,x,z,road.id,road.pavementWidth+8),1,road.pavementProfile?4:8);
    add(tarmac,...strips(scene,`carriageway-${road.id}`,samples,-half,half,y,y,s=>!inJunction(s.x,s.z,-.5),root));
    for(const side of [-1,1]){
      // A wide pavement (profile) stops short of any other carriageway or junction it would reach.
      const widths=new Map<Sample,number>();
      const width=(s:Sample)=>{
        let w=widths.get(s);
        if(w!==undefined)return w;
        w=pavementWidthAt(road,s.along,side);
        if(w>road.pavementWidth)for(let d=road.pavementWidth;d<=w;d+=.5){
          const v=at(s,side*(half+d),0);
          if(onOtherCarriageway(location,v.x,v.z,road.id,.4)||inJunction(v.x,v.z,.4)){w=Math.max(road.pavementWidth,d-.5);break}
        }
        widths.set(s,w);
        return w;
      };
      const inner=side*half,outer=(s:Sample)=>side*(half+width(s));
      // No pavement across another road, a junction, or the gap between paired one-way roads.
      const inside=islandSide(road)===side;
      const keep=(s:Sample)=>{
        if(inside)return false;
        const base=Math.min(width(s),road.pavementWidth);
        const p=at(s,side*(half+base/2),0),q=at(s,side*(half+base),0),k=at(s,inner+side*.2,0);
        return width(s)>0&&!inJunction(s.x,s.z,road.pavementWidth)&&![p,q,k].some(v=>onOtherCarriageway(location,v.x,v.z,road.id,.2));
      };
      add(pavement,...strips(scene,`pavement-${road.id}-${side}`,samples,inner,outer,y+road.kerbHeight,y+road.kerbHeight,keep,root));
      add(kerb,...strips(scene,`kerb-${road.id}-${side}`,samples,inner,inner,y,y+road.kerbHeight,keep,root));
    }
    const lineY=y+.006;
    // The centre zig-zags of a zebra crossing replace the centre line there.
    const zigzagged=(x:number,z:number)=>location.crossings.some(c=>{
      if(c.roadId!==road.id||c.zigzagMarks===0)return false;
      return Math.abs(sampleRoad(road,x,z).along-c.along)<c.width/2+c.giveWayOffset+.3+c.zigzagMarks*2+.5;
    });
    const lines=(offset:number,dash:number,gap:number,width:number)=>{
      for(const line of markings(scene,road,offset,dash,gap,width,lineY))
        if(inJunction(line.position.x,line.position.z,.5)||onOtherCarriageway(location,line.position.x,line.position.z,road.id)
          ||(offset===0&&zigzagged(line.position.x,line.position.z)))line.dispose();
        else{line.parent=root;add(white,line)}
    };
    if(road.markings.centre==='dashed')lines(0,3,6,.1);        // UK centre/lane line: short dash, long gap
    else if(road.markings.centre==='hazard')lines(0,6,3,.15);  // hazard warning line
    else if(road.markings.centre==='solid')lines(0,0,0,.1);
    if(road.markings.edges)for(const side of [-1,1])lines(side*(half-.2),0,0,.1);
  }

  // Mini-roundabouts: junction surface, painted disc, give-way lines on each entry.
  for(const j of location.junctions){
    const surface=CreateDisc(`${j.id}-surface`,{radius:j.radius,tessellation:48},scene);
    surface.rotation.x=Math.PI/2;
    surface.position.set(j.position.x,.001,j.position.z);
    surface.parent=root;
    add(tarmac,surface);
    const disc=CreateDisc(`${j.id}-disc`,{radius:j.discDiameter/2,tessellation:32},scene);
    disc.rotation.x=Math.PI/2;
    disc.position.set(j.position.x,.012,j.position.z);
    disc.parent=root;
    add(white,disc);
    for(const roadId of j.entries){
      const road=location.roads.find(r=>r.id===roadId)!;
      const half=roadHalfWidth(road);
      const end=road.centreline.at(-1)!;
      const stop=pointAtAlong(road,sampleRoad(road,end.x,end.z).along-j.radius);
      const heading=Math.atan2(stop.direction.x,-stop.direction.z);
      const rx=-stop.direction.z,rz=stop.direction.x;
      // Two-way roads: only the half carrying traffic into the junction (left of travel).
      const to=road.oneway?half:0;
      for(const row of [-.15,-.55])for(let lateral=-half+.1;lateral<to-.3;lateral+=.9){
        const dash=CreateGround(`${j.id}-${roadId}-giveway-${row}-${lateral.toFixed(1)}`,{width:.6,height:.2},scene);
        dash.position.set(stop.x+rx*(lateral+.3)+stop.direction.x*row,.012,stop.z+rz*(lateral+.3)+stop.direction.z*row);
        dash.rotation.y=rotationYFromHeading(heading);
        dash.parent=root;
        add(white,dash);
      }
    }
  }

  // Roundabouts bigger than a mini (roundaboutLayout.ts): the central island, a kerb round grass raised a kerb's height
  // above the road; splitters painted between the way in and the way out (white edges, diagonal hatching), with a
  // white bollard at the nose of each splitter island (its keep-left sign is in the sign plan).
  const roundabouts=layoutRoundabouts(location);
  for(const island of roundabouts.islands){
    const o=island.outline,c=island.centre,y=island.y,top=y+.12;
    const positions:number[]=[c.x,top,c.z],indices:number[]=[];
    for(const p of o)positions.push(p.x,top,p.z);
    for(let k=0;k<o.length;k++)indices.push(0,1+(k+1)%o.length,1+k);
    const disc=new Mesh(`${island.id}-grass`,scene);
    const data=new VertexData();data.positions=positions;data.indices=indices;
    const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);
    // (Facing up whichever way round the outline runs.)
    if(normals[1]!<0)for(let k=0;k<indices.length;k+=3){const t=indices[k+1]!;indices[k+1]=indices[k+2]!;indices[k+2]=t}
    data.normals=[];VertexData.ComputeNormals(positions,indices,data.normals);
    data.applyToMesh(disc);
    disc.parent=root;
    mapWorldUVs(disc,surfaceOf.get(grass)!);
    add(grass,disc);
    const loop=[...o,o[0]!];
    const wall=CreateRibbon(`${island.id}-kerb`,{pathArray:[loop.map(p=>new Vector3(p.x,y,p.z)),loop.map(p=>new Vector3(p.x,top,p.z))],sideOrientation:2},scene);
    wall.parent=root;
    add(kerb,wall);
  }
  const paintLine=(name:string,a:{x:number;z:number},b:{x:number;z:number},width:number,y:number)=>{
    const l=Math.hypot(b.x-a.x,b.z-a.z);
    if(l<.05)return;
    const line=CreateGround(name,{width,height:l},scene);
    line.position.set((a.x+b.x)/2,y,(a.z+b.z)/2);
    line.rotation.y=rotationYFromHeading(Math.atan2(b.x-a.x,-(b.z-a.z)));
    line.parent=root;
    add(white,line);
  };
  for(const sp of roundabouts.splitters){
    const y=sp.y+.007,edge=splitterOutline(sp),n=edge.length/2;
    for(let k=0;k<edge.length-1;k++)paintLine(`${sp.id}-edge-${k}`,edge[k]!,edge[k+1]!,.1,y);
    paintLine(`${sp.id}-nose`,edge.at(-1)!,edge[0]!,.1,y);
    // Hatching: diagonal stripes from one edge to the other, a little nearer the tail on the far side.
    for(let k=1;k<n-1;k++)paintLine(`${sp.id}-hatch-${k}`,edge[k]!,edge[2*n-1-Math.min(n-1,k+1)]!,.15,y);
  }
  for(const b of roundabouts.bollards){
    const bollard=CreateCylinder(b.id,{diameter:.4,height:.75,tessellation:12},scene);
    bollard.position.set(b.at.x,b.y+.375,b.at.z);
    bollard.parent=root;
    add(white,bollard);
  }

  // Zebra crossings: stripes parallel to traffic, broken give-way lines on
  // both approaches and Belisha beacons on each pavement.
  const black=material(scene,'beacon-black',new Color3(.05,.05,.05));
  const amber=material(scene,'beacon-amber',new Color3(1,.6,.1));
  amber.emissiveColor=new Color3(.9,.5,.05);
  for(const crossing of location.crossings){
    const road=location.roads.find(r=>r.id===crossing.roadId)!;
    const half=roadHalfWidth(road);
    const at=pointAtAlong(road,crossing.along);
    const heading=Math.atan2(at.direction.x,-at.direction.z);
    const rx=-at.direction.z,rz=at.direction.x; // right of travel
    const y=road.surfaceHeight+.008;
    const place=(mesh:Mesh,lateral:number,alongOffset:number,h:number)=>{
      mesh.position.set(at.x+rx*lateral+at.direction.x*alongOffset,h,at.z+rz*lateral+at.direction.z*alongOffset);
      mesh.rotation.y=rotationYFromHeading(heading);
      mesh.parent=root;
    };
    if(crossing.kind==='signal'){
      // Studs along both edges and a stop line on each approach; the lights are not simulated yet.
      for(const edge of [-1,1])for(let lateral=-half+.3;lateral<half;lateral+=.8){
        const stud=CreateGround(`${crossing.id}-stud-${edge}-${lateral.toFixed(1)}`,{width:.12,height:.12},scene);
        place(stud,lateral,edge*crossing.width/2,y);
        add(kerb,stud);
      }
      for(const side of [-1,1]){
        // Traffic towards the crossing from this side drives on its left: side −1 (behind) uses the left half.
        const from=side<0?-half:0,to=side<0?0:half;
        const line=CreateGround(`${crossing.id}-stop-${side}`,{width:to-from-.2,height:.3},scene);
        place(line,(from+to)/2,side*(crossing.width/2+crossing.giveWayOffset),y);
        add(white,line);
      }
      continue;
    }
    for(let lateral=-half+.3;lateral<half;lateral+=1.2){
      const stripe=CreateGround(`${crossing.id}-stripe-${lateral.toFixed(1)}`,{width:.6,height:crossing.width},scene);
      stripe.material=white;
      place(stripe,lateral+.3,0,y);
    }
    for(const side of [-1,1]){
      const offset=side*(crossing.width/2+crossing.giveWayOffset);
      for(let lateral=-half+.25;lateral<half-.2;lateral+=.9){
        const dash=CreateGround(`${crossing.id}-giveway-${side}-${lateral.toFixed(1)}`,{width:.6,height:.2},scene);
        dash.material=white;
        place(dash,lateral+.3,offset,y);
      }
      // Zig-zags: from just beyond the give-way line, along both kerbs and the centre line.
      for(let m=0;m<crossing.zigzagMarks;m++)for(const line of [-half+.25,0,half-.25]){
        const a0=side*(crossing.width/2+crossing.giveWayOffset+.3+m*2),a1=a0+side*2;
        const l0=line+(m%2?.25:-.25)*(line===0?.6:1),l1=line+(m%2?-.25:.25)*(line===0?.6:1);
        const mid={along:(a0+a1)/2,lateral:(l0+l1)/2};
        const mx=at.x+rx*mid.lateral+at.direction.x*mid.along,mz=at.z+rz*mid.lateral+at.direction.z*mid.along;
        // Interrupted where a side road meets the kerb.
        if(onOtherCarriageway(location,mx,mz,road.id,.3))continue;
        const len=Math.hypot(a1-a0,l1-l0);
        const mark=CreateGround(`${crossing.id}-zigzag-${side}-${m}-${line.toFixed(1)}`,{width:.1,height:len},scene);
        mark.position.set(mx,y,mz);
        mark.rotation.y=rotationYFromHeading(heading+Math.atan2(l1-l0,a1-a0));
        mark.parent=root;
        add(white,mark);
      }
      const poleLateral=side*(half+.5);
      const pole=CreateCylinder(`${crossing.id}-beacon-pole-${side}`,{height:2.6,diameter:.1},scene);
      pole.material=black;
      place(pole,poleLateral,-crossing.width/2-.3,road.surfaceHeight+road.kerbHeight+1.3);
      const globe=CreateSphere(`${crossing.id}-beacon-${side}`,{diameter:.32,segments:8},scene);
      globe.material=amber;
      place(globe,poleLateral,-crossing.width/2-.3,road.surfaceHeight+road.kerbHeight+2.7);
    }
  }

  // ---- Junction mouths: give way lines (and the triangle before them), or a STOP line and STOP on the road;
  // outside schools, yellow zig-zags and SCHOOL KEEP CLEAR (junctionControls.ts) ----
  const yellow=material(scene,'road-yellow',new Color3(.95,.78,.12));
  const paint=(name:string,w:number,h:number,p:{x:number;z:number},heading:number,y:number,mat:StandardMaterial)=>{
    const g=CreateGround(name,{width:w,height:h},scene);
    g.position.set(p.x,y,p.z);g.rotation.y=rotationYFromHeading(heading);g.parent=root;add(mat,g);
  };
  const legends=new Map<string,StandardMaterial>();
  /** Words painted on the road (STOP, SCHOOL KEEP CLEAR), tall and narrow as UK road legends are, read on approach. */
  const legend=(text:string,colour:string,p:{x:number;z:number},heading:number,y:number,w:number,h:number)=>{
    let mat=legends.get(text);
    if(!mat){
      mat=new StandardMaterial(`legend-${text}`,scene);
      const tex=new DynamicTexture(`legend-${text}`,{width:256,height:512},scene,true);
      const ctx=tex.getContext() as unknown as CanvasRenderingContext2D;
      ctx.clearRect(0,0,256,512);
      ctx.fillStyle=colour;ctx.textAlign='center';ctx.textBaseline='middle';
      const lines=text.split(' ');
      lines.forEach((line,i)=>{ctx.save();ctx.translate(128,512*(i+.5)/lines.length);ctx.scale(1,2.2);ctx.font='700 64px Arial,sans-serif';
        let size=64;while(size>16&&ctx.measureText(line).width>240){size-=4;ctx.font=`700 ${size}px Arial,sans-serif`}
        ctx.fillText(line,0,0);ctx.restore()});
      tex.update(true);tex.hasAlpha=true;
      mat.diffuseTexture=tex;mat.useAlphaFromDiffuseTexture=true;mat.specularColor=new Color3(0,0,0);mat.emissiveColor=new Color3(.25,.25,.25);
      mat.freeze();
      legends.set(text,mat);
    }
    const g=CreateGround(`legend-${text}-${p.x.toFixed(1)}`,{width:w,height:h},scene);
    g.position.set(p.x,y,p.z);g.rotation.y=rotationYFromHeading(heading);g.parent=root;g.material=mat;
  };
  for(const m of junctionMouths(location)){
    const [from,to]=mouthLane(m),y=m.road.surfaceHeight+.013;
    const c0=mouthPoint(m,0,0),heading=Math.atan2(c0.dir.x,-c0.dir.z);
    if(m.kind==='stop'){
      const mid=mouthPoint(m,.15,(from+to)/2);
      paint(`${m.id}-stop-line`,to-from-.2,.3,mid,heading,y,white);
      legend('STOP','#f4f4f0',mouthPoint(m,4.5,(from+to)/2),heading,y+.001,Math.min(2.2,to-from-.4),2.8);
      continue;
    }
    // Two rows of broken lines across the lane, then the triangle a few metres back, its point towards the driver
    // approaching (diagrams 1003 and 1023).
    for(const row of [.1,.55])for(let l=from+.15;l<to-.4;l+=.9)paint(`${m.id}-gw-${row}-${l.toFixed(1)}`,.6,.2,mouthPoint(m,row,l+.3),heading,y,white);
    const centre=(from+to)/2,apex=mouthPoint(m,9.75,centre),baseL=mouthPoint(m,6,centre-.7),baseR=mouthPoint(m,6,centre+.7);
    for(const [a,b] of [[apex,baseL],[apex,baseR],[baseL,baseR]] as const){
      const len=Math.hypot(b.x-a.x,b.z-a.z);
      paint(`${m.id}-tri-${a.x.toFixed(1)}-${b.x.toFixed(1)}`,.12,len,{x:(a.x+b.x)/2,z:(a.z+b.z)/2},Math.atan2(b.x-a.x,-(b.z-a.z)),y,white);
    }
  }
  for(const f of schoolFrontages(location)){
    const half=roadHalfWidth(f.road),y=f.road.surfaceHeight+.012,off=f.side*(half-.35);
    const at=(along:number,lat:number)=>{const p=pointAtAlong(f.road,along);return {x:p.x-p.direction.z*lat,z:p.z+p.direction.x*lat,h:Math.atan2(p.direction.x,-p.direction.z)}};
    // Zig-zags: 1 m legs, 0.4 m across, along the kerb.
    for(let s=f.along-f.length/2,k=0;s<f.along+f.length/2;s+=1,k++){
      const a=at(s,off+(k%2?.2:-.2)*f.side),b=at(s+1,off+(k%2?-.2:.2)*f.side);
      paint(`${f.id}-zz-${k}`,.1,Math.hypot(b.x-a.x,b.z-a.z),{x:(a.x+b.x)/2,z:(a.z+b.z)/2},Math.atan2(b.x-a.x,-(b.z-a.z)),y,yellow);
    }
    const mid=at(f.along,off-f.side*1.1);
    legend('SCHOOL KEEP CLEAR','#f2c21e',mid,mid.h+(f.side>0?Math.PI:0),y+.001,1.6,6);
  }

  const occluders:Mesh[]=[];
  const blockColours:Record<string,Color3>={
    building:new Color3(.66,.45,.36),
    wall:new Color3(.55,.5,.45),
    hedge:new Color3(.2,.36,.18),
    'parked-vehicle':new Color3(.85,.86,.88)
  };
  const blockMaterials=new Map<string,StandardMaterial>();
  for(const block of location.blocks){
    if(quality.decorativeDetail==='reduced'&&!block.occludes)continue;
    // Parked vehicles with a model and shaped blocks (memorials) are drawn with the scenery.
    if(block.vehicleModel||block.shape!=='box')continue;
    const key=block.colour??block.kind;
    let mat=blockMaterials.get(key);
    if(!mat){
      mat=material(scene,`block-${key}`,block.colour?Color3.FromHexString(block.colour):blockColours[block.kind]!);
      blockMaterials.set(key,mat);
    }
    const box=CreateBox(block.id,{width:block.size.width,depth:block.size.depth,height:block.size.height},scene);
    box.position.set(block.position.x,block.size.height/2,block.position.z);
    box.rotation.y=rotationYFromHeading(degToRad(block.headingDeg));
    box.material=mat;
    box.parent=root;
    if(block.occludes)occluders.push(box);
  }

  // Buildings, map trees, areas and street furniture are drawn with the scenery (townscape.ts, streetscapeMesh.ts).

  // One draw call per material for everything static.
  for(const [mat,meshes] of byMaterial){
    const kind=surfaceOf.get(mat);
    if(meshes.length<2){if(kind)for(const m of meshes)mapWorldUVs(m,kind);continue}
    const merged=Mesh.MergeMeshes(meshes,true,true);
    if(merged){merged.name=`merged-${mat.name}`;merged.material=mat;merged.parent=root;if(kind)mapWorldUVs(merged,kind);merged.freezeWorldMatrix()}
  }

  return {
    root,
    occluders,
    sun,
    dispose(){
      root.dispose(false,true);
      hemi.dispose();
      sun.dispose();
    }
  };
}
