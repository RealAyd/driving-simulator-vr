import {INFO,IMPROVE,type AttemptResult,type Location,type Pose,type Seconds,type SimEvent,type SimModule,type Severity} from '../contracts';
import {FindingLog} from './findingLog';
import {pointAtAlong,roadHalfWidth,sampleRoad} from '../world/roadGeometry';
import {junctionMouths,type JunctionMouth} from '../world/junctionControls';
import type {EventLog} from '../app/eventLog';
import type {ExaminerListener} from '../test/examiner';
import type {RouteStep} from '../test/route';
import {judgePullUp,junctionPoints} from '../test/pullUp';
import {judgeMoveOff,judgeTurn,MOVE_OFF_FRESH} from './routine';
import type {ManoeuvreFault,ManoeuvreKind} from '../test/manoeuvres';
import {DVSA_SOURCE,type ShowMeQuestion,type TellMeQuestion} from '../test/vehicleChecks';
import type {Aspect,LiveStop} from '../world/trafficSignals';
import type {Vec2} from '../contracts';
import {drivingView} from '../world/roundabouts';
import {approachLanesFor,laneAt,laneOnRoad,lanesFor,onRing,project,ringLanes,type RingLanes} from '../world/roundaboutLanes';

/**
 * Mock driving test marking, in the shape of the DVSA marking sheet (DL25): driving faults (recorded as "minor"),
 * serious and dangerous faults under its headings. More than 15 driving faults, or any serious or dangerous fault,
 * is a fail. Nothing ends the test early: a collision is marked dangerous and the drive goes on, so the report
 * covers the whole drive. The thresholds are this simulator's draft judgements of what can be measured in it, not
 * DVSA's own criteria; they are listed in each fault's explanation.
 */

export const MOCK_TEST_RUBRIC='mock-test-0.1';
const mph=(v:number)=>v*2.237;
/** Turns this close together on the route (metres) are one junction for the mirror checks. */
const SAME_JUNCTION=20;

export interface MockTestInput{
  location:Location;
  events:EventLog;
  now:()=>Seconds;
  learner:()=>{pose:Pose;speed:number;indicator:'off'|'left'|'right';surface:'carriageway'|'pavement'|'none'};
  /** Other road users (traffic, buses) with the way they face. */
  traffic:()=>Array<{x:number;z:number;heading:number;speed:number}>;
  /** Parked cars at the kerb (passing them on the right is not a positioning fault). */
  parked:Array<{x:number;z:number}>;
  /** Traffic lights: stop lines and their state now. */
  signals?:()=>readonly LiveStop[];
}

/** A manoeuvre the examiner asked for, being watched. */
interface Watch{step:RouteStep;signalled:boolean;wrongSignal:boolean;maxSpeed:number;directionEvent:string|null;
  /** When the direction was given, the signal for this turn first went on, and the car reached the junction. */
  directionAt:number;signalAt:number|null;turnAt:number|null;
  /** The signal for this turn was already on from the turn before (see `direction`). */
  carried?:boolean;
  /** The other way's signal still on from the turn just made (see `direction`). */
  leftover?:'left'|'right'|undefined;
  /** At a roundabout bigger than a mini (its ring, `radius` from its middle): the signal on the way to it (the way
   * of the exit, or none going ahead), on it, and whether the left signal was given to leave it (rule 186). */
  ring?:{radius:number;entered:boolean;left:boolean;exited:boolean;wrongApproach:'left'|'right'|null;entrySpeed:number;leaving:'left'|'right'|'off';
    /** Lanes (two or more on the ring; laneJudging): the ring's, those for this exit, and what was seen. */
    lanes?:RingLanes;allowed?:number[];
    /** The lane on the way in (where it has two or more), judged once; the lane on the ring now, since when, and before
     * leaving it; seconds on the ring. */
    approachJudged?:boolean;exitJudged?:boolean;lane?:number;laneFrom?:number|undefined;laneSince?:number;lastRingLane?:number;onFor?:number}}

export class MockTestAssessor implements SimModule,ExaminerListener{
  readonly id='mock-test';
  private log!:FindingLog;
  private watch:Watch|null=null;
  /** Mirror or shoulder checks (event times). */
  private looks:Array<{time:number;target:string;id:string}>=[];
  private lastEvent=0;
  private movedOff=false;
  private speeding:{since:number;worst:number;incident:number}|null=null;
  private speedIncidents=0;
  private following=0;
  private followingIncidents=0;
  private wrongSide=0;
  private wrongSideIncident=0;
  private pavement=0;
  private cancelBy:{time:number;turn:'left'|'right';incident:string}|null=null;
  private redirects=0;
  private inRoundabout=-1;
  private directions=0;
  /** After the request to pull up: what was done before stopping. */
  private pulling:{mirror:boolean;signalled:boolean;others:boolean;event:string|null}|null=null;
  private readonly junctions:Vec2[];
  /** STOP lines (mapped STOP signs), and the approach to each: how far past the line, the slowest speed on it. */
  private readonly stopLines:JunctionMouth[];
  private stopApproach=new Map<string,{past:number;slowest:number}>();
  /** Each stop line being approached: where the car's front was, the light then, and the amber judgement. */
  private lights=new Map<string,{front:number;last:Aspect;couldStop:boolean;waitingGreen:number}>();
  /** Points on the routine that are not faults on the marking sheet (the report's "to improve"). */
  private advice:string[]=[];
  /** The last direction: where it was on the route, and from when its mirror checks count. */
  private lastTurn:{distance:number;at:number}|null=null;
  /** The vehicle safety questions and how they went (for the report). */
  private checks:string[]=[];
  private showing:{q:ShowMeQuestion;time:number;shown:boolean;other:string|null;event:string|null}|null=null;
  /** When the show me question was asked (driving while answering it is watched). */
  private showMeFrom:number|null=null;

