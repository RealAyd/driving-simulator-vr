import {applyPose,rotationYFromHeading} from '../engine/babylonAdapter';
import {Color3,CreateBox,Mesh,StandardMaterial,TransformNode,VertexData,type Scene} from '../engine/babylon';
import type {Appearance} from '../world/crowd';
import type {Figure} from '../world/peopleMesh';
import type {CarModel} from '../assets/models';
import type {FollowingVehicle} from './followingVehicle';
import type {Pedestrian} from './pedestrian';

function mat(scene:Scene,name:string,colour:Color3):StandardMaterial{
  const m=new StandardMaterial(name,scene);
  m.diffuseColor=colour;
  m.specularColor=new Color3(.1,.1,.1);
  return m;
}

/** The crossing pedestrian's clothes (navy coat, dark trousers), as before. */
const CROSSING_PEDESTRIAN:Appearance={top:[.12,.2,.38],legs:[.15,.15,.17],skin:[.78,.6,.48],hair:[.25,.17,.11],height:1.72,build:1,coat:.22,hair_style:1};

/**
 * The scripted crossing pedestrian drawn as one of the shared people figures:
 * standing while waiting, walking (legs and arms swinging) while crossing.
 * Display only: the actor's position, footprint and timing are unchanged.
 */
export function pedestrianFigure(ped:Pedestrian,groundAt:(x:number,z:number)=>number):Figure{
  let last={...ped.position},walked=0;
  return {
    id:`actor-${ped.id}`,look:CROSSING_PEDESTRIAN,
    pose:()=>{
      walked+=Math.hypot(ped.position.x-last.x,ped.position.z-last.z);
      last={...ped.position};
      // Facing the way they walk to the kerb (if they do), then across.
      const to=ped.approaching?ped.def.waitAt:ped.def.crossTo,from=ped.approaching?ped.position:ped.def.waitAt;
      const dx=to.x-from.x,dz=to.z-from.z;
      return {x:ped.position.x,y:groundAt(ped.position.x,ped.position.z),z:ped.position.z,heading:Math.atan2(dx,-dz),stride:walked,walking:ped.state==='crossing'||ped.approaching};
    }
  };
}

