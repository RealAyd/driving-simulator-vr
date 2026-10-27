import {createServer,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {parseVisitEvents,sourceOf,summariseVisits,type VisitEvent} from '../src/analytics.js';
import {loadConfig} from '../src/config.js';
import {handler} from '../src/http.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

let server:Server,base='',store:MemoryStore;
const outbox=new OutboxMailer();
const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example',ADMIN_EMAILS:'boss@example.com'});
beforeAll(async()=>{
  store=new MemoryStore();
  server=createServer(handler(new Service(config,store,outbox,fakeIdentities,fakeStripe(config)),outbox));
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(()=>server.close());

/** A browser on the app's own site (signed in as `email` if given), keeping its cookies. */
async function browser(email?:string){
  const jar=new Map<string,string>();
  const call=async(path:string,body?:unknown)=>{
    const cookie=[...jar].filter(([,v])=>v).map(([k,v])=>`${k}=${v}`).join('; ');
    const res=await fetch(base+path,{method:body===undefined?'GET':'POST',
      headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:'https://staging.example'}),...(cookie?{Cookie:cookie}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    for(const c of res.headers.getSetCookie()){const kv=c.split(';')[0]!,i=kv.indexOf('=');jar.set(kv.slice(0,i),kv.slice(i+1))}
    return {status:res.status,json:await res.json() as any};
  };
  if(email)await call('/api/dev/signin',{email});
  return call;
}

const at=(min:number)=>new Date(Date.UTC(2026,9,20,9,0)+min*60_000);
const ev=(visitor:string,session:string,min:number,type:VisitEvent['type'],screen:string,more:Partial<VisitEvent>={}):VisitEvent=>({visitor,session,at:at(min),type,screen,...more});

describe('visits',()=>{
  it('keeps only well-formed events: no typed text, no strange keys, nothing older than a day',()=>{
    const now=at(0);
    const got=parseVisitEvents({visitor:'abcdefgh1234',session:'sess12345678',events:[
      {type:'open',screen:'home',data:{standalone:true,src:'tiktok',device:'phone','bad key':1,html:'<script>'}},
      {type:'click',screen:'home',target:'#start-button',ago:5000},
      {type:'click',screen:'home',target:'x'.repeat(200)},
      {type:'hack',screen:'home'},
      {type:'ping',screen:'home',ago:2*86400_000}
    ]},now,null,'GB');
    expect(got.map(e=>e.type)).toEqual(['open','click','click','ping']);
    expect(got[0]!.data).toEqual({standalone:true,src:'tiktok',device:'phone'});
    expect(got[0]!.country).toBe('GB');
    expect(got[1]!.at.getTime()).toBe(now.getTime()-5000);
    expect(got[2]!.target).toBeUndefined();
    expect(got[3]!.at.getTime()).toBe(now.getTime());
    expect(parseVisitEvents({visitor:'short',session:'sess12345678',events:[{type:'open',screen:'home'}]},now,null,null)).toEqual([]);
  });

  it('counts people who leave while the app loads (only the page\'s "landed" record), with where they came from',()=>{
    const events=[
      ev('visitorL1','sL1',0,'land','loading',{data:{inApp:'instagram',newVisitor:true}}),
      ev('visitorL2','sL2',1,'land','loading',{data:{inApp:'tiktok',newVisitor:true}}),
      ev('visitorL2','sL2',1.2,'open','home',{data:{inApp:'tiktok',newVisitor:true,device:'phone'}}),
      ev('visitorL2','sL2',3,'screen','mock tests')
    ];
    const v=summariseVisits(events,at(60),1);
    expect(v.totals).toMatchObject({visitors:2,sessions:2,leftWhileLoading:1});
    expect(v.sources.map(x=>x.source).sort()).toEqual(['instagram','tiktok']);
    expect(v.funnel.slice(0,2).map(f=>f.people)).toEqual([2,1]);
    expect(v.screens.find(x=>x.screen==='loading')).toMatchObject({views:2,exits:1});
    expect(v.daily.at(-1)).toMatchObject({visitors:2,newVisitors:2});
  });

  it('names where a visit came from',()=>{
    const open=(data:VisitEvent['data'])=>ev('v','s',0,'open','home',{data});
    expect(sourceOf(open({src:'TikTok'}))).toBe('tiktok');
    expect(sourceOf(open({referrer:'www.google.co.uk'}))).toBe('google');
    expect(sourceOf(open({referrer:'l.instagram.com'}))).toBe('instagram');
    expect(sourceOf(open({referrer:'drivingpractice.live'}))).toBe('drivingpractice.live');
    expect(sourceOf(open({ref:true}))).toBe('invite link');
    expect(sourceOf(open({inApp:'tiktok'}))).toBe('tiktok');
    expect(sourceOf(open({standalone:true}))).toBe('home screen');
    expect(sourceOf(open({}))).toBe('direct');
  });

  it('sums up people a day, sources, time, screens, presses, the way to a completed drive and coming back',()=>{
    const events=[
      // A: new, from TikTok on a phone; home, a mock test, drives it to the end, signs in; back two days later from the home screen.
      ev('visitorA1','sA1',0,'open','home',{data:{src:'tiktok',device:'phone',os:'iOS',newVisitor:true}}),
      ev('visitorA1','sA1',1,'click','home',{target:'#mode-test'}),
      ev('visitorA1','sA1',1,'screen','exercise:Mock test'),
      ev('visitorA1','sA1',2,'drive','drive:mock test',{target:'goodmayes-mock-test',data:{phase:'start'}}),
      ev('visitorA1','sA1',2,'screen','drive:mock test'),
      ev('visitorA1','sA1',20,'drive','results:mock test',{data:{phase:'end',outcome:'completed'}}),
      ev('visitorA1','sA1',20,'screen','results:mock test'),
      ev('visitorA1','sA1',21,'signin','results:mock test',{accountId:'acc1'}),
      ev('visitorA1','sA2',2*1440,'open','home',{data:{standalone:true,device:'phone',os:'iOS'}}),
      ev('visitorA1','sA2',2*1440+3,'leave','home'),
      // B: new, from Google; looks at a drive and leaves there.
      ev('visitorB1','sB1',30,'open','home',{data:{referrer:'www.google.com',device:'computer',os:'Windows',newVisitor:true}}),
      ev('visitorB1','sB1',31,'screen','exercise:Free drive'),
      ev('visitorB1','sB1',33,'ping','exercise:Free drive'),
      // C: new, direct; leaves at once.
      ev('visitorC1','sC1',40,'open','home',{data:{newVisitor:true}})
    ];
    const v=summariseVisits(events,at(9*1440),10);
    expect(v.totals).toMatchObject({visitors:3,sessions:4,homeScreen:1,bounced:1});
    const first=v.daily.find(d=>d.day==='2026-10-20')!;
    expect(first).toMatchObject({visitors:3,newVisitors:3,homeScreen:0,sessions:3,signedIn:1});
    expect(v.daily.find(d=>d.day==='2026-10-22')).toMatchObject({visitors:1,newVisitors:0,homeScreen:1});
    expect(v.sources.find(s=>s.source==='tiktok')).toMatchObject({sessions:1,startedDrive:1,completedDrive:1,signedIn:1,meanSeconds:21*60});
    expect(v.sources.find(s=>s.source==='google')).toMatchObject({sessions:1,startedDrive:0});
    expect(v.funnel.map(f=>f.people)).toEqual([3,3,2,1,1,1]);
    // Where they leave: B on the free drive's page, C and A's second visit on home.
    expect(v.screens.find(s=>s.screen==='exercise:Free drive')).toMatchObject({views:1,exits:1,meanSeconds:120});
    expect(v.screens.find(s=>s.screen==='home')!.exits).toBe(2);
    expect(v.screens.find(s=>s.screen==='drive:mock test')!.meanSeconds).toBe(18*60);
    expect(v.paths[0]).toEqual({path:'home → exercise:Mock test',n:1});
    expect(v.clicks).toEqual([{target:'home · #mode-test',n:1,visitors:1}]);
    expect(v.returning).toEqual({newVisitors:3,cameBack:1,cameBackWithinWeek:1});
  });

  it('are posted by the app (signed in or not) and read back on the admin hub only',async()=>{
    const learner=await browser();
    expect((await learner('/api/visits',{visitor:'learner00001',session:'session00001',events:[{type:'open',screen:'home',data:{newVisitor:true,src:'flyer'}},{type:'screen',screen:'places'}]})).status).toBe(200);
    expect((await learner('/api/admin/visits')).status).toBe(401);
    const boss=await browser('boss@example.com');
    const v=await boss('/api/admin/visits?days=7');
    expect(v.status).toBe(200);
    expect(v.json.totals.visitors).toBe(1);
    expect(v.json.sources[0]).toMatchObject({source:'flyer',sessions:1});
    expect(v.json.screens.map((s:{screen:string})=>s.screen)).toEqual(['home','places']);
  });

  it('drives count as completed only when they are; the overview says how the others ended',async()=>{
    const c=await browser();
    const start=async()=>(await c('/api/drives',{kind:'drive',scenario:'goodmayes-free-drive'})).json.driveId as string;
    const d1=await start();
    await c(`/api/drives/${d1}/loaded`,{});
    await c(`/api/drives/${d1}/ended`,{outcome:'abandoned'});
    // (Once ended it stays ended; a late "loaded" does not undo it.)
    await c(`/api/drives/${d1}/loaded`,{});
    const lesson=(await c('/api/drives',{kind:'drive',scenario:'goodmayes-lesson'})).json.driveId as string;
    await c(`/api/drives/${lesson}/completed`,{});
    await c(`/api/drives/${lesson}/ended`,{outcome:'collision'});
    const boss=await browser('boss@example.com');
    const o=(await boss('/api/admin/overview')).json;
    expect(o.drives.completed30).toEqual({lesson:1,test:0,free:0});
    expect(o.drives.ended30).toEqual({abandoned:1});
    expect((await store.getDrive(d1))!.status).toBe('ended');
  });
});
