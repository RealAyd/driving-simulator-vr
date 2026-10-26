import {parseLocation,parseScenario,type Location,type Scenario} from '../contracts';
import {buildCentre,centreBbox} from './buildCentre.js';
import {versioned} from '../assets/versioned';

/**
 * Areas built on the phone: the OpenStreetMap data round a point (a test centre from the list, a postcode, a
 * place) is downloaded from the OSM API and turned into a location by the same generator as the bundled centres,
 * with a free-drive exercise there. Real ground heights are not available in the browser yet (the elevation tiles
 * cannot be read across origins), so these areas are flat.
 */

export interface AreaRequest{
  /** What the learner chose, as shown ("Goodmayes test centre", "IG3 9QJ"). */
  label:string;
  lat:number;lon:number;
  /** A test centre: the drive starts near it and the briefing says so. */
  testCentre?:boolean;
  /** The test centre's name in the list (its streets may have been built in advance). */
  centre?:string;
}
export interface BuiltArea{location:Location;scenario:Scenario;mockTest:Scenario;lesson:Scenario;summary:string}

const OSM_API='https://api.openstreetmap.org/api/0.6/map';
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'area';

/**
 * A test centre's streets built in advance (tools/centres/build_all.mjs), served gzipped beside the app: one small
 * download and no building on the phone. Areas not built in advance (postcodes, places) are built from the OSM API.
 */
export interface CentrePack{version:1;centre:string;half:number;date:string;summary:string;location:unknown}
/** The file a test centre's pack is served as (under centres/). */
export const centreFile=(centre:string)=>`${slug(centre)}.json.gz`;

/** Rounds coordinates and sizes to the centimetre (smaller files; nothing in a street needs finer). */
export function packCentre(centre:string,half:number,date:string,summary:string,location:unknown):string{
  return JSON.stringify({version:1,centre,half,date,summary,location} satisfies CentrePack,(_,v)=>typeof v==='number'&&!Number.isInteger(v)?Math.round(v*100)/100:v);
}

/** A test centre's pack, if it was built in advance and this browser can unpack it (null: build it here). */
async function loadPack(centre:string,fetcher:typeof fetch):Promise<CentrePack|null>{
  const Stream=(globalThis as {DecompressionStream?:typeof DecompressionStream}).DecompressionStream;
  if(!Stream)return null;
  try{
    const r=await fetcher(versioned(`centres/${centreFile(centre)}`));
    if(!r.ok)return null;
    // Gzipped as stored; some servers unzip it on the way (Content-Encoding), then it is the JSON already.
    const bytes=new Uint8Array(await r.arrayBuffer());
    const zipped=bytes[0]===0x1f&&bytes[1]===0x8b;
    const text=zipped?await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('gzip'))).text():new TextDecoder().decode(bytes);
    const pack=JSON.parse(text) as CentrePack;
    return pack.version===1&&pack.centre===centre?pack:null;
  }catch{return null}
}

/** Downloads the map data (smaller squares where the map is too dense for one call). */
export async function downloadArea(lat:number,lon:number,fetcher:typeof fetch=fetch.bind(globalThis),progress:(step:string,percent:number)=>void=()=>{}):Promise<{xml:string;half:number}>{
  // Map data already downloaded on this device is reused (Cache Storage): a second drive there starts at once.
  const cache=await (globalThis as {caches?:CacheStorage}).caches?.open('driving-practice-osm').catch(()=>null)??null;
  for(const size of [350,250,180]){
    const url=`${OSM_API}?bbox=${centreBbox(lat,lon,size).join(',')}`;
    const cached=await cache?.match(url).catch(()=>undefined);
    if(cached)return {xml:await cached.text(),half:size};
    progress('Downloading map data…',10);
    const response=await fetcher(url);
    // 400: more than the API's 50 000 nodes in the square (a city centre): try a smaller one.
    if(response.status===400)continue;
    if(!response.ok)throw new Error(`OpenStreetMap did not answer (HTTP ${response.status}). Try again in a minute.`);
    const xml=await response.text();
    void cache?.put(url,new Response(xml,{headers:{'content-type':'text/xml'}})).catch(()=>{});
    return {xml,half:size};
  }
  throw new Error('The map is too dense here to download in one go.');
}

/** The location built from map data (what a pack holds, and what the phone builds where there is none). */
export function locationFromMap(request:AreaRequest,xml:string,half:number){
  return buildCentre({xml,id:`area-${slug(request.label)}`,name:request.label,lat:request.lat,lon:request.lon,half});
}