  /** Roundabouts bigger than a mini (their rings, as one junction each: roundabouts.ts). */
  private readonly rings:Location['junctions'];

  constructor(private readonly input:MockTestInput){
    this.junctions=junctionPoints(input.location);
    this.rings=drivingView(input.location).junctions.filter(j=>j.id.startsWith('ring-')&&j.radius>=12);
    this.stopLines=junctionMouths(input.location).filter(m=>m.kind==='stop');
    this.reset();
  }

  reset():void{
    this.log=new FindingLog(MOCK_TEST_RUBRIC,this.input.events,this.input.now);
    this.watch=null;this.lastTurn=null;this.looks=[];this.movedOff=false;this.speeding=null;this.speedIncidents=0;this.following=0;this.followingIncidents=0;
    this.wrongSide=0;this.wrongSideIncident=0;this.pavement=0;this.cancelBy=null;this.redirects=0;this.inRoundabout=-1;this.directions=0;this.pulling=null;this.checks=[];this.advice=[];this.manoeuvring=null;this.showing=null;this.showMeFrom=null;this.lights.clear();
    const last=this.input.events.events.at(-1);
    this.lastEvent=last?Number(last.id.slice(3)):0;
  }

  private fault(rule:string,incident:string,severity:Severity,explanation:string,events:string[]=[]){
    this.log.record(rule,incident,severity,events,explanation);
  }

  private recentLook(within:number,targets?:string[]){
    const t=this.input.now();
    return this.looks.find(l=>t-l.time<=within&&(!targets||targets.includes(l.target)))??null;
  }

  // ---- The examiner's directions ----
  direction(step:RouteStep):void{
    this.directions++;
    const ev=this.input.events.events.at(-1);
    // A mirror check just before the direction counts too (planning ahead).
    // A turn just after the last one (a few metres on: one junction, split in two on the map): the mirror checks
    // for that one count for this one too.
    const directionAt=this.lastTurn&&step.distance-this.lastTurn.distance<SAME_JUNCTION?Math.min(this.input.now(),this.lastTurn.at):this.input.now();
    this.lastTurn={distance:step.distance,at:directionAt};
    this.watch={step,signalled:false,wrongSignal:false,maxSpeed:0,directionEvent:ev?.id??null,directionAt,signalAt:null,turnAt:null};
    // A roundabout bigger than a mini: judged by its ring, not by its middle (it is tens of metres across).
    const ring=step.kind==='roundabout'?this.rings.find(j=>Math.hypot(j.position.x-step.at.x,j.position.z-step.at.z)<2):undefined;
    if(ring){
      this.watch.ring={radius:ring.radius,entered:false,left:false,exited:false,wrongApproach:null,entrySpeed:0,leaving:'off'};
      // Two or more lanes round it: the lanes for this exit (roundaboutLanes.ts: the owner's rules, Highway Code 186).
      const rl=ringLanes(ring);
      if(rl&&rl.lanes>=2){
        const turn=step.turn==='ahead'?'ahead':step.turn,exit=step.exit??1;
        this.watch.ring.lanes=rl;this.watch.ring.allowed=lanesFor(rl.lanes,exit,step.exits??Math.max(exit,rl.exits.length),turn);
      }
    }
    // Still signalling this way from the turn just before (two turns the same way close together): the signal is
    // fine kept on, and its timing is judged only if it goes off and on again.
    const l=this.input.learner();
    if(step.turn!=='ahead'&&l.indicator===step.turn)this.watch.carried=true;
    // Still on the other way from the turn just made: not a signal for this one (leaving it on is marked as not
    // cancelled, below), until it goes off.
    else if(l.indicator!=='off'&&l.indicator!==step.turn)this.watch.leftover=l.indicator;
  }

