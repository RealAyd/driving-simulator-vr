import {describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine';
import {FreeCamera,Scene,TransformNode,Vector3} from '../../src/engine/babylon';
import {degToRad,forwardFromHeading,localToWorld} from '../../src/contracts';
import {applyPose,configureScene,headingFromRotationY,rotationYFromHeading} from '../../src/engine/babylonAdapter';
import {FixedStepClock} from '../../src/engine/clock';
import {pickQualityProfile} from '../../src/engine/quality';

function scene(){
  const s=new Scene(new NullEngine());
  configureScene(s);
  return s;
}

describe('Babylon adapter agrees with the world contract',()=>{
  it('places a child at the same world point as localToWorld for any heading',()=>{
    const s=scene();
    const car=new TransformNode('car',s);
    const child=new TransformNode('seat',s);
    child.parent=car;
    child.position.set(.37,1.2,-1);
    for(const deg of [0,19,90,200,315]){
      const pose={position:{x:3,y:.5,z:-7},heading:degToRad(deg)};
      applyPose(car,pose);
      car.computeWorldMatrix(true);
      const world=child.computeWorldMatrix(true).getTranslation();
      const expected=localToWorld(pose,{x:.37,y:1.2,z:-1});
      // Babylon matrices are 32-bit floats: agreement to 0.01 mm is exact enough.
      expect(world.x).toBeCloseTo(expected.x,5);
      expect(world.y).toBeCloseTo(expected.y,5);
      expect(world.z).toBeCloseTo(expected.z,5);
    }
  });
  it('a camera targeted along the heading looks along the contract forward',()=>{
    const s=scene();
    const cam=new FreeCamera('c',Vector3.Zero(),s);
    const f=forwardFromHeading(degToRad(19));
    cam.setTarget(new Vector3(f.x,0,f.z));
    const dir=cam.getForwardRay(1).direction;
    expect(dir.x).toBeCloseTo(f.x,6);
    expect(dir.z).toBeCloseTo(f.z,6);
  });
  it('heading/rotation conversion is a tested inverse',()=>{
    expect(headingFromRotationY(rotationYFromHeading(1.234))).toBeCloseTo(1.234,12);
  });
});

describe('fixed step clock',()=>{
  it('runs whole steps and carries the remainder',()=>{
    const clock=new FixedStepClock(.01);
    const steps:number[]=[];
    expect(clock.advance(.035,dt=>steps.push(dt))).toBe(3);
    expect(steps).toEqual([.01,.01,.01]);
    expect(clock.alpha).toBeCloseTo(.5,6);
    expect(clock.advance(.005,()=>{})).toBe(1);
    expect(clock.time).toBeCloseTo(.04,9);
  });
  it('caps catch-up after a long hitch instead of fast-forwarding',()=>{
    const clock=new FixedStepClock(1/60,5);
    expect(clock.advance(10,()=>{})).toBe(5);
    expect(clock.time).toBeCloseTo(5/60,9);
  });
  it('does nothing while paused and resets cleanly',()=>{
    const clock=new FixedStepClock(.01);
    clock.pause();
    expect(clock.advance(1,()=>{throw new Error('ran while paused')})).toBe(0);
    clock.resume();clock.advance(.02,()=>{});clock.reset();
    expect(clock.time).toBe(0);expect(clock.alpha).toBe(0);
  });
});

describe('quality profiles',()=>{
  it('honours ?quality= and otherwise picks phone for any touch screen',()=>{
    expect(pickQualityProfile('?quality=phone',false,1920).id).toBe('phone');
    expect(pickQualityProfile('',true,400).id).toBe('phone');
    expect(pickQualityProfile('',true,932).id).toBe('phone'); // iPhone 14 Pro Max landscape
    expect(pickQualityProfile('',false,1280).id).toBe('desktop');
  });
});

import {PerfProbe} from '../../src/engine/perfProbe';
describe('performance probe',()=>{
  it('reports average fps and frame-time percentiles over a rolling window',()=>{
    const probe=new PerfProbe(100);
    for(let i=0;i<95;i++)probe.record(16);
    for(let i=0;i<5;i++)probe.record(50);
    const s=probe.stats();
    expect(s.frames).toBe(100);
    expect(s.p50Ms).toBe(16);
    expect(s.worstMs).toBe(50);
    expect(s.averageFps).toBeCloseTo(1000/17.7,1);
    probe.record(NaN);probe.record(-1);
    expect(probe.stats().frames).toBe(100);
  });
});
