// Full (traffic) model: textures deduplicated, at most 256 px, WebP. Parked model: every texture baked into the
// vertex colours (the paint left plain for the app), no textures. After tools/assets/export-aq3d-cars.py:
//
//   node build-aq3d-cars.mjs <export dir> public/assets/licensed/aq3d  (git-ignored: licensed, never committed)
//
// Needs @gltf-transform/core, /extensions, /functions 4.5.1 and sharp 0.33 (a scratch install).
import fs from 'node:fs';import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS,EXTTextureWebP} from '@gltf-transform/extensions';
import {dedup,prune,weld} from '@gltf-transform/functions';
import sharp from 'sharp';
const [,,inDir,outDir]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.mkdirSync(outDir,{recursive:true});
for(const f of fs.readdirSync(inDir).filter(f=>f.endsWith('.glb'))){
  const name=`aq-${f.replace('.glb','')}`;
  // Parked: sample each texture under each vertex.
  {
    const doc=await io.read(path.join(inDir,f));const root=doc.getRoot();
    const px=new Map();
    for(const t of root.listTextures()){const {data,info}=await sharp(Buffer.from(t.getImage())).ensureAlpha().raw().toBuffer({resolveWithObject:true});px.set(t,{data,info})}
    for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
      const m=p.getMaterial();if(!m||m.getName()==='Body')continue;
      const t=m.getBaseColorTexture(),f4=m.getBaseColorFactor(),uv=p.getAttribute('TEXCOORD_0'),n=p.getAttribute('POSITION').getCount();
      const C=new Float32Array(n*4),e=[0,0];
      for(let i=0;i<n;i++){
        let c=[1,1,1];
        if(t&&uv){uv.getElement(i,e);const {data,info}=px.get(t);const x=Math.min(info.width-1,Math.max(0,Math.floor((((e[0]%1)+1)%1)*info.width))),y=Math.min(info.height-1,Math.max(0,Math.floor((((e[1]%1)+1)%1)*info.height)));const k=(y*info.width+x)*4;
          // Transparent texels (a cut-out's surround) read as a dark grey.
          const a=data[k+3]/255;c=[0,1,2].map(j=>Math.pow(data[k+j]/255,2.2)*a+.02*(1-a))}
        for(let j=0;j<3;j++)C[i*4+j]=c[j]*f4[j];C[i*4+3]=1;
      }
      p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(C).setBuffer(root.listBuffers()[0]));
    }
    for(const m of root.listMaterials()){m.setBaseColorTexture(null).setEmissiveTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setAlphaMode('OPAQUE');if(m.getName()!=='Body')m.setBaseColorFactor([1,1,1,1])}
    for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives())p.setAttribute('TEXCOORD_0',null);
    await doc.transform(dedup(),prune());
    await io.write(path.join(outDir,`${name}-parked.glb`),doc);
  }
  // Full.
  {
    const doc=await io.read(path.join(inDir,f));const root=doc.getRoot();
    await doc.transform(dedup());
    doc.createExtension(EXTTextureWebP).setRequired(true);
    for(const t of root.listTextures()){
      const img=sharp(Buffer.from(t.getImage()));const meta=await img.metadata();
      const out=await img.resize({width:Math.min(256,meta.width),height:Math.min(256,meta.height),fit:'inside'}).webp({quality:82,alphaQuality:90}).toBuffer();
      t.setImage(new Uint8Array(out)).setMimeType('image/webp').setURI(t.getURI().replace(/\.\w+$/,'.webp'));
    }
    await doc.transform(prune());
    await io.write(path.join(outDir,`${name}.glb`),doc);
  }
  console.log(name,fs.statSync(path.join(outDir,`${name}.glb`)).size,fs.statSync(path.join(outDir,`${name}-parked.glb`)).size);
}
