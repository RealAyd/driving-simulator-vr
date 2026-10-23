import {typing} from '../input/keyboard';
/**
 * Physical controls for scored driving in the phone viewer: a Bluetooth game
 * controller (Gamepad API) or a Bluetooth keyboard. Nothing here assumes a
 * button layout: every action is bound by the driver on the input-check
 * screen (with the standard layout offered as a starting point), and the
 * check shows exactly which inputs the browser receives.
 *
 * Many headset remotes pair over Bluetooth as a mouse or as media keys, which
 * a web page cannot read; only what appears on the check screen can be used.
 */
export type DriveAction='accelerate'|'brake'|'signal-left'|'signal-right'|'pause'|'recentre';
export const DRIVE_ACTIONS:readonly DriveAction[]=['accelerate','brake','signal-left','signal-right','pause','recentre'];
export const DRIVE_ACTION_LABEL:Record<DriveAction,string>={
  accelerate:'Accelerate (hold)',brake:'Brake (hold)','signal-left':'Signal left','signal-right':'Signal right',pause:'Pause',recentre:'Recentre'
};

/**
 * Optional controls: steering (used when the headset's steering is set to stick or buttons) and Change view
 * (the driver's seat or behind the car).
 */
export type ExtraAction='steer'|'steer-left'|'steer-right'|'view';
export const EXTRA_ACTIONS:readonly ExtraAction[]=['steer','steer-left','steer-right','view'];
export const EXTRA_ACTION_LABEL:Record<ExtraAction,string>={steer:'Steer (stick left/right)','steer-left':'Steer left (button)','steer-right':'Steer right (button)',view:'Change view (seat / behind the car)'};

export type Binding={kind:'button';index:number}|{kind:'axis';index:number;direction:1|-1}|{kind:'key';code:string};
export type Bindings=Partial<Record<DriveAction|ExtraAction,Binding>>;

/** The standard controller layout (Xbox/PlayStation-style), offered as a starting point only. */
export const STANDARD_BINDINGS:Readonly<Record<DriveAction,Binding>>={
  accelerate:{kind:'button',index:7},brake:{kind:'button',index:6},
  'signal-left':{kind:'button',index:4},'signal-right':{kind:'button',index:5},
  pause:{kind:'button',index:9},recentre:{kind:'button',index:3}
};
/** Standard layout extras: left stick across, D-pad left and right; Change view on the right face button (B / Circle). */
export const STANDARD_EXTRA:Readonly<Record<ExtraAction,Binding>>={
  steer:{kind:'axis',index:0,direction:1},'steer-left':{kind:'button',index:14},'steer-right':{kind:'button',index:15},view:{kind:'button',index:1}
};

export function describeBinding(b:Binding|undefined):string{
  if(!b)return 'not set';
  if(b.kind==='key')return `key ${b.code.replace(/^Key/,'')}`;
  if(b.kind==='axis')return `stick/axis ${b.index} ${b.direction>0?'+':'−'}`;
  return `button ${b.index}`;
}

/** Minimal views of the browser APIs used (so tests can stand in for them). */
export interface PadLike{id:string;connected:boolean;mapping?:string;buttons:ReadonlyArray<{pressed:boolean;value:number}>;axes:ReadonlyArray<number>}
export interface InputEnvironment{
  getGamepads():ReadonlyArray<PadLike|null>;
  addEventListener(type:'keydown'|'keyup'|'blur',listener:(e:{code?:string;target?:EventTarget|null})=>void):void;
}

/** Axis value treated as pressed, and button value treated as pressed (analogue triggers). */
const AXIS_ON=.55,BUTTON_ON=.3;
/** Steering stick: no steering within this much of centre (sticks rarely rest at exactly 0). */
const STICK_DEADZONE=.12;

export interface ControllerState{
  /** A controller (or a keyboard that has been used) is present. */
  connected:boolean;
  /** 'keyboard', a controller's id, or null. */
  device:string|null;
  /** 0..1 for each bound action (analogue triggers give fractions). */
  values:Record<DriveAction,number>;
  /** Steering stick, −1 (full left) to 1 (full right): finer near the centre. */
  stick:number;
  /** Steer buttons: −1 left, 1 right, 0 neither (or both). */
  steerButtons:number;
  /** Change view: held now, and pressed since the last poll. */
  view:boolean;viewPressed:boolean;
  /** Actions that went from released to pressed since the last poll. */
  pressed:DriveAction[];
  /** What the browser reports, for the check screen. */
  raw:{id:string|null;mapping:string|null;buttons:number[];axes:number[];keys:string[]};
}

