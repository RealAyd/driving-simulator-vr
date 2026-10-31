import {describe,expect,it} from 'vitest';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {pointAtAlong} from '../../src/world/roadGeometry';
import type {LiveStop} from '../../src/world/trafficSignals';
import {loadCentre} from './trafficDrive';

/**
 * The learner waiting at a red light (the owner's report, Brentwood, Middleton Hall Lane): traffic coming up behind
 * queues behind it; none goes round it on the wrong side of the road to wait at the line in the oncoming lane.
 */
describe('traffic behind the learner at a red light',()=>{
  it('queues behind, never round it in the oncoming lane',async()=>{
    for(const [id,seed] of [['brentwood-london',1],['goodmayes-london',2],['basildon',3]] as const){
      const loc=await loadCentre(id);
      // A long two-way road: the learner stopped in its left lane 8 m short of a stop line at red.
      const road=loc.roads.filter(r=>!r.oneway&&r.lanes.count===2).sort((a,b)=>b.centreline.length-a.centreline.length)[0]!;
      const len=road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0),at=len*.5;
      const p=pointAtAlong(road,at),h=Math.atan2(p.direction.x,-p.direction.z),left={x:p.direction.z,z:-p.direction.x},w=road.lanes.width/2;
      const learner={pose:{position:{x:p.x+left.x*w,y:0,z:p.z+left.z*w},heading:h},speed:0};
      const line=pointAtAlong(road,at+8);
      const stop:LiveStop={id:'test',group:'test',road,along:at+8,dir:1,line:true,x:line.x,z:line.z,heading:h,lane:{x:line.x+left.x*w,z:line.z+left.z*w},state:'red'};
      const traffic=new Traffic(loc,{count:16,parked:kerbFootprints(layoutTownscape(loc)!),learner:()=>learner,seed,signals:()=>[stop]});
      let round=0;
      for(let t=0;t<120;t+=1/30){
        traffic.fixedUpdate(1/30);
        for(const c of traffic.cars){
          if(!c.visible||Math.cos(c.pose.heading-h)<.8)continue;
          const dx=c.pose.position.x-learner.pose.position.x,dz=c.pose.position.z-learner.pose.position.z;
          const along=dx*Math.sin(h)-dz*Math.cos(h),toLeft=dx*left.x+dz*left.z;
          // Beside it or ahead of it to the line, on the far side of the road (going its way).
          if(along>-3&&along<12&&toLeft<-1.2)round+=1/30;
        }
      }
      expect(round,`${id}: seconds of traffic round the learner in the oncoming lane`).toBe(0);
    }
  },300_000);
});
