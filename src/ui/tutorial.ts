/**
 * The tutorial: a short tour that points at each part of the screen and says what it is for, one step at a time
 * (Back, Next, Done). It runs by itself the first time the home screen and the driving screen are seen, and the
 * Tutorial buttons show it again. A step whose target is not on screen (another steering mode, a hidden button)
 * is skipped.
 */

export interface TourStep{
  /** CSS selectors: the first one visible is pointed at. */
  target:string;
  title:string;
  text:string;
}

export const HOME_TOUR:readonly TourStep[]=[
  {target:'.mode-switch',title:'What would you like to do?',
    text:'Lesson: an instructor teaches one topic at a time (junctions, roundabouts, traffic lights…) and coaches you as you drive. Mock test: an examiner gives directions and marks you to DVSA’s standard, with a report at the end. Free drive: just drive.'},
  {target:'#area-query',title:'Drive anywhere',text:'Type a test centre or a postcode. The streets round it are built from map data on your phone in a few seconds.'},
  {target:'#centre-browser',title:'Every test centre',text:'Or browse all the UK’s car test centres by letter.'},
  {target:'[data-exercise=goodmayes]',title:'Ready to go',text:'Goodmayes is ready now: the streets round the test centre, with traffic, parked cars, crossings and traffic lights.'},
  {target:'.choices:last-of-type',title:'Short skills',text:'Short scored exercises: mini-roundabouts, zebra crossings, moving off safely.'},
  {target:'#tutorial-home',title:'See this again',text:'Tap Tutorial at any time to replay this tour. There is one for the driving screen too.'}
];

export const DRIVE_TOUR:readonly TourStep[]=[
  {target:'#touch-controls [data-hold=throttle]',title:'Go',text:'Hold to accelerate. Let go and the car slows gently. Your speed is up to you: keep to the limit shown at the top left.'},
  {target:'#touch-controls [data-hold=brake]',title:'Brake',text:'Hold to brake: gently to slow down, longer to stop.'},
  {target:'#gear-toggle',title:'Drive or Reverse',text:'D drives forward, R reverses (Go then moves the car backwards). Useful after a wrong turn or to back away from something.'},
  {target:'#steer-buttons,#hud-left',title:'Steering',text:'With assisted steering the car follows the lane and the route for you, so you can concentrate on speed and observation. Change steering on the screen before you start (assisted, tilt or Steer buttons).'},
  {target:'#view-buttons',title:'Mirrors and shoulder checks',text:'Hold a button to look: left and right shoulder (blind spots), the door mirrors and the interior mirror. Look before you signal, change speed or turn: the examiner and instructor see every check.'},
  {target:'#signal-buttons',title:'Signals',text:'Tap to signal left or right; tap again to cancel. Signal after checking the mirrors, in good time, and only when it helps someone. No signal is needed to go straight ahead.'},
  {target:'#hud-speedbox',title:'Speed and warning lights',text:'Your speed in mph and the gear (D or R). Warning lights show here when headlights, demisters or wipers are on.'},
  {target:'#hud-controls-toggle',title:'Car controls',text:'Headlights, main beam, fog light, wipers and washers, demisters, horn and window. The examiner’s “show me” question asks you to use one of these.'},
  {target:'#hud-task-toggle',title:'Task',text:'Repeats the last instruction from the examiner or instructor, spoken and on screen.'},
  {target:'#hud-sound',title:'Sound',text:'Engine, traffic and the spoken directions. Turn it off and directions are still shown on screen.'},
  {target:'#hud-behind',title:'Camera',text:'Switch between the driver’s seat and a view from behind the car (practice only; the driver’s view is what you see on test).'},
  {target:'#hud-fullscreen',title:'Full screen',text:'Use the whole phone screen.'},
  {target:'#hud-pause',title:'Pause',text:'Pause, restart, or end the drive and see your report.'},
  {target:'#hud-tutorial',title:'See this again',text:'Tap ? at any time to replay this tour.'}
];

const visible=(el:Element|null):el is HTMLElement=>{
  if(!(el instanceof HTMLElement))return false;
  const r=el.getBoundingClientRect();
  return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';
};

