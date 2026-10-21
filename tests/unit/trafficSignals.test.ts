import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {TrafficSignals,type Aspect} from '../../src/world/trafficSignals';
import {Traffic} from '../../src/actors/traffic';
import {MockTestAssessor} from '../../src/assessment/mockTest';
import {EventLog} from '../../src/app/eventLog';
import {layoutTownscape} from '../../src/world/townscape';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);

describe('traffic lights (Goodmayes, from the map)',()=>{
  it('four sets: the Green Lane / Goodmayes Lane / Goodmayes Road and High Road / Barley Lane junctions, two crossings',()=>{
    expect(goodmayes.signals.map(g=>g.kind).sort()).toEqual(['crossing','crossing','junction','junction']);
    const green=goodmayes.signals.find(g=>g.kind==='junction'&&g.stops.some(s=>s.roadId.startsWith('green-lane')))!;
    expect(new Set(green.stops.map(s=>s.roadId.replace(/-\d+$/,''))).size).toBeGreaterThanOrEqual(3);
  });

  it('each light runs red → red and amber → green → amber → red; directions that cross are never green together',()=>{
    const signals=new TrafficSignals(goodmayes);
    const seen=new Map<string,Aspect[]>();
    for(let t=0;t<240;t+=.1){
      signals.fixedUpdate(.1);
      for(const s of signals.stops){const l=seen.get(s.id)??[];if(l.at(-1)!==s.state)l.push(s.state);seen.set(s.id,l)}
      // Within a set, two stops on green at once face along the same line (or exactly opposite).
      const green=signals.stops.filter(s=>s.state==='green');
      for(const a of green)for(const b of green)if(a.group===b.group){
        const d=Math.abs(Math.sin(a.heading-b.heading));
        expect(d,`${a.id} and ${b.id}`).toBeLessThan(.6);
      }
    }
    const order=['red','red-amber','green','amber'];
    for(const [id,states] of seen){
      expect(states.length,id).toBeGreaterThan(4);
      for(let i=1;i<states.length;i++)expect(order.indexOf(states[i]!),`${id}: ${states.join(' ')}`).toBe((order.indexOf(states[i-1]!)+1)%4);
    }
  });

  it.each([3,5,7,11,13])('background traffic stops at red (seed %i)',seed=>{
    const signals=new TrafficSignals(goodmayes);
    const sp=goodmayes.spawn.position;
    const learner={pose:{position:{x:sp.x,y:0,z:sp.z},heading:0},speed:0};
    const layout=layoutTownscape(goodmayes)!;
    const traffic=new Traffic(goodmayes,{count:16,parked:layout.cars.map(c=>({x:c.x,z:c.z})),learner:()=>learner,seed,signals:()=>signals.stops});
    let overRed=0,waitedAtRed=0;
    const front=new Map<string,number>();
    const travelled=traffic.cars.map(()=>0);
    for(let t=0;t<240;t+=1/30){
      signals.fixedUpdate(1/30);traffic.fixedUpdate(1/30);
      traffic.cars.forEach((c,i)=>{if(c.visible)travelled[i]!+=c.speed/30});
      for(const c of traffic.cars.filter(c=>c.visible))for(const st of signals.stops){
        if(Math.cos(st.heading-c.pose.heading)<.9)continue;
        const hx=Math.sin(st.heading),hz=-Math.cos(st.heading);
        const dx=c.pose.position.x-st.lane.x,dz=c.pose.position.z-st.lane.z;
        if(Math.abs(dx*hz-dz*hx)>1.8)continue;
        const f=dx*hx+dz*hz+c.halfLength,key=`${c.id}/${st.id}`,was=front.get(key);
        // Crossing the line while it shows red (the light changed to red from amber well before).
        // (Not a car reappearing elsewhere: a jump of metres in one step.)
        if(was!==undefined&&was<0&&f>=0&&f-was<1&&st.state==='red')overRed++;
        if(f<0&&f>-6&&c.speed<.2&&st.state!=='green')waitedAtRed++;
        front.set(key,f);
      }
    }
    expect(overRed).toBe(0);
    expect(waitedAtRed).toBeGreaterThan(0);
    // And it keeps moving: most cars covered good distances (no gridlock at the lights).
    expect(travelled.filter(d=>d>150).length).toBeGreaterThanOrEqual(10);
  },60_000);

  it('the mock test marks crossing the stop line at red as serious, and not at green',()=>{
    for(const light of ['red','green'] as const){
      let time=0;
      const events=new EventLog(()=>time);
      const signals=new TrafficSignals(goodmayes);
      const st=signals.stops.find(s=>s.line)!;
      st.state=light;
      const hx=Math.sin(st.heading),hz=-Math.cos(st.heading);
      const car={x:st.lane.x-hx*20,z:st.lane.z-hz*20};
      const assessor=new MockTestAssessor({location:goodmayes,events,now:()=>time,
        learner:()=>({pose:{position:{x:car.x,y:0,z:car.z},heading:st.heading},speed:6,indicator:'off',surface:'carriageway'}),
        traffic:()=>[],parked:[],signals:()=>[st]});
      for(let i=0;i<150;i++){time+=1/30;car.x+=hx*.2;car.z+=hz*.2;assessor.fixedUpdate(1/30)}
      const f=assessor.current.filter(x=>x.ruleId==='traffic-lights');
      expect(f.map(x=>x.severity),light).toEqual(light==='red'?['serious']:[]);
    }
  });
});