  done(step:RouteStep,followed:boolean):void{
    const w=this.watch;
    this.watch=null;
    if(!followed){this.redirects++;return}
    if(!w||w.step!==step)return;
    const into=step.to.road.name??'the next road';
    const ev=w.directionEvent?[w.directionEvent]:[];
    const turning=step.turn!=='ahead';
    const id=`turn-${this.directions}`;
    if(w.ring){this.doneRoundabout(w,step,id,ev);return}
    // The routine, in order: interior mirror, the mirror on the side of the turn, signal, turn (routine.ts).
    if(turning){
      const turn=step.turn as 'left'|'right';
      // A mirror check just before the direction counts too (planning ahead).
      const j=judgeTurn(turn,this.looks,w.directionAt-4,w.signalAt,w.turnAt??this.input.now());
      if(!j.interior&&!j.side){
        if(j.mirrorsAfterSignal)this.fault('mirrors-signalling',`${id}-mirrors`,'minor',
          `Use of mirrors – signalling: the mirrors were checked only after signalling ${turn} for ${into}. Check them first, then signal.`,ev);
        else this.fault('mirrors-change-direction',`${id}-mirrors`,'minor',
          `Use of mirrors – change direction: no mirror check before ${w.signalled?'signalling and ':''}turning ${turn} into ${into}.`,ev);
      }else if(!j.side)this.fault('mirrors-change-direction',`${id}-mirrors`,'minor',
        `Use of mirrors – change direction: no check of the ${turn} mirror before ${w.signalled?'signalling and ':''}turning ${turn} into ${into} (the interior mirror alone does not show what is beside you).`,ev);
      else if(!j.interior)this.advice.push(`${IMPROVE}Turning ${turn} into ${into}: check the interior mirror first, then the ${turn} mirror, then signal.`);
      else if(!j.inOrder)this.advice.push(`${IMPROVE}Turning ${turn} into ${into}: the interior mirror comes first, then the ${turn} mirror.`);
      if(w.signalled&&j.signalLate)this.fault('signals-timed',`${id}-late-signal`,'minor',
        `Signals – timed: the ${turn} signal for ${into} came only as you turned; signal in good time, after the mirrors.`,ev);
    }
    if(turning&&!w.signalled)this.fault('signals-necessary',`${id}-signal`,'minor',
      `Signals – necessary: no ${step.turn} signal before turning ${step.turn} into ${into}.`,ev);
    if(w.wrongSignal)this.fault('signals-correctly',`${id}-wrong-signal`,w.signalled?'minor':'serious',
      w.signalled?`Signals – correctly: a signal the wrong way before turning ${step.turn} into ${into}.`
        :`Signals – correctly: signalled the wrong way and never ${step.turn} before turning into ${into}: misleading to other road users.`,ev);
    if(turning){
      const v=mph(w.maxSpeed);
      if(v>22)this.fault('junctions-approach-speed',`${id}-speed`,'serious',`Junctions – approach speed: ${v.toFixed(0)} mph turning ${step.turn} into ${into} (draft limit: 15 mph, serious above 22 mph).`,ev);
      else if(v>15)this.fault('junctions-approach-speed',`${id}-speed`,'minor',`Junctions – approach speed: ${v.toFixed(0)} mph turning ${step.turn} into ${into} (draft limit: 15 mph).`,ev);
      // The signal should be cancelled once round the corner.
      this.cancelBy={time:this.input.now()+8,turn:step.turn as 'left'|'right',incident:`${id}-cancel`};
    }
  }

  /**
   * A roundabout bigger than a mini (Highway Code rules 185 and 186): on the way to it, signal the way of the exit
   * (left for the first, right for one past twelve o'clock, none going ahead); leave it signalling left, after passing
   * the exit before the one wanted; the mirrors before each; not too fast on to it. Giving way to traffic going round
   * from the right is judged as the car comes on (fixedUpdate).
   */
  private doneRoundabout(w:Watch,step:RouteStep,id:string,ev:string[]):void{
    const r=w.ring!,exit=step.exit?`the ${['first','second','third','fourth','fifth','sixth'][step.exit-1]??`${step.exit}th`} exit`:'its exit';
    const where=`at the roundabout (${exit})`;
    if(step.turn!=='ahead'){
      const turn=step.turn as 'left'|'right';
      const j=judgeTurn(turn,this.looks,w.directionAt-4,w.signalAt,w.turnAt??this.input.now());
      if(!j.interior&&!j.side)this.fault('mirrors-change-direction',`${id}-mirrors`,'minor',
        `Use of mirrors – change direction: no mirror check before ${w.signalled?'signalling and ':''}going ${turn} ${where}.`,ev);
      if(!w.signalled)this.fault('signals-necessary',`${id}-signal`,'minor',
        `Signals – necessary: no ${turn} signal on the way to the roundabout, taking ${exit} (signal ${turn} as you approach).`,ev);
      else if(j.signalLate)this.fault('signals-timed',`${id}-late-signal`,'minor',
        `Signals – timed: the ${turn} signal came only as you went on to the roundabout; signal in good time on the approach.`,ev);
    }else if(r.wrongApproach)this.fault('signals-correctly',`${id}-wrong-signal`,'minor',
      `Signals – correctly: a ${r.wrongApproach} signal on the way to the roundabout going straight ahead (${exit}): no signal on the approach, then signal left after passing the exit before yours.`,ev);
    if(step.turn!=='left'&&r.entered&&!r.left)this.fault('signals-necessary',`${id}-leave-signal`,'minor',
      `Signals – necessary: no left signal leaving the roundabout by ${exit} (signal left after passing the exit before yours).`,ev);
    if(step.turn==='right'&&r.leaving==='right')this.fault('signals-correctly',`${id}-leave-right`,'minor',
      `Signals – correctly: still signalling right leaving the roundabout by ${exit}: misleading to those waiting to come on.`,ev);
    const v=mph(r.entrySpeed);
    if(v>28)this.fault('junctions-approach-speed',`${id}-speed`,'serious',`Junctions – approach speed: ${v.toFixed(0)} mph on to the roundabout (draft limit: 20 mph, serious above 28 mph).`,ev);
    else if(v>20)this.fault('junctions-approach-speed',`${id}-speed`,'minor',`Junctions – approach speed: ${v.toFixed(0)} mph on to the roundabout (draft limit: 20 mph).`,ev);
    // Leaving signalling left: cancelled once off it.
    if(r.left)this.cancelBy={time:this.input.now()+8,turn:'left',incident:`${id}-cancel`};
  }

