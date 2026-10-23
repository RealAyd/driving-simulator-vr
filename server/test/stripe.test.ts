import Stripe from 'stripe';
import {describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {stripeApi} from '../src/providers.js';

describe('Stripe webhook signatures (the real check, with a made-up secret)',()=>{
  const config={...loadConfig({DP_DEV_FAKES:'1'}),stripeSecretKey:'sk_test_dummy',stripeWebhookSecret:'whsec_test_secret'};
  const api=stripeApi(config);
  const payload=JSON.stringify({id:'evt_1',type:'checkout.session.completed',data:{object:{id:'cs_1'}}});
  it('accepts a delivery signed with the endpoint secret',()=>{
    const header=new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({payload,secret:'whsec_test_secret'});
    expect(api.constructEvent(Buffer.from(payload),header).id).toBe('evt_1');
  });
  it('refuses one signed with another secret, or altered',()=>{
    const header=new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({payload,secret:'whsec_other'});
    expect(()=>api.constructEvent(Buffer.from(payload),header)).toThrow();
    const good=new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({payload,secret:'whsec_test_secret'});
    expect(()=>api.constructEvent(Buffer.from(payload.replace('cs_1','cs_2')),good)).toThrow();
  });
});
