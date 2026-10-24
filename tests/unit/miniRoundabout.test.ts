import {describe,expect,it} from 'vitest';
import {aroundMini,miniAt} from '../../src/world/miniRoundabout';

// x east, z south. A car arriving from the south (heading north) in the left lane enters at the west side of its road.
const m={position:{x:0,z:0},radius:7,discDiameter:2.6};
const entryFromSouth={x:-1.8,z:7};
const exits={left:{x:-7,z:1.8},ahead:{x:-1.8,z:-7},right:{x:7,z:-1.8},back:{x:1.8,z:7}};
const angle=(p:{x:number;z:number})=>Math.atan2(p.z,p.x);
const radius=(p:{x:number;z:number})=>Math.hypot(p.x,p.z);
/** Total angle turned along the path (positive: clockwise from above). */
const swept=(pts:Array<{x:number;z:number}>)=>pts.slice(1).reduce((s,p,i)=>{let d=angle(p)-angle(pts[i]!);d=Math.atan2(Math.sin(d),Math.cos(d));return s+d},0);

describe('mini-roundabouts: clockwise round the painted disc',()=>{
  it('starts where the road in meets it and ends where the road out leaves',()=>{
    const p=aroundMini(m,entryFromSouth,exits.right);
    expect(p[0]!.x).toBeCloseTo(-1.8);expect(p[0]!.z).toBeCloseTo(7);
    expect(p.at(-1)!.x).toBeCloseTo(7);expect(p.at(-1)!.z).toBeCloseTo(-1.8);
  });

  it('always clockwise: left about a quarter, ahead about a half, right about three quarters, back the way it came all the way round',()=>{
    const deg=(e:{x:number;z:number})=>swept(aroundMini(m,entryFromSouth,e))*180/Math.PI;
    expect(deg(exits.left)).toBeGreaterThan(45);expect(deg(exits.left)).toBeLessThan(100);
    expect(deg(exits.ahead)).toBeGreaterThan(140);expect(deg(exits.ahead)).toBeLessThan(200);
    expect(deg(exits.right)).toBeGreaterThan(220);expect(deg(exits.right)).toBeLessThan(290);
    expect(deg(exits.back)).toBeGreaterThan(330);
  });

  it('turning right goes round the west and north sides of the disc (not across it), never touching it',()=>{
    const p=aroundMini(m,entryFromSouth,exits.right);
    expect(Math.min(...p.map(radius))).toBeGreaterThanOrEqual(1.3+2.4-1e-6);
    expect(p.some(q=>q.x<-3&&Math.abs(q.z)<1.5)).toBe(true);
    expect(p.some(q=>q.z<-3&&Math.abs(q.x)<1.5)).toBe(true);
  });

  it('a left turn keeps to the outside (no swing in towards the disc)',()=>{
    const p=aroundMini(m,entryFromSouth,exits.left);
    expect(Math.min(...p.map(radius))).toBeGreaterThan(6.5);
  });

  it('finds the mini-roundabout a junction point belongs to',()=>{
    expect(miniAt([m],{x:8,z:0})).toBe(m);
    expect(miniAt([m],{x:12,z:0})).toBeNull();
  });
});
