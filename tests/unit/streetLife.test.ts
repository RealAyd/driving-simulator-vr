import {describe,expect,it} from 'vitest';
import {parseLocation,parseScenario,type Location,type PedestrianActorDef} from '../../src/contracts';
import {layoutStreetscape} from '../../src/world/streetscape';
import {layoutTownscape} from '../../src/world/townscape';
import {layoutSignage,type SignPanel} from '../../src/world/signage';
import {appearance,layoutCrowd,personPose} from '../../src/world/crowd';
import {placeLabel} from '../../src/world/placeLabel';
import {brandSign} from '../../src/world/brandSigns';
import {pointAtAlong,roadHalfWidth,sampleRoad,surfaceAt} from '../../src/world/roadGeometry';
import {Pedestrian,onwardPath} from '../../src/actors/pedestrian';
import {EventLog} from '../../src/app/eventLog';
import {pedestrianFigure} from '../../src/actors/actorVisuals';
import brentwoodJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';
import zebraJson from '../../content/locations/representative-residential-straight.json';
import movingOffJson from '../../content/locations/residential-moving-off.json';
import kingsRoadJson from '../../content/locations/brentwood-kings-road-zebra.json';
import crossingJson from '../../content/scenarios/crossing-restricted-view.json';
import kingsRoadZebraJson from '../../content/scenarios/brentwood-kings-road-zebra.json';

const brentwood=parseLocation(brentwoodJson);
const zebra=parseLocation(zebraJson);
const movingOff=parseLocation(movingOffJson);
const kingsRoad=parseLocation(kingsRoadJson);
const dress=(l:Location)=>{
  const layout=layoutStreetscape(l)??layoutTownscape(l);
  const signs=layoutSignage(l,layout);
  return {layout,signs,crowd:layoutCrowd(l,layout,signs)};
};
const places=[['Brentwood',brentwood],['zebra crossing street',zebra],['Moving off street',movingOff],['Kings Road',kingsRoad]] as const;

describe('Location label',()=>{
  it('names the mapped street, the town and the mapped speed limit in Brentwood',()=>{
    const s=brentwood.spawn.position;
    const label=placeLabel(brentwood,s.x,s.z);
    expect(label.text).toBe('High Street · Brentwood · 20 mph');
    expect(label.title).toContain('OpenStreetMap maxspeed');
    // Wilson's Corner has no mapped limit: none is shown.
    const link=pointAtAlong(brentwood.roads.find(r=>r.id==='link-north')!,10);
    expect(placeLabel(brentwood,link.x,link.z).text).toBe("Wilson's Corner · Brentwood");
    // In a junction the label keeps the street the car came from.
    const rb1=brentwood.junctions[0]!.position;
    expect(placeLabel(brentwood,rb1.x,rb1.z,'High Street').road).toBe('High Street');
  });
  it('does not give the representative streets a real name',()=>{
    for(const l of [zebra,movingOff]){
      expect(l.placeName).toBeUndefined();
      expect(placeLabel(l,l.spawn.position.x,l.spawn.position.z).text).toBe('Practice street · representative, not a real place');
    }
  });
});

