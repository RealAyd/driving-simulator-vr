import {parseLocation,type Location,type Road} from '../../src/contracts';
import {Examiner} from '../../src/test/examiner';
import {MockTestAssessor} from '../../src/assessment/mockTest';
import {judgePullUp,junctionPoints,stopPlace} from '../../src/test/pullUp';
import {EventLog} from '../../src/app/eventLog';
import {pointAtAlong,roadHalfWidth,sampleRoad} from '../../src/world/roadGeometry';
import {layoutStreetscape} from '../../src/world/streetscape';
import {layoutTownscape} from '../../src/world/townscape';
import {junctionMouths} from '../../src/world/junctionControls';
import type {RoadNetwork,RouteLeg} from '../../src/test/route';

/**
 * A careful learner driving a mock test as the examiner directs: looks all round before moving off; on each
 * direction (once given) the interior mirror, the mirror on the turn's side, then the signal; in the lane, under the
 * limit, slow for the turn; stops at STOP lines; pulls up at a legal place. Anything marked is the marking's fault
 * (or the route's), not the driving.
 */
const len=(r:Road)=>r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);
void parseLocation;
export function careful(location:Location,net:RoadNetwork,seed:number,target:number){
  let time=0;
  const events=new EventLog(()=>time);
  const sp=location.spawn;
  const st=net.startNear(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180);
  const learner={x:st.x,z:st.z,heading:st.heading,speed:0,indicator:'off' as 'off'|'left'|'right'};
  const layout=layoutStreetscape(location)??layoutTownscape(location);
  const parked=(layout?.cars??[]).map(c=>({x:c.x,z:c.z}));
  const assessor=new MockTestAssessor({location,events,now:()=>time,
    learner:()=>({pose:{position:{x:learner.x,y:0,z:learner.z},heading:learner.heading},speed:learner.speed,indicator:learner.indicator,surface:'carriageway'}),
    traffic:()=>[],parked});
  let finished=false;
  const examiner=new Examiner(net,()=>learner,{target,seed,say:()=>{},events,onComplete:()=>{finished=true},listener:assessor});
  examiner.reset();
  const legs0=examiner.legs,steps=examiner.steps;
  const last=steps.at(-1);
  const legs:RouteLeg[]=[...legs0];
  if(last){const from=sampleRoad(last.to.road,last.at.x,last.at.z).along;legs.push({road:last.to.road,dir:last.to.dir,from,to:Math.max(0,Math.min(len(last.to.road),from+last.to.dir*80))})}
  for(const target of ['left-shoulder','left-door','interior','right-door','right-shoulder']){time+=.5;events.emit('observation.dwell',{target})}
  time+=1;
  const stops=junctionMouths(location).filter(m=>m.kind==='stop');
  const junctions=junctionPoints(location);
  const late:string[]=[];
  let seen=-1,mirrorsDone=false;
  const tick=(dt:number)=>{time+=dt;examiner.fixedUpdate(dt);assessor.fixedUpdate(dt)};
  for(const l of legs){
    const n=Math.max(1,Math.ceil(Math.abs(l.to-l.from)));
    const limit=(l.road.speedLimitMph??30)/2.237;
    for(let k=0;k<=n;k++){
      const along=l.from+(l.to-l.from)*k/n,p=pointAtAlong(l.road,along);
      const step=examiner.steps[examiner.index];
      const d=step?Math.hypot(p.x-step.at.x,p.z-step.at.z):Infinity;
      const turning=!!step&&step.turn!=='ahead';
      // A careful learner: in the lane, under the limit (25 mph at most), 12 mph turning.
      const lane=l.road.oneway?0:Math.min(1.6,roadHalfWidth(l.road)/2);
      const h=Math.atan2(p.direction.x*l.dir,-p.direction.z*l.dir),fx=Math.sin(h),fz=-Math.cos(h);
      Object.assign(learner,{x:p.x+fz*lane,z:p.z-fx*lane,heading:h,speed:turning&&d<25?5.4:Math.min(11,limit-1.5)});
      // As soon as a direction to turn is given: mirrors (interior, then the turn's side), then the signal.
      // (Only once the direction has been given: the examiner's words, an event.)
      const last=(()=>{for(let i=events.events.length-1;i>=0;i--){const e=events.events[i]!;if(e.type==='examiner.direction')return e}return null})();
      const told=last?Number(last.payload['step']??-1):-1;
      if(step&&told===examiner.index&&examiner.index!==seen){
        seen=examiner.index;mirrorsDone=false;
        // (Told with the one before, earlier, is in good time.)
        if(turning&&d<30&&!last!.payload['told'])late.push(`"${step.say}" given ${d.toFixed(0)} m before the turn`);
      }
      if(turning&&seen===examiner.index&&!mirrorsDone){
        events.emit('observation.dwell',{target:'interior'});tick(.5);
        events.emit('observation.dwell',{target:`${step!.turn}-door`});tick(.5);
        mirrorsDone=true;
      }
      learner.indicator=turning&&mirrorsDone&&seen===examiner.index&&d<50?step!.turn as 'left'|'right':'off';
      // At a STOP line: stop.
      for(const m of stops){
        if(m.road!==l.road||m.dir!==l.dir)continue;
        const past=(along-m.lineAlong)*m.dir;
        if(past>-3.2&&past<=-2.2){const v=learner.speed;learner.speed=0;tick(1.2);learner.speed=v}
      }
      tick(1/Math.max(1,learner.speed));
    }
  }
  // Pulling up: the first legal place ahead on the last stretch (clear of junctions and parked cars).
  events.emit('observation.dwell',{target:'interior'});
  const lastLeg=legs.at(-1);
  let parkedOk=false;
  if(lastLeg){
    for(let back=0;back<60&&!parkedOk;back+=2){
      const along=lastLeg.to-lastLeg.dir*back;
      const p=pointAtAlong(lastLeg.road,along),h=Math.atan2(p.direction.x*lastLeg.dir,-p.direction.z*lastLeg.dir);
      const stop=stopPlace(location,p.x,p.z,h);
      if(!stop)continue;
      const gap=stop.kerbGap-.3,x=p.x-Math.cos(h)*gap,z=p.z-Math.sin(h)*gap;
      if(judgePullUp(location,junctions,parked,x,z,h).length===0){Object.assign(learner,{x,z,heading:h});parkedOk=true}
    }
  }
  learner.speed=0;learner.indicator='off';
  for(let k=0;k<400&&!finished;k++)tick(1/30);
  return {result:assessor.finish('mock',finished?'completed':'time-limit',time),steps,legs,late,parkedOk,events:events.events};
}

