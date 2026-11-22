import {createHash,createHmac} from 'node:crypto';
import {MongoMemoryServer} from 'mongodb-memory-server-core';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {MongoStore} from '../src/mongoStore.js';
import {MockPracticalApi,cleanDemand,premiumConfirmed,verifyNotice} from '../src/practical.js';
import {Premium,LINK_STATE_MS} from '../src/premium.js';
import {MemoryPremiumStore,MongoPremiumStore} from '../src/premiumStore.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service,type StripeEvent} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

const SECRET='notice-secret-test-only';
const DAY=86400_000;
const soon=()=>new Date(Date.now()+30*DAY);

function setup(o:{premiumFirst?:string[];generalAvailability?:boolean}={}){
  const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example',ADMIN_EMAILS:'boss@example.com',PRACTICAL_PREMIUM:'1'});
  const store=new MemoryStore(),premiumStore=new MemoryPremiumStore(),api=new MockPracticalApi();
  const service=new Service(config,store,new OutboxMailer(),fakeIdentities,fakeStripe(config));
  let clock=Date.now();
  const premium=new Premium(premiumStore,api,{premiumFirst:o.premiumFirst??[],generalAvailability:o.generalAvailability??false,noticeSecret:SECRET},()=>new Date(clock));
  service.premium=premium;
  let k=0;
  const pay=(accountId:string,link:string,amount:number,more:Record<string,unknown>={}):Promise<void>=>{k++;return service.handleStripeEvent({id:`evt_${k}`,type:'checkout.session.completed',
    data:{object:{id:`cs_${k}`,payment_status:'paid',client_reference_id:accountId,payment_link:link,amount_total:amount,currency:'gbp',payment_intent:`pi_${k}`,customer_details:{email:null},...more}}} as StripeEvent)};
  const account=(email:string)=>service.signIn('email',{sub:email,email,emailVerified:true});
  /** Links an account to a Practical account the proper way: state, PKCE, code exchanged server to server. */
  const link=async(accountId:string,practicalAccountId:string)=>{
    const s=await premium.startLink(accountId);
    api.codes.set(`code-${practicalAccountId}`,{practicalAccountId});
    return premium.finishLink(accountId,s.state,`code-${practicalAccountId}`);
  };
  const start=async(accountId:string,scenario='goodmayes-free-drive',useSession=false)=>service.startDrive(accountId,'free',scenario,{useSession});
  return {config,store,premiumStore,api,service,premium,pay,account,link,start,advance:(ms:number)=>{clock+=ms}};
}