  /**
   * Lanes at a roundabout of two lanes or more (positioning – lane discipline; the owner's rules): the lane on the way
   * in (where it has two or more) or, coming on from one lane, the lane taken on to the ring, for the exit; each move
   * across a lane on the ring, with the mirror on that side first and never across a vehicle already in it (serious);
   * and leaving from the left lane, unless the way out has two lanes. Wrong lane: a driving fault (go round again rather
   * than cut across: going round again is no fault).
   */
  private judgeLanes(w:Watch,p:Vec2,heading:number,speed:number,now:number,dt:number):void{
    const r=w.ring!,rl=r.lanes!,allowed=r.allowed!,step=w.step,id=`turn-${this.directions}`;
    const name=(n:number,of:number)=>n===1?'left':n===of?'right':'middle';
    const exit=step.exit?`the ${['first','second','third','fourth','fifth','sixth'][step.exit-1]??`${step.exit}th`} exit`:'its exit';
    const want=(of:number,ls:readonly number[])=>ls.map(n=>`the ${name(n,of)}-hand lane`).join(' or ');
    const onIt=onRing(rl,p,.3);
    // On the way in, the last few metres before the ring: its lane (only where the way in has two lanes or more).
    if(!r.entered&&!r.approachJudged&&!onIt){
      const edge=Math.abs(project(rl,p).left)-rl.lanes*1.8;
      if(edge<12&&edge>2){
        const at=laneOnRoad(step.from.road,p,heading,(x,z)=>sampleRoad(step.from.road,x,z));
        if(at&&at.lanes>=2){
          r.approachJudged=true;
          const ok=approachLanesFor(allowed,rl.lanes,at.lanes);
          if(!ok.includes(at.lane))this.fault('positioning-lane-discipline',`${id}-approach-lane`,'minor',
            `Positioning – lane discipline: in the ${name(at.lane,at.lanes)}-hand lane on the way to the roundabout, taking ${exit} (${step.turn==='ahead'?'straight on':`to the ${step.turn}`}): ${want(at.lanes,ok)} is for that. In the wrong lane, go round again rather than cut across.`);
        }
      }
    }
    if(r.exited&&!r.exitJudged&&r.lastRingLane!==undefined){
      // Off it: from the left lane (or the right, into a way out of two lanes), not across the left lane into one.
      r.exitJudged=true;
      const out=laneOnRoad(step.to.road,p,heading,(x,z)=>sampleRoad(step.to.road,x,z));
      if(r.lastRingLane>1&&(out?.lanes??1)<2){
        const fx=Math.sin(heading),fz=-Math.cos(heading);
        const across=this.input.traffic().some(t=>laneAt(rl,t)===1&&Math.cos(t.heading-heading)>0&&Math.hypot(t.x-p.x,t.z-p.z)<10&&(t.x-p.x)*fx+(t.z-p.z)*fz<4);
        this.fault('positioning-lane-discipline',`${id}-exit-lane`,across?'serious':'minor',
          `Positioning – lane discipline: left the roundabout by ${exit} from the ${name(r.lastRingLane,rl.lanes)}-hand lane, across the left lane${across?' and a vehicle in it':''}. Move to the left lane after passing the exit before yours (left mirror first), or go round again.`);
      }
    }
    if(!onIt||r.exited)return;
    r.onFor=(r.onFor??0)+dt;
    const lane=laneAt(rl,p);
    if(!lane)return;
    // Coming on from one lane: the lane taken on to the ring, a second on.
    if(!r.approachJudged&&r.onFor>=1&&r.onFor-dt<1){
      r.approachJudged=true;
      if(!allowed.includes(lane))this.fault('positioning-lane-discipline',`${id}-ring-lane`,'minor',
        `Positioning – lane discipline: on to the roundabout in the ${name(lane,rl.lanes)}-hand lane, taking ${exit}: ${want(rl.lanes,allowed)} is for that. In the wrong lane, go round again rather than cut across.`);
    }
    // Across a lane: held for half a second (not a wobble on the line); from a second on (coming on into the lane for the
    // exit is not moving across).
    if(r.onFor<1)return;
    if(r.lane===undefined){r.lane=lane;r.lastRingLane=lane}
    if(lane!==r.lane){
      if(r.laneFrom!==lane){r.laneFrom=lane;r.laneSince=now}
      else if(now-(r.laneSince??now)>=.5){
        const from=r.lane,to=lane,side=to<from?'left':'right';
        r.lane=lane;r.laneFrom=undefined;
        if(!this.recentLook(4+.5,[`${side}-door`,`${side}-shoulder`]))this.fault('mirrors-change-direction',`${id}-lane-${Math.round(now)}`,'minor',
          `Use of mirrors – change direction: no check of the ${side} mirror before moving into the ${name(to,rl.lanes)}-hand lane on the roundabout.`);
        // Across a vehicle already in that lane, beside or close behind.
        const fx=Math.sin(heading),fz=-Math.cos(heading);
        const across=this.input.traffic().some(t=>{
          if(Math.cos(t.heading-heading)<.5||laneAt(rl,t)!==to)return false;
          const along=(t.x-p.x)*fx+(t.z-p.z)*fz;
          return along<4.5&&along>-(5+t.speed*1.5);
        });
        if(across)this.fault('positioning-lane-discipline',`${id}-cut-across-${Math.round(now)}`,'serious',
          `Positioning – lane discipline: moved into the ${name(to,rl.lanes)}-hand lane on the roundabout across a vehicle already in it. Check the ${side} mirror and wait for it to pass, or go round again.`);
      }
    }else r.laneFrom=undefined;
    r.lastRingLane=r.lane;
  }

