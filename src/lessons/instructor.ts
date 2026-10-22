import {IMPROVE,INFO,type Location,type Seconds,type SimEvent,type SimModule,type Vec2} from '../contracts';
import type {EventLog} from '../app/eventLog';
import type {ExaminerListener} from '../test/examiner';
import type {RouteStep} from '../test/route';
import {judgePullUp,junctionPoints,stopPlace} from '../test/pullUp';
import {sampleRoad} from '../world/roadGeometry';
import type {LiveStop} from '../world/trafficSignals';
import type {Coaching,Lesson} from './syllabus';

/**
 * The driving instructor on a lesson. The route and directions come from the examiner module (with a lesson's
 * route); the instructor coaches on top: reminders in good time before each junction when something is not yet
 * done (mirrors, signal, speed, position, give way), a word after each one on how it went, and the lesson report.
 * Reminders are only given when needed, at most one at a time, so a learner who does it all hears only the
 * directions and "well done".
 */

const mph=(v:number)=>v*2.237;
/** Draft speed for turning into or out of a junction (metres per second; about 15 mph). */
const TURN_SPEED=6.7;
const LOOK_TARGETS={left:['interior','left-door','left-shoulder'],right:['interior','right-door','right-shoulder'],ahead:['interior','left-door','right-door']};

export interface InstructorInput{
  location:Location;
  lesson:Lesson;
  events:EventLog;
  now:()=>Seconds;
  learner:()=>{x:number;z:number;heading:number;speed:number;indicator:'off'|'left'|'right'};
  traffic:()=>Array<{x:number;z:number;heading:number;speed:number}>;
  signals:()=>readonly LiveStop[];
  parked:Vec2[];
  /** Speaks (queued after anything being said) and shows a reminder. */
  say:(text:string)=>void;
  /** Reminders before junctions (mirrors, signal, lights, crossings…); off at the hardest level: feedback only. */
  reminders?:boolean;
}

interface Watch{
  step:RouteStep;
  mirror:boolean;signal:'off'|'right'|'wrong';maxSpeed:number;
  /** Metres left of the centreline, measured 8–25 m before a right turn. */
  position:number[];
  /** Another vehicle had to be given way to and was not (oncoming when turning right, main road when emerging). */
  conflict:string|null;
  /** Roundabouts: the signal on the approach (the last 30 m before the give way). */
  approachSignal:'off'|'left'|'right'|null;
  prompted:Set<string>;
}

/** What the instructor says at once when the marking records a safety fault, and the note for the report. */
export const CORRECTIONS:Record<string,(severity:string,limit:number)=>{say:string;lesson:string}>={
  'positioning-pavement':()=>({say:'Careful: you\'ve mounted the pavement. Steer gently back onto the road.',lesson:'keep the wheels off the pavement'}),
  'control-off-road':()=>({say:'You\'ve left the road. Slow down and steer back onto it.',lesson:'keep to the road'}),
  'control-collision':()=>({say:'Stop. You\'ve hit something. Check it\'s safe, then reverse away if you need to.',lesson:'you hit something: slow down and leave more room'}),
  'speed-limit':(_,limit)=>({say:`Check your speed: the limit here is ${limit}.`,lesson:`keep to the speed limit (${limit} mph)`}),
  'traffic-lights':severity=>severity==='minor'
    ?{say:'That amber light: there was room to stop. Stop at the line next time.',lesson:'stop at amber when there is room to'}
    :{say:'That light was red. You must stop at the stop line.',lesson:'stop at the line when the light is red'},
  'traffic-lights-hesitation':()=>({say:'The light is green: go when the way is clear.',lesson:'move off promptly on green when the way is clear'}),
  'positioning-normal':()=>({say:'Keep to the left.',lesson:'keep to the left'}),
  'following-distance':()=>({say:'Leave more room to the car in front: at least two seconds.',lesson:'keep a two-second gap'}),
  'junctions-observation':()=>({say:'Give way to traffic from the right at the roundabout.',lesson:'give way to the right at roundabouts'})
};

