import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ExaminerVoice} from '../../src/test/voice';

// A device voice that takes 1 s a sentence (no recorded clips here), recording what it starts and what is cut.
let spoken:string[]=[];
let current:{text:string;onend:(()=>void)|null;onerror:(()=>void)|null}|null=null;
beforeEach(()=>{
  vi.useFakeTimers();spoken=[];current=null;
  (globalThis as any).SpeechSynthesisUtterance=class{text:string;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(t:string){this.text=t}};
  (globalThis as any).speechSynthesis={paused:false,getVoices:()=>[],addEventListener(){},resume(){},
    speak(u:any){if(u.text.trim()){spoken.push(u.text);current=u;setTimeout(()=>{if(current===u){current=null;u.onend?.()}},1000)}},
    cancel(){const u=current;current=null;u?.onerror?.()}};
});
afterEach(()=>{vi.useRealTimers();delete (globalThis as any).speechSynthesis});

it('a direction cuts the instructor short and is said at once; the instructor\'s waiting words follow it',async()=>{
  const v=new ExaminerVoice();
  v.say('Keep to the left. Leave more room.',true);
  await vi.advanceTimersByTimeAsync(200);
  expect(spoken).toEqual(['Keep to the left.']);
  v.say('Take the next road on the left.');
  await vi.advanceTimersByTimeAsync(10);
  expect(spoken.at(-1)).toBe('Take the next road on the left.');
  await vi.advanceTimersByTimeAsync(3000);
  expect(spoken).toEqual(['Keep to the left.','Take the next road on the left.','Leave more room.']);
});

it('a new direction replaces one still waiting, but waits for the direction being spoken',async()=>{
  const v=new ExaminerVoice();
  v.say('At the end of the road, turn right. Then take the next left.');
  await vi.advanceTimersByTimeAsync(200);
  v.say('Take the next road on the left.');
  await vi.advanceTimersByTimeAsync(3000);
  expect(spoken).toEqual(['At the end of the road, turn right.','Take the next road on the left.']);
});

it('clips are played without the silence recorded before and after the speech',async()=>{
  const {spoken}=await import('../../src/test/voice');
  const rate=1000,data=new Float32Array(2000);
  for(let i=300;i<1500;i++)data[i]=Math.sin(i)*.5;
  const r=spoken({sampleRate:rate,length:data.length,duration:2,getChannelData:()=>data});
  expect(r.from).toBeCloseTo(.24,1);expect(r.to).toBeCloseTo(1.56,1);
  // All silence: played whole.
  expect(spoken({sampleRate:rate,length:10,duration:.01,getChannelData:()=>new Float32Array(10)})).toEqual({from:0,to:.01});
});
