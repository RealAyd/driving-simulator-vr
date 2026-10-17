import {describe,expect,it} from 'vitest';
import {TILT_SENSITIVITY,shapeSteer,tiltAngle} from '../../src/input/tilt';

const DEG=Math.PI/180;

describe('tilt steering', () => {
  it('reads level as straight ahead in landscape, upright or tipped back', () => {
    // Upright landscape (top of phone to the left): gamma −90.
    expect(tiltAngle(0,-90,90)).toBeCloseTo(0,5);
    // Lying flat, screen up.
    expect(tiltAngle(0,0,90)).toBeCloseTo(0,5);
    expect(tiltAngle(0,0,270)).toBeCloseTo(0,5);
  });

  it('turning the phone clockwise steers right in either landscape direction', () => {
    // Tipped back 40°, then turned 15° clockwise.
    // Landscape 90: screen right is device −y, so a clockwise turn lifts the top (beta up).
    expect(tiltAngle(15,-40,90)/DEG).toBeGreaterThan(10);
    // Landscape 270: screen right is device +y, so a clockwise turn lowers the top.
    expect(tiltAngle(-15,40,270)/DEG).toBeGreaterThan(10);
    expect(tiltAngle(-15,-40,90)/DEG).toBeLessThan(-10);
  });

  it('is unaffected by how far the phone is tipped back', () => {
    const upright=tiltAngle(10,-89,90),tipped=tiltAngle(10,-30,90);
    expect(Math.sign(upright)).toBe(Math.sign(tipped));
  });

  it('has a dead zone, a gentle centre and full lock', () => {
    const t=TILT_SENSITIVITY.normal;
    expect(shapeSteer(2*DEG,0,t)).toBe(0);
    const small=shapeSteer(8*DEG,0,t),large=shapeSteer(20*DEG,0,t);
    expect(small).toBeGreaterThan(0);
    expect(large/small).toBeGreaterThan(20/8);
    expect(shapeSteer(40*DEG,0,t)).toBe(1);
    expect(shapeSteer(-40*DEG,0,t)).toBe(-1);
  });

  it('measures lean from the calibrated centre', () => {
    const t=TILT_SENSITIVITY.normal;
    expect(shapeSteer(12*DEG,12*DEG,t)).toBe(0);
    expect(shapeSteer(0,12*DEG,t)).toBeLessThan(0);
  });
});
