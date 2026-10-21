// A drivable location around a point (a test centre, a postcode), generated from OpenStreetMap: roads (lanes,
// widths, one-way, speed limits), mini-roundabouts, zebra and signal crossings, buildings (outline, height, use,
// shop names), trees, grass/parks/car parks and bus stops, in the simulator's location format
// (src/contracts/location.ts). Pure: it takes the OSM API 0.6 map XML for the square and returns the location, so
// the same code runs in the browser (an area built on the phone) and in tools/centres/build_centre.mjs.
// Coordinates: x east, z south, metres from (lat, lon), 111 320 m per degree (as the Brentwood tools). Map data
// © OpenStreetMap contributors, ODbL. Generated, not surveyed: fidelity 'geographically-inspired', review status
// 'unreviewed'.

/** The OSM API bounding box (west,south,east,north) the generator needs for a square of `half` metres. */
export function centreBbox(lat,lon,half=450){
  const KX=111320*Math.cos(lat*Math.PI/180),KY=111320;
  return [lon-(half+60)/KX,lat-(half+60)/KY,lon+(half+60)/KX,lat+(half+60)/KY].map(v=>+v.toFixed(5));
}

/**
 * Builds the location. `xml`: the OSM API 0.6 map response for centreBbox(lat, lon, half). Returns the location
 * object and a one-line summary; throws if there is no road near the point.
 */
