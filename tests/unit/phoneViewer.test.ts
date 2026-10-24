import {describe,expect,it} from 'vitest';
import {deviceBasis,recentred,rightOf,yawOf,yawPitch} from '../../src/xr/headOrientation';
import {IPHONE_14_PRO_MAX,VIEWER_PROFILES,eyeLayout} from '../../src/xr/viewerProfiles';

const deg=(r:number)=>r*180/Math.PI;
const close=(a:number,b:number,tol=.5)=>expect(Math.abs(a-b)).toBeLessThan(tol);

describe('phone viewer: head orientation from the motion sensors',()=>{
  it('a phone held upright in landscape (either way round) looks level with the screen upright',()=>{
    for(const [gamma,screen] of [[-90,90],[90,-90]] as const){
      const b=deviceBasis(10,0,gamma,screen);
      close(b.forward.y,0,.01);
      close(b.up.y,1,.01);
    }
  });

  it('after recentring, turning the head right, left, up and down gives the matching yaw and pitch',()=>{
    const reading=(yaw:number,pitch:number)=>deviceBasis(40-yaw,0,-90-pitch,90);   // landscape, screen angle 90
    const yaw0=yawOf(reading(0,0).forward);
    const at=(yaw:number,pitch:number)=>{const yp=yawPitch(recentred(reading(yaw,pitch),yaw0));return {yaw:deg(yp.yaw),pitch:deg(yp.pitch)}};
    expect(at(0,0)).toEqual({yaw:expect.closeTo(0,3),pitch:expect.closeTo(0,3)});
    close(at(30,0).yaw,30);
    close(at(-110,0).yaw,-110);     // over the left shoulder
    close(at(0,-20).pitch,-20);
    close(at(0,15).pitch,15);
  });

  it('portrait readings work too (screen angle 0)',()=>{
    const b=deviceBasis(0,90,0,0);
    close(b.forward.z,-1,.01);
    close(deg(yawPitch(deviceBasis(0,100,0,0)).pitch),10);
    close(deg(yawPitch(deviceBasis(-30,90,0,0)).yaw),30);
  });

  it('the eyes are separated along the head\'s right-hand direction',()=>{
    const r=rightOf({forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0}});
    expect([r.x,r.y,r.z].map(v=>v+0)).toEqual([1,0,0]);
  });
});

describe('phone viewer: lens layout for iPhone 14 Pro Max',()=>{
  const aspect=2796/1290;
  it('shifts each eye\'s image towards the middle of the screen, under its lens',()=>{
    const l=eyeLayout(VIEWER_PROFILES[0]!,IPHONE_14_PRO_MAX.width,aspect);
    expect(l.shift.left).toBeGreaterThan(0);
    expect(l.shift.right).toBeCloseTo(-l.shift.left);
    // 62 mm lens separation on a 154 mm wide screen: lens centres 7.6 mm inside each half's centre.
    close((l.centre.left-.5)*IPHONE_14_PRO_MAX.width/2*1000,(IPHONE_14_PRO_MAX.width/4-.062/2)*1000,.05);
    expect(l.aspect).toBeCloseTo(aspect/2);
  });

  it('shrinks the corrected image just enough to keep the nearest side edge filled; no correction means no shrinking',()=>{
    const p=VIEWER_PROFILES[0]!;
    const l=eyeLayout(p,IPHONE_14_PRO_MAX.width,aspect);
    const edge=(.5-(l.centre.left-.5))*l.aspect*2;
    expect(l.scale).toBeCloseTo(1+p.k1*edge**2+p.k2*edge**4);
    expect(l.scale).toBeGreaterThan(1);
    expect(eyeLayout(VIEWER_PROFILES.find(v=>v.id==='flat')!,IPHONE_14_PRO_MAX.width,aspect).scale).toBe(1);
  });
});

describe('the phone screen size, estimated for each phone',()=>{
  it('iPhones from their pixel ratio and size; Android phones from the typical density',async()=>{
    const {estimatedScreenWidthMm,estimatePointsPerInch}=await import('../../src/xr/viewerProfiles');
    // iPhone 14 Pro Max: 154.4 mm across 932 points.
    expect(Math.abs(estimatedScreenWidthMm({ios:true,dpr:3,longSide:932})-154.4)).toBeLessThan(1);
    // iPhone 14 / 13 (844 points, 460 ppi): 140 mm.
    expect(Math.abs(estimatedScreenWidthMm({ios:true,dpr:3,longSide:844})-139.8)).toBeLessThan(1);
    // iPhone SE / 8 (667 points at 2x, 326 ppi): 104 mm.
    expect(Math.abs(estimatedScreenWidthMm({ios:true,dpr:2,longSide:667})-104.1)).toBeLessThan(1);
    // iPhone 11 / XR (896 points at 2x, 326 ppi): 139.6 mm.
    expect(Math.abs(estimatedScreenWidthMm({ios:true,dpr:2,longSide:896})-139.6)).toBeLessThan(1);
    // Android: 150 CSS px per inch (a Pixel 7, 915 px, measures about 147 mm; 155 mm estimated).
    expect(estimatePointsPerInch({ios:false,dpr:2.625,longSide:915})).toBe(150);
    expect(Math.abs(estimatedScreenWidthMm({ios:false,dpr:2.625,longSide:915})-147)).toBeLessThan(9);
  });
});
