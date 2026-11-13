import {describe,expect,it} from 'vitest';
import {testText} from '../../src/access/profileView';

describe('a mock test result in a few words',()=>{
  it('passed, not passed, ended early',()=>{
    expect(testText({passed:true,driving:4,serious:0,dangerous:0,finished:true})).toBe('Passed · 4 driving faults');
    expect(testText({passed:true,driving:1,serious:0,dangerous:0,finished:true})).toBe('Passed · 1 driving fault');
    expect(testText({passed:false,driving:9,serious:1,dangerous:0,finished:true})).toBe('Not passed · 1 serious');
    expect(testText({passed:false,driving:3,serious:2,dangerous:1,finished:true})).toBe('Not passed · 1 dangerous');
    expect(testText({passed:false,driving:16,serious:0,dangerous:0,finished:true})).toBe('Not passed · 16 driving faults');
    expect(testText({passed:false,driving:2,serious:0,dangerous:0,finished:false})).toBe('Ended early');
  });
});