export function buildCentre({xml,id,name,lat:LAT,lon:LON,half:HALF=450,sourceNote='downloaded',date=new Date().toISOString().slice(0,10)}){
const KX=111320*Math.cos(LAT*Math.PI/180),KY=111320;
const xy=(lat,lon)=>({x:+((lon-LON)*KX).toFixed(2),z:+(-(lat-LAT)*KY).toFixed(2)});
const r2=v=>+v.toFixed(2);
const bbox=centreBbox(LAT,LON,HALF).join(',');

const attr=(s,k)=>{const m=s.match(new RegExp(`\\s${k}="([^"]*)"`));return m?m[1].replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'):undefined};
const tagsOf=body=>{const t={};for(const m of body.matchAll(/<tag\s[^>]*\/>/g))t[attr(m[0],'k')]=attr(m[0],'v');return t};
const nodes=new Map(),ways=[];
for(const m of xml.matchAll(/<node\s([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)){
  const a=' '+m[1];
  nodes.set(attr(a,'id'),{id:attr(a,'id'),lat:+attr(a,'lat'),lon:+attr(a,'lon'),tags:m[3]?tagsOf(m[3]):{}});
}
for(const m of xml.matchAll(/<way\s([^>]*)>([\s\S]*?)<\/way>/g)){
  ways.push({id:attr(' '+m[1],'id'),nds:[...m[2].matchAll(/<nd ref="(\d+)"/g)].map(n=>n[1]),tags:tagsOf(m[2])});
}
const P=n=>xy(n.lat,n.lon);
const inside=(p,margin=0)=>Math.abs(p.x)<=HALF+margin&&Math.abs(p.z)<=HALF+margin;

// ---- Roads ----
const DRIVEN={primary:3.5,secondary:3.3,tertiary:3.2,unclassified:3,residential:3,living_street:2.8,primary_link:3.4,secondary_link:3.2,tertiary_link:3,trunk:3.6,trunk_link:3.4};
const miniNodes=new Set([...nodes.values()].filter(n=>n.tags.highway==='mini_roundabout'&&inside(P(n))).map(n=>n.id));
const slug=s=>(s??'road').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'road';
const roads=[],roadNodes=new Map(); // road id -> node ids along it (for crossings)
for(const w of ways){
  const width=DRIVEN[w.tags.highway];
  if(!width||w.tags.area==='yes'||w.tags.access==='private')continue;
  // Split at mini-roundabouts and where the way leaves the square.
  const runs=[];let run=[];
  for(const ref of w.nds){
    const n=nodes.get(ref);if(!n)continue;
    if(!inside(P(n),30)){if(run.length>1)runs.push(run);run=[];continue}
    run.push(n);
    if(miniNodes.has(ref)&&run.length>1){runs.push(run);run=[n]}
  }
  if(run.length>1)runs.push(run);
  const oneway=w.tags.oneway==='yes'||w.tags.oneway==='1'||w.tags.junction==='roundabout';
  const lanesTag=parseInt(w.tags.lanes??'',10);
  const count=Math.min(4,Math.max(1,Number.isFinite(lanesTag)?lanesTag:oneway?1:2));
  const mph=parseInt((w.tags.maxspeed??'').replace(/[^0-9]/g,''),10);
  runs.forEach((nodesRun,k)=>{
    const roadId=`${slug(w.tags.name??w.tags.ref??w.tags.highway)}-${w.id}${runs.length>1?`-${k}`:''}`;
    const centreline=nodesRun.map(P);
    // Drop repeated points.
    const line=centreline.filter((p,i)=>i===0||Math.hypot(p.x-centreline[i-1].x,p.z-centreline[i-1].z)>.05);
    if(line.length<2)return;
    roads.push({
      id:roadId,...(w.tags.name?{name:w.tags.name}:{}),
      ...(Number.isFinite(mph)&&/mph/.test(w.tags.maxspeed??'')?{speedLimitMph:mph,speedLimitSource:`OSM way ${w.id} maxspeed`}:{}),
      oneway,centreline:line,
      lanes:{count,width:Math.min(4.5,Math.max(2.5,width))},
      surfaceHeight:0,pavementWidth:w.tags.highway==='living_street'?1.5:2,kerbHeight:.12,
      // Residential streets in the UK mostly have no centre line; through roads have a dashed one.
      markings:{centre:count>=2&&!oneway&&!['residential','living_street','unclassified'].includes(w.tags.highway)?'dashed':'none',centreFrom:0,edges:false},
      _way:w.id,_class:w.tags.highway
    });
    roadNodes.set(roadId,nodesRun.map(n=>n.id));
  });
}

// ---- Mini-roundabouts: roads end at the junction's radius ----
const RADIUS=7;
const junctions=[];
for(const ref of miniNodes){
  const c=P(nodes.get(ref));
  const entries=[];
  for(const r of roads){
    const ids=roadNodes.get(r.id);
    const atStart=ids[0]===ref,atEnd=ids.at(-1)===ref;
    if(!atStart&&!atEnd)continue;
    // Trim the end at the junction back to the radius.
    const line=atEnd?r.centreline:[...r.centreline].reverse();
    while(line.length>2&&Math.hypot(line.at(-2).x-c.x,line.at(-2).z-c.z)<RADIUS)line.pop();
    const a=line.at(-2),d=Math.hypot(a.x-c.x,a.z-c.z);
    if(d>RADIUS)line[line.length-1]={x:r2(c.x+(a.x-c.x)*RADIUS/d),z:r2(c.z+(a.z-c.z)*RADIUS/d)};
    // Traffic enters from this road unless it is one way out of the junction.
    if(!r.oneway||atEnd)entries.push(r.id);
    if(atEnd){line.push(c);r.centreline=line}else{line.push(c);r.centreline=line.reverse()}
  }
  junctions.push({id:`mini-${ref}`,kind:'mini-roundabout',position:c,radius:RADIUS,discDiameter:2.6,entries});
}

// ---- Crossings on roads ----
const alongOf=(line,p)=>{let best={d:Infinity,along:0},acc=0;
  for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1e-9;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(l*l))),q={x:a.x+dx*t,z:a.z+dz*t},d=Math.hypot(p.x-q.x,p.z-q.z);
    if(d<best.d)best={d,along:acc+l*t,point:q,dir:{x:dx/l,z:dz/l}};acc+=l}
  return {...best,length:acc};};
const crossings=[];
for(const [roadId,ids] of roadNodes){
  const road=roads.find(r=>r.id===roadId);
  for(const ref of ids){
    const n=nodes.get(ref),t=n.tags;
    if(t.highway!=='crossing'&&t.highway!=='traffic_signals'&&!t.crossing)continue;
    const kind=t.crossing==='zebra'||t.crossing_ref==='zebra'||t['crossing:markings']==='zebra'&&t.crossing==='uncontrolled'?'zebra'
      :t.crossing==='traffic_signals'||['pelican','puffin','toucan','pegasus'].includes(t.crossing_ref)?'signal':null;
    if(!kind)continue;
    const a=alongOf(road.centreline,P(n));
    if(a.along<8||a.along>a.length-8||crossings.some(c=>c.roadId===roadId&&Math.abs(c.along-a.along)<12))continue;
    crossings.push({id:`${kind}-${ref}`,roadId,kind,along:r2(a.along),width:kind==='zebra'?3.5:3,giveWayOffset:1,
      // Zig-zag length is rarely mapped: 8 marks (16 m) each side is the usual minimum-plus, an estimate.
      zigzagMarks:kind==='zebra'?Math.min(8,Math.floor((Math.min(a.along,a.length-a.along)-6)/2)):0});
  }
}

// ---- Buildings, with shops from points inside them ----
const roadDistance=p=>Math.min(...roads.map(r=>alongOf(r.centreline,p).d));
const polygonOf=w=>w.nds.map(r=>nodes.get(r)).filter(Boolean).map(P);
const insidePoly=(p,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)c=!c}return c};
const shopPoints=[...nodes.values()].filter(n=>(n.tags.shop||n.tags.amenity&&['cafe','restaurant','fast_food','pub','bank','pharmacy','post_office'].includes(n.tags.amenity))&&inside(P(n)));
const buildings=[];
for(const w of ways){
  const b=w.tags.building;
  if(!b||b==='no'||w.nds[0]!==w.nds.at(-1))continue;
  let poly=polygonOf(w).slice(0,-1);
  if(poly.length<3||!poly.every(p=>inside(p,20)))continue;
  const levelsTag=parseInt(w.tags['building:levels']??'',10);
  const shop=shopPoints.find(s=>insidePoly(P(s),poly));
  const use=w.tags.shop||shop||['retail','commercial','supermarket','kiosk'].includes(b)?'shop'
    :['house','terrace','residential','detached','semidetached_house','apartments','bungalow','flats'].includes(b)?'residential'
    :b==='office'?'office':['church','chapel','mosque','temple'].includes(b)?'church':['school','college'].includes(b)?'school'
    :['garage','garages','shed','roof','hut','carport'].includes(b)?'utility':['civic','public','hospital','train_station'].includes(b)?'civic':'other';
  const levels=Number.isFinite(levelsTag)?Math.min(20,Math.max(1,levelsTag)):use==='utility'?1:use==='shop'||b==='apartments'?3:2;
  const centre={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,z:poly.reduce((s,p)=>s+p.z,0)/poly.length};
  const near=roadDistance(centre);
  const label=(w.tags.name??shop?.tags.name??w.tags.brand??shop?.tags.brand);
  buildings.push({id:`osm-${w.id}`,footprint:poly.map(p=>({x:r2(p.x),z:r2(p.z)})),
    height:r2(Math.min(60,levels*3+(use==='residential'?1.4:.6))),levels,
    heightSource:Number.isFinite(levelsTag)?'map-levels':'estimated',use,
    ...(label?{name:label}:{}),source:'map',
    roof:use==='residential'&&poly.length===4?'pitched':'flat',detail:near>70?'low':'full'});
}

