import {forwardFromHeading,rightFromHeading,degToRad,type Block,type Pose} from '../contracts';
import type {CollisionQuery} from '../vehicle/vehicleController';

export interface Box{id:string;cx:number;cz:number;heading:number;halfW:number;halfD:number}

function corners(b:Box):Array<{x:number;z:number}>{
  const f=forwardFromHeading(b.heading),r=rightFromHeading(b.heading);
  return [[1,1],[1,-1],[-1,-1],[-1,1]].map(([sr,sf])=>({
    x:b.cx+r.x*b.halfW*sr!+f.x*b.halfD*sf!,
    z:b.cz+r.z*b.halfW*sr!+f.z*b.halfD*sf!
  }));
}

/** Separating-axis overlap test for two oriented rectangles on the ground. */
export function boxesOverlap(a:Box,b:Box):boolean{
  const ca=corners(a),cb=corners(b);
  for(const box of [a,b]){
    for(const axis of [forwardFromHeading(box.heading),rightFromHeading(box.heading)]){
      const project=(points:Array<{x:number;z:number}>)=>points.map(p=>p.x*axis.x+p.z*axis.z);
      const pa=project(ca),pb=project(cb);
      if(Math.max(...pa)<Math.min(...pb)||Math.max(...pb)<Math.min(...pa))return false;
    }
  }
  return true;
}

/** Grid cell size for finding the boxes near a vehicle (metres). */
const CELL=20;

export class StaticObstacles implements CollisionQuery{
  private readonly boxes:Box[];
  /** Diagnostics: the boxes within `r` metres of (x, z). */
  near(x:number,z:number,r:number):Box[]{return this.boxes.filter(b=>Math.hypot(b.cx-x,b.cz-z)<r)}

  constructor(blocks:Block[]){
    this.boxes=blocks.map(b=>({
      id:b.id,cx:b.position.x,cz:b.position.z,heading:degToRad(b.headingDeg),
      halfW:b.size.width/2,halfD:b.size.depth/2
    }));
    this.boxes.forEach((b,k)=>{
      const r=Math.hypot(b.halfW,b.halfD);
      for(let i=Math.floor((b.cx-r)/CELL);i<=Math.floor((b.cx+r)/CELL);i++)
        for(let j=Math.floor((b.cz-r)/CELL);j<=Math.floor((b.cz+r)/CELL);j++){const key=`${i},${j}`;(this.cells.get(key)??this.cells.set(key,[]).get(key)!).push(k)}
    });
  }

  /** Box indices by 20 m cell: each box in every cell its reach (half diagonal) touches. */
  private readonly cells=new Map<string,number[]>();

  firstCollision(pose:Pose,halfWidth:number,halfLength:number):string|null{
    const vehicle:Box={id:'vehicle',cx:pose.position.x,cz:pose.position.z,heading:pose.heading,halfW:halfWidth,halfD:halfLength};
    // Only boxes in the cells the vehicle's reach touches, tried in their own order (the same answer as trying all:
    // a town has tens of thousands of walls, and this is asked for every car every step).
    const r=Math.hypot(halfWidth,halfLength),near=new Set<number>();
    for(let i=Math.floor((vehicle.cx-r)/CELL);i<=Math.floor((vehicle.cx+r)/CELL);i++)
      for(let j=Math.floor((vehicle.cz-r)/CELL);j<=Math.floor((vehicle.cz+r)/CELL);j++)
        for(const k of this.cells.get(`${i},${j}`)??[])near.add(k);
    for(const k of [...near].sort((a,b)=>a-b)){
      const box=this.boxes[k]!;
      // Cheap distance reject before the exact test.
      const reach=Math.hypot(box.halfW,box.halfD)+Math.hypot(halfWidth,halfLength);
      if(Math.hypot(box.cx-vehicle.cx,box.cz-vehicle.cz)>reach)continue;
      if(boxesOverlap(vehicle,box))return box.id;
    }
    return null;
  }
}
