import {describe,expect,it} from 'vitest';
import {controlTips,nextTip} from '../../src/ui/controlTips';

const names={accelerate:'R2',brake:'L2',signalLeft:'L1',signalRight:'R1',pause:'Options',recentre:'Share',view:'Circle / B'};
const memory=()=>{const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v)}}};

describe('a control tip at the start of every drive',()=>{
  it('each drive gets the next tip, round and round, remembered on the device',()=>{
    const store=memory();
    const tips=controlTips('touch','assist');
    const shown=Array.from({length:tips.length+1},()=>nextTip('touch','assist',undefined,store));
    expect(shown.slice(0,tips.length)).toEqual(tips);
    expect(shown.at(-1)).toBe(tips[0]);
    expect(new Set(tips).size).toBe(tips.length);
  });

  it('worded for the way of driving: keys, touch buttons, or the controller buttons the person set',()=>{
    expect(controlTips('keyboard','buttons').join(' ')).toContain('Q or E');
    expect(controlTips('keyboard','buttons')).toContain('Steer with A and D (or ← and →). Let go and the wheel straightens.');
    expect(controlTips('touch','tilt').join(' ')).toContain('Tilt the phone');
    expect(controlTips('touch','assist').join(' ')).toContain('The steering is done for you');
    const pad=controlTips('gamepad','stick',names).join(' ');
    expect(pad).toContain('Hold R2 to move off');
    expect(pad).toContain('L1 and R1 signal');
    expect(pad).toContain('Steer with the left stick');
    const headset=controlTips('headset','assist',names);
    expect(headset[0]).toContain('Turn your head');
    expect(headset.join(' ')).toContain('Circle / B switches between the driver’s seat');
    expect(controlTips('headset','assist',{...names,view:null}).join(' ')).not.toContain('switches between the driver’s seat');
  });

  it('without storage (private browsing) it still shows a tip',()=>{
    const broken={getItem:()=>{throw new Error('no')},setItem:()=>{throw new Error('no')}};
    expect(nextTip('keyboard','assist',undefined,broken)).toBe(controlTips('keyboard','assist')[0]);
  });
});
