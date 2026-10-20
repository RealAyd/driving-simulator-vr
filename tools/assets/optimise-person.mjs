// Animated people (owner's Tripo characters, commercial licence): one GLB in, one phone-ready GLB out.
//   node optimise-person.mjs <in.glb> <out.glb> <ratio> <clips,comma,separated> <texture px>
// Keeps only the named clips; flips the texture coordinates vertically (the supplied GLBs carry FBX-style
// V coordinates, which show as a patchwork in glTF viewers); drops the flat normals so vertices can merge,
// welds, simplifies (meshoptimizer), rebuilds smooth normals, keeps only the colour texture (the simulator draws
// people with a plain diffuse material, src/assets/models.ts), resizes it to JPEG, quantises.
// Run from a folder with @gltf-transform/core, functions, extensions 4.5.1, meshoptimizer 0.22.0, sharp 0.33.5.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,normals,prune,dedup,quantize,textureCompress,resample} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
const [,,src,out,ratio,keep,tex]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(src);
const clips=keep.split(',');
for(const a of doc.getRoot().listAnimations())if(!clips.includes(a.getName()))a.dispose();
for(const m of doc.getRoot().listMaterials()){
  m.setNormalTexture(null);m.setOcclusionTexture(null);m.setMetallicRoughnessTexture(null);m.setEmissiveTexture(null);
}
const flipped=new Set();
for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){
  const n=p.getAttribute('NORMAL');
  if(n){p.setAttribute('NORMAL',null);n.dispose()}
  const uv=p.getAttribute('TEXCOORD_0');
  if(uv&&!flipped.has(uv)){
    flipped.add(uv);
    const e=[0,0];
    for(let i=0;i<uv.getCount();i++){uv.getElement(i,e);e[1]=1-e[1];uv.setElement(i,e)}
  }
}
await doc.transform(
  weld(),
  simplify({simplifier:MeshoptSimplifier,ratio:+ratio,error:0.01,lockBorder:false}),
  normals({overwrite:true}),
  resample(),
  prune(),dedup(),
  textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[+tex,+tex],quality:80}),
  quantize()
);
await io.write(out,doc);
