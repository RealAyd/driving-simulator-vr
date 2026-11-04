import type {Vec2} from '../contracts';

/** A mini-roundabout as the paths through it need it. */
export interface MiniRoundabout{position:Vec2;radius:number;discDiameter:number;
  /** A bigger roundabout's ring as mapped (its centreline, a closed loop): the way round follows its shape. */
  outline?:readonly Vec2[]}

/** How far out from the middle the closed loop `outline` is at `angle` (the farthest crossing of that ray). */
function outlineReach(c:Vec2,outline:readonly Vec2[],angle:number):number{
  const dx=Math.cos(angle),dz=Math.sin(angle);
  let best=0;
  for(let i=0;i<outline.length;i++){
    const p=outline[i]!,q=outline[(i+1)%outline.length]!;
    const ex=q.x-p.x,ez=q.z-p.z,den=dx*ez-dz*ex;
    if(Math.abs(den)<1e-9)continue;
    const px=p.x-c.x,pz=p.z-c.z,t=(px*ez-pz*ex)/den,u=(px*dz-pz*dx)/den;
    if(t>0&&u>=0&&u<=1)best=Math.max(best,t);
  }
  return best;
}

/** Where a path rerouted round a disc comes in to and leaves a mini-roundabout (of its radius). */
const EDGE=.7;
/** How far a car's middle keeps from the painted disc's edge (half a car's width and a margin). */
const DISC_CLEARANCE=2.4;

/**
 * The way through a mini-roundabout from the entry point `a` (where the road in meets it, in the left lane) to the
 * exit point `b`: clockwise round the painted disc, as in the UK. A left turn keeps to the outside; going ahead, right
 * or all the way round, the car circles the disc, coming in towards it and keeping clear of it.
 * World axes: x east, z south, so clockwise seen from above is the angle atan2(z, x) increasing.
 */
/** `tightest`: the tightest circle (metres) the path may go round, where the junction has room (the learner's car). */
export function aroundMini(m:MiniRoundabout,a:Vec2,b:Vec2,tightest=0):Vec2[]{
  const c=m.position;
  const ta=Math.atan2(a.z-c.z,a.x-c.x),tb=Math.atan2(b.z-c.z,b.x-c.x);
  let sweep=((tb-ta)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  // Back the way it came (a U-turn): all the way round.
  if(sweep<.35)sweep+=2*Math.PI;
  const ra=Math.hypot(a.x-c.x,a.z-c.z),rb=Math.hypot(b.x-c.x,b.z-c.z);
  // (Never tighter than `tightest`, where the junction has room for that with a car's width inside it.)
  const clear=m.discDiameter/2+DISC_CLEARANCE,inner=Math.max(clear,Math.min(tightest,m.radius-1.2)),mean=clear;
  // Going round (more than a left turn): drawn in towards the disc, never closer than the clearance.
  const round=Math.max(0,Math.min(1,(sweep-Math.PI*.6)/(Math.PI*.4)));
  const n=Math.max(4,Math.ceil(sweep/.12));
  const out:Vec2[]=[];
  for(let k=0;k<=n;k++){
    const t=k/n,base=ra+(rb-ra)*t;
    const r=base+(Math.max(inner,Math.min(base,inner+1))-base)*round*Math.sin(Math.PI*t);
    const angle=ta+sweep*t;
    // Round a mapped ring: the circle stretched to its shape (the entry and exit stay where they are).
    const shape=m.outline?(outlineReach(c,m.outline,angle)||mean)/mean:1,ends=Math.min(1,4*Math.min(t,1-t));
    const rr=r*(1+(shape-1)*ends);
    out.push({x:c.x+Math.cos(angle)*rr,z:c.z+Math.sin(angle)*rr});
  }
  return out;
}

/** The mini-roundabout a junction point belongs to, if any. */
export function miniAt(minis:readonly MiniRoundabout[],p:Vec2):MiniRoundabout|null{
  return minis.find(m=>Math.hypot(p.x-m.position.x,p.z-m.position.z)<m.radius+2.5)??null;
}

/**
 * A path that crosses a mini-roundabout's painted disc (one planned through the junction's middle, where the map has
 * the roads meet at one point) taken round it instead, clockwise (`aroundMini`), from where it comes into the
 * junction to where it leaves. A path already going round, clear of the disc with it on the right, is left as it is.
 */
export function roundMinis(path:readonly Vec2[],minis:readonly MiniRoundabout[],tightest=0,onRoad?:(x:number,z:number)=>boolean):Vec2[]{
  // (Where given: only a way round with the car's whole width on the carriageway; the tightest first that fits.)
  const fits=(pts:readonly Vec2[])=>!onRoad||pts.every((m,i)=>{
    const n=pts[Math.min(i+1,pts.length-1)]!,o=pts[Math.max(i-1,0)]!,dx=n.x-o.x,dz=n.z-o.z,l=Math.hypot(dx,dz)||1;
    return onRoad(m.x,m.z)&&onRoad(m.x-dz/l*.9,m.z+dx/l*.9)&&onRoad(m.x+dz/l*.9,m.z-dx/l*.9);
  });
  let out=[...path];
  for(const m of minis){
    if(m.outline)continue;
    const c=m.position,d=(p:Vec2)=>Math.hypot(p.x-c.x,p.z-c.z);
    // (Over the disc, or within a little of its edge; or passing it on the wrong side, the disc on its left.)
    const crosses=(a:Vec2,b:Vec2)=>segmentDistance(c,a,b)<m.discDiameter/2+1.5||
      segmentDistance(c,a,b)<m.radius*.8&&(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)<0;
    if(!out.some((p,i)=>i>0&&crosses(out[i-1]!,p)))continue;
    // Each time it passes through (in and out of the junction), taken round: from where it comes in across the
    // junction's edge (EDGE of its radius) to where it goes out.
    const R=m.radius*EDGE;
    const cross=(p:Vec2,q:Vec2):Vec2=>{
      // (The point on p→q at distance R from the middle, p outside and q inside or the other way.)
      let lo=0,hi=1;const inside=d(q)<R;
      for(let k=0;k<30;k++){const t=(lo+hi)/2,x={x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t};if((d(x)<R)===inside)hi=t;else lo=t}
      return {x:p.x+(q.x-p.x)*hi,z:p.z+(q.z-p.z)*hi};
    };
    for(let guard=0;guard<4;guard++){
      const i=out.findIndex((p,k)=>d(p)<R&&(k>0&&crosses(out[k-1]!,p)||k<out.length-1&&crosses(p,out[k+1]!)));
      if(i<0)break;
      let a=i;while(a>0&&d(out[a]!)<R)a--;
      let b=i;while(b<out.length-1&&d(out[b]!)<R)b++;
      if(d(out[a]!)<R||d(out[b]!)<R)break;
      const entry=cross(out[a]!,out[a+1]!),exit=cross(out[b]!,out[b-1]!);
      const round=[aroundMini(m,entry,exit,tightest),aroundMini(m,entry,exit,0)].find(fits);
      if(!round)break;
      out=[...out.slice(0,a+1),...round,...out.slice(b)];
    }
  }
  return out;
}

function segmentDistance(p:Vec2,a:Vec2,b:Vec2):number{
  const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2));
  return Math.hypot(a.x+dx*k-p.x,a.z+dz*k-p.z);
}
