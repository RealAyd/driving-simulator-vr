import {describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {OutboxMailer,fakeIdentities,fakeStripe,refunds} from '../src/providers.js';
import {Service,emailKey,type StripeEvent} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

function setup(){
  const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example'});
  const store=new MemoryStore(),mail=new OutboxMailer();
  const service=new Service(config,store,mail,fakeIdentities,fakeStripe(config));
  let n=0;
  /** A completed Payment Link checkout, as Stripe sends it. */
  const checkout=(accountId:string|null,pack:string,amount:number,extra:Record<string,unknown>={}):StripeEvent=>{
    n++;
    return {id:`evt_${n}`,type:'checkout.session.completed',data:{object:{id:`cs_${n}`,payment_status:amount>0?'paid':'no_payment_required',
      client_reference_id:accountId,payment_link:pack,amount_total:amount,currency:'gbp',payment_intent:amount>0?`pi_${n}`:null,customer_details:{email:null},...extra}}};
  };
  return {config,store,mail,service,checkout};
}
const signUp=(s:Service,email:string,ref?:string)=>s.signIn('email',{sub:email,email,emailVerified:true},ref);
/** A drive started and driven to its end (when its session is used); false if it could not start. */
async function complete(s:Service,accountId:string,scenario:string):Promise<boolean>{
  const d=await s.startDrive(accountId,'drive',scenario);
  if(!d.ok)return false;
  await s.driveStatus(accountId,d.drive.id,'completed');
  return true;
}

describe('accounts and sign-in',()=>{
  it('email: a 6-digit code (and a link) sent; the code signs in once; wrong guesses run out',async()=>{
    const {service,mail}=setup();
    expect(await service.requestEmailCode('Learner@Example.com','1.1.1.1')).toBe('sent');
    const sent=mail.sent.at(-1)!;
    expect(sent.to).toBe('learner@example.com');
    const code=/(\d{6})/.exec(sent.subject)![1]!;
    expect(sent.text).toContain('https://staging.example/api/auth/email/verify?token=');
    expect(await service.verifyEmailCode('learner@example.com','000000'===code?'111111':'000000')).toBeNull();
    const a=await service.verifyEmailCode('learner@example.com',code);
    expect(a?.email).toBe('learner@example.com');
    expect(await service.verifyEmailCode('learner@example.com',code)).toBeNull();   // used
    // Five wrong guesses end a code.
    await service.requestEmailCode('learner@example.com','1.1.1.1');
    const code2=/(\d{6})/.exec(mail.sent.at(-1)!.subject)![1]!;
    for(let i=0;i<5;i++)await service.verifyEmailCode('learner@example.com',code2==='123456'?'654321':'123456');
    expect(await service.verifyEmailCode('learner@example.com',code2)).toBeNull();
  });

  it('the link in the email signs in once',async()=>{
    const {service,mail}=setup();
    await service.requestEmailCode('a@example.com','1.1.1.1');
    const token=/token=([\w-]+)/.exec(mail.sent.at(-1)!.text)![1]!;
    expect((await service.verifyEmailToken(token))?.email).toBe('a@example.com');
    expect(await service.verifyEmailToken(token)).toBeNull();
  });

  it('asking for codes too often is slowed down; a bad address is refused',async()=>{
    const {service}=setup();
    expect(await service.requestEmailCode('not-an-email','1.1.1.1')).toBe('invalid');
    for(let i=0;i<5;i++)expect(await service.requestEmailCode('b@example.com','2.2.2.2')).toBe('sent');
    expect(await service.requestEmailCode('b@example.com','2.2.2.2')).toBe('slow-down');
  });

  it('Google and Apple sign-in find the same account by verified email; the provider id is remembered',async()=>{
    const {service}=setup();
    const byEmail=await signUp(service,'sam@example.com');
    const byGoogle=await service.signInWith('google','g-123|Sam@Example.com');
    expect(byGoogle.id).toBe(byEmail.id);
    const byApple=await service.signInWith('apple','a-456|sam@example.com');
    expect(byApple.id).toBe(byEmail.id);
    // Apple sends the email only the first time: later, the remembered id finds the account.
    expect((await service.signInWith('apple','a-456|')).id).toBe(byEmail.id);
  });

  it('email aliases are one person',()=>{
    expect(emailKey('Jo.Bloggs+drive@gmail.com')).toBe('jobloggs@gmail.com');
    expect(emailKey('jo+x@outlook.com')).toBe('jo@outlook.com');
    expect(emailKey('j.o@outlook.com')).toBe('j.o@outlook.com');
  });
});

describe('sessions: nothing is free; a completed drive uses one session',()=>{
  it('a new account has nothing and cannot start a drive',async()=>{
    const {service}=setup();
    const a=await signUp(service,'new@example.com');
    expect(a.balance).toBe(0);
    expect(await service.startDrive(a.id,'lesson','goodmayes-lesson')).toEqual({ok:false,reason:'no-sessions'});
  });

  it('VR 5 adds five general sessions once (a replayed webhook adds nothing); each completed drive of any kind uses one',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'buyer@example.com');
    const ev=checkout(a.id,'vr-5',999);
    await service.handleStripeEvent(ev);
    await service.handleStripeEvent(ev);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    for(const scenario of ['goodmayes-mock-test','goodmayes-lesson','goodmayes-free-drive'])expect(await complete(service,a.id,scenario)).toBe(true);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(2);
  });

  it('starting a drive uses nothing; exiting, crashing or running out of time uses nothing; completing uses one, once',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'ends@example.com');
    await service.handleStripeEvent(checkout(a.id,'vr-5',999));
    const balance=async()=>(await store.findAccount({id:a.id}))!.balance;
    for(const outcome of ['abandoned','collision','left-route','time-limit'] as const){
      const d=await service.startDrive(a.id,'drive','goodmayes-mock-test');
      if(!d.ok)throw new Error();
      expect(await balance()).toBe(5);
      await service.driveStatus(a.id,d.drive.id,'loaded');
      await service.driveStatus(a.id,d.drive.id,'ended',outcome);
    }
    expect(await balance()).toBe(5);
    const d=await service.startDrive(a.id,'drive','goodmayes-lesson');
    if(!d.ok)throw new Error();
    await service.driveStatus(a.id,d.drive.id,'completed');
    await service.driveStatus(a.id,d.drive.id,'completed');
    expect(await balance()).toBe(4);
    expect((await store.getDrive(d.drive.id))).toMatchObject({status:'completed',paidFrom:'sessions',due:false});
  });

  it('the same webhook delivered many times at once grants once',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'burst@example.com');
    const ev=checkout(a.id,'vr-15',2499);
    await Promise.all(Array.from({length:8},()=>service.handleStripeEvent(ev)));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(15);
    expect((await store.ledger({accountId:a.id})).filter(e=>e.type==='purchase')).toHaveLength(1);
  });

  it('two drives on one last session, both completed: the second takes the balance below zero (drives stop) and is flagged',async()=>{
    const {service,store}=setup();
    const a=await signUp(service,'race@example.com',undefined);
    await store.appendLedger({product:'simulator',accountId:a.id,type:'adjustment',sessionsDelta:1,amountPence:0,currency:'gbp',actor:'admin',reason:'test',idempotencyKey:'t1'});
    const r=await Promise.all([service.startDrive(a.id,'free','goodmayes-free-drive'),service.startDrive(a.id,'free','goodmayes-free-drive')]);
    expect(r.filter(x=>x.ok)).toHaveLength(2);
    for(const d of r)if(d.ok)await service.driveStatus(a.id,d.drive.id,'completed');
    expect((await store.findAccount({id:a.id}))!.balance).toBe(-1);
    expect((await store.flags()).map(f=>f.kind)).toContain('completed-without-session');
    expect((await service.startDrive(a.id,'free','goodmayes-free-drive')).ok).toBe(false);
  });

  it('a drive that fails to load uses nothing; another account cannot report on (or complete) a drive',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'c@example.com');
    await service.handleStripeEvent(checkout(a.id,'vr-5',999));
    const d1=await service.startDrive(a.id,'free','goodmayes-free-drive');
    if(!d1.ok)throw new Error();
    await service.driveStatus(a.id,d1.drive.id,'failed');
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    expect((await store.ledger({accountId:a.id})).map(e=>e.type)).toEqual(['purchase']);
    const b=await signUp(service,'d@example.com');
    expect(await service.driveStatus(b.id,d1.drive.id,'completed')).toBe(false);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
  });

  it('a drive paid at its start (before sessions were used on completion) still gets its session back if it failed to load',async()=>{
    const {service,store}=setup();
    const a=await signUp(service,'legacy@example.com');
    const d=await store.createDrive({accountId:a.id,kind:'free',scenario:'goodmayes-free-drive',mode:'free',paidFrom:'sessions',startedAt:new Date(),status:'started'});
    await store.appendLedger({product:'simulator',accountId:a.id,type:'consumed',sessionsDelta:-1,amountPence:0,currency:'gbp',actor:'customer',reason:'x',idempotencyKey:`drive:${d.id}`});
    await service.driveStatus(a.id,d.id,'failed');
    expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
    // Completing it later takes nothing more.
    await service.driveStatus(a.id,d.id,'completed');
    expect((await store.ledger({accountId:a.id})).filter(e=>e.type==='consumed')).toHaveLength(1);
  });

  it('a 100% promotion code still gives the pack (recorded as a promo, no money)',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'p@example.com');
    await service.handleStripeEvent(checkout(a.id,'vr-5',0));
    const ledger=await store.ledger({accountId:a.id});
    expect(ledger.map(e=>[e.type,e.sessionsDelta,e.amountPence])).toEqual([['promo',5,0]]);
  });

  it('a payment without the account reference is matched by email, or kept for a person to sort out',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'e@example.com');
    await service.handleStripeEvent(checkout(null,'vr-5',999,{customer_details:{email:'E@example.com'}}));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    await service.handleStripeEvent(checkout(null,'vr-5',999,{customer_details:{email:'nobody@example.com'}}));
    expect((await store.flags()).map(f=>f.kind)).toContain('payment-no-account');
  });

  it('a payment for a link that is not one of the packs grants nothing and is flagged',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'unknown@example.com');
    await service.handleStripeEvent(checkout(a.id,'someone-elses-link',999));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
    expect((await store.flags()).map(f=>f.kind)).toContain('payment-unknown-pack');
  });

  it('delayed payments: completion while unpaid grants nothing; later success grants once; failure grants nothing',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'f@example.com');
    const ev=checkout(a.id,'vr-5',999,{payment_status:'unpaid'});
    await service.handleStripeEvent(ev);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
    const later={...ev,id:'evt_later',type:'checkout.session.async_payment_succeeded',data:{object:{...ev.data.object,payment_status:'paid'}}};
    await service.handleStripeEvent(later);
    await service.handleStripeEvent({...later,id:'evt_later_again'});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    const other=checkout(a.id,'vr-5',999,{payment_status:'unpaid'});
    await service.handleStripeEvent(other);
    await service.handleStripeEvent({...other,id:'evt_failed',type:'checkout.session.async_payment_failed'});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
  });

  it('partial refunds: under £5 in all, recorded and the sessions kept; from £5, recorded, sessions kept and flagged; a later full refund records only the rest',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'partial@example.com');
    const ev=checkout(a.id,'vr-5',999);
    await service.handleStripeEvent(ev);
    const pi=ev.data.object['payment_intent'];
    const refund=(id:string,total:number,whole=false):StripeEvent=>({id,type:'charge.refunded',data:{object:{id:'ch_p',payment_intent:pi,amount:999,amount_refunded:total,refunded:whole,currency:'gbp'}}});
    await service.handleStripeEvent(refund('evt_p1',200));
    await service.handleStripeEvent(refund('evt_p1_again',200));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    expect((await store.flags()).map(f=>f.kind)).not.toContain('partial-refund');
    await service.handleStripeEvent(refund('evt_p2',600));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(5);
    expect((await store.flags()).filter(f=>f.kind==='partial-refund')).toHaveLength(1);
    await service.handleStripeEvent(refund('evt_full',999,true));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
    const money=(await store.ledger({accountId:a.id})).filter(e=>e.type==='refund').map(e=>e.amountPence);
    expect(money).toEqual([-200,-400,-399]);
  });

  it('a full refund takes general sessions back even if spent (the balance can go below zero), once; a partial refund is flagged; a dispute is flagged',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'g@example.com');
    const ev=checkout(a.id,'vr-5',999);
    await service.handleStripeEvent(ev);
    for(let i=0;i<6&&await complete(service,a.id,'goodmayes-free-drive');i++);
    const pi=ev.data.object['payment_intent'];
    const refund:StripeEvent={id:'evt_r',type:'charge.refunded',data:{object:{id:'ch_1',payment_intent:pi,amount:999,amount_refunded:999,refunded:true,currency:'gbp'}}};
    await service.handleStripeEvent(refund);
    await service.handleStripeEvent({...refund,id:'evt_r2'});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(-5);
    const ev2=checkout(a.id,'vr-15',2499);
    await service.handleStripeEvent(ev2);
    await service.handleStripeEvent({id:'evt_p',type:'charge.refunded',data:{object:{id:'ch_2',payment_intent:ev2.data.object['payment_intent'],amount:2499,amount_refunded:1000,refunded:false,currency:'gbp'}}});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(10);
    await service.handleStripeEvent({id:'evt_d',type:'charge.dispute.created',data:{object:{charge:'ch_1',amount:999,reason:'fraudulent'}}});
    expect((await store.flags()).map(f=>f.kind)).toEqual(expect.arrayContaining(['partial-refund','dispute']));
    // (1000p of 2499p refunded: from £5, so flagged; the sessions stay.)
  });
});