export class Instructor implements SimModule,ExaminerListener{
  readonly id='instructor';
  private watch:Watch|null=null;
  private looks:Array<{time:number;target:string}>=[];
  private lastEvent=0;
  private lastPrompt=-99;
  private good:string[]=[];
  private improve:string[]=[];
  private manoeuvres=0;
  private crossingsWarned=new Set<string>();
  private lightsWarned=new Set<string>();
  /** Safety mistakes (from the marking) since the last direction: none, or no praise for that junction. */
  private mistakes:string[]=[];
  /** Moving off and stopping: driving since the last stop, the pull-up being asked for, moving off again. */
  private sinceStop=0;
  private stops=0;
  private stopPhase:'driving'|'asked'|'stopped'|'moving-off'='driving';
  private stoppedFor=0;
  private stoppedAt=0;
  private readonly junctions:Vec2[];

  constructor(private readonly input:InstructorInput){this.junctions=junctionPoints(input.location);this.reset()}

  private has(c:Coaching){return this.input.lesson.coaching.includes(c)}

  reset():void{
    this.watch=null;this.looks=[];this.lastPrompt=-99;this.good=[];this.improve=[];this.manoeuvres=0;
    this.crossingsWarned.clear();this.lightsWarned.clear();this.mistakes=[];
    this.sinceStop=0;this.stops=0;this.stopPhase='driving';this.stoppedFor=0;this.stoppedAt=0;
    const last=this.input.events.events.at(-1);
    this.lastEvent=last?Number(last.id.slice(3)):0;
  }

  /** A reminder, at most one every 3 s (and each kind once per junction). */
  private prompt(key:string,text:string){
    if(this.input.reminders===false)return;
    const w=this.watch,now=this.input.now();
    if(w?.prompted.has(key)||now-this.lastPrompt<3)return;
    w?.prompted.add(key);
    this.lastPrompt=now;
    this.input.say(text);
  }

  private lookedSince(time:number,targets:string[]){return this.looks.some(l=>l.time>=time&&targets.includes(l.target))}

  // ---- Directions (from the examiner) ----
  direction(step:RouteStep):void{
    const now=this.input.now();
    this.mistakes=[];
    this.watch={step,mirror:this.lookedSince(now-4,LOOK_TARGETS[step.turn]),signal:'off',maxSpeed:0,position:[],conflict:null,approachSignal:null,prompted:new Set()};
    // How to signal at a mini-roundabout, said with the direction while the lesson is about them.
    if(step.kind==='roundabout'&&this.has('roundabout')&&this.input.reminders!==false){
      this.input.say(step.turn==='left'?'Signal left on the approach.'
        :step.turn==='ahead'?'No signal on the approach. Signal left after you pass the exit before ours.'
        :'Signal right on the approach, then left after you pass the exit before ours.');
    }
  }

