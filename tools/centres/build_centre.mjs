// A drivable location around a test centre, generated from OpenStreetMap (src/generator/buildCentre.js, which the
// app also runs on the phone for areas built on demand).
//
//   node tools/centres/build_centre.mjs <id> "<name>" <lat> <lon> [half-size-metres=450] [osm-file]
//
// Downloads the OSM API 0.6 map call for the square (or reads a saved .osm file), writes
// content/locations/<id>.json. Map data © OpenStreetMap contributors, ODbL. No dependencies (Node 22).
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildCentre,centreBbox} from '../../src/generator/buildCentre.js';

const [id,name,latArg,lonArg,halfArg='450',osmFile]=process.argv.slice(2);
if(!id||!name||!latArg||!lonArg)throw new Error('usage: build_centre.mjs <id> "<name>" <lat> <lon> [half-size] [osm-file]');
const lat=Number(latArg),lon=Number(lonArg),half=Number(halfArg);
// curl: it uses the environment's HTTPS proxy, where Node's fetch may not.
const xml=osmFile?fs.readFileSync(osmFile,'utf8')
  :execFileSync('curl',['-sS','--fail','-m','120','-A','DrivingPractice-location-builder/1.0',`https://api.openstreetmap.org/api/0.6/map?bbox=${centreBbox(lat,lon,half).join(',')}`],{encoding:'utf8',maxBuffer:256*1024*1024});
const {location,summary}=buildCentre({xml,id,name,lat,lon,half,sourceNote:osmFile?'from a saved file':'downloaded'});
fs.writeFileSync(`content/locations/${id}.json`,JSON.stringify(location,null,1)+'\n');
console.log(summary);
