import {forwardFromHeading,normalizeHeading,type Metres,type MetresPerSecond,type Radians,type Seconds,type Vec3} from '../contracts';

/** Driver demands in normalised ranges. Steer: -1 full left, +1 full right. */
export interface Controls{
  throttle:number;
  brake:number;
  steer:number;
  /** Reverse gear selected: the accelerator drives the car backwards (up to `maxReverseSpeed`). */
  reverse?:boolean;
}

export const NO_CONTROLS:Readonly<Controls>=Object.freeze({throttle:0,brake:0,steer:0});

export interface VehicleParams{
  wheelbase:Metres;
  maxSpeed:MetresPerSecond;
  /** Fastest the car reverses (m/s). */
  maxReverseSpeed:MetresPerSecond;
  acceleration:number;      // m/s² at full throttle from rest
  reverseAcceleration:number; // m/s² at full throttle in reverse, from rest
  brakeDeceleration:number; // m/s² at full brake
  rollingDeceleration:number;
  maxSteerAngle:Radians;
  steerRate:Radians;        // how fast the front wheels turn, rad/s
  /**
   * Full steering at speed is limited to this sideways acceleration (m/s²), a
   * firm but normal turn, so a full input never asks more than tyre grip allows.
   */
  maxLateralAccel:number;
}

export const LEARNER_CAR:Readonly<VehicleParams>=Object.freeze({
  wheelbase:2.6,
  maxSpeed:31.3,            // 70 mph
  maxReverseSpeed:2.7,      // 6 mph
  acceleration:2.6,
  reverseAcceleration:1.1,
  brakeDeceleration:7.5,
  rollingDeceleration:.35,
  maxSteerAngle:.55,
  steerRate:1.1,
  maxLateralAccel:4.5
});

export interface VehicleState{
  position:Vec3;
  heading:Radians;
  speed:MetresPerSecond;
  /** Front wheel angle; positive turns right (clockwise). */
  steerAngle:Radians;
}

const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));

export function steerLimit(params:VehicleParams,speed:MetresPerSecond):Radians{
  // Turning radius R = wheelbase / tan(angle); sideways acceleration = speed² / R.
  const gripLimited=Math.atan(params.maxLateralAccel*params.wheelbase/Math.max(speed*speed,1e-6));
  return Math.min(params.maxSteerAngle,gripLimited);
}

/**
 * One fixed step of a kinematic bicycle model. Speed is signed: negative is reversing (reverse gear selected and
 * the accelerator held). Pressing the accelerator in the gear opposite to the way the car is rolling slows it to a
 * stop first. Height is set by the caller from the road.
 */
export function stepVehicle(state:VehicleState,controls:Controls,params:VehicleParams,dt:Seconds):VehicleState{
  const throttle=clamp(controls.throttle,0,1);
  const brake=clamp(controls.brake,0,1);
  const steer=clamp(controls.steer,-1,1);
  const reverse=!!controls.reverse;

  const target=steer*steerLimit(params,state.speed);
  const maxChange=params.steerRate*dt;
  const steerAngle=state.steerAngle+clamp(target-state.steerAngle,-maxChange,maxChange);

  let speed=state.speed;
  let decel=brake*params.brakeDeceleration+(throttle>0?0:params.rollingDeceleration);
  if(throttle>0){
    if(reverse?speed>.05:speed<-.05)decel+=throttle*params.brakeDeceleration*.5;
    else if(reverse)speed-=throttle*params.reverseAcceleration*(1+speed/params.maxReverseSpeed)*dt;
    else speed+=throttle*params.acceleration*(1-speed/params.maxSpeed)*dt;
  }
  // Braking and rolling resistance bring the car towards a stop, never past it.
  speed=speed>0?Math.max(0,speed-decel*dt):Math.min(0,speed+decel*dt);
  speed=clamp(speed,-params.maxReverseSpeed,params.maxSpeed);

  // Integrate with the average speed over the step for predictable stopping.
  const travel=(state.speed+speed)/2*dt;
  const turn=travel/params.wheelbase*Math.tan(steerAngle);
  const f=forwardFromHeading(state.heading+turn/2);
  return {
    position:{x:state.position.x+f.x*travel,y:state.position.y,z:state.position.z+f.z*travel},
    heading:normalizeHeading(state.heading+turn),
    speed,
    steerAngle
  };
}

/** Distance needed to stop from `speed` under full braking. */
export function stoppingDistance(params:VehicleParams,speed:MetresPerSecond):Metres{
  return speed*speed/(2*(params.brakeDeceleration));
}
