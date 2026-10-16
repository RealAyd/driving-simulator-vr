import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {StaticObstacles} from '../../src/world/obstacles';
import {sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import raw from '../../content/locations/representative-residential-straight.json';

const location=parseLocation(raw);
const road=location.roads[0]!;

describe('road geometry',()=>{
  it('reports positive lateral offset to the right of travel',()=>{
    // Centreline runs north (-Z) from z=40; east (+X) is to the right.
    expect(sampleRoad(road,2,-10).lateral).toBeCloseTo(2,9);
    expect(sampleRoad(road,-2,-10).lateral).toBeCloseTo(-2,9);
    expect(sampleRoad(road,0,-10).along).toBeCloseTo(50,9);
  });
  it('distinguishes carriageway, raised pavement and off-road ground',()=>{
    expect(surfaceAt(location,-1.6,0)).toMatchObject({kind:'carriageway',height:0});
    expect(surfaceAt(location,-4.5,0)).toMatchObject({kind:'pavement',height:.12});
    expect(surfaceAt(location,-12,-10)).toBeNull(); // inside a house footprint: no road
  });
});

describe('static obstacles',()=>{
  const obstacles=new StaticObstacles(location.blocks);
  it('detects the parked van ahead in the left lane',()=>{
    expect(obstacles.firstCollision({position:{x:-1.6,y:0,z:-92},heading:0},.9,2.15)).toBe('parked-van');
  });
  it('allows passing the van in the other lane',()=>{
    expect(obstacles.firstCollision({position:{x:1.4,y:0,z:-95},heading:0},.9,2.15)).toBeNull();
  });
});
