import {headingDelta,type AttemptResult,type EventSink,type Scenario,type Seconds,type SimModule} from '../contracts';
import type {Pedestrian} from '../actors/pedestrian';
import type {ZoneTracker} from './zones';

export type Outcome=AttemptResult['outcome'];

const OFF_ROUTE_SECONDS=1.5;
const WRONG_WAY_RADIANS=Math.PI*100/180;

/**
 * Runs one exercise: fires triggers from zone entries (once per attempt),
 * schedules actor actions and decides when and how the attempt ends.
 */
export class ScenarioRunner implements SimModule{
  readonly id='scenario';
  ended:Outcome|null=null;
  elapsed=0;
  private readonly fired=new Set<string>();
  private offRoute=0;
  onEnded:(outcome:Outcome)=>void=()=>{};

  constructor(
    readonly scenario:Scenario,
    private readonly zones:ZoneTracker,
    private readonly pedestrians:Map<string,Pedestrian>,
    private readonly learner:()=>{surface:'carriageway'|'pavement'|'none';heading:number;roadHeading:number;collidedWith:string|null},
    private readonly events:EventSink
  ){
    zones.onEnter((zoneId,eventId)=>this.onZone(zoneId,eventId));
  }

  private onZone(zoneId:string,eventId:string):void{
    if(this.ended)return;
    for(const trigger of this.scenario.triggers){
      if(trigger.when.zoneEntered!==zoneId)continue;
      if(trigger.once&&this.fired.has(trigger.id))continue;
      this.fired.add(trigger.id);
      this.events.emit('scenario.triggered',{triggerId:trigger.id,zoneEventId:eventId});
      for(const action of trigger.actions){
        if(action.do==='start-crossing')this.pedestrians.get(action.actor)?.requestCrossing(action.delaySeconds);
      }
    }
    if(this.scenario.end.zone!==undefined&&zoneId===this.scenario.end.zone)this.finish('completed');
  }

  fixedUpdate(dt:Seconds):void{
    if(this.ended)return;
    this.elapsed+=dt;
    const l=this.learner();
    // Any collision ends the attempt: there is no reverse gear, so a car
    // pressed against an obstacle could not otherwise continue.
    if(l.collidedWith)return this.finish('collision');
    // Leaving the route: off any road surface, or driving the wrong way.
    const wrongWay=Math.abs(headingDelta(l.heading,l.roadHeading))>WRONG_WAY_RADIANS;
    this.offRoute=l.surface==='none'||wrongWay?this.offRoute+dt:0;
    if(this.offRoute>=OFF_ROUTE_SECONDS)return this.finish('left-route');
    if(this.elapsed>=this.scenario.end.timeLimitSeconds)return this.finish('time-limit');
  }

  finish(outcome:Outcome):void{
    if(this.ended)return;
    this.ended=outcome;
    this.events.emit('exercise.ended',{outcome,elapsed:this.elapsed});
    this.onEnded(outcome);
  }

  reset():void{
    this.ended=null;
    this.elapsed=0;
    this.offRoute=0;
    this.fired.clear();
  }

  dispose():void{}
}
