import {describe,expect,it} from 'vitest';
import {EventLog} from '../../src/app/eventLog';
import {Session} from '../../src/app/session';
import {DriverHead,RHD_SEAT} from '../../src/cockpit/seat';
import {KeyboardInput} from '../../src/input/keyboard';
import {degToRad} from '../../src/contracts';

class FakeDoc extends EventTarget{hidden=false}
const key=(type:string,code:string,repeat=false)=>Object.assign(new Event(type),{code,repeat});

describe('keyboard input',()=>{
  it('clears held controls when the window loses focus',()=>{
    const win=new EventTarget();
    const input=new KeyboardInput(win,win);
    win.dispatchEvent(key('keydown','KeyW'));
    expect(input.read().throttle).toBe(1);
    win.dispatchEvent(new Event('blur'));
    expect(input.read()).toEqual({throttle:0,brake:0,steer:0,reverse:false});
  });
  it('clears held controls when the tab becomes hidden',()=>{
    const win=new EventTarget(),doc=new FakeDoc();
    const input=new KeyboardInput(win,win,doc as unknown as Document);
    win.dispatchEvent(key('keydown','ArrowRight'));
    doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
    expect(input.read().steer).toBe(0);
  });
  it('fires actions once per press, ignoring key repeat, and stops after dispose',()=>{
    const win=new EventTarget();
    const input=new KeyboardInput(win,win);
    const actions:string[]=[];
    input.onAction=a=>actions.push(a);
    win.dispatchEvent(key('keydown','BracketLeft'));
    win.dispatchEvent(key('keydown','BracketLeft',true));
    input.dispose();
    win.dispatchEvent(key('keydown','BracketRight'));
    expect(actions).toEqual(['indicator-left']);
  });
});

describe('session lifecycle',()=>{
  it('only allows defined transitions and makes errors terminal',()=>{
    const s=new Session();
    expect(s.to('running')).toBe(false);
    expect(s.to('ready')).toBe(true);
    expect(s.to('running')).toBe(true);
    expect(s.to('paused')).toBe(true);
    s.fail('boom');
    expect(s.to('running')).toBe(false);
    expect(s.error).toBe('boom');
  });
});

describe('event log',()=>{
  it('gives unique ids and simulation timestamps, and clears on reset',()=>{
    let t=0;
    const log=new EventLog(()=>t);
    const a=log.emit('session.started');t=1.5;
    const b=log.emit('vehicle.moving',{speed:1});
    expect(a.id).not.toBe(b.id);
    expect(b.time).toBe(1.5);
    log.clear();
    expect(log.events).toHaveLength(0);
  });
});

describe('driver head',()=>{
  it('sits right of centre (right-hand drive) at road-relative eye height',()=>{
    const head=new DriverHead();
    const eye=head.eyeWorld({position:{x:0,y:.12,z:0},heading:0});
    expect(eye.x).toBeCloseTo(RHD_SEAT.eye.x,9);
    expect(eye.y).toBeCloseTo(.12+RHD_SEAT.eye.y,9);
  });
  it('looks relative to the vehicle and clamps to the shoulder-check limit',()=>{
    const head=new DriverHead();
    head.look(degToRad(90),0);
    const dir=head.lookWorld({position:{x:0,y:0,z:0},heading:degToRad(90)});
    expect(dir.x).toBeCloseTo(0,9);expect(dir.z).toBeCloseTo(1,9); // car faces east, head right → south
    head.look(degToRad(500),0);
    expect(head.yaw).toBeCloseTo(RHD_SEAT.yawLimit,9);
    head.recentre();
    expect(head.yaw).toBe(0);
  });
});