type V3=[number,number,number];
type RGB=[number,number,number];
/** Coloured flat-shaded triangles for small one-off models (the cyclist). */
class Shapes{
  positions:number[]=[];normals:number[]=[];colors:number[]=[];indices:number[]=[];
  quad(a:V3,b:V3,c:V3,d:V3,colour:RGB,twoSided=false){
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
    let n:V3=[e1[1]!*e2[2]!-e1[2]!*e2[1]!,e1[2]!*e2[0]!-e1[0]!*e2[2]!,e1[0]!*e2[1]!-e1[1]!*e2[0]!];
    const l=Math.hypot(...n)||1;n=[n[0]/l,n[1]/l,n[2]/l];
    const emit=(pts:V3[],nn:V3)=>{
      const base=this.positions.length/3;
      for(const p of pts){this.positions.push(...p);this.normals.push(...nn);this.colors.push(...colour,1)}
      this.indices.push(base,base+1,base+2,base,base+2,base+3);
    };
    emit([a,b,c,d],n);
    if(twoSided)emit([d,c,b,a],[-n[0],-n[1],-n[2]]);
  }
  /** A tube (n-sided, both ends open) from a to b. */
  tube(a:V3,b:V3,r:number,colour:RGB,sides=6){
    const ax=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...ax)||1;
    const u=[ax[0]!/L,ax[1]!/L,ax[2]!/L];
    const ref=Math.abs(u[1]!)<.9?[0,1,0]:[1,0,0];
    let p=[u[1]!*ref[2]!-u[2]!*ref[1]!,u[2]!*ref[0]!-u[0]!*ref[2]!,u[0]!*ref[1]!-u[1]!*ref[0]!];
    const pl=Math.hypot(...p);p=p.map(v=>v/pl);
    const q=[u[1]!*p[2]!-u[2]!*p[1]!,u[2]!*p[0]!-u[0]!*p[2]!,u[0]!*p[1]!-u[1]!*p[0]!];
    const at=(o:V3,k:number):V3=>{const t=k/sides*Math.PI*2,c=Math.cos(t)*r,s=Math.sin(t)*r;return [o[0]+p[0]!*c+q[0]!*s,o[1]+p[1]!*c+q[1]!*s,o[2]+p[2]!*c+q[2]!*s]};
    // Winding: outward faces.
    for(let k=0;k<sides;k++)this.quad(at(a,k),at(a,k+1),at(b,k+1),at(b,k),colour);
  }
  /** A low-poly ball (or upper half). */
  ball(c:V3,r:[number,number,number],colour:RGB,upper=false){
    const rings=upper?3:5,seg=8;
    const pt=(i:number,j:number):V3=>{const th=i/5*Math.PI,ph=j/seg*Math.PI*2;return [c[0]+Math.sin(th)*Math.cos(ph)*r[0],c[1]+Math.cos(th)*r[1],c[2]+Math.sin(th)*Math.sin(ph)*r[2]]};
    for(let i=0;i<rings;i++)for(let j=0;j<seg;j++)this.quad(pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1),colour);
  }
  /** An axis-aligned box (x: width, y: height from y0, z: length), all faces outward. */
  box(cx:number,y0:number,cz:number,w:number,h:number,d:number,colour:RGB,faces='+x-x+z-z+y'){
    const X0=cx-w/2,X1=cx+w/2,Y1=y0+h,Z0=cz-d/2,Z1=cz+d/2;
    if(faces.includes('+x'))this.quad([X1,y0,Z0],[X1,Y1,Z0],[X1,Y1,Z1],[X1,y0,Z1],colour);
    if(faces.includes('-x'))this.quad([X0,y0,Z1],[X0,Y1,Z1],[X0,Y1,Z0],[X0,y0,Z0],colour);
    if(faces.includes('+z'))this.quad([X1,y0,Z1],[X1,Y1,Z1],[X0,Y1,Z1],[X0,y0,Z1],colour);
    if(faces.includes('-z'))this.quad([X0,y0,Z0],[X0,Y1,Z0],[X1,Y1,Z0],[X1,y0,Z0],colour);
    if(faces.includes('+y'))this.quad([X0,Y1,Z0],[X0,Y1,Z1],[X1,Y1,Z1],[X1,Y1,Z0],colour);
  }
  mesh(name:string,scene:Scene,material:StandardMaterial,parent:TransformNode,updatable=false):Mesh{
    const m=new Mesh(name,scene);
    const d=new VertexData();
    d.positions=this.positions;d.normals=this.normals;d.colors=this.colors;d.indices=this.indices;
    d.applyToMesh(m,updatable);
    m.material=material;m.parent=parent;m.isPickable=false;
    return m;
  }
}

/**
 * A generic single-deck bus (project-owned shapes, no operator's livery, no route or destination shown),
 * forward −z, nearside (doors) on −x, exactly filling its collision box.
 */
