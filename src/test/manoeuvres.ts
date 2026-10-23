import type {Location,Road,Vec2} from '../contracts';
import {pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from '../world/roadGeometry';
import {judgeMoveOff,judgeTurn,type Look} from '../assessment/routine';
import {junctionPoints} from './pullUp';
import {routeLanePath} from './routePath';

/**
 * The test's manoeuvres, asked for by the examiner part-way through the drive (DVSA: one of parallel parking, bay
 * parking or pulling up on the right and reversing; the emergency stop on about one test in three), each judged on
 * control and observation as the marking sheet heads them:
 *
 * - Emergency stop: pull up; a briefing; once moving at a fair speed on a clear straight, "Stop!"; marked on how
 *   quickly the brakes went on (promptness) and whether the car stopped straight on the road (control); then a look
 *   all round before moving off again.
 * - Pull up on the right and reverse: mirrors (interior, then right) and a right signal before crossing, no one
 *   made to slow; stopped close to the right kerb; a look round before reversing and looks while reversing about
 *   two car lengths close to the kerb; a look all round before rejoining.
 * - Parallel park: alongside the car ahead, then reverse in behind it within about two car lengths, parallel to and
 *   close to the kerb; a look round before reversing and looks while reversing.
 *
 * The examiner hands control here and back (examiner.ts); the faults go to the marking and the instructor.
 */

export type ManoeuvreKind='emergency-stop'|'pull-up-right'|'parallel-park';
export const MANOEUVRE_NAMES:Readonly<Record<ManoeuvreKind,string>>={'emergency-stop':'Emergency stop','pull-up-right':'Pulling up on the right and reversing','parallel-park':'Parallel parking'};
export interface ManoeuvreFault{rule:string;severity:'minor'|'serious'|'dangerous';text:string;
  /** What the instructor says about it ("Next time, …"). */
  coach:string}

export interface ManoeuvreLearner{x:number;z:number;heading:number;
  /** Signed: negative while reversing (m/s). */
  speed:number;indicator:'off'|'left'|'right'}

export interface ManoeuvreInput{
  location:Location;
  /** Cars parked at the kerb (the parallel park is behind one). */
  parked:readonly Vec2[];
  learner():ManoeuvreLearner;
  looks():readonly Look[];
  traffic():ReadonlyArray<{x:number;z:number;heading:number;speed:number}>;
  now():number;
  say(text:string):void;
  /** Shown big on screen at once (the emergency stop's "Stop!", for a muted phone too). */
  flash?(text:string):void;
  /** Paths for assisted steering during the manoeuvre (forwards, and for reversing); null: the route's. */
  setPath?(forward:Vec2[]|null,reverse:Vec2[]|null):void;
}

// What the examiner says (also in the recorded voice's sentence list).
export const PULL_IN='Please pull up on the left at the next safe and convenient place.';
export const STOP_BRIEFING='Shortly, I\'ll ask you to carry out an emergency stop. When I say stop, stop the car as quickly and safely as you can, as if a child had run out. Move off when you\'re ready.';
export const STOP_NOW='Stop!';
export const STOP_DONE='Thank you. I won\'t ask you to do that again. Move off when you\'re ready.';
export const RIGHT_ASK='Please pull up on the right-hand side of the road, when it\'s safe to do so.';
export const RIGHT_REVERSE='Now reverse for about two car lengths, keeping reasonably close to the kerb.';
export const RIGHT_DONE='Thank you. Rejoin the traffic and carry on along the road when you\'re ready.';
export const PARK_ASK='I\'d like you to park behind the car ahead. Pull up alongside it, then reverse in behind it, within about two car lengths, reasonably close to the kerb.';
export const PARK_DONE='Thank you. Move off when you\'re ready.';
/** What the instructor says after a manoeuvre with a fault ("Next time, …"): every coaching line used below. */
export const MANOEUVRE_COACHING:readonly string[]=[
  'brake as soon as I say stop',
  'brake at once when I say stop: foot straight to the brake',
  'check the interior mirror after you stop, then look all round before moving off',
  'check the interior mirror, then the right mirror, before signalling and crossing',
  'check the right mirror too before you cross',
  'come back slowly and steer away from the kerb in time',
  'finish closer to the kerb',
  'finish within about two car lengths of the car in front',
  'keep both hands on the wheel and the car straight while you stop',
  'keep looking all round while you reverse',
  'keep reasonably close to the kerb as you reverse',
  'keep the steering straight while you brake hard',
  'leave room in front of you to drive out',
  'look all round before you reverse, over both shoulders',
  'look all round, both blind spots too, before you move off',
  'look right again just before you move off',
  'reverse about two car lengths',
  'reverse slowly, keeping a little away from the kerb',
  'signal right before you move across',
  'stop after about two car lengths',
  'stop closer to the kerb',
  'straighten up so the car is parallel to the kerb',
  'wait for oncoming traffic to pass before you cross to the right'
];
export const MANOEUVRE_SENTENCES=[PULL_IN,STOP_BRIEFING,STOP_NOW,STOP_DONE,RIGHT_ASK,RIGHT_REVERSE,RIGHT_DONE,PARK_ASK,PARK_DONE];

const CAR_LENGTH=4.2,HALF_WIDTH=.9;
/** How judgeMoveOff names the interior mirror among the looks missing. */
const INTERIOR='the interior mirror';
/** Brakes on within this long after "Stop!" (s): later is a driving fault; over STOP_SERIOUS, serious. */
export const STOP_PROMPT=1.6,STOP_SERIOUS=2.6;

/** Where the car is on the nearest road: along it, which way it faces, and its gaps to the kerbs (metres). */
export function kerbPosition(location:Location,x:number,z:number,heading:number):{road:Road;along:number;dir:1|-1;left:number;right:number;angle:number}|null{
  let best:{road:Road;s:ReturnType<typeof sampleRoad>}|null=null;
  for(const road of location.roads){const s=sampleRoad(road,x,z);if(!best||s.distance<best.s.distance)best={road,s}}
  if(!best||best.s.distance>12)return null;
  const fwd={x:Math.sin(heading),z:-Math.cos(heading)};
  const dot=best.s.direction.x*fwd.x+best.s.direction.z*fwd.z;
  const dir=dot>=0?1:-1;
  const right=best.s.lateral*dir,half=roadHalfWidth(best.road);
  return {road:best.road,along:best.s.along,dir,left:half+right-HALF_WIDTH,right:half-right-HALF_WIDTH,angle:Math.acos(Math.min(1,Math.abs(dot)))};
}

/** A point `left` metres left of the centreline at `along`, for travel in direction `dir`. */
function at(road:Road,along:number,dir:1|-1,left:number):Vec2{
  const p=pointAtAlong(road,along),t={x:p.direction.x*dir,z:p.direction.z*dir};
  return {x:p.x+t.z*left,z:p.z-t.x*left};
}
const roadLength=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);

