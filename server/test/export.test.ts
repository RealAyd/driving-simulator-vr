import {mkdtempSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server-core';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {Admin} from '../src/admin.js';
import {loadConfig} from '../src/config.js';
import {cell,entryLabel,entrySource,exportAccounts,unlimitedSource,type ExportedAccount,type ExportedLedgerEntry} from '../src/exportAccounts.js';
import {redact,runExport} from '../src/exportCli.js';
import {MongoStore} from '../src/mongoStore.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service,type StripeEvent} from '../src/service.js';

const UNLIMITED=['Weekly Unlimited Pass','Monthly Unlimited Pass'];

describe('account export: where each grant came from',()=>{
  it('names the source of every entry this service writes, and unknown for any other',()=>{
    expect(entrySource('checkout:cs_1')).toBe('stripe-checkout');
    expect(entrySource('invoice:in_1')).toBe('stripe-renewal');
    expect(entrySource('refund:ch_1')).toBe('stripe-refund');
    expect(entrySource('starter-duplicate:cs_2')).toBe('stripe-refund');
    expect(entrySource('drive:d1')).toBe('drive');
    expect(entrySource('drive-refund:d1')).toBe('drive-refund');
    expect(entrySource('referral-free:a1')).toBe('referral');
    expect(entrySource('referral-bonus:a1')).toBe('referral');
    expect(entrySource('adjustment:req-1')).toBe('admin');
    expect(entrySource('unlimited:req-2')).toBe('admin');
    expect(entrySource('leader:2026-W46:goodmayes')).toBe('leaderboard');
    expect(entrySource('migration:x')).toBe('unknown');
    expect(entrySource('nokey')).toBe('unknown');
  });
  it('keeps what an entry was, never the note an admin typed',()=>{
    expect(entryLabel('adjustment:req-1','Goodwill for the outage, phoned 07700 900123')).toBe('Admin adjustment');
    expect(entryLabel('unlimited:req-2','Unlimited for 30 days: tester, lives at 1 High St')).toBe('Unlimited for 30 days');
    expect(entryLabel('checkout:cs_1','VR 5')).toBe('VR 5');
  });
  it('tells an unlimited pass by its pack, a renewal, an admin grant or a prize; sessions are not one',()=>{
    const e=(type:string,label:string,idempotencyKey:string,sessionsDelta=0)=>({type,label,idempotencyKey,sessionsDelta});
    expect(unlimitedSource(e('purchase','Monthly Unlimited Pass','checkout:cs_1'),UNLIMITED)).toBe('stripe-pass');
    expect(unlimitedSource(e('promo','Weekly Unlimited Pass','checkout:cs_2'),UNLIMITED)).toBe('stripe-promo-code');
    expect(unlimitedSource(e('purchase','Monthly Unlimited Pass renewed','invoice:in_1'),UNLIMITED)).toBe('stripe-renewal');
    expect(unlimitedSource(e('adjustment','Unlimited for life','unlimited:r1'),UNLIMITED)).toBe('admin');
    expect(unlimitedSource(e('promo','UK leader of the week (7 days unlimited)','leader:w:c'),UNLIMITED)).toBe('leaderboard');
    expect(unlimitedSource(e('purchase','VR 5','checkout:cs_3',5),UNLIMITED)).toBe(null);
    expect(unlimitedSource(e('purchase','VR 5','checkout:cs_4'),UNLIMITED)).toBe(null);
  });
  it('a spreadsheet shows every cell as typed, never as a formula',()=>{
    expect(cell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(cell('+44')).toBe("'+44");
    expect(cell('a,b')).toBe('"a,b"');
    expect(cell(null)).toBe('');
  });
  it('a database address in an error is hidden',()=>{
    expect(redact(new Error('connect failed: mongodb+srv://user:pw@host/db?x=1 timed out'))).toBe('connect failed: mongodb://*** timed out');
  });
});

// Against a real MongoDB (downloaded once, about 80 MB), with invented accounts: run with MONGO_TESTS=1.
describe.skipIf(process.env['MONGO_TESTS']!=='1')('account export against MongoDB',()=>{
  let mongo:MongoMemoryServer;
  beforeAll(async()=>{mongo=await MongoMemoryServer.create({binary:{version:'7.0.14'}})},120_000);
  afterAll(async()=>{await mongo?.stop()});

  /** Invented accounts covering each kind of access and grant; the database they are in. */
  async function seed(uri:string){
    const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example'});
    const store=await MongoStore.connect(uri);
    const service=new Service(config,store,new OutboxMailer(),fakeIdentities,fakeStripe(config)),admin=new Admin(config,store);
    let k=0;
    const checkout=(accountId:string,pack:string,amount:number,more:Record<string,unknown>={}):StripeEvent=>{k++;return {id:`evt_${k}`,type:'checkout.session.completed',
      data:{object:{id:`cs_${k}`,payment_status:'paid',client_reference_id:accountId,payment_link:pack,amount_total:amount,currency:'gbp',payment_intent:`pi_${k}`,customer_details:{email:null},...more}}}};
    const free=await service.signIn('email',{sub:'free@example.com',email:'free@example.com',emailVerified:true});
    const payer=await service.signIn('google',{sub:'g-123',email:'payer@example.com',emailVerified:true});
    await service.handleStripeEvent(checkout(payer.id,'vr-5',999));
    const monthly=await service.signIn('apple',{sub:'a-456',email:'monthly@example.com',emailVerified:true});
    await service.handleStripeEvent(checkout(monthly.id,'monthly',1099,{subscription:'sub_1',mode:'subscription'}));
    const adjusted=await service.signIn('email',{sub:'adjusted@example.com',email:'adjusted@example.com',emailVerified:true});
    await admin.adjust('boss@example.com',adjusted.id,{sessions:3,pot:null,reason:'Goodwill, phoned them on 07700 900123',requestId:'req-00001'});
    await admin.unlimited('boss@example.com',adjusted.id,{period:'7d',reason:'tester at 1 High St',requestId:'req-00002'});
    const friend=await service.signIn('email',{sub:'friend@example.com',email:'friend@example.com',emailVerified:true},payer.referralCode);
    // (A cached balance out of step with the ledger: flagged by the export, never fixed by it.)
    const raw=new MongoClient(uri);await raw.connect();
    await raw.db().collection('accounts').updateOne({_id:free.id as never},{$set:{balance:4}});
    // (And an entry of no form this service writes.)
    await raw.db().collection('ledger_entries').insertOne({_id:'odd-1' as never,product:'simulator',accountId:payer.id,type:'adjustment',sessionsDelta:0,amountPence:0,
      currency:'gbp',actor:'system',reason:'Imported by hand',idempotencyKey:'import:1',createdAt:new Date()});
    await raw.db().collection('login_codes').insertOne({_id:'code-1' as never,email:'free@example.com',tokenHash:'tok-hash-secret',codeHash:'code-hash-secret',expiresAt:new Date(),attempts:0});
    await raw.close();
    return {free,payer,monthly,adjusted,friend};
  }
  const collect=()=>{
    const files=new Map<string,string>();
    return {files,write:async(name:string,lines:AsyncIterable<string>|Iterable<string>)=>{let s='';for await(const l of lines)s+=l;files.set(name,s);return {bytes:Buffer.byteLength(s),sha256:'-'}}};
  };

  it('every account comes out, with its access, the source of each grant and its progress; nothing in the database changes',async()=>{
    const uri=mongo.getUri('dp_export_rows');
    const ids=await seed(uri);
    const client=new MongoClient(uri);await client.connect();
    const db=client.db();
    const before=await db.command({dbHash:1});
    const {files,write}=collect();
    const m=await exportAccounts(db,{unlimitedLabels:UNLIMITED,write});
    const after=await db.command({dbHash:1});
    await client.close();
    expect(after['md5']).toBe(before['md5']);
    expect(after['collections']).toEqual(before['collections']);

    const rows=files.get('accounts.jsonl')!.trim().split('\n').map(l=>JSON.parse(l) as ExportedAccount);
    expect(rows).toHaveLength(5);
    expect(m.accounts).toBe(5);
    expect(m.counts['accounts']).toBe(5);
    const by=(id:string)=>rows.find(r=>r.id===id)!;
    expect(by(ids.payer.id)).toMatchObject({email:'payer@example.com',googleSub:'g-123',appleSub:null,
      access:{sessions:5,sessionsFromLedger:5,sessionsMatch:true,unlimited:{active:false},premium:null}});
    expect(by(ids.payer.id).ledger.bySource).toMatchObject({'stripe-checkout':1,unknown:1});
    expect(by(ids.monthly.id)).toMatchObject({appleSub:'a-456',access:{sessions:0,unlimited:{active:true,subscriptions:[{id:'sub_1',pack:'monthly'}],source:'stripe-pass',sourceLabel:'Monthly Unlimited Pass'}}});
    expect(by(ids.adjusted.id)).toMatchObject({access:{sessions:3,sessionsMatch:true,unlimited:{active:true,source:'admin',sourceLabel:'Unlimited for 7 days'}}});
    expect(by(ids.friend.id)).toMatchObject({referredBy:ids.payer.id});
    expect(by(ids.free.id)).toMatchObject({access:{sessions:4,sessionsFromLedger:0,sessionsMatch:false}});
    expect(m.mismatched).toEqual([ids.free.id]);
    expect(m.totals).toMatchObject({accounts:5,unlimitedActive:2,activeSubscription:1,unknownSourceEntries:1,accountsWithUnknownSource:1,mismatched:1});

    // The ledger, every entry once, joined by account, with its source and who recorded an admin's.
    const ledger=files.get('ledger.jsonl')!.trim().split('\n').map(l=>JSON.parse(l) as ExportedLedgerEntry);
    expect(ledger).toHaveLength(m.counts['ledger_entries']!);
    expect(new Set(ledger.map(e=>e.idempotencyKey)).size).toBe(ledger.length);
    expect(ledger.find(e=>e.idempotencyKey==='adjustment:req-00001')).toMatchObject({source:'admin',label:'Admin adjustment',by:'boss@example.com',sessionsDelta:3});
    expect(ledger.find(e=>e.accountId===ids.payer.id&&e.source==='stripe-checkout')).toMatchObject({amountPence:999,stripe:{checkoutSession:expect.any(String)}});

    // Never: what an admin typed, sign-in codes, token or code hashes.
    const everything=[...files.values()].join('\n');
    for(const s of ['07700 900123','High St','tok-hash-secret','code-hash-secret','tokenHash','codeHash','marketing'])expect(everything).not.toContain(s);
    // The spreadsheet: a header and a row per account.
    expect(files.get('accounts.csv')!.trim().split('\n')).toHaveLength(6);
  },120_000);
});

// With access control on, as hosted: only a user that cannot write is allowed to export.
describe.skipIf(process.env['MONGO_TESTS']!=='1')('account export: only as a read-only database user',()=>{
  let mongo:MongoMemoryServer,root:string;
  const DB='dp_sim_export_test';
  const userUri=(user:string,pwd:string)=>{const u=new URL(mongo.getUri(DB));u.username=user;u.password=pwd;u.searchParams.set('authSource',DB);return u.toString()};
  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create({binary:{version:'7.0.14'},auth:{enable:true,customRootName:'root',customRootPwd:'root-test-only'}});
    const u=new URL(mongo.getUri(DB));u.username='root';u.password='root-test-only';u.searchParams.set('authSource','admin');root=u.toString();
    const c=new MongoClient(root);await c.connect();
    const db=c.db(DB);
    // (As on Hostless: users created in the simulator's own database, one with read only, one like the app's.)
    await db.command({createUser:'dp_sim_export',pwd:'reader-test-only',roles:[{role:'read',db:DB}]});
    await db.command({createUser:'dp_sim_app',pwd:'writer-test-only',roles:[{role:'readWrite',db:DB}]});
    await db.collection('accounts').insertOne({_id:'acc-1' as never,email:'one@example.com',balance:0,referralCode:'ONE',createdAt:new Date()});
    await c.close();
  },120_000);
  afterAll(async()=>{await mongo?.stop()});
  const out=()=>join(mkdtempSync(join(tmpdir(),'dp-export-')),'out');

  it('the read-only user exports, into files only its owner can read; it cannot write',async()=>{
    const dir=out();
    const r=await runExport(['--out',dir],{MONGODB_URI:userUri('dp_sim_export','reader-test-only')});
    expect(r).toMatchObject({readOnlyUser:true,accounts:1,database:DB});
    expect(readdirSync(dir).sort()).toEqual(['accounts.csv','accounts.jsonl','ledger.jsonl','manifest.json']);
    for(const f of readdirSync(dir))expect(statSync(join(dir,f)).mode&0o077).toBe(0);
    expect(readFileSync(join(dir,'accounts.jsonl'),'utf8')).toContain('one@example.com');
    const c=new MongoClient(userUri('dp_sim_export','reader-test-only'));await c.connect();
    await expect(c.db().collection('accounts').insertOne({_id:'x' as never})).rejects.toThrow(/not authorized/);
    await c.close();
  },60_000);

  it('a user that can write (the app\'s own), or the instance\'s administrator, is refused before anything is written',async()=>{
    for(const uri of [userUri('dp_sim_app','writer-test-only'),root]){
      const dir=out();
      await expect(runExport(['--out',dir],{MONGODB_URI:uri})).rejects.toThrow(/Refused: the database user can write/);
      expect(readdirSync(dir)).toEqual([]);
    }
  },60_000);

  it('refuses a folder inside a git repository, one already in use, or no database address',async()=>{
    await expect(runExport(['--out',join(process.cwd(),'export-out')],{MONGODB_URI:userUri('dp_sim_export','reader-test-only')})).rejects.toThrow(/inside a git repository/);
    await expect(runExport(['--out',out()],{})).rejects.toThrow(/MONGODB_URI is not set/);
    const dir=out();
    await runExport(['--out',dir],{MONGODB_URI:userUri('dp_sim_export','reader-test-only')});
    await expect(runExport(['--out',dir],{MONGODB_URI:userUri('dp_sim_export','reader-test-only')})).rejects.toThrow(/must be empty/);
  },60_000);
});
