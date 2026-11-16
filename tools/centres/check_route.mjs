// Checks a decision route against ROUTE_TEMPLATE_RULES (sections 3 and 4) and its centre's evidence file:
// length, the share on confirmed and likely roads, the challenges at known junctions, spacing, and the mix.
//
//   node tools/centres/check_route.mjs <route-id> [<route-id> …] [--evidence <slug>] [--origin <lat>,<lon>]
//
// The evidence file is content/sources/pass2/<slug>-evidence.json (slug: the route id without its "-N"). Known
// junctions are placed with the scene's origin, from the scene file (build_scene.mjs records it) or --origin.
// Exits 1 when a rule is not met, so it can gate a build; the challenge types are worked out from the scene and
// printed, for the author to check.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {createServer} from 'vite';

const args=process.argv.slice(2);
const opt=k=>{const i=args.indexOf(k);return i<0?null:args.splice(i,2)[1]};
const evidenceArg=opt('--evidence'),originArg=opt('--origin');
if(!args.length){console.error('Usage: node tools/centres/check_route.mjs <route-id> [...] [--evidence <slug>] [--origin <lat>,<lon>]');process.exit(2)}

const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const {DECISION_ROUTES}=await vite.ssrLoadModule('/src/decision/routes/index.ts');
const {loadScene}=await vite.ssrLoadModule('/tests/unit/decisionDrive.ts');
const {decisionPath}=await vite.ssrLoadModule('/src/decision/plan.ts');
const {roundaboutRings}=await vite.ssrLoadModule('/src/world/roundabouts.ts');
// (Kept open to the end: the drive harness loads node modules as it goes.)

const SPACING=300,KNOWN_NEAR=60,FEATURE_NEAR=35,SNAP=250;
const MIX=['lights','roundabout','mini-roundabout','emerging-left','emerging-right','right-turn','crossing','pull-up','move-off'];
// (Road numbers dropped, A52 Somerby Hill is the map's Somerby Hill; and spellings that vary, Dyke and Dike.)
const norm=s=>s.toLowerCase().replace(/\(.*?\)/g,'').replace(/\b[abm]\d+[a-z]?\b/g,'').replace(/\bdyke\b/g,'dike').replace(/[’']/g,'').replace(/\b(the|road|rd|avenue|ave|street|st|lane|ln|drive|dr|close|way|hill|gardens|crescent)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Distance along a path of the point closest to p, and how far off it is. */
function along(path,p){
  let best={s:0,d:Infinity},acc=0;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1e-9;
    const t=Math.max(0,Math.min(l,((p.x-a.x)*dx+(p.z-a.z)*dz)/l));
    const d=Math.hypot(a.x+dx/l*t-p.x,a.z+dz/l*t-p.z);
    if(d<best.d)best={s:acc+t,d};
    acc+=l;
  }
  return best;
}
/** The road a point of the path is on: the nearest centreline. */
function roadAt(roads,p){
  let best=null,bd=Infinity;
  for(const r of roads){const c=r.centreline;
    for(let i=1;i<c.length;i++){const a=c[i-1],b=c[i];if(Math.abs(a.x-p.x)>80&&Math.abs(b.x-p.x)>80)continue;
      const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1e-9,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2));
      const d=Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z);if(d<bd){bd=d;best=r}}}
  return best;
}

