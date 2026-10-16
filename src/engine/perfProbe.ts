/**
 * Rolling frame-time statistics. Frame pacing (p95, worst) matters more than
 * average FPS for comfort, especially in a headset.
 */
export interface PerfStats{
  frames:number;
  averageFps:number;
  p50Ms:number;
  p95Ms:number;
  worstMs:number;
}

export class PerfProbe{
  private readonly samples:number[]=[];

  constructor(private readonly capacity=600){}

  record(frameMs:number):void{
    if(!(frameMs>0)||!Number.isFinite(frameMs))return;
    this.samples.push(frameMs);
    if(this.samples.length>this.capacity)this.samples.shift();
  }

  stats():PerfStats{
    const sorted=[...this.samples].sort((a,b)=>a-b);
    const n=sorted.length;
    if(n===0)return {frames:0,averageFps:0,p50Ms:0,p95Ms:0,worstMs:0};
    const at=(q:number)=>sorted[Math.min(n-1,Math.floor(q*(n-1)))]!;
    const mean=sorted.reduce((a,b)=>a+b,0)/n;
    return {frames:n,averageFps:1000/mean,p50Ms:at(.5),p95Ms:at(.95),worstMs:sorted[n-1]!};
  }

  reset():void{
    this.samples.length=0;
  }
}
