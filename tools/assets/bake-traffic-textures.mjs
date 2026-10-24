// Bakes a vehicle model's textures into its vertex colours and drops the images (usage: node bake-traffic-textures.mjs
// in.glb [out.glb]). The new set's textured parts (glass, lights, badges) showed as plain white on an iPhone while
// the same models' parked copies, coloured by vertex, looked right; with no images there is nothing left to fail.
// Each vertex takes the texel under its texture coordinate (sRGB to linear) times the material's colour; the body
// paint material's grey detail is baked too and the app's paint multiplies it.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';
import sharp from 'sharp';

const [,,input,output=input]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(input);
const pixels=new Map();
const image=async t=>{
  if(!pixels.has(t)){const {data,info}=await sharp(Buffer.from(t.getImage())).removeAlpha().raw().toBuffer({resolveWithObject:true});pixels.set(t,{data,w:info.width,h:info.height})}
  return pixels.get(t);
};
const buffer=doc.getRoot().listBuffers()[0];
let baked=0;
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const mat=p.getMaterial(),tex=mat?.getBaseColorTexture(),uv=p.getAttribute('TEXCOORD_0');
  if(!mat||!tex||!uv)continue;
  const img=await image(tex),n=uv.getCount(),out=new Float32Array(n*4),e=[0,0];
  for(let i=0;i<n;i++){
    uv.getElement(i,e);
    const x=Math.min(img.w-1,Math.max(0,Math.floor(((e[0]%1)+1)%1*img.w))),y=Math.min(img.h-1,Math.max(0,Math.floor(((e[1]%1)+1)%1*img.h)));
    const k=(y*img.w+x)*3;
    for(let c=0;c<3;c++)out[i*4+c]=Math.pow(img.data[k+c]/255,2.2);
    out[i*4+3]=1;
  }
  p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(out).setBuffer(buffer));
  baked++;
}
for(const mat of doc.getRoot().listMaterials())
  mat.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
// The texture coordinates are no longer used.
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())p.setAttribute('TEXCOORD_0',null);
await doc.transform(prune());
await io.write(output,doc);
console.log(`${output}: ${baked} primitives coloured from their textures; ${doc.getRoot().listTextures().length} textures left`);