function busBody(paint:RGB,W:number,L:number,H:number):{body:Shapes;lamps:Shapes}{
  const g=new Shapes(),lamps=new Shapes();
  const skirt:RGB=[.25,.26,.28],glass:RGB=[.1,.12,.15],tyre:RGB=[.06,.06,.06],hub:RGB=[.5,.5,.52],roof:RGB=[.8,.81,.82];
  const w=W/2,l=L/2,o=.012;
  g.box(0,.32,0,W,.6,L,skirt,'+x-x+z-z');
  g.box(0,.92,0,W,H-.92,L,paint);
  g.box(0,H-.12,.4,W*.8,.12,L*.55,roof,'+x-x+z-z+y');
  // Side windows (both sides), pillars between them; the nearside has the doors behind the front wheels.
  for(const side of [-1,1]){
    const x=side*(w+o),face=side>0?'+x':'-x';
    for(let z=-l+2.25;z<l-.5;z+=1.45){
      const len=Math.min(1.3,l-.45-z);
      if(len<.4)continue;
      if(side<0&&z<-l+3.6)continue;
      g.box(x,1.32,z+len/2,.001,1.2,len,glass,face);
    }
    if(side<0){
      // Doors: glazed leaves at the front.
      g.box(x,.45,-l+2.35,.001,2.35,1.15,glass,face);
      g.box(x-.001,.45,-l+2.35,.001,2.35,.04,skirt,face);
    }
    // Wheels.
    for(const z of [-l+2.3,l-2.9]){
      const n=10,r=.5,c:V3=[side*(w+.02),.5,z];
      const ring=(rr:number,x:number)=>Array.from({length:n},(_,k)=>{const a=k/n*Math.PI*2;return [x,c[1]+Math.sin(a)*rr,c[2]+Math.cos(a)*rr] as V3});
      const outer=ring(r,c[0]);
      for(let k=1;k<n-1;k++)g.quad(outer[0]!,outer[k]!,outer[k+1]!,outer[k+1]!,tyre,true);
      const inner=ring(.22,c[0]+side*.005);
      for(let k=1;k<n-1;k++)g.quad(inner[0]!,inner[k]!,inner[k+1]!,inner[k+1]!,hub,true);
    }
  }
  // Front: windscreen, a blank destination display, lights; rear: window and lights.
  g.box(0,.95,-l-o,W*.9,1.75,.001,glass,'-z');
  g.box(0,2.72,-l-o*2,W*.75,.26,.001,[.05,.05,.06],'-z');
  g.box(0,1.75,l+o,W*.8,.9,.001,glass,'+z');
  for(const side of [-1,1]){
    g.box(side*(w-.28),.55,-l-o*2,.32,.18,.001,[.95,.95,.9],'-z');
    g.box(side*(w-.2),.55,l+o*2,.22,.4,.001,[.6,.05,.05],'+z');
    // Indicators (separate mesh: they flash).
    lamps.box(side*(w-.06),.82,-l-o*3,.14,.12,.001,[1,.62,.1],'-z');
    lamps.box(side*(w-.06),1.05,l+o*3,.14,.12,.001,[1,.62,.1],'+z');
    lamps.box(side*(w+o*3),.75,-l+1.2,.001,.1,.25,[1,.62,.1],side>0?'+x':'-x');
  }
  return {body:g,lamps};
}

/** The bus as drawn: hidden once it has left; indicators flash (1.5 Hz) while it signals to pull away. */
export function busVisual(scene:Scene,bus:{id:string;pose:import('../contracts').Pose;visible:boolean;indicating:boolean;def:{colour:string}},size:{halfWidth:number;halfLength:number;height:number},time:()=>number){
  const root=new TransformNode(`actor-${bus.id}`,scene);
  const c=Color3.FromHexString(bus.def.colour);
  const m=mat(scene,`${bus.id}-bus`,new Color3(1,1,1));
  m.backFaceCulling=false;m.twoSidedLighting=true;
  const {body,lamps}=busBody([c.r,c.g,c.b],size.halfWidth*2,size.halfLength*2,size.height);
  body.mesh(`${bus.id}-bus-body`,scene,m,root);
  const lampMat=mat(scene,`${bus.id}-bus-lamps`,new Color3(.35,.22,.05));
  lampMat.backFaceCulling=false;
  const lampMesh=lamps.mesh(`${bus.id}-bus-lamps`,scene,lampMat,root);
  return {
    update(){
      root.setEnabled(bus.visible);
      applyPose(root,bus.pose);
      const lit=bus.indicating&&Math.floor(time()*3)%2===0;
      lampMat.emissiveColor.set(lit?1:0,lit?.6:0,lit?.08:0);
      lampMesh.isVisible=true;
    },
    dispose:()=>root.dispose(false,true)
  };
}

