import {it} from 'vitest';
import {gunzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {careful} from './careful';
it('diag',()=>{
  const out:string[]=[];
  for(const c of (process.env.C??'aylesbury').split(',')){
  const l=parseLocation(JSON.parse(gunzipSync(readFileSync(`public/centres/${c}.json.gz`)).toString()).location);
  const net=new RoadNetwork(l);
  const r=careful(l,net,1,3000);
  out.push(`== ${c} outcome ${r.result.outcome} parked ${r.parkedOk}`);
  out.push(...r.result.findings.filter(f=>f.severity!=='info').map(f=>f.ruleId+' '+f.explanation.slice(0,140)));
  out.push(...r.events.filter(e=>/direction|finding|redirect|pull|manoeuvre/.test(e.type)).map(e=>`${e.time.toFixed(1)} ${e.type} ${JSON.stringify(e.payload).slice(0,110)}`));
  out.push(...r.steps.map((s,i)=>`${i} ${s.distance.toFixed(0)} ${s.kind} ${s.say} [${s.from.road.name??s.from.road.id}->${s.to.road.name??s.to.road.id}] at ${s.at.x.toFixed(0)},${s.at.z.toFixed(0)}`));
  out.push(...r.legs.map(g=>`  leg ${g.road.name??g.road.id} ${g.from.toFixed(0)}->${g.to.toFixed(0)}`));
  }
  throw new Error('D\n'+out.join('\n'));
});
