import {describe,expect,it} from 'vitest';
import {cleanResult,profileOf} from '../src/profile.js';
import type {Drive} from '../src/store.js';

const at=(minutesAgo:number)=>new Date(Date.now()-minutesAgo*60_000);
let n=0;
const drive=(p:Partial<Drive>):Drive=>({id:`d${++n}`,accountId:'a',kind:'x',scenario:'goodmayes-mock-test',mode:'test',paidFrom:'sessions',
  startedAt:at(100),status:'completed',endedAt:at(90),...p});
const test=(passed:boolean,driving:number,serious=0,areas:Array<[string,number,number?]>=[])=>({seconds:900,
  test:{passed,driving,serious,dangerous:0,finished:true},areas:areas.map(([label,d,s=0])=>({label,driving:d,serious:s,dangerous:0}))});

describe('the learner\'s profile',()=>{
  it('a drive\'s result is kept to what it may hold (the browser sends it)',()=>{
    expect(cleanResult({seconds:61.4,test:{passed:true,driving:3.2,serious:-1,dangerous:'x'},areas:[{label:'  Junctions – observation ',driving:2},{label:''}],evil:'x'}))
      .toEqual({seconds:61,test:{passed:true,driving:3,serious:0,dangerous:0,finished:true},areas:[{label:'Junctions – observation',driving:2,serious:0,dangerous:0}]});
    expect(cleanResult('nope')).toBeUndefined();
    expect(cleanResult({areas:Array.from({length:99},(_,i)=>({label:`r${i}`,driving:1}))})!.areas).toHaveLength(30);
  });

  it('totals, the last drives, the best mock test, weak areas and progress',()=>{
    const p=profileOf([
      drive({endedAt:at(10),result:test(true,4,0,[['Use of mirrors – signalling',2],['Junctions – observation',1]])}),
      drive({endedAt:at(20),result:test(false,9,1,[['Junctions – observation',3,1],['Use of speed',2]])}),
      drive({endedAt:at(30),result:test(true,7,0,[['Use of mirrors – signalling',4]])}),
      drive({endedAt:at(40),mode:'lesson',scenario:'goodmayes-lesson',result:{seconds:600,lesson:{title:'Junctions',good:5,improve:2}}}),
      drive({endedAt:at(50),mode:'free',scenario:'goodmayes-free-drive',status:'ended',outcome:'collision',result:{seconds:120}}),
      drive({status:'started',endedAt:undefined})
    ]);
    expect(p.totals).toEqual({lesson:1,test:3,free:0,minutes:57});
    expect(p.recent.map(r=>r.outcome)).toEqual(['completed','completed','completed','completed','collision']);
    expect(p.best).toMatchObject({tests:3,passes:2,fewestFaults:4});
    // Junctions: 1 + 3 + 1 serious = 5 marks (the serious one counts double: 7); mirrors 6 driving faults (6).
    expect(p.weak.map(w=>[w.label,w.times])).toEqual([['Junctions – observation',5],['Use of mirrors – signalling',6],['Use of speed',2]]);
    // Oldest first.
    expect(p.progress.map(t=>t.driving)).toEqual([7,9,4]);
  });

  it('nothing driven yet: an empty profile',()=>{
    expect(profileOf([])).toEqual({totals:{lesson:0,test:0,free:0,minutes:0},recent:[],best:null,weak:[],progress:[]});
  });
});
