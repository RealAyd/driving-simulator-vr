import {describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service,onSale,passUntil,priceText} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

describe('the passes on sale follow the Stripe key',()=>{
  it('a live key: the two unlimited passes are sold through their live links; a session pack bought before is still recognised',async()=>{
    const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://vr.example',STRIPE_SECRET_KEY:'rk_live_not_a_real_key'});
    expect(config.stripeMode).toBe('live');
    for(const p of config.packs)expect(p.links.live).toMatch(/^https:\/\/buy\.stripe\.com\/(?!test_)\w+$/);
    const service=new Service(config,new MemoryStore(),new OutboxMailer(),fakeIdentities,fakeStripe(config));
    expect(service.packs().map(p=>[p.id,p.label])).toEqual([['black-friday-week','Weekly Unlimited Pass'],['monthly','Monthly Unlimited Pass']]);
    const a=await service.signIn('email',{sub:'l',email:'live@example.com',emailVerified:true});
    const url=await service.checkoutUrl(a.id,'monthly');
    expect('url' in url&&url.url.startsWith('https://buy.stripe.com/cNidR17ou99O6FreqO0VO0a?')).toBe(true);
    await service.handleStripeEvent({id:'evt_live_1',type:'checkout.session.completed',data:{object:{id:'cs_live_1',payment_status:'paid',client_reference_id:a.id,
      payment_link:'vr-15',amount_total:2499,currency:'gbp',payment_intent:'pi_live_1',customer_details:{email:null}}}});
    expect((await service.me(a.id))!.balance).toBe(15);
  });

  it('the Black Friday pass is sold until the end of 30 November, then not',()=>{
    const config=loadConfig({DP_DEV_FAKES:'1',STRIPE_SECRET_KEY:'rk_live_x'});
    const week=config.packs.find(p=>p.id==='black-friday-week')!;
    expect(onSale(week,'live',new Date('2026-11-30T23:00:00Z'))).toBe(true);
    expect(onSale(week,'live',new Date('2026-12-01T00:30:00Z'))).toBe(false);
    expect(onSale(config.packs.find(p=>p.id==='monthly')!,'live',new Date('2027-01-01'))).toBe(true);
  });

  it('a pass adds its time on top of time already held; prices are said plainly',()=>{
    const now=new Date('2026-11-20T12:00:00Z');
    expect(passUntil(undefined,{days:7},now).toISOString()).toBe('2026-11-27T12:00:00.000Z');
    expect(passUntil(new Date('2026-11-25T12:00:00Z'),{days:7},now).toISOString()).toBe('2026-12-02T12:00:00.000Z');
    // A month, and a day's grace for the renewal to arrive.
    expect(passUntil(undefined,{monthly:true},now).toISOString()).toBe('2026-12-21T12:00:00.000Z');
    expect(priceText({amountPence:499,currency:'gbp',interval:null})).toBe('£4.99');
    expect(priceText({amountPence:1499,currency:'gbp',interval:'month'})).toBe('£14.99 a month');
  });

  it('staging (a test key, sign-in first): the passes sold live are shown to preview, not sold',async()=>{
    const base=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.drivingpractice.live',STRIPE_SECRET_KEY:'sk_test_x'});
    // (As on staging: the passes have live links only.)
    const config={...base,packs:base.packs.map(p=>({...p,links:{...p.links,test:''}}))};
    const service=new Service(config,new MemoryStore(),new OutboxMailer(),fakeIdentities,fakeStripe(config));
    expect(service.packs().map(p=>[p.id,p.price,p.onSale,!!p.preview])).toEqual([['black-friday-week','£4.99 a week',false,!!service.packs()[0]!.preview],['monthly','£10.99 a month',false,true]]);
    const a=await service.signIn('email',{sub:'s',email:'stage@example.com',emailVerified:true});
    expect(await service.checkoutUrl(a.id,'monthly')).toEqual({error:'not-on-sale'});
  });
});