  // ---- Manoeuvres and the emergency stop (manoeuvres.ts judges them; their faults are recorded here) ----
  private manoeuvring:ManoeuvreKind|null=null;
  manoeuvreStart(kind:ManoeuvreKind):void{this.manoeuvring=kind}
  manoeuvreDone(kind:ManoeuvreKind,faults:readonly ManoeuvreFault[],notes:readonly string[]):void{
    this.manoeuvring=null;
    const ev=this.input.events.events.at(-1);
    for(const f of faults)this.fault(f.rule,`${kind}-${f.rule}`,f.severity,f.text,ev?[ev.id]:[]);
    for(const n of notes)this.checks.push(`${INFO}${n}`);
  }

  pullUp():void{
    const ev=this.input.events.events.at(-1);
    this.pulling={mirror:!!this.recentLook(3,['interior','left-door']),signalled:false,others:false,event:ev?.id??null};
  }

  // ---- Vehicle safety questions (DVSA): one driving fault if one or both are wrong ----
  private checkFault(text:string,events:string[]){
    const existing=this.log.current.find(f=>f.incidentId==='vehicle-checks');
    if(existing){existing.explanation+=` ${text}`;return}
    this.fault('vehicle-checks','vehicle-checks','minor',`Vehicle safety questions: ${text}`,events);
  }

  tellMe(q:TellMeQuestion,correct:boolean,answer:string):void{
    const ev=this.input.events.events.at(-1);
    if(!correct)this.checkFault(`Tell me – “${q.question}” Your answer: “${answer}” DVSA’s answer: “${q.answer}”`,ev?[ev.id]:[]);
    this.checks.push(`${INFO}Tell me: ${q.question} ${correct?'Correct.':`Not correct. DVSA’s answer: ${q.answer}`}`);
  }

  showMe(q:ShowMeQuestion):void{
    const ev=this.input.events.events.at(-1);
    this.showing={q,time:this.input.now(),shown:false,other:null,event:ev?.id??null};
    this.showMeFrom=this.input.now();
  }

  /** Stopped at the end: where (close to the kerb, a safe and convenient place), and the mirrors and signal first. */
  pulledUp():void{
    const p=this.pulling,l=this.input.learner();
    const ev=p?.event?[p.event]:[];
    for(const f of judgePullUp(this.input.location,this.junctions,this.input.parked,l.pose.position.x,l.pose.position.z,l.pose.heading))
      this.fault('normal-stops',`pull-up-${f.key}`,f.severity,f.text,ev);
    if(p&&!p.mirror)this.fault('mirrors-change-speed','pull-up-mirrors','minor','Use of mirrors – change speed: no check of the interior or left mirror before pulling up.',ev);
    // A signal helps anyone around; with nobody about it is not needed.
    if(p&&!p.signalled&&p.others)this.fault('signals-necessary','pull-up-signal','minor','Signals – necessary: no left signal before pulling up, with other road users about.',ev);
    this.pulling=null;
  }

  /** Findings so far (for the HUD and diagnostics). */
  get current(){return this.log.current}

