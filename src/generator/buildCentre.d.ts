import type {Location} from '../contracts';

/** The OSM API bounding box (west, south, east, north) needed for a square of `half` metres round the point. */
export function centreBbox(lat:number,lon:number,half?:number):[number,number,number,number];

/** Builds a drivable location from the OSM API 0.6 map XML for centreBbox(lat, lon, half). */
export function buildCentre(options:{xml:string;id:string;name:string;lat:number;lon:number;half?:number;sourceNote?:string;date?:string}):{location:Location;summary:string};