export class ControllerInput{
  bindings:Bindings;
  private readonly keys=new Set<string>();
  private lastKeys:string[]=[];
  private previous:Record<DriveAction,boolean>=Object.fromEntries(DRIVE_ACTIONS.map(a=>[a,false])) as Record<DriveAction,boolean>;
  /** Actions held at the last poll. */
  private held:Record<DriveAction,boolean>=Object.fromEntries(DRIVE_ACTIONS.map(a=>[a,false])) as Record<DriveAction,boolean>;
  /** While capturing for a remap: inputs already held when capture began are ignored until released. */
  private captureBaseline:Set<string>|null=null;
  private keyboardSeen=false;

  constructor(private readonly env:InputEnvironment,bindings?:Bindings){
    this.bindings={...(bindings??{})};
    env.addEventListener('keydown',e=>{if(e.code&&!typing(e)){this.keys.add(e.code);this.keyboardSeen=true;this.lastKeys=[e.code,...this.lastKeys.filter(k=>k!==e.code)].slice(0,4)}});
    env.addEventListener('keyup',e=>{if(e.code)this.keys.delete(e.code)});
    env.addEventListener('blur',()=>this.keys.clear());
  }

  private pad():PadLike|null{
    return [...this.env.getGamepads()].find((p):p is PadLike=>!!p&&p.connected)??null;
  }

  private value(b:Binding|undefined,pad:PadLike|null):number{
    if(!b)return 0;
    if(b.kind==='key')return this.keys.has(b.code)?1:0;
    if(!pad)return 0;
    if(b.kind==='button'){
      const btn=pad.buttons[b.index];
      if(!btn)return 0;
      return btn.pressed?Math.max(btn.value,BUTTON_ON):btn.value>=BUTTON_ON?btn.value:0;
    }
    const v=(pad.axes[b.index]??0)*b.direction;
    return v>=AXIS_ON?Math.min(1,(v-AXIS_ON)/(1-AXIS_ON)+.01):0;
  }

  /** An optional control's binding: the driver's, else the standard one when the controller reports that layout. */
  private extraBinding(a:ExtraAction,pad:PadLike|null):Binding|undefined{
    return this.bindings[a]??(pad?.mapping==='standard'?STANDARD_EXTRA[a]:undefined);
  }
  private viewWasDown=false;

  private stick(pad:PadLike|null):number{
    const b=this.extraBinding('steer',pad);
    if(!b)return 0;
    if(b.kind!=='axis')return this.value(b,pad);
    const v=(pad?.axes[b.index]??0)*b.direction,m=Math.min(1,Math.abs(v));
    return m<STICK_DEADZONE?0:Math.sign(v)*((m-STICK_DEADZONE)/(1-STICK_DEADZONE))**1.5;
  }

  /** The bound controls' device: the controller if any action is bound to it, else the keyboard. */
  get usesKeyboard():boolean{
    return Object.values(this.bindings).some(b=>b?.kind==='key');
  }

  poll():ControllerState{
    const pad=this.pad();
    const values=Object.fromEntries(DRIVE_ACTIONS.map(a=>[a,this.value(this.bindings[a],pad)])) as Record<DriveAction,number>;
    const pressed=DRIVE_ACTIONS.filter(a=>values[a]>0&&!this.previous[a]);
    for(const a of DRIVE_ACTIONS){this.previous[a]=values[a]>0;this.held[a]=values[a]>0}
    const usesPad=Object.values(this.bindings).some(b=>b&&b.kind!=='key');
    const device=usesPad?pad?.id??null:this.usesKeyboard?(this.keyboardSeen?'keyboard':null):pad?.id??(this.keyboardSeen?'keyboard':null);
    const stick=this.stick(pad);
    const steerButtons=(this.value(this.extraBinding('steer-right',pad),pad)>0?1:0)-(this.value(this.extraBinding('steer-left',pad),pad)>0?1:0);
    const view=this.value(this.extraBinding('view',pad),pad)>0,viewPressed=view&&!this.viewWasDown;
    this.viewWasDown=view;
    return {
      stick,steerButtons,view,viewPressed,
      connected:usesPad?!!pad:this.usesKeyboard?this.keyboardSeen:!!pad||this.keyboardSeen,
      device,values,pressed,
      raw:{id:pad?.id??null,mapping:pad?.mapping??null,
        buttons:pad?pad.buttons.flatMap((b,i)=>b.pressed||b.value>=BUTTON_ON?[i]:[]):[],
        axes:pad?pad.axes.map(v=>Math.round(v*100)/100):[],keys:[...this.lastKeys]}
    };
  }

