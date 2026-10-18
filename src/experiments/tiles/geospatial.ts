/**
 * Experiment only: independent, deterministic Brentwood local/ECEF conversion.
 * Position convention matches src/engine/babylonAdapter.ts: X east, Y up, Z south.
 * WGS84 ellipsoid elevations, NOT UK Ordnance Datum heights.
 * Reference lat/lon comes from docs/brentwood/layout-osm.json.
 * Never infer terrain altitude from zero in the constructed scene.
 */
export const BRENTWOOD_ORIGIN=Object.freeze({lat:51.6213112,lon:0.3055506});
const A=6378137;
const E2=6.6943799901413165e-3;
const R=Math.PI/180;
export type Triple=readonly [number,number,number];
export interface Reference{lat:number;lon:number;heightEllipsoid:number}
export const reference=(heightEllipsoid:number):Reference=>({...BRENTWOOD_ORIGIN,heightEllipsoid});
export function geodeticToEcef(lat:number,lon:number,heightEllipsoid:number):Triple{
  const phi=lat*R,lambda=lon*R,s=Math.sin(phi),c=Math.cos(phi);
  const n=A/Math.sqrt(1-E2*s*s);
  return [(n+heightEllipsoid)*c*Math.cos(lambda),(n+heightEllipsoid)*c*Math.sin(lambda),(n*(1-E2)+heightEllipsoid)*s];
}
export function ecefToLocal(ecef:Triple,ref:Reference):Triple{
  const phi=ref.lat*R,lambda=ref.lon*R;
  const cp=Math.cos(phi),sp=Math.sin(phi),cl=Math.cos(lambda),sl=Math.sin(lambda);
  const o=geodeticToEcef(ref.lat,ref.lon,ref.heightEllipsoid);
  const dx=ecef[0]-o[0],dy=ecef[1]-o[1],dz=ecef[2]-o[2];
  const east=-sl*dx+cl*dy;
  const up=cp*cl*dx+cp*sl*dy+sp*dz;
  const north=-sp*cl*dx-sp*sl*dy+cp*dz;
  return [east,up,-north];
}
export function localToEcef(local:Triple,ref:Reference):Triple{
  const phi=ref.lat*R,lambda=ref.lon*R;
  const cp=Math.cos(phi),sp=Math.sin(phi),cl=Math.cos(lambda),sl=Math.sin(lambda);
  const [east,up,south]=local,north=-south;
  const o=geodeticToEcef(ref.lat,ref.lon,ref.heightEllipsoid);
  return [
    o[0]-sl*east+cp*cl*up-sp*cl*north,
    o[1]+cl*east+cp*sl*up-sp*sl*north,
    o[2]+sp*up+cp*north
  ];
}
/** Only horizontal conversion used by the current OSM extraction script.
 * It uses a constant metre/degree approximation; this is not a surveyed transform.
 */
export function approximateLocalToGeo(x:number,z:number):{lat:number;lon:number}{
  return {lat:BRENTWOOD_ORIGIN.lat-z/111320,lon:BRENTWOOD_ORIGIN.lon+x/(111320*Math.cos(BRENTWOOD_ORIGIN.lat*R))};
}
