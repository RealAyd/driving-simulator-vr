// Meshopt compression (EXT_meshopt_compression) for the larger models: a third to a quarter of the download, decoded
// by the app with the meshopt decoder it ships (src/assets/models.ts). In place; a file already compressed is skipped.
//
//   node compress-models.mjs public/assets/models/people/*.glb ...
//
// Needs @gltf-transform/core, /extensions, /functions 4.5.1 and meshoptimizer 0.22 (a scratch install).
import fs from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {meshopt,weld} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';

await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const file of process.argv.slice(2)){
  const doc=await io.read(file);
  if(doc.getRoot().listExtensionsUsed().some(e=>e.extensionName==='EXT_meshopt_compression')){console.log(`${file}: already compressed`);continue}
  const before=fs.statSync(file).size;
  await doc.transform(weld(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
  await io.write(file,doc);
  console.log(`${file}: ${before} -> ${fs.statSync(file).size} bytes`);
}
