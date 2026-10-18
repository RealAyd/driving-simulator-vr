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

/**
 * Scale from true tangent-plane metres to the scene's x/z, which the OSM extraction
 * (tools/brentwood/build_location.py) made with a constant 111 320 m per degree.
 * About 0.2 % in x and 0.05 % in z at Brentwood: 0.7 m at the west end of High Street.
 */
export function sceneScale(ref:Pick<Reference,'lat'>=BRENTWOOD_ORIGIN):{x:number;z:number}{
  const s=Math.sin(ref.lat*R),w=1-E2*s*s;
  const n=A/Math.sqrt(w),m=A*(1-E2)/Math.pow(w,1.5);
  return {x:111320/(n*R),z:111320/(m*R)};
}

/**
 * ECEF -> scene, as a Babylon (row-vector) 4x4 in row-major order: scene = [ecef,1] * M.
 * Rotation and translation only (the tangent frame at the reference); sceneScale() is
 * applied by a parent node. Needs 64-bit matrices: the translation is about 6.4e6 m.
 */
export function ecefToSceneMatrix(ref:Reference):number[]{
  const phi=ref.lat*R,lambda=ref.lon*R;
  const cp=Math.cos(phi),sp=Math.sin(phi),cl=Math.cos(lambda),sl=Math.sin(lambda);
  // Rows: scene x (east), y (up), z (south) in ECEF components.
  const rows:Triple[]=[[-sl,cl,0],[cp*cl,cp*sl,sp],[sp*cl,sp*sl,-cp]];
  const o=geodeticToEcef(ref.lat,ref.lon,ref.heightEllipsoid);
  const t=rows.map(r=>-(r[0]*o[0]+r[1]*o[1]+r[2]*o[2]));
  return [
    rows[0]![0],rows[1]![0],rows[2]![0],0,
    rows[0]![1],rows[1]![1],rows[2]![1],0,
    rows[0]![2],rows[1]![2],rows[2]![2],0,
    t[0]!,t[1]!,t[2]!,1
  ];
}