// ---- Trees, areas, bus stops ----
const trees=[...nodes.values()].filter(n=>n.tags.natural==='tree'&&inside(P(n))).map(n=>P(n))
  .filter(p=>roadDistance(p)>3);
const areas=[];
for(const w of ways){
  const t=w.tags;
  const kind=t.amenity==='parking'&&t.parking!=='underground'&&t.parking!=='multi-storey'?'parking'
    :t.leisure==='park'||t.landuse==='recreation_ground'||t.leisure==='playground'?'green'
    :t.landuse==='grass'||t.landuse==='village_green'||t.landuse==='meadow'||t.leisure==='common'?'grass'
    :t.leisure==='garden'||t.landuse==='allotments'?'garden':null;
  if(!kind||w.nds[0]!==w.nds.at(-1))continue;
  const poly=polygonOf(w).slice(0,-1);
  if(poly.length>=3&&poly.some(p=>inside(p)))areas.push({kind,polygon:poly.map(p=>({x:r2(p.x),z:r2(p.z)}))});
}
const furniture=[];
for(const n of nodes.values()){
  if(n.tags.highway!=='bus_stop'||!inside(P(n)))continue;
  const p=P(n);let best=null;
  for(const r of roads){const a=alongOf(r.centreline,p);if(!best||a.d<best.d)best=a}
  if(!best||best.d>15)continue;
  const facing=Math.atan2(best.point.x-p.x,-(best.point.z-p.z))*180/Math.PI;
  furniture.push({kind:'bus-stop',position:p,facingDeg:r2((facing+360)%360),source:`OSM node ${n.id}`,
    ...(n.tags.name?{name:n.tags.name}:{}),...(n.tags.local_ref?{indicator:`Stop ${n.tags.local_ref}`}:{}),shelter:n.tags.shelter==='yes'});
}

