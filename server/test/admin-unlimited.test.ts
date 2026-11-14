import {describe,expect,it} from 'vitest';
import {Admin} from '../src/admin.js';
import {loadConfig} from '../src/config.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

// The admin gives unlimited drives (7 days, 30 days, a year, for life) or ends them; each is recorded once in the ledger.
describe('admin: unlimited drives',()=>{
  it('adds after what they have, lifetime stays lifetime, end stops it, a repeat records once, a reason is needed',async()=>{
    const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example'});
    const store=new MemoryStore(),service=new Service(config,store,new OutboxMailer(),fakeIdentities,fakeStripe(config)),admin=new Admin(config,store);
    const a=await service.signIn('email',{sub:'a@example.com',email:'a@example.com',emailVerified:true});
    const days=async()=>{const u=(await service.me(a.id))!.unlimitedUntil;return u?Math.round((Date.parse(u)-Date.now())/86400_000):null};
    expect(await admin.unlimited('boss@example.com',a.id,{period:'7d',reason:'',requestId:'req-00001'})).toEqual({error:'reason'});
    expect(await admin.unlimited('boss@example.com',a.id,{period:'2y',reason:'thanks',requestId:'req-00001'})).toEqual({error:'period'});
    expect(await admin.unlimited('boss@example.com',a.id,{period:'7d',reason:'thanks',requestId:'req-00001'})).toMatchObject({result:'ok'});
    expect(await admin.unlimited('boss@example.com',a.id,{period:'7d',reason:'thanks',requestId:'req-00001'})).toMatchObject({result:'duplicate'});
    expect(await days()).toBe(7);
    await admin.unlimited('boss@example.com',a.id,{period:'30d',reason:'more',requestId:'req-00002'});
    expect(await days()).toBe(37);
    await admin.unlimited('boss@example.com',a.id,{period:'life',reason:'tester',requestId:'req-00003'});
    expect((await service.me(a.id))!.unlimitedUntil).toMatch(/^9999-/);
    await admin.unlimited('boss@example.com',a.id,{period:'1y',reason:'again',requestId:'req-00004'});
    expect((await service.me(a.id))!.unlimitedUntil).toMatch(/^9999-/);
    await admin.unlimited('boss@example.com',a.id,{period:'end',reason:'left',requestId:'req-00005'});
    expect(await days()).toBe(null);
    const ledger=(await store.ledger({})).filter(e=>e.accountId===a.id&&e.idempotencyKey?.startsWith('unlimited:'));
    expect(ledger.map(e=>e.reason)).toEqual(['Unlimited for 7 days: thanks','Unlimited for 30 days: more','Unlimited for life: tester','Unlimited for 365 days: again','Unlimited ended: left']);
    expect(ledger.every(e=>e.by==='boss@example.com'&&e.amountPence===0)).toBe(true);
  });
});
