import type {EventSink,Seconds,SimModule} from '../contracts';
import {RoadNetwork,type RouteLeg,type RouteStep} from './route';

/**
 * The examiner on a mock test: the briefing, each direction in good time before the junction (spoken and shown),
 * and a check that the learner took the road asked for. A wrong turn is not a fault in itself: the examiner says so
 * and gives new directions from where the car is. After the route, the learner is asked to pull up on the left;
 * stopping ends the test.
 */

export interface ExaminerLearner{x:number;z:number;heading:number;speed:number}
/** Told about each direction and how it went (the mock test assessor scores the manoeuvres). */
export interface ExaminerListener{
  direction?(step:RouteStep):void;
  done?(step:RouteStep,followed:boolean):void;
  pullUp?():void;
}

export const BRIEFING='This is your mock driving test. Please follow the road ahead, unless traffic signs direct you otherwise or I ask you to turn. I\'ll give you directions in good time. Move off when you\'re ready.';
export const PULL_UP='Please pull up on the left at the next safe and convenient place.';
export const END='Thank you. That\'s the end of your test.';
const REDIRECT='That\'s fine, I\'ll give you new directions.';

/** Spoken this far before the junction (metres): about five seconds at 30 mph, more where roads are quicker. */
const ANNOUNCE=70;

export class Examiner implements SimModule{
  readonly id='examiner';
  steps:RouteStep[]=[];
  /** The planned way (for assisted steering along the route). */
  legs:RouteLeg[]=[];
  index=0;
  phase:'briefing'|'driving'|'pull-up'|'stopping'|'finished'='briefing';
  /** The last thing said (the Task button repeats it). */
  lastSaid='';
  private time=0;
  private spoken=false;
  private near=false;
  /** Closest the car has come to the current junction (metres). */
  private closest=Infinity;
  private offRoute=0;
  private stoppedFor=0;
  private sincePullUp=0;
  private routeDone=0;

  constructor(private readonly net:RoadNetwork,private readonly learner:()=>ExaminerLearner,private readonly options:{
    target:number;seed:number;say:(text:string)=>void;events:EventSink;onComplete:()=>void;listener?:ExaminerListener;
    /** A new route was planned (at the start, and after a wrong turn): `legs` has the way to follow. */
    onPlan?:()=>void}){}

  private say(text:string){this.lastSaid=text;this.options.say(text)}
  private key=(r:{name?:string|undefined;id:string})=>r.name??r.id;

  private plan(length:number,seed:number):boolean{
    const l=this.learner();
    const pos=this.net.locate(l.x,l.z,l.heading);
    if(!pos)return false;
    const route=this.net.plan(pos,length,seed);
    this.steps=route.steps;this.legs=route.legs;
    this.index=0;this.spoken=false;this.near=false;this.offRoute=0;this.closest=Infinity;
    this.options.onPlan?.();
    return true;
  }

  reset():void{
    this.time=0;this.phase='briefing';this.stoppedFor=0;this.sincePullUp=0;this.routeDone=0;this.lastSaid='';
    this.plan(this.options.target,this.options.seed);
  }

  /** Say the current direction (or the last thing said) again. */
  repeat():void{if(this.lastSaid)this.options.say(this.lastSaid)}

  fixedUpdate(dt:Seconds):void{
    this.time+=dt;
    const l=this.learner();
    if(this.phase==='briefing'){
      if(this.time>.3){this.say(BRIEFING);this.phase='driving'}
      return;
    }
    if(this.phase==='driving'){
      const step=this.steps[this.index];
      if(!step){this.phase='pull-up';this.sincePullUp=0;return}
      const d=Math.hypot(l.x-step.at.x,l.z-step.at.z);
      // In good time: before the junction (or straight after the last manoeuvre when the next one is close).
      if(!this.spoken&&d<ANNOUNCE+Math.max(0,l.speed-9)*4){
        this.spoken=true;
        this.say(step.say);
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
        if(this.offRoute>5)this.redirect(step);
      }
      return;
    }
    if(this.phase==='pull-up'){
      this.sincePullUp+=l.speed*dt;
      // Some distance after the last turn, then the request.
      if(this.sincePullUp>60&&this.lastSaid!==PULL_UP){
        this.say(PULL_UP);
        this.options.events.emit('examiner.direction',{text:PULL_UP,turn:'pull-up'});
        this.options.listener?.pullUp?.();
      }
      if(this.lastSaid===PULL_UP){
        this.stoppedFor=l.speed<.3?this.stoppedFor+dt:0;
        if(this.stoppedFor>2){this.phase='stopping';this.time=0;this.say(END)}
      }
      return;
    }
    if(this.phase==='stopping'&&this.time>2.5){this.phase='finished';this.options.onComplete()}
  }

  private redirect(step:RouteStep){
    this.options.events.emit('examiner.redirected',{expected:step.to.road.name??step.to.road.id});
    const remaining=Math.max(700,this.options.target-this.routeDone);
    if(this.plan(remaining,this.options.seed+this.steps.length+Math.round(this.time))){
      // With the next direction straight away if it is close (one sentence, not one cut short by the other).
      const next=this.steps[0],l=this.learner();
      if(next&&Math.hypot(l.x-next.at.x,l.z-next.at.z)<ANNOUNCE*1.3){
        this.spoken=true;
        this.say(`${REDIRECT} ${next.say}`);
        this.options.events.emit('examiner.direction',{text:next.say,turn:next.turn,step:0});
        this.options.listener?.direction?.(next);
      }else this.say(REDIRECT);
    }else{
      // Off any road: carry on; directions resume once the car is back on one.
      this.offRoute=0;
    }
  }

  dispose():void{}
}
