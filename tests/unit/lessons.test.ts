import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {Examiner} from '../../src/test/examiner';
import {Instructor} from '../../src/lessons/instructor';
import {LESSONS,planLesson} from '../../src/lessons/syllabus';
import {EventLog} from '../../src/app/eventLog';
import {pointAtAlong} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';
import brentwoodJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';

const goodmayes=parseLocation(goodmayesJson);
const net=new RoadNetwork(goodmayes);
const sp=goodmayes.spawn;
const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
const lesson=(id:string)=>LESSONS.find(l=>l.id===id)!;
const plan=(id:string)=>{const l=lesson(id);return planLesson(net,l,goodmayes,start,l.length,1)};

describe('lessons: routes chosen for the topic',()=>{
  it('ten lessons, numbered in order, each with a briefing and the Highway Code rules',()=>{
    expect(LESSONS.map(l=>l.number)).toEqual([1,2,3,4,5,6,7,8,9,10]);
    for(const l of LESSONS){expect(l.briefing.length).toBeGreaterThan(0);expect(l.rules).toMatch(/Highway Code/)}
  });
  it('turning left: a route with several left turns into side roads',()=>{
    expect(plan('left-turns').steps.filter(s=>s.kind==='side'&&s.turn==='left').length).toBeGreaterThanOrEqual(2);
  });
  it('turning right: several right turns into side roads',()=>{
    expect(plan('right-turns').steps.filter(s=>s.kind==='side'&&s.turn==='right').length).toBeGreaterThanOrEqual(2);
  });
  it('emerging: several road ends',()=>{
    expect(plan('emerging').steps.filter(s=>s.kind==='end').length).toBeGreaterThanOrEqual(3);
  });
  it('traffic lights: the route goes through them',()=>{
    expect(plan('traffic-lights').steps.some(s=>s.kind==='lights')).toBe(true);
  });
  it('mini-roundabouts: Goodmayes\'s only one has no road into it (so the lesson says so); at Brentwood the route goes round one',()=>{
    expect(net.wayTo(start,j=>j.kind==='roundabout',1)).toBeNull();
    const brentwood=parseLocation(brentwoodJson),bnet=new RoadNetwork(brentwood);
    const bs=bnet.locate(brentwood.spawn.position.x,brentwood.spawn.position.z,brentwood.spawn.headingDeg*Math.PI/180)!;
    const {way}=bnet.wayTo(bs,j=>j.kind==='roundabout',1)!;
    expect(way.length).toBeGreaterThan(0);
    // The last road is the way out of the mini-roundabout.
    const j=brentwood.junctions[0]!,end=way.at(-1)!.road.centreline;
    expect(Math.min(...[end[0]!,end.at(-1)!].map(p=>Math.hypot(p.x-j.position.x,p.z-j.position.z)))).toBeLessThan(15);
  });
});

describe('the instructor',()=>{
  /** Drives the first manoeuvre of a lesson's route: with or without mirror check and signal. */
  function drive(id:string,careful:boolean,pavement=false){
    let time=0;
    const events=new EventLog(()=>time);
    const learner={x:sp.position.x,z:sp.position.z,heading:sp.headingDeg*Math.PI/180,speed:0,indicator:'off' as 'off'|'left'|'right'};
    const said:string[]=[];
    const l=lesson(id);
    const instructor=new Instructor({location:goodmayes,lesson:l,events,now:()=>time,learner:()=>learner,traffic:()=>[],signals:()=>[],parked:[],say:t=>said.push(t)});
    const examiner=new Examiner(net,()=>learner,{target:l.length,seed:1,say:t=>said.push(t),events,onComplete:()=>{},listener:instructor,
      planner:(s,target,seed)=>planLesson(net,l,goodmayes,s,target,seed)});
    examiner.reset();instructor.reset();
    const first=examiner.steps[0]!;
    for(const leg of examiner.legs.slice(0,2)){
      const n=Math.ceil(Math.abs(leg.to-leg.from));
      for(let k=0;k<=n&&examiner.index===0;k++){
        const p=pointAtAlong(leg.road,leg.from+(leg.to-leg.from)*k/n);
        const d=Math.hypot(p.x-first.at.x,p.z-first.at.z);
        Object.assign(learner,{x:p.x,z:p.z,heading:Math.atan2(p.direction.x*leg.dir,-p.direction.z*leg.dir),speed:d<25?4:8});
        if(pavement&&d<40&&d>39)events.emit('assessment.finding',{findingId:'f1',incidentId:'kerb-1',severity:'serious',ruleId:'positioning-pavement'});
        if(careful){
          if(d<60&&d>58)events.emit('observation.dwell',{target:'interior'});
          learner.indicator=d<50&&first.turn!=='ahead'?first.turn:'off';
        }
        const dt=1/Math.max(1,learner.speed);
        time+=dt;examiner.fixedUpdate(dt);instructor.fixedUpdate(dt);
      }
    }
    return {said,notes:instructor.notes(),counts:instructor.counts,first};
  }
  it('careful: no reminders, "well done", and the turn listed as done well',()=>{
    const r=drive('left-turns',true);
    expect(r.counts.manoeuvres).toBe(1);
    expect(r.said).not.toContain('Check your mirrors.');
    expect(r.said.some(s=>/^(Well done|Good)/.test(s))).toBe(true);
    expect(r.counts.improve).toBe(0);
  });
  it('no mirrors, no signal: reminded in good time, then told what to do next time',()=>{
    const r=drive('left-turns',false);
    expect(r.said).toContain('Check your mirrors.');
    expect(r.said.some(s=>s.startsWith('Next time,'))).toBe(true);
    expect(r.notes.some(n=>/signal left/.test(n))).toBe(true);
  });
  it('a mistake on the way is corrected at once, and the junction is not praised even if the routine was right',()=>{
    const r=drive('left-turns',true,true);
    expect(r.said.some(t=>/mounted the pavement/.test(t))).toBe(true);
    expect(r.said.some(t=>/^(Well done|Good\.)/.test(t))).toBe(false);
    expect(r.notes.some(n=>/pavement/.test(n))).toBe(true);
  });
});
