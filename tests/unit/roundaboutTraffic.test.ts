import {describe,expect,it} from 'vitest';
import {loadCentre} from './trafficDrive';
import {driveRing} from './ringTraffic';
import {layoutRoundabouts} from '../../src/world/roundaboutLayout';
import {roundaboutRings} from '../../src/world/roundabouts';
import {insidePolygon} from '../../src/world/townscape';

/**
 * Traffic at the big roundabouts of four centres (each with three seeds): cars keep coming on and going round, give
 * way to those already on it from the right (seldom coming on closer than 2 s ahead of one, never touching), and do
 * not sit at the edge with nothing coming or stand about for long.
 */
describe('traffic at big roundabouts',()=>{
  for(const id of ['northampton','dorchester','peterborough','chichester'])it(id,async()=>{
    const loc=await loadCentre(id);
    for(const seed of [1,2,3]){
      const r=driveRing(loc,0,seed),at=`${id}/${seed}: ${JSON.stringify(r)}`;
      expect(r.entries,at).toBeGreaterThanOrEqual(15);
      expect(r.cutIn,at).toBeLessThanOrEqual(Math.max(2,r.entries*.15));
      expect(r.needlessWait,at).toBeLessThan(30);
      expect(r.longestStand,at).toBeLessThan(60);
      expect(r.overlaps,at).toBe(0);
    }
  },600_000);
});

describe('how big roundabouts are built',()=>{
  it('an island in each ring, keep-left bollards where the ways in and out meet it',async()=>{
    for(const [id,bollards] of [['northampton',8],['dorchester',9],['chichester',3],['peterborough',5]] as const){
      const l=layoutRoundabouts(await loadCentre(id));
      expect(l.islands.length,id).toBeGreaterThan(0);
      for(const i of l.islands)expect(i.outline.length,id).toBeGreaterThan(8);
      expect(l.bollards.length,id).toBe(bollards);
      // Every bollard off the ring's carriageway (on an island's nose, never in a lane going round).
      for(const b of l.bollards)for(const i of l.islands){
        const d=Math.hypot(b.at.x-i.centre.x,b.at.z-i.centre.z);
        expect(d>i.ring.reach,`${id} ${b.id}`).toBe(true);
      }
    }
  },300_000);

  it('no house in the middle of a roundabout, unless the map has one there',async()=>{
    // (The owner's report from Currie: the area builder had lined Riccarton Mains Road's island with terraced houses.)
    for(const [id,mapped] of [['edinburgh-currie',0],['coleraine',0],['chadderton',0],['inveraray',1]] as const){
      const loc=await loadCentre(id);
      const inside=roundaboutRings(loc).flatMap(g=>{const line=[...g.roads].flatMap(r=>r.centreline);return loc.buildings.filter(b=>b.footprint.some(p=>insidePolygon(p,line)))});
      expect(inside.filter(b=>b.source==='approximate').map(b=>b.id),id).toEqual([]);
      expect(inside.length,id).toBe(mapped);
    }
  },300_000);
});
