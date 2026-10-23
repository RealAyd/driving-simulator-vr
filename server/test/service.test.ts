import {describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
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

describe('sessions: nothing is free; a drive uses one session',()=>{
  it('a new account has no sessions and cannot start a drive',async()=>{
    const {service}=setup();
    const a=await signUp(service,'new@example.com');
    expect(a.balance).toBe(0);
    expect(await service.startDrive(a.id,'lesson','goodmayes-lesson')).toEqual({ok:false,reason:'no-sessions'});
  });

  it('a paid pack adds its sessions once (a replayed webhook adds nothing); each drive uses one',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'buyer@example.com');
    const ev=checkout(a.id,'pack-10',799);
    await service.handleStripeEvent(ev);
    await service.handleStripeEvent(ev);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(10);
    const d=await service.startDrive(a.id,'mock-test','goodmayes-mock-test');
    expect(d.ok&&d.balance).toBe(9);
  });

  it('a drive that fails to load gives its session back (once); one that loaded does not',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'c@example.com');
    await service.handleStripeEvent(checkout(a.id,'starter',299));
    const d1=await service.startDrive(a.id,'free','goodmayes');
    if(!d1.ok)throw new Error();
    await service.driveStatus(a.id,d1.drive.id,'failed');
    await service.driveStatus(a.id,d1.drive.id,'failed');
    expect((await store.findAccount({id:a.id}))!.balance).toBe(3);
    const d2=await service.startDrive(a.id,'free','goodmayes');
    if(!d2.ok)throw new Error();
    await service.driveStatus(a.id,d2.drive.id,'loaded');
    await service.driveStatus(a.id,d2.drive.id,'failed');
    expect((await store.findAccount({id:a.id}))!.balance).toBe(2);
    // Another account cannot report on this drive.
    const b=await signUp(service,'d@example.com');
    expect(await service.driveStatus(b.id,d2.drive.id,'failed')).toBe(false);
  });

  it('the starter is recorded as bought; a 100% promotion code still gives the sessions (as a promo, no money)',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'p@example.com');
    await service.handleStripeEvent(checkout(a.id,'starter',299));
    expect((await store.findAccount({id:a.id}))!.starterBought).toBe(true);
    await service.handleStripeEvent(checkout(a.id,'pack-10',0));
    const ledger=await store.ledger({accountId:a.id});
    expect(ledger.map(e=>[e.type,e.sessionsDelta,e.amountPence])).toEqual([['purchase',3,299],['promo',10,0]]);
  });

  it('a payment without the account reference is matched by email, or kept for a person to sort out',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'e@example.com');
    await service.handleStripeEvent(checkout(null,'pack-10',799,{customer_details:{email:'E@example.com'}}));
    expect((await store.findAccount({id:a.id}))!.balance).toBe(10);
    await service.handleStripeEvent(checkout(null,'pack-10',799,{customer_details:{email:'nobody@example.com'}}));
    expect((await store.flags()).map(f=>f.kind)).toContain('payment-no-account');
  });

  it('an unpaid (delayed) checkout waits for async_payment_succeeded',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'f@example.com');
    const ev=checkout(a.id,'pack-10',799,{payment_status:'unpaid'});
    await service.handleStripeEvent(ev);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
    await service.handleStripeEvent({...ev,id:'evt_later',type:'checkout.session.async_payment_succeeded',data:{object:{...ev.data.object,payment_status:'paid'}}});
    expect((await store.findAccount({id:a.id}))!.balance).toBe(10);
  });

  it('a full refund takes the sessions back (the balance can go below zero); a dispute is flagged',async()=>{
    const {service,checkout,store}=setup();
    const a=await signUp(service,'g@example.com');
    const ev=checkout(a.id,'pack-10',799);
    await service.handleStripeEvent(ev);
    await service.startDrive(a.id,'free','x');
    const pi=ev.data.object['payment_intent'];
    const refund:StripeEvent={id:'evt_r',type:'charge.refunded',data:{object:{id:'ch_1',payment_intent:pi,amount:799,amount_refunded:799,refunded:true,currency:'gbp'}}};
    await service.handleStripeEvent(refund);
    await service.handleStripeEvent(refund);
    expect((await store.findAccount({id:a.id}))!.balance).toBe(-1);
    await service.handleStripeEvent({id:'evt_d',type:'charge.dispute.created',data:{object:{charge:'ch_1',amount:799,reason:'fraudulent'}}});
    expect((await store.flags()).map(f=>f.kind)).toContain('dispute');
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
    expect((await service.startDrive(friend.id,'free','goodmayes')).ok).toBe(true);
    expect((await store.findAccount({id:referrer.id}))!.balance).toBe(0);
    await service.handleStripeEvent(checkout(friend.id,'starter',299));
    await service.handleStripeEvent(checkout(friend.id,'pack-10',799));
    expect((await store.findAccount({id:referrer.id}))!.balance).toBe(1);
    const me=await service.me(referrer.id);
    expect(me).toMatchObject({invited:1,rewarded:1});
  });

  it('a 100% promotion code does not count as the paying that rewards the referrer',async()=>{
    const {service,checkout,store}=setup();
    const referrer=await signUp(service,'r2@example.com');
    const friend=await signUp(service,'f2@example.com',referrer.referralCode);
    await service.handleStripeEvent(checkout(friend.id,'pack-10',0));
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