export class Tutorial{
  private readonly root:HTMLElement;
  private readonly spot:HTMLElement;
  private readonly tip:HTMLElement;
  private steps:TourStep[]=[];
  private index=0;
  private onEnd:()=>void=()=>{};

  constructor(){
    this.root=document.createElement('div');
    this.root.id='tour';
    this.root.hidden=true;
    this.root.setAttribute('role','dialog');
    this.root.setAttribute('aria-live','polite');
    this.spot=document.createElement('div');this.spot.className='tour-spot';
    this.tip=document.createElement('div');this.tip.className='tour-tip';
    this.root.append(this.spot,this.tip);
    document.body.append(this.root);
    addEventListener('resize',()=>{if(!this.root.hidden)this.show()});
  }

  get active(){return !this.root.hidden}

  /** Runs a tour; `onEnd` when it is finished or closed. */
  start(steps:readonly TourStep[],onEnd:()=>void=()=>{}):void{
    this.steps=steps.filter(s=>this.targetOf(s));
    if(this.steps.length===0){onEnd();return}
    this.index=0;this.onEnd=onEnd;
    this.root.hidden=false;
    this.show();
  }

  /** Runs a tour the first time only (remembered on this device). Never in automated browsers (tests). */
  startOnce(key:string,steps:readonly TourStep[],onEnd:()=>void=()=>{}):boolean{
    if(navigator.webdriver)return false;
    try{if(localStorage.getItem(`dp-tour-${key}`))return false;localStorage.setItem(`dp-tour-${key}`,'seen')}catch{return false}
    this.start(steps,onEnd);
    return true;
  }

  close():void{
    if(this.root.hidden)return;
    this.root.hidden=true;
    this.onEnd();
  }

  private targetOf(step:TourStep):HTMLElement|null{
    for(const sel of step.target.split(',')){
      for(const el of document.querySelectorAll(sel.trim()))if(visible(el))return el;
    }
    return null;
  }

  private show():void{
    const step=this.steps[this.index]!;
    const el=this.targetOf(step);
    if(!el){this.next();return}
    const r=el.getBoundingClientRect(),pad=6;
    Object.assign(this.spot.style,{left:`${r.left-pad}px`,top:`${r.top-pad}px`,width:`${r.width+2*pad}px`,height:`${r.height+2*pad}px`});
    const last=this.index===this.steps.length-1;
    const h=document.createElement('b');h.textContent=step.title;
    const p=document.createElement('p');p.textContent=step.text;
    const count=document.createElement('span');count.className='tour-count';count.textContent=`${this.index+1} / ${this.steps.length}`;
    const back=document.createElement('button');back.type='button';back.textContent='Back';back.disabled=this.index===0;
    back.addEventListener('click',()=>{this.index=Math.max(0,this.index-1);this.show()});
    const skip=document.createElement('button');skip.type='button';skip.textContent='Skip';skip.className='tour-skip';
    skip.addEventListener('click',()=>this.close());
    const next=document.createElement('button');next.type='button';next.textContent=last?'Done':'Next';next.className='tour-next';
    next.addEventListener('click',()=>this.next());
    const row=document.createElement('div');row.className='tour-row';row.append(count,skip,back,next);
    this.tip.replaceChildren(h,p,row);
    // Below the target if there is room, otherwise above; kept on screen.
    const tw=Math.min(340,innerWidth-24);
    this.tip.style.width=`${tw}px`;
    const th=this.tip.getBoundingClientRect().height||140;
    const below=r.bottom+pad+10+th<innerHeight;
    const top=below?r.bottom+pad+10:Math.max(8,r.top-pad-10-th);
    const left=Math.min(Math.max(12,r.left+r.width/2-tw/2),innerWidth-tw-12);
    Object.assign(this.tip.style,{top:`${top}px`,left:`${left}px`});
    this.tip.dataset['side']=below?'below':'above';
    next.focus({preventScroll:true});
  }

  private next():void{
    if(this.index>=this.steps.length-1){this.close();return}
    this.index++;
    this.show();
  }
}
