import {describe,expect,it} from 'vitest';
import {parseLocation,type EventSink,type SimEventType} from '../../src/contracts';
import {RoadNetwork,type RouteLeg} from '../../src/test/route';
import {BRIEFING,END,Examiner,PULL_UP} from '../../src/test/examiner';
import {pointAtAlong,sampleRoad} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);
const sink=(log:Array<{type:SimEventType;payload:Record<string,unknown>}>):EventSink=>({emit:(type,payload={})=>{log.push({type,payload});return {id:`e${log.length}`,type,time:0,payload} as never}});

/** Points every metre along legs, with the heading of travel. */
function path(legs:RouteLeg[]){
  const out:Array<{x:number;z:number;heading:number}>=[];
  for(const l of legs){
    const n=Math.max(1,Math.ceil(Math.abs(l.to-l.from)));
    for(let k=0;k<=n;k++){const p=pointAtAlong(l.road,l.from+(l.to-l.from)*k/n);out.push({x:p.x,z:p.z,heading:Math.atan2(p.direction.x*l.dir,-p.direction.z*l.dir)})}
  }
  return out;
}

describe('Examiner',()=>{
  it('briefs, gives each direction before its junction, and ends after the pull-up when the route is followed',()=>{
    const net=new RoadNetwork(goodmayes);
    const sp=goodmayes.spawn;
    const learner={x:sp.position.x,z:sp.position.z,heading:sp.headingDeg*Math.PI/180,speed:0};
    const said:string[]=[],log:Array<{type:SimEventType;payload:Record<string,unknown>}>=[];
    let done=false;
    const ex=new Examiner(net,()=>learner,{target:1500,seed:3,say:t=>said.push(t),events:sink(log),onComplete:()=>{done=true}});
    ex.reset();
    const route=net.plan(net.locate(learner.x,learner.z,learner.heading)!,1500,3);
    expect(ex.steps.map(s=>s.say)).toEqual(route.steps.map(s=>s.say));
    // Drive the route at 8 m/s, then on along the last road and stop.
    // The route's legs, then on along the last road it turns into.
    const last=route.steps.at(-1)!,from=sampleRoad(last.to.road,last.at.x,last.at.z).along;
    const pts=path([...route.legs,{road:last.to.road,dir:last.to.dir,from,to:Math.max(0,Math.min(net.length(last.to.road),from+last.to.dir*120))}]);
    learner.speed=8;
    for(const p of pts){Object.assign(learner,p);for(let k=0;k<4;k++)ex.fixedUpdate(1/32)}
    expect(said[0]).toBe(BRIEFING);
    for(const s of route.steps)expect(said).toContain(s.say);
    expect(log.filter(e=>e.type==='examiner.redirected')).toEqual([]);
    // Each direction came before its junction (when the car was still at least 25 m away).
    expect(ex.phase).toBe('pull-up');
    expect(said).toContain(PULL_UP);
    learner.speed=0;
    for(let i=0;i<300&&!done;i++)ex.fixedUpdate(1/30);
    expect(said.at(-1)).toBe(END);
    expect(done).toBe(true);
  });

  it('gives new directions when the learner goes another way',()=>{
    const net=new RoadNetwork(goodmayes);
    const sp=goodmayes.spawn;
    const learner={x:sp.position.x,z:sp.position.z,heading:sp.headingDeg*Math.PI/180,speed:8};
    const said:string[]=[],log:Array<{type:SimEventType;payload:Record<string,unknown>}>=[];
    const ex=new Examiner(net,()=>learner,{target:1500,seed:3,say:t=>said.push(t),events:sink(log),onComplete:()=>{}});
    ex.reset();
    const first=ex.steps[0]!;
    // Drive straight on along the starting road past the first turn.
    const start=net.locate(learner.x,learner.z,learner.heading)!;
    const atTurn=net.locate(first.at.x,first.at.z,learner.heading)!;
    const legs:RouteLeg[]=[{road:start.road,dir:start.dir,from:start.along,to:Math.max(0,Math.min(net.length(start.road),atTurn.along+start.dir*60))}];
    for(const p of path(legs)){Object.assign(learner,p);for(let k=0;k<4;k++)ex.fixedUpdate(1/32)}
    expect(log.some(e=>e.type==='examiner.redirected')).toBe(true);
    expect(said.some(t=>t.startsWith('That\'s fine'))).toBe(true);
  });

  it('driving on away from the route: new directions at most every 20 s, and "That\'s fine" not every time',()=>{
    const net=new RoadNetwork(goodmayes);
    const sp=goodmayes.spawn;
    const learner={x:sp.position.x,z:sp.position.z,heading:sp.headingDeg*Math.PI/180,speed:8};
    const said:string[]=[],log:Array<{type:SimEventType;payload:Record<string,unknown>}>=[];
    const ex=new Examiner(net,()=>learner,{target:1500,seed:3,say:t=>said.push(t),events:sink(log),onComplete:()=>{}});
    ex.reset();
    // A minute on a road the route never uses (as if lost): moving, but nowhere near the directions.
    const off=goodmayes.roads.find(r=>r.name==='High Road')!;
    for(let t=0;t<60;t+=1/30){
      const p=pointAtAlong(off,10+t*2);
      Object.assign(learner,{x:p.x,z:p.z,heading:Math.atan2(p.direction.x,-p.direction.z)});
      ex.fixedUpdate(1/30);
    }
    expect(log.filter(e=>e.type==='examiner.redirected').length).toBeLessThanOrEqual(3);
    expect(said.filter(t=>t.startsWith('That\'s fine')).length).toBeLessThanOrEqual(1);
  });
});
