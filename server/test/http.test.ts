import {createServer,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {handler,readSession} from '../src/http.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

let server:Server,base='';
const outbox=new OutboxMailer();
const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example'});
beforeAll(async()=>{
  server=createServer(handler(new Service(config,new MemoryStore(),outbox,fakeIdentities,fakeStripe(config)),outbox));
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(()=>server.close());

/** A browser-like client: keeps the session cookie; posts JSON from the app's own origin. */
function client(){
  let cookie='';
  return async(path:string,body?:unknown,headers:Record<string,string>={})=>{
    const res=await fetch(base+path,{method:body===undefined?'GET':'POST',redirect:'manual',
      headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:'https://staging.example'}),...(cookie?{Cookie:cookie}:{}),...headers},
      ...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
    const set=res.headers.get('set-cookie');
    if(set)cookie=set.split(';')[0]!;
    return {status:res.status,json:res.headers.get('content-type')?.includes('json')?await res.json() as Record<string,unknown>:null,headers:res.headers,cookie:()=>cookie};
  };
}

describe('the API over HTTP',()=>{
  it('signed out: config lists the packs; me says signed out; starting a drive needs sign-in',async()=>{
    const c=client();
    const cfg=await c('/api/config');
    expect(cfg.json).toMatchObject({gate:true,devCheckout:true});
    expect((cfg.json!['packs'] as unknown[]).length).toBe(3);
    expect((await c('/api/me')).json).toEqual({signedIn:false});
    expect((await c('/api/drives',{kind:'free',scenario:'x'})).status).toBe(401);
  });

  it('email code sign-in sets a signed, HttpOnly, Secure cookie; a drive needs a session; buying adds them',async()=>{
    const c=client();
    expect((await c('/api/auth/email',{email:'h@example.com'})).status).toBe(200);
    const code=/(\d{6})/.exec(outbox.sent.at(-1)!.subject)![1]!;
    const r=await c('/api/auth/email/code',{email:'h@example.com',code});
    expect(r.status).toBe(200);
    const set=r.headers.get('set-cookie')!;
    expect(set).toContain('HttpOnly');expect(set).toContain('Secure');expect(set).toContain('SameSite=Lax');
    expect(readSession(config.sessionSecret,decodeURIComponent(c.length?r.cookie().split('=').slice(1).join('='):''))).not.toBeNull();
    expect((await c('/api/me')).json).toMatchObject({signedIn:true,email:'h@example.com',balance:0});
    expect((await c('/api/drives',{kind:'free',scenario:'x'})).status).toBe(402);
    await c('/api/dev/checkout',{pack:'starter'});
    const d=await c('/api/drives',{kind:'free',scenario:'goodmayes'});
    expect(d.json).toMatchObject({balance:2});
    expect((await c(`/api/drives/${d.json!['driveId']}/loaded`,{})).status).toBe(200);
    await c('/api/auth/logout',{});
    expect((await c('/api/me')).json).toEqual({signedIn:false});
  });

  it('a tampered cookie is not accepted',async()=>{
    const res=await fetch(`${base}/api/me`,{headers:{Cookie:'dp_session=eyJhIjoieCIsImUiOjk5OTk5OTk5OTk5OTl9.forged'}});
    expect(await res.json()).toEqual({signedIn:false});
  });

  it('posts from another site are refused; non-JSON posts are refused',async()=>{
    const c=client();
    expect((await c('/api/auth/email',{email:'x@example.com'},{Origin:'https://evil.example'})).status).toBe(403);
    expect((await c('/api/auth/email','email=x@example.com',{'Content-Type':'application/x-www-form-urlencoded'})).status).toBe(415);
  });

  it('a webhook without a valid Stripe signature is refused',async()=>{
    const res=await fetch(`${base}/api/stripe/webhook`,{method:'POST',headers:{'Stripe-Signature':'t=1,v1=nope','Content-Type':'application/json'},body:'{}'});
    expect(res.status).toBe(400);
  });

  it('the emailed link signs in and returns to the app',async()=>{
    const c=client();
    await c('/api/auth/email',{email:'link@example.com'});
    const token=/token=([\w-]+)/.exec(outbox.sent.at(-1)!.text)![1]!;
    const r=await c(`/api/auth/email/verify?token=${token}`);
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe('https://staging.example/?signin=done');
    expect((await c('/api/me')).json).toMatchObject({signedIn:true,email:'link@example.com'});
    const again=await client()(`/api/auth/email/verify?token=${token}`);
    expect(again.headers.get('location')).toBe('https://staging.example/?signin=expired');
  });
});
