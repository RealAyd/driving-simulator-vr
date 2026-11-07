import {describe,expect,it} from 'vitest';
import {assessStage,summarise,type ChallengeLogic} from '../../src/decision/assess';
import {BRENTWOOD_ROUTE_1} from '../../src/decision/routes/brentwoodRoute1';
import {BRENTWOOD_ROUTE_2} from '../../src/decision/routes/brentwoodRoute2';
import {DECISION_ROUTES} from '../../src/decision/routes';

const challenge=(route:typeof BRENTWOOD_ROUTE_1,id:string)=>route.challenges.find(c=>c.id===id)!;
// An emerging left turn (approach, line, clear), the mini-roundabout ahead (one decision, on the move), meeting
// traffic behind a parked van.
const C1=challenge(BRENTWOOD_ROUTE_1,'king-edward-emerge'),C2=challenge(BRENTWOOD_ROUTE_2,'the-drive-mini'),
  C3=challenge(BRENTWOOD_ROUTE_1,'queens-road-meeting');
const levels=(v:{faults:{level:string}[]})=>v.faults.map(f=>f.level);

describe('decision challenges as authored',()=>{
  for(const route of DECISION_ROUTES)for(const c of route.challenges){
    it(`${route.id} ${c.id}: every accepted sequence is fault-free`,()=>{
      for(const st of c.stages)for(const seq of st.accepted){
        const v=assessStage(c,st.id,seq);
        expect(v.faults,`${st.id}: ${seq.join(', ')}`).toEqual([]);
      }
    });
    it(`${route.id} ${c.id}: pressing every button does not pass`,()=>{
      // Each stage: every button in the order shown (the first decision is the one taken).
      const worst=c.stages.flatMap(st=>levels(assessStage(c,st.id,st.buttons)));
      expect(worst.some(l=>l==='serious'||l==='dangerous')).toBe(true);
    });
    it(`${route.id} ${c.id}: every button is one the rules, neutral list or answers know`,()=>{
      for(const st of c.stages)for(const b of st.buttons){
        const v=assessStage(c,st.id,[b]);
        expect(v.faults.some(f=>f.ruleId.startsWith('unnecessary-')),`${st.id}: ${b}`).toBe(false);
      }
    });
    it(`${route.id} ${c.id}: the scene is set up for each stage`,()=>{
      for(const st of c.stages)expect(c.place[st.id],st.id).toBeTruthy();
    });
  }
});

describe('judging a decision',()=>{
  it('records a fault when it is committed: a later mirror check does not undo it',()=>{
    const v=assessStage(C1,'approach',['signal-left','mirror-interior','mirror-left']);
    expect(v.faults.map(f=>[f.ruleId,f.at])).toEqual([['mirrors-before-signal',0]]);
  });
  it('accepts another safe order (the door mirror before the interior one)',()=>{
    expect(assessStage(C1,'approach',['mirror-left','mirror-interior','signal-left']).faults).toEqual([]);
  });
  it('marks omissions when submitted',()=>{
    const v=assessStage(C1,'approach',['mirror-interior','mirror-left']);
    expect(v.faults.map(f=>f.ruleId)).toEqual(['no-signal']);
  });
  it('waiting with traffic coming is right, never hesitation',()=>{
    const v=assessStage(C1,'line',['look-right','give-way']);
    expect(v.faults).toEqual([]);expect(v.decision).toBe('wait');expect(v.next).toBe('clear');
  });
  it('going in front of the grey car is dangerous and the car is held',()=>{
    const v=assessStage(C1,'line',['look-right','go']);
    expect(levels(v)).toEqual(['dangerous']);expect(v.intervened).toBe(true);expect(v.next).toBe('clear');
  });
  it('waiting when the way is clear is hesitation (only there), and the drive goes on',()=>{
    const v=assessStage(C1,'clear',['look-right','give-way']);
    expect(v.faults.map(f=>f.ruleId)).toEqual(['hesitation']);expect(v.next).toBe('done');
  });
  it('a look before waiting is out of date once the traffic has passed',()=>{
    const history=new Map([['line',['look-right','give-way']]]);
    expect(assessStage(C1,'clear',['look-left','go'],history).faults.map(f=>f.ruleId)).toEqual(['fresh-look-right']);
  });
  it('the first decision counts: a second one is ignored',()=>{
    const v=assessStage(C2,'approach',['look-right','look-left','go','give-way']);
    expect(v.decision).toBe('go');expect(v.faults).toEqual([]);
  });
  it('grades a misleading signal by what the picture shows',()=>{
    // At a mini-roundabout going ahead, a right signal says the car is going round: serious.
    expect(assessStage(C2,'approach',['look-right','signal-right','go']).faults.map(f=>f.level)).toEqual(['serious']);
    // Waiting behind a parked van, it says little more than that the car will pull out: minor.
    expect(assessStage(C3,'approach',['mirror-interior','signal-right','wait']).faults.map(f=>f.level)).toEqual(['minor']);
  });
  it('waiting at a mini-roundabout with no one to give way to is hesitation',()=>{
    expect(assessStage(C2,'approach',['look-right','give-way']).faults.map(f=>f.ruleId)).toEqual(['hesitation']);
  });
  it('a pull-up: the place, then the signal, then the stopping sequence in order',()=>{
    const P=challenge(BRENTWOOD_ROUTE_1,'rose-valley-pull-up');
    expect(assessStage(P,'approach',['mirror-interior','mirror-left','signal-left','stop-past-junction']).faults.map(f=>f.ruleId)).toEqual(['signal-junction']);
    expect(assessStage(P,'approach',['mirror-interior','mirror-left','stop-at-junction','signal-left']).faults.map(f=>[f.ruleId,f.level])).toEqual([['at-junction','serious'],['place','serious']]);
    expect(assessStage(P,'stopped',['neutral','handbrake']).faults.map(f=>f.ruleId)).toEqual(['handbrake-first','cancel']);
  });
  it('anything no rule names is an unnecessary action (feedback only)',()=>{
    const c:ChallengeLogic={id:'t',stages:[{id:'s',safe:'go',go:'go',wait:'give-way',buttons:['look-right','horn','go','give-way'],rules:[],accepted:[['look-right','go']],next:{go:'done'},explain:''}]};
    const v=assessStage(c,'s',['horn','look-right','go']);
    expect(v.faults.map(f=>[f.ruleId,f.level])).toEqual([['unnecessary-horn','feedback']]);
  });
  it('sums the test: no serious or dangerous fault and at most 15 minor ones passes',()=>{
    const ok=summarise(['a'],[{challengeId:'a',verdict:assessStage(C1,'clear',['look-right','give-way'])}]);
    expect(ok.passed).toBe(true);expect(ok.minor).toBe(1);
    const bad=summarise([C1.id],[{challengeId:C1.id,verdict:assessStage(C1,'line',['go'])}]);
    expect(bad.passed).toBe(false);expect(bad.interventions).toBe(1);expect(bad.challenges[0]!.worst).toBe('dangerous');
  });
});