// ---- Terraces where residential streets have no mapped buildings ----
// Many residential streets have no building outlines in OSM. Along such streets, typical terraced houses
// (5.2 m wide, 9 m deep, 2 storeys, pitched roof) are placed behind a front garden, marked 'approximate'.
const halfWidth=r=>r.lanes.width*r.lanes.count/2;
const mapped=buildings.map(b=>b.footprint);
const filled=[];
const blocked=(corners,ownRoad,ownClear=1.5)=>{
  if(!corners.every(c=>inside(c)))return true;
  for(const poly of mapped)if(corners.some(c=>insidePoly(c,poly))||insidePoly(poly[0],corners))return true;
  for(const r of roads){
    const clear=halfWidth(r)+r.pavementWidth+(r===ownRoad?ownClear:2.5);
    if(corners.some(c=>alongOf(r.centreline,c).d<clear))return true;
  }
  for(const j of junctions)if(corners.some(c=>Math.hypot(c.x-j.position.x,c.z-j.position.z)<j.radius+8))return true;
  for(const a of areas)if(corners.some(c=>insidePoly(c,a.polygon)))return true;
  return false;
};
// On main roads near mapped businesses: a parade (three storeys, shops below and flats above, built up to the back of
// the pavement); each business the map has only as a point is given the nearest unit's shopfront.
const loosePoints=shopPoints.filter(s=>!buildings.some(b=>b.source==='map'&&insidePoly(P(s),b.footprint))&&s.tags.name);
for(const r of roads){
  if(!['residential','unclassified','living_street','tertiary','secondary','primary'].includes(r._class))continue;
  const main=r._class==='primary'||r._class==='secondary';
  const line=r.centreline;let acc=0;const segs=[];
  for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],l=Math.hypot(b.x-a.x,b.z-a.z);segs.push({a,b,l,from:acc});acc+=l}
  for(const side of [-1,1])for(let s0=8;s0<acc-8;){
    const seg=segs.find(g=>s0>=g.from&&s0<=g.from+g.l);if(!seg){s0+=5.4;continue}
    const t=(s0-seg.from)/seg.l,dx=(seg.b.x-seg.a.x)/seg.l,dz=(seg.b.z-seg.a.z)/seg.l;
    const rx=-dz*side,rz=dx*side; // away from the road on this side
    const at={x:seg.a.x+dx*seg.l*t,z:seg.a.z+dz*seg.l*t};
    const parade=main&&loosePoints.some(s=>Math.hypot(P(s).x-at.x,P(s).z-at.z)<60);
    const [w,d,garden]=parade?[6,11,.6]:[5.2,9,4.5];
    const off=halfWidth(r)+r.pavementWidth+garden,c={x:at.x+rx*(off+d/2),z:at.z+rz*(off+d/2)};
    const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>({x:r2(c.x+dx*u+rx*v),z:r2(c.z+dz*u+rz*v)}));
    s0+=w+.2;
    if(blocked(corners,r,parade?.4:1.5)||filled.some(f=>Math.hypot(f.c.x-c.x,f.c.z-c.z)<w-.2))continue;
    filled.push({c,corners,road:r,parade});
  }
}
const named=new Map();
for(const s of loosePoints){
  let best=null;
  for(const [i,f] of filled.entries()){const d=Math.hypot(f.c.x-P(s).x,f.c.z-P(s).z);if(d<20&&!named.has(i)&&(!best||d<best.d))best={i,d}}
  if(best)named.set(best.i,s);
}
for(const [i,f] of filled.entries()){
  const shop=named.get(i);
  buildings.push({id:`terrace-${i}`,footprint:f.corners,height:f.parade?9.6:7.4,levels:f.parade?3:2,heightSource:'estimated',
    use:shop?'shop':'residential',...(shop?{name:shop.tags.name}:{}),source:'approximate',
    evidence:shop?`business mapped only as a point (${shop.tags.name}) on ${f.road.name??f.road.id}: typical parade unit`
      :`street (${f.road.name??f.road.id}) with no mapped building outlines: typical ${f.parade?'parade with flats':'terraced house'}`,
    roof:f.parade?'flat':'pitched',detail:Math.hypot(f.c.x,f.c.z)<160?'full':'low'});
}

