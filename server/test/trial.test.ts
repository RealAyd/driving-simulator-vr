import {createServer,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {handler} from '../src/http.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service,TRIALS_PER_IP_PER_DAY} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

let server:Server,base='';
const mail=new OutboxMailer();
const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://vr.example'});
const service=new Service(config,new MemoryStore(),mail,fakeIdentities,fakeStripe(config));
beforeAll(async()=>{
  server=createServer(handler(service,mail));
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(()=>server.close());

/** A device (its own cookies), from an address (X-Forwarded-For, as behind the host's proxy). */
function device(ip='203.0.113.7'){
  const jar=new Map<string,string>();
  return async(path:string,body?:unknown)=>{
    const res=await fetch(base+path,{method:body===undefined?'GET':'POST',
      headers:{'X-Forwarded-For':ip,...(body===undefined?{}:{'Content-Type':'application/json',Origin:'https://vr.example'}),...(jar.size?{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    for(const c of res.headers.getSetCookie()){const kv=c.split(';')[0]!,i=kv.indexOf('=');jar.set(kv.slice(0,i),kv.slice(i+1))}
    return {status:res.status,json:await res.json() as any,setCookie:res.headers.getSetCookie()};
  };
}
const drive=(scenario:string)=>({kind:'x',scenario});
/** Starts a drive and drives it to its end (when the try or session is used); the start's reply. */
async function completed(d:ReturnType<typeof device>,scenario:string){
  const r=await d('/api/drives',drive(scenario));
  if(r.status===200)await d(`/api/drives/${r.json.driveId}/completed`,{});
  return r;
}

describe('the free try: one lesson, one mock test and one free drive, without signing up',()=>{
  it('a new device can complete one of each kind, signed out (a drive not completed uses nothing); then it needs an account',async()=>{
    const d=device('203.0.113.1');
    expect((await d('/api/me')).json).toEqual({signedIn:false,trial:{lesson:1,test:1,free:1}});
    const first=await d('/api/drives',drive('goodmayes-free-drive'));
    expect(first.json).toMatchObject({trial:true});
    // The try is the device's: an HttpOnly cookie, kept a year.
    expect(first.setCookie.join(' ')).toMatch(/dp_trial=.*HttpOnly.*Max-Age=31536000/);
    await d(`/api/drives/${first.json.driveId}/ended`,{outcome:'abandoned'});
    expect((await d('/api/me')).json.trial.free).toBe(1);
    expect((await completed(d,'goodmayes-free-drive')).status).toBe(200);
    expect((await completed(d,'goodmayes-lesson')).status).toBe(200);
    expect((await completed(d,'goodmayes-mock-test')).status).toBe(200);
    for(const s of ['goodmayes-free-drive','goodmayes-lesson','goodmayes-mock-test']){
      const again=await d('/api/drives',drive(s));
      expect(again.status).toBe(402);
      expect(again.json.error).toBe('trial-used');
    }
    expect((await d('/api/me')).json.trial).toEqual({lesson:0,test:0,free:0});
  });

  it('a free-try drive that fails to load uses nothing',async()=>{
    const d=device('203.0.113.2');
    const r=(await d('/api/drives',drive('goodmayes-mock-test'))).json;
    expect((await d(`/api/drives/${r.driveId}/failed`,{})).status).toBe(200);
    expect((await d(`/api/drives/${r.driveId}/failed`,{})).status).toBe(200);
    expect((await d('/api/me')).json.trial.test).toBe(1);
    // Another device cannot report it.
    expect((await device('203.0.113.2')(`/api/drives/${r.driveId}/failed`,{})).status).toBe(404);
  });

  it('clearing cookies for more: a day\'s new tries from one address (enough for a shared network), then no more',async()=>{
    for(let i=0;i<TRIALS_PER_IP_PER_DAY;i++)expect((await device('198.51.100.9')('/api/drives',drive('goodmayes-free-drive'))).status).toBe(200);
    const next=await device('198.51.100.9')('/api/drives',drive('goodmayes-free-drive'));
    expect(next.status).toBe(429);
    expect((await device('198.51.100.10')('/api/drives',drive('goodmayes-free-drive'))).status).toBe(200);
  });

  it('signed in: sessions first; with none, the device\'s free try; then a session is needed',async()=>{
    const d=device('203.0.113.3');
    await d('/api/dev/signin',{email:'trier@example.com'});
    await d('/api/dev/checkout',{pack:'vr-5'});
    expect((await completed(d,'goodmayes-free-drive')).json).toMatchObject({balance:5});
    expect((await d('/api/me')).json).toMatchObject({balance:4,trial:{free:1}});
    const e=device('203.0.113.4');
    await e('/api/dev/signin',{email:'nosessions@example.com'});
    expect((await completed(e,'goodmayes-lesson')).json).toMatchObject({trial:true});
    const again=await e('/api/drives',drive('goodmayes-lesson'));
    expect(again.status).toBe(402);
    expect(again.json.error).toBe('no-sessions');
  });
});

describe('progress kept on the account: signing up saves it, another device gets it',()=>{
  it('lessons finished before signing up are added to the account and come back on a new device',async()=>{
    const phone=device('203.0.113.40');
    expect((await phone('/api/progress',{lessons:['moving-off']})).status).toBe(401);
    await phone('/api/dev/signin',{email:'saver@example.com'});
    expect((await phone('/api/me')).json.lessonsDone).toEqual([]);
    expect((await phone('/api/progress',{lessons:['moving-off','turn-left','../bad',7]})).json.lessonsDone).toEqual(['moving-off','turn-left']);
    // Nothing is lost when a device sends less.
    expect((await phone('/api/progress',{lessons:['turn-right']})).json.lessonsDone).toEqual(['moving-off','turn-left','turn-right']);
    const laptop=device('203.0.113.41');
    await laptop('/api/dev/signin',{email:'saver@example.com'});
    expect((await laptop('/api/me')).json.lessonsDone).toEqual(['moving-off','turn-left','turn-right']);
  });
});
