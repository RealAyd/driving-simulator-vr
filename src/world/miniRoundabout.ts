import type {Vec2} from '../contracts';

/** A mini-roundabout as the paths through it need it. */
export interface MiniRoundabout{position:Vec2;radius:number;discDiameter:number}

/** How far a car's middle keeps from the painted disc's edge (half a car's width and a margin). */
const DISC_CLEARANCE=2.4;

/**
 * The way through a mini-roundabout from the entry point `a` (where the road in meets it, in the left lane) to the
 * exit point `b`: clockwise round the painted disc, as in the UK. A left turn keeps to the outside; going ahead, right
 * or all the way round, the car circles the disc, coming in towards it and keeping clear of it.
 * World axes: x east, z south, so clockwise seen from above is the angle atan2(z, x) increasing.
 */
export function aroundMini(m:MiniRoundabout,a:Vec2,b:Vec2):Vec2[]{
  const c=m.position;
  const ta=Math.atan2(a.z-c.z,a.x-c.x),tb=Math.atan2(b.z-c.z,b.x-c.x);
  let sweep=((tb-ta)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  // Back the way it came (a U-turn): all the way round.
  if(sweep<.35)sweep+=2*Math.PI;
  const ra=Math.hypot(a.x-c.x,a.z-c.z),rb=Math.hypot(b.x-c.x,b.z-c.z);
  const inner=m.discDiameter/2+DISC_CLEARANCE;
  // Going round (more than a left turn): drawn in towards the disc, never closer than the clearance.
  const round=Math.max(0,Math.min(1,(sweep-Math.PI*.6)/(Math.PI*.4)));
  const n=Math.max(4,Math.ceil(sweep/.12));
  const out:Vec2[]=[];
  for(let k=0;k<=n;k++){
    const t=k/n,base=ra+(rb-ra)*t;
    const r=base+(Math.max(inner,Math.min(base,inner+1))-base)*round*Math.sin(Math.PI*t);
    const angle=ta+sweep*t;
    out.push({x:c.x+Math.cos(angle)*r,z:c.z+Math.sin(angle)*r});
  }
  return out;
}

/** The mini-roundabout a junction point belongs to, if any. */
export function miniAt(minis:readonly MiniRoundabout[],p:Vec2):MiniRoundabout|null{
  return minis.find(m=>Math.hypot(p.x-m.position.x,p.z-m.position.z)<m.radius+2.5)??null;
}