export class Manoeuvre{
  phase='start';
  readonly faults:ManoeuvreFault[]=[];
  done=false;
  /** Notes for the report (what was measured). */
  readonly notes:string[]=[];
  private since=0;
  private stillFor=0;
  private stoppedAt=0;
  private askedAt=0;
  private signalAt:number|null=null;
  private crossAt:number|null=null;
  private reverseFrom:{along:number;time:number}|null=null;
  private lastLookCheck=0;
  private looksMissed=false;
  private worstKerb={min:Infinity,max:-Infinity};
  private stop:{at:number;speed:number;heading:number;braked:number|null;prev:number;offRoad:boolean;drift:number}|null=null;
  private fastFor=0;
  private target:{road:Road;dir:1|-1;along:number;left:number}|null=null;
  private moveOffFrom=0;
  private junctions:Vec2[]|null=null;
  /** What the emergency stop is waiting for (diagnostics). */
  waiting='';

  constructor(readonly kind:ManoeuvreKind,private readonly input:ManoeuvreInput){}

  private fault(rule:string,severity:ManoeuvreFault['severity'],text:string,coach:string){
    if(!this.faults.some(f=>f.rule===rule&&f.text===text))this.faults.push({rule,severity,text,coach});
  }
  private go(phase:string){this.phase=phase;this.since=0;this.stillFor=0}
  private lookedSince(t:number,targets:string[]){return this.input.looks().some(l=>l.time>=t&&targets.includes(l.target))}

