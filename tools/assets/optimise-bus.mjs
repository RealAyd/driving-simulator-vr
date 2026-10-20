// Red buses (Batch A lightweight legacy GLBs, project owner's): one GLB in, one ready to ship out.
//   node optimise-bus.mjs <in.glb> <out.glb>
// Drops the blocky boarding figure (entry-* nodes) and every clip but wheels-rolling (the simulator has no
// boarding yet; the doors stay shut); then dedup, prune, quantise.
// Run from a folder with @gltf-transform/core, functions, extensions 4.5.1.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,quantize} from '@gltf-transform/functions';
const [,,src,out]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(src);
const root=doc.getRoot();
for(const a of root.listAnimations())if(a.getName()!=='wheels-rolling')a.dispose();
for(const n of root.listNodes())if(n.getName().startsWith('entry-'))n.dispose();
await doc.transform(prune(),dedup(),quantize());
await io.write(out,doc);
