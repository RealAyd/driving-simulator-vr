import type {EventSink,Location,Seconds,SimModule,Zone} from '../contracts';
import {pavementWidthAt,roadHalfWidth,sampleRoad} from '../world/roadGeometry';

export interface ZoneStats{
  zoneId:string;
  entered:boolean;
  inside:boolean;
  entryEventId:string|null;
  exitEventId:string|null;
  entrySpeed:number;
  maxSpeed:number;
  minSpeed:number;
}

/**
 * Tracks the learner through distance-along-road zones. Each zone reports
 * entry once per attempt: sitting inside a zone never re-fires it.
 */
export class ZoneTracker implements SimModule{
  readonly id='zones';
  readonly stats=new Map<string,ZoneStats>();
  private readonly listeners:Array<(zoneId:string,eventId:string)=>void>=[];
  /** Learner's distance along each road, updated every step. */
  readonly along=new Map<string,number>();

  constructor(
    private readonly location:Location,
    private readonly zones:Zone[],
    private readonly learner:()=>{x:number;z:number;speed:number},
    private readonly events:EventSink
  ){
    this.reset();
  }

  onEnter(listener:(zoneId:string,eventId:string)=>void):void{
    this.listeners.push(listener);
  }

  fixedUpdate(_dt:Seconds):void{
    const {x,z,speed}=this.learner();
    // Only roads the learner is actually on count; elsewhere 'along' is undefined.
    for(const road of this.location.roads){
      const sample=sampleRoad(road,x,z);
      if(sample.distance<=roadHalfWidth(road)+pavementWidthAt(road,sample.along,Math.sign(sample.lateral)||1))this.along.set(road.id,sample.along);
      else this.along.delete(road.id);
    }
    for(const zone of this.zones){
      const s=this.stats.get(zone.id)!;
      const along=this.along.get(zone.roadId);
      const inside=along!==undefined&&along>=zone.from&&along<=zone.to;
      if(inside){
        s.maxSpeed=Math.max(s.maxSpeed,speed);
        s.minSpeed=Math.min(s.minSpeed,speed);
      }
      if(inside&&!s.inside&&!s.entered){
        s.entered=true;
        s.entrySpeed=speed;
        s.maxSpeed=speed;
        s.minSpeed=speed;
        const ev=this.events.emit('zone.entered',{zoneId:zone.id,speed});
        s.entryEventId=ev.id;
        for(const listener of this.listeners)listener(zone.id,ev.id);
      }else if(!inside&&s.inside){
        const ev=this.events.emit('zone.exited',{zoneId:zone.id,maxSpeed:s.maxSpeed,minSpeed:s.minSpeed});
        s.exitEventId=ev.id;
      }
      s.inside=inside;
    }
  }

  reset():void{
    for(const zone of this.zones)this.stats.set(zone.id,{
      zoneId:zone.id,entered:false,inside:false,entryEventId:null,exitEventId:null,
      entrySpeed:0,maxSpeed:0,minSpeed:Infinity
    });
    this.along.clear();
  }

  dispose():void{this.listeners.length=0}
}
