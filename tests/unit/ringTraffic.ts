import type {Location,Vec2} from '../../src/contracts';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {roundaboutRings} from '../../src/world/roundabouts';
import {surfaceAt} from '../../src/world/roadGeometry';
import {boxesOverlap} from '../../src/world/obstacles';

/**
 * Traffic at a roundabout bigger than a mini (the harness for roundaboutTraffic.test.ts): the learner parked off the
 * road nearby (so the traffic gathers there and stays in sight), cars driven for a while, and measured: entering the
 * ring in front of a car going round (under 2 s away from the right), waiting at the edge with nothing coming,
 * standing about, and cars touching. `debug` prints each long stand and each touch (who, why, where) to see why.
 */
export interface RingReport{entries:number;cutIn:number;needlessWait:number;longestStand:number;overlaps:number;circulating:number}

export function driveRing(loc:Location,ringIndex:number,seed:number,seconds=240,count=16,debug=false):RingReport{
  const ring=roundaboutRings(loc).filter(g=>g.radius>=12)[ringIndex]!,c=ring.position;
  // Off the road, a little way out from the ring.
  let spot:Vec2={x:c.x,z:c.z};
  for(let k=0;k<72;k++){const a=k*Math.PI/36,p={x:c.x+Math.cos(a)*(ring.reach+18),z:c.z+Math.sin(a)*(ring.reach+18)};if(!surfaceAt(loc,p.x,p.z)){spot=p;break}}
  const learner={pose:{position:{x:spot.x,y:0,z:spot.z},heading:0},speed:0};
  const traffic=new Traffic(loc,{count,parked:kerbFootprints(layoutTownscape(loc)!),learner:()=>learner,seed});
  const ds=(traffic as unknown as {drivers:Array<{car:{id:string;speed:number;visible:boolean;parked?:boolean;halfLength:number;halfWidth:number;pose:{position:{x:number;z:number};heading:number}};leg:{road:unknown};why?:string}>}).drivers;
  const R=ring.radius,onRing=(p:Vec2)=>Math.abs(Math.hypot(p.x-c.x,p.z-c.z)-R)<4;
  const ang=(p:Vec2)=>Math.atan2(p.z-c.z,p.x-c.x);
  const wasOn=new Map<string,boolean>(),still=new Map<string,number>();
  const r:RingReport={entries:0,cutIn:0,needlessWait:0,longestStand:0,overlaps:0,circulating:0};
  const dt=1/30;
  for(let t=0;t<seconds;t+=dt){
    traffic.fixedUpdate(dt);
    const vis=ds.filter(d=>d.car.visible);
    for(const d of vis){
      const p=d.car.pose.position,on=onRing(p)&&d.leg.road===null,was=wasOn.get(d.car.id)??false;
      if(on)r.circulating+=dt;
      // Onto the ring this step: anyone going round within 2 s (from the right: clockwise behind it) is cut in on.
      if(on&&!was&&wasOn.has(d.car.id)){
        r.entries++;
        const a=ang(p);
        if(vis.some(o=>o!==d&&onRing(o.car.pose.position)&&o.leg.road===null&&o.car.speed>1&&(()=>{
          const arc=(((a-ang(o.car.pose.position))%(2*Math.PI))+2*Math.PI)%(2*Math.PI)*R;
          return arc>o.car.halfLength+d.car.halfLength&&(arc-o.car.halfLength-d.car.halfLength)/o.car.speed<2;
        })()))r.cutIn++;
      }
      wasOn.set(d.car.id,on);
      // Waiting at the ring's edge with nobody going round within 40 m to its right.
      if(d.why==='junction busy'&&d.car.speed<.2&&Math.hypot(p.x-c.x,p.z-c.z)<ring.reach+12){
        const a=ang(p);
        if(!vis.some(o=>o!==d&&onRing(o.car.pose.position)&&o.leg.road===null&&(((a-ang(o.car.pose.position))%(2*Math.PI))+2*Math.PI)%(2*Math.PI)*R<40))r.needlessWait+=dt;
      }
      const v=d.car.speed<.2&&!d.car.parked?(still.get(d.car.id)??0)+dt:0;still.set(d.car.id,v);r.longestStand=Math.max(r.longestStand,v);
      if(debug&&v>45&&v<45+dt*1.5)console.log(`LONG t=${t.toFixed(0)} ${d.car.id} why '${d.why}' at ${Math.hypot(p.x-c.x,p.z-c.z).toFixed(0)} m from the middle, road ${(d.leg.road as {id?:string}|null)?.id??'ring'}`);
    }
    const box=(o:typeof ds[number])=>({id:o.car.id,cx:o.car.pose.position.x,cz:o.car.pose.position.z,heading:o.car.pose.heading,halfW:o.car.halfWidth,halfD:o.car.halfLength});
    for(const a of vis)for(const b of vis)if(a.car.id<b.car.id&&Math.hypot(a.car.pose.position.x-c.x,a.car.pose.position.z-c.z)<ring.reach+15&&boxesOverlap(box(a),box(b))){
      if(debug&&r.overlaps<dt)console.log(`OVERLAP t=${t.toFixed(0)} ${a.car.id} '${a.why}' ${(a.leg.road as {id?:string}|null)?.id??'ring'} / ${b.car.id} '${b.why}' ${(b.leg.road as {id?:string}|null)?.id??'ring'} at ${Math.hypot(a.car.pose.position.x-c.x,a.car.pose.position.z-c.z).toFixed(0)} m`);
      r.overlaps+=dt;
    }
  }
  return r;
}
