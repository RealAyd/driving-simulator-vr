import {describe,expect,it} from 'vitest';
import {Terrain,terrainFor} from '../../src/world/terrain';
import brentwood from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import kingsRoad from '../../content/locations/brentwood-kings-road-zebra.json';

describe('terrain',()=>{
  it('interpolates between grid points and holds the edge value outside',()=>{
    const t=new Terrain({locationId:'t',attribution:'',cell:4,x0:0,z0:0,cols:2,rows:2,heights:[0,4,8,12]});
    expect(t.heightAt(0,0)).toBe(0);
    expect(t.heightAt(2,0)).toBeCloseTo(2);
    expect(t.heightAt(0,2)).toBeCloseTo(4);
    expect(t.heightAt(2,2)).toBeCloseTo(6);
    expect(t.heightAt(-50,-50)).toBe(0);
    expect(t.heightAt(50,50)).toBeCloseTo(12,1);
  });

  it('covers every road of the Brentwood locations, level at the origin, with plausible slopes',()=>{
    for(const loc of [brentwood,kingsRoad]){
      const t=terrainFor(loc.id)!;
      expect(t,loc.id).toBeTruthy();
      expect(Math.abs(t.heightAt(0,0))).toBeLessThan(.5);
      const e=t.extent;
      for(const r of loc.roads)for(const p of r.centreline){
        expect(p.x).toBeGreaterThanOrEqual(e.x0);expect(p.x).toBeLessThanOrEqual(e.x0+e.width);
        expect(p.z).toBeGreaterThanOrEqual(e.z0);expect(p.z).toBeLessThanOrEqual(e.z0+e.depth);
      }
      // Along each road, no step steeper than 1 in 5 between points 4 m or more apart (residential streets).
      for(const r of loc.roads)for(let i=1;i<r.centreline.length;i++){
        const a=r.centreline[i-1]!,b=r.centreline[i]!,d=Math.hypot(b.x-a.x,b.z-a.z);
        if(d<4)continue;
        expect(Math.abs(t.heightAt(b.x,b.z)-t.heightAt(a.x,a.z))/d,`${loc.id} ${r.id}`).toBeLessThan(.2);
      }
    }
  });
});