const JACKET:RGB=[.16,.17,.2],FRAME:RGB=[.1,.1,.12],TYRE:RGB=[.05,.05,.05],METAL:RGB=[.55,.56,.58],SKIN:RGB=[.78,.6,.48],TIGHTS:RGB=[.12,.12,.14],SHOE:RGB=[.08,.08,.09];
const BB:V3=[0,.3,.08],CRANK=.17,THIGH=.45,SHIN=.47;

/** Bicycle and rider (static parts), forward −z, about 1.75 m long: within the cyclist's collision box. */
function cyclistBody(paint:RGB):Shapes{
  const g=new Shapes();
  for(const z of [.62,-.62]){
    const n=16,c:V3=[0,.34,z];
    for(let k=0;k<n;k++){
      const a0=k/n*Math.PI*2,a1=(k+1)/n*Math.PI*2;
      g.tube([0,c[1]+Math.sin(a0)*.32,c[2]+Math.cos(a0)*.32],[0,c[1]+Math.sin(a1)*.32,c[2]+Math.cos(a1)*.32],.025,TYRE,4);
    }
    for(let k=0;k<4;k++){const a=k/4*Math.PI;g.tube([0,c[1]+Math.sin(a)*.3,c[2]+Math.cos(a)*.3],[0,c[1]-Math.sin(a)*.3,c[2]-Math.cos(a)*.3],.006,METAL,3)}
  }
  const seat:V3=[0,.8,.25],headTop:V3=[0,.86,-.42],headBottom:V3=[0,.64,-.47],rear:V3=[0,.34,.62],front:V3=[0,.34,-.62],bars:V3=[0,1.0,-.46];
  for(const [a,b] of [[BB,seat],[seat,headTop],[BB,headBottom],[BB,rear],[seat,rear],[headBottom,front],[headTop,bars]] as Array<[V3,V3]>)g.tube(a,b,.022,paint===FRAME?METAL:FRAME,5);
  g.tube([-.24,1,-.46],[.24,1,-.46],.016,FRAME,5);
  g.tube([0,.82,.36],[0,.82,.16],.06,FRAME,6);
  // Rider: a hi-vis vest and helmet in the road user's colour over a dark jacket (sleeves), head.
  const hip:V3=[0,.97,.28],shoulder:V3=[0,1.42,-.1];
  g.tube(hip,shoulder,.17,paint,8);
  g.ball(hip,[.17,.08,.17],paint);
  g.ball(shoulder,[.17,.09,.15],paint);
  g.ball([0,1.62,-.23],[.1,.12,.11],SKIN);
  g.ball([0,1.66,-.22],[.13,.12,.16],paint,true);
  for(const x of [-.19,.19]){
    g.tube([x,1.38,-.1],[x*1.15,1.04,-.42],.045,JACKET,6);
    g.ball([x*1.2,1.0,-.45],[.045,.045,.045],SKIN);
  }
  return g;
}

