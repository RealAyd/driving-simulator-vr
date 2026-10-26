import {randomUUID} from 'node:crypto';
import {createServer,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {csvCell} from '../src/admin.js';
import {loadConfig} from '../src/config.js';
import {handler,sign} from '../src/http.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service,isAdminEmail} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

let server:Server,base='',service:Service;
const outbox=new OutboxMailer();
const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example',ADMIN_EMAILS:'boss@example.com'});
beforeAll(async()=>{
  service=new Service(config,new MemoryStore(),outbox,fakeIdentities,fakeStripe(config));
  server=createServer(handler(service,outbox));
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(()=>server.close());

type Reply={status:number;json:any;text:string;headers:Headers};
/** A browser on the app's own site, signed in as `email` (the dev sign-in route). */
async function as(email:string,ref?:string){
  // (A cookie jar, as a browser keeps one: the session and the device's free try.)
  let cookie='';
  const jar=new Map<string,string>();
  const keep=(c:string)=>{const kv=c.split(';')[0]!,i=kv.indexOf('=');jar.set(kv.slice(0,i),kv.slice(i+1));cookie=[...jar].filter(([,v])=>v).map(([k,v])=>`${k}=${v}`).join('; ')};
  const call=async(path:string,body?:unknown,headers:Record<string,string>={}):Promise<Reply>=>{
    const res=await fetch(base+path,{method:body===undefined?'GET':'POST',redirect:'manual',
      headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:'https://staging.example'}),...(cookie?{Cookie:cookie}:{}),...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    for(const c of res.headers.getSetCookie())keep(c);
    const text=await res.text();
    return {status:res.status,text,json:res.headers.get('content-type')?.includes('json')?JSON.parse(text):null,headers:res.headers};
  };
  await call('/api/dev/signin',{email,...(ref?{ref}:{})});
  const me=(await call('/api/me')).json;
  return Object.assign(call,{id:me.id as string,code:me.referralCode as string,setCookie:(c:string)=>keep(c)});
}

describe('the admin hub API',()=>{
  it('is for ADMIN_EMAILS only: signed out 401, a learner 403, the admin sees the overview',async()=>{
    expect((await fetch(`${base}/api/admin/overview`)).status).toBe(401);
    const learner=await as('learner1@example.com');
    expect((await learner('/api/admin/overview')).status).toBe(403);
    expect((await learner('/api/admin/customers?q=')).status).toBe(403);
    const boss=await as('boss@example.com');
    const o=await boss('/api/admin/overview');
    expect(o.status).toBe(200);
    expect(o.json.accounts.total).toBeGreaterThanOrEqual(2);
    expect(o.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('an admin stays in for the whole sign-in, not just the first hours',async()=>{
    const boss=await as('boss@example.com');
    boss.setCookie(`dp_session=${encodeURIComponent(sign(config.sessionSecret,boss.id,Date.now()-30*86400_000))}`);
    expect((await boss('/api/admin/overview')).status).toBe(200);
  });

  it('an admin address counts by alias: a Gmail address with dots or a +tag',async()=>{
    expect(isAdminEmail({...config,adminEmails:['owner1@gmail.com']},'Own.er1+dp@googlemail.com')).toBe(true);
    expect(isAdminEmail({...config,adminEmails:['owner1@gmail.com']},'owner2@gmail.com')).toBe(false);
    expect(isAdminEmail({...config,adminEmails:['boss@example.com']},null)).toBe(false);
    const dotted=await as('bo.ss@example.com');
    expect((await dotted('/api/me')).json.admin).toBe(false);
  });

  it('overview: money, paying customers, drives and sessions held',async()=>{
    const buyer=await as('buyer@example.com');
    await buyer('/api/dev/checkout',{pack:'vr-5'});
    await buyer('/api/dev/checkout',{pack:'starter'});
    const d=await buyer('/api/drives',{kind:'lesson',scenario:'goodmayes-lesson'});
    await buyer(`/api/drives/${d.json.driveId}/failed`,{});
    const o=(await (await as('boss@example.com'))('/api/admin/overview')).json;
    expect(o.money.grossPence).toBeGreaterThanOrEqual(999+299);
    expect(o.money.payments30).toBeGreaterThanOrEqual(2);
    expect(o.accounts.paying).toBeGreaterThanOrEqual(1);
    expect(o.drives.lesson30).toBeGreaterThanOrEqual(1);
    expect(o.drives.failed30).toBeGreaterThanOrEqual(1);
    expect(o.sessionsHeld.sessions).toBeGreaterThanOrEqual(5);
  });

  it('customers: search by email or code; the detail has the ledger and drives',async()=>{
    const c=await as('find-me@example.com');
    await c('/api/dev/checkout',{pack:'vr-5'});
    const d=await c('/api/drives',{kind:'free',scenario:'goodmayes-free-drive'});
    await c(`/api/drives/${d.json.driveId}/completed`,{});
    const boss=await as('boss@example.com');
    const found=(await boss('/api/admin/customers?q=find-me')).json.customers;
    expect(found.map((x:{email:string})=>x.email)).toEqual(['find-me@example.com']);
    expect((await boss(`/api/admin/customers?q=${c.code.toLowerCase()}`)).json.customers[0].id).toBe(c.id);
    // Typed search text is matched literally (not as a pattern).
    expect((await boss('/api/admin/customers?q=.*')).json.customers).toEqual([]);
    const detail=(await boss(`/api/admin/customers/${c.id}`)).json;
    expect(detail.account).toMatchObject({email:'find-me@example.com',balance:4,referralCode:c.code});
    expect(detail.ledger.map((e:{type:string})=>e.type)).toEqual(['purchase','consumed']);
    expect(detail.drives).toHaveLength(1);
    expect((await boss('/api/admin/customers/no-such-account')).status).toBe(404);
  });

  it('adjust: adds or removes with a reason, under the admin\'s name; a repeated request records once; never below zero',async()=>{
    const c=await as('adjust@example.com');
    const boss=await as('boss@example.com');
    const requestId=randomUUID();
    const add=await boss(`/api/admin/customers/${c.id}/adjust`,{sessions:2,pot:null,reason:'Goodwill: app froze',requestId});
    expect(add.json).toMatchObject({result:'ok',balance:2});
    expect((await boss(`/api/admin/customers/${c.id}/adjust`,{sessions:2,pot:null,reason:'Goodwill: app froze',requestId})).json).toMatchObject({result:'duplicate',balance:2});
    expect((await boss(`/api/admin/customers/${c.id}/adjust`,{sessions:1,pot:'test',reason:'Mock test retry',requestId:randomUUID()})).json.allowances).toEqual({lesson:0,test:1,free:0});
    expect((await boss(`/api/admin/customers/${c.id}/adjust`,{sessions:-3,pot:null,reason:'Too many',requestId:randomUUID()})).status).toBe(409);
    expect((await boss(`/api/admin/customers/${c.id}/adjust`,{sessions:-1,pot:null,reason:'Correction',requestId:randomUUID()})).json.balance).toBe(1);
    for(const bad of [{sessions:0},{sessions:51},{sessions:1.5},{sessions:'2'},{pot:'gold'},{reason:'x'},{requestId:'no'}]){
      const r=await boss(`/api/admin/customers/${c.id}/adjust`,{sessions:1,pot:null,reason:'Fine reason',requestId:randomUUID(),...bad});
      expect(r.status).toBe(400);
    }
    const entries=(await boss(`/api/admin/customers/${c.id}`)).json.ledger.filter((e:{type:string})=>e.type==='adjustment');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({actor:'admin',by:'boss@example.com',reason:'Goodwill: app froze',sessionsDelta:2});
    // The customer sees it too.
    expect((await c('/api/me')).json.balance).toBe(1);
    // A learner cannot adjust, and a post from another site is refused even for the admin.
    expect((await c(`/api/admin/customers/${c.id}/adjust`,{sessions:5,pot:null,reason:'Free stuff',requestId:randomUUID()})).status).toBe(403);
    expect((await boss(`/api/admin/customers/${c.id}/adjust`,{sessions:5,pot:null,reason:'Free stuff',requestId:randomUUID()},{Origin:'https://evil.example'})).status).toBe(403);
  });

  it('payments: the money entries in a date range, as JSON and as a safe CSV',async()=>{
    const c=await as('=cmd@example.com');
    await c('/api/dev/checkout',{pack:'vr-15'});
    const boss=await as('boss@example.com');
    const today=new Date().toISOString().slice(0,10);
    const p=(await boss(`/api/admin/payments?from=${today}&to=${today}`)).json;
    expect(p.entries.some((e:{email:string;amountPence:number})=>e.email==='=cmd@example.com'&&e.amountPence===2499)).toBe(true);
    expect(p.entries.every((e:{type:string})=>['purchase','promo','refund','starter_duplicate'].includes(e.type))).toBe(true);
    expect((await boss('/api/admin/payments?from=2001-01-01&to=2001-01-31')).json.entries).toEqual([]);
    const csv=await boss(`/api/admin/payments?from=${today}&to=${today}&format=csv`);
    expect(csv.headers.get('content-type')).toContain('text/csv');
    expect(csv.headers.get('content-disposition')).toBe(`attachment; filename="payments-${today}-to-${today}.csv"`);
    expect(csv.text.split('\r\n')[0]).toBe('date,account_id,email,type,reason,amount_gbp,currency,sessions,pot,payment_intent,checkout_session,charge,stripe_event');
    expect(csv.text).toContain(",'=cmd@example.com,purchase,");
    expect(csv.text).toContain(',24.99,gbp,15,');
  });

  it('csv cells: formulas made plain, quotes and commas escaped, negative numbers kept',()=>{
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('-1+2')).toBe("'-1+2");
    expect(csvCell(-4.99)).toBe('-4.99');
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe('');
  });

  it('flags: open ones listed; marking one resolved records who and why, once',async()=>{
    await service.handleStripeEvent({id:'evt_dispute_1',type:'charge.dispute.created',data:{object:{charge:'ch_1',amount:999,reason:'fraudulent'}}});
    const boss=await as('boss@example.com');
    const open=(await boss('/api/admin/flags?state=open')).json.flags;
    const dispute=open.find((f:{kind:string})=>f.kind==='dispute');
    expect(dispute.data).toMatchObject({charge:'ch_1'});
    expect((await boss(`/api/admin/flags/${dispute.id}/resolve`,{note:'Evidence sent in Stripe'})).status).toBe(200);
    expect((await boss(`/api/admin/flags/${dispute.id}/resolve`,{note:'again'})).status).toBe(404);
    expect((await boss('/api/admin/flags?state=open')).json.flags.some((f:{id:string})=>f.id===dispute.id)).toBe(false);
    const done=(await boss('/api/admin/flags?state=resolved')).json.flags.find((f:{id:string})=>f.id===dispute.id);
    expect(done).toMatchObject({resolvedBy:'boss@example.com',note:'Evidence sent in Stripe'});
  });

  it('referrals: who brought whom, how many paid, and the sessions earned',async()=>{
    const inviter=await as('inviter-admin@example.com');
    const a=await as('friend-a@example.com',inviter.code);
    await as('friend-b@example.com',inviter.code);
    await a('/api/dev/checkout',{pack:'vr-5'});
    const r=(await (await as('boss@example.com'))('/api/admin/referrals')).json;
    expect(r.referrers.find((x:{id:string})=>x.id===inviter.id)).toEqual({id:inviter.id,email:'inviter-admin@example.com',code:inviter.code,joined:2,paid:1,rewards:1});
  });

  it('the admins drive without sessions: a drive starts with none, nothing is taken, nothing given back; a learner still needs one',async()=>{
    const boss=await as('boss@example.com');
    const d=await boss('/api/drives',{kind:'test',scenario:'goodmayes-mock-test'});
    expect(d.status).toBe(200);
    expect(d.json.balance).toBe(0);
    expect((await boss(`/api/drives/${d.json.driveId}/failed`,{})).status).toBe(200);
    expect((await boss(`/api/drives/${d.json.driveId}/completed`,{})).status).toBe(200);
    const me=(await boss('/api/me')).json;
    expect(me).toMatchObject({admin:true,balance:0});
    expect(me.history.filter((h:{type:string})=>h.type==='consumed'||h.type==='drive_refund')).toEqual([]);
    // A learner with no sessions: the device's free try once, then a session is needed.
    const learner=await as('learner-nodrive@example.com');
    const tried=await learner('/api/drives',{kind:'free',scenario:'goodmayes-free-drive'});
    expect(tried.json).toMatchObject({trial:true});
    await learner(`/api/drives/${tried.json.driveId}/completed`,{});
    expect((await learner('/api/drives',{kind:'free',scenario:'goodmayes-free-drive'})).status).toBe(402);
  });
});

