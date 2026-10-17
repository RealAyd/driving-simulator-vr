// Prepares a glTF for the simulator's StandardMaterial path (src/assets/models.ts):
// drops the normal, occlusion and metal/roughness maps (not used at run time) and
// drops vertex colours that are uniformly white (no visual effect), and
// re-encodes base colour and emissive maps as JPEG of at most MAX px, unless the
// material uses alpha. Geometry and node transforms are untouched.
// Optional SMALL_PATTERN (regex on texture names) and SMALL px: e.g. fake window
// interiors, only ever seen through glass, can be smaller.
// Needs @gltf-transform/core, /extensions, /functions 4.5.1 and sharp (scratch install).
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';
import sharp from 'sharp';
const [,,input,output,maxArg,smallPattern,smallArg]=process.argv;
const MAX=Number(maxArg??512);
const small=smallPattern?new RegExp(smallPattern,'i'):null;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(input);
const keepAlpha=new Set();
for(const m of doc.getRoot().listMaterials()){
  m.setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null);
  if(m.getAlphaMode()!=='OPAQUE'&&m.getBaseColorTexture())keepAlpha.add(m.getBaseColorTexture());
}
for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const colour=prim.getAttribute('COLOR_0');
  if(!colour)continue;
  const max=colour.getComponentType()===5121?255:colour.getComponentType()===5123?65535:1;
  if(colour.getArray().every(v=>v===max))prim.setAttribute('COLOR_0',null);
}
await doc.transform(prune());
for(const t of doc.getRoot().listTextures()){
  const size=small?.test(t.getName())?Number(smallArg??256):MAX;
  const img=sharp(Buffer.from(t.getImage())).resize(size,size,{fit:'inside',withoutEnlargement:true,kernel:'lanczos3'});
  if(keepAlpha.has(t)){t.setImage(new Uint8Array(await img.png().toBuffer()));continue}
  t.setImage(new Uint8Array(await img.flatten().jpeg({quality:82,mozjpeg:true}).toBuffer())).setMimeType('image/jpeg');
  if(t.getURI())t.setURI(t.getURI().replace(/\.png$/i,'.jpg'));
}
await io.write(output,doc);