  /** Moving off after the manoeuvre: a look all round, and right again just before going. */
  private judgeMovingOff(what:string){
    const m=judgeMoveOff(this.input.looks(),this.input.now(),this.moveOffFrom);
    // After an emergency stop, the interior mirror first: what is behind has changed since before the stop (no
    // mirrors are needed before braking; a look from before the stop does not count).
    if(this.kind==='emergency-stop'&&m.missing.includes(INTERIOR))this.fault('moving-off-safety','minor',
      `Moving off – safety: after ${what}, no check of the interior mirror before moving off${m.missing.length>1?` (nor the ${m.missing.filter(t=>t!==INTERIOR).join(', ')})`:''}. Looks from before the stop don't count: traffic behind may have closed up.`,
      'check the interior mirror after you stop, then look all round before moving off');
    else if(!m.allRound)this.fault('moving-off-safety','minor',`Moving off – safety: after ${what}, no look at ${m.missing.join(', ')} before moving off.`,
      'look all round, both blind spots too, before you move off');
    else if(!m.fresh)this.fault('moving-off-safety','minor',`Moving off – safety: after ${what}, the look round was not current when you moved off.`,
      'look right again just before you move off');
  }

  /** Looks while reversing: one at least every 5 s while the car moves (all round: it is going backwards). */
  private watchReversing(l:ManoeuvreLearner){
    const now=this.input.now();
    if(l.speed<-.2){
      if(now-this.lastLookCheck>5){
        if(!this.lookedSince(now-5,['left-shoulder','right-shoulder','interior','left-door','right-door']))this.looksMissed=true;
        this.lastLookCheck=now;
      }
    }else this.lastLookCheck=now;
  }

  update(dt:number):void{
    if(this.done)return;
    const l=this.input.learner(),now=this.input.now(),loc=this.input.location;
    this.since+=dt;
    this.stillFor=Math.abs(l.speed)<.3?this.stillFor+dt:0;
    const k=kerbPosition(loc,l.x,l.z,l.heading);
    switch(this.kind){
      case 'emergency-stop':return this.emergencyStop(l,k,now,dt);
      case 'pull-up-right':return this.pullUpRight(l,k,now);
      case 'parallel-park':return this.parallelPark(l,k,now);
    }
  }