// ---- The edge of the area: a red barrier across each road where it leaves the square (the map data stops there) ----
const blocks=[];
for(const r of roads){
  const line=r.centreline;
  for(const [end,next] of [[line[0],line[1]],[line.at(-1),line.at(-2)]]){
    if(Math.max(Math.abs(end.x),Math.abs(end.z))<HALF-1)continue;
    // Not where another road carries on from this end (a corner or junction at the edge): only dead ends.
    if(roads.some(o=>o!==r&&alongOf(o.centreline,end).d<3))continue;
    const dx=next.x-end.x,dz=next.z-end.z,l=Math.hypot(dx,dz)||1;
    const back=Math.min(4,l*.5),at={x:r2(end.x+dx/l*back),z:r2(end.z+dz/l*back)};
    const width=r.lanes.width*r.lanes.count+2*r.pavementWidth+1;
    blocks.push({id:`edge-barrier-${blocks.length}`,kind:'wall',position:at,headingDeg:r2(((Math.atan2(dx,-dz)*180/Math.PI)+360)%360),
      size:{width:r2(width),depth:.5,height:1.1},occludes:true,colour:'#d62828'});
  }
}

// A low hedge all round, just outside the last of the map data, so no car can drive off into empty ground (where
// a road ends at a corner or junction on the edge there is no barrier across it, and the car could go straight on).
{
  let m=0;for(const r of roads)for(const p of r.centreline)m=Math.max(m,Math.abs(p.x),Math.abs(p.z));
  const at=r2(m+6),long=r2(2*at+1);
  for(const [i,[x,z,across]] of [[0,-at,true],[at,0,false],[0,at,true],[-at,0,false]].entries())
    blocks.push({id:`edge-barrier-hedge-${i}`,kind:'hedge',position:{x,z},headingDeg:0,size:{width:across?long:.8,depth:across?.8:long,height:1.4},occludes:false,colour:'#4b6b3c'});
}

// ---- Start: the left lane of the road nearest the centre, facing along it ----
let start=null;
for(const r of roads){const a=alongOf(r.centreline,{x:0,z:0});if(a.length>40&&(!start||a.d<start.a.d))start={r,a}}
if(!start)throw new Error('No road near the centre');
const {r:sr,a:sa}=start;
const along=Math.min(Math.max(sa.along,15),sa.length-25);
const at=alongOf(sr.centreline,{x:0,z:0});
const pt=(()=>{let acc=0;for(let i=1;i<sr.centreline.length;i++){const a=sr.centreline[i-1],b=sr.centreline[i],l=Math.hypot(b.x-a.x,b.z-a.z);
  if(acc+l>=along){const t=(along-acc)/l;return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/l,dz:(b.z-a.z)/l}}acc+=l}})();
// Left of travel (UK): the left lane's middle.
const lane=sr.oneway?0:sr.lanes.width/2;
const spawn={position:{x:r2(pt.x+pt.dz*lane),z:r2(pt.z-pt.dx*lane)},headingDeg:r2((Math.atan2(pt.dx,-pt.dz)*180/Math.PI+360)%360),roadId:sr.id};
void at;

const location={
  schemaVersion:2,id,name,placeName:name.replace(/ test centre.*$/i,''),
  fidelity:'geographically-inspired',drivingSide:'left',
  description:`Generated from OpenStreetMap around ${name} (${LAT.toFixed(5)}, ${LON.toFixed(5)}), ${2*HALF} m square, by src/generator/buildCentre.js. Lane widths by road class, speed limits where mapped, building heights from mapped levels or estimated from use, zebra zig-zags estimated. Not surveyed; not an official test route.`,
  sources:[{title:'OpenStreetMap',licence:'ODbL 1.0, © OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright',
    notes:`API 0.6 map call, bbox ${bbox}, ${sourceNote} ${date}.`}],
  reviewStatus:'unreviewed',
  roads:roads.map(({_way,_class,...r})=>r),
  blocks,crossings,junctions,buildings,trees,ground:'grass',areas,furniture,townLampSpacing:32,streetParking:.3,spawn
};
return {location,summary:`${id}: ${filled.length} approximate houses and parade units added (${named.size} named businesses from map points); ${roads.length} roads, ${junctions.length} mini-roundabouts, ${crossings.filter(c=>c.kind==='zebra').length} zebras, ${crossings.filter(c=>c.kind==='signal').length} signal crossings, ${buildings.length} buildings, ${trees.length} trees, ${areas.length} areas, ${furniture.length} bus stops, ${blocks.length} edge barriers; start on ${sr.name??sr.id}`};
}
