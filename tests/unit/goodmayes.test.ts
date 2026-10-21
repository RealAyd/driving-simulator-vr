import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {layoutTownscape} from '../../src/world/townscape';
import {surfaceAt} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

// Goodmayes is generated from OpenStreetMap (tools/centres/build_centre.mjs): mapped roads and buildings, and
// approximate houses and parades where the map has no outlines.
const goodmayes=parseLocation(goodmayesJson);

describe('Goodmayes (generated from map data)',()=>{
  it('starts on a carriageway; every building is either mapped or marked approximate',()=>{
    const s=goodmayes.spawn.position;
    expect(surfaceAt(goodmayes,s.x,s.z)?.kind).toBe('carriageway');
    for(const b of goodmayes.buildings)expect(['map','approximate']).toContain(b.source);
  });
  it('businesses the map has only as points get a shopfront facing the road, with their name',()=>{
    const named=goodmayes.buildings.filter(b=>b.source==='approximate'&&b.use==='shop');
    expect(named.length).toBeGreaterThan(8);
    const town=layoutTownscape(goodmayes)!.town!;
    let fronts=0;
    for(const b of named){
      const t=town.buildings.find(x=>x.id===b.id)!;
      expect(t.name).toBe(b.name);
      if(t.walls.some(w=>w.shopfront))fronts++;
    }
    expect(fronts/named.length).toBeGreaterThan(.7);
  },60_000);
});
