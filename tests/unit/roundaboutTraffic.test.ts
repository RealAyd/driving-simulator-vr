import {describe,expect,it} from 'vitest';
import {loadCentre} from './trafficDrive';
import {driveRing} from './ringTraffic';
import {layoutRoundabouts} from '../../src/world/roundaboutLayout';
import {roundaboutRings} from '../../src/world/roundabouts';
import {insidePolygon,layoutTownscape} from '../../src/world/townscape';
import {layoutSignage} from '../../src/world/signage';
import {layoutCrowd,personPose} from '../../src/world/crowd';
import {roadHalfWidth,sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import {junctionMouths,mouthLane,mouthLinePoint} from '../../src/world/junctionControls';

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
      // (At least one on every 25 s; a small roundabout with few roads to it, as Dorchester's, has fewer once traffic no
      // longer turns back round at a split carriageway nearby to come on again.)
      expect(r.entries,at).toBeGreaterThanOrEqual(10);
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

  it('no house in the middle of a roundabout; a loop round a building the map has is no roundabout',async()=>{
    // (The owner's report from Currie: the area builder had lined Riccarton Mains Road's island with terraced houses.)
    for(const id of ['edinburgh-currie','coleraine','chadderton']){
      const loc=await loadCentre(id);
      const inside=roundaboutRings(loc).flatMap(g=>{const line=[...g.roads].flatMap(r=>r.centreline);return loc.buildings.filter(b=>b.footprint.some(p=>insidePolygon(p,line)))});
      expect(inside.map(b=>b.id),id).toEqual([]);
    }
    // Inveraray's Church Square goes one way round the church; Tunbridge Wells's one-way system round a block.
    for(const [id,name] of [['inveraray','Church Square'],['tunbridge-wells','Upper Grosvenor Road']] as const){
      const loc=await loadCentre(id);
      expect(roundaboutRings(loc).some(g=>[...g.roads].some(r=>r.name===name)),id).toBe(false);
    }
  },300_000);

  it('give way lines along the roundabout\'s edge, right across each way in',async()=>{
    // (The owner's report from Chichester: the line stopped short of the car and slanted across part of Arundel Road,
    // placed as at a side road, a set distance back from where the map's roads meet.)
    for(const id of ['chichester','northampton','edinburgh-currie']){
      const loc=await loadCentre(id),mouths=junctionMouths(loc);
      for(const g of roundaboutRings(loc)){
        const half=roadHalfWidth([...g.roads][0]!),edge=(p:{x:number;z:number})=>Math.min(...[...g.roads].map(r=>sampleRoad(r,p.x,p.z).distance))-half;
        const ways=loc.roads.filter(r=>!g.roads.has(r)&&Math.hypot(r.centreline.at(-1)!.x-g.position.x,r.centreline.at(-1)!.z-g.position.z)<g.reach+4);
        const lined=mouths.filter(m=>m.atEnd&&ways.includes(m.road));
        expect(lined.length,id).toBeGreaterThanOrEqual(ways.length-1);
        for(const m of lined){
          const [from,to]=mouthLane(m);
          for(const l of [from+.3,(from+to)/2,to-.3]){const d=edge(mouthLinePoint(m,0,l));expect(d,`${id} ${m.id}`).toBeGreaterThan(-.5);expect(d,`${id} ${m.id}`).toBeLessThan(1)}
        }
      }
    }
  },300_000);

  it('no pavement round the island, and nobody walking on it',async()=>{
    // (Llantrisant had a walker going round its island on a pavement that was not drawn.)
    for(const id of ['llantrisant','edinburgh-currie']){
      const loc=await loadCentre(id),lay=layoutTownscape(loc)!;
      for(const g of roundaboutRings(loc))for(const r of g.roads){
        // A metre in from the inner kerb, halfway along each piece of the ring: the island, not the ring's pavement.
        const k=Math.floor((r.centreline.length-1)/2),a=r.centreline[k]!,b=r.centreline[k+1]!,m={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
        const d=Math.hypot(m.x-g.position.x,m.z-g.position.z),inward=(roadHalfWidth(r)+1)/d;
        const at=surfaceAt(loc,m.x+(g.position.x-m.x)*inward,m.z+(g.position.z-m.z)*inward);
        expect(at?.kind==='pavement'&&[...g.roads].some(q=>q.id===at.roadId),`${id} ${r.id}`).toBe(false);
      }
      const lines=roundaboutRings(loc).map(g=>[...g.roads].flatMap(r=>r.centreline));
      const onIsland=layoutCrowd(loc,lay,layoutSignage(loc,lay)).filter(q=>{const at=personPose(q,0);return lines.some(l=>insidePolygon(at,l))});
      expect(onIsland.map(q=>q.id),id).toEqual([]);
    }
  },300_000);
});
