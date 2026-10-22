import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {layoutTownscape} from '../../src/world/townscape';
import {RoadNetwork} from '../../src/test/route';
import {routeLanePath} from '../../src/test/routePath';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import goodmayes from '../../content/locations/goodmayes.json';

// Mock test routes at Goodmayes driven with assisted steering (the car's own model, a learner's speeds: 15 mph,
// 8 mph through each junction): the car reaches every manoeuvre on the route and keeps close to the lane path,
// past the parked cars, round each corner and along roads the route uses twice.
describe('mock test routes with assisted steering',()=>{
  const location=parseLocation(goodmayes);
  const net=new RoadNetwork(location);
  const parked=layoutTownscape(location)!.cars.filter(c=>c.id.startsWith('kerb-car'));
  const heading=location.spawn.headingDeg*Math.PI/180;
  for(const seed of [1,3,6,7,8,10]){
    it(`seed ${seed}`,{timeout:60_000},()=>{
      const route=net.plan(net.locate(location.spawn.position.x,location.spawn.position.z,heading)!,2800,seed);
      expect(route.steps.length).toBeGreaterThan(5);
      const assist=new SteeringAssist(routeLanePath(route.legs,parked),LEARNER_CAR);
      let car:VehicleState={position:{x:location.spawn.position.x,y:0,z:location.spawn.position.z},heading,speed:0,steerAngle:0};
      let reached=0,worst=0;
      for(let t=0;t<900&&reached<route.steps.length;t+=1/60){
        const step=route.steps[reached]!,d=Math.hypot(step.at.x-car.position.x,step.at.z-car.position.z);
        if(d<6)reached++;
        const top=d<28?3.5:6.5;
        car=stepVehicle(car,{throttle:car.speed<top?1:0,brake:car.speed>top+1?1:0,steer:assist.steer(car,car.speed)},LEARNER_CAR,1/60);
        const p=assist.pointAt(assist.progress(car.position.x,car.position.z));
        worst=Math.max(worst,Math.hypot(p.x-car.position.x,p.z-car.position.z));
      }
      expect(reached).toBe(route.steps.length);
      expect(worst).toBeLessThan(3);
    });
  }
  // A learner who comes too fast (20 mph, never slowing for junctions): the assistance slows for each bend, so the
  // car still follows the lane round the corners instead of running wide over the kerb.
  it('too fast for the corners: the assistance slows for them and stays on the lane',{timeout:60_000},()=>{
    const route=net.plan(net.locate(location.spawn.position.x,location.spawn.position.z,heading)!,2000,3);
    const assist=new SteeringAssist(routeLanePath(route.legs,parked),LEARNER_CAR);
    let car:VehicleState={position:{x:location.spawn.position.x,y:0,z:location.spawn.position.z},heading,speed:0,steerAngle:0};
    let worst=0;
    for(let t=0;t<400&&assist.progress(car.position.x,car.position.z)<assist.length-5;t+=1/60){
      const brake=assist.brakeFor(car,car.speed);
      car=stepVehicle(car,{throttle:brake>0||car.speed>9?0:1,brake,steer:assist.steer(car,car.speed)},LEARNER_CAR,1/60);
      const p=assist.pointAt(assist.progress(car.position.x,car.position.z));
      worst=Math.max(worst,Math.hypot(p.x-car.position.x,p.z-car.position.z));
    }
    expect(worst).toBeLessThan(3);
  });
});
