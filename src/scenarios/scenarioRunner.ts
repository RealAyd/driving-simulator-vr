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
  /** Guidance messages from triggers. */
  onMessage:(text:string)=>void=()=>{};

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
    for(const trigger of this.scenario.triggers)
      if('zoneEntered' in trigger.when&&trigger.when.zoneEntered===zoneId)this.fire(trigger,{zoneEventId:eventId});
    if(this.scenario.end.zone!==undefined&&zoneId===this.scenario.end.zone)this.finish('completed');
  }

  private fire(trigger:Scenario['triggers'][number],payload:Record<string,unknown>):void{
    if(trigger.once&&this.fired.has(trigger.id))return;
    this.fired.add(trigger.id);
    this.events.emit('scenario.triggered',{triggerId:trigger.id,...payload});
    for(const action of trigger.actions){
      if(action.do==='start-crossing')this.pedestrians.get(action.actor)?.requestCrossing(action.delaySeconds);
      else this.onMessage(action.text);
    }
  }

  fixedUpdate(dt:Seconds):void{
    if(this.ended)return;
    this.elapsed+=dt;
    for(const trigger of this.scenario.triggers)
      if('atSeconds' in trigger.when&&this.elapsed>=trigger.when.atSeconds)this.fire(trigger,{atSeconds:trigger.when.atSeconds});
    const l=this.learner();
    // A collision ends an exercise. A mock test goes on (the marking records it as a dangerous fault; reverse
    // away and carry on), as does touching the barriers at the edge of a generated area (reverse and turn round).
    const mock=this.scenario.rubricId==='mock-test';
    if(l.collidedWith&&!mock&&!l.collidedWith.startsWith('edge-barrier'))return this.finish('collision');
    // Leaving the route: off any road surface, or driving the wrong way.
    const wrongWay=Math.abs(headingDelta(l.heading,l.roadHeading))>WRONG_WAY_RADIANS;
    this.offRoute=l.surface==='none'||wrongWay?this.offRoute+dt:0;
    // A mock test goes on (the marking records it); exercises end when the car leaves their route.
    if(this.offRoute>=OFF_ROUTE_SECONDS&&!mock)return this.finish('left-route');
    if(this.scenario.end.completeAfterSeconds!==undefined&&this.elapsed>=this.scenario.end.completeAfterSeconds)return this.finish('completed');
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