  fixedUpdate(dt:Seconds):void{
    const now=this.input.now();
    const l=this.input.learner();
    const {x,z}=l.pose.position,heading=l.pose.heading,speed=Math.abs(l.speed);
    // New evidence since the last step: looks (mirrors and shoulders), collisions.
    const evs=this.input.events.events;
    for(let i=evs.length-1;i>=0;i--){
      const e=evs[i] as SimEvent;
      const n=Number(e.id.slice(3));
      if(n<=this.lastEvent)break;
      if(e.type==='observation.dwell'){
        this.looks.unshift({time:e.time,target:String(e.payload['target']),id:e.id});
        if(this.pulling&&['interior','left-door'].includes(String(e.payload['target'])))this.pulling.mirror=true;
      }
      if(e.type==='vehicle.control'&&this.showing&&!this.showing.shown){
        const c=String(e.payload['control']);
        if(c===this.showing.q.control)this.showing.shown=true;else this.showing.other??=c;
      }
      // (Struck while standing still: another road user drove into the car; not the learner's fault.)
      if(e.type==='vehicle.collision'&&!e.payload['struck'])this.fault('control-collision',`collision-${String(e.payload['obstacleId'])}`,'dangerous',`Control: collision with ${String(e.payload['obstacleId']).replace(/-\d+$/,'').replace(/-/g,' ')} at ${mph(Number(e.payload['speed'])||0).toFixed(0)} mph.`,[e.id]);
    }
    if(evs.length)this.lastEvent=Math.max(this.lastEvent,Number(evs.at(-1)!.id.slice(3)));
    this.looks=this.looks.filter(lk=>now-lk.time<30);

    // Moving off: a look all round, and a current look to the right just before going (routine.ts).
    if(!this.movedOff&&speed>.5){
      this.movedOff=true;
      const m=judgeMoveOff(this.looks,now);
      if(!m.allRound)this.fault('moving-off-safety','moving-off','minor',`Moving off – safety: before moving off, no look at ${m.missing.join(', ')}.`);
      else if(!m.fresh)this.fault('moving-off-safety','moving-off','minor',`Moving off – safety: you looked all round, but not again just before moving off (more than ${MOVE_OFF_FRESH} s before). Things change: look right again (mirror and blind spot) just before you go.`);
      if(!m.left)this.advice.push(`${IMPROVE}Moving off: look to the left too (mirror and over the left shoulder) for cyclists and people on the pavement.`);
    }

    // The show me question: the control asked for within 30 s.
    const sm=this.showing;
    if(sm){
      const q=sm.q,ev=sm.event?[sm.event]:[];
      if(sm.shown){
        this.checks.push(`${INFO}Show me: ${q.question} Shown.`);
        this.showing=null;
      }else if(now-sm.time>30){
        this.checkFault(`Show me – “${q.question}” ${sm.other?`The control used was the ${sm.other.replace(/-/g,' ')}, not the one asked for.`:'Not shown within 30 s.'}`,ev);
        this.checks.push(`${INFO}Show me: ${q.question} Not shown.`);
        this.showing=null;
      }
    }

    // Pulling up: a mirror check and a left signal before stopping (a signal is needed when others are about).
    if(this.pulling){
      if(l.indicator==='left')this.pulling.signalled=true;
      if(this.input.traffic().some(t=>Math.hypot(t.x-x,t.z-z)<60))this.pulling.others=true;
    }

    // The manoeuvre being watched: mirror checks, the signal, the speed into the junction.
    const w=this.watch;
    if(w?.ring){
      const r=w.ring,turn=w.step.turn,d=Math.hypot(x-w.step.at.x,z-w.step.at.z);
      if(l.indicator==='off'){w.carried=false;w.leftover=undefined}
      if(!r.entered){
        // On the way to it: the way of the exit, or none going ahead.
        if(turn!=='ahead'&&l.indicator===turn){w.signalled=true;if(!w.carried)w.signalAt??=now}
        else if(turn==='ahead'&&l.indicator!=='off'&&l.indicator!==w.leftover&&d<r.radius+40)r.wrongApproach=l.indicator;
        if(d<r.radius+12)r.entrySpeed=Math.max(r.entrySpeed,speed);
        if(d<r.radius){
          r.entered=true;w.turnAt=now;
          // Coming on in front of traffic going round from the right (it would be there within 2 s).
          const c=w.step.at,a=Math.atan2(z-c.z,x-c.x);
          const cut=this.input.traffic().some(t=>{
            const rt=Math.hypot(t.x-c.x,t.z-c.z);
            if(rt>r.radius+1||t.speed<1)return false;
            const arc=(((a-Math.atan2(t.z-c.z,t.x-c.x))%(2*Math.PI))+2*Math.PI)%(2*Math.PI)*rt;
            return arc>2&&(arc-4.5)/t.speed<2;
          });
          if(cut)this.fault('junctions-observation',`roundabout-${Math.round(now)}`,'serious',
            'Junctions – observation: came on to the roundabout in front of traffic already going round from the right (give way to traffic from the right, rule 185).');
        }
      }else if(!r.exited){
        if(l.indicator==='left')r.left=true;
        if(d>r.radius+3){r.exited=true;r.leaving=l.indicator}
      }
      if(r.lanes)this.judgeLanes(w,{x,z},l.pose.heading,speed,now,dt);
    }else if(w){
      const turn=w.step.turn;
      if(Math.hypot(x-w.step.at.x,z-w.step.at.z)<10)w.turnAt??=now;
      if(l.indicator==='off'){w.carried=false;w.leftover=undefined}
      if(l.indicator!=='off'){
        if(turn!=='ahead'&&l.indicator===turn){w.signalled=true;if(!w.carried)w.signalAt??=now}
        else if(l.indicator!==w.leftover&&Math.hypot(x-w.step.at.x,z-w.step.at.z)<40)w.wrongSignal=true;
      }
      if(Math.hypot(x-w.step.at.x,z-w.step.at.z)<12)w.maxSpeed=Math.max(w.maxSpeed,speed);
    }
    if(this.cancelBy&&now>this.cancelBy.time){
      // (Not when the next turn is the same way and already asked for: that signal is for it.)
      if(l.indicator===this.cancelBy.turn&&this.watch?.step.turn!==this.cancelBy.turn)this.fault('signals-timed',this.cancelBy.incident,'minor','Signals – timed: the signal was left on after the turn (not cancelled within 8 s).');
      this.cancelBy=null;
    }

    // Speed: over the limit for more than 2 s.
    const near=this.input.location.roads.reduce((best,r)=>{const s=sampleRoad(r,x,z);return !best||s.distance<best.s.distance?{r,s}:best},null as null|{r:Location['roads'][number];s:ReturnType<typeof sampleRoad>});
    const limit=near?.r.speedLimitMph??30;
    const over=mph(speed)-limit;
    if(over>3){
      this.speeding??={since:now,worst:0,incident:++this.speedIncidents};
      this.speeding.worst=Math.max(this.speeding.worst,over);
      if(now-this.speeding.since>2){
        const sev:Severity=this.speeding.worst>20?'dangerous':this.speeding.worst>8?'serious':'minor';
        this.fault('speed-limit',`speed-${this.speeding.incident}`,sev,`Speed: ${(limit+this.speeding.worst).toFixed(0)} mph in a ${limit} mph limit (draft: a fault above ${limit+3}, serious above ${limit+8}, dangerous above ${limit+20} mph).`);
      }
    }else if(over<1)this.speeding=null;

    // Following distance: under one second behind a vehicle going the same way, for 2 s.
    const fwd={x:Math.sin(heading),z:-Math.cos(heading)};
    let gap=Infinity;
    for(const t of this.input.traffic()){
      if(Math.cos(t.heading-heading)<.8)continue;
      const dx=t.x-x,dz=t.z-z,along=dx*fwd.x+dz*fwd.z,side=Math.abs(dx*fwd.z-dz*fwd.x);
      if(along>0&&side<1.6)gap=Math.min(gap,along-4.4);
    }
    if(speed>4.5&&gap/speed<1){
      this.following+=dt;
      if(this.following>2&&this.following-dt<=2)this.fault('following-distance',`following-${++this.followingIncidents}`,'minor',`Following distance: under one second behind the vehicle ahead at ${mph(speed).toFixed(0)} mph (the two-second rule).`);
    }else this.following=0;

    // Position: on the right-hand side of a two-way road for no reason (not passing parked cars, not at a junction).
    if(near&&!near.r.oneway&&near.r.lanes.count>=2&&speed>2&&this.manoeuvring!=='pull-up-right'){
      const dir=near.s.direction.x*fwd.x+near.s.direction.z*fwd.z>=0?1:-1;
      const right=near.s.lateral*dir;
      const passing=this.input.parked.some(p=>{const dx=p.x-x,dz=p.z-z,a=dx*fwd.x+dz*fwd.z;return a>-6&&a<25&&Math.hypot(dx,dz)<26})
        ||this.input.traffic().some(t=>{const dx=t.x-x,dz=t.z-z,a=dx*fwd.x+dz*fwd.z;return t.speed<.5&&a>-6&&a<25&&Math.abs(dx*fwd.z-dz*fwd.x)<3});
      const atJunction=this.input.location.junctions.some(j=>Math.hypot(j.position.x-x,j.position.z-z)<j.radius+20)
        ||(this.watch&&Math.hypot(this.watch.step.at.x-x,this.watch.step.at.z-z)<30);
      if(right>.5&&!passing&&!atJunction){
        this.wrongSide+=dt;
        if(this.wrongSide>3&&this.wrongSide-dt<=3)this.wrongSideIncident++;
        if(this.wrongSide>3)this.fault('positioning-normal',`position-${this.wrongSideIncident}`,this.wrongSide>8?'serious':'minor',
          `Positioning – normal driving: on the right-hand side of ${near.r.name??'the road'} for ${this.wrongSide.toFixed(0)} s with nothing to pass.`);
      }else this.wrongSide=0;
    }

    // Traffic lights: over the stop line at red (or red and amber); on at amber with room to stop; slow away on green.
    const ahead=(m:number)=>this.input.traffic().some(t=>{const dx=t.x-x,dz=t.z-z,a=dx*fwd.x+dz*fwd.z;return a>0&&a<m&&Math.abs(dx*fwd.z-dz*fwd.x)<2});
    const front={x:x+fwd.x*2.1,z:z+fwd.z*2.1};
    for(const st of this.input.signals?.()??[]){
      const hx=Math.sin(st.heading),hz=-Math.cos(st.heading);
      const dx=front.x-st.x,dz=front.z-st.z,along=dx*hx+dz*hz,left=dx*hz-dz*hx;
      const half=st.road.lanes.count*st.road.lanes.width/2;
      const mine=Math.cos(st.heading-heading)>.8&&along>-60&&along<15&&left<half+1&&left>(st.road.oneway?-half-1:-1);
      if(!mine){this.lights.delete(st.id);continue}
      let m=this.lights.get(st.id);
      if(!m){m={front:along,last:st.state,couldStop:false,waitingGreen:0};this.lights.set(st.id,m)}
      // When the amber comes on: could the car stop before the line (0.7 s to react, then 4 m/s²)?
      if(st.state==='amber'&&m.last!=='amber')m.couldStop=-along>speed*.7+speed*speed/8&&speed>2;
      if(m.front<0&&along>=0&&speed>.3){
        const road=st.road.name??'the road';
        if(st.state==='red'||st.state==='red-amber')this.fault('traffic-lights',`lights-${st.id}-${Math.round(now)}`,'serious',
          `Response to signals – traffic lights: crossed the stop line on ${road} at ${st.state==='red'?'red':'red and amber'} (it means stop).`);
        else if(st.state==='amber'&&m.couldStop)this.fault('traffic-lights',`lights-${st.id}-${Math.round(now)}`,'minor',
          `Response to signals – traffic lights: went on at amber on ${road} when there was room to stop safely.`);
      }
      // Waiting at the line on green with nothing in front: undue hesitation after 5 s.
      if(st.state==='green'&&speed<.3&&along<0&&along>-12&&!ahead(10)){
        m.waitingGreen+=dt;
        if(m.waitingGreen>5&&m.waitingGreen-dt<=5)this.fault('traffic-lights-hesitation',`hesitation-${st.id}-${Math.round(now)}`,'minor',
          `Response to signals – traffic lights: did not move off for over 5 s on green on ${st.road.name??'the road'} (undue hesitation).`);
      }else m.waitingGreen=0;
      m.front=along;m.last=st.state;
    }

    // STOP signs: the car must come to a stop at the line, even when the way is clear.
    for(const m of this.stopLines){
      const s=sampleRoad(m.road,front.x,front.z),p=pointAtAlong(m.road,s.along);
      const past=(s.along-m.lineAlong)*m.dir,towards=(p.direction.x*fwd.x+p.direction.z*fwd.z)*m.dir;
      if(s.distance>roadHalfWidth(m.road)+1||towards<.6||past<-25||past>6){this.stopApproach.delete(m.id);continue}
      let a=this.stopApproach.get(m.id);
      if(!a){a={past,slowest:speed};this.stopApproach.set(m.id,a)}
      if(past<.5)a.slowest=Math.min(a.slowest,speed);
      if(a.past<.5&&past>=.5&&a.slowest>.3)this.fault('traffic-signs',`stop-${m.id}-${Math.round(now)}`,'serious',
        `Response to signs – traffic signs: did not stop at the STOP line coming out of ${m.road.name??'the road'} (slowest ${mph(a.slowest).toFixed(0)} mph). At a STOP sign you must stop, even when the road is clear.`);
      a.past=past;
    }

    // Mounting the pavement, or leaving the road.
    // (A slow touch of the kerb while parking or reversing is the manoeuvre's own control fault, judged there.)
    if(l.surface!=='carriageway'&&speed>(this.manoeuvring&&this.manoeuvring!=='emergency-stop'?2:.3)){
      this.pavement+=dt;
      if(this.pavement>.5&&this.pavement-dt<=.5)this.fault(l.surface==='pavement'?'positioning-pavement':'control-off-road',`kerb-${Math.round(now)}`,l.surface==='pavement'?'serious':'dangerous',
        l.surface==='pavement'?'Control – steering: the car mounted the pavement.':'Control – steering: the car left the road.');
    }else this.pavement=0;

    // Mini-roundabouts: entering while another vehicle is on it, or coming on from close by.
    const rb=this.input.location.junctions.findIndex(j=>j.kind==='mini-roundabout'&&Math.hypot(j.position.x-x,j.position.z-z)<j.radius);
    if(rb>=0&&rb!==this.inRoundabout){
      const j=this.input.location.junctions[rb]!;
      const conflict=this.input.traffic().some(t=>{
        const d=Math.hypot(t.x-j.position.x,t.z-j.position.z);
        if(d<j.radius+1)return true;
        // Approaching it (heading towards the middle) within 12 m.
        const to={x:j.position.x-t.x,z:j.position.z-t.z};
        return d<j.radius+12&&t.speed>1&&(to.x*Math.sin(t.heading)-to.z*Math.cos(t.heading))/d>.7;
      });
      if(conflict)this.fault('junctions-observation',`roundabout-${Math.round(now)}`,'serious','Junctions – observation: entered the mini-roundabout while another vehicle was on it or about to arrive (give way to traffic from the right).');
    }
    this.inRoundabout=rb;
  }

