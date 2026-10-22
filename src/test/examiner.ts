import type {EventSink,Seconds,SimModule} from '../contracts';
import {RoadNetwork,type RoadPos,type Route,type RouteLeg,type RouteStep} from './route';
import {stopPlace} from './pullUp';
import type {ShowMeQuestion,TellMeQuestion} from './vehicleChecks';
import {Manoeuvre,type ManoeuvreFault,type ManoeuvreInput,type ManoeuvreKind} from './manoeuvres';

/**
 * The examiner on a mock test: the briefing, each direction in good time before the junction (spoken and shown),
 * and a check that the learner took the road asked for. A wrong turn is not a fault in itself: the examiner says so
 * and gives new directions from where the car is. After the route, the learner is asked to pull up on the left;
 * stopping ends the test.
 */

export interface ExaminerLearner{x:number;z:number;heading:number;speed:number;
  /** Traffic stopped close in front (queueing, not pulling up). */
  blocked?:boolean}
/** Told about each direction and how it went (the mock test assessor scores the manoeuvres). */
export interface ExaminerListener{
  direction?(step:RouteStep):void;
  done?(step:RouteStep,followed:boolean):void;
  pullUp?():void;
  /** Stopped at the side of the road after the pull-up request: the test ends here. */
  pulledUp?():void;
  /** The tell me question was answered (before driving). */
  tellMe?(question:TellMeQuestion,correct:boolean,answer:string):void;
  /** The show me question was asked (while driving). */
  showMe?(question:ShowMeQuestion):void;
  /** A manoeuvre (or the emergency stop) was asked for, and how it went once finished. */
  manoeuvreStart?(kind:ManoeuvreKind):void;
  manoeuvreDone?(kind:ManoeuvreKind,faults:readonly ManoeuvreFault[],notes:readonly string[]):void;
}

export const TELL_ME_INTRO='Before we start, I\'m going to ask you a vehicle safety question.';
export const BRIEFING='This is your mock driving test. Please follow the road ahead, unless traffic signs direct you otherwise or I ask you to turn. I\'ll give you directions in good time. Move off when you\'re ready.';
export const PULL_UP='Please pull up on the left at the next safe and convenient place.';
export const END='Thank you. That\'s the end of your test.';
export const REDIRECT='That\'s fine, I\'ll give you new directions.';

/** Spoken this far before the junction (metres): about five seconds at 30 mph, more where roads are quicker. */
const ANNOUNCE=70;
/** A manoeuvre is asked for only this far (metres) from the next junction on the route: room to do it. */
const QUIET=90;

export class Examiner implements SimModule{
  readonly id='examiner';
  steps:RouteStep[]=[];
  /** The planned way (for assisted steering along the route). */
  legs:RouteLeg[]=[];
  index=0;
  phase:'tell-me'|'briefing'|'driving'|'manoeuvre'|'pull-up'|'stopping'|'finished'='briefing';
  /** The manoeuvre being done (phase 'manoeuvre'). */
  manoeuvre:Manoeuvre|null=null;
  private manoeuvresDone=0;
  /** The last thing said (the Task button repeats it). */
  lastSaid='';
  private time=0;
  private spoken=false;
  private near=false;
  /** Closest the car has come to the current junction (metres). */
  private closest=Infinity;
  private offRoute=0;
  /** When new directions were last given (they are not given again for a while, and said briefly). */
  private lastRedirect=-Infinity;
  private stoppedFor=0;
  private sincePullUp=0;
  private routeDone=0;
  private pullUpAsked=false;
  private tellMeAsked=false;
  private showMeAsked=false;
  /** Seconds since the last direction (the show me question waits for a quiet stretch). */
  private sinceDirection=0;

  constructor(private readonly net:RoadNetwork,private readonly learner:()=>ExaminerLearner,private readonly options:{
    target:number;seed:number;say:(text:string)=>void;events:EventSink;onComplete:()=>void;listener?:ExaminerListener;
    /** A new route was planned (at the start, and after a wrong turn): `legs` has the way to follow. */
    onPlan?:()=>void;
    /** Vehicle safety questions for this test: one tell me (asked before driving, answered on screen with
     *  `answerTellMe`) and one show me (while driving). Without them the test starts with the briefing. */
    tellMe?:TellMeQuestion;showMe?:ShowMeQuestion;
    /** Shows the tell me question's choices (the answer comes back through `answerTellMe`). */
    askTellMe?:(question:TellMeQuestion)=>void;
    /** Plans the route instead of the usual mix of junctions (a lesson's route). */
    planner?:(start:RoadPos,target:number,seed:number)=>Route;
    /** What is said to begin, to ask for the pull-up, and at the end (an instructor's words on a lesson). */
    words?:{briefing?:string;pullUp?:string;end?:string};
    /** Manoeuvres to ask for, in order, spread over the drive (manoeuvres.ts), and what they need from the car. */
    manoeuvres?:readonly ManoeuvreKind[];
    manoeuvreInput?:Omit<ManoeuvreInput,'say'>}){}

