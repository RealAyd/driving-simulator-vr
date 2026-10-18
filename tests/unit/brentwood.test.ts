import {describe,expect,it} from 'vitest';
import {degToRad,parseLocation,parseScenario,type Block} from '../../src/contracts';
import {layoutTownscape} from '../../src/world/townscape';
import {StaticObstacles} from '../../src/world/obstacles';
import {pointToBox} from '../../src/world/collisions';
import {LEARNER_CAR,stepVehicle,type VehicleState} from '../../src/vehicle/kinematics';
import {SteeringAssist} from '../../src/vehicle/steeringAssist';
import {pavementWidthAt,roadHalfWidth,sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import locationJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import guidedJson from '../../content/scenarios/brentwood-guided-traversal.json';
import crossingJson from '../../content/scenarios/crossing-restricted-view.json';
import movingOffJson from '../../content/scenarios/moving-off-safely.json';

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

describe('Brentwood scenery (map buildings, trees, lights): matches the road layout and keeps the route clear',()=>{
  const layout=layoutTownscape(place)!;
  const town=layout.town!;
  const wallPoints=(c:Block)=>{
    const h=degToRad(c.headingDeg),f={x:Math.sin(h),z:-Math.cos(h)};
    const out:Array<{x:number;z:number}>=[];
    for(let s=-c.size.depth/2;s<=c.size.depth/2;s+=.25)out.push({x:c.position.x+f.x*s,z:c.position.z+f.z*s});
    return out;
  };

  it('draws every map building, with its use, storeys and whether its height is mapped or estimated',()=>{
    expect(town.buildings.length).toBe(place.buildings.length);
    expect(place.buildings.every(b=>b.levels!==undefined)).toBe(true);
    expect(place.buildings.filter(b=>b.heightSource==='map-levels').length).toBeGreaterThan(0);
    expect(place.ground).toBe('paved');
  });

  it('puts shopfronts only on buildings with a mapped business, and only on walls facing a road',()=>{
    for(const b of town.buildings)for(const w of b.walls)if(w.shopfront){
      expect(b.use,b.id).toBe('shop');
      expect(w.facesRoad,b.id).toBe(true);
    }
    expect(town.buildings.filter(b=>b.walls.some(w=>w.shopfront)).length).toBeGreaterThan(5);
  });

  it('has no building wall, tree, street light or bus stop on a carriageway or a mini-roundabout',()=>{
    const bad:string[]=[];
    for(const c of layout.colliders){
      const points=c.id.includes('-wall-')?wallPoints(c):[c.position];
      if(points.some(p=>surfaceAt(place,p.x,p.z)?.kind==='carriageway'))bad.push(c.id);
    }
    expect(bad).toEqual([]);
  });

  it('the guided route and the lead car\'s path touch no scenery collider',()=>{
    const obstacles=new StaticObstacles([...place.blocks,...layout.colliders]);
    const assist=new SteeringAssist(guided.assistPath!,LEARNER_CAR);
    let s:VehicleState={position:{x:place.spawn.position.x,y:0,z:place.spawn.position.z},heading:degToRad(place.spawn.headingDeg),speed:4,steerAngle:0};
    for(let t=0;t<40;t+=DT){
      const nearJunction=place.junctions.some(j=>Math.hypot(s.position.x-j.position.x,s.position.z-j.position.z)<14);
      const want=nearJunction?4.5:9;
      s=stepVehicle(s,{throttle:s.speed<want?.4:0,brake:s.speed>want+.5?.3:0,steer:assist.steer({position:s.position,heading:s.heading},s.speed)},LEARNER_CAR,DT);
      expect(obstacles.firstCollision({position:s.position,heading:s.heading},.9,2.2),`at ${s.position.x.toFixed(1)}, ${s.position.z.toFixed(1)}`).toBeNull();
    }
    const lead=guided.actors.find(a=>a.kind==='passing-vehicle')!;
    if(lead.kind!=='passing-vehicle')return;
    for(const p of lead.path)for(const c of layout.colliders){
      const g=pointToBox(p.x,p.z,{position:{x:c.position.x,y:0,z:c.position.z},heading:degToRad(c.headingDeg)},c.size.width/2,c.size.depth/2);
      expect(g-.9,`${c.id}`).toBeGreaterThan(.2);
    }
  });

  it('street lights stand on a pavement, clear of junctions and the signal crossing',()=>{
    expect(layout.lamps.length).toBeGreaterThan(4);
    for(const l of layout.lamps){
      expect(surfaceAt(place,l.x,l.z)?.kind,`${l.x.toFixed(1)}, ${l.z.toFixed(1)}`).toBe('pavement');
      for(const j of place.junctions)expect(Math.hypot(l.x-j.position.x,l.z-j.position.z)).toBeGreaterThan(j.radius+3.9);
    }
  });
});

describe('Brentwood scene completeness: street behind the start, pavements to the shop fronts, approximate buildings',()=>{
  const high=place.roads.find(r=>r.id==='high-street')!;
  const town=layoutTownscape(place)!.town!;

  it('the High Street runs on about 200 m behind the start (so the mirrors show the street, not its end)',()=>{
    expect(sampleRoad(high,place.spawn.position.x,place.spawn.position.z).along).toBeGreaterThan(190);
    // OSM: no lane markings west of the second signal crossing; the centre line starts there.
    const west=place.crossings.find(c=>c.id==='high-street-signals-west')!;
    expect(high.markings.centreFrom).toBeCloseTo(west.along,1);
  });

  it('pavements reach the shop fronts: every shopfront wall meets the back of the pavement somewhere along it (within 1 m)',()=>{
    for(const b of town.buildings)for(const w of b.walls)if(w.shopfront){
      let best=Infinity;
      for(let t=0;t<=1;t+=.05){
        const p={x:w.a.x+(w.b.x-w.a.x)*t,z:w.a.z+(w.b.z-w.a.z)*t};
        for(const r of place.roads){const s=sampleRoad(r,p.x,p.z);best=Math.min(best,s.distance-roadHalfWidth(r)-pavementWidthAt(r,s.along,Math.sign(s.lateral)||1))}
      }
      expect(best,`${b.id}`).toBeLessThan(1);
    }
  });

  it('approximate buildings are labelled as such, have estimated heights and no shopfronts, and stand off every road and pavement',()=>{
    const approx=place.buildings.filter(b=>b.source==='approximate');
    expect(approx.length).toBeGreaterThan(0);
    for(const b of approx){
      expect(b.heightSource,b.id).toBe('estimated');
      expect(b.use,b.id).toBe('other');
      for(const p of b.footprint)expect(surfaceAt(place,p.x,p.z),`${b.id}`).toBeNull();
      expect(town.buildings.find(t=>t.id===b.id)!.walls.some(w=>w.shopfront)).toBe(false);
    }
    // OSM outlines keep source 'map'.
    expect(place.buildings.filter(b=>b.id.startsWith('osm-')).every(b=>b.source==='map')).toBe(true);
  });

  it('signal heads are held green only by this exercise; the zebra and Moving off exercises set no signals',()=>{
    expect(guided.signals).toEqual({'high-street-signals':'green','high-street-signals-west':'green'});
    expect(guided.briefing).toContain('pedestrian crossing phases are not simulated');
    expect(parseScenario(crossingJson).signals).toEqual({});
    expect(parseScenario(movingOffJson).signals).toEqual({});
  });
});