  /** The result: pass or fail, with every fault. */
  finish(scenarioId:string,outcome:AttemptResult['outcome'],duration:Seconds):AttemptResult{
    const findings=this.log.sorted();
    const driving=findings.filter(f=>f.severity==='minor').length;
    const serious=findings.filter(f=>f.severity==='serious').length;
    const dangerous=findings.filter(f=>f.severity==='dangerous').length;
    // The drive is over when the examiner ends it or the time is up; ended early, it is a fail only if a fault
    // had already decided it.
    const failed=driving>15||serious>0||dangerous>0;
    const finished=outcome==='completed'||outcome==='time-limit'||failed;
    const passed=finished&&!failed;
    const notes:string[]=[];
    notes.push(`${INFO}${!finished?'Not finished':passed?'Pass':'Fail'}: ${driving} driving fault${driving===1?'':'s'}, ${serious} serious, ${dangerous} dangerous. A pass allows up to 15 driving faults and no serious or dangerous faults.`);
    if(outcome!=='completed')notes.push(`${INFO}${outcome==='time-limit'?'The time for the drive ran out; it is marked on the faults so far.':'The test was ended before the examiner finished it.'}`);
    if(this.showing&&!this.showing.shown)this.checks.push(`${INFO}Show me: ${this.showing.q.question} Not shown before the test ended.`);
    // DVSA: driving dangerously or potentially dangerously while answering the show me question is a fail.
    if(this.showMeFrom!==null&&findings.some(f=>(f.severity==='serious'||f.severity==='dangerous')&&f.time>=this.showMeFrom!&&f.time<=this.showMeFrom!+30))
      this.checks.push(`${INFO}A serious or dangerous fault came while answering the show me question: DVSA fails the test for driving dangerously or potentially dangerously while answering it.`);
    if(this.checks.length)this.checks.push(`${INFO}Vehicle safety questions and answers: ${DVSA_SOURCE}.`);
    notes.push(...this.checks,...this.advice);
    if(this.redirects)notes.push(`${INFO}You went a different way ${this.redirects} time${this.redirects===1?'':'s'}: not a fault in itself; the examiner gave new directions.`);
    const byHeading=new Map<string,number>();
    for(const f of findings)if(f.severity==='minor'){const h=f.explanation.split(':')[0]!;byHeading.set(h,(byHeading.get(h)??0)+1)}
    for(const [h,n] of [...byHeading].sort((a,b)=>b[1]-a[1]))if(n>=3)notes.push(`${IMPROVE}${h} (${n} driving faults): three or more under one heading is worth practising on its own.`);
    if(findings.length===0&&outcome==='completed')notes.push('No faults recorded on this drive.');
    return {scenarioId,rubricVersion:MOCK_TEST_RUBRIC,outcome,findings,notes,durationSeconds:duration,finishedAt:new Date().toISOString(),
      mockTest:{passed,driving,serious,dangerous,finished}};
  }

  dispose():void{}
}
