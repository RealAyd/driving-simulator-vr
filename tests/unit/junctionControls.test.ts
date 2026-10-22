import {describe,expect,it} from 'vitest';
import {parseLocation,type Location} from '../../src/contracts';
import {junctionMouths,mouthPoint,schoolFrontages} from '../../src/world/junctionControls';
import {layoutSignage} from '../../src/world/signage';
import {layoutStreetscape} from '../../src/world/streetscape';
import {MockTestAssessor} from '../../src/assessment/mockTest';
import {EventLog} from '../../src/app/eventLog';
import {surfaceAt} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);
const mouths=junctionMouths(goodmayes);

/** Goodmayes with a STOP sign mapped at one side road's mouth (it has none of its own). */
function withStop():{location:Location;id:string}{
  const m=mouths.find(m=>!m.road.oneway&&m.road.name)!;
  const location=structuredClone(goodmayes);
  const road=location.roads.find(r=>r.id===m.road.id)!;
  road.ends={...road.ends,[m.atEnd?'end':'start']:'stop'};
  return {location,id:m.id};
}

describe('junction mouths',()=>{
  it('side roads meeting another road at its side get give way lines; not at mini-roundabouts or lights',()=>{
    expect(mouths.length).toBeGreaterThan(10);
    for(const m of mouths){
      expect(m.kind).toBe('give-way');
      // The line is on the road, near the end that meets the other road.
      const p=mouthPoint(m,0,0);
      expect(surfaceAt(goodmayes,p.x,p.z)?.kind).toBe('carriageway');
      for(const j of goodmayes.junctions)expect(Math.hypot(j.position.x-p.x,j.position.z-p.z)).toBeGreaterThan(j.radius);
    }
    expect(new Set(mouths.map(m=>m.id)).size).toBe(mouths.length);
  });
  it('a mapped STOP sign makes that mouth a STOP line with a sign facing the traffic coming out',()=>{
    const {location,id}=withStop();
    const m=junctionMouths(location).find(m=>m.id===id)!;
    expect(m.kind).toBe('stop');expect(m.signed).toBe(true);
    const sign=layoutSignage(location,layoutStreetscape(location)).panels.find(p=>p.id===`${id}-sign`);
    expect(sign?.shape).toBe('octagon');
    // It faces traffic going towards the junction.
    const dir=mouthPoint(m,0,0).dir;
    expect(sign!.normal.x*dir.x+sign!.normal.z*dir.z).toBeLessThan(-.9);
  });
  it('a school by a road gets its frontage (zig-zags) and warning signs on the approaches',()=>{
    const location=structuredClone(goodmayes);
    const road=location.roads.filter(r=>!r.oneway).sort((a,b)=>b.centreline.length-a.centreline.length)[0]!;
    const i=Math.floor(road.centreline.length/2),p=road.centreline[i]!,q=road.centreline[i+1]!;
    const d=Math.hypot(q.x-p.x,q.z-p.z),n={x:-(q.z-p.z)/d,z:(q.x-p.x)/d},o={x:p.x+n.x*14,z:p.z+n.z*14};
    location.buildings.push({...location.buildings[0]!,id:'test-school',use:'school',
      footprint:[{x:o.x-4,z:o.z-4},{x:o.x+4,z:o.z-4},{x:o.x+4,z:o.z+4},{x:o.x-4,z:o.z+4}]});
    const f=schoolFrontages(location).find(f=>f.id==='school-test-school');
    expect(f?.road.id).toBe(road.id);
  });
});

describe('STOP line marking',()=>{
  function drive(stopFirst:boolean){
    const {location,id}=withStop();
    const m=junctionMouths(location).find(m=>m.id===id)!;
    let time=0;
    const events=new EventLog(()=>time);
    const learner={x:0,z:0,heading:0,speed:0};
    const assessor=new MockTestAssessor({location,events,now:()=>time,
      learner:()=>({pose:{position:{x:learner.x,y:0,z:learner.z},heading:learner.heading},speed:learner.speed,indicator:'off',surface:'carriageway'}),
      traffic:()=>[],parked:[]});
    assessor.reset();
    // From 20 m back to just past the line, 0.2 m a step; the car's front is 2.1 m ahead of its centre.
    for(let back=22;back>-1.5;back-=.2){
      const p=mouthPoint(m,back,1.5);
      const stopping=stopFirst&&back<3.2&&back>2.3;
      Object.assign(learner,{x:p.x,z:p.z,heading:Math.atan2(p.dir.x,-p.dir.z),speed:stopping?0:4});
      const dt=stopping?.5:.05;time+=dt;assessor.fixedUpdate(dt);
    }
    return assessor.finish('mock','completed',time).findings.filter(f=>f.ruleId==='traffic-signs');
  }
  it('rolling over a STOP line is a serious fault; stopping first is not',()=>{
    const rolled=drive(false);
    expect(rolled.map(f=>f.severity)).toEqual(['serious']);
    expect(rolled[0]!.explanation).toMatch(/STOP line/);
    expect(drive(true)).toEqual([]);
  });
});