/** Both legs, from the hips to the pedals at crank angle `a` (two-bone, knees forward). */
function cyclistLegs(a:number):Shapes{
  const g=new Shapes();
  for(const [side,phase] of [[-1,0],[1,Math.PI]] as const){
    const t=a+phase;
    const hip:V3=[side*.1,.97,.28];
    const pedal:V3=[side*.13,BB[1]+Math.sin(t)*CRANK,BB[2]+Math.cos(t)*CRANK];
    const dy=pedal[1]-hip[1],dz=pedal[2]-hip[2],d=Math.min(THIGH+SHIN-.01,Math.hypot(dy,dz));
    // Knee: on the circle of radius THIGH about the hip, forward (−z) of the hip-pedal line.
    const along=(THIGH*THIGH-SHIN*SHIN+d*d)/(2*d),off=Math.sqrt(Math.max(0,THIGH*THIGH-along*along));
    const uy=dy/d,uz=dz/d;
    const knee:V3=[side*.11,hip[1]+uy*along+uz*off,hip[2]+uz*along-uy*off];
    if(knee[2]>hip[2]+uz*along){knee[1]=hip[1]+uy*along-uz*off;knee[2]=hip[2]+uz*along+uy*off}
    g.tube(hip,knee,.075,TIGHTS,6);
    g.tube(knee,pedal,.055,TIGHTS,6);
    g.tube([pedal[0],pedal[1]-.02,pedal[2]+.06],[pedal[0],pedal[1]-.02,pedal[2]-.12],.04,SHOE,4);
    g.tube([side*.05,BB[1],BB[2]],[side*.12,pedal[1],pedal[2]],.012,METAL,3);
  }
  return g;
}

/**
 * Body for other vehicles: the car model when one is loaded (scaled to the
 * collision length), otherwise simple shapes; or a cyclist on a bicycle.
 * `visible`: hidden until the road user sets off, so a waiting actor never sits in the road.
 */
export function vehicleVisual(scene:Scene,id:string,colour:string,pose:()=>import('../contracts').Pose,shape:'car'|'cyclist'='car',visible:()=>boolean=()=>true,model:CarModel|null=null,length=4.3){
  const root=new TransformNode(`actor-${id}`,scene);
  if(shape==='car'&&model){
    model.instantiate(root,id,colour,length);
    return {update(){root.setEnabled(visible());applyPose(root,pose())},dispose:()=>root.dispose(false,true)};
  }
  const paint=mat(scene,`${id}-paint`,Color3.FromHexString(colour));
  if(shape==='cyclist'){
    // A bicycle with a rider pedalling (legs follow the cranks); jersey and helmet in the road user's colour.
    const c=Color3.FromHexString(colour);
    const vertexColoured=mat(scene,`${id}-cyclist`,new Color3(1,1,1));
    // Small one-off model: both faces drawn and lit, so winding does not matter.
    vertexColoured.backFaceCulling=false;
    vertexColoured.twoSidedLighting=true;
    cyclistBody([c.r,c.g,c.b]).mesh(`${id}-cyclist-body`,scene,vertexColoured,root);
    let crank=0,last=pose().position;
    const legs=cyclistLegs(0).mesh(`${id}-cyclist-legs`,scene,vertexColoured,root,true);
    return {
      update(){
        root.setEnabled(visible());
        const p=pose();
        // One crank turn per 2.4 m travelled (about a mid gear).
        crank+=Math.hypot(p.position.x-last.x,p.position.z-last.z)/2.4*Math.PI*2;
        last=p.position;
        applyPose(root,p);
        if(visible()){
          const g=cyclistLegs(crank);
          legs.updateVerticesData('position',g.positions);
          legs.updateVerticesData('normal',g.normals);
        }
      },
      dispose:()=>root.dispose(false,true)
    };
  }
  const body=CreateBox(`${id}-body`,{width:1.8,height:.75,depth:4.3},scene);
  body.position.y=.6;body.material=paint;body.parent=root;
  // Windows dark, roof in body colour, as on a real car.
  const cabin=CreateBox(`${id}-cabin`,{width:1.6,height:.45,depth:2.2},scene);
  cabin.position.set(0,1.18,.25);cabin.material=mat(scene,`${id}-glass`,new Color3(.12,.14,.18));cabin.parent=root;
  const roof=CreateBox(`${id}-roof`,{width:1.62,height:.08,depth:2.0},scene);
  roof.position.set(0,1.44,.3);roof.material=paint;roof.parent=root;
  return {
    update(){root.setEnabled(visible());applyPose(root,pose())},
    dispose:()=>root.dispose(false,true)
  };
}

