import {afterAll,describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {RoadNetwork} from '../../src/test/route';
import {FreeDriveAssist} from '../../src/test/freeDriveAssist';
import {StaticObstacles} from '../../src/world/obstacles';
import {useVehicleSet} from '../../src/assets/carSpecs';
import {pointAtAlong} from '../../src/world/roadGeometry';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import goodmayes from '../../content/locations/goodmayes.json';

// Free driving at Goodmayes with assisted steering (no route, no signal): along every residential street both ways
// for 40 s at a learner's speeds (15 mph, 9 mph for turns), and moving off from behind a parked car. The assisted
// car never touches a parked car, with either set of car models (their sizes differ).
const location=parseLocation(goodmayes);
const net=new RoadNetwork(location);
const roadLength=(r:typeof location.roads[number])=>r.centreline.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0);

for(const set of ['current','new'] as const)describe(`assisted steering past parked cars (${set} cars)`,()=>{
  afterAll(()=>useVehicleSet('current'));
  const setUp=()=>{
    useVehicleSet(set);
    const layout=layoutTownscape(location)!;
    return {kerb:kerbFootprints(layout),obstacles:new StaticObstacles(layout.colliders.filter(c=>c.kind==='parked-vehicle'))};
  };
  const drive=(assist:FreeDriveAssist,car:VehicleState,obstacles:StaticObstacles,seconds:number)=>{
    for(let t=0;t<seconds;t+=1/30){
      assist.update(car,'off');
      const a=assist.assist,at=a.progress(car.position.x,car.position.z);
      // The edge of the area (the road ends: a hedge stops the car there).
      if(at>a.length-3&&a.length<20)return null;
      const top=Math.abs(a.turnBetween(at,at+25))>.5?4:6.5;
      const brake=Math.max(a.brakeFor(car,car.speed),car.speed>top+.5?.5:0);
      car=stepVehicle(car,{throttle:brake>0||car.speed>top?0:1,brake,steer:a.steer(car,car.speed)},LEARNER_CAR,1/30);
      const hit=obstacles.firstCollision(car,.9,2.15);
      if(hit)return `${hit} at ${car.position.x.toFixed(0)},${car.position.z.toFixed(0)}`;
    }
    return null;
  };

  it('drives along each street, out past the parked cars',{timeout:120_000},()=>{
    const {kerb,obstacles}=setUp();
    const hits:string[]=[];let runs=0;
    for(const road of location.roads){
      if(road.oneway||road.markings.centre!=='none'||roadLength(road)<80)continue;
      for(const dir of [1,-1] as const){
        const p=pointAtAlong(road,dir>0?10:roadLength(road)-10),dx=p.direction.x*dir,dz=p.direction.z*dir,lane=road.lanes.width/2;
        const start={x:p.x+dz*lane,z:p.z-dx*lane},heading=Math.atan2(dx,-dz);
        // (Not starting with a parked car just ahead.)
        if(kerb.some(c=>{const ox=c.x-start.x,oz=c.z-start.z,al=ox*dx+oz*dz;return al>-6&&al<16&&Math.abs(ox*dz-oz*dx)<3.5}))continue;
        runs++;
        const hit=drive(new FreeDriveAssist(net,kerb,LEARNER_CAR),{position:{x:start.x,y:0,z:start.z},heading,speed:0,steerAngle:0},obstacles,40);
        if(hit)hits.push(`${road.name} (${dir}): ${hit}`);
      }
    }
    expect(runs).toBeGreaterThan(25);
    expect(hits).toEqual([]);
  });

  it('moves off from a car length behind a parked car and out round it',{timeout:120_000},()=>{
    const {kerb,obstacles}=setUp();
    const hits:string[]=[];let runs=0;
    for(const c of kerb.slice(0,100)){
      const fx=Math.sin(c.heading),fz=-Math.cos(c.heading),back=c.halfLength+2.15+5;
      const start={x:c.x-fx*back,z:c.z-fz*back};
      // In a gap at least that long (clear where the car stands, with a little room behind it and up to 2 m short of
      // the parked car: no other parked car just in front).
      if(obstacles.firstCollision({position:{x:start.x+fx*.6,y:0,z:start.z+fz*.6},heading:c.heading},.95,2.15+2.1))continue;
      runs++;
      const hit=drive(new FreeDriveAssist(net,kerb,LEARNER_CAR),{position:{x:start.x,y:0,z:start.z},heading:c.heading,speed:0,steerAngle:0},obstacles,8);
      if(hit)hits.push(hit);
    }
    expect(runs).toBeGreaterThan(15);
    expect(hits).toEqual([]);
  });
});
