import {beforeAll,describe,expect,it} from 'vitest';

// public/theme.js: light from sunrise to sunset in Great Britain, dark otherwise (until the driver chooses).
type DpTheme={sun(d:Date):{rise:Date;set:Date};isDaytime(d:Date):boolean;current(d?:Date):'light'|'dark'};
let t:DpTheme;
beforeAll(async()=>{
  const file='../../public/theme.js';
  await import(/* @vite-ignore */ file);
  t=(globalThis as unknown as {dpTheme:DpTheme}).dpTheme;
});
const at=(iso:string)=>new Date(iso);

describe('the theme follows the daylight',()=>{
  it('midsummer: light through a long evening, dark by late night',()=>{
    expect(t.isDaytime(at('2026-06-21T12:00:00Z'))).toBe(true);
    expect(t.isDaytime(at('2026-06-21T20:00:00Z'))).toBe(true); // 9 pm BST
    expect(t.isDaytime(at('2026-06-21T21:30:00Z'))).toBe(false);
    expect(t.isDaytime(at('2026-06-21T03:00:00Z'))).toBe(false);
  });
  it('midwinter: dark by half past four and before eight in the morning',()=>{
    expect(t.isDaytime(at('2026-12-21T12:00:00Z'))).toBe(true);
    expect(t.isDaytime(at('2026-12-21T16:30:00Z'))).toBe(false);
    expect(t.isDaytime(at('2026-12-21T07:30:00Z'))).toBe(false);
  });
  it('sunrise and sunset land where they do in the Midlands (within a quarter of an hour)',()=>{
    const minutes=(d:Date)=>d.getUTCHours()*60+d.getUTCMinutes();
    const june=t.sun(at('2026-06-21T12:00:00Z')),dec=t.sun(at('2026-12-21T12:00:00Z'));
    expect(Math.abs(minutes(june.rise)-(3*60+45))).toBeLessThan(15);  // about 04:45 BST
    expect(Math.abs(minutes(june.set)-(20*60+35))).toBeLessThan(15);  // about 21:35 BST
    expect(Math.abs(minutes(dec.rise)-(8*60+15))).toBeLessThan(15);
    expect(Math.abs(minutes(dec.set)-(15*60+55))).toBeLessThan(15);
  });
  it('the time decides only until the driver chooses (no storage here: the time)',()=>{
    expect(t.current(at('2026-12-21T12:00:00Z'))).toBe('light');
    expect(t.current(at('2026-12-21T20:00:00Z'))).toBe('dark');
  });
});
