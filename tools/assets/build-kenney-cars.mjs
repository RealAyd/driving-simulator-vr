// Builds the Kenney Car Kit test set (CC0, www.kenney.nl; tried with ?cars=kenney): each everyday car becomes one
// static model, facing -Z, standing on the origin, stretched to real UK proportions (the kit's cars are short and
// wide toys), with its palette texture baked into the vertex colours (every face is one flat colour, so nothing is
// lost, and there is no texture to fail on a phone). The same file serves traffic and parked cars.
//
//   node build-kenney-cars.mjs "<Car Kit>/Models/GLB format" <out dir>
//
// Needs @gltf-transform/core, /extensions, /functions 4.5.1 and sharp 0.33 (a scratch install).
import fs from 'node:fs';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds,prune} from '@gltf-transform/functions';
import sharp from 'sharp';

const [,,inDir,outDir]=process.argv;
// Kit model -> [app name, length, width, height] in metres (everyday UK sizes).
const CARS={sedan:['saloon',4.5,1.82,1.45],'hatchback-sports':['hatchback',4.05,1.78,1.42],suv:['suv',4.55,1.86,1.68],
  'suv-luxury':['estate',4.75,1.85,1.55],van:['people-carrier',4.75,1.88,1.75],taxi:['taxi',4.6,1.85,1.6],delivery:['van',5.3,2.0,2.3]};
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.mkdirSync(outDir,{recursive:true});

for(const [kit,[name,length,width,height]] of Object.entries(CARS)){
  const doc=await io.read(path.join(inDir,`${kit}.glb`));
  const root=doc.getRoot(),scene=root.listScenes()[0];
  const b=getBounds(scene);
  const size=[0,1,2].map(k=>b.max[k]-b.min[k]);
  // Stretch to the real size (x across, y up, z along), turn to face -Z (the kit faces +Z), stand on y = 0.
  const s=[width/size[0],height/size[1],length/size[2]],cx=(b.min[0]+b.max[0])/2,cz=(b.min[2]+b.max[2])/2;
  const texture=root.listTextures()[0];
  const {data,info}=await sharp(Buffer.from(texture.getImage())).removeAlpha().raw().toBuffer({resolveWithObject:true});
  for(const node of root.listNodes()){
    const mesh=node.getMesh();if(!mesh)continue;
    const w=node.getWorldMatrix();
    for(const p of mesh.listPrimitives()){
      const pos=p.getAttribute('POSITION'),nor=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0');
      const n=pos.getCount(),P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*4),e=[0,0,0],t=[0,0];
      for(let i=0;i<n;i++){
        pos.getElement(i,e);
        const x=w[0]*e[0]+w[4]*e[1]+w[8]*e[2]+w[12],y=w[1]*e[0]+w[5]*e[1]+w[9]*e[2]+w[13],z=w[2]*e[0]+w[6]*e[1]+w[10]*e[2]+w[14];
        P[i*3]=-(x-cx)*s[0];P[i*3+1]=(y-b.min[1])*s[1];P[i*3+2]=-(z-cz)*s[2];
        if(nor){
          nor.getElement(i,e);
          // Normals: the node's rotation, then the inverse of the stretch, then the turn.
          let nx=w[0]*e[0]+w[4]*e[1]+w[8]*e[2],ny=w[1]*e[0]+w[5]*e[1]+w[9]*e[2],nz=w[2]*e[0]+w[6]*e[1]+w[10]*e[2];
          nx=-nx/s[0];ny=ny/s[1];nz=-nz/s[2];const l=Math.hypot(nx,ny,nz)||1;
          N[i*3]=nx/l;N[i*3+1]=ny/l;N[i*3+2]=nz/l;
        }
        // The palette colour under this vertex (sRGB to linear, as glTF vertex colours are).
        uv.getElement(i,t);
        const px=Math.min(info.width-1,Math.max(0,Math.floor((((t[0]%1)+1)%1)*info.width))),py=Math.min(info.height-1,Math.max(0,Math.floor((((t[1]%1)+1)%1)*info.height)));
        const k=(py*info.width+px)*3;
        for(let c=0;c<3;c++)C[i*4+c]=Math.pow(data[k+c]/255,2.2);
        C[i*4+3]=1;
      }
      const buffer=root.listBuffers()[0];
      p.setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer));
      if(nor)p.setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer));
      p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(C).setBuffer(buffer));
      p.setAttribute('TEXCOORD_0',null);
    }
    // (Its transform is in the vertices now.)
    node.setTranslation([0,0,0]).setRotation([0,0,0,1]).setScale([1,1,1]);
  }
  for(const m of root.listMaterials())m.setName('Kenney').setBaseColorTexture(null).setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.6);
  await doc.transform(prune());
  const out=path.join(outDir,`kenney-${name}.glb`);
  await io.write(out,doc);
  const tris=root.listMeshes().reduce((a,m)=>a+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
  console.log(`${out}: ${tris} triangles, ${fs.statSync(out).size} bytes, ${length}×${width}×${height} m`);
}
