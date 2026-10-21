import type {Location,Road,Seconds,SignalGroup,SimModule} from '../contracts';
import {pointAtAlong} from './roadGeometry';

/**
 * Traffic lights that run: each set (a junction, or a crossing) cycles through its stages in the UK sequence,
 * red → red and amber → green → amber → red, with an all-red gap between stages. At a junction the approaches
 * along one line (both ways along one road, or roads straight across from each other) share a stage; each other
 * direction has its own. Where people cross (a signal crossing, or one at the junction), there is a stage when
 * all traffic waits. Timings are typical fixed-time values (estimates, not the real controllers' plans); each set
 * starts at its own point in the cycle.
 */

export type Aspect='green'|'amber'|'red'|'red-amber';

export interface LiveStop{
  id:string;
  group:string;
  road:Road;
  along:number;
  dir:1|-1;
  /** A stop line drawn for it (stops made from a crossing use the crossing's own). */
  line:boolean;
  /** On the centreline at the stop line, and the heading of the traffic it stops. */
  x:number;z:number;heading:number;
  /** Middle of the lane at the line (where traffic stops). */
  lane:{x:number;z:number};
  state:Aspect;
}

const GREEN={junction:14,crossing:22},AMBER=3,ALL_RED=2,RED_AMBER=2,PEOPLE={junction:7,crossing:9};

interface Segment{until:number;stage:number;aspect:Aspect}

export class TrafficSignals implements SimModule{
  readonly id='traffic-signals';
  readonly stops:LiveStop[]=[];
  private readonly sets:Array<{group:SignalGroup;offset:number;cycle:number;segments:Segment[];stages:number[];stops:LiveStop[]}>=[];
  private time=0;

  constructor(location:Location){
    location.signals.forEach((group,g)=>{
      const live:LiveStop[]=[];
      group.stops.forEach((s,i)=>{
        const road=location.roads.find(r=>r.id===s.roadId);
        if(!road)return;
        const p=pointAtAlong(road,s.along),hx=p.direction.x*s.dir,hz=p.direction.z*s.dir;
        // The left lane's middle: left of travel is (hz, −hx); one-way roads use their middle.
        const off=road.oneway?0:road.lanes.width/2;
        live.push({id:`${group.id}-${i}`,group:group.id,road,along:s.along,dir:s.dir,line:s.line,x:p.x,z:p.z,heading:Math.atan2(hx,-hz),
          lane:{x:p.x+hz*off,z:p.z-hx*off},state:'red'});
      });
      // Stages: approaches along one line together (headings within about 30° of every other in the stage, either
      // way along the line).
      const axes:number[][]=[];
      const apart=(a:number,b:number)=>{const d=Math.abs(a-b)%Math.PI;return Math.min(d,Math.PI-d)};
      const stages=live.map(s=>{
        const a=((s.heading%Math.PI)+Math.PI)%Math.PI;
        let k=axes.findIndex(members=>members.every(b=>apart(a,b)<.5));
        if(k<0){axes.push([]);k=axes.length-1}
        axes[k]!.push(a);
        return k;
      });
      const segments:Segment[]=[];
      let t=0;
      const push=(dur:number,stage:number,aspect:Aspect)=>{t+=dur;segments.push({until:t,stage,aspect})};
      for(let k=0;k<axes.length;k++){
        push(RED_AMBER,k,'red-amber');push(GREEN[group.kind],k,'green');push(AMBER,k,'amber');push(ALL_RED,-1,'red');
      }
      // People crossing: everyone waits.
      if(group.kind==='crossing'||group.crossings.length>0)push(PEOPLE[group.kind],-1,'red');
      // Each set at its own point in the cycle (fixed per set, so an attempt can be repeated).
      const offset=(g*37.3)%t;
      this.sets.push({group,offset,cycle:t,segments,stages,stops:live});
      this.stops.push(...live);
    });
    this.update();
  }

  /** The state of every stop now. */
  private update(){
    for(const set of this.sets){
      const t=(this.time+set.offset)%set.cycle;
      const seg=set.segments.find(s=>t<s.until)??set.segments.at(-1)!;
      set.stops.forEach((stop,i)=>{stop.state=seg.stage===set.stages[i]?seg.aspect:'red'});
    }
  }

  fixedUpdate(dt:Seconds):void{this.time+=dt;this.update()}
  reset():void{this.time=0;this.update()}
  dispose():void{}
}
