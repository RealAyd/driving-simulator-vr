import {describe,expect,it} from 'vitest';
import {degToRad,parseLocation,parseScenario} from '../../src/contracts';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import locationJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import guidedJson from '../../content/scenarios/brentwood-guided-traversal.json';

const DT=1/60;
const place=parseLocation(locationJson);
const guided=parseScenario(guidedJson);

describe('Brentwood paired mini-roundabouts (area-inspired)',()=>{
  it('is labelled as area-inspired, unreviewed and credits OpenStreetMap',()=>{
    expect(place.name).toContain('area-inspired');
    expect(place.description).toContain('Not an official test route');
    expect(place.reviewStatus).toBe('unreviewed');
    expect(place.sources.some(s=>s.licence.includes('ODbL'))).toBe(true);
    expect(guided.locationId).toBe(place.id);
  });

  it('has the two mini-roundabouts about 19 m apart, as in OpenStreetMap',()=>{
    const [a,b]=place.junctions;
    expect(place.junctions.map(j=>j.kind)).toEqual(['mini-roundabout','mini-roundabout']);
    expect(Math.hypot(a!.position.x-b!.position.x,a!.position.z-b!.position.z)).toBeCloseTo(19.1,0);
  });

  it('starts at the first Street View point on High Street, facing the roundabouts',()=>{
    expect(place.spawn.roadId).toBe('high-street');
    expect(Math.hypot(place.spawn.position.x+29.53,place.spawn.position.z-18.95)).toBeLessThan(2.5);
    expect(place.spawn.headingDeg).toBeGreaterThan(55);
    expect(place.spawn.headingDeg).toBeLessThan(80);
    expect(surfaceAt(place,place.spawn.position.x,place.spawn.position.z)?.kind).toBe('carriageway');
  });

  it('the guided route can be driven from the start to the finish on the carriageway, around both painted discs',()=>{
    const assist=new SteeringAssist(guided.assistPath!,LEARNER_CAR);
    let s:VehicleState={position:{x:place.spawn.position.x,y:0,z:place.spawn.position.z},heading:degToRad(place.spawn.headingDeg),speed:4,steerAngle:0};
    const finish=guided.zones.find(z=>z.id==='finish')!;
    const road=place.roads.find(r=>r.id===finish.roadId)!;
    let closestDisc=Infinity,reached=false,offCarriageway=0;
    for(let t=0;t<90&&!reached;t+=DT){
      // About 10 mph through the junctions, 20 mph elsewhere.
      const nearJunction=place.junctions.some(j=>Math.hypot(s.position.x-j.position.x,s.position.z-j.position.z)<14);
      const want=nearJunction?4.5:9;
      s=stepVehicle(s,{throttle:s.speed<want?.4:0,brake:s.speed>want+.5?.3:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
      if(surfaceAt(place,s.position.x,s.position.z)?.kind!=='carriageway')offCarriageway+=DT;
      for(const j of place.junctions)closestDisc=Math.min(closestDisc,Math.hypot(s.position.x-j.position.x,s.position.z-j.position.z)-j.discDiameter/2);
      const sample=sampleRoad(road,s.position.x,s.position.z);
      reached=sample.distance<3&&sample.along>=finish.from&&sample.along<=finish.to;
    }
    expect(reached).toBe(true);
    expect(offCarriageway).toBe(0);
    expect(closestDisc).toBeGreaterThan(.9); // car centre at least half a car width from the disc edge
  });

  it('places the hints before each roundabout and the finish after both',()=>{
    const ids=guided.zones.map(z=>z.id);
    expect(ids).toEqual(['rb1-approach','rb1-entry','rb2-approach','rb2-entry','finish']);
    expect(guided.triggers.map(t=>'zoneEntered' in t.when?t.when.zoneEntered:null)).toEqual(['rb1-approach','rb2-approach']);
  });
});