/** Builds the area: a test centre's pack where there is one, otherwise from the OSM API on the phone. */
/** `progress` gets each step with the percent done (0–100). */
export async function buildArea(request:AreaRequest,progress:(step:string,percent:number)=>void=()=>{},fetcher:typeof fetch=fetch.bind(globalThis)):Promise<BuiltArea>{
  const id=`area-${slug(request.label)}`;
  progress('Getting the streets…',5);
  const pack=request.centre?await loadPack(request.centre,fetcher):null;
  let raw:unknown,summary:string,half:number,built:string;
  if(pack){({location:raw,summary,half}=pack);built=`Built from OpenStreetMap data (${pack.date})`}
  else{
    const map=await downloadArea(request.lat,request.lon,fetcher,progress);
    half=map.half;
    progress('Building the streets…',55);
    // Let the message show before the (synchronous) generator runs.
    await new Promise(r=>setTimeout(r,30));
    ({location:raw,summary}=locationFromMap(request,map.xml,half));
    built='Built just now from OpenStreetMap data';
  }
  const location=parseLocation(raw);
  const scenario=parseScenario({
    schemaVersion:1,id:`${id}-free-drive`,locationId:id,
    title:`${request.label} (free drive)`,
    learningObjective:`Practise driving the streets ${request.testCentre?'round the test centre':'here'}: junctions, crossings, bus stops and parked cars, at your own pace.`,
    briefing:`${request.label}\n\nDrive anywhere you like in the ${(2*half/1000).toFixed(1)} km square round ${request.testCentre?'the test centre':'this point'}, keeping to the left and to the speed limits.\n\nThere is no set route and nothing is scored. The drive ends after ten minutes, if you leave the road or if you hit something.\n\n${built}: roads, crossings and mapped buildings follow the map; houses where the map has none are typical terraces, and the ground is flat. It is not an official test route.`,
    rubricId:'none',
    controllerDriving:{assistedSpeedMph:25,accelerationLimit:1.5},
    end:{completeAfterSeconds:600,timeLimitSeconds:660}
  });
  const mockTest=parseScenario({
    schemaVersion:1,id:`${id}-mock-test`,locationId:id,
    title:`${request.label} (mock test)`,
    learningObjective:'A mock driving test: follow the examiner\'s directions for 10, 20 or 40 minutes (the level chosen on the home screen), driving as you would on test. Every fault is marked, as on the DVSA marking sheet; the result comes at the end.',
    briefing:`${request.label}: mock test\n\nThe examiner will ask you to follow the road ahead unless traffic signs direct you otherwise, and give you directions in good time: listen for them (they are shown on screen too; Task repeats the last one).\n\nCheck your mirrors and signal for every turn, keep to the speed limit and keep left. If you go a different way, that is fine: the examiner gives new directions. At the end you will be asked to pull up on the left.\n\nMarking: driving, serious and dangerous faults under the marking sheet's headings; up to 15 driving faults and no serious or dangerous fault is a pass. Nothing stops the test early: a collision is marked as a dangerous fault and you carry on (select reverse to back away if you need to). The report comes at the end.\n\nBuilt from OpenStreetMap data; not an official test route. Draft marking, not reviewed by an examiner.`,
    rubricId:'mock-test',
    controllerDriving:{assistedSpeedMph:25,accelerationLimit:1.5},
    end:{timeLimitSeconds:900}
  });
  const lesson=parseScenario({
    schemaVersion:1,id:`${id}-lesson`,locationId:id,
    title:`${request.label} (lesson)`,
    learningObjective:'Driving lessons on these streets: one topic at a time, with an instructor who coaches you as you drive.',
    briefing:`${request.label}: lessons\n\nChoose a lesson. Your instructor explains it first, gives directions as you drive, reminds you when something is not yet done (mirrors, signal, speed, position, giving way) and tells you how each junction went. At the end you get a lesson report: what went well and what to work on. There is no pass or fail.\n\nBuilt from OpenStreetMap data; not an official test route. Draft lessons, not reviewed by an approved driving instructor.`,
    rubricId:'lesson',
    controllerDriving:{assistedSpeedMph:25,accelerationLimit:1.5},
    end:{timeLimitSeconds:900}
  });
  progress('Streets built',100);
  return {location,scenario,mockTest,lesson,summary};
}

/** A UK postcode (full), e.g. "IG3 9QJ". */
export const isPostcode=(s:string)=>/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(s.trim());
/** The start of a postcode ("IG3", "IG3 9"). */
export const isPartialPostcode=(s:string)=>/^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]?)?$/i.test(s.trim());
