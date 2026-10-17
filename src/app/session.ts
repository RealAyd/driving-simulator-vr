/**
 * Session lifecycle. Transitions are explicit so pause, restart and errors
 * cannot leave the simulation half-running.
 */
export type SessionState='loading'|'ready'|'running'|'paused'|'finished'|'error';

const ALLOWED:Record<SessionState,SessionState[]>={
  loading:['ready','error'],
  ready:['running','error'],
  running:['paused','ready','finished','error'],
  paused:['running','ready','error'],
  finished:['running','ready','error'],
  error:[]
};

export class Session{
  state:SessionState='loading';
  error:string|null=null;
  private readonly listeners=new Set<(state:SessionState)=>void>();

  can(next:SessionState):boolean{
    return ALLOWED[this.state].includes(next);
  }

  /** Moves to `next` if allowed; returns whether the state changed. */
  to(next:SessionState):boolean{
    if(!this.can(next))return false;
    this.state=next;
    for(const listener of this.listeners)listener(next);
    return true;
  }

  fail(message:string):void{
    if(this.state==='error')return;
    this.error=message;
    this.state='error';
    for(const listener of this.listeners)listener('error');
  }

  onChange(listener:(state:SessionState)=>void):()=>void{
    this.listeners.add(listener);
    return ()=>this.listeners.delete(listener);
  }
}
