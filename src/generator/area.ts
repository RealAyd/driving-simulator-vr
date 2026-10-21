import {parseLocation,parseScenario,type Location,type Scenario} from '../contracts';
import {buildCentre,centreBbox} from './buildCentre.js';

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
}
export interface BuiltArea{location:Location;scenario:Scenario;summary:string}

const OSM_API='https://api.openstreetmap.org/api/0.6/map';
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'area';

/** Downloads the map data (smaller squares where the map is too dense for one call) and builds the area. */
export async function buildArea(request:AreaRequest,progress:(step:string)=>void=()=>{},fetcher:typeof fetch=fetch.bind(globalThis)):Promise<BuiltArea>{
  let xml:string|null=null,half=350;
  // Map data already downloaded on this device is reused (Cache Storage): a second drive there starts at once.
  const cache=await (globalThis as {caches?:CacheStorage}).caches?.open('driving-practice-osm').catch(()=>null)??null;
  for(const size of [350,250,180]){
    half=size;
    const url=`${OSM_API}?bbox=${centreBbox(request.lat,request.lon,size).join(',')}`;
    const cached=await cache?.match(url).catch(()=>undefined);
    if(cached){xml=await cached.text();break}
    progress('Downloading map data…');
    const response=await fetcher(url);
    // 400: more than the API's 50 000 nodes in the square (a city centre): try a smaller one.
    if(response.status===400)continue;
    if(!response.ok)throw new Error(`OpenStreetMap did not answer (HTTP ${response.status}). Try again in a minute.`);
    xml=await response.text();
    void cache?.put(url,new Response(xml,{headers:{'content-type':'text/xml'}})).catch(()=>{});
    break;
  }
  if(!xml)throw new Error('The map is too dense here to download in one go.');
  progress('Building the streets…');
  // Let the message show before the (synchronous) generator runs.
  await new Promise(r=>setTimeout(r,30));
  const id=`area-${slug(request.label)}`;
  const {location:raw,summary}=buildCentre({xml,id,name:request.label,lat:request.lat,lon:request.lon,half});
  const location=parseLocation(raw);
  const scenario=parseScenario({
    schemaVersion:1,id:`${id}-free-drive`,locationId:id,
    title:`${request.label} (free drive)`,
    learningObjective:`Practise driving the streets ${request.testCentre?'round the test centre':'here'}: junctions, crossings, bus stops and parked cars, at your own pace.`,
    briefing:`${request.label}\n\nDrive anywhere you like in the ${(2*half/1000).toFixed(1)} km square round ${request.testCentre?'the test centre':'this point'}, keeping to the left and to the speed limits.\n\nThere is no set route and nothing is scored. The drive ends after ten minutes, if you leave the road or if you hit something.\n\nBuilt just now from OpenStreetMap data: roads, crossings and mapped buildings follow the map; houses where the map has none are typical terraces, and the ground is flat. It is not an official test route.`,
    rubricId:'none',
    controllerDriving:{assistedSpeedMph:25,accelerationLimit:1.5},
    end:{completeAfterSeconds:600,timeLimitSeconds:660}
  });
  return {location,scenario,summary};
}

/** A UK postcode (full), e.g. "IG3 9QJ". */
export const isPostcode=(s:string)=>/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(s.trim());
/** The start of a postcode ("IG3", "IG3 9"). */
export const isPartialPostcode=(s:string)=>/^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]?)?$/i.test(s.trim());
