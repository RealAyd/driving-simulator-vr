// Builds the second vehicle set (tried with ?cars=new) from the owner's CC-BY 4.0 Sketchfab models:
//   Peugeot 208 low poly (muha692), Generic passenger car pack (Comrade1280), Mercedes-Benz Sprinter 2006 (Max).
// Each car becomes a traffic model (body + wheels that turn: a WheelSpin clip, one turn per clip) and a parked model
// (far fewer triangles, texture colours baked into the vertices, no normals: the app rebuilds flat ones), standing
// on the origin, facing −Z, in metres. Body paint is plain where the app recolours it ('Body'); badges and
// lettering painted into the Peugeot's body are removed with that paint, and its badge texture is blanked.
//
//   node build-v2-vehicles.mjs <peugeot_208_low_poly.glb> <generic_passenger_car_pack.glb> <sprinter_mobile.glb> <out dir>
//
// Needs @gltf-transform/core, /extensions, /functions 4.5.1, meshoptimizer 0.22 and sharp 0.33 (a scratch install).
import fs from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,getBounds,join,prune,quantize,simplify,textureCompress,transformMesh,weld} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';

const [,,peugeotIn,packIn,sprinterIn,outDir]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;

// ---- Small 4×4 column-major matrix helpers (glTF order) ----
const ident=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
const translate=(x,y,z)=>{const m=ident();m[12]=x;m[13]=y;m[14]=z;return m};
const scale=s=>{const m=ident();m[0]=m[5]=m[10]=s;return m};
const yaw=a=>{const c=Math.cos(a),s=Math.sin(a),m=ident();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m};
const tris=doc=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);

/**
 * Keeps only the given nodes (and what is under them) as a new flat scene: each mesh copied, its world transform
 * baked into the vertices. Returns the copies, marked as wheels or body.
 */
function isolate(doc,keep,isWheel){
  const root=doc.getRoot(),scene=doc.createScene('car');
  const parts=[];
  for(const top of keep)top.traverse(n=>{
    const mesh=n.getMesh();if(!mesh)return;
    const copy=doc.createMesh();
    for(const p of mesh.listPrimitives())copy.addPrimitive(p.clone());
    transformMesh(copy,n.getWorldMatrix());
    const node=doc.createNode().setMesh(copy);
    scene.addChild(node);
    parts.push({node,mesh:copy,wheel:isWheel(top,n)});
  });
  for(const s of root.listScenes())if(s!==scene)s.dispose();
  root.setDefaultScene(scene);
  for(const a of root.listAnimations())a.dispose();
  return parts;
}

/** Turns, scales and moves every part so the car faces −Z, is `length` metres long, centred, standing at Y=0. */
function normalise(doc,parts,turn,length){
  const b0=getBounds(doc.getRoot().getDefaultScene());
  const c0=[(b0.min[0]+b0.max[0])/2,(b0.min[1]+b0.max[1])/2,(b0.min[2]+b0.max[2])/2];
  let m=mul(yaw(turn),translate(-c0[0],-c0[1],-c0[2]));
  for(const p of parts)transformMesh(p.mesh,m);
  const b1=getBounds(doc.getRoot().getDefaultScene());
  const s=length/(b1.max[2]-b1.min[2]);
  m=mul(translate(0,-b1.min[1]*s,0),scale(s));
  for(const p of parts)transformMesh(p.mesh,m);
}

