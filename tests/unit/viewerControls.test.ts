import {describe,expect,it} from 'vitest';
import {ControllerInput,STANDARD_BINDINGS,loadBindings,saveBindings,type InputEnvironment,type PadLike} from '../../src/xr/controllerInput';
import {activeSettings,applySettings,clampSettings,defaultSettings,loadViewers,saveViewers} from '../../src/xr/viewerSettings';
import {eyeLayout,IPHONE_14_PRO_MAX} from '../../src/xr/viewerProfiles';

/** A stand-in for the browser: one controller (or none) and keyboard events. */
function fakeEnv(){
  const listeners:Record<string,Array<(e:{code?:string})=>void>>={};
  const pad:PadLike={id:'Odd Pad (non-standard)',connected:true,mapping:'',axes:[0,0,0,0],buttons:Array.from({length:12},()=>({pressed:false,value:0}))};
  let present=true;
  const env:InputEnvironment={
    getGamepads:()=>[present?pad:null],
    addEventListener:(t,l)=>{(listeners[t]??=[]).push(l)}
  };
  return {env,pad,
    press:(i:number,down=true)=>{(pad.buttons as Array<{pressed:boolean;value:number}>)[i]={pressed:down,value:down?1:0}},
    axis:(i:number,v:number)=>{(pad.axes as number[])[i]=v},
    key:(type:'keydown'|'keyup',code:string)=>{for(const l of listeners[type]??[])l({code})},
    disconnect:()=>{present=false}};
}

describe('phone viewer: controller input (no layout assumed)',()=>{
  it('offers the standard layout only to a controller that reports it; anything else starts unbound',()=>{
    const f=fakeEnv();
    const c=new ControllerInput(f.env);
    expect(c.defaultsFor(f.pad)).toEqual({});
    expect(c.defaultsFor({...f.pad,mapping:'standard'})).toEqual(STANDARD_BINDINGS);
  });

  it('binds whatever is pressed next, ignoring anything already held, and reads it back as the action',()=>{
    const f=fakeEnv();
    const c=new ControllerInput(f.env);
    f.press(2);                       // held before the capture starts
    c.beginCapture();
    expect(c.capture()).toBeNull();
    f.axis(1,-.9);                    // a stick pushed up
    const b=c.capture();
    expect(b).toEqual({kind:'axis',index:1,direction:-1});
    c.bindings={accelerate:b!,brake:{kind:'button',index:2}};
    const s=c.poll();
    expect(s.values.accelerate).toBeGreaterThan(0);
    expect(s.values.brake).toBe(1);
    expect(s.pressed.sort()).toEqual(['accelerate','brake']);
    expect(c.poll().pressed).toEqual([]);          // a press is reported once
    expect(s.raw.buttons).toEqual([2]);
  });

  it('keyboard keys can be bound too; a lost controller reports as disconnected',()=>{
    const f=fakeEnv();
    const c=new ControllerInput(f.env);
    c.beginCapture();
    f.key('keydown','KeyJ');
    const b=c.capture();
    expect(b).toEqual({kind:'key',code:'KeyJ'});
    c.bindings={brake:b!};
    expect(c.poll().values.brake).toBe(1);
    expect(c.poll().device).toBe('keyboard');
    f.key('keyup','KeyJ');
    expect(c.poll().values.brake).toBe(0);

    const g=fakeEnv();
    const pad=new ControllerInput(g.env,{brake:{kind:'button',index:6}});
    expect(pad.poll().connected).toBe(true);
    g.disconnect();
    expect(pad.poll().connected).toBe(false);
  });

  it('after a pause, a control still held must be released before it counts as a new press',()=>{
    const f=fakeEnv();
    const c=new ControllerInput(f.env,{pause:{kind:'button',index:9}});
    f.press(9);
    expect(c.poll().pressed).toEqual(['pause']);
    c.clearHeld();
    expect(c.poll().pressed).toEqual([]);
    f.press(9,false);c.poll();f.press(9);
    expect(c.poll().pressed).toEqual(['pause']);
  });

  it('after a pause, a control that was not held counts as soon as it is pressed (even before the next poll)',()=>{
    const f=fakeEnv();
    const c=new ControllerInput(f.env,{accelerate:{kind:'button',index:7}});
    c.poll();
    c.clearHeld();
    f.press(7);
    expect(c.poll().pressed).toEqual(['accelerate']);
  });

  it('bindings are saved per device',()=>{
    const mem=new Map<string,string>();
    const storage={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v)}};
    saveBindings(storage,'Pad A',{brake:{kind:'button',index:1}});
    saveBindings(storage,'keyboard',{brake:{kind:'key',code:'Space'}});
    expect(loadBindings(storage,'Pad A')).toEqual({brake:{kind:'button',index:1}});
    expect(loadBindings(storage,'keyboard')).toEqual({brake:{kind:'key',code:'Space'}});
    expect(loadBindings(storage,'Pad B')).toBeNull();
  });
});

describe('phone viewer: calibration settings',()=>{
  it('start from 63 mm eye spacing and the preset; adjustments are clamped, saved per viewer and reset to defaults',()=>{
    const d=defaultSettings();
    expect(d.ipdMm).toBe(63);
    expect(clampSettings({...d,ipdMm:120}).ipdMm).toBe(78);
    const mem=new Map<string,string>();
    const storage={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v)}};
    saveViewers(storage,{active:'Viewer 2',viewers:{'Viewer 1':{...d,ipdMm:66},'Viewer 2':{...d,ipdMm:60}}});
    const loaded=loadViewers(storage);
    expect(activeSettings(loaded).ipdMm).toBe(60);
    expect(activeSettings({...loaded,active:'Viewer 1'}).ipdMm).toBe(66);
    expect(activeSettings({...loaded,active:'Viewer 3'})).toEqual(defaultSettings());
  });

  it('eye spacing, image alignment and vertical alignment change the drawn picture as described',()=>{
    const s={...defaultSettings(),ipdMm:66,lensSeparationMm:60,verticalOffsetMm:2};
    const p=applySettings(s);
    expect(p.ipd).toBeCloseTo(.066);
    const aspect=2796/1290;
    const a=eyeLayout(p,IPHONE_14_PRO_MAX.width,aspect),b=eyeLayout(applySettings(defaultSettings()),IPHONE_14_PRO_MAX.width,aspect);
    // Narrower lens separation moves each image further towards the middle of the screen.
    expect(a.shift.left).toBeGreaterThan(b.shift.left);
    // Up 2 mm on a 71 mm-high screen.
    expect(a.vcentre).toBeCloseTo(.5+.002/IPHONE_14_PRO_MAX.height);
    expect(a.vshift).toBeGreaterThan(0);
    expect(eyeLayout(applySettings({...s,distortionScale:0}),IPHONE_14_PRO_MAX.width,aspect).scale).toBe(1);
  });
});
