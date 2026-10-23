import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {layoutTownscape} from '../../src/world/townscape';
import goodmayes from '../../content/locations/goodmayes.json';

// Homes face their street: the road-facing wall nearest the road is the front (front doors drawn on it), one per
// home; a corner house has one front, not two; walls that face no road (backs, sides) are never fronts.
describe('house fronts (Goodmayes)',()=>{
  const town=layoutTownscape(parseLocation(goodmayes))!.town!;
  const homes=town.buildings.filter(b=>b.use==='residential');
  it('each home facing a road has exactly one front, on a wall that faces a road',()=>{
    let facing=0;
    for(const b of homes){
      const fronts=b.walls.filter(w=>w.front);
      expect(fronts.length,b.id).toBeLessThanOrEqual(1);
      for(const w of fronts)expect(w.facesRoad,b.id).toBe(true);
      if(b.walls.some(w=>w.facesRoad&&Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z)>=2.5)){facing++;expect(fronts.length,b.id).toBe(1)}
    }
    expect(facing).toBeGreaterThan(500);
  });
  it('only homes have fronts, and each has a door colour',()=>{
    for(const b of town.buildings){
      if(b.use!=='residential')expect(b.walls.some(w=>w.front),b.id).toBe(false);
      expect(b.doorColour).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
