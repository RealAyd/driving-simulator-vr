import {Color3,CreateBox,CreateCylinder,CreateDisc,StandardMaterial,TransformNode,type Mesh,type Scene} from '../engine/babylon';
import {groundAt,rotationYFromHeading} from '../engine/babylonAdapter';
import {roadHalfWidth} from './roadGeometry';
import type {Aspect,LiveStop} from './trafficSignals';

/**
 * Traffic lights drawn for running signals (trafficSignals.ts): a pole on the nearside of each stop line with a
 * three-aspect head facing the traffic, its lamps lit by the current state, and a white stop line across the lane
 * where the map gives one (crossings draw their own). Project-owned geometry; the lamps glow (emissive).
 */
export function buildSignalLights(scene:Scene,stops:readonly LiveStop[]):{update():void;poles:Array<{id:string;x:number;z:number}>;dispose():void}{
  const root=new TransformNode('signal-lights',scene);
  const mat=(name:string,c:Color3,lit:boolean)=>{
    const m=new StandardMaterial(name,scene);
    m.diffuseColor=c;
    m.specularColor=new Color3(.05,.05,.05);
    if(lit){m.emissiveColor=c;m.disableLighting=true}
    return m;
  };
  const housing=mat('signal-light-housing',new Color3(.07,.07,.07),false);
  const white=mat('stop-line',new Color3(.92,.92,.9),false);
  const lamps={
    red:{on:mat('lamp-red-on',new Color3(1,.12,.08),true),off:mat('lamp-red-off',new Color3(.2,.05,.05),false)},
    amber:{on:mat('lamp-amber-on',new Color3(1,.6,.05),true),off:mat('lamp-amber-off',new Color3(.2,.14,.03),false)},
    green:{on:mat('lamp-green-on',new Color3(.15,1,.5),true),off:mat('lamp-green-off',new Color3(.04,.16,.08),false)}
  };
  const lit:Record<Aspect,Array<'red'|'amber'|'green'>>={red:['red'],'red-amber':['red','amber'],amber:['amber'],green:['green']};
  const heads:Array<{stop:LiveStop;lenses:Record<'red'|'amber'|'green',Mesh>;shown:Aspect|null}>=[];
  const poles:Array<{id:string;x:number;z:number}>=[];
  /** A three-aspect head at height on `parent`, its lamps facing local −Z, for `stop`. */
  const addHead=(parent:TransformNode,stop:LiveStop,name:string,z=0)=>{
    const head=CreateBox(`${name}-head`,{width:.34,height:.96,depth:.24},scene);
    head.position.set(0,2.55,z);head.material=housing;head.parent=parent;
    const lenses={} as Record<'red'|'amber'|'green',Mesh>;
    (['red','amber','green'] as const).forEach((aspect,i)=>{
      const lens=CreateDisc(`${name}-${aspect}`,{radius:.11,tessellation:16,sideOrientation:2},scene);
      lens.position.set(0,2.85-i*.3,z-.125);
      lens.material=lamps[aspect].off;
      lens.parent=parent;
      lenses[aspect]=lens;
    });
    heads.push({stop,lenses,shown:null});
  };
  const primaries=new Map<LiveStop,{x:number;z:number;node:TransformNode}>();
  for(const stop of stops){
    const half=roadHalfWidth(stop.road);
    // Forward (fx, fz); left of travel is (fz, −fx).
    const fx=Math.sin(stop.heading),fz=-Math.cos(stop.heading),lx=fz,lz=-fx;
    const side=half+.45,ahead=.8;
    const x=stop.x+lx*side+fx*ahead,z=stop.z+lz*side+fz*ahead;
    const node=new TransformNode(`signal-light-${stop.id}`,scene);
    node.parent=root;
    node.position.set(x,groundAt(x,z)+stop.road.surfaceHeight+stop.road.kerbHeight,z);
    // Local −Z faces the oncoming traffic.
    node.rotation.y=rotationYFromHeading(stop.heading+Math.PI);
    poles.push({id:node.name,x,z});
    const pole=CreateCylinder(`${node.name}-pole`,{height:2.9,diameter:.11,tessellation:8},scene);
    pole.position.y=1.45;pole.material=housing;pole.parent=node;
    addHead(node,stop,node.name);
    primaries.set(stop,{x,z,node});
    if(stop.line){
      // Across the lane(s) this way, from the centreline to the kerb (the whole road if one-way).
      const width=stop.road.oneway?2*half:half,mid=stop.road.oneway?0:half/2;
      const line=CreateBox(`stop-line-${stop.id}`,{width,height:.01,depth:.3},scene);
      const cx=stop.x+lx*mid,cz=stop.z+lz*mid;
      line.position.set(cx,groundAt(cx,cz)+stop.road.surfaceHeight+.018,cz);
      line.rotation.y=rotationYFromHeading(stop.heading);
      line.material=white;line.parent=root;line.isPickable=false;
    }
  }
  // Secondary signals: a learner stopped at the line cannot see the primary beside them, so each approach also has
  // a head across the junction, back to back with the opposing traffic's primary (as on UK junctions); where no
  // traffic comes the other way, on its own pole on the far right.
  for(const stop of stops){
    const fx=Math.sin(stop.heading),fz=-Math.cos(stop.heading);
    let best:{p:{x:number;z:number;node:TransformNode};d:number}|null=null;
    for(const [o,p] of primaries){
      if(o.group!==stop.group||Math.cos(o.heading-stop.heading)>-.85)continue;
      const d=(p.x-stop.x)*fx+(p.z-stop.z)*fz;
      if(d>4&&d<60&&(!best||d<best.d))best={p,d};
    }
    const node=new TransformNode(`signal-secondary-${stop.id}`,scene);
    node.parent=root;
    node.rotation.y=rotationYFromHeading(stop.heading+Math.PI);
    if(best){
      // On the opposing pole, just behind its head.
      node.position.set(best.p.x-fx*.26,best.p.node.position.y,best.p.z-fz*.26);
    }else{
      const half=roadHalfWidth(stop.road),x=stop.x+fx*12-fz*(half+.45),z=stop.z+fz*12+fx*(half+.45);
      node.position.set(x,groundAt(x,z)+stop.road.surfaceHeight+stop.road.kerbHeight,z);
      const pole=CreateCylinder(`${node.name}-pole`,{height:2.9,diameter:.11,tessellation:8},scene);
      pole.position.y=1.45;pole.material=housing;pole.parent=node;
      poles.push({id:node.name,x,z});
    }
    addHead(node,stop,node.name);
  }
  const update=()=>{
    for(const h of heads){
      if(h.shown===h.stop.state)continue;
      h.shown=h.stop.state;
      const on=lit[h.stop.state];
      for(const aspect of ['red','amber','green'] as const)h.lenses[aspect].material=on.includes(aspect)?lamps[aspect].on:lamps[aspect].off;
    }
  };
  update();
  return {update,poles,dispose(){root.dispose(false,true)}};
}