let failed=false;
const usedKnown=new Map();
for(const id of args){
  const route=DECISION_ROUTES.find(r=>r.id===id);
  if(!route){console.error(`No route ${id} in src/decision/routes/index.ts`);failed=true;continue}
  const slug=evidenceArg??id.replace(/-\d+$/,'');
  const evFile=`content/sources/pass2/${slug}-evidence.json`;
  const ev=fs.existsSync(evFile)?JSON.parse(fs.readFileSync(evFile,'utf8')):null;
  const pack=JSON.parse(zlib.gunzipSync(fs.readFileSync(`public/scenes/${route.scene}.json.gz`)).toString());
  const origin=originArg?(([lat,lon])=>({lat,lon}))(originArg.split(',').map(Number)):pack.origin??null;
  const {place,keepClear}=await loadScene(route);
  const path=decisionPath(place,route,keepClear);
  if(!path){console.log(`${id}: the route cannot be planned`);failed=true;continue}
  const problems=[];

  // Length, and the share on the evidence's confirmed and likely roads (by OSM way, or by name).
  const roads=ev?ev.places.filter(p=>p.kind==='road'&&(p.confidence==='confirmed'||p.confidence==='likely')):[];
  const wayIds=new Set(roads.map(p=>p.map?.osm?.replace('way/','')).filter(Boolean));
  const names=new Set(roads.flatMap(p=>p.name.replace(/\(.*?\)/g,'').split(/\/|,| and /)).map(norm).filter(Boolean));
  const byName=new Map();let total=0,onEvidence=0;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],l=dist(a,b),r=roadAt(place.roads,{x:(a.x+b.x)/2,z:(a.z+b.z)/2});
    total+=l;const name=r?.name??r?.id??'?';byName.set(name,(byName.get(name)??0)+l);
    if(r&&(wayIds.has(String(r.id).split('-').at(-1))||(r.name&&names.has(norm(r.name)))))onEvidence+=l;
  }
  const share=total?onEvidence/total:0;
  console.log(`\n${id} (${route.title}): ${(total/1000).toFixed(1)} km`);
  if(ev){console.log(`  On confirmed or likely roads: ${Math.round(share*100)}%`);if(share<=.5)problems.push('half or less of the length is on confirmed or likely roads')}
  else console.log(`  No evidence file (${evFile}): map-only, to be reviewed by a person`);
  console.log('  Roads: '+[...byName].sort((x,y)=>y[1]-x[1]).slice(0,8).map(([n,l])=>`${n} ${Math.round(l)} m`).join(', '));

  const rings=roundaboutRings(place);
  // Each challenge: where along the route, its type (from the scene), and the known junction it is at.
  const junctionsKnown=ev&&origin?ev.places.filter(p=>p.kind!=='road'&&p.map?.lat).map(p=>{
    const KX=111320*Math.cos(origin.lat*Math.PI/180);
    const q={name:p.name,confidence:p.confidence,x:(p.map.lon-origin.lon)*KX,z:-(p.map.lat-origin.lat)*111320};
    // (A roundabout or mini-roundabout is often recorded at a point on one of its roads: put at the one in the scene.)
    const like=p.kind==='mini-roundabout'?place.junctions.filter(j=>j.kind==='mini-roundabout').map(j=>j.position)
      :p.kind==='roundabout'?rings.map(g=>g.position):[];
    const snap=like.map(v=>({v,d:dist(v,q)})).sort((a,b)=>a.d-b.d)[0];
    return snap&&snap.d<SNAP?{...q,x:snap.v.x,z:snap.v.z}:q;
  }):null;
  if(ev&&!origin)console.log('  (No scene origin: known junctions not placed. Rebuild the scene, or pass --origin.)');
  /** The kinds in the mix a challenge counts for: from its title (as authors write them), else from the scene. */
  const typesOf=c=>{
    const t=c.title.toLowerCase(),out=new Set(),ids=new Set(c.stages.map(s=>s.id)),at=c.instructAt,end=c.endAt;
    const near=(q,r)=>dist(q,at)<r||dist(q,end)<r||Object.values(c.place).some(sp=>sp?.pause?.at&&dist(q,sp.pause.at)<r);
    if(/pulling up|pull up/.test(t)||ids.has('stopped'))out.add('pull-up');
    if(/moving off|move off/.test(t)||ids.has('check'))out.add('move-off');
    if(/mini-roundabout/.test(t))out.add('mini-roundabout');
    else if(/roundabout/.test(t))out.add('roundabout');
    if(/traffic lights/.test(t)||c.lights)out.add('lights');
    if(/emerging/.test(t))out.add(`emerging-${/right/.test(t)?'right':'left'}`);
    else if(/right turn|turning right|turn right/.test(t)&&!/roundabout/.test(t))out.add('right-turn');
    if(/zebra|pedestrian crossing/.test(t))out.add('crossing');
    if(!out.size){
      if(rings.some(g=>near(g.position,g.reach+FEATURE_NEAR)))out.add('roundabout');
      else if(place.junctions.some(j=>j.kind==='mini-roundabout'&&near(j.position,FEATURE_NEAR)))out.add('mini-roundabout');
      else if(ids.has('line')&&c.turn)out.add(`emerging-${c.turn}`);
      else if(ids.has('centre')&&c.turn==='right')out.add('right-turn');
    }
    return [...out];
  };
  let lastS=null,lastType=null,known=0;
  const types=[];
  route.challenges.forEach((c,i)=>{
    const s=along(path,c.instructAt).s,kinds=typesOf(c),type=kinds.join('+')||'other';types.push(...kinds);
    const k=junctionsKnown?.map(j=>({j,d:Math.min(dist(j,c.instructAt),dist(j,c.endAt),...Object.values(c.place).filter(sp=>sp?.pause?.at).map(sp=>dist(j,sp.pause.at)))})).sort((a,b)=>a.d-b.d)[0];
    const at=k&&k.d<KNOWN_NEAR?k.j:null;
    if(at){known++;usedKnown.set(at.name,(usedKnown.get(at.name)??[]).concat(id))}
    const gap=lastS===null?null:s-lastS;
    const pair=lastType?.includes('pull-up')&&kinds.includes('move-off');
    if(gap!==null&&gap<SPACING&&!pair)problems.push(`challenges ${i} and ${i+1} are ${Math.round(gap)} m apart (under ${SPACING} m)`);
    console.log(`  ${i+1}. ${c.id.padEnd(28)} ${type.padEnd(22)} ${String(Math.round(s)).padStart(5)} m${gap===null?'':` (+${Math.round(gap)})`}${at?`  at ${at.name}`:''}`);
    lastS=s;lastType=type;
  });
  if(route.challenges.length!==8)problems.push(`${route.challenges.length} challenges, not 8`);
  if(junctionsKnown){console.log(`  At known junctions: ${known} of ${route.challenges.length}`);if(known<3)problems.push(`${known} of 8 at known junctions (at least 3)`)}
  const missing=MIX.filter(m=>!types.includes(m));
  if(missing.length)console.log(`  Mix: not on this route: ${missing.join(', ')} (allowed where the area lacks one, or the centre's other route has it; say so in ROUTES.md)`);
  for(const p of problems)console.log(`  NOT MET: ${p}`);
  if(problems.length)failed=true;
}
if(usedKnown.size)console.log(`\nKnown junctions used: ${[...usedKnown].map(([n,r])=>`${n} (${[...new Set(r)].join(', ')})`).join('; ')}`);
await vite.close();
process.exit(failed?1:0);