  // ---- Emergency stop ----
  private emergencyStop(l:ManoeuvreLearner,k:ReturnType<typeof kerbPosition>,now:number,dt:number){
    const loc=this.input.location;
    switch(this.phase){
      case 'start':{
        this.input.say(PULL_IN);
        // Assisted: into the next free stretch of kerb (between parked cars, away from junctions).
        const spot=k?Manoeuvre.kerbGapAhead(this.input.location,this.input.parked,k):null;
        if(spot&&k){
          const half=roadHalfWidth(k.road),kerb=half-HALF_WIDTH-.35;
          // Along the lane (out past any parked cars before the gap, as the lane path does), then in to the kerb
          // within the gap, ending in its middle: room in front to pull out again.
          const stopAt=spot.start+k.dir*11;
          const path=routeLanePath([{road:k.road,dir:k.dir,from:k.along,to:stopAt}],this.input.parked).map(p=>{
            const s=sampleRoad(k.road,p.x,p.z).along,f=Math.min(1,Math.max(0,((s-spot.start)*k.dir-1)/8)),e=f*f*(3-2*f);
            const q=at(k.road,s,k.dir,kerb);
            return {x:p.x+(q.x-p.x)*e,z:p.z+(q.z-p.z)*e};
          });
          if(path.length>1)this.input.setPath?.(path,null);
        }
        this.go('pull-in');return;
      }
      case 'pull-in':
        this.waiting=k?`kerb ${k.left.toFixed(2)} m`:'';
        if(this.stillFor>1.5&&k&&k.left<1.6){this.input.say(STOP_BRIEFING);this.stoppedAt=now;this.moveOffFrom=now;this.input.setPath?.(null,null);this.go('brief')}
        return;
      case 'brief':
        if(l.speed>.5){this.judgeMovingOff('pulling up');this.go('arm')}
        return;
      case 'arm':{
        // Up to a fair speed on a clear straight, nobody close behind: then "Stop!".
        this.fastFor=l.speed>6?this.fastFor+dt:0;
        const fwd={x:Math.sin(l.heading),z:-Math.cos(l.heading)};
        // (Following traffic further back has room to stop: the examiner checks behind first, as on the test.)
        const behind=this.input.traffic().some(t=>{const dx=t.x-l.x,dz=t.z-l.z,a=dx*fwd.x+dz*fwd.z;return a<0&&a>-18&&Math.abs(dx*fwd.z-dz*fwd.x)<3});
        // No junction in the next 40 m (road pieces on the map can be short: the junctions are what matter).
        this.junctions??=junctionPoints(loc);
        const roomAhead=!!k&&!this.junctions.some(p=>{const dx=p.x-l.x,dz=p.z-l.z,a=dx*fwd.x+dz*fwd.z;return a>0&&a<40&&Math.abs(dx*fwd.z-dz*fwd.x)<10});
        this.waiting=`fast ${this.fastFor.toFixed(1)} s, traffic close behind: ${behind}, room ahead: ${roomAhead}`;
        if(this.fastFor>1.5&&!behind&&roomAhead){
          this.input.say(STOP_NOW);this.input.flash?.('STOP');
          this.stop={at:now,speed:l.speed,heading:l.heading,braked:null,prev:l.speed,offRoad:false,drift:0};
          this.go('stopping');
        }else if(this.since>45){
          // Nowhere suitable for a long while: not asked on this drive.
          this.notes.push('The emergency stop was not asked for: no clear straight came up.');this.done=true;
        }
        return;
      }
      case 'stopping':{
        const s=this.stop!;
        // Brakes on: slowing at more than 2.5 m/s² (firmer than letting the car roll).
        if(s.braked===null&&(s.prev-l.speed)/Math.max(dt,1e-3)>2.5)s.braked=now;
        s.prev=l.speed;
        s.drift=Math.max(s.drift,Math.abs(Math.atan2(Math.sin(l.heading-s.heading),Math.cos(l.heading-s.heading))));
        if(surfaceAt(loc,l.x,l.z)?.kind!=='carriageway')s.offRoad=true;
        if(l.speed>.2&&now-s.at<8)return;
        const reaction=(s.braked??now)-s.at;
        this.notes.push(`Emergency stop from ${(s.speed*2.237).toFixed(0)} mph: brakes on ${reaction.toFixed(1)} s after "Stop!".`);
        if(reaction>STOP_SERIOUS)this.fault('controlled-stop-promptness','serious',`Controlled stop – promptness: the brakes went on ${reaction.toFixed(1)} s after "Stop!" (a child running out would have been hit).`,
          'brake at once when I say stop: foot straight to the brake');
        else if(reaction>STOP_PROMPT)this.fault('controlled-stop-promptness','minor',`Controlled stop – promptness: the brakes went on ${reaction.toFixed(1)} s after "Stop!" (draft: within ${STOP_PROMPT} s).`,
          'brake as soon as I say stop');
        if(s.offRoad)this.fault('controlled-stop-control','serious','Controlled stop – control: the car left the road while stopping.','keep the steering straight while you brake hard');
        else if(s.drift>.2)this.fault('controlled-stop-control','minor',`Controlled stop – control: the car swung ${(s.drift*57.3).toFixed(0)}° while stopping.`,'keep both hands on the wheel and the car straight while you stop');
        this.input.say(STOP_DONE);this.moveOffFrom=now;this.go('after');
        return;
      }
      case 'after':
        if(l.speed>.5){this.judgeMovingOff('the emergency stop');this.done=true}
        return;
    }
  }

