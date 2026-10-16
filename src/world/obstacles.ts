import {forwardFromHeading,rightFromHeading,degToRad,type Block,type Pose} from '../contracts';
import type {CollisionQuery} from '../vehicle/vehicleController';

interface Box{id:string;cx:number;cz:number;heading:number;halfW:number;halfD:number}

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

export class StaticObstacles implements CollisionQuery{
  private readonly boxes:Box[];

  constructor(blocks:Block[]){
    this.boxes=blocks.map(b=>({
      id:b.id,cx:b.position.x,cz:b.position.z,heading:degToRad(b.headingDeg),
      halfW:b.size.width/2,halfD:b.size.depth/2
    }));
  }

  firstCollision(pose:Pose,halfWidth:number,halfLength:number):string|null{
    const vehicle:Box={id:'vehicle',cx:pose.position.x,cz:pose.position.z,heading:pose.heading,halfW:halfWidth,halfD:halfLength};
    for(const box of this.boxes){
      // Cheap distance reject before the exact test.
      const reach=Math.hypot(box.halfW,box.halfD)+Math.hypot(halfWidth,halfLength);
      if(Math.hypot(box.cx-vehicle.cx,box.cz-vehicle.cz)>reach)continue;
      if(boxesOverlap(vehicle,box))return box.id;
    }
    return null;
  }
}
