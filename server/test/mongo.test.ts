import {MongoMemoryServer} from 'mongodb-memory-server-core';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {MongoStore} from '../src/mongoStore.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service,type StripeEvent} from '../src/service.js';

// The hosted store against a real MongoDB (downloaded once, about 80 MB): run with MONGO_TESTS=1.
// The unique indexes and atomic updates here are what stop double credits and double spending when hosted.
describe.skipIf(process.env['MONGO_TESTS']!=='1')('MongoDB store: concurrency and idempotency',()=>{
  let mongo:MongoMemoryServer,n=0;
  beforeAll(async()=>{mongo=await MongoMemoryServer.create({binary:{version:'7.0.14'}})},120_000);
  afterAll(async()=>{await mongo?.stop()});
  async function setup(){
    const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example'});
    const store=await MongoStore.connect(mongo.getUri(`dp_test_${++n}`));
    const service=new Service(config,store,new OutboxMailer(),fakeIdentities,fakeStripe(config));
    let k=0;
    const checkout=(accountId:string,pack:string,amount:number):StripeEvent=>{k++;return {id:`evt_${k}`,type:'checkout.session.completed',data:{object:{id:`cs_${n}_${k}`,
      payment_status:'paid',client_reference_id:accountId,payment_link:pack,amount_total:amount,currency:'gbp',payment_intent:`pi_${n}_${k}`,customer_details:{email:null}}}}};
    const account=(email:string)=>service.signIn('email',{sub:email,email,emailVerified:true});
    return {store,service,checkout,account};
  }

  it('the same webhook delivered many times at once grants once',async()=>{
    const {store,service,checkout,account}=await setup();
    const a=await account('burst@example.com');
    const ev=checkout(a.id,'vr-15',2499);
    await Promise.all(Array.from({length:10},()=>service.handleStripeEvent(ev)));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(15);
    expect((await store.ledger({accountId:a.id})).filter(e=>e.type==='purchase')).toHaveLength(1);
  });

  it('many drives started at once with three sessions: exactly three start and the balance never goes below zero',async()=>{
    const {store,service,checkout,account}=await setup();
    const a=await account('race@example.com');
    await service.handleStripeEvent(checkout(a.id,'vr-5',999));
    for(let i=0;i<2;i++)await service.startDrive(a.id,'free','goodmayes-free-drive');
    const r=await Promise.all(Array.from({length:12},()=>service.startDrive(a.id,'free','goodmayes-free-drive')));
    expect(r.filter(x=>x.ok)).toHaveLength(3);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
  });

  it('Starter: separate pots; two Starter payments at the same moment grant once; replays grant nothing more',async()=>{
    const {store,service,checkout,account}=await setup();
    const a=await account('starter@example.com');
    const one=checkout(a.id,'starter',299),two=checkout(a.id,'starter',299);
    await Promise.all([one,two,one,two,one].map(e=>service.handleStripeEvent(e)));
    const acc=(await store.findAccount({id:a.id}))!;
    expect(acc.allowances).toEqual({lesson:1,test:1,free:1});
    expect((await store.ledger({accountId:a.id})).filter(e=>e.type==='starter_duplicate')).toHaveLength(1);
    expect((await service.startDrive(a.id,'x','goodmayes-lesson')).ok).toBe(true);
    expect((await service.startDrive(a.id,'x','goodmayes-lesson')).ok).toBe(false);
    expect((await service.startDrive(a.id,'x','goodmayes-mock-test')).ok).toBe(true);
    expect((await store.findAccount({id:a.id}))!.allowances).toEqual({lesson:0,test:0,free:1});
  });

  it('an account and its email are unique; the same email signing up twice at once gives one account',async()=>{
    const {service}=await setup();
    const [x,y]=await Promise.all([service.signIn('email',{sub:'s',email:'twin@example.com',emailVerified:true}),service.signIn('email',{sub:'s',email:'twin@example.com',emailVerified:true})]);
    expect(x.id).toBe(y.id);
  });

  it('admin hub queries: search, counts, totals, drives, referrers, flags, adjustments',async()=>{
    const {store,service,checkout,account}=await setup();
    const inviter=await account('mongo-inviter@example.com');
    const friend=await service.signIn('email',{sub:'f',email:'mongo.friend@example.com',emailVerified:true},inviter.referralCode);
    await service.handleStripeEvent(checkout(friend.id,'vr-5',999));
    await service.handleStripeEvent(checkout(inviter.id,'starter',299));
    await service.startDrive(friend.id,'free','goodmayes-free-drive');
    await service.startDrive(inviter.id,'lesson','goodmayes-lesson');
    expect((await store.listAccounts({search:'friend',limit:10})).map(a=>a.email)).toEqual(['mongo.friend@example.com']);
    expect(await store.listAccounts({search:'.*',limit:10})).toEqual([]);
    expect((await store.listAccounts({search:inviter.referralCode.toLowerCase(),limit:10}))[0]!.id).toBe(inviter.id);
    expect((await store.listAccounts({limit:10}))[0]!.id).toBe(friend.id);
    expect(await store.countAccounts({})).toBe(2);
    expect(await store.countAccounts({paid:true})).toBe(2);
    expect(await store.countAccounts({referred:true})).toBe(1);
    // friend: 1 free drive + 5 - 1 used; inviter: 1 referral session; Starter: 3 - 1 lesson used.
    expect(await store.heldTotals()).toEqual({sessions:6,allowances:2});
    expect(await store.driveCounts(new Date(Date.now()-60_000))).toEqual({lesson:1,test:0,free:1,failed:0,total:2});
    expect((await store.listDrives({accountId:friend.id,limit:5}))).toHaveLength(1);
    expect(await store.referrers()).toEqual([{referrerId:inviter.id,joined:1,paid:1}]);
    expect((await store.findAccounts([inviter.id,friend.id,'nobody'])).map(a=>a.id).sort()).toEqual([inviter.id,friend.id].sort());
    const money=await store.ledger({types:['purchase'],since:new Date(Date.now()-60_000),until:new Date(Date.now()+60_000)});
    expect(money).toHaveLength(2);
    await store.flag('dispute',{charge:'ch_x'});
    const [f]=await store.flags({state:'open'});
    expect(await store.resolveFlag(f!.id,'boss@example.com','done')).toBe(true);
    expect(await store.resolveFlag(f!.id,'boss@example.com','again')).toBe(false);
    expect(await store.flags({state:'open'})).toEqual([]);
    expect((await store.flags({state:'resolved'}))[0]).toMatchObject({resolvedBy:'boss@example.com',note:'done'});
  });

  it('support: numbers, reminders and outbox items are claimed once even by servers at the same moment; screenshots round-trip',async()=>{
    const {store}=await setup();
    const db=store.support;
    const numbers=await Promise.all(Array.from({length:10},()=>db.nextTicketNumber()));
    expect(new Set(numbers).size).toBe(10);
    const now=new Date();
    const t=await db.createTicket({ref:'DP-0001',product:'simulator',email:'m@example.com',category:'bug',priority:'normal',state:'awaiting_admin',summary:'x',
      createdAt:now,updatedAt:now,awaitingSince:now,responseDueAt:now,nextReminderAt:now,overdue:false,reminders:0,lastCustomerMessageAt:now});
    const claims=await Promise.all(Array.from({length:8},()=>db.claimDueReminder(new Date(now.getTime()+1),new Date(now.getTime()+60_000))));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await db.getTicket(t.id))!).toMatchObject({overdue:true,reminders:1});
    await db.updateTicket(t.id,{state:'in_progress'},['responseDueAt','nextReminderAt']);
    expect((await db.getTicket(t.id))!.nextReminderAt).toBeUndefined();
    expect(await db.claimDueReminder(new Date(now.getTime()+3600_000),new Date())).toBeNull();
    await db.enqueue({kind:'email',to:'a@example.com',subject:'s',text:'t'},now);
    const leased=await Promise.all(Array.from({length:8},()=>db.claimOutbox(new Date(now.getTime()+1),new Date(now.getTime()+120_000))));
    expect(leased.filter(Boolean)).toHaveLength(1);
    const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3]);
    const a=await db.saveAttachment({type:'image/png',size:png.length,data:png,claimHash:'h',expiresAt:new Date(Date.now()+60_000)});
    expect((await Promise.all([db.claimAttachment(a.id,'h',t.id),db.claimAttachment(a.id,'h','other')])).filter(Boolean)).toHaveLength(1);
    expect(await db.claimAttachment(a.id,'wrong',t.id)).toBe(false);
    const back=(await db.getAttachment(a.id))!;
    expect(back.data.equals(png)).toBe(true);
    expect(back.expiresAt).toBeUndefined();
  });

  it('the free try: two drives of one kind started at once use it once; a failed one gives it back',async()=>{
    const {store}=await setup();
    const t=await store.createTrial();
    const r=await Promise.all(Array.from({length:6},()=>store.moveTrial(t.id,'test',-1)));
    expect(r.filter(Boolean)).toHaveLength(1);
    expect((await store.getTrial(t.id))!.remaining).toEqual({lesson:1,test:0,free:1});
    expect(await store.moveTrial(t.id,'test',1)).toBe(true);
    expect((await store.getTrial(t.id))!.remaining.test).toBe(1);
  });
});