describe('Signs',()=>{
  const {layout,signs}=dress(brentwood);
  const panels=(kind:SignPanel['face']['kind'])=>signs.panels.filter(p=>p.face.kind===kind);

  it('street-name plates use only street names from the map data, one per street at each junction, on a pavement',()=>{
    const names=new Set(brentwood.roads.map(r=>r.name));
    const plates=panels('street-name');
    expect(plates.length).toBeGreaterThanOrEqual(8);
    for(const p of plates){
      if(p.face.kind!=='street-name')continue;
      expect(names.has(p.face.text)).toBe(true);
      expect(p.placement).toMatch(/^estimated/);
      for(const q of [p,...p.posts])expect(surfaceAt(brentwood,q.x,q.z)?.kind,p.id).toBe('pavement');
    }
    for(const street of ['High Street','Ingrave Road',"Wilson's Corner",'Shenfield Road','Ongar Road','Moores Place','Saint Thomas Road'])
      expect(plates.some(p=>p.face.kind==='street-name'&&p.face.text===street),street).toBe(true);
  });

  it('every mini-roundabout entry has the mini-roundabout sign on its left, facing approaching traffic',()=>{
    for(const j of brentwood.junctions)for(const roadId of j.entries){
      const sign=signs.panels.find(p=>p.id===`mini-roundabout-${j.id}-${roadId}`);
      expect(sign,`${j.id} ${roadId}`).toBeDefined();
      const road=brentwood.roads.find(r=>r.id===roadId)!;
      const s=sampleRoad(road,sign!.x,sign!.z);
      // Left of the direction of travel into the junction, on the pavement.
      const towards=Math.hypot(road.centreline.at(-1)!.x-j.position.x,road.centreline.at(-1)!.z-j.position.z)<=j.radius+2?1:-1;
      expect(Math.sign(s.lateral)*towards).toBe(-1);
      expect(surfaceAt(brentwood,sign!.x,sign!.z)?.kind).toBe('pavement');
      // Its face points back along the approach.
      expect(sign!.normal.x*s.direction.x*towards+sign!.normal.z*s.direction.z*towards).toBeLessThan(-.9);
      expect(sign!.y-sign!.height/2).toBeGreaterThanOrEqual(2.1);
    }
  });

  it('every mapped bus stop has a flag with its name and stop letter; shelters only where one is mapped',()=>{
    const flags=panels('bus-flag');
    expect(flags.length).toBe(brentwood.furniture.length);
    for(const f of brentwood.furniture){
      const flag=flags.find(p=>p.face.kind==='bus-flag'&&Math.hypot(p.posts[0]!.x-f.position.x,p.posts[0]!.z-f.position.z)<.01)!;
      expect(flag.face).toEqual({kind:'bus-flag',name:f.name,indicator:f.indicator??null});
      // Square to the traffic (face seen on approach) and high enough to clear the footway.
      expect(flag.y-flag.height/2).toBeGreaterThan(2.1);
    }
    const sheltered=layout!.town!.busStops.filter(s=>s.shelter).map(s=>`${s.id}-shelter`).sort();
    expect(signs.shelters.map(s=>s.id).sort()).toEqual(sheltered);
    expect(brentwood.furniture.find(f=>f.name==='Wilsons Corner')!.shelter).toBe(false);
    for(const s of signs.shelters)for(const a of [-1,1])for(const b of [-1,1]){
      const p={x:s.x+s.axis.x*a*s.length/2+s.back.x*b*s.depth/2,z:s.z+s.axis.z*a*s.length/2+s.back.z*b*s.depth/2};
      expect(surfaceAt(brentwood,p.x,p.z)?.kind,s.id).toBe('pavement');
    }
  });

  it('shop names come only from map data and only on shopfronts',()=>{
    const fascias=panels('fascia');
    expect(fascias.length).toBeGreaterThan(20);
    for(const p of fascias){
      const b=brentwood.buildings.find(x=>`fascia-${x.id}`===p.id)!;
      expect(p.face.kind==='fascia'&&p.face.text).toBe(b.name);
      expect(b.use).toBe('shop');
    }
  });

  it('brand sign styles apply only where the map names exactly that business',()=>{
    const branded=panels('fascia').filter(p=>p.face.kind==='fascia'&&brandSign(p.face.text));
    expect(branded.map(p=>p.face.kind==='fascia'&&p.face.text).sort()).toEqual(["KFC","McDonald's",'Tesco Express']);
    for(const p of branded)expect(brentwood.buildings.find(b=>`fascia-${b.id}`===p.id)!.name).toBe(p.face.kind==='fascia'&&p.face.text);
  });

  it('the representative streets get no invented names on plates or fascias',()=>{
    for(const l of [zebra,movingOff]){
      const {signs:s}=dress(l);
      expect(s.panels.filter(p=>p.face.kind==='street-name'||p.face.kind==='fascia')).toEqual([]);
    }
  });

  // Driver's eye on the approach to each mini-roundabout; points on traffic coming from the right.
  const panelHit=(p:SignPanel,e:[number,number,number],t:[number,number,number])=>{
    const d=[t[0]-e[0],t[1]-e[1],t[2]-e[2]];
    const den=d[0]!*p.normal.x+d[2]!*p.normal.z;
    if(Math.abs(den)<1e-9)return false;
    const k=((p.x-e[0])*p.normal.x+(p.z-e[2])*p.normal.z)/den;
    if(k<=0||k>=1)return false;
    const q=[e[0]+d[0]!*k,e[1]+d[1]!*k,e[2]+d[2]!*k];
    const r={x:p.normal.z,z:-p.normal.x};
    return Math.abs((q[0]!-p.x)*r.x+(q[2]!-p.z)*r.z)<=p.width/2&&Math.abs(q[1]!-p.y)<=p.height/2;
  };
  const lane=(id:string,along:number,lateral:number)=>{const r=brentwood.roads.find(x=>x.id===id)!;const p=pointAtAlong(r,along);return {x:p.x-p.direction.z*lateral,z:p.z+p.direction.x*lateral}};
  const len=(id:string)=>{const r=brentwood.roads.find(x=>x.id===id)!;return r.centreline.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.centreline[i]!.x,p.z-r.centreline[i]!.z),0)};
  it.each([
    {from:'high-street',to:'ingrave-in'},{from:'link-north',to:'shenfield-in'},{from:'high-street',to:'link-south'},{from:'link-north',to:'ongar-in'}
  ])('no sign panel hides traffic at the mini-roundabouts: $from approach to $to',({from,to})=>{
    let checked=0;
    for(let s=len(from)-35;s<=len(from)-6;s+=1.5)for(let u=Math.max(0,len(to)-45);u<=len(to)-4;u+=1.5){
      const eye=lane(from,s,-1.6),car=lane(to,u,-1.6);
      for(const h of [.6,1.1,1.4]){
        checked++;
        const hit=signs.panels.find(p=>panelHit(p,[eye.x,1.2,eye.z],[car.x,h,car.z]));
        expect(hit?.id,`from ${from} ${s.toFixed(1)} to ${to} ${u.toFixed(1)} at ${h} m`).toBeUndefined();
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('Background people',()=>{
  it.each(places)('%s: every position anyone reaches is on a pavement, clear of the carriageway',(_,l)=>{
    const {crowd}=dress(l);
    expect(crowd.length).toBeGreaterThan(5);
    for(const p of crowd)for(let t=0;t<=300;t+=.5){
      const pose=personPose(p,t);
      for(const [dx,dz] of [[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]]){
        const s=surfaceAt(l,pose.x+dx!,pose.z+dz!);
        expect(s?.kind,`${p.id} at ${t}s`).toBe('pavement');
      }
      expect(pose.y).toBeCloseTo(surfaceAt(l,pose.x,pose.z)!.height,5);
    }
  },60_000);

  it('keep well away from the Kings Road zebra crossing',()=>{
    const {crowd}=dress(kingsRoad);
    for(const p of crowd)for(let t=0;t<=300;t+=1){
      const q=personPose(p,t);
      expect(Math.hypot(q.x,q.z),`${p.id} at ${t}s`).toBeGreaterThan(40);
    }
  });

  it('keep away from the zebra crossing, the van that hides the pedestrian, and the crossing pedestrian',()=>{
    const {crowd}=dress(zebra);
    const c=zebra.crossings[0]!;
    const at=pointAtAlong(zebra.roads.find(r=>r.id===c.roadId)!,c.along);
    const van=zebra.blocks.find(b=>b.vehicleModel)!.position;
    const ped=parseScenario(crossingJson).actors.find(a=>a.kind==='pedestrian') as PedestrianActorDef;
    for(const p of crowd)for(let t=0;t<=300;t+=1){
      const q=personPose(p,t);
      expect(Math.hypot(q.x-at.x,q.z-at.z)).toBeGreaterThan(40);
      expect(Math.hypot(q.x-van.x,q.z-van.z)).toBeGreaterThan(18);
      expect(Math.hypot(q.x-ped.waitAt.x,q.z-ped.waitAt.z)).toBeGreaterThan(30);
    }
  });

  it('keep off the nearside pavement behind the start in Moving off (where the cyclist is watched for)',()=>{
    const {crowd}=dress(movingOff);
    const sp=movingOff.spawn.position;
    for(const p of crowd)for(let t=0;t<=300;t+=1){
      const q=personPose(p,t);
      // Heading 0 (north, −z): behind is +z, the nearside (left) is −x.
      const behind=q.z-sp.z,left=sp.x-q.x;
      expect(left>0&&behind>-15&&behind<70&&left<12,`${p.id} at ${t}s (${q.x.toFixed(1)}, ${q.z.toFixed(1)})`).toBe(false);
    }
  });

  it('wear none of the colours the mirror checks look for (yellow cyclist, purple car, red and blue parked cars), in light or shade',()=>{
    const looks=[...places.flatMap(([,l])=>dress(l).crowd.map(p=>p.look)),...Array.from({length:200},(_,i)=>appearance(i))];
    for(const look of looks)for(const c of [look.top,look.legs,look.skin,look.hair])for(const shade of [.5,.7,.85,1,1.15]){
      const [r,g,b]=c.map(v=>Math.min(255,v*shade*255)) as [number,number,number];
      expect(r>140&&g>110&&b<80&&r>=g,`yellow ${c}`).toBe(false);
      expect(r>90&&b>150&&g<90,`purple ${c}`).toBe(false);
      expect(r>110&&g<45&&b<45,`red ${c}`).toBe(false);
      expect(b>110&&r<50&&g<95&&b>g+40,`blue ${c}`).toBe(false);
    }
  });

  it('have no colliders and are not road users: scenery only',()=>{
    for(const [,l] of places){
      const {layout,signs}=dress(l);
      const ids=[...(layout?.colliders??[]),...signs.colliders].map(c=>c.id);
      expect(ids.some(id=>id.startsWith('walker')||id.startsWith('waiting'))).toBe(false);
    }
  });

  it('people wait at Brentwood bus stops',()=>{
    const {crowd,layout}=dress(brentwood);
    const stops=layout!.town!.busStops;
    const waiting=crowd.filter(p=>p.kind==='stander');
    expect(waiting.length).toBeGreaterThanOrEqual(stops.length);
    for(const p of waiting)expect(stops.some(s=>Math.hypot(s.x-personPose(p,0).x,s.z-personPose(p,0).z)<5)).toBe(true);
  });

  it('roads have room for walkers: none walks within a junction or on a side-road mouth',()=>{
    const {crowd}=dress(brentwood);
    for(const p of crowd)for(let t=0;t<=200;t+=1){
      const q=personPose(p,t);
      for(const j of brentwood.junctions)expect(Math.hypot(q.x-j.position.x,q.z-j.position.z)).toBeGreaterThan(j.radius+2.5);
      for(const r of brentwood.roads)expect(sampleRoad(r,q.x,q.z).distance).toBeGreaterThan(roadHalfWidth(r)+.3);
    }
  });
});

describe('Crossing pedestrian figure',()=>{
  it('is drawn exactly where the actor is, standing while waiting and walking only while crossing',()=>{
    const def=parseScenario(crossingJson).actors.find(a=>a.kind==='pedestrian') as PedestrianActorDef;
    const ped=new Pedestrian(def,new EventLog(()=>0));
    const figure=pedestrianFigure(ped,()=>.12);
    let pose=figure.pose(0);
    expect([pose.x,pose.z,pose.walking]).toEqual([def.waitAt.x,def.waitAt.z,false]);
    ped.requestCrossing(0);
    for(let i=0;i<60*20&&ped.state!=='crossing';i++)ped.fixedUpdate(1/60);
    for(let i=0;i<60;i++)ped.fixedUpdate(1/60);
    pose=figure.pose(0);
    expect(ped.state).toBe('crossing');
    expect([pose.x,pose.z,pose.walking]).toEqual([ped.position.x,ped.position.z,true]);
    expect(pose.stride).toBeGreaterThan(.5);
  });

  it.each([['practice zebra',crossingJson,zebra],['Kings Road',kingsRoadZebraJson,kingsRoad]] as const)('%s: after crossing, walks on along the pavement instead of standing at the kerb',(_,json,l)=>{
    const def=parseScenario(json).actors.find(a=>a.kind==='pedestrian') as PedestrianActorDef;
    const ped=new Pedestrian(def,new EventLog(()=>0));
    ped.onward=onwardPath(l,def);
    const figure=pedestrianFigure(ped,()=>0);
    ped.requestCrossing(0);
    for(let i=0;i<60*60&&ped.state!=='clear';i++){ped.fixedUpdate(1/60);figure.pose(0)}
    expect(ped.state).toBe('clear');
    let walking=0;
    for(let i=0;i<60*30;i++){
      ped.fixedUpdate(1/60);
      const pose=figure.pose(0);
      if(pose.walking)walking++;
      if(Math.hypot(ped.position.x-def.crossTo.x,ped.position.z-def.crossTo.z)>.5)
        expect(surfaceAt(l,ped.position.x,ped.position.z)?.kind,`at ${i/60}s`).toBe('pavement');
    }
    expect(Math.hypot(ped.position.x-def.crossTo.x,ped.position.z-def.crossTo.z)).toBeGreaterThan(12);
    expect(walking).toBeGreaterThan(60*10);
    expect(ped.walkingOn).toBe(false);
  });
});
