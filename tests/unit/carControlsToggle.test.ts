import {describe,expect,it} from 'vitest';
import {CarControls} from '../../src/vehicle/carControls';

const sink={emit:()=>{}};

describe('the car controls switch on and off',()=>{
  it('wipers: on until switched off (not only a wash)',()=>{
    const c=new CarControls(sink as never);
    c.press('wipers');
    for(let t=0;t<10;t+=.5)c.update(.5);
    expect(c.wiping.front).toBe(true);
    c.press('wipers');
    expect(c.wiping.front).toBe(false);
  });
  it('dipped headlights: a tap on, a tap off; main beam needs them and goes with them',()=>{
    const c=new CarControls(sink as never);
    c.press('dipped');expect(c.isOn('dipped')).toBe(true);
    c.press('main-beam');expect(c.isOn('main-beam')).toBe(true);
    c.press('dipped');expect(c.isOn('dipped')).toBe(false);expect(c.isOn('main-beam')).toBe(false);
  });
  it('switched on at the start of a drive after dark without counting as a press',()=>{
    const events:unknown[]=[];
    const c=new CarControls({emit:(...a:unknown[])=>events.push(a)} as never);
    c.switchOn('dipped');
    expect(c.isOn('dipped')).toBe(true);
    expect(events).toEqual([]);
  });
});
