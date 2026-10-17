import {Color3,CreateBox,CreateCylinder,CreatePlane,CreateRibbon,CreateTorus,DynamicTexture,Mesh,StandardMaterial,TransformNode,Vector3,type Scene} from '../engine/babylon';
import type {Vec3} from '../contracts';
import type {SeatConfig} from './seat';

/**
 * Right-hand-drive interior and body, parented to the vehicle node so its
 * transform comes from the vehicle pose only. Vehicle-local metres: +X right,
 * +Y up from the road, -Z forward. The pieces share one set of dimensions so
 * pillars, roof, sills and dashboard meet instead of floating.
 */
export const CABIN={
  halfWidth:.88,
  /** Window line: top of the doors and dashboard. */
  sill:.96,
  roof:1.47,
  /** Windscreen base (dashboard front edge) and top (roof header). */
  screenBase:{y:.96,z:-1.15},
  screenTop:{y:1.47,z:-.58},
  /** Where the side windows end at the back (C-pillar). */
  rear:1.15,
  bPillarZ:.45
} as const;

/** Steering-wheel turns per front-wheel angle, for display only. */
export const STEERING_RATIO=4;

export interface Cockpit{
  root:TransformNode;
  wheel:TransformNode;
  /** Speedometer and indicator tell-tales in the instrument binnacle (redrawn only when they change). */
  setInstruments(mph:number,indicator:'off'|'left'|'right',lit:boolean):void;
  dispose():void;
}

