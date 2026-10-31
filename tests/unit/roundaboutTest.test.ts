import {describe,expect,it} from 'vitest';
import {IMPROVE,type Location} from '../../src/contracts';
import {RoadNetwork,type Route} from '../../src/test/route';
import {Examiner} from '../../src/test/examiner';
import {routeLanePath} from '../../src/test/routePath';
import {MockTestAssessor} from '../../src/assessment/mockTest';
import {EventLog} from '../../src/app/eventLog';
import {Instructor} from '../../src/lessons/instructor';
import {LESSONS} from '../../src/lessons/syllabus';
import {drivingView} from '../../src/world/roundabouts';
import {ahead,laneAt,pointAt,project,ringLanes} from '../../src/world/roundaboutLanes';
import {loadCentre} from './trafficDrive';

/**
 * A mock test through a roundabout bigger than a mini (Northampton's, about 55 m across): the examiner gives each
 * direction in good time and goes on to the next once the learner is round (the ring's middle is tens of metres from
 * where the car goes), and the marking follows the Highway Code (rules 185 and 186): the way of the exit signalled
 * on the approach (none going ahead), left to leave.
 */
const bigRings=(loc:Location)=>drivingView(loc).junctions.filter(j=>j.id.startsWith('ring-')&&j.radius>=12);

function routeThroughRing(loc:Location,net:RoadNetwork):Route{
  const sp=loc.spawn,start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
  const rings=bigRings(loc);
  const atRing=(r:Route)=>r.steps.filter(s=>s.kind==='roundabout'&&rings.some(j=>Math.hypot(j.position.x-s.at.x,j.position.z-s.at.z)<2));
  return net.planFor(start,1800,1,r=>atRing(r).length*100+r.steps.length,40);
}

/**
 * Drives the route at a learner's pace with `signal` deciding the indicator (the mirrors checked before each new
 * signal); the examiner's and assessor's record, and an instructor's (the roundabouts lesson's coaching) alongside.
 */
function drive(loc:Location,route:Route,signal:(at:{x:number;z:number},step:Route['steps'][number]|undefined,ex:Examiner)=>'off'|'left'|'right',mirrorsAgain=true,
  reshape:(path:Array<{x:number;z:number}>)=>Array<{x:number;z:number}>=p=>p){
  const net=new RoadNetwork(loc);
  const path=reshape(routeLanePath(route.legs,[],drivingView(loc).junctions));
  const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]!+Math.hypot(path[i]!.x-path[i-1]!.x,path[i]!.z-path[i-1]!.z));
  let time=0;
  const events=new EventLog(()=>time);
  const learner={x:path[0]!.x,z:path[0]!.z,heading:0,speed:6,indicator:'off' as 'off'|'left'|'right'};
  const assessor=new MockTestAssessor({location:loc,events,now:()=>time,
    learner:()=>({pose:{position:{x:learner.x,y:0,z:learner.z},heading:learner.heading},speed:learner.speed,indicator:learner.indicator,surface:'carriageway'}),
    traffic:()=>[],parked:[]});
  const said:string[]=[],coached:string[]=[];const done:Array<{step:Route['steps'][number];followed:boolean}>=[];
  const instructor=new Instructor({location:loc,lesson:LESSONS.find(l=>l.coaching.includes('roundabout'))!,events,now:()=>time,learner:()=>learner,
    traffic:()=>[],signals:()=>[],parked:[],say:t=>coached.push(t)});
  /** Where the learner was when each direction was given. */
  const told=new Map<Route['steps'][number],{x:number;z:number}>();
  const ex=new Examiner(net,()=>learner,{target:1800,seed:1,say:t=>said.push(t),events,onComplete:()=>{},planner:()=>route,
    listener:{direction:s=>{told.set(s,{x:learner.x,z:learner.z});assessor.direction(s);instructor.direction(s)},
      done:(s,f)=>{done.push({step:s,followed:f});assessor.done(s,f);instructor.done(s,f)}}});
  ex.reset();instructor.reset();
  for(let s=0,i=1;s<cum.at(-1)!-2;s+=learner.speed/30){
    while(i<cum.length-1&&cum[i]!<s)i++;
    const a=path[i-1]!,b=path[i]!,t=(s-cum[i-1]!)/((cum[i]!-cum[i-1]!)||1);
    learner.x=a.x+(b.x-a.x)*t;learner.z=a.z+(b.z-a.z)*t;learner.heading=Math.atan2(b.x-a.x,-(b.z-a.z));
    const indicator=signal(learner,ex.steps[ex.index],ex);
    if(indicator!=='off'&&indicator!==learner.indicator)for(const target of ['interior',`${indicator}-door`])events.emit('observation.dwell',{target});
    // (And again every few seconds while signalling: the mirror on that side before moving across a lane.)
    else if(mirrorsAgain&&indicator!=='off'&&Math.floor(time/3)!==Math.floor((time-1/30)/3))events.emit('observation.dwell',{target:`${indicator}-door`});
    learner.indicator=indicator;
    time+=1/30;
    ex.fixedUpdate(1/30);assessor.fixedUpdate(1/30);instructor.fixedUpdate(1/30);
  }
  return {said,done,told,coached,notes:instructor.notes(),findings:assessor.current};
}

