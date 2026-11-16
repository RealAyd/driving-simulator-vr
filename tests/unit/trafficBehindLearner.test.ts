import {describe,expect,it} from 'vitest';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {pointAtAlong} from '../../src/world/roadGeometry';
import {loadCentre} from './trafficDrive';

/** Whether two cars' outlines (rectangles: centre, heading, half sizes) overlap, by separating axes. */
function overlap(a:{x:number;z:number;h:number;hw:number;hl:number},b:{x:number;z:number;h:number;hw:number;hl:number}):boolean{
  const axes=[a.h,a.h+Math.PI/2,b.h,b.h+Math.PI/2].map(h=>({x:Math.sin(h),z:-Math.cos(h)}));
  const corners=(r:typeof a)=>{const f={x:Math.sin(r.h),z:-Math.cos(r.h)},s={x:-f.z,z:f.x};
    return [[1,1],[1,-1],[-1,1],[-1,-1]].map(([i,j])=>({x:r.x+f.x*r.hl*i!+s.x*r.hw*j!,z:r.z+f.z*r.hl*i!+s.z*r.hw*j!}))};
  const ca=corners(a),cb=corners(b);
  return axes.every(ax=>{const pa=ca.map(p=>p.x*ax.x+p.z*ax.z),pb=cb.map(p=>p.x*ax.x+p.z*ax.z);
    return Math.max(...pa)>Math.min(...pb)&&Math.max(...pb)>Math.min(...pa)});
}

/**
 * The owner's reports (Pembroke Dock, Loughborough, Sheffield): background traffic ran into the back of the learner's
 * car standing in its lane. A car coming up behind went out to pass with too little room to clear it, was stopped
 * beside it with its nose at the learner's back, then backed up tucking in to the kerb (or pulled back in behind it),
 * across the learner's back corner. Here the learner stands 80 s in its lane (at the kerb or a little out, a little
 * askew) on roads where that happened, with careful traffic as the decision routes have it: no car going its way
 * ever touches it, and one behind it in line keeps a standing gap.
 */
describe('traffic coming up behind the learner standing in its lane',()=>{
  it('never touches it, and waits behind it with a gap unless there is room to go round',async()=>{
    // (Centre, road, how far along it, off the lane's middle towards the kerb (m; -: towards the road's middle), turned
    // (radians), seed.)
    const cases:Array<[string,string,number,number,number,number]>=[
      ['brentwood-london','crescent-road-147241450',.6992,0,0,24],
      ['basildon','gardiners-lane-south-4325467',.2,0,0,0],
      ['basildon','braeburn-way-697909611',.3416,-.4,-.05,2],
      ['folkestone','shorncliffe-road-42871081',.7328,0,.05,16],
      ['folkestone','ingles-road-5042928',.6992,0,0,24],
      ['goodmayes-london','airthrie-road-17271383',.578,.8,-.05,35]
    ];
    const found:string[]=[];
    for(const [id,roadId,frac,off,turn,seed] of cases){
      const loc=await loadCentre(id);
      const road=loc.roads.find(r=>r.id===roadId)!;
      expect(road,`${id} ${roadId}`).toBeTruthy();
      const len=road.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-road.centreline[i]!.x,p.z-road.centreline[i]!.z),0);
      const p=pointAtAlong(road,len*frac),h=Math.atan2(p.direction.x,-p.direction.z),left={x:p.direction.z,z:-p.direction.x},w=road.lanes.width/2+off;
      const learner={pose:{position:{x:p.x+left.x*w,y:0,z:p.z+left.z*w},heading:h+turn},speed:0};
      const me={x:learner.pose.position.x,z:learner.pose.position.z,h:learner.pose.heading,hw:.9,hl:2.15};
      const traffic=new Traffic(loc,{count:30,parked:kerbFootprints(layoutTownscape(loc)!),learner:()=>learner,seed,careful:true,range:180});
      let closest=Infinity,touched=0,who='';
      for(let t=0;t<80;t+=1/60){
        traffic.fixedUpdate(1/60);
        for(const c of traffic.cars){
          if(!c.visible||Math.cos(c.pose.heading-learner.pose.heading)<.8)continue;
          if(overlap({x:c.pose.position.x,z:c.pose.position.z,h:c.pose.heading,hw:c.halfWidth,hl:c.halfLength},me)){touched++;if(!who)who=`${c.id} touched at ${t.toFixed(1)} s`}
          const dx=c.pose.position.x-me.x,dz=c.pose.position.z-me.z;
          const along=dx*Math.sin(h)-dz*Math.cos(h),side=Math.abs(dx*left.x+dz*left.z);
          // Behind it and in line with it (their sides overlapping across the road).
          if(along<0&&side<c.halfWidth+.9)closest=Math.min(closest,-along-c.halfLength-2.15);
        }
      }
      if(touched||closest<1.5)found.push(`${id} ${roadId}: ${touched?who:''} closest behind ${closest.toFixed(2)} m`);
    }
    // Before: half of these touched it (backing across its back corner), the rest stood under a metre behind it.
    expect(found).toEqual([]);
  },600_000);
});