  // ---- Pull up on the right, reverse about two car lengths, rejoin ----
  private pullUpRight(l:ManoeuvreLearner,k:ReturnType<typeof kerbPosition>,now:number){
    switch(this.phase){
      case 'start':{
        this.input.say(RIGHT_ASK);this.askedAt=now;
        // Assisted: across to the right kerb and along it, then straight back along it.
        if(k){
          const half=roadHalfWidth(k.road),o=-(half-HALF_WIDTH-.35);
          const fwd:Vec2[]=[];
          for(let d=0;d<=45;d+=3){const blend=Math.min(1,Math.max(0,(d-8)/20));fwd.push(at(k.road,k.along+k.dir*d,k.dir,(half/2)*(1-blend)+o*blend))}
          this.input.setPath?.(fwd,null);
        }
        this.go('crossing');return;
      }
      case 'crossing':{
        if(l.indicator==='right')this.signalAt??=now;
        if(k&&k.right<k.left&&this.crossAt===null){
          this.crossAt=now;
          const j=judgeTurn('right',this.input.looks(),this.askedAt-4,this.signalAt,now);
          if(!j.interior&&!j.side)this.fault('reverse-right-observation','minor','Reverse / right – observation: no mirror check before crossing to the right-hand side.','check the interior mirror, then the right mirror, before signalling and crossing');
          else if(!j.side)this.fault('reverse-right-observation','minor','Reverse / right – observation: no check of the right mirror before crossing to the right.','check the right mirror too before you cross');
          if(this.signalAt===null)this.fault('signals-necessary','minor','Signals – necessary: no right signal before crossing to the right-hand side.','signal right before you move across');
          // Crossed in front of someone coming the other way.
          const fwd={x:Math.sin(l.heading),z:-Math.cos(l.heading)};
          if(this.input.traffic().some(t=>{const dx=t.x-l.x,dz=t.z-l.z,a=dx*fwd.x+dz*fwd.z;return Math.cos(t.heading-l.heading)<-.7&&a>0&&a<30&&t.speed>2}))
            this.fault('reverse-right-observation','serious','Reverse / right – observation: crossed to the right in front of an oncoming vehicle.','wait for oncoming traffic to pass before you cross to the right');
        }
        if(this.stillFor>1.5&&k&&k.right<k.left){
          if(k.right>1.2)this.fault('reverse-right-control','minor',`Reverse / right – control: stopped ${k.right.toFixed(1)} m from the right kerb (draft: within 1.2 m).`,'stop closer to the kerb');
          this.input.say(RIGHT_REVERSE);this.stoppedAt=now;
          const half=roadHalfWidth(k.road),o=-(half-HALF_WIDTH-.35),rev:Vec2[]=[];
          // About two car lengths back along the kerb (the assisted path ends there).
          for(let d=0;d<=CAR_LENGTH*2.2;d+=1.5)rev.push(at(k.road,k.along-k.dir*d,k.dir,o));
          this.input.setPath?.(null,rev);
          this.go('reverse');
        }
        return;
      }
      case 'reverse':{
        if(!k)return;
        if(l.speed<-.2&&!this.reverseFrom){
          this.reverseFrom={along:k.along,time:now};
          if(!this.lookedSince(now-6,['left-shoulder','right-shoulder']))this.fault('reverse-right-observation','minor','Reverse / right – observation: no look round (over the shoulders) before reversing.','look all round before you reverse, over both shoulders');
        }
        this.watchReversing(l);
        if(this.reverseFrom){this.worstKerb.min=Math.min(this.worstKerb.min,k.right);this.worstKerb.max=Math.max(this.worstKerb.max,k.right)}
        if(this.reverseFrom&&this.stillFor>1.5){
          const back=Math.abs(k.along-this.reverseFrom.along);
          this.notes.push(`Reversed ${back.toFixed(1)} m (about ${(back/CAR_LENGTH).toFixed(1)} car lengths).`);
          if(back<CAR_LENGTH)this.fault('reverse-right-control','minor',`Reverse / right – control: reversed only ${back.toFixed(1)} m (about two car lengths asked).`,'reverse about two car lengths');
          if(back>CAR_LENGTH*3.5)this.fault('reverse-right-control','minor',`Reverse / right – control: reversed ${back.toFixed(1)} m, much further than asked.`,'stop after about two car lengths');
          if(this.worstKerb.min<-.1)this.fault('reverse-right-control','minor','Reverse / right – control: the wheels went over the kerb while reversing.','reverse slowly, keeping a little away from the kerb');
          else if(this.worstKerb.max>1.6)this.fault('reverse-right-control','minor','Reverse / right – control: the car drifted away from the kerb while reversing.','keep reasonably close to the kerb as you reverse');
          if(this.looksMissed)this.fault('reverse-right-observation','minor','Reverse / right – observation: not looking round while reversing.','keep looking all round while you reverse');
          this.input.say(RIGHT_DONE);this.moveOffFrom=now;this.input.setPath?.(null,null);this.go('rejoin');
        }
        return;
      }
      case 'rejoin':
        if(l.speed>.5){this.judgeMovingOff('reversing on the right');this.done=true}
        return;
    }
  }