  done(step:RouteStep,followed:boolean):void{
    const w=this.watch;
    this.watch=null;
    if(!w||w.step!==step||!followed)return;
    this.manoeuvres++;
    const road=step.to.road.name??'the new road',what=step.kind==='roundabout'?`the mini-roundabout (${step.turn==='ahead'?'ahead':step.turn})`
      :step.turn==='ahead'?`straight ahead at the ${step.kind==='lights'?'lights':'junction'}`:`turning ${step.turn} into ${road}`;
    const ok:string[]=[],bad:string[]=[];
    const turning=step.turn!=='ahead';
    if(w.mirror)ok.push('mirrors');else bad.push(`check your mirrors before ${turning?'signalling':'the junction'}`);
    if(step.kind==='roundabout'){
      const want=step.turn==='left'?'left':step.turn==='right'?'right':'off';
      if(w.approachSignal===want)ok.push(want==='off'?'no signal on the approach':`${want} signal on the approach`);
      else bad.push(want==='off'?'going ahead, do not signal on the approach (signal left after passing the exit before yours)':`signal ${want} on the approach`);
    }else if(turning){
      if(w.signal==='right')ok.push(`${step.turn} signal`);
      else bad.push(w.signal==='wrong'?`you signalled the wrong way: signal ${step.turn}`:`signal ${step.turn} after your mirror check`);
    }else if(w.signal!=='off')bad.push('no signal is needed to go straight ahead (it suggests you are turning)');
    else if(this.has('signals'))ok.push('no signal straight ahead');
    if(turning){
      if(w.maxSpeed<=TURN_SPEED+.4)ok.push('speed');
      else bad.push(`slow down more for the turn (${mph(w.maxSpeed).toFixed(0)} mph; about 10–15 mph)`);
    }
    if(step.turn==='right'&&step.kind==='side'&&w.position.length){
      const left=w.position.reduce((a,b)=>a+b,0)/w.position.length;
      if(left<1.3)ok.push('position just left of the middle');
      else bad.push('position just left of the middle of the road before turning right');
    }
    if(w.conflict)bad.push(w.conflict);
    // A mistake on the way (the pavement, a collision, speeding, a red light…), already corrected and noted: the
    // junction is not praised, whatever else went well.
    const hadMistake=this.mistakes.length>0;
    this.mistakes=[];
    const line=`${what[0]!.toUpperCase()}${what.slice(1)}: `;
    if(bad.length===0){
      this.good.push(`${line}${ok.join(', ')}.`);
      if(!hadMistake)this.input.say(this.manoeuvres%3===1?'Well done, that was good.':'Good.');
    }else{
      if(ok.length)this.good.push(`${line}${ok.join(', ')}.`);
      this.improve.push(`${IMPROVE}${line}${bad.join('; ')}.`);
      this.input.say(`Next time, ${bad[0]}.`);
    }
  }

  pullUp():void{}
  pulledUp():void{
    const l=this.input.learner();
    const faults=judgePullUp(this.input.location,this.junctions,this.input.parked,l.x,l.z,l.heading);
    if(faults.length===0)this.good.push('Final pull-up: close to the kerb, in a safe place.');
    else for(const f of faults)this.improve.push(`${IMPROVE}Final pull-up: ${f.text.replace(/^Normal stops: /,'')}`);
  }

