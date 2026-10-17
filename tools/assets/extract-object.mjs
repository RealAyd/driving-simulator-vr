// Keeps one named object from a glTF file, stood on the origin (centred in X/Z, base at Y=0).
// Needs @gltf-transform/core and @gltf-transform/functions 4.5.1 (npx or a scratch install).
import {NodeIO} from '@gltf-transform/core';
import {prune,getBounds} from '@gltf-transform/functions';
const [,,input,name,output]=process.argv;
const io=new NodeIO();
const doc=await io.read(input);
const scene=doc.getRoot().getDefaultScene();
let keep=null;
scene.traverse(n=>{if(n.getName()===name)keep=n});
if(!keep)throw new Error(`no object named ${name}`);
for(const child of scene.listChildren())scene.removeChild(child);
keep.getParentNode()?.removeChild(keep);
scene.addChild(keep);
// Stand it on the origin: centred in X/Z, base at Y=0.
keep.setTranslation([0,0,0]);
const b=getBounds(keep);
keep.setTranslation([-(b.min[0]+b.max[0])/2,-b.min[1],-(b.min[2]+b.max[2])/2]);
await doc.transform(prune());
for(const m of doc.getRoot().listMaterials())console.log('material',m.getName(),m.getBaseColorFactor().map(v=>v.toFixed(2)).join(','),'emissive',m.getEmissiveFactor().map(v=>v.toFixed(2)).join(','),'tex',!!m.getBaseColorTexture());
await io.write(output,doc);
const b2=getBounds(doc.getRoot().getDefaultScene());
console.log('bounds',b2.min.map(v=>v.toFixed(2)),b2.max.map(v=>v.toFixed(2)));