/** Wheels on their own pivots (at each wheel's centre) with a clip turning them once forwards; returns the loop distance. */
function spinWheels(doc,parts){
  const wheels=parts.filter(p=>p.wheel);
  if(wheels.length===0)return undefined;
  const buffer=doc.getRoot().listBuffers()[0]??doc.createBuffer();
  let radius=0;
  const anim=doc.createAnimation('WheelSpin');
  const times=doc.createAccessor().setType('SCALAR').setArray(new Float32Array([0,.25,.5,.75,1])).setBuffer(buffer);
  // Forward is −Z: the top of a wheel moves forwards, a negative turn about +X.
  const q=[];for(let k=0;k<5;k++){const a=-k*Math.PI/2;q.push(Math.sin(a/2),0,0,Math.cos(a/2))}
  const quats=doc.createAccessor().setType('VEC4').setArray(new Float32Array(q)).setBuffer(buffer);
  wheels.forEach((w,i)=>{
    const b=getBounds(w.node),c=[(b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,(b.min[2]+b.max[2])/2];
    radius=Math.max(radius,(b.max[1]-b.min[1])/2);
    transformMesh(w.mesh,translate(-c[0],-c[1],-c[2]));
    w.node.setTranslation(c).setName(`wheel-${i}`);
    const sampler=doc.createAnimationSampler().setInput(times).setOutput(quats).setInterpolation('LINEAR');
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(w.node).setTargetPath('rotation').setSampler(sampler));
  });
  return 2*Math.PI*radius;
}

/** Texture colours sampled at each vertex into COLOR_0 (parked cars are drawn untextured), textures dropped. */
async function bakeColours(doc,paint){
  const pixels=new Map();
  const image=async t=>{
    if(!pixels.has(t)){const {data,info}=await sharp(Buffer.from(t.getImage())).removeAlpha().raw().toBuffer({resolveWithObject:true});pixels.set(t,{data,w:info.width,h:info.height})}
    return pixels.get(t);
  };
  const buffer=doc.getRoot().listBuffers()[0];
  for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
    const mat=p.getMaterial(),tex=mat?.getBaseColorTexture(),uv=p.getAttribute('TEXCOORD_0');
    if(!mat||mat.getName()===paint||!tex||!uv)continue;
    const img=await image(tex),f=mat.getBaseColorFactor(),n=uv.getCount(),out=new Float32Array(n*4),e=[0,0];
    for(let i=0;i<n;i++){
      uv.getElement(i,e);
      const x=Math.min(img.w-1,Math.max(0,Math.floor(((e[0]%1)+1)%1*img.w))),y=Math.min(img.h-1,Math.max(0,Math.floor(((e[1]%1)+1)%1*img.h)));
      const k=(y*img.w+x)*3;
      // sRGB texels to linear, as glTF vertex colours are linear.
      for(let c=0;c<3;c++)out[i*4+c]=Math.pow(img.data[k+c]/255,2.2)*f[c];
      out[i*4+3]=1;
    }
    p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(out).setBuffer(buffer));
  }
  for(const mat of doc.getRoot().listMaterials()){
    const textured=!!mat.getBaseColorTexture();
    mat.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
    // Glass is drawn solid when parked: dark, as tinted glass looks from outside.
    if(/glass|window/i.test(mat.getName())||mat.getAlphaMode()==='BLEND')mat.setBaseColorFactor([.05,.06,.075,1]).setAlphaMode('OPAQUE');
    else if(textured&&mat.getName()!==paint)mat.setBaseColorFactor([1,1,1,1]);
  }
}

/** One finished model: merged by material (wheels kept apart), simplified to about `target` triangles, written. */
async function finish(doc,file,{target,parked,paint}){
  const before=tris(doc);
  if(parked){
    for(const a of doc.getRoot().listAnimations())a.dispose();
    await bakeColours(doc,paint);
  }
  for(const m of doc.getRoot().listMaterials())m.setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null);
  // Parked: colours are in the vertices, and normals are rebuilt flat by the app, so corners that differ only in
  // those can be shared and the simplifier can merge them (a flat-shaded model has every face apart otherwise).
  if(parked)for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())for(const a of ['NORMAL','TEXCOORD_0','TEXCOORD_1','TANGENT'])p.setAttribute(a,null);
  await doc.transform(dedup(),join({keepNamed:true}),weld());
  const ratio=Math.min(1,target/tris(doc));
  if(ratio<1)await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio,error:parked?.05:.01}));
  // (256 px JPEG: a car on a phone screen is a few hundred pixels at most; the download stays small.)
  await doc.transform(textureCompress({encoder:sharp,targetFormat:'jpeg',quality:82,resize:[256,256]}));
  await doc.transform(prune(),quantize());
  await io.write(file,doc);
  const b=getBounds(doc.getRoot().getDefaultScene());
  const size={length:+(b.max[2]-b.min[2]).toFixed(2),width:+(b.max[0]-b.min[0]).toFixed(2),height:+(b.max[1]-b.min[1]).toFixed(2)};
  console.log(`${file.split('/').pop()}: ${fs.statSync(file).size} bytes, ${Math.round(before)} -> ${Math.round(tris(doc))} triangles`,JSON.stringify(size));
  return size;
}