  fixedUpdate(dt:Seconds):void{
    const now=this.input.now(),l=this.input.learner();
    const evs=this.input.events.events;
    for(let i=evs.length-1;i>=0;i--){
      const e=evs[i] as SimEvent;
      if(Number(e.id.slice(3))<=this.lastEvent)break;
      // Safety faults the marking records as they happen: corrected at once (whatever the level), and remembered
      // so the junction is not praised.
      if(e.type==='assessment.finding'&&!e.payload['upgraded']){
        const c=CORRECTIONS[String(e.payload['ruleId'])]?.(String(e.payload['severity']),this.limitHere(l));
        if(c){this.mistakes.push(c.lesson);this.improve.push(`${IMPROVE}${c.lesson[0]!.toUpperCase()}${c.lesson.slice(1)}.`);this.lastPrompt=now;this.input.say(c.say)}
      }
      if(e.type==='observation.dwell'){
        const target=String(e.payload['target']);
        this.looks.unshift({time:e.time,target});
        if(this.watch&&LOOK_TARGETS[this.watch.step.turn].includes(target))this.watch.mirror=true;
      }
    }
    if(evs.length)this.lastEvent=Math.max(this.lastEvent,Number(evs.at(-1)!.id.slice(3)));
    this.looks=this.looks.filter(k=>now-k.time<30);
    const fwd={x:Math.sin(l.heading),z:-Math.cos(l.heading)};

    const w=this.watch;
    if(w){
      const s=w.step,d=Math.hypot(l.x-s.at.x,l.z-s.at.z),turning=s.turn!=='ahead';
      if(l.indicator!=='off'&&d<60){
        if(s.kind==='roundabout'){if(d>8&&d<35)w.approachSignal=l.indicator}
        else if(turning&&l.indicator===s.turn)w.signal='right';
        else w.signal='wrong';
      }else if(s.kind==='roundabout'&&d>8&&d<35&&w.approachSignal===null)w.approachSignal='off';
      if(d<12)w.maxSpeed=Math.max(w.maxSpeed,l.speed);
      // Reminders, only when something is not yet done.
      if(d<55&&d>30&&!w.mirror)this.prompt('mirrors','Check your mirrors.');
      else if(turning&&s.kind!=='roundabout'&&d<42&&d>18&&w.signal==='off'&&w.mirror)this.prompt('signal',`Signal ${s.turn} now.`);
      else if(!turning&&s.kind!=='roundabout'&&w.signal!=='off'&&d<40)this.prompt('no-signal','No need to signal: we are going straight ahead.');
      else if(turning&&d<30&&d>10&&l.speed>TURN_SPEED+1.5)this.prompt('speed','Slow down for the turn.');
      // Turning right into a side road: position, and oncoming traffic.
      if(s.turn==='right'&&s.kind==='side'){
        if(d<25&&d>8){
          const near=sampleRoad(s.from.road,l.x,l.z);
          const dir=near.direction.x*fwd.x+near.direction.z*fwd.z>=0?1:-1;
          const left=-near.lateral*dir;
          w.position.push(left);
          if(this.has('right-turn')&&left>1.6&&d<20)this.prompt('position','Move over to just left of the middle of the road.');
        }
        const oncoming=this.input.traffic().find(t=>{const dx=t.x-l.x,dz=t.z-l.z,a=dx*fwd.x+dz*fwd.z;return Math.cos(t.heading-l.heading)<-.7&&a>0&&a<45&&Math.abs(dx*fwd.z-dz*fwd.x)<5&&t.speed>1.5});
        if(oncoming&&d<22&&this.has('right-turn'))this.prompt('oncoming','Give way to the oncoming car: it has priority when you are turning right.');
        if(oncoming&&d<6&&l.speed>1&&Math.hypot(oncoming.x-l.x,oncoming.z-l.z)<25)w.conflict??='you turned across an oncoming vehicle: wait for it to pass when turning right';
      }
      // Emerging: look right, left, right; anyone on the main road close by when the car comes out.
      if(s.kind==='end'){
        if(this.has('emerge')&&d<18&&d>6)this.prompt('emerge','Look right, left, and right again before you go.');
        if(d<4&&l.speed>1){
          const close=this.input.traffic().find(t=>{const dx=l.x-t.x,dz=l.z-t.z,tf={x:Math.sin(t.heading),z:-Math.cos(t.heading)},a=dx*tf.x+dz*tf.z;
            return Math.cos(t.heading-l.heading)<.7&&t.speed>2&&a>0&&a<25&&Math.abs(dx*tf.z-dz*tf.x)<4});
          if(close)w.conflict??='you came out in front of a vehicle on the main road: wait for a gap so nobody has to slow down';
        }
      }
      if(s.kind==='roundabout'&&this.has('roundabout')&&d<15&&d>6)this.prompt('give-way-right','Give way to traffic from the right.');
    }

    // Traffic lights ahead at red or amber.
    if(this.has('lights')&&this.input.reminders!==false)for(const st of this.input.signals()){
      if(st.state==='green'||Math.cos(st.heading-l.heading)<.8)continue;
      const dx=st.lane.x-l.x,dz=st.lane.z-l.z,a=dx*fwd.x+dz*fwd.z;
      if(a>8&&a<45&&Math.abs(dx*fwd.z-dz*fwd.x)<4&&!this.lightsWarned.has(`${st.id}-${st.state}`)&&l.speed>2){
        this.lightsWarned.add(`${st.id}-${st.state}`);
        this.input.say(st.state==='amber'?'Amber: stop at the line if you safely can.':'The lights are red: stop at the line.');
      }
    }
    // Pedestrian crossings ahead.
    if(this.has('crossings')&&this.input.reminders!==false)for(const c of this.input.location.crossings){
      const road=this.input.location.roads.find(r=>r.id===c.roadId);
      if(!road||this.crossingsWarned.has(c.id))continue;
      const s=sampleRoad(road,l.x,l.z);
      if(s.distance>5)continue;
      const ahead=(c.along-s.along)*(s.direction.x*fwd.x+s.direction.z*fwd.z>=0?1:-1);
      if(ahead>15&&ahead<50){
        this.crossingsWarned.add(c.id);
        this.input.say(c.kind==='zebra'?'Zebra crossing ahead: look for people waiting, and be ready to stop.':'Crossing with lights ahead: be ready to stop.');
      }
    }

    // Moving off and stopping: a pull-up on the left every 300 m or so (away from junctions), and moving off again.
    if(this.has('stops')&&this.stops<3){
      if(this.stopPhase==='driving'){
        this.sinceStop+=l.speed*dt;
        const next=this.watch?.step;
        if(this.sinceStop>300&&(!next||Math.hypot(l.x-next.at.x,l.z-next.at.z)>120)){
          this.stopPhase='asked';this.stoppedFor=0;
          this.input.say('Pull up on the left at the next safe place, please: mirrors, signal if it helps, and stop close to the kerb.');
        }
      }else if(this.stopPhase==='asked'){
        const place=stopPlace(this.input.location,l.x,l.z,l.heading);
        this.stoppedFor=l.speed<.3&&place&&place.kerbGap<1.6?this.stoppedFor+dt:0;
        if(this.stoppedFor>1.5){
          this.stops++;this.stopPhase='stopped';this.stoppedAt=now;
          const faults=judgePullUp(this.input.location,this.junctions,this.input.parked,l.x,l.z,l.heading);
          if(faults.length===0){this.good.push(`Pull-up ${this.stops}: close to the kerb, in a safe place.`);this.input.say('Good stop. When you are ready, move off: mirrors, look over your right shoulder, and signal if it would help.')}
          else{
            for(const f of faults)this.improve.push(`${IMPROVE}Pull-up ${this.stops}: ${f.text.replace(/^Normal stops: /,'')}`);
            this.input.say(`${faults[0]!.text.replace(/^Normal stops: /,'').replace(/ \(.*\)\.?$/,'.')} When you are ready, move off safely.`);
          }
        }
      }else if(this.stopPhase==='stopped'&&l.speed>.5){
        this.stopPhase='driving';this.sinceStop=0;
        if(this.lookedSince(this.stoppedAt,['right-door','right-shoulder'])||this.lookedSince(now-10,['right-shoulder']))this.good.push(`Moving off after pull-up ${this.stops}: looked round first.`);
        else{this.improve.push(`${IMPROVE}Moving off after pull-up ${this.stops}: check the right mirror and over your right shoulder (the blind spot) before moving off.`);this.input.say('Remember to look over your right shoulder before moving off.')}
      }
    }
  }

  /** The speed limit where the car is (30 where none is mapped: the usual limit in towns). */
  private limitHere(l:{x:number;z:number}):number{
    let best:{limit:number;d:number}|null=null;
    for(const r of this.input.location.roads){const d=sampleRoad(r,l.x,l.z).distance;if(!best||d<best.d)best={limit:r.speedLimitMph??30,d}}
    return best?.limit??30;
  }

  /** The lesson report notes: what went well, what to work on. */
  notes():string[]{
    const out=[...this.good,...this.improve];
    if(this.manoeuvres===0&&this.stops===0)out.push(`${INFO}The lesson ended before any junctions were reached.`);
    out.push(`${INFO}${this.input.lesson.rules}`);
    return out;
  }

  get counts(){return {manoeuvres:this.manoeuvres,good:this.good.length,improve:this.improve.length}}

  dispose():void{}
}