  private get briefing(){return this.options.words?.briefing??BRIEFING}
  private get pullUpWords(){return this.options.words?.pullUp??PULL_UP}
  private get endWords(){return this.options.words?.end??END}

  private say(text:string){this.lastSaid=text;this.options.say(text)}
  private key=(r:{name?:string|undefined;id:string})=>r.name??r.id;

  private plan(length:number,seed:number):boolean{
    const l=this.learner();
    const pos=this.net.locate(l.x,l.z,l.heading);
    if(!pos)return false;
    const route=this.options.planner?this.options.planner(pos,length,seed):this.net.plan(pos,length,seed);
    this.steps=route.steps;this.legs=route.legs;
    this.index=0;this.spoken=false;this.near=false;this.offRoute=0;this.closest=Infinity;
    this.options.onPlan?.();
    return true;
  }

  reset():void{
    this.time=0;this.phase=this.options.tellMe?'tell-me':'briefing';this.stoppedFor=0;this.sincePullUp=0;this.routeDone=0;this.lastSaid='';this.pullUpAsked=false;
    this.tellMeAsked=false;this.showMeAsked=false;this.sinceDirection=0;this.lastRedirect=-Infinity;this.manoeuvre=null;this.manoeuvresDone=0;
    this.plan(this.options.target,this.options.seed);
  }

  /** The learner's answer to the tell me question (one of the choices shown); then the drive begins. */
  answerTellMe(answer:string):void{
    const q=this.options.tellMe;
    if(this.phase!=='tell-me'||!q)return;
    this.options.listener?.tellMe?.(q,answer===q.answer,answer);
    this.phase='briefing';this.time=0;
  }

  /** Say the current direction (or the last thing said) again. */
  repeat():void{if(this.lastSaid)this.options.say(this.lastSaid)}

