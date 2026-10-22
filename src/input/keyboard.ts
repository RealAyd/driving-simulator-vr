import type {Controls} from '../vehicle/kinematics';
import type {ControlSource} from '../vehicle/vehicleController';

export type InputAction='indicator-left'|'indicator-right'|'pause'|'reset'|'recentre'|'gear'|'horn'|'lights';

/** Held views: mirrors and over-the-shoulder checks. */
export type ViewTarget='left-shoulder'|'left-door'|'interior'|'right-door'|'right-shoulder';

const THROTTLE=['KeyW','ArrowUp'];
const BRAKE=['KeyS','ArrowDown','Space'];
const LEFT=['KeyA','ArrowLeft'];
const RIGHT=['KeyD','ArrowRight'];
const ACTIONS:Record<string,InputAction>={
  BracketLeft:'indicator-left',
  BracketRight:'indicator-right',
  KeyP:'pause',
  Escape:'pause',
  KeyR:'reset',
  KeyC:'recentre',
  KeyX:'gear',
  KeyH:'horn',
  KeyL:'lights'
};
const DRIVING_KEYS=new Set([...THROTTLE,...BRAKE,...LEFT,...RIGHT]);
const VIEW_KEYS:Record<string,ViewTarget>={
  KeyQ:'left-shoulder',Digit1:'left-door',Digit2:'interior',Digit3:'right-door',KeyE:'right-shoulder'
};

/**
 * Keyboard and on-screen button input. Held keys are cleared whenever the
 * page loses focus or becomes hidden, so no control can stay stuck on.
 */
/** Whether a key goes to a text box (an input, a text area, or an editable element). */
export function typing(event:{target?:EventTarget|null}):boolean{
  const t=event.target as {tagName?:string;isContentEditable?:boolean}|null|undefined;
  return !!t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable===true);
}

export class KeyboardInput implements ControlSource{
  private readonly held=new Set<string>();
  /** On-screen buttons hold virtual keys through the same path. */
  private readonly virtual=new Set<string>();
  private readonly listeners:Array<[EventTarget,string,EventListener]>=[];
  onAction:(action:InputAction)=>void=()=>{};
  /** Reverse gear selected (the Drive/Reverse switch or X); Go then drives backwards. */
  reverse=false;
  /** Called with a view while its key is held, and null on release. */
  onView:(view:ViewTarget|null)=>void=()=>{};

  constructor(private readonly keyTarget:EventTarget,private readonly focusTarget:EventTarget,private readonly doc?:Document){
    this.listen(keyTarget,'keydown',event=>this.onKeyDown(event as KeyboardEvent));
    this.listen(keyTarget,'keyup',event=>{
      const code=(event as KeyboardEvent).code;
      this.held.delete(code);
      if(VIEW_KEYS[code])this.onView(null);
    });
    this.listen(focusTarget,'blur',()=>this.clear());
    if(doc)this.listen(doc,'visibilitychange',()=>{if(doc.hidden)this.clear()});
  }

  private listen(target:EventTarget,type:string,handler:EventListener):void{
    target.addEventListener(type,handler);
    this.listeners.push([target,type,handler]);
  }

  private onKeyDown(event:KeyboardEvent):void{
    // Typing in a box (the place search): the letters are the text, not driving keys.
    if(typing(event))return;
    if(DRIVING_KEYS.has(event.code)){
      this.held.add(event.code);
      event.preventDefault?.();
      return;
    }
    const view=VIEW_KEYS[event.code];
    if(view&&!event.repeat){
      event.preventDefault?.();
      this.onView(view);
      return;
    }
    const action=ACTIONS[event.code];
    if(action&&!event.repeat){
      event.preventDefault?.();
      this.onAction(action);
    }
  }

  private any(codes:string[]):boolean{
    return codes.some(code=>this.held.has(code)||this.virtual.has(code));
  }

  read():Controls{
    return {
      throttle:this.any(THROTTLE)?1:0,
      brake:this.any(BRAKE)?1:0,
      steer:(this.any(RIGHT)?1:0)-(this.any(LEFT)?1:0),
      reverse:this.reverse
    };
  }

  /** Holds or releases a driving control from an on-screen button. */
  setVirtual(control:'throttle'|'brake'|'left'|'right',down:boolean):void{
    const code={throttle:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD'}[control];
    if(down)this.virtual.add(code);
    else this.virtual.delete(code);
  }

  clear():void{
    this.held.clear();
    this.virtual.clear();
  }

  /** Back to Drive (a new attempt). */
  resetGear():void{this.reverse=false}

  dispose():void{
    for(const [target,type,handler] of this.listeners)target.removeEventListener(type,handler);
    this.listeners.length=0;
    this.clear();
  }
}
