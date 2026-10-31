import type {Mesh} from '../engine/babylon';

/** How far round the car a large area's scenery is kept built (metres from the car to a cell's nearest part). */
export interface StreamRange{
  /** Cells closer than this are built. */
  near:number;
  /** Cells further than this are freed (more than `near`, so a cell at the edge is not rebuilt back and forth). */
  far:number;
}

/** A cell's build, in steps (each yield a point where it may wait for the next frame); returns the cell's meshes. */
export type CellBuild=Generator<void,Mesh[],void>;

/**
 * Scenery in square cells (`size` metres, keyed "i,j" by Math.floor(x/size), Math.floor(z/size)), built as meshes
 * only near the car and freed again far from it (a large area all built at once runs a phone out of memory). A cell
 * is built a few steps at a time, within a time budget each frame, so driving does not stall while one is built.
 * Without a range every cell is built straight away and kept, as for a small area.
 */
export class CellStream{
  private readonly built=new Map<string,Mesh[]>();
  private readonly centres:Array<{key:string;x:number;z:number}>;
  /** The cell being built (over several frames). */
  private job:{key:string;steps:CellBuild}|null=null;
  /** Diagnostics: cells built, their total build time, and the longest single step (milliseconds). */
  readonly timing={cells:0,ms:0,slowestStep:0};

  constructor(private readonly size:number,keys:Iterable<string>,private readonly build:(key:string)=>CellBuild,private readonly range:StreamRange|null){
    this.centres=[...keys].map(key=>{const [i,j]=key.split(',').map(Number);return {key,x:(i!+.5)*size,z:(j!+.5)*size}});
    if(!range)for(const {key} of this.centres)this.built.set(key,finish(build(key)));
  }

  /** Every mesh built now. */
  meshes():Mesh[]{return [...this.built.values()].flat()}

  /**
   * Frees the cells far from (x, z) and builds those near it, nearest first, until `until` (a performance.now() time;
   * Infinity: all of them now). Returns how many near cells are still to build.
   */
  update(x:number,z:number,until=Infinity):number{
    if(!this.range)return 0;
    const reach=this.size*Math.SQRT1_2,todo:Array<{key:string;d:number}>=[];
    for(const c of this.centres){
      const d=Math.max(0,Math.hypot(c.x-x,c.z-z)-reach),meshes=this.built.get(c.key);
      if(meshes&&d>this.range.far){for(const m of meshes)m.dispose();this.built.delete(c.key)}
      else if(!meshes&&d<this.range.near&&this.job?.key!==c.key)todo.push({key:c.key,d});
    }
    todo.sort((a,b)=>a.d-b.d);
    while(performance.now()<until){
      if(!this.job){
        const next=todo.shift();
        if(!next)break;
        this.job={key:next.key,steps:this.build(next.key)};
      }
      const t=performance.now(),step=this.job.steps.next(),ms=performance.now()-t;
      this.timing.ms+=ms;this.timing.slowestStep=Math.max(this.timing.slowestStep,ms);
      if(step.done){this.built.set(this.job.key,step.value);this.job=null;this.timing.cells++}
    }
    return todo.length+(this.job?1:0);
  }

  dispose():void{
    // (A cell part built: its steps end, and whatever meshes they had made are freed by its builder.)
    this.job?.steps.return([]);
    this.job=null;
    for(const meshes of this.built.values())for(const m of meshes)m.dispose();
    this.built.clear();
  }
}

/** Runs a cell's build to the end. */
function finish(steps:CellBuild):Mesh[]{
  for(;;){const s=steps.next();if(s.done)return s.value}
}
