import {
  Color3,CreateBox,CreateCylinder,CreateDisc,CreateGround,CreateRibbon,CreateSphere,Mesh,DirectionalLight,HemisphericLight,StandardMaterial,TransformNode,Vector3,
  Scene
} from '../engine/babylon';
import {degToRad,type Location,type Road} from '../contracts';
import {rotationYFromHeading} from '../engine/babylonAdapter';
import type {QualityProfile} from '../engine/quality';
import {onOtherCarriageway,pavementWidthAt,pointAtAlong,roadHalfWidth,sampleRoad} from './roadGeometry';
import {buildSky,configureTone,mapWorldUVs,texture,type SurfaceKind} from './surfaces';
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
  hemi.intensity=.5;
  hemi.diffuse=new Color3(.86,.92,1);
  hemi.groundColor=new Color3(.3,.32,.29);
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
      const keep=(s:Sample)=>{
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
