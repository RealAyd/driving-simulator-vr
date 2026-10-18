import {describe,it,expect} from 'vitest';
import {approximateLocalToGeo,ecefToLocal,ecefToSceneMatrix,geodeticToEcef,localToEcef,reference,sceneScale} from '../../src/experiments/tiles/geospatial';
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
      result.forEach((x,i)=>expect(x).toBeCloseTo(v[i] as number,5));
    }
    expect(ecefToLocal(geodeticToEcef(ref.lat,ref.lon,ref.heightEllipsoid),ref)[1]).toBeCloseTo(0,7);
  });
});

describe('tiles frame matrix',()=>{
  const apply=(m:number[],v:readonly [number,number,number])=>[0,1,2].map(j=>v[0]*m[j]!+v[1]*m[4+j]!+v[2]*m[8+j]!+m[12+j]!);
  it('maps ECEF into the scene the same way as ecefToLocal',()=>{
    const ref=reference(140);
    const m=ecefToSceneMatrix(ref);
    for(const v of [[0,0,0],[120,3,-40],[-350,-2,150]] as const){
      const ecef=localToEcef(v,ref);
      apply(m,ecef).forEach((x,i)=>expect(x).toBeCloseTo(v[i] as number,4));
    }
  });
  it('converts tangent metres to the OSM extraction scale',()=>{
    const s=sceneScale();
    expect(s.x).toBeCloseTo(.998,3);
    expect(s.z).toBeCloseTo(1.0005,3);
    // A point 350 m west, placed by the extraction formula, lands where the scaled tangent frame puts it.
    const geo=approximateLocalToGeo(-350,0);
    const east=ecefToLocal(geodeticToEcef(geo.lat,geo.lon,0),reference(0))[0];
    expect(east*s.x).toBeCloseTo(-350,1);
  });
});