describe('a mock test through a big roundabout',()=>{
  it('directions come in good time and the test moves on once round; signalling as the Highway Code has it is not faulted, not signalling left to leave is',async()=>{
    const loc=await loadCentre('northampton');
    const net=new RoadNetwork(loc);
    const route=routeThroughRing(loc,net);
    const rings=bigRings(loc);
    const ringSteps=route.steps.filter(s=>s.kind==='roundabout'&&rings.some(j=>Math.hypot(j.position.x-s.at.x,j.position.z-s.at.z)<2));
    expect(ringSteps.length).toBeGreaterThan(0);
    // The ring of each step, and how far round to its exit.
    const ringOf=(s:Route['steps'][number])=>rings.find(j=>Math.hypot(j.position.x-s.at.x,j.position.z-s.at.z)<2);
    // Signalling as the Highway Code has it: the exit's way on the approach (none ahead), left once nearly at the exit
    // and on until off the roundabout.
    const careful=()=>{
      const on=new Set<Route['steps'][number]>(),leaving=new Set<Route['steps'][number]>();
      return (at:{x:number;z:number},step:Route['steps'][number]|undefined,ex:Examiner):'off'|'left'|'right'=>{
        if(!step||step.kind!=='roundabout'||!ex.steps.length)return 'off';
        const j=ringOf(step);
        if(!j)return step.turn==='ahead'?'off':step.turn;
        const d=Math.hypot(at.x-j.position.x,at.z-j.position.z);
        if(d<j.radius)on.add(step);
        if(!on.has(step))return d>j.radius+60||step.turn==='ahead'?'off':step.turn;
        // On the ring: left (the mirrors first) once past the exit before its own (rule 186), and on off it.
        const exit=step.to.road.centreline[step.to.dir>0?0:step.to.road.centreline.length-1]!,rl=ringLanes(j)!;
        const mine=project(rl,exit).along,before=rl.exits.filter(e=>ahead(rl,e,mine)>4).sort((a,b)=>ahead(rl,a,mine)-ahead(rl,b,mine))[0]??mine;
        const passed=ahead(rl,before,project(rl,at).along)<ahead(rl,before,mine)&&ahead(rl,before,project(rl,at).along)>3;
        if(passed)leaving.add(step);
        return d>j.radius||leaving.has(step)?'left':step.turn==='right'?'right':'off';
      };
    };
    const good=drive(loc,route,careful());
    // Every direction up to the roundabout and through it followed (none left hanging there; the path here ends just
    // after the last junction, before the examiner can judge it).
    expect(good.done.filter(d=>!d.followed)).toEqual([]);
    for(const s of ringSteps){
      expect(good.done.some(d=>d.step===s&&d.followed),s.say).toBe(true);
      // Told in good time: tens of metres before the ring's edge, not on top of it (nor from its middle).
      const at=good.told.get(s)!,j=ringOf(s)!,before=Math.hypot(at.x-j.position.x,at.z-j.position.z)-j.radius;
      expect(before,s.say).toBeGreaterThan(20);expect(before,s.say).toBeLessThan(80);
    }
    const ringFaults=good.findings.filter(f=>/roundabout/.test(f.explanation));
    expect(ringFaults.map(f=>f.explanation)).toEqual([]);
    // Never signalling left to leave (ahead or right): a driving fault each time.
    const signal=careful(),noLeft=drive(loc,route,(at,step,ex)=>{const s=signal(at,step,ex);return s==='left'&&step?.turn!=='left'?'off':s});
    const leaving=noLeft.findings.filter(f=>/no left signal leaving the roundabout/.test(f.explanation));
    expect(leaving.length).toBe(ringSteps.filter(s=>s.turn!=='left').length);
    // The instructor, alongside: praise for the left signal to leave; without it, told to signal as the exit comes up.
    if(ringSteps.some(s=>s.turn!=='left')){
      expect(good.notes.some(n=>/left signal to leave/.test(n))).toBe(true);
      expect(good.notes.filter(n=>/roundabout/.test(n)&&n.startsWith(IMPROVE))).toEqual([]);
      expect(good.coached.filter(t=>/ours is the next exit/.test(t))).toEqual([]);
      expect(noLeft.coached.some(t=>/ours is the next exit/.test(t))).toBe(true);
      expect(noLeft.notes.some(n=>/signal left to leave/.test(n))).toBe(true);
    }
  },300_000);

  it('lanes: on in the wrong lane, or across a lane without the mirror, is marked (positioning, mirrors)',async()=>{
    const loc=await loadCentre('northampton');
    const net=new RoadNetwork(loc),route=routeThroughRing(loc,net),rings=bigRings(loc);
    const right=route.steps.filter(s=>s.kind==='roundabout'&&s.turn==='right'&&rings.some(j=>Math.hypot(j.position.x-s.at.x,j.position.z-s.at.z)<2));
    expect(right.length).toBeGreaterThan(0);
    const leftOn=(step:Route['steps'][number]|undefined)=>step?.kind==='roundabout'&&step.turn!=='ahead'?step.turn:'off';
    // Round in the left lane all the way, taking an exit to the right (the right-hand lane is for it).
    const outside=(path:Array<{x:number;z:number}>)=>path.map(p=>{
      for(const j of rings){const r=ringLanes(j)!,q=project(r,p),w=r.stretch[0]!.width;
        if(laneAt(r,p)===2)return pointAt(r,q.along,q.left+w)}
      return p;
    });
    const wrong=drive(loc,route,(_,step)=>leftOn(step),true,outside);
    expect(wrong.findings.filter(f=>/on to the roundabout in the left-hand lane/.test(f.explanation)).length).toBe(right.length);
    // In the right lane, then out to the left lane with no look in the left mirror (none at all).
    const noMirrors=drive(loc,route,()=>'off',false);
    expect(noMirrors.findings.some(f=>/no check of the left mirror before moving into the left-hand lane/.test(f.explanation))).toBe(true);
  },300_000);
});
