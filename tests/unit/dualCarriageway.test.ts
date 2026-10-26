import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {centralReservations} from '../../src/world/dualCarriageway';
import {pavementWidthAt} from '../../src/world/roadGeometry';

const node=(m:string)=>import(/* @vite-ignore */ m);

// The owner's report (Basildon, Cranes Farm Road): a pale paved strip down the middle of a dual carriageway, where
// each half's inner pavement met. The middle is a central reservation: no pavement on the side facing the other half.
describe('dual carriageways',()=>{
  it('have no pavement down the middle; the outer pavements and two-way roads are as they were',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
    const loc=parseLocation(JSON.parse(gunzipSync(readFileSync('public/centres/basildon.json.gz')).toString()).location);
    const before=new Map(loc.roads.map(r=>[r.id,r.pavementWidth]));
    centralReservations(loc);
    const east=loc.roads.find(r=>r.id==='cranes-farm-road-520500112')!,west=loc.roads.find(r=>r.id==='cranes-farm-road-25286183')!;
    for(const r of [east,west]){
      expect(pavementWidthAt(r,60,1),`${r.id} inner side`).toBe(0);
      expect(pavementWidthAt(r,60,-1),`${r.id} outer side`).toBe(before.get(r.id));
    }
    for(const r of loc.roads.filter(r=>!r.oneway))expect(r.pavementProfile?.some(p=>p.right===0&&r.pavementWidth>0)??false).toBe(false);
  });
});