describe('Starter Pass: three sessions for any drive, once per account',()=>{
  it('grants three general sessions: the learner chooses what to use them on (three mock tests, say)',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'starter@example.com');
    await service.handleStripeEvent(checkout(a.id,'starter',299));
    const acc=(await store.findAccount({id:a.id}))!;
    expect(acc.balance).toBe(3);
    expect(acc.starterBought).toBe(true);
    for(let i=0;i<3;i++)expect(await complete(service,a.id,'goodmayes-mock-test')).toBe(true);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
    expect((await service.startDrive(a.id,'drive','goodmayes-lesson')).ok).toBe(false);
  });

  it('Starter Pass drives still held from the old pass are used for any kind of drive, before general sessions',async()=>{
    const {service,store}=setup();
    const a=await signUp(service,'oldpass@example.com');
    await store.appendLedger({product:'simulator',accountId:a.id,type:'allowance',sessionsDelta:1,pot:'lesson',amountPence:0,currency:'gbp',actor:'stripe',reason:'Starter Pass: lesson',idempotencyKey:'old:lesson'});
    expect(await complete(service,a.id,'goodmayes-mock-test')).toBe(true);
    const acc=(await store.findAccount({id:a.id}))!;
    expect([acc.allowances?.lesson,acc.balance]).toEqual([0,0]);
  });

  it('the checkout address is made by the server for the signed-in account; the Starter is not offered once bought',async()=>{
    const {service,checkout}=setup();
    const a=await signUp(service,'link@example.com');
    const r=await service.checkoutUrl(a.id,'starter');
    expect('url' in r&&new URL(r.url).searchParams.get('client_reference_id')).toBe(a.id);
    expect('url' in r&&r.url.startsWith('https://buy.stripe.com/test_3cI8wHeQWfyc6Fr4Qe0VO02?')).toBe(true);
    await service.handleStripeEvent(checkout(a.id,'starter',299));
    expect(await service.checkoutUrl(a.id,'starter')).toEqual({error:'starter-bought'});
    expect('url' in await service.checkoutUrl(a.id,'vr-35')).toBe(true);
    expect(await service.checkoutUrl(a.id,'free-stuff')).toEqual({error:'unknown-pack'});
  });

  it('if Stripe refuses the automatic refund, it is flagged for a person to refund',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'refuse@example.com');
    await service.handleStripeEvent(checkout(a.id,'starter',299));
    await service.handleStripeEvent(checkout(a.id,'starter',299,{payment_intent:'pi_refuse_1'}));
    expect((await store.flags()).find(f=>f.kind==='starter-duplicate-refund-needed')?.data).toMatchObject({account:a.id,paymentIntent:'pi_refuse_1',amountPence:299});
  });

  it('a second Starter payment (the link is public) grants nothing and is refunded automatically; its refund webhook changes nothing',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'twice@example.com');
    await service.handleStripeEvent(checkout(a.id,'starter',299));
    const second=checkout(a.id,'starter',299);
    await service.handleStripeEvent(second);
    await service.handleStripeEvent(second);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(3);
    const pi=String(second.data.object['payment_intent']);
    expect(refunds.filter(r=>r===pi)).toHaveLength(1);
    expect((await store.ledger({accountId:a.id})).filter(e=>e.type==='starter_duplicate')).toHaveLength(1);
    await service.handleStripeEvent({id:'evt_dr',type:'charge.refunded',data:{object:{id:'ch_dup',payment_intent:pi,amount:299,amount_refunded:299,refunded:true,currency:'gbp'}}});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(3);
  });

  it('two Starter payments arriving at the same moment: exactly one is granted, the other refunded',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'sametime@example.com');
    const one=checkout(a.id,'starter',299),two=checkout(a.id,'starter',299);
    await Promise.all([service.handleStripeEvent(one),service.handleStripeEvent(two),service.handleStripeEvent(one),service.handleStripeEvent(two)]);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(3);
    expect((await store.ledger({accountId:a.id})).filter(e=>e.type==='starter_duplicate')).toHaveLength(1);
  });

  it('a full Starter refund takes its three sessions back, even if used (like any pack)',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'srefund@example.com');
    const ev=checkout(a.id,'starter',299);
    await service.handleStripeEvent(ev);
    await complete(service,a.id,'goodmayes-lesson');
    const refund:StripeEvent={id:'evt_sr',type:'charge.refunded',data:{object:{id:'ch_s',payment_intent:ev.data.object['payment_intent'],amount:299,amount_refunded:299,refunded:true,currency:'gbp'}}};
    await service.handleStripeEvent(refund);
    await service.handleStripeEvent({...refund,id:'evt_sr2'});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(-1);
  });

  it('existing balances and history stay as they were when the packs change',async()=>{
    const {service,store}=setup();
    const a=await signUp(service,'old@example.com');
    // An account credited under the earlier packs (a 10-session pack, before allowances existed).
    await store.appendLedger({product:'simulator',accountId:a.id,type:'purchase',sessionsDelta:10,amountPence:799,currency:'gbp',actor:'stripe',reason:'10 sessions',idempotencyKey:'checkout:cs_old'});
    expect((await service.me(a.id))).toMatchObject({balance:10,allowances:{lesson:0,test:0,free:0}});
    expect(await complete(service,a.id,'goodmayes-mock-test')).toBe(true);
    expect((await service.me(a.id))?.history.map(h=>h.type)).toEqual(['consumed','purchase']);
  });
});

