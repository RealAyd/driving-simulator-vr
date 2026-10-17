import {IMPROVE,mpsToMph,type SimEvent,type SimModule} from '../contracts';
import type {ZoneTracker} from '../scenarios/zones';

/** One junction on a guided route: approach and entry zones, and the signal it needs. */
export interface RouteJunction{
  name:string;
  approachZone:string;
  entryZone:string;
  /** Indicator expected before entering, or null when none is needed. */
  signal:'left'|'right'|null;
}

/** Head turned this far right counts as looking right down the junction (radians). */
const LOOK_RIGHT_YAW=.6;
const ENTRY_SPEED_ADVICE_MPH=15;

/**
 * Practice notes for a guided route through junctions. Not scored and not
 * reviewed by an instructor: it reports entry speed, the signal before each
 * junction and whether the driver looked right while approaching.
 */
export class RouteSummary implements SimModule{
  readonly id='route-summary';
  private lookedRight=new Set<string>();

  constructor(
    private readonly junctions:RouteJunction[],
    private readonly zones:ZoneTracker,
    private readonly headYaw:()=>number,
    private readonly events:()=>readonly SimEvent[]
  ){}

  fixedUpdate():void{
    if(this.headYaw()<LOOK_RIGHT_YAW)return;
    for(const j of this.junctions){
      const approach=this.zones.stats.get(j.approachZone),entry=this.zones.stats.get(j.entryZone);
      if(approach?.inside||(entry?.inside&&!this.passed(j)))this.lookedRight.add(j.name);
    }
  }

  /** True once the car has gone through the junction (left its entry zone). */
  private passed(j:RouteJunction):boolean{
    return this.zones.stats.get(j.entryZone)?.exitEventId!=null;
  }

  notes():string[]{
    const out:string[]=[];
    const events=this.events();
    for(const j of this.junctions){
      const entry=this.zones.stats.get(j.entryZone);
      if(!entry?.entered){out.push(IMPROVE+`You did not reach ${j.name}.`);continue}
      const mph=Math.round(mpsToMph(entry.maxSpeed));
      out.push(mph<=ENTRY_SPEED_ADVICE_MPH
        ?`${j.name}: entered at up to ${mph} mph, a controlled speed.`
        :IMPROVE+`${j.name}: entered at up to ${mph} mph. Aim for about ${ENTRY_SPEED_ADVICE_MPH} mph or less so you can stop for traffic from the right.`);
      out.push(this.lookedRight.has(j.name)
        ?`${j.name}: you looked right on the approach.`
        :IMPROVE+`${j.name}: no look to the right was seen on the approach. Look right before you enter (swipe the view right, or hold R shoulder).`);
      if(j.signal){
        const entryTime=events.find(e=>e.id===entry.entryEventId)?.time??Infinity;
        const signalled=[...events].reverse().find(e=>e.type==='vehicle.indicator.changed'&&e.time<=entryTime);
        out.push(signalled?.payload['state']===j.signal
          ?`${j.name}: ${j.signal} signal on before entering.`
          :IMPROVE+`${j.name}: no ${j.signal} signal before entering. Signal ${j.signal} on the approach.`);
      }
    }
    return out;
  }

  reset():void{
    this.lookedRight.clear();
  }

  dispose():void{}
}
