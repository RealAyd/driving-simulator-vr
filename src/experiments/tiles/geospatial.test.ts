import {describe,it,expect} from 'vitest';
import {approximateLocalToGeo,ecefToLocal,geodeticToEcef,localToEcef,reference} from './geospatial';
describe('Brentwood tile coordinate scaffold',()=>{
  it('reproduces the existing OSM origin and XY mapping',()=>{
    const v=approximateLocalToGeo(0,0);
    expect(v.lat).toBe(51.6213112);expect(v.lon).toBe(0.3055506);
    expect(approximateLocalToGeo(100,-100).lat).toBeGreaterThan(v.lat);
  });
  it('round trips local metres without creating a guessed road elevation',()=>{
    const ref=reference(82.75);
    for(const v of [[0,0,0],[100,1.5,-180],[-250,4,60]] as const){
      const result=ecefToLocal(localToEcef(v,ref),ref);
      result.forEach((x,i)=>expect(x).toBeCloseTo(v[i],5));
    }
    expect(ecefToLocal(geodeticToEcef(ref.lat,ref.lon,ref.heightEllipsoid),ref)[1]).toBeCloseTo(0,7);
  });
});
