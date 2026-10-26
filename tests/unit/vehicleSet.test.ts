import {afterEach,describe,expect,it} from 'vitest';
import {CAR_MODELS,ROAD_USER_CAR_MODELS,activeVehicleSet,kerbCarModels,learnerCarModel,parkedModelIds,roadUserCarModels,useVehicleSet,vehicleCredit} from '../../src/assets/carSpecs';

const shipped=import.meta.glob('/public/assets/models/vehicles/v2/*.glb');
const isV2=(id:string)=>id.startsWith('v2-');

describe('vehicle sets',()=>{
  afterEach(()=>useVehicleSet('current'));

  it('by default: traffic and parked cars from the earlier set (the good-looking ones); the learner drives the Peugeot 208, credited',()=>{
    expect(activeVehicleSet()).toBe('current');
    expect(roadUserCarModels()[0]!.id).toBe('batch-b-compact-hatchback');
    expect([...roadUserCarModels().map(m=>m.id),...kerbCarModels(),...parkedModelIds()].some(isV2)).toBe(false);
    expect(learnerCarModel().id).toBe('v2-peugeot-208');
    expect(vehicleCredit()).toBe('cars: muha692 (Sketchfab, CC BY 4.0)');
  });

  it('?cars=mixed: with the new Peugeot 208 and pickup (credited)',()=>{
    useVehicleSet('mixed');
    const v2=new Set([...roadUserCarModels().map(m=>m.id),...kerbCarModels(),...parkedModelIds()].filter(isV2));
    expect([...v2].sort()).toEqual(['v2-peugeot-208','v2-pickup']);
    expect(vehicleCredit()).toBe('cars: muha692, Comrade1280 (Sketchfab, CC BY 4.0)');
  });

  it('the earlier set is the same as before',()=>{
    useVehicleSet('current');
    expect(roadUserCarModels()).toEqual([...ROAD_USER_CAR_MODELS]);
    expect(vehicleCredit()).toBe('cars: muha692 (Sketchfab, CC BY 4.0)');
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
    expect(vehicleCredit()).toBe('cars: muha692, Comrade1280, Max (Sketchfab, CC BY 4.0)');
    for(const id of parkedModelIds().filter(isV2)){
      const spec:{url?:string;parkedUrl?:string}=CAR_MODELS[id];
      for(const url of [spec.url,spec.parkedUrl].filter(Boolean))expect(shipped[`/public/${url}`],url).toBeTruthy();
    }
  });

  it('?cars=pack20: the 20-vehicle pack (royalty free, no credit; licensed files, never in the repository), painted by the app',()=>{
    useVehicleSet('pack20');
    const ids=[...roadUserCarModels().map(m=>m.id),...kerbCarModels()];
    expect(ids.every(id=>id.startsWith('aq-'))).toBe(true);
    for(const id of kerbCarModels())expect(parkedModelIds()).toContain(id);
    expect(parkedModelIds().some(isV2)).toBe(false);
    expect(vehicleCredit()).toBe('cars: muha692 (Sketchfab, CC BY 4.0)');
    for(const id of new Set(ids)){
      const spec:{url?:string;parkedUrl:string;paintMaterial:string}=CAR_MODELS[id as keyof typeof CAR_MODELS];
      expect(spec.paintMaterial).toBe('Body');
      for(const url of [spec.url,spec.parkedUrl].filter(Boolean))expect(url).toMatch(/^assets\/licensed\/aq3d\//);
    }
  });
});