  /** The next free stretch of left kerb ahead on this road (no parked car, at least 20 m long, from 20 m on). */
  static kerbGapAhead(location:Location,parked:readonly Vec2[],k:{road:Road;along:number;dir:1|-1}):{start:number;end:number}|null{
    const half=roadHalfWidth(k.road),len=roadLength(k.road);
    const taken=parked.map(c=>{const s=sampleRoad(k.road,c.x,c.z);return s.distance<=half+2&&-s.lateral*k.dir>half-2.2?s.along:null}).filter((a):a is number=>a!==null);
    for(let d=20;d<160;d+=2){
      const start=k.along+k.dir*d,end=start+k.dir*20;
      if(end<4||end>len-12||start<4||start>len-12)break;
      if(!taken.some(a=>(a-start)*k.dir>-CAR_LENGTH&&(a-end)*k.dir<CAR_LENGTH))return {start,end};
    }
    return null;
  }

  /** A car parked at the left kerb ahead with room behind it to park in (null: none suitable). */
  static parkingTarget(location:Location,parked:readonly Vec2[],l:{x:number;z:number;heading:number}){
    const k=kerbPosition(location,l.x,l.z,l.heading);
    if(!k)return null;
    const half=roadHalfWidth(k.road),len=roadLength(k.road);
    let best:{road:Road;dir:1|-1;along:number;left:number}|null=null;
    for(const c of parked){
      const s=sampleRoad(k.road,c.x,c.z);
      if(s.distance>half+2)continue;
      const ahead=(s.along-k.along)*k.dir;
      const left=-s.lateral*k.dir;
      if(ahead<25||ahead>140||left<half-2.2)continue;
      // Room behind it (no other parked car within three car lengths), and away from the road's ends.
      if(parked.some(o=>o!==c&&(()=>{const so=sampleRoad(k.road,o.x,o.z);const back=(s.along-so.along)*k.dir;return so.distance<=half+2&&-so.lateral*k.dir>half-2.2&&back>0&&back<CAR_LENGTH*3})()))continue;
      const behindEnd=k.dir>0?s.along-CAR_LENGTH*3:len-s.along-CAR_LENGTH*3;
      if(behindEnd<15||(k.dir>0?len-s.along:s.along)<15)continue;
      if(!best||ahead<(best.along-k.along)*k.dir)best={road:k.road,dir:k.dir,along:s.along,left};
    }
    return best;
  }

