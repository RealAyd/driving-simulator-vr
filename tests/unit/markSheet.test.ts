import {describe,expect,it} from 'vitest';
import {markSheet,positionAt} from '../../src/ui/markSheet';
import type {Finding} from '../../src/contracts';

const f=(ruleId:string,severity:Finding['severity'],time=0):Finding=>({id:`${ruleId}-${time}`,ruleId,incidentId:`${ruleId}-${time}`,severity,eventIds:[],explanation:'x',rubricVersion:'t',time});

describe('the marking sheet',()=>{
  it('rows in the DL25 order, a count of driving faults, S and D',()=>{
    const rows=markSheet([f('speed-limit','minor',1),f('mirrors-change-direction','minor',2),f('speed-limit','minor',3),f('speed-limit','serious',4),f('control-collision','dangerous',5),f('advice-only','advice',6)]);
    expect(rows.map(r=>r.label)).toEqual(['Use of mirrors – change direction','Use of speed','Awareness and planning']);
    expect(rows[1]).toEqual({label:'Use of speed',driving:2,serious:1,dangerous:0});
    expect(rows[2]!.dangerous).toBe(1);
  });
  it('a rule not on the sheet still shows, last, under its own name',()=>{
    expect(markSheet([f('new-rule','minor'),f('vehicle-checks','minor')]).map(r=>r.label)).toEqual(['Vehicle checks','New rule']);
  });
  it('a fault is placed where the car was at its time',()=>{
    expect(positionAt([{t:0,x:0,z:0},{t:2,x:20,z:0}],1)).toEqual({x:10,z:0});
  });
});
