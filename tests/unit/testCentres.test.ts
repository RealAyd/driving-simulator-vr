import {describe,expect,it} from 'vitest';
import centres from '../../content/centres/test-centres.json';

// DVSA car test centres (DRT122A, April 2024 to March 2025) located with OpenStreetMap (tools/centres): the
// search list for "Drive anywhere".
describe('Test centre list',()=>{
  it('has every centre once, in Great Britain, with how it was located',()=>{
    expect(centres.length).toBeGreaterThan(300);
    expect(new Set(centres.map(c=>c.name)).size).toBe(centres.length);
    for(const c of centres){
      expect(c.lat,c.name).toBeGreaterThan(49.8);expect(c.lat,c.name).toBeLessThan(61);
      expect(c.lon,c.name).toBeGreaterThan(-8.7);expect(c.lon,c.name).toBeLessThan(2);
      expect(['centre','street','town']).toContain(c.located);
    }
  });
});
