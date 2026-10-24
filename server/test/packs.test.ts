import {describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

describe('the packs on sale follow the Stripe key',()=>{
  it('a live key: the four live Payment Links are sold, and a payment through one is matched to its pack',async()=>{
    const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://vr.example',STRIPE_SECRET_KEY:'rk_live_not_a_real_key'});
    expect(config.stripeMode).toBe('live');
    for(const p of config.packs)expect(p.links.live).toMatch(/^https:\/\/buy\.stripe\.com\/(?!test_)\w+$/);
    expect(new Set(config.packs.map(p=>p.links.live)).size).toBe(4);
    const service=new Service(config,new MemoryStore(),new OutboxMailer(),fakeIdentities,fakeStripe(config));
    expect(service.packs().every(p=>p.onSale)).toBe(true);
    const a=await service.signIn('email',{sub:'l',email:'live@example.com',emailVerified:true});
    const url=await service.checkoutUrl(a.id,'vr-15');
    expect('url' in url&&url.url.startsWith(config.packs.find(p=>p.id==='vr-15')!.links.live)).toBe(true);
    await service.handleStripeEvent({id:'evt_live_1',type:'checkout.session.completed',data:{object:{id:'cs_live_1',payment_status:'paid',client_reference_id:a.id,
      payment_link:'vr-15',amount_total:2499,currency:'gbp',payment_intent:'pi_live_1',customer_details:{email:null}}}});
    expect((await service.me(a.id))!.balance).toBe(15);
  });

  it('a test key: the test links are used',()=>{
    const config=loadConfig({DP_DEV_FAKES:'1',STRIPE_SECRET_KEY:'sk_test_x'});
    expect(config.stripeMode).toBe('test');
    for(const p of config.packs)expect(p.links.test).toMatch(/^https:\/\/buy\.stripe\.com\/test_/);
  });
});
