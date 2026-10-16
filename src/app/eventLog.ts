import type {EventSink,Seconds,SimEvent,SimEventType} from '../contracts';

/** Ordered evidence log with unique ids, stamped with simulation time. */
export class EventLog implements EventSink{
  private readonly items:SimEvent[]=[];
  private counter=0;

  constructor(private readonly now:()=>Seconds,private readonly limit=5000){}

  emit<T extends SimEventType>(type:T,payload:Record<string,unknown>={}):SimEvent<T>{
    const event:SimEvent<T>={id:`ev-${String(++this.counter).padStart(5,'0')}`,type,time:this.now(),payload};
    this.items.push(event);
    if(this.items.length>this.limit)this.items.shift();
    return event;
  }

  get events():readonly SimEvent[]{
    return this.items;
  }

  clear():void{
    this.items.length=0;
  }
}
