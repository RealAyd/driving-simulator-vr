import {expect,it} from 'vitest';
import {AdaptiveScale} from '../../src/engine/renderScale';

const run=(s:AdaptiveScale,seconds:number,fps:number)=>{for(let t=0;t<seconds;t+=.5)s.update(.5,fps);return s.level};

it('sharper while the phone keeps up, coarser when it struggles, and no switching back and forth',()=>{
  const s=new AdaptiveScale(1.5);
  expect(s.level).toBe(1.5);
  expect(run(s,7,60)).toBe(1.25);
  expect(run(s,7,60)).toBe(1);
  // Struggles at 1: back to 1.25, and stays there for a minute even when fast again.
  expect(run(s,3.5,30)).toBe(1.25);
  expect(run(s,30,60)).toBe(1.25);
  expect(run(s,33,60)).toBe(1);
  // Never coarser than where it started.
  expect(run(new AdaptiveScale(1.5),10,20)).toBe(1.5);
  // A short dip does nothing.
  expect(run(s,2,30)).toBe(1);
});