const report={};
async function build(name,load,{length,turn,paint,traffic=true,parkedTarget=1600}){
  for(const parked of traffic?[false,true]:[true]){
    const {doc,keep,isWheel,prepare}=await load();
    await prepare?.(doc);
    const parts=isolate(doc,keep(doc),isWheel);
    normalise(doc,parts,turn,length);
    const loop=parked?undefined:spinWheels(doc,parts);
    const size=await finish(doc,`${outDir}/${name}${parked?'-parked':''}.glb`,{target:parked?parkedTarget:10000,parked,paint});
    report[name]={...(report[name]??{}),...size,...(loop?{wheelLoopMetres:+loop.toFixed(3)}:{})};
  }
}

// ---- Peugeot 208: plain body (recoloured by the app; its lettering goes with the paint), badge blanked ----
await build('v2-peugeot-208',async()=>{
  const doc=await io.read(peugeotIn);
  return {doc,keep:d=>d.getRoot().getDefaultScene().listChildren(),isWheel:()=>false,prepare:async d=>{
    for(const m of d.getRoot().listMaterials())if(['1.001','2.001','3.001'].includes(m.getName()))m.setName('Body').setBaseColorTexture(null).setBaseColorFactor([1,1,1,1]);
    // The lion badge (top left quarter of the trim texture): blanked to the plain black round it.
    const trim=d.getRoot().listMaterials().find(m=>m.getName()==='5.001')?.getBaseColorTexture();
    if(trim){
      const meta=await sharp(Buffer.from(trim.getImage())).metadata();
      const box=Buffer.from(`<svg width="${meta.width}" height="${meta.height}"><rect x="0" y="0" width="${meta.width/2}" height="${meta.height/2}" fill="#000"/></svg>`);
      trim.setImage(new Uint8Array(await sharp(Buffer.from(trim.getImage())).composite([{input:box}]).png().toBuffer())).setMimeType('image/png');
    }
    // Its windows are painted pale sky blue (toy-like from behind): tinted dark, as glass looks from outside.
    const lights=d.getRoot().listMaterials().find(m=>m.getName()==='4.001')?.getBaseColorTexture();
    if(lights){
      const {data,info}=await sharp(Buffer.from(lights.getImage())).removeAlpha().raw().toBuffer({resolveWithObject:true});
      for(let i=0;i<data.length;i+=3){
        const [r,g,b]=[data[i],data[i+1],data[i+2]];
        if(b>150&&b-r>40&&g>r)data.set([30,38,48],i);
      }
      lights.setImage(new Uint8Array(await sharp(data,{raw:{width:info.width,height:info.height,channels:3}}).png().toBuffer())).setMimeType('image/png');
    }
  }};
},{length:4.06,turn:Math.PI,paint:'Body',parkedTarget:4000});