  // ---- Parallel park behind a car at the kerb ----
  private parallelPark(l:ManoeuvreLearner,k:ReturnType<typeof kerbPosition>,now:number){
    switch(this.phase){
      case 'start':{
        this.target=Manoeuvre.parkingTarget(this.input.location,this.input.parked,l);
        if(!this.target){this.notes.push('Parallel parking was not asked for: no parked car with room behind it on this road.');this.done=true;return}
        this.input.say(PARK_ASK);
        const t=this.target,half=roadHalfWidth(t.road);
        // Assisted: alongside the parked car, then reversing in behind it on an S-curve to the kerb.
        const beside=t.left-2.1,kerb=half-HALF_WIDTH-.3;
        const here=k?k.along:t.along-t.dir*40;
        const fwd:Vec2[]=[];
        for(let s=here;(s-t.along)*t.dir<CAR_LENGTH*.3;s+=t.dir*2)fwd.push(at(t.road,s,t.dir,Math.min(beside,half/2)));
        const rev:Vec2[]=[];
        const startBack=t.along+t.dir*CAR_LENGTH*.3,endBack=t.along-t.dir*(CAR_LENGTH*2+.8);
        for(let i=0;i<=12;i++){
          const f=i/12,e=f*f*(3-2*f);
          rev.push(at(t.road,startBack+(endBack-startBack)*f,t.dir,beside+(kerb-beside)*e));
        }
        this.input.setPath?.(fwd,rev);
        this.go('approach');return;
      }
      case 'approach':{
        const t=this.target!;
        if(!k)return;
        const ahead=(k.along-t.along)*t.dir;
        if(this.stillFor>1&&ahead>-CAR_LENGTH&&ahead<CAR_LENGTH*3){this.stoppedAt=now;this.moveOffFrom=now;this.go('reverse')}
        else if(ahead>40){this.notes.push('Drove past the car to park behind.');this.input.setPath?.(null,null);this.done=true}
        return;
      }
      case 'reverse':{
        const t=this.target!;
        if(!k)return;
        if(l.speed<-.2&&!this.reverseFrom){
          this.reverseFrom={along:k.along,time:now};
          if(!this.lookedSince(now-6,['left-shoulder','right-shoulder']))this.fault('reverse-park-observation','minor','Reverse park – observation: no look round (over the shoulders) before reversing.','look all round before you reverse, over both shoulders');
        }
        this.watchReversing(l);
        if(this.reverseFrom)this.worstKerb.min=Math.min(this.worstKerb.min,k.left);
        if(this.reverseFrom&&this.stillFor>2){
          const gap=(t.along-k.along)*t.dir-CAR_LENGTH;
          this.notes.push(`Parked ${gap.toFixed(1)} m behind the car, ${Math.max(0,k.left).toFixed(2)} m from the kerb, at ${(k.angle*57.3).toFixed(0)}° to it.`);
          if(gap<.3)this.fault('reverse-park-control','minor','Reverse park – control: too close to the parked car to drive out.','leave room in front of you to drive out');
          else if(gap>CAR_LENGTH*2.3)this.fault('reverse-park-control','minor',`Reverse park – control: ${gap.toFixed(1)} m behind the car (within about two car lengths asked).`,'finish within about two car lengths of the car in front');
          if(this.worstKerb.min<-.1)this.fault('reverse-park-control','minor','Reverse park – control: the wheels went over the kerb.','come back slowly and steer away from the kerb in time');
          else if(k.left>1)this.fault('reverse-park-control','minor',`Reverse park – control: finished ${k.left.toFixed(1)} m from the kerb (reasonably close asked: draft, within 1 m).`,'finish closer to the kerb');
          if(k.angle>.21)this.fault('reverse-park-control','minor',`Reverse park – control: finished at ${(k.angle*57.3).toFixed(0)}° to the kerb, not parallel.`,'straighten up so the car is parallel to the kerb');
          if(this.looksMissed)this.fault('reverse-park-observation','minor','Reverse park – observation: not looking round while reversing.','keep looking all round while you reverse');
          this.input.say(PARK_DONE);this.moveOffFrom=now;this.input.setPath?.(null,null);this.go('after');
        }
        return;
      }
      case 'after':
        if(l.speed>.5){this.judgeMovingOff('parking');this.done=true}
        return;
    }
  }
}