  fixedUpdate(dt:Seconds):void{
    this.time+=dt;
    const l=this.learner();
    if(this.phase==='tell-me'){
      // Asked once, then waiting for the answer (the car is parked).
      if(this.time>.3&&!this.tellMeAsked){
        this.tellMeAsked=true;
        this.say(`${TELL_ME_INTRO} ${this.options.tellMe!.question}`);
        this.options.events.emit('examiner.question',{kind:'tell-me',id:this.options.tellMe!.id});
        this.options.askTellMe?.(this.options.tellMe!);
      }
      return;
    }
    if(this.phase==='briefing'){
      if(this.time>.3){this.say(this.briefing);this.phase='driving'}
      return;
    }
    if(this.phase==='manoeuvre'){
      const m=this.manoeuvre!;
      m.update(dt);
      if(m.done){
        this.manoeuvre=null;this.manoeuvresDone++;
        this.options.listener?.manoeuvreDone?.(m.kind,m.faults,m.notes);
        this.options.events.emit('examiner.manoeuvre',{kind:m.kind,done:true,faults:m.faults.length});
        // On from here: the rest of the route planned from where the car now is.
        this.phase='driving';this.sinceDirection=0;
        this.plan(Math.max(600,this.options.target-this.routeDone),this.options.seed+101*this.manoeuvresDone);
      }
      return;
    }
    if(this.phase==='driving'){
      this.sinceDirection+=dt;
      const step=this.steps[this.index];
      // A manoeuvre, spread over the drive: once that share of the route is done, on a quiet stretch (moving, no
      // direction coming up).
      const kinds=this.options.manoeuvres??[],input=this.options.manoeuvreInput;
      const next=kinds[this.manoeuvresDone];
      // (A lesson: one after each junction. A test: spread over the drive.)
      const share=this.options.words?1:Math.min(this.steps.length-1,Math.ceil((this.manoeuvresDone+1)*this.steps.length/(kinds.length+1)));
      if(next&&input&&this.index>=Math.max(1,share)&&this.sinceDirection>3&&l.speed>3&&!this.spoken&&(!step||Math.hypot(l.x-step.at.x,l.z-step.at.z)>QUIET)){
        this.manoeuvre=new Manoeuvre(next,{...input,say:text=>this.say(text)});
        this.phase='manoeuvre';
        this.options.listener?.manoeuvreStart?.(next);
        this.options.events.emit('examiner.manoeuvre',{kind:next,done:false});
        return;
      }
      // The show me question: once, after the first manoeuvre, on a quiet stretch (moving, nothing to do for a while).
      const q=this.options.showMe;
      if(q&&!this.showMeAsked&&this.index>=1&&this.sinceDirection>8&&l.speed>3&&(!step||Math.hypot(l.x-step.at.x,l.z-step.at.z)>130)){
        this.showMeAsked=true;
        this.say(q.question);
        this.options.events.emit('examiner.question',{kind:'show-me',id:q.id});
        this.options.listener?.showMe?.(q);
      }
      if(!step){this.phase='pull-up';this.sincePullUp=0;return}
      const d=Math.hypot(l.x-step.at.x,l.z-step.at.z);
      // In good time: before the junction (or straight after the last manoeuvre when the next one is close).
      if(!this.spoken&&d<ANNOUNCE+Math.max(0,l.speed-9)*4){
        this.spoken=true;
        this.say(step.say);
        this.sinceDirection=0;
        this.options.events.emit('examiner.direction',{text:step.say,turn:step.turn,step:this.index});
        this.options.listener?.direction?.(step);
      }
      this.closest=Math.min(this.closest,d);
      if(d<20)this.near=true;
      const pos=this.net.locate(l.x,l.z,l.heading);
      // Through the junction: it came within 20 m and is now well past its closest point.
      if(this.near&&d>this.closest+10&&pos){
        // On the road asked for, and along it (not crossing near it, or off the end of the map beside it).
        const followed=this.key(pos.road)===this.key(step.to.road)&&(pos.fit?.alignment??1)>.7&&(pos.fit?.distance??0)<8;
        this.options.listener?.done?.(step,followed);
        this.routeDone=Math.max(this.routeDone,step.distance);
        if(followed){this.index++;this.spoken=false;this.near=false;this.offRoute=0;this.closest=Infinity}
        else this.redirect(step);
        return;
      }
      // Gone another way before reaching the junction (more than a few seconds on a road not on the route).
      if(pos&&!this.near){
        const onRoute=[step.from.road,step.to.road].some(r=>this.key(r)===this.key(pos.road));
        this.offRoute=onRoute||l.speed<1?0:this.offRoute+dt;
        // (Not again within 20 s of the last new directions: driving on to find a way back is fine.)
        if(this.offRoute>5&&this.time-this.lastRedirect>20)this.redirect(step);
      }
      return;
    }
    if(this.phase==='pull-up'){
      this.sincePullUp+=l.speed*dt;
      // Some distance after the last turn, then the request (sooner if the road ahead ends: never driven into a
      // dead end or off the edge of the map to find a place).
      const pos=this.pullUpAsked?null:this.net.locate(l.x,l.z,l.heading);
      if((this.sincePullUp>60||!!pos&&this.net.roomAhead(pos)<120)&&!this.pullUpAsked){
        this.pullUpAsked=true;
        this.say(this.pullUpWords);
        this.options.events.emit('examiner.direction',{text:this.pullUpWords,turn:'pull-up'});
        this.options.listener?.pullUp?.();
      }
      if(this.pullUpAsked){
        this.stoppedFor=l.speed<.3?this.stoppedFor+dt:0;
        // Stopped at the side of the road; or stopped a while out in the road with nothing in front (a poor
        // place, but it is where the learner chose). Waiting in a queue is not pulling up.
        const place=stopPlace(this.net.location,l.x,l.z,l.heading);
        const atSide=!!place&&!place.rightSide&&place.kerbGap<1.6;
        if(this.stoppedFor>2&&(atSide||this.stoppedFor>6&&!l.blocked)){
          this.phase='stopping';this.time=0;
          this.options.listener?.pulledUp?.();
          this.say(this.endWords);
        }
      }
      return;
    }
    if(this.phase==='stopping'&&this.time>2.5){this.phase='finished';this.options.onComplete()}
  }

  private redirect(step:RouteStep){
    this.options.events.emit('examiner.redirected',{expected:step.to.road.name??step.to.road.id});
    const remaining=Math.max(700,this.options.target-this.routeDone);
    // "That's fine…" once in a while; new directions soon after the last just give the next direction.
    const reassure=this.time-this.lastRedirect>60;
    this.lastRedirect=this.time;
    if(this.plan(remaining,this.options.seed+this.steps.length+Math.round(this.time))){
      // With the next direction straight away if it is close (one sentence, not one cut short by the other).
      const next=this.steps[0],l=this.learner();
      if(next&&Math.hypot(l.x-next.at.x,l.z-next.at.z)<ANNOUNCE*1.3){
        this.spoken=true;
        this.say(reassure?`${REDIRECT} ${next.say}`:next.say);
        this.options.events.emit('examiner.direction',{text:next.say,turn:next.turn,step:0});
        this.options.listener?.direction?.(next);
      }else if(reassure)this.say(REDIRECT);
    }else{
      // Off any road: carry on; directions resume once the car is back on one.
      this.offRoute=0;
    }
  }

  dispose():void{}
}