export function buildCockpit(scene:Scene,vehicleNode:TransformNode,seat:SeatConfig):Cockpit{
  const root=new TransformNode('cockpit',scene);
  root.parent=vehicleNode;
  const mat=(name:string,c:Color3,specular=.04)=>{
    const m=new StandardMaterial(name,scene);
    m.diffuseColor=c;
    m.specularColor=new Color3(specular,specular,specular);
    return m;
  };
  const trim=mat('cockpit-trim',new Color3(.11,.12,.14));
  const dashMat=mat('dashboard',new Color3(.17,.18,.2),.08);
  const fascia=mat('dashboard-fascia',new Color3(.24,.25,.27),.06);
  const paint=mat('car-paint',new Color3(.78,.12,.12),.3);
  const frame=mat('body-frame',new Color3(.2,.21,.23));
  const lining=mat('roof-lining',new Color3(.55,.55,.53));
  const glossBlack=mat('gloss-black',new Color3(.04,.04,.05),.35);
  // Static pieces are merged per material at the end (a handful of draw calls, not dozens).
  const statics:Mesh[]=[];
  const keep=(mesh:Mesh,m:StandardMaterial)=>{mesh.material=m;mesh.parent=root;statics.push(mesh);return mesh};
  const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial)=>{
    const mesh=CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);
    return keep(mesh,m);
  };
  const eye=seat.eye;
  /**
   * A pillar or rail between two points as a slim tapered strip turned to face
   * the driver's eye, with a little depth so it reads as solid: what the
   * driver sees is its real width, not a box seen corner-on.
   */
  const strut=(name:string,a:Vec3,b:Vec3,w0:number,w1:number,depth:number,m:StandardMaterial):Mesh=>{
    const axis=new Vector3(b.x-a.x,b.y-a.y,b.z-a.z).normalize();
    const mid=new Vector3((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
    const toEye=new Vector3(eye.x,eye.y,eye.z).subtract(mid).normalize();
    const side=Vector3.Cross(axis,toEye).normalize();
    const back=toEye.scale(-depth);
    const A=new Vector3(a.x,a.y,a.z),B=new Vector3(b.x,b.y,b.z);
    const edge=(p:Vector3,w:number,s:number,d:Vector3)=>p.add(side.scale(s*w/2)).add(d);
    const zero=Vector3.Zero();
    // Front face, two sides, closed tube.
    const ring=(p:Vector3,w:number)=>[edge(p,w,-1,back),edge(p,w,-1,zero),edge(p,w,1,zero),edge(p,w,1,back),edge(p,w,-1,back)];
    const mesh=CreateRibbon(name,{pathArray:[ring(A,w0),ring(B,w1)],sideOrientation:2},scene);
    return keep(mesh,m);
  };
  const C=CABIN,W=C.halfWidth;

  // Dashboard: a moulded top from the windscreen base, a rounded lip, then the fascia facing the driver.
  const dashProfile:Array<[number,number]>=[[C.screenBase.z,C.sill-.005],[-1.0,.968],[-.86,.97],[-.76,.958],[-.71,.935],[-.69,.9],[-.685,.82],[-.7,.6]];
  const across=(x:number)=>dashProfile.map(([z,y])=>new Vector3(x,y,z));
  keep(CreateRibbon('dashboard',{pathArray:[across(-W+.02),across(W-.02)],sideOrientation:2},scene),dashMat);
  // Centre stack (screen and vents) and side vents on the fascia.
  const onFascia=(name:string,w:number,h:number,x:number,y:number,m:StandardMaterial)=>{
    const p=CreatePlane(name,{width:w,height:h,sideOrientation:2},scene);
    p.position.set(x,y,-.684);
    return keep(p,m);
  };
  onFascia('centre-screen',.22,.12,-.02,.83,glossBlack);
  onFascia('centre-vents',.2,.035,-.02,.745,trim);
  onFascia('vent-left',.14,.04,-.66,.86,trim);
  onFascia('vent-right',.1,.04,.72,.86,trim);
  onFascia('fascia-band',2*W-.1,.02,0,.905,fascia);

  // Instrument binnacle in front of the driver: dial behind the upper half of the wheel, under a small hood.
  const dialTexture=new DynamicTexture('instrument-dial',{width:512,height:176},scene,true);
  const dialMat=new StandardMaterial('instrument-dial',scene);
  dialMat.diffuseTexture=dialTexture;dialMat.emissiveTexture=dialTexture;dialMat.disableLighting=true;
  dialMat.backFaceCulling=false;
  const dial=CreatePlane('instrument-dial',{width:.27,height:.093},scene);
  dial.parent=root;dial.material=dialMat;
  // Seen through the upper half of the wheel, above the hub.
  const dialY=.94,dialZ=-.67;
  dial.position.set(eye.x,dialY,dialZ);
  // Turned and tilted towards the driver's eye (as the mirror glass is).
  dial.rotation.y=Math.atan2(0,eye.z-dialZ);
  dial.rotation.x=Math.atan2(-(eye.y-dialY),eye.z-dialZ);
  // A small visor over the dial.
  {
    const visor=box('instrument-visor',.31,.014,.09,eye.x,.995,-.69,trim);
    // The binnacle body under the dial, on top of the dashboard.
    box('instrument-binnacle',.31,.06,.08,eye.x,.92,-.71,dashMat);
    visor.rotation.x=-.25;
  }

  // Bonnet beyond the windscreen: falls gently to the front of the car.
  const bonnet=box('bonnet',1.66,.06,1.25,0,C.sill-.15,C.screenBase.z-.62,paint);
  bonnet.rotation.x=-.08;

  // Body frame. Slim A-pillars run from the dashboard corners to the roof header.
  for(const side of [-1,1]){
    const x=side*(W-.04);
    strut(`a-pillar-${side}`,{x,y:C.screenBase.y-.01,z:C.screenBase.z+.02},{x:side*(W-.07),y:C.screenTop.y,z:C.screenTop.z},.075,.06,.05,frame);
    // Roof side rail from the A-pillar top to the back.
    box(`roof-rail-${side}`,.06,.05,C.rear-C.screenTop.z,side*(W-.07),C.roof-.01,(C.screenTop.z+C.rear)/2,frame);
    // Door: panel up to the window line, with a rounded-looking top rail and an armrest.
    box(`door-${side}`,.06,C.sill-.3,C.rear-C.screenBase.z,side*W,(C.sill+.3)/2,(C.screenBase.z+C.rear)/2,trim);
    box(`window-sill-${side}`,.07,.03,C.rear-C.screenBase.z,side*(W-.03),C.sill-.005,(C.screenBase.z+C.rear)/2,frame);
    box(`armrest-${side}`,.07,.04,.45,side*(W-.06),.72,.05,fascia);
    // B- and C-pillars as slim struts facing the driver (a slab here filled the shoulder views).
    strut(`b-pillar-${side}`,{x:side*(W-.04),y:C.sill,z:C.bPillarZ},{x:side*(W-.06),y:C.roof,z:C.bPillarZ},.09,.075,.05,frame);
    strut(`c-pillar-${side}`,{x:side*(W-.05),y:C.sill,z:C.rear-.05},{x:side*(W-.08),y:C.roof,z:C.rear-.2},.16,.11,.05,frame);
    // Mirror sail: the black triangle in the front corner of the side window that carries the door mirror.
    const sail=CreateRibbon(`mirror-sail-${side}`,{pathArray:[
      [new Vector3(side*(W-.01),C.sill,C.screenBase.z+.04),new Vector3(side*(W-.01),C.sill,C.screenBase.z+.24)],
      [new Vector3(side*(W-.02),C.sill+.13,C.screenBase.z+.12),new Vector3(side*(W-.02),C.sill+.13,C.screenBase.z+.13)]
    ],sideOrientation:2},scene);
    keep(sail,glossBlack);
    // Sun visor folded up against the roof.
    box(`sun-visor-${side}`,.36,.018,.17,side*.42,C.roof-.025,C.screenTop.z+.13,lining);
  }
  // Roof header above the windscreen: a slim rounded band, not a slab.
  strut('windscreen-header',{x:-(W-.06),y:C.roof-.005,z:C.screenTop.z+.01},{x:W-.06,y:C.roof-.005,z:C.screenTop.z+.01},.06,.06,.06,frame);
  box('roof-lining',2*W-.1,.02,C.rear-C.screenTop.z,0,C.roof+.015,(C.screenTop.z+C.rear)/2,lining);
  box('floor',2*W,.04,2.4,0,.3,0,trim);
  box('rear-panel',2*W,C.sill-.3,.06,0,(C.sill+.3)/2,C.rear+.05,trim);
  box('centre-console',.24,.18,.7,0,.5,-.3,trim);

  // Steering column tilted towards the driver; `wheel` spins about the column (local Y).
  const column=new TransformNode('steering-column',scene);
  column.position.set(eye.x,.92,-.52);
  column.rotation.x=Math.PI/2-.45;
  column.parent=root;
  const wheel=new TransformNode('steering-wheel',scene);
  wheel.parent=column;
  const rim=CreateTorus('steering-rim',{diameter:.37,thickness:.03,tessellation:32},scene);
  rim.material=trim;
  rim.parent=wheel;
  // Local −Z is the top of the wheel as the driver sees it, +Z the bottom.
  const part=(name:string,w:number,h:number,d:number,z:number,material:StandardMaterial)=>{
    const mesh=CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.z=z;
    mesh.material=material;
    mesh.parent=wheel;
  };
  part('steering-spoke-cross',.31,.018,.03,.01,trim);
  part('steering-spoke-lower',.03,.018,.15,.09,trim);
  part('steering-hub',.075,.035,.065,.01,trim);
  part('steering-top-mark',.03,.035,.022,-.18,mat('steering-mark',new Color3(.85,.55,.1)));

  // Exterior body for other cameras. Seen from inside, its faces are back
  // faces and are culled, so it does not block the driver.
  const body=CreateBox('car-body',{width:1.8,height:1.0,depth:4.3},scene);
  body.position.set(0,.75,0);
  body.material=paint;
  body.parent=root;

  // One mesh per material for everything that never moves relative to the car.
  const byMaterial=new Map<StandardMaterial,Mesh[]>();
  for(const m of statics){
    m.computeWorldMatrix(true);
    const material=m.material as StandardMaterial;
    byMaterial.set(material,[...(byMaterial.get(material)??[]),m]);
  }
  for(const [material,meshes] of byMaterial){
    if(meshes.length<2)continue;
    const merged=Mesh.MergeMeshes(meshes,true,true,undefined,false,false);
    if(merged){merged.name=`cockpit-${material.name}`;merged.parent=root;merged.material=material}
  }

  let drawn='';
  const setInstruments=(mph:number,indicator:'off'|'left'|'right',lit:boolean)=>{
    const key=`${mph}|${indicator}|${lit}`;
    if(key===drawn)return;
    drawn=key;
    const ctx=dialTexture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle='#07090c';ctx.fillRect(0,0,512,176);
    // Speedometer arc 0–70 mph.
    const cx=256,cy=150,r=120,a0=Math.PI*1.1,a1=Math.PI*1.9;
    ctx.strokeStyle='#4b5563';ctx.lineWidth=6;ctx.beginPath();ctx.arc(cx,cy,r,a0,a1);ctx.stroke();
    ctx.strokeStyle='#cbd5e1';ctx.lineWidth=3;
    for(let v=0;v<=70;v+=10){const a=a0+(a1-a0)*v/70;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(r-14),cy+Math.sin(a)*(r-14));ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.stroke()}
    const a=a0+(a1-a0)*Math.min(70,mph)/70;
    ctx.strokeStyle='#f97316';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*(r-6),cy+Math.sin(a)*(r-6));ctx.stroke();
    ctx.fillStyle='#f8fafc';ctx.font='bold 46px sans-serif';ctx.textAlign='center';ctx.fillText(String(mph),cx,cy-28);
    ctx.font='20px sans-serif';ctx.fillStyle='#94a3b8';ctx.fillText('mph',cx,cy-4);
    // Indicator tell-tales.
    for(const [side,x] of [['left',60],['right',452]] as const){
      ctx.fillStyle=indicator===side&&lit?'#22c55e':'#14301f';
      ctx.beginPath();
      const d=side==='left'?-1:1;
      ctx.moveTo(x+d*34,60);ctx.lineTo(x-d*6,30);ctx.lineTo(x-d*6,90);ctx.closePath();ctx.fill();
    }
    dialTexture.update(true);
  };
  setInstruments(0,'off',false);

  return {root,wheel,setInstruments,dispose:()=>root.dispose(false,true)};
}
