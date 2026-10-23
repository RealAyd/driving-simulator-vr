import {afterEach,describe,expect,it} from 'vitest';
import {CAR_MODELS,ROAD_USER_CAR_MODELS,activeVehicleSet,kerbCarModels,parkedModelIds,roadUserCarModels,useVehicleSet} from '../../src/assets/carSpecs';

const shipped=import.meta.glob('/public/assets/models/vehicles/v2/*.glb');
const isV2=(id:string)=>id.startsWith('v2-');

describe('vehicle sets',()=>{
  afterEach(()=>useVehicleSet('current'));

  it('uses the current cars unless the test set is asked for',()=>{
    expect(activeVehicleSet()).toBe('current');
    expect(roadUserCarModels()).toEqual([...ROAD_USER_CAR_MODELS]);
    expect(kerbCarModels().some(isV2)).toBe(false);
    expect(parkedModelIds().some(isV2)).toBe(false);
  });

  it('switches traffic and parked cars to the test set, with every model shipped',()=>{
    useVehicleSet('new');
    const road=roadUserCarModels();
    expect(road.length).toBeGreaterThan(5);
    for(const spec of road){
      expect(spec.url).toMatch(/vehicles\/v2\//);
      expect(spec.wheelLoopMetres??0).toBeGreaterThanOrEqual(0);
    }
    expect(kerbCarModels().every(isV2)).toBe(true);
    for(const id of kerbCarModels())expect(parkedModelIds()).toContain(id);
    for(const id of parkedModelIds().filter(isV2)){
      const spec:{url?:string;parkedUrl?:string}=CAR_MODELS[id];
      for(const url of [spec.url,spec.parkedUrl].filter(Boolean))expect(shipped[`/public/${url}`],url).toBeTruthy();
    }
  });
});
