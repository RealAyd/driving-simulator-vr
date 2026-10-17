import type {EventSink,Pose,Seconds,SimModule,Vec3} from '../contracts';

/** How the viewing direction was measured. Never claim eye tracking unless it is. */
export type ObservationSource='mouse-controlled view'|'head direction';

export interface ObservationTarget{
  id:string;
  /** World position of the target centre this step. */
  position(vehicle:Pose):Vec3;
  /** Angular radius counted as "looking at" it, radians. */
  angularRadius:number;
}

const DWELL_SECONDS=.25;

/**
 * Records when the driver's view direction rests on a target (a mirror) for
 * long enough to count as a glance. Looking at a mirror is evidence of an
 * observation, not proof the driver understood what it showed.
 */
export class ObservationTracker implements SimModule{
  readonly id='observation';
  private readonly dwell=new Map<string,number>();
  private readonly reported=new Set<string>();
  source:ObservationSource='mouse-controlled view';

  constructor(
    private readonly targets:ObservationTarget[],
    private readonly vehicle:()=>Pose,
    private readonly eye:(pose:Pose)=>Vec3,
    private readonly look:(pose:Pose)=>Vec3,
    private readonly events:EventSink
  ){}

  fixedUpdate(dt:Seconds,time:Seconds):void{
    const pose=this.vehicle();
    const eye=this.eye(pose),look=this.look(pose);
    for(const target of this.targets){
      const p=target.position(pose);
      const dx=p.x-eye.x,dy=p.y-eye.y,dz=p.z-eye.z;
      const len=Math.hypot(dx,dy,dz)||1;
      const cos=(dx*look.x+dy*look.y+dz*look.z)/len;
      const looking=Math.acos(Math.min(1,Math.max(-1,cos)))<=target.angularRadius;
      if(!looking){
        this.dwell.delete(target.id);
        this.reported.delete(target.id);
        continue;
      }
      const d=(this.dwell.get(target.id)??0)+dt;
      this.dwell.set(target.id,d);
      if(d>=DWELL_SECONDS&&!this.reported.has(target.id)){
        this.reported.add(target.id);
        this.events.emit('observation.dwell',{target:target.id,startedAt:time-d,source:this.source});
      }
    }
  }

  reset():void{
    this.dwell.clear();
    this.reported.clear();
  }

  dispose():void{}
}
