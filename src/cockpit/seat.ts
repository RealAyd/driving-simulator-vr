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
    this.target=null;
    this.returning=false;
  }

  /** Where a view button is turning the head to, or null. */
  target:{yaw:Radians;pitch:Radians}|null=null;
  private returning=false;

  /** Starts a held view (mirror or shoulder), or ends it with null. */
  hold(target:{yaw:Radians;pitch:Radians}|null):void{
    this.returning=this.target!==null&&target===null;
    this.target=target;
  }

  /**
   * Turns the head toward a held view, or back to forward after one is
   * released, at a natural rate. Does nothing otherwise, so swipe/mouse
   * looking is never pulled back.
   */
  animate(dt:number,ratePerSecond=6):void{
    if(!this.target&&!this.returning)return;
    const goal=this.target??{yaw:0,pitch:0};
    if(!this.target&&Math.abs(this.yaw)<1e-3&&Math.abs(this.pitch)<1e-3){this.returning=false;return}
    const step=ratePerSecond*dt;
    const move=(from:number,to:number)=>from+clamp(to-from,-step,step);
    this.yaw=clamp(move(this.yaw,goal.yaw),-this.seat.yawLimit,this.seat.yawLimit);
    this.pitch=clamp(move(this.pitch,goal.pitch),-this.seat.pitchDown,this.seat.pitchUp);
  }

  /** Head yaw/pitch that looks from the eye at a vehicle-local point. */
  aimAt(local:Vec3):{yaw:Radians;pitch:Radians}{
    const dx=local.x-this.seat.eye.x,dy=local.y-this.seat.eye.y,dz=local.z-this.seat.eye.z;
    return {yaw:Math.atan2(dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
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
