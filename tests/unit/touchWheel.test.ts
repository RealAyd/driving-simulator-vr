import {describe,expect,it} from 'vitest';
import {angleDelta,screenAngle,TouchWheel} from '../../src/input/touchWheel';

describe('on-screen steering wheel',()=>{
  it('measures angles clockwise from the top of the wheel on screen',()=>{
    expect(screenAngle(0,0,0,-10)).toBeCloseTo(0);
    expect(screenAngle(0,0,10,0)).toBeCloseTo(90);
    expect(screenAngle(0,0,-10,0)).toBeCloseTo(-90);
    expect(angleDelta(170,-170)).toBeCloseTo(20);
    expect(angleDelta(-170,170)).toBeCloseTo(-20);
  });

  it('turns with the finger, past half a turn, and stops at full lock',()=>{
    const w=new TouchWheel({fullLockDeg:270,returnDegPerSec:300});
    w.grab(0);
    for(let a=0;a<=200;a+=10)w.move(a);
    expect(w.turnDeg).toBeCloseTo(200);
    expect(w.update(0)).toBeCloseTo(200/270);
    for(let a=200;a<=400;a+=10)w.move(a);
    expect(w.turnDeg).toBe(270);
    expect(w.update(0)).toBe(1);
    // Turning back the other way (anticlockwise) steers left.
    for(let a=400;a>=-300;a-=10)w.move(a);
    expect(w.update(0)).toBe(-1);
  });

  it('eases back to the centre when let go, not while held',()=>{
    const w=new TouchWheel({fullLockDeg:270,returnDegPerSec:300});
    w.grab(0);w.move(90);
    w.update(1);
    expect(w.turnDeg).toBe(90);
    w.release();
    w.update(.1);
    expect(w.turnDeg).toBeCloseTo(60);
    w.update(1);
    expect(w.turnDeg).toBe(0);
  });
});