  /** Starts listening for the next new input to bind (anything already held is ignored until released). */
  beginCapture(axesOnly=false):void{
    this.captureBaseline=new Set(this.activeInputs());
    this.captureAxesOnly=axesOnly;
  }
  /** Capturing a stick: buttons and keys are ignored. */
  private captureAxesOnly=false;

  /** The first input pressed since beginCapture(), or null. */
  capture():Binding|null{
    if(!this.captureBaseline)return null;
    const now=this.activeInputs();
    for(const id of [...this.captureBaseline])if(!now.includes(id))this.captureBaseline.delete(id);
    const fresh=now.find(id=>!this.captureBaseline!.has(id)&&(!this.captureAxesOnly||id.startsWith('axis:')));
    if(!fresh)return null;
    this.captureBaseline=null;
    const [kind,a,b]=fresh.split(':');
    if(kind==='key')return {kind:'key',code:a!};
    // A steering stick is bound by its axis (pushed either way): right is right.
    if(kind==='axis')return {kind:'axis',index:Number(a),direction:this.captureAxesOnly||b!=='-'?1:-1};
    return {kind:'button',index:Number(a)};
  }

  cancelCapture():void{this.captureBaseline=null}

  private activeInputs():string[]{
    const pad=this.pad();
    const out:string[]=[...this.keys].map(k=>`key:${k}`);
    if(pad){
      pad.buttons.forEach((b,i)=>{if(b.pressed||b.value>=.5)out.push(`button:${i}`)});
      pad.axes.forEach((v,i)=>{if(Math.abs(v)>=.7)out.push(`axis:${i}:${v>0?'+':'-'}`)});
    }
    return out;
  }

  /** The standard layout if the controller says it uses it; otherwise nothing is assumed. */
  defaultsFor(pad:PadLike|null):Bindings{
    return pad?.mapping==='standard'?{...STANDARD_BINDINGS,...STANDARD_EXTRA}:{};
  }

  /**
   * After a pause: an input held now must be released before it counts again. Inputs not held count as soon as
   * they are pressed (marking every input as held would swallow a press made before the next poll).
   */
  clearHeld():void{
    const pad=this.pad();
    for(const a of DRIVE_ACTIONS)this.previous[a]=this.held[a]||this.value(this.bindings[a],pad)>0;
  }
}

/** Bindings are remembered per device (controller id, or 'keyboard'). */
export function loadBindings(storage:Pick<Storage,'getItem'>|null,device:string):Bindings|null{
  try{
    const all=JSON.parse(storage?.getItem('dp.controller.bindings.v1')??'{}') as Record<string,Bindings>;
    return all[device]??null;
  }catch{return null}
}

/** Saves a device's bindings; false when the browser is not keeping data (Private Browsing, blocked site data). */
export function saveBindings(storage:Pick<Storage,'getItem'|'setItem'>|null,device:string,bindings:Bindings):boolean{
  try{
    if(!storage)return false;
    const all=JSON.parse(storage.getItem('dp.controller.bindings.v1')??'{}') as Record<string,Bindings>;
    all[device]=bindings;
    storage.setItem('dp.controller.bindings.v1',JSON.stringify(all));
    return JSON.stringify((JSON.parse(storage.getItem('dp.controller.bindings.v1')??'{}') as Record<string,Bindings>)[device])===JSON.stringify(bindings);
  }catch{return false}
}

/** The device that last passed the controller check (remembered between visits), or null. */
export function loadCheckedDevice(storage:Pick<Storage,'getItem'>|null):string|null{
  try{return storage?.getItem('dp.controller.checked.v1')??null}catch{return null}
}

export function saveCheckedDevice(storage:Pick<Storage,'setItem'>|null,device:string):boolean{
  try{if(!storage)return false;storage.setItem('dp.controller.checked.v1',device);return true}catch{return false}
}

/** Whether this browser keeps what is saved (false in some Private Browsing modes, or with website data blocked). */
export function storageWorks(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null):boolean{
  try{
    if(!storage)return false;
    storage.setItem('dp.storage.probe','1');
    const ok=storage.getItem('dp.storage.probe')==='1';
    storage.removeItem('dp.storage.probe');
    return ok;
  }catch{return false}
}
