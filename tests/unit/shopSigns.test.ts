import {describe,expect,it} from 'vitest';
import {parseLocation,type Location} from '../../src/contracts';
import {layoutStreetscape} from '../../src/world/streetscape';
import {insidePolygon,layoutTownscape} from '../../src/world/townscape';
import {layoutSignage} from '../../src/world/signage';
import {brandSign,tradeFromName} from '../../src/world/brandSigns';
import {sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import goodmayesJson from '../../content/locations/goodmayes.json';

const goodmayes=parseLocation(goodmayesJson);
const signs=(l:Location)=>layoutSignage(l,layoutStreetscape(l)??layoutTownscape(l));

describe('shops and landmarks',()=>{
  const plan=signs(goodmayes);
  const byId=(id:string)=>plan.panels.find(p=>p.id===id);
  it('every named shop within sight of a road has its name up, in its chain\'s lettering where the map names a chain',()=>{
    const nearRoad=(b:Location['buildings'][number])=>b.footprint.some(p=>goodmayes.roads.some(r=>sampleRoad(r,p.x,p.z).distance<80));
    for(const b of goodmayes.buildings.filter(b=>b.use==='shop'&&b.name&&nearRoad(b))){
      const p=byId(`fascia-${b.id}`)??byId(`board-${b.id}`);
      expect(p,b.name).toBeDefined();
      expect(p!.face.kind==='fascia'||p!.face.kind==='name-board'?p!.face.text:'').toBe(brandSign(b.name!,b.brand)?.text??b.name);
    }
  });
  it('a store set back behind its car park gets a name board on the wall that faces the road',()=>{
    const tesco=goodmayes.buildings.find(b=>b.name==='Tesco Extra')!;
    const board=byId(`board-${tesco.id}`)!;
    expect(board.face).toMatchObject({kind:'name-board',text:'TESCO extra'});
    expect(board.width).toBeGreaterThan(3);
  });
  it('a chemist has a green cross projecting from its wall, on a bracket, square to the street',()=>{
    const chemist=goodmayes.buildings.find(b=>b.name==='Eden Pharmacy Ltd')!;
    expect(tradeFromName(chemist.name!)).toBe('pharmacy');
    const cross=byId(`cross-${chemist.id}`)!;
    expect(cross.face.kind).toBe('cross');
    expect(cross.bracket).toBeDefined();
    const fascia=byId(`fascia-${chemist.id}`)!;
    expect(Math.abs(cross.normal.x*fascia.normal.x+cross.normal.z*fascia.normal.z)).toBeLessThan(.05);
  });
  it('trades read from names where the map gives none',()=>{
    expect(tradeFromName('Hair Touch Barbers')).toBe('hairdresser');
    expect(tradeFromName('Goodmayes Green Lane Post Office')).toBe('post-office');
    expect(tradeFromName('The Red Lion Inn')).toBe('pub');
    expect(tradeFromName('Quatremain')).toBeNull();
  });
  it('a petrol station: a canopy off the road and clear of every building, with its chain\'s name and a board by the road',()=>{
    // A station mapped in the Tesco car park (an open space beside the road).
    const park=goodmayes.areas.filter(a=>a.kind==='parking').sort((a,b)=>b.polygon.length-a.polygon.length)[0]!;
    const c={x:park.polygon.reduce((s,p)=>s+p.x,0)/park.polygon.length,z:park.polygon.reduce((s,p)=>s+p.z,0)/park.polygon.length};
    const l:Location={...goodmayes,furniture:[...goodmayes.furniture,{kind:'fuel-station',position:c,facingDeg:0,shelter:false,brand:'BP'}]};
    const p=signs(l);
    expect(p.canopies).toHaveLength(1);
    const k=p.canopies[0]!;
    expect(k.text).toBe('bp');
    for(const a of [-1,-.5,0,.5,1])for(const s of [-1,0,1]){
      const q={x:k.x+k.axis.x*a*k.length/2+k.away.x*s*k.width/2,z:k.z+k.axis.z*a*k.length/2+k.away.z*s*k.width/2};
      expect(surfaceAt(l,q.x,q.z)?.kind).not.toBe('carriageway');
      expect(l.buildings.some(b=>insidePolygon(q,b.footprint))).toBe(false);
    }
    expect(p.panels.filter(x=>x.id.startsWith(`${k.id}-`)).map(x=>x.face.kind==='name-board'&&x.face.text)).toEqual(['bp','bp','bp']);
    expect(p.colliders.filter(x=>x.id.startsWith(`${k.id}-pump`)).length).toBe(4);
  });
});
