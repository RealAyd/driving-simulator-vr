import {describe,expect,it} from 'vitest';
import {
  degToRad,forwardFromHeading,headingDelta,headingFromDirection,localToWorld,mphToMps,mpsToMph,
  normalizeHeading,parseLocation,rightFromHeading
} from '../../src/contracts';
import location from '../../content/locations/representative-residential-straight.json';

const close=(a:number,b:number,eps=1e-9)=>expect(Math.abs(a-b)).toBeLessThan(eps);

describe('units',()=>{
  it('converts speed between m/s and mph',()=>{
    close(mpsToMph(13.4112),30,1e-9);
    close(mphToMps(70),31.2928,1e-9);
    close(mpsToMph(mphToMps(42)),42);
  });
});

describe('coordinate convention',()=>{
  it('heading 0 faces north (-Z) and right is east (+X)',()=>{
    const f=forwardFromHeading(0),r=rightFromHeading(0);
    close(f.x,0);close(f.z,-1);close(r.x,1);close(r.z,0);
  });
  it('heading 90 degrees (clockwise) faces east',()=>{
    const f=forwardFromHeading(degToRad(90));
    close(f.x,1);close(f.z,0);
  });
  it('round-trips headings through directions',()=>{
    for(const deg of [0,19,90,180,270,359]){
      close(headingFromDirection(forwardFromHeading(degToRad(deg))),degToRad(deg),1e-9);
    }
  });
  it('wraps headings and computes shortest differences',()=>{
    close(normalizeHeading(-Math.PI/2),3*Math.PI/2);
    close(headingDelta(degToRad(10),degToRad(350)),degToRad(20));
    close(headingDelta(degToRad(350),degToRad(10)),degToRad(-20));
  });
  it('maps local seat offsets into the world using the vehicle heading once',()=>{
    const pose={position:{x:10,y:0,z:5},heading:degToRad(90)};
    const p=localToWorld(pose,{x:.37,y:1.2,z:-1}); // right of centre, 1 m forward
    close(p.x,11,1e-9);close(p.y,1.2);close(p.z,5.37,1e-9);
  });
});

describe('location schema',()=>{
  it('accepts the representative location',()=>{
    const parsed=parseLocation(location);
    expect(parsed.fidelity).toBe('representative');
    expect(parsed.drivingSide).toBe('left');
  });
  it('rejects a spawn on a missing road with a readable message',()=>{
    const broken={...location,spawn:{...location.spawn,roadId:'nowhere'}};
    expect(()=>parseLocation(broken)).toThrow(/Spawn road "nowhere" does not exist/);
  });
  it('rejects unknown fields so typos do not silently pass',()=>{
    expect(()=>parseLocation({...location,lanes:3})).toThrow(/Invalid location file/);
  });
});
