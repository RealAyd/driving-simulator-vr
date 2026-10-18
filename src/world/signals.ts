import {Color3,CreateBox,CreateCylinder,CreateDisc,StandardMaterial,TransformNode,type Scene} from '../engine/babylon';
import {rotationYFromHeading} from '../engine/babylonAdapter';
import type {Location} from '../contracts';
import {pointAtAlong,roadHalfWidth} from './roadGeometry';

/**
 * Traffic-signal heads at a location's signal crossings, drawn only where the
 * exercise says how the signals run (scenario `signals`), showing that state.
 * One primary signal per approach on the nearside, just past the stop line,
 * facing the approaching traffic. Project-owned geometry.
 */
export function buildSignalHeads(scene:Scene,location:Location,states:Record<string,'green'>):{poles:Array<{id:string;x:number;z:number}>;dispose():void}{
  const poles:Array<{id:string;x:number;z:number}>=[];
  const root=new TransformNode('signal-heads',scene);
  const mat=(name:string,c:Color3,lit=false)=>{
    const m=new StandardMaterial(name,scene);
    m.diffuseColor=c;
    if(lit){m.emissiveColor=c;m.disableLighting=true}
    m.specularColor=new Color3(.05,.05,.05);
    return m;
  };
  const housing=mat('signal-housing',new Color3(.07,.07,.07));
  const lamps={
    red:mat('signal-red-off',new Color3(.22,.05,.05)),
    amber:mat('signal-amber-off',new Color3(.22,.15,.03)),
    green:mat('signal-green-on',new Color3(.15,1,.45),true)
  };
  for(const crossing of location.crossings){
    const state=states[crossing.id];
    if(crossing.kind!=='signal'||!state)continue;
    const road=location.roads.find(r=>r.id===crossing.roadId)!;
    const half=roadHalfWidth(road);
    const at=pointAtAlong(road,crossing.along);
    const d=at.direction,r={x:-d.z,z:d.x};
    for(const dir of [1,-1]){
      // Traffic travelling `dir` along the road: its nearside (left) is −dir to the right of the centreline.
      const lateral=-dir*(half+.45),along=-dir*(crossing.width/2+.2);
      const x=at.x+r.x*lateral+d.x*along,z=at.z+r.z*lateral+d.z*along;
      const facing=Math.atan2(-d.x*dir,d.z*dir); // towards the approaching traffic
      const node=new TransformNode(`signal-${crossing.id}-${dir}`,scene);
      poles.push({id:node.name,x,z});
      node.parent=root;
      node.position.set(x,road.surfaceHeight+road.kerbHeight,z);
      node.rotation.y=rotationYFromHeading(facing);
      const pole=CreateCylinder(`${node.name}-pole`,{height:2.9,diameter:.11,tessellation:8},scene);
      pole.position.y=1.45;pole.material=housing;pole.parent=node;
      const head=CreateBox(`${node.name}-head`,{width:.34,height:.96,depth:.24},scene);
      head.position.set(0,2.55,0);head.material=housing;head.parent=node;
      (['red','amber','green'] as const).forEach((aspect,i)=>{
        // On the front of the head (local −Z faces the traffic); drawn both sides.
        const lens=CreateDisc(`${node.name}-${aspect}`,{radius:.11,tessellation:16,sideOrientation:2},scene);
        lens.position.set(0,2.85-i*.3,-.125);
        lens.material=aspect===state?lamps.green:lamps[aspect];
        lens.parent=node;
      });
    }
  }
  return {poles,dispose(){root.dispose(false,true)}};
}
