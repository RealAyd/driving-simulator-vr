/**
 * Units contract. One world unit is one metre; internal speed is metres per
 * second; time is seconds of simulation time; angles are radians. Only the
 * HUD converts to miles per hour.
 */
export type Metres=number;
export type MetresPerSecond=number;
export type Seconds=number;
export type Radians=number;

export const METRES_PER_SECOND_PER_MPH=0.44704;

export function mpsToMph(speed:MetresPerSecond):number{
  return speed/METRES_PER_SECOND_PER_MPH;
}

export function mphToMps(mph:number):MetresPerSecond{
  return mph*METRES_PER_SECOND_PER_MPH;
}

export const degToRad=(degrees:number):Radians=>degrees*Math.PI/180;
export const radToDeg=(radians:Radians):number=>radians*180/Math.PI;