describe('referrals',()=>{
  it('a person who signs up through a link gets one free drive; the referrer gets one free session after their first payment (once)',async()=>{
    const {service,checkout,store}=setup();
    const referrer=await signUp(service,'ref@example.com');
    const friend=await signUp(service,'friend@example.com',referrer.referralCode.toLowerCase());
    expect(friend.balance).toBe(1);
    expect(friend.referredBy).toBe(referrer.id);
    // The free drive is used before any payment.
    expect((await service.startDrive(friend.id,'free','goodmayes-free-drive')).ok).toBe(true);
    expect((await store.findAccount({id:referrer.id}))!.balance).toBe(0);
    await service.handleStripeEvent(checkout(friend.id,'starter',299));
    await service.handleStripeEvent(checkout(friend.id,'vr-5',999));
    expect((await store.findAccount({id:referrer.id}))!.balance).toBe(1);
    const me=await service.me(referrer.id);
    expect(me).toMatchObject({invited:1,rewarded:1});
  });

  it('a 100% promotion code does not count as the paying that rewards the referrer',async()=>{
    const {service,checkout,store}=setup();
    const referrer=await signUp(service,'r2@example.com');
    const friend=await signUp(service,'f2@example.com',referrer.referralCode);
    await service.handleStripeEvent(checkout(friend.id,'vr-5',0));
    expect((await store.findAccount({id:referrer.id}))!.balance).toBe(0);
  });

  it('no free drive for your own link, an existing account, or a new alias of an existing person',async()=>{
    const {service}=setup();
    const referrer=await signUp(service,'jo.bloggs@gmail.com');
    const existing=await signUp(service,'old@example.com');
    expect((await signUp(service,'old@example.com',referrer.referralCode)).balance).toBe(0);
    expect(existing.balance).toBe(0);
    // The referrer's own address under an alias.
    expect((await signUp(service,'jobloggs+2@gmail.com',referrer.referralCode)).balance).toBe(0);
    // An unknown code is ignored.
    expect((await signUp(service,'new@example.com','NOPE1234')).balance).toBe(0);
  });
});
