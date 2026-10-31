import {expect,it} from 'vitest';
import {gunzipSync} from 'node:zlib';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {parseLocation} from '../../src/contracts';
import {prepareRoundabouts} from '../../src/world/roundabouts';
import {centralReservations} from '../../src/world/dualCarriageway';
import {auditRoute,type Issue} from './assistAudit';

/**
 * Assisted steering, as a learner on a phone uses it: the examiner's mock test routes at many test centres, the
 * assistance steering, a bot on the pedals (up to the limit on the straight, slowing for the turns as a learner does,
 * the assistance's own braking for bends), no other traffic. Everything the car does wrong is recorded: a wheel over
 * the kerb, touching a parked car, wall, lamp post or sign, straying from the path, weaving, not getting to the end.
 * Writes ASSIST_REPORT (default assist-report.json). ASSIST_ONLY=<part of a centre's id> for one centre; ASSIST_EVERY=n
 * for every n-th centre (default 5); ASSIST_TURN=<m/s> the speed for turns (default 4.5: a learner's; 7 is brisk).
 */
const DIR='public/centres';
const SEEDS=[1,2,3];

it('assisted steering along mock test routes at many centres',()=>{
  if(process.env.ZZ_M)(globalThis as {ZZ_M?:number[]}).ZZ_M=process.env.ZZ_M.split(',').map(Number);
  if(process.env.ZZ_CUT)(globalThis as {ZZ_CUT?:number}).ZZ_CUT=Number(process.env.ZZ_CUT);
  if(process.env.ZZ_K)(globalThis as {ZZ_K?:number}).ZZ_K=Number(process.env.ZZ_K);
  if(process.env.ZZ_A)(globalThis as {ZZ_A?:number[]}).ZZ_A=process.env.ZZ_A.split(',').map(Number);
  if(process.env.ZZ_C)(globalThis as {ZZ_C?:number[]}).ZZ_C=process.env.ZZ_C.split(',').map(Number);
  if(process.env.ZZ_LA)(globalThis as {ZZ_LA?:number[]}).ZZ_LA=process.env.ZZ_LA.split(',').map(Number);
  const every=Number(process.env.ASSIST_EVERY??5),turn=Number(process.env.ASSIST_TURN??4.5);
  const files=readdirSync(DIR).filter(f=>f.endsWith('.json.gz')).sort()
    .filter((f,i)=>process.env.ASSIST_ONLY?f.includes(process.env.ASSIST_ONLY):i%every===0);
  const issues:Issue[]=[];let metres=0,routes=0;
  for(const f of files){
    const centre=f.replace('.json.gz','');
    const location=parseLocation(JSON.parse(gunzipSync(readFileSync(`${DIR}/${f}`)).toString()).location);
    prepareRoundabouts(location);centralReservations(location);
    for(const seed of SEEDS){
      const r=auditRoute(location,seed,turn);
      routes++;metres+=r.metres;
      for(const i of r.issues)issues.push({centre,seed,...i});
    }
    if(process.env.ASSIST_PROGRESS)process.stderr.write(`${centre}: ${issues.filter(i=>i.centre===centre).length}\n`);
  }
  const by=(k:Issue['kind'])=>issues.filter(i=>i.kind===k).length;
  const summary={centres:files.length,routes,km:+(metres/1000).toFixed(1),turnSpeed:turn,kerb:by('kerb'),hit:by('hit'),stray:by('stray'),weave:by('weave'),stuck:by('stuck')};
  writeFileSync(process.env.ASSIST_REPORT??'assist-report.json',JSON.stringify({summary,issues},null,1));
  console.log('ASSIST',JSON.stringify(summary));
  expect(routes).toBeGreaterThan(0);
});
