import {describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {OutboxMailer,checkouts,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service,type StripeApi} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://vr.example'});
const session=(id:string,o:Record<string,unknown>)=>({id,created:Math.floor(Date.now()/1000),payment_status:'paid',currency:'gbp',payment_intent:`pi_${id}`,customer_details:{email:null},...o});

describe('crediting does not depend on the webhook',()=>{
  it('back from paying, the server asks Stripe: a missed payment is credited once, whichever arrives first; others\' payments are not',async()=>{
    const service=new Service(config,new MemoryStore(),new OutboxMailer(),fakeIdentities,fakeStripe(config));
    const a=await service.signIn('email',{sub:'a',email:'payer@example.com',emailVerified:true});
    const b=await service.signIn('email',{sub:'b',email:'other@example.com',emailVerified:true});
    checkouts.push(session('cs_r1',{client_reference_id:a.id,payment_link:'vr-5',amount_total:999}));
    // Paid without the reference (the link opened elsewhere) from this account's email: theirs too.
    checkouts.push(session('cs_r2',{client_reference_id:null,payment_link:'vr-15',amount_total:2499,customer_details:{email:'Payer@Example.com'}}));
    // Someone else's, and an unpaid one.
    checkouts.push(session('cs_r3',{client_reference_id:b.id,payment_link:'vr-35',amount_total:4999,customer_details:{email:'payer@example.com'}}));
    checkouts.push(session('cs_r4',{client_reference_id:a.id,payment_link:'vr-5',amount_total:999,payment_status:'unpaid'}));
    expect(await service.reconcile(a.id)).toEqual({credited:2});
    expect((await service.me(a.id))!.balance).toBe(20);
    expect(await service.reconcile(a.id)).toEqual({credited:0});
    // The webhook arriving afterwards changes nothing.
    await service.handleStripeEvent({id:'evt_late',type:'checkout.session.completed',data:{object:checkouts.find(c=>c['id']==='cs_r1')!}});
    expect((await service.me(a.id))!.balance).toBe(20);
    expect((await service.me(b.id))!.balance).toBe(0);
  });

  it('Stripe cannot be asked about the link (the key cannot read Payment Links): the pack with exactly that price is credited, and it is logged',async()=>{
    const broken:StripeApi={...fakeStripe(config),async paymentLink(){throw new Error('The provided key does not have the required permissions')}};
    const service=new Service(config,new MemoryStore(),new OutboxMailer(),fakeIdentities,broken);
    const a=await service.signIn('email',{sub:'c',email:'perm@example.com',emailVerified:true});
    const object=session('cs_p1',{client_reference_id:a.id,payment_link:'plink_x',amount_total:2499});
    await service.handleStripeEvent({id:'evt_p1',type:'checkout.session.completed',data:{object}});
    expect((await service.me(a.id))!.balance).toBe(15);
    // A discounted amount matches no pack: flagged for a person, not guessed.
    await service.handleStripeEvent({id:'evt_p2',type:'checkout.session.completed',data:{object:session('cs_p2',{client_reference_id:a.id,payment_link:'plink_x',amount_total:1999})}});
    expect((await service.me(a.id))!.balance).toBe(15);
    expect((await service.store.flags()).map(f=>f.kind)).toContain('payment-unknown-pack');
  });

  it('webhook deliveries are counted for the hub, refused ones too',async()=>{
    const service=new Service(config,new MemoryStore(),new OutboxMailer(),fakeIdentities,fakeStripe(config));
    await service.stripeWebhook(Buffer.from('{}'),'wrong');
    await service.stripeWebhook(Buffer.from(JSON.stringify({id:'evt_x',type:'ping',data:{object:{}}})),'dev');
    expect(service.webhookStats).toMatchObject({received:1,refused:1});
  });
});