describe('Practical Premium: off unless asked for, and never outside local fakes until the live client exists',()=>{
  it('off by default; on is refused without local fakes',()=>{
    expect(loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://x.example'}).practicalPremium).toBe(null);
    expect(()=>loadConfig({PRACTICAL_PREMIUM:'1',STRIPE_SECRET_KEY:'sk_test_x',STRIPE_WEBHOOK_SECRET:'w',RESEND_API_KEY:'r',MONGODB_URI:'mongodb://x',
      SESSION_SECRET:'s'.repeat(40)})).toThrow(/live Practical client/);
  });
  it('off: a drive is exactly as before (a session is used on completion)',async()=>{
    const {service,pay,account}=setup();service.premium=null;
    const a=await account('off@example.com');await pay(a.id,'vr-5',999);
    const r=await service.startDrive(a.id,'free','goodmayes-free-drive');
    expect(r).toMatchObject({ok:true,drive:{paidFrom:'sessions',due:true}});
  });
});

describe('Practical Premium: linking',()=>{
  it('only through the consented flow: state once, for that account, in time; PKCE verifier sent server to server',async()=>{
    const {premium,api,account,advance}=setup();
    const a=await account('learner@example.com'),b=await account('other@example.com');
    let seen='';
    api.exchangeCode=async(code,verifier)=>{seen=verifier;if(code!=='good')throw new Error('bad');return {practicalAccountId:'p-1'}};
    const s=await premium.startLink(a.id);
    expect(s.codeChallengeMethod).toBe('S256');
    expect(await premium.finishLink(b.id,s.state,'good')).toEqual({ok:false,reason:'state'});
    // (Taken by the wrong account's attempt: single use.)
    expect(await premium.finishLink(a.id,s.state,'good')).toEqual({ok:false,reason:'state'});
    const s2=await premium.startLink(a.id);
    expect(await premium.finishLink(a.id,s2.state,'bad')).toEqual({ok:false,reason:'code'});
    const s3=await premium.startLink(a.id);
    expect(await premium.finishLink(a.id,s3.state,'good')).toEqual({ok:true,practicalAccountId:'p-1'});
    expect(createHash('sha256').update(seen).digest('base64url')).toBe(s3.codeChallenge);
    const s4=await premium.startLink(b.id);advance(LINK_STATE_MS+1);
    expect(await premium.finishLink(b.id,s4.state,'good')).toEqual({ok:false,reason:'state'});
  });
  it('one Practical account to one simulator account, both ways',async()=>{
    const {account,link}=setup();
    const a=await account('a@example.com'),b=await account('b@example.com');
    expect(await link(a.id,'p-1')).toMatchObject({ok:true});
    expect(await link(b.id,'p-1')).toEqual({ok:false,reason:'taken'});
    expect(await link(a.id,'p-2')).toEqual({ok:false,reason:'taken'});
  });
  it('a matching email links nothing: no link, no Premium',async()=>{
    const {api,account,start,pay}=setup();
    const a=await account('same@example.com');await pay(a.id,'vr-5',999);
    api.entitlements.set('same@example.com',{type:'learner_premium',status:'active',expiresAt:soon()});
    expect(await start(a.id)).toMatchObject({ok:true,drive:{paidFrom:'sessions'}});
    expect(api.calls).toBe(0);
  });
});

describe('Practical Premium: at launch',()=>{
  it('confirmed: unlimited, nothing used, nothing bought touched; a failed load gives nothing back',async()=>{
    const {service,store,api,account,link,start,pay}=setup();
    const a=await account('prem@example.com');await pay(a.id,'vr-5',999);await link(a.id,'p-1');
    api.entitlements.set('p-1',{type:'learner_premium',status:'active',expiresAt:soon()});
    const before=await store.findAccount({id:a.id}),ledgerBefore=await store.ledger({accountId:a.id});
    for(let i=0;i<8;i++){
      const r=await start(a.id);if(!r.ok)throw new Error(r.reason);
      expect(r.drive).toMatchObject({paidFrom:'premium',entitlementCheck:expect.any(String)});
      expect(r.drive.due).toBeUndefined();
      await service.driveStatus(a.id,r.drive.id,'completed');
    }
    const r=await start(a.id);if(!r.ok)throw new Error(r.reason);
    await service.driveStatus(a.id,r.drive.id,'failed');
    expect(await store.findAccount({id:a.id})).toEqual(before);
    expect(await store.ledger({accountId:a.id})).toEqual(ledgerBefore);
  });
  it('learner Premium only: an instructor\'s access, an expired, inactive or open-ended one is not Premium',async()=>{
    const now=new Date();
    expect(premiumConfirmed({type:'learner_premium',status:'active',expiresAt:new Date(now.getTime()+1000)},now)).toBe(true);
    expect(premiumConfirmed({type:'instructor',status:'active',expiresAt:soon()},now)).toBe(false);
    expect(premiumConfirmed({type:'learner_premium',status:'active',expiresAt:new Date(now.getTime()-1)},now)).toBe(false);
    expect(premiumConfirmed({type:'learner_premium',status:'inactive',expiresAt:soon()},now)).toBe(false);
    expect(premiumConfirmed({type:'learner_premium',status:'active',expiresAt:null},now)).toBe(false);
    const {api,account,link,start,pay}=setup();
    const i=await account('instructor@example.com');await link(i.id,'p-i');
    api.entitlements.set('p-i',{type:'instructor',status:'active',expiresAt:soon()});
    expect(await start(i.id)).toEqual({ok:false,reason:'no-sessions'});
    await pay(i.id,'vr-5',999);
    expect(await start(i.id)).toMatchObject({ok:true,drive:{paidFrom:'sessions',due:true}});
  });
  it('Practical cannot be asked: nothing granted, no grace; the learner is asked before a session is used',async()=>{
    const {store,premiumStore,api,account,link,start,pay}=setup();
    const a=await account('down@example.com');await pay(a.id,'vr-5',999);await link(a.id,'p-1');
    api.entitlements.set('p-1',{type:'learner_premium',status:'active',expiresAt:soon()});
    expect(await start(a.id)).toMatchObject({ok:true,drive:{paidFrom:'premium'}});
    // (Confirmed a moment ago, now unreachable: the earlier answer opens nothing.)
    api.entitlements.set('p-1','error');
    expect(await start(a.id)).toEqual({ok:false,reason:'premium-unconfirmed'});
    expect(await start(a.id,'goodmayes-free-drive',true)).toMatchObject({ok:true,drive:{paidFrom:'sessions',due:true}});
    expect((await premiumStore.checks(a.id)).map(c=>c.result)).toEqual(['error','error','confirmed']);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    // No sessions: told it could not be confirmed; asking again with useSession is simply no sessions.
    const b=await account('down2@example.com');await link(b.id,'p-2');api.entitlements.set('p-2','error');
    expect(await start(b.id)).toEqual({ok:false,reason:'premium-unconfirmed'});
    expect(await start(b.id,'goodmayes-free-drive',true)).toEqual({ok:false,reason:'no-sessions'});
  });
  it('a Stripe pass holder whose Premium cannot be confirmed drives on the pass, nothing asked, nothing used',async()=>{
    const {store,api,account,link,start,pay}=setup();
    const a=await account('passholder@example.com');await pay(a.id,'vr-5',999);await pay(a.id,'monthly',1099);await link(a.id,'p-1');
    api.entitlements.set('p-1','error');
    expect(await start(a.id)).toMatchObject({ok:true,drive:{paidFrom:'pass'}});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
  });
  it('lapsing during a drive: the drive started under Premium uses nothing; the next one pays as usual',async()=>{
    const {service,store,api,account,link,start,pay}=setup();
    const a=await account('lapse@example.com');await pay(a.id,'vr-5',999);await link(a.id,'p-1');
    api.entitlements.set('p-1',{type:'learner_premium',status:'active',expiresAt:soon()});
    const r=await start(a.id);if(!r.ok)throw new Error(r.reason);
    api.entitlements.set('p-1',{type:'learner_premium',status:'inactive',expiresAt:null});
    await service.driveStatus(a.id,r.drive.id,'completed');
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    expect(await start(a.id)).toMatchObject({ok:true,drive:{paidFrom:'sessions',due:true}});
  });
  it('unlinked: Premium ends at once, nothing bought touched',async()=>{
    const {premium,api,account,link,start,pay}=setup();
    const a=await account('unlink@example.com');await pay(a.id,'vr-5',999);await link(a.id,'p-1');
    api.entitlements.set('p-1',{type:'learner_premium',status:'active',expiresAt:soon()});
    expect(await premium.unlink(a.id)).toBe(true);
    expect(await start(a.id)).toMatchObject({ok:true,drive:{paidFrom:'sessions'}});
  });
});

describe('Practical Premium: new challenges open first to verified learner Premium',()=>{
  it('refused without confirmed Premium (whatever is bought), open with it, open to admins; open to all once the owner says',async()=>{
    const {api,account,link,start,pay}=setup({premiumFirst:['goodmayes-challenge-lesson']});
    const buyer=await account('buyer@example.com');await pay(buyer.id,'vr-5',999);await pay(buyer.id,'monthly',1099);
    expect(await start(buyer.id,'goodmayes-challenge-lesson')).toEqual({ok:false,reason:'premium-first'});
    expect(await start(buyer.id)).toMatchObject({ok:true});
    const p=await account('premium@example.com');await link(p.id,'p-1');
    api.entitlements.set('p-1',{type:'learner_premium',status:'active',expiresAt:soon()});
    expect(await start(p.id,'goodmayes-challenge-lesson')).toMatchObject({ok:true,drive:{paidFrom:'premium'}});
    const i=await account('instr@example.com');await link(i.id,'p-i');
    api.entitlements.set('p-i',{type:'instructor',status:'active',expiresAt:soon()});
    expect(await start(i.id,'goodmayes-challenge-lesson')).toEqual({ok:false,reason:'premium-first'});
    const boss=await account('boss@example.com');
    expect(await start(boss.id,'goodmayes-challenge-lesson')).toMatchObject({ok:true,drive:{paidFrom:'admin'}});
    const ga=setup({premiumFirst:['goodmayes-challenge-lesson'],generalAvailability:true});
    const c=await ga.account('c@example.com');await ga.pay(c.id,'vr-5',999);
    expect(await ga.start(c.id,'goodmayes-challenge-lesson')).toMatchObject({ok:true,drive:{paidFrom:'sessions'}});
  });
});

describe('Practical Premium: notices from Practical',()=>{
  const sign=(body:string,ts:string,secret=SECRET)=>createHmac('sha256',secret).update(`${ts}.${body}`).digest('hex');
  it('signed, recent and well formed, or refused; a notice only starts a fresh check',async()=>{
    const {premium,premiumStore,api,account,link}=setup();
    const a=await account('n@example.com');await link(a.id,'p-1');
    api.entitlements.set('p-1',{type:'learner_premium',status:'active',expiresAt:soon()});
    const body=JSON.stringify({practicalAccountId:'p-1',event:'premium.changed'}),ts=String(Date.now());
    expect(await premium.notice(body,ts,sign(body,ts))).toBe('checked');
    expect((await premiumStore.checks(a.id))[0]).toMatchObject({reason:'notice',result:'confirmed'});
    expect(await premium.notice(body,ts,sign(body,ts,'wrong'))).toBe('refused');
    const old=String(Date.now()-10*60_000);
    expect(await premium.notice(body,old,sign(body,old))).toBe('refused');
    expect(await premium.notice(body,ts,undefined)).toBe('refused');
    const other=JSON.stringify({practicalAccountId:'p-unknown'});
    expect(await premium.notice(other,ts,sign(other,ts))).toBe('unknown-account');
    expect(verifyNotice('not json',ts,sign('not json',ts),SECRET)).toBe(null);
  });
});

describe('Practical test-centre requests: only what the simulator may see',()=>{
  it('keeps centre, area, count and dates; drops requesters, emails and anything else, and malformed rows',()=>{
    expect(cleanDemand([
      {centre:'Goodmayes',area:'IG3',requests:4,firstAt:'2026-11-01T10:00:00Z',lastAt:'2026-11-20T10:00:00Z',email:'x@example.com',requester:'Jo',note:'call me'},
      {centre:'',area:'E1',requests:1,firstAt:'2026-11-01',lastAt:'2026-11-01'},
      {centre:'Hendon',area:'NW9',requests:-1,firstAt:'2026-11-01',lastAt:'2026-11-01'},
      'junk',null,
    ])).toEqual([{centre:'Goodmayes',area:'IG3',requests:4,firstAt:'2026-11-01T10:00:00.000Z',lastAt:'2026-11-20T10:00:00.000Z'}]);
  });
});

// The links and states against a real MongoDB: run with MONGO_TESTS=1.
describe.skipIf(process.env['MONGO_TESTS']!=='1')('Practical Premium: links and link states in MongoDB',()=>{
  let mongo:MongoMemoryServer;
  beforeAll(async()=>{mongo=await MongoMemoryServer.create({binary:{version:'7.0.14'}})},120_000);
  afterAll(async()=>{await mongo?.stop()});
  it('one Practical account to one simulator account even at the same moment; a state is used once',async()=>{
    const store=await MongoStore.connect(mongo.getUri('dp_premium'));
    const db=new MongoPremiumStore(store.database);await db.indexes();
    const at=new Date();
    const r=await Promise.all(['a','b','c','d'].map(id=>db.link({accountId:id,practicalAccountId:'p-1',linkedAt:at,consentAt:at})));
    expect(r.filter(x=>x==='ok')).toHaveLength(1);
    expect(await db.link({accountId:'a',practicalAccountId:'p-2',linkedAt:at,consentAt:at})).toBe(r[0]==='ok'?'taken':'ok');
    await db.saveState({stateHash:'h1',accountId:'a',verifier:'v',expiresAt:new Date(Date.now()+60_000)});
    const taken=await Promise.all(Array.from({length:6},()=>db.takeState('h1',new Date())));
    expect(taken.filter(Boolean)).toHaveLength(1);
    const c=await db.recordCheck({accountId:'a',practicalAccountId:'p-1',at,result:'error',type:null,expiresAt:null,reason:'launch',error:'timeout'});
    expect((await db.checks('a'))[0]).toMatchObject({id:c.id,result:'error'});
  },60_000);
});

describe('Practical Premium over HTTP: no such addresses while it is off',()=>{
  it('off: 404; on: there, signed-in only, and an unsigned notice refused',async()=>{
    const {createServer}=await import('node:http');
    const {handler}=await import('../src/http.js');
    const serve=async(on:boolean)=>{
      const {service}=setup();if(!on)service.premium=null;
      const server=createServer(handler(service,new OutboxMailer()));
      await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
      const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
      return {base,close:()=>server.close()};
    };
    const off=await serve(false);
    expect((await fetch(off.base+'/api/practical/status')).status).toBe(404);
    expect((await fetch(off.base+'/api/practical/notice',{method:'POST',body:'{}'})).status).toBe(404);
    off.close();
    const on=await serve(true);
    expect((await fetch(on.base+'/api/practical/status')).status).toBe(401);
    expect((await fetch(on.base+'/api/practical/notice',{method:'POST',body:JSON.stringify({practicalAccountId:'p-1'})})).status).toBe(401);
    on.close();
  });
});
