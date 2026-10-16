import {degToRad,localDirectionToWorld,localToWorld,type Pose,type Radians,type Vec3} from '../contracts';

/**
 * Driver seat for a right-hand-drive car, in vehicle-local metres
 * (+X right, +Y up from the road surface, -Z forward from the car centre).
 * Eye height is calibrated against the road surface, never sea level.
 */
export interface SeatConfig{
  eye:Vec3;
  yawLimit:Radians;
  pitchUp:Radians;
  pitchDown:Radians;
}

export const RHD_SEAT:Readonly<SeatConfig>=Object.freeze({
  eye:{x:.37,y:1.2,z:.1},
  yawLimit:degToRad(160),   // enough for over-the-shoulder checks
  pitchUp:degToRad(45),
  pitchDown:degToRad(60)
});

const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));

/** Head direction relative to the seat. Yaw positive = looking right. */
export class DriverHead{
  yaw:Radians=0;
  pitch:Radians=0;

  constructor(readonly seat:SeatConfig=RHD_SEAT){}

  look(deltaYaw:Radians,deltaPitch:Radians):void{
    this.yaw=clamp(this.yaw+deltaYaw,-this.seat.yawLimit,this.seat.yawLimit);
    this.pitch=clamp(this.pitch+deltaPitch,-this.seat.pitchDown,this.seat.pitchUp);
  }

  recentre():void{
    this.yaw=0;
    this.pitch=0;
  }

  /** World eye position for a vehicle pose. */
  eyeWorld(vehicle:Pose):Vec3{
    return localToWorld(vehicle,this.seat.eye);
  }

  /** World look direction: vehicle heading, then head yaw, then pitch. */
  lookWorld(vehicle:Pose):Vec3{
    const cp=Math.cos(this.pitch);
    const local={x:Math.sin(this.yaw)*cp,y:Math.sin(this.pitch),z:-Math.cos(this.yaw)*cp};
    return localDirectionToWorld(vehicle.heading,local);
  }
}
