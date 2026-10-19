import {describe,expect,it} from 'vitest';
import {shopfrontVariant} from '../../src/assets/ukShopfronts';

describe('reusable UK shopfront catalogue',()=>{
  it('uses reproducible variants for each mapped building and unit',()=>{
    expect(shopfrontVariant('osm:building:123',0,5.5)).toEqual(shopfrontVariant('osm:building:123',0,5.5));
  });
  it('keeps doors and canopies within small shop units',()=>{
    for(let i=0;i<100;i++){
      const v=shopfrontVariant(`shop-${i}`,i,2.5);
      expect(v.recess).toBe(.08);
      expect(v.canopy).toBe(false);
      expect(v.stallHeight).toBeGreaterThan(0);
      expect(v.stallHeight).toBeLessThan(1);
      expect(v.mullionSpacing).toBeGreaterThan(1);
    }
  });
  it('does not assign brand identities to generic shopfronts',()=>{
    const v=shopfrontVariant('generic-shop',0,5.5);
    expect(Object.keys(v)).not.toContain('brand');
    expect(Object.keys(v)).not.toContain('name');
  });
});
