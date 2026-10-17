// Needs @gltf-transform/core, /extensions, /functions 4.5.1 and meshoptimizer 0.22.0 (scratch install).
// Simplifies a GLB's meshes to about `ratio` of their triangles (meshoptimizer), keeping materials.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {simplify,weld,dequantize} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const [,,input,output,ratio,error]=process.argv;
await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(input);
await doc.transform(dequantize());
// Flat-shaded models split every vertex by face normal; drop normals so faces share vertices and can be merged.
for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives())prim.setAttribute('NORMAL',null);
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:Number(ratio),error:Number(error??.01),lockBorder:false}));
await io.write(output,doc);