// ---- The car pack: each body with its four wheels, turned to face −Z (they stand round a turntable) ----
const PACK=['Compact Body','Coupe Body','Hatchback Body','minivan body','Offroad Body','Pickup Body','Sedan Body','SUV Body','Wagon Body'];
// (Not its sports car: a supercar is out of place on the streets round a test centre.)
const REAL_LENGTH={'Compact Body':3.7,'Coupe Body':4.4,'Hatchback Body':4.1,'minivan body':4.8,'Offroad Body':4.5,'Pickup Body':5.3,'Sedan Body':4.7,'Sport body':4.4,'SUV Body':4.7,'Wagon Body':4.7};
for(const body of PACK){
  // Its wheels: the four nearest wheel objects; its heading from them (the axles), its front towards the turntable.
  const probe=await io.read(packIn);
  const nodes=probe.getRoot().listNodes();
  const bodyNode=nodes.find(n=>n.getName()===body);
  const bb=getBounds(bodyNode),bc=[(bb.min[0]+bb.max[0])/2,(bb.min[2]+bb.max[2])/2];
  const wheelNodes=nodes.filter(n=>/^Wheel/.test(n.getName())&&n.getParentNode()===bodyNode.getParentNode()).map(n=>{const b=getBounds(n);return {n,c:[(b.min[0]+b.max[0])/2,(b.min[2]+b.max[2])/2]}}).sort((a,b)=>Math.hypot(a.c[0]-bc[0],a.c[1]-bc[1])-Math.hypot(b.c[0]-bc[0],b.c[1]-bc[1])).slice(0,4);
  // The long axis of the four wheel centres.
  const cx=wheelNodes.reduce((s,w)=>s+w.c[0],0)/4,cz=wheelNodes.reduce((s,w)=>s+w.c[1],0)/4;
  let sxx=0,szz=0,sxz=0;for(const w of wheelNodes){const dx=w.c[0]-cx,dz=w.c[1]-cz;sxx+=dx*dx;szz+=dz*dz;sxz+=dx*dz}
  const ang=.5*Math.atan2(2*sxz,sxx-szz);let ax=[Math.cos(ang),Math.sin(ang)];
  // (They face the turntable's centre.)
  if(ax[0]*bc[0]+ax[1]*bc[1]>0)ax=[-ax[0],-ax[1]];
  const flip=(process.env.FLIP??'').split(',').includes(body);
  // Turn so the outward direction (the front) points along −Z.
  const turn=Math.atan2(ax[0],-ax[1])+(flip?Math.PI:0);
  const ids=new Set([bodyNode,...wheelNodes.map(w=>w.n)].map(n=>nodes.indexOf(n)));
  const wheelIds=new Set(wheelNodes.map(w=>nodes.indexOf(w.n)));
  await build(`v2-${body.toLowerCase().replace(/ body$/,'').replace(/\s+/g,'-')}`,async()=>{
    const doc=await io.read(packIn);const all=doc.getRoot().listNodes();
    return {doc,keep:()=>[...ids].map(i=>all[i]),isWheel:top=>wheelIds.has(all.indexOf(top)),prepare:async d=>{
      // The body texture in grey, its paint brought up to near white: the app paints it (the pack's own cyans and
      // yellows would clash with the colours the exercises pick road users out by).
      const mat=d.getRoot().listMaterials().find(m=>/^Body(_\d+)?$/.test(m.getName())&&[...ids].some(i=>{let used=false;all[i].traverse(n=>{for(const p of n.getMesh()?.listPrimitives()??[])if(p.getMaterial()===m)used=true});return used}));
      const tex=mat?.getBaseColorTexture();
      if(mat&&tex){
        const grey=sharp(Buffer.from(tex.getImage())).greyscale();
        const {data}=await grey.clone().raw().toBuffer({resolveWithObject:true});
        const sorted=[...data].sort((a,b)=>a-b),p85=sorted[Math.floor(sorted.length*.85)]||1;
        const out=await sharp(Buffer.from(tex.getImage())).greyscale().linear(Math.min(4,240/p85),0).png().toBuffer();
        d.getRoot().listTextures().forEach(t=>{if(t===tex)t.setImage(new Uint8Array(out)).setMimeType('image/png')});
        mat.setName('Body').setBaseColorFactor([1,1,1,1]);
      }
    }};
  },{length:REAL_LENGTH[body],turn,paint:'Body'});
}

// ---- Sprinter: a parked van only (traffic is drawn at one car length); doors shut (its clip removed) ----
await build('v2-sprinter-van',async()=>{
  const doc=await io.read(sprinterIn);
  return {doc,keep:d=>d.getRoot().getDefaultScene().listChildren(),isWheel:()=>false};
},{length:5.93,turn:Math.PI,paint:'(none)',traffic:false});

fs.writeFileSync(`${outDir}/v2-report.json`,JSON.stringify(report,null,1));
