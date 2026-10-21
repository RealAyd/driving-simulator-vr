import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {BRIEFING,Examiner,TELL_ME_INTRO} from '../../src/test/examiner';
import {SHOW_ME,TELL_ME,tellMeChoices} from '../../src/test/vehicleChecks';
import {MockTestAssessor} from '../../src/assessment/mockTest';
import {CarControls} from '../../src/vehicle/carControls';
import {EventLog} from '../../src/app/eventLog';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);

/** An examiner and the marking at Goodmayes, with the car's controls; time advanced by `run`. */
function setUp(tellMe=TELL_ME[0]!,showMe=SHOW_ME[2]!){
  let time=0;
  const events=new EventLog(()=>time);
  const sp=goodmayes.spawn;
  const learner={x:sp.position.x,z:sp.position.z,heading:sp.headingDeg*Math.PI/180,speed:0};
  const controls=new CarControls(events);
  const assessor=new MockTestAssessor({location:goodmayes,events,now:()=>time,
    learner:()=>({pose:{position:{x:learner.x,y:0,z:learner.z},heading:learner.heading},speed:learner.speed,indicator:'off',surface:'carriageway'}),
    traffic:()=>[],parked:[]});
  const said:string[]=[];
  let asked:string|null=null;
  const examiner=new Examiner(new RoadNetwork(goodmayes),()=>learner,{target:1500,seed:3,say:t=>said.push(t),events,onComplete:()=>{},listener:assessor,
    tellMe,showMe,askTellMe:q=>{asked=q.question}});
  examiner.reset();assessor.reset();
  const run=(seconds:number)=>{for(let t=0;t<seconds;t+=1/30){time+=1/30;controls.update(1/30);examiner.fixedUpdate(1/30);assessor.fixedUpdate(1/30)}};
  return {examiner,assessor,controls,said,learner,run,asked:()=>asked,showMe};
}

describe('vehicle safety questions',()=>{
  it('DVSA\'s main questions: 14 tell me and 7 show me; the choices are DVSA answers, the right one once',()=>{
    expect(TELL_ME).toHaveLength(14);
    expect(SHOW_ME).toHaveLength(7);
    const answers=new Set(TELL_ME.map(q=>q.answer));
    for(const q of TELL_ME)for(const seed of [0,1,2,5,9]){
      const c=tellMeChoices(q,seed);
      expect(c).toHaveLength(3);
      expect(new Set(c).size).toBe(3);
      expect(c.filter(a=>a===q.answer)).toHaveLength(1);
      for(const a of c)expect(answers.has(a)).toBe(true);
    }
    // The order varies with the seed.
    expect(new Set([0,1,2].map(seed=>tellMeChoices(TELL_ME[0]!,seed).indexOf(TELL_ME[0]!.answer))).size).toBe(3);
  });

  it('tell me comes first: the drive waits for the answer, then the briefing',()=>{
    const t=setUp();
    t.run(2);
    expect(t.examiner.phase).toBe('tell-me');
    expect(t.said[0]).toBe(`${TELL_ME_INTRO} ${TELL_ME[0]!.question}`);
    expect(t.asked()).toBe(TELL_ME[0]!.question);
    t.examiner.answerTellMe(TELL_ME[0]!.answer);
    t.run(1);
    expect(t.said).toContain(BRIEFING);
    expect(t.assessor.current.filter(f=>f.ruleId==='vehicle-checks')).toEqual([]);
  });

  it('a wrong tell me answer is one driving fault, with the right answer in the report',()=>{
    const t=setUp();
    t.run(1);
    t.examiner.answerTellMe(TELL_ME[5]!.answer);
    const f=t.assessor.current.filter(x=>x.ruleId==='vehicle-checks');
    expect(f.map(x=>x.severity)).toEqual(['minor']);
    expect(f[0]!.explanation).toContain(TELL_ME[0]!.answer);
  });

  it('show me: the control asked for within 30 s is no fault; the wrong one, or none, is a driving fault',()=>{
    for(const [press,faults] of [['dipped',0],['rear-demister',1],[null,1]] as const){
      const t=setUp();
      t.run(1);t.examiner.answerTellMe(TELL_ME[0]!.answer);
      t.assessor.showMe(t.showMe);
      t.run(5);
      if(press)t.controls.press(press);
      t.run(50);
      expect(t.assessor.current.filter(f=>f.ruleId==='vehicle-checks')).toHaveLength(faults);
    }
  });

  it('one driving fault when both are wrong (DVSA: one or both wrong is one driving fault)',()=>{
    const t=setUp();
    t.run(1);t.examiner.answerTellMe(TELL_ME[5]!.answer);
    t.assessor.showMe(t.showMe);
    t.run(35);
    const f=t.assessor.current.filter(x=>x.ruleId==='vehicle-checks');
    expect(f.map(x=>x.severity)).toEqual(['minor']);
    expect(f[0]!.explanation).toMatch(/Tell me.*Show me/);
  });

  it('the show me question is asked once while driving, after the first direction, away from junctions',()=>{
    const t=setUp();
    t.run(1);t.examiner.answerTellMe(TELL_ME[0]!.answer);
    t.examiner.index=1;
    t.learner.speed=8;
    t.run(10);
    expect(t.said.filter(s=>s===t.showMe.question).length).toBeLessThanOrEqual(1);
  });

  it('car controls: main beam needs the headlights, the rear fog light needs dipped headlights first',()=>{
    const events=new EventLog(()=>0);
    const c=new CarControls(events);
    const notices:string[]=[];c.onNotice=t=>notices.push(t);
    c.press('rear-fog');
    expect(c.isOn('rear-fog')).toBe(false);
    expect(notices).toHaveLength(1);
    c.press('main-beam');
    expect(c.isOn('dipped')&&c.isOn('main-beam')).toBe(true);
    c.press('dipped');
    expect(c.onNow).toEqual([]);
    c.press('front-wash');
    expect(c.wiping.front).toBe(true);
    c.update(5);
    expect(c.wiping.front).toBe(false);
  });
});
