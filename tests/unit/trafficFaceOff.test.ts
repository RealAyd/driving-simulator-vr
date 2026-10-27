import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';

const node=(m:string)=>import(/* @vite-ignore */ m);

// The owner's report (Folkestone, 2026-10-26): a car out past a parked car met the learner nose to nose and stayed
// there; the learner backed away and it still did not move. Here: each time a car is out past a parked car, the
// learner is put nose to nose with it (in its own lane, half out, in the middle or over on the car's side), waits, backs away 12 m, then
// stops or edges to and fro. Within 30 s of the learner backing off, the car must get going, be gone, or be out of
// the learner's way (back in its own lane, with room to pass). (30 s: it may first reverse to a space at walking pace,
// the owner's ask, then give the learner 5 s to come through before it goes.)
describe('Traffic meeting the learner nose to nose on a narrow street (Folkestone, as served)',()=>{
  it('a car out past parked cars does not stay stuck in front of the learner once the learner backs away',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
    const pack=JSON.parse(gunzipSync(readFileSync('public/centres/folkestone.json.gz')).toString());
    const loc=parseLocation(pack.location);
    const parked=kerbFootprints(layoutTownscape(loc)!);
    const results:string[]=[];
    let meetings=0,stuck=0;
    for(const dither of [false,true])for(const share of [1,.5,0,-.6])for(const seed of [3,5,7,11,13,17,19,23]){
      const sp=loc.spawn.position,home=()=>({x:sp.x,y:0,z:sp.z});
      const learner={pose:{position:home(),heading:loc.spawn.headingDeg*Math.PI/180},speed:0};
      const traffic=new Traffic(loc,{count:14,buses:0,parked,learner:()=>learner,seed});
      const drivers=(traffic as unknown as {drivers:Array<{car:{id:string;visible:boolean;speed:number;halfLength:number;halfWidth:number;pose:{position:{x:number;z:number};heading:number}};leg:{road:unknown;lane:number;lengths:number[]};s:number;lat:number}>}).drivers;
      const at=(traffic as unknown as {at:(leg:unknown,s:number)=>{x:number;z:number;dir:{x:number;z:number}}}).at.bind(traffic);
      for(let t=0;t<240;t+=1/30){
        // The learner stopped at the start until a car is out past a parked car (on a road with room ahead of it), away from it.
        traffic.fixedUpdate(1/30);
        const d=drivers.find(d=>d.car.visible&&d.leg.road&&d.lat<d.leg.lane-.6&&d.car.speed>1&&d.s+20<d.leg.lengths.at(-1)!&&Math.hypot(d.car.pose.position.x-sp.x,d.car.pose.position.z-sp.z)>40);
        if(!d)continue;
        meetings++;
        // The learner 10 m ahead of it, facing it: in the learner's own lane (to the car's right), part way out, or
        // over on the car's side (out past something of its own).
        const p=at(d.leg,d.s+10),right=d.leg.lane*share;
        learner.pose.position={x:p.x-p.dir.z*right,y:0,z:p.z+p.dir.x*right};
        learner.pose.heading=d.car.pose.heading+Math.PI;
        // Stopped 4 s, then back 12 m at 2 m/s, then stopped.
        let tt=0;const back={x:-Math.sin(learner.pose.heading),z:Math.cos(learner.pose.heading)};
        for(;tt<4;tt+=1/30)traffic.fixedUpdate(1/30);
        for(;tt<10;tt+=1/30){learner.speed=-2;learner.pose.position.x+=back.x*2/30;learner.pose.position.z+=back.z*2/30;traffic.fixedUpdate(1/30)}
        learner.speed=0;
        let moved=false,driven=0;
        for(let k=0;k<30*30;k++){
          // Edging to and fro (2 s forward at 1 m/s, 2 s back), never still for long.
          if(dither){const v=Math.floor(k/60)%2?-1:1;learner.speed=v;learner.pose.position.x-=back.x*v/30;learner.pose.position.z-=back.z*v/30}
          traffic.fixedUpdate(1/30);driven+=d.car.speed/30;if(!d.car.visible||driven>6){moved=true;break}
          // Or out of the learner's way: pulled back into its own lane (behind the parked car), room to pass it.
          const f={x:Math.sin(learner.pose.heading),z:-Math.cos(learner.pose.heading)},dx=d.car.pose.position.x-learner.pose.position.x,dz=d.car.pose.position.z-learner.pose.position.z;
          if(k>5*30&&Math.abs(dx*f.z-dz*f.x)-d.car.halfWidth-.9>.3){moved=true;break}
        }
        if(!moved){stuck++;results.push(`${dither?'to and fro':'still'} share ${share} seed ${seed} ${d.car.id}: ${driven.toFixed(1)} m after backing off; why ${traffic.reasons().find(r=>r.id===d.car.id)?.why}`)}
        // The learner back at the start; on with the next meeting.
        learner.pose.position=home();learner.pose.heading=loc.spawn.headingDeg*Math.PI/180;
        t+=34;
      }
    }
    expect(meetings).toBeGreaterThan(5);
    expect(stuck,results.join('\n')).toBe(0);
  },300_000);
});
