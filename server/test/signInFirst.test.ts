import {createServer,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {handler} from '../src/http.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

describe('sign-in first (staging)',()=>{
  it('is on for a staging address unless SIGN_IN_FIRST says otherwise, and off elsewhere',()=>{
    const at=(env:Record<string,string>)=>loadConfig({DP_DEV_FAKES:'1',...env}).signInFirst;
    expect(at({APP_BASE_URL:'https://staging.drivingpractice.live'})).toBe(true);
    expect(at({APP_BASE_URL:'https://vr.drivingpractice.live'})).toBe(false);
    expect(at({APP_BASE_URL:'https://staging.drivingpractice.live',SIGN_IN_FIRST:'0'})).toBe(false);
    expect(at({APP_BASE_URL:'https://vr.drivingpractice.live',SIGN_IN_FIRST:'1'})).toBe(true);
  });

  let server:Server,base='';
  const outbox=new OutboxMailer();
  const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example',SIGN_IN_FIRST:'1'});
  beforeAll(async()=>{
    server=createServer(handler(new Service(config,new MemoryStore(),outbox,fakeIdentities,fakeStripe(config)),outbox));
    await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
    base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(()=>server.close());
  const post=(path:string,body:unknown,cookie='')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://staging.example',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});

  it('signed out: no free try and no drive; signed in: the free try drives',async()=>{
    expect(await (await fetch(base+'/api/config')).json()).toMatchObject({signInFirst:true});
    expect(await (await fetch(base+'/api/me')).json()).toEqual({signedIn:false,trial:{lesson:0,test:0,free:0}});
    expect((await post('/api/drives',{kind:'free',scenario:'goodmayes-free-drive'})).status).toBe(401);
    await post('/api/auth/email',{email:'tester@example.com'});
    const code=/(\d{6})/.exec(outbox.sent.at(-1)!.subject)![1]!;
    const signed=await post('/api/auth/email/code',{email:'tester@example.com',code});
    const cookie=signed.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    const me=await (await fetch(base+'/api/me',{headers:{Cookie:cookie}})).json() as {trial:Record<string,number>};
    expect(me.trial.free).toBeGreaterThan(0);
    const drive=await post('/api/drives',{kind:'free',scenario:'goodmayes-free-drive'},cookie);
    expect(drive.status).toBe(200);
    expect(await drive.json()).toMatchObject({trial:true});
  });
});
