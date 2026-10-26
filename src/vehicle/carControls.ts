import type {EventSink,Seconds} from '../contracts';

/**
 * The car's other controls: lights, washers and wipers, demisters, the horn and the driver's window. What the
 * examiner's "show me" questions ask for, and what a driver uses anyway. Each press is an event
 * (`vehicle.control`), the evidence the marking reads; the state drives the tell-tales, the wipers and the horn.
 */

export type CarControlId='dipped'|'main-beam'|'rear-fog'|'wipers'|'front-wash'|'rear-wash'|'front-demist'|'rear-demister'|'horn'|'window';

export interface CarControlDef{
  id:CarControlId;
  label:string;
  /** Switched on and off (toggle), or a press that does its job for a moment (washers, horn). */
  kind:'toggle'|'momentary';
}

export const CAR_CONTROLS:readonly CarControlDef[]=[
  {id:'dipped',label:'Dipped headlights',kind:'toggle'},
  {id:'main-beam',label:'Main beam',kind:'toggle'},
  {id:'rear-fog',label:'Rear fog light',kind:'toggle'},
  {id:'wipers',label:'Wipers',kind:'toggle'},
  {id:'front-wash',label:'Front wash / wipe',kind:'momentary'},
  {id:'rear-wash',label:'Rear wash / wipe',kind:'momentary'},
  {id:'front-demist',label:'Demist windscreen',kind:'toggle'},
  {id:'rear-demister',label:'Rear demister',kind:'toggle'},
  {id:'horn',label:'Horn',kind:'momentary'},
  {id:'window',label:'Window open / close',kind:'toggle'}
];

/** How long a wash keeps the wipers going, and a horn press sounds (seconds). */
const WASH_WIPE=4,HORN=.6;

export class CarControls{
  private readonly on=new Set<CarControlId>();
  private frontWipe=0;
  private rearWipe=0;
  private horn=0;
  /** Called with a short message when a press does nothing (rear fog without the headlights). */
  onNotice:(text:string)=>void=()=>{};

  constructor(private readonly events:EventSink){}

  isOn(id:CarControlId):boolean{
    if(id==='front-wash')return this.frontWipe>0;
    if(id==='rear-wash')return this.rearWipe>0;
    if(id==='horn')return this.horn>0;
    return this.on.has(id);
  }

  /** Front and rear wipers sweeping (after a wash). */
  get wiping(){return {front:this.frontWipe>0||this.on.has('wipers'),rear:this.rearWipe>0}}

  press(id:CarControlId):void{
    const def=CAR_CONTROLS.find(c=>c.id===id)!;
    if(def.kind==='momentary'){
      if(id==='front-wash')this.frontWipe=WASH_WIPE;
      else if(id==='rear-wash')this.rearWipe=WASH_WIPE;
      else this.horn=HORN;
      this.events.emit('vehicle.control',{control:id,on:true});
      return;
    }
    const turnOn=!this.on.has(id);
    // Main beam and the rear fog light work with the headlights on (main beam switches them on; the fog light
    // needs them first, as in most cars).
    if(id==='rear-fog'&&turnOn&&!this.on.has('dipped')){this.onNotice('Switch on dipped headlights first');return}
    if(turnOn)this.on.add(id);else this.on.delete(id);
    if(id==='main-beam'&&turnOn&&!this.on.has('dipped'))this.on.add('dipped');
    if(id==='dipped'&&!turnOn){this.on.delete('main-beam');this.on.delete('rear-fog')}
    this.events.emit('vehicle.control',{control:id,on:turnOn});
  }

  update(dt:Seconds):void{
    this.frontWipe=Math.max(0,this.frontWipe-dt);
    this.rearWipe=Math.max(0,this.rearWipe-dt);
    this.horn=Math.max(0,this.horn-dt);
  }

  /** Switched on without a press (no event): the headlights at the start of a drive after dark. */
  switchOn(id:CarControlId):void{if(CAR_CONTROLS.find(c=>c.id===id)?.kind==='toggle')this.on.add(id)}

  /** Everything off (a new attempt). */
  reset():void{this.on.clear();this.frontWipe=this.rearWipe=this.horn=0}

  /** Switched on and still on (for the examiner's "remember to switch it off"). */
  get onNow():CarControlId[]{return [...this.on]}
}
