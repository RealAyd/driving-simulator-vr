import {createHash} from 'node:crypto';
import {createServer,type IncomingMessage,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {Premium} from '../src/premium.js';
import {MemoryPremiumStore} from '../src/premiumStore.js';
import {HttpPracticalApi,practicalBase} from '../src/practicalClient.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore} from '../src/store.js';

// The live Practical client against a fake Practical on this machine, built to the proposed contract: the browser's
// consent redirect, the code exchange with PKCE, entitlement answers good and bad, and credentials kept to the header.
const PREMIUM_TOKEN='premium-token-test-only',DEMAND_TOKEN='demand-token-test-only',CLIENT_ID='simulator-test';
const REDIRECT='https://staging.example/?practical=done';

/** The fake Practical: what it is set to answer, and every request it saw. */
const fake={
  accounts:new Map<string,unknown>(),
  codes:new Map<string,{practicalAccountId:string;challenge:string;redirect:string}>(),
  seen:[] as Array<{method:string;url:string;auth:string|undefined;body:string}>,
  /** Answer the next entitlement this way instead. */
  next:null as null|'500'|'401'|'slow'|'html',
  demand:[] as unknown[],
};
let server:Server,base='';
const read=async(req:IncomingMessage)=>{let s='';for await(const c of req)s+=c;return s};
beforeAll(async()=>{
  server=createServer(async(req,res)=>{
    const body=await read(req),url=new URL(req.url??'/','http://x');
    fake.seen.push({method:req.method??'',url:req.url??'',auth:req.headers.authorization,body});
    const json=(status:number,o:unknown)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
    // Browser consent: a learner signed in at Practical says yes (here, the account in ?as=).
    if(req.method==='GET'&&url.pathname==='/api/integrations/simulator/authorize'){
      if(url.searchParams.get('client_id')!==CLIENT_ID||url.searchParams.get('redirect_uri')!==REDIRECT||url.searchParams.get('code_challenge_method')!=='S256')return json(400,{error:'request'});
      const code=`code-${fake.codes.size+1}`;
      fake.codes.set(code,{practicalAccountId:url.searchParams.get('as')??'p-1',challenge:url.searchParams.get('code_challenge')!,redirect:REDIRECT});
      const back=new URL(REDIRECT);back.searchParams.set('state',url.searchParams.get('state')!);back.searchParams.set('code',code);
      res.writeHead(302,{Location:back.toString()});return res.end();
    }
    const auth=req.headers.authorization;
    if(req.method==='POST'&&url.pathname==='/api/integrations/simulator/link/exchange'){
      if(auth!==`Bearer ${PREMIUM_TOKEN}`)return json(401,{error:'auth'});
      const b=JSON.parse(body) as {code:string;code_verifier:string;redirect_uri:string;client_id:string};
      const c=fake.codes.get(b.code);fake.codes.delete(b.code);
      const ok=!!c&&b.client_id===CLIENT_ID&&b.redirect_uri===c.redirect&&createHash('sha256').update(b.code_verifier).digest('base64url')===c.challenge;
      return ok?json(200,{practicalAccountId:c!.practicalAccountId}):json(400,{error:'invalid_grant'});
    }
    if(req.method==='POST'&&url.pathname==='/api/integrations/simulator/entitlement'){
      const mode=fake.next;fake.next=null;
      if(mode==='slow'){await new Promise(r=>setTimeout(r,300));return json(200,{})}
      if(mode==='500')return json(500,{error:'down'});
      if(mode==='html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<html>')}
      if(mode==='401'||auth!==`Bearer ${PREMIUM_TOKEN}`)return json(401,{error:'auth'});
      const {practicalAccountId}=JSON.parse(body) as {practicalAccountId:string};
      return json(200,fake.accounts.get(practicalAccountId)??{type:'none',status:'inactive',expiry:{kind:'unknown'},checkedAt:new Date().toISOString()});
    }
    if(req.method==='GET'&&url.pathname==='/api/integrations/simulator/centre-demand'){
      if(auth!==`Bearer ${DEMAND_TOKEN}`)return json(401,{error:'auth'});
      return json(200,fake.demand);
    }
    json(404,{error:'not-found'});
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(()=>server.close());

const client=(o:Partial<ConstructorParameters<typeof HttpPracticalApi>[0]>={})=>new HttpPracticalApi({base,clientId:CLIENT_ID,redirectUri:REDIRECT,
  premiumToken:PREMIUM_TOKEN,demandToken:DEMAND_TOKEN,timeoutMs:150,...o});
const now=()=>new Date().toISOString();
const learnerPremium=(expiry:unknown)=>({type:'learner_premium',status:'active',expiry,checkedAt:now()});

/** A Service with Premium on, against the fake Practical through the live client. */
function setup(api=client()){
  const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example'});
  const store=new MemoryStore(),premium=new Premium(new MemoryPremiumStore(),api,{premiumFirst:[],generalAvailability:false,noticeSecret:null});
  const service=new Service(config,store,new OutboxMailer(),fakeIdentities,fakeStripe(config));service.premium=premium;
  return {service,premium,store};
}
/** As the browser does: to Practical's consent address, back with the state and code; then the server finishes it. */
async function link(premium:Premium,accountId:string,as:string){
  const s=await premium.startLink(accountId,REDIRECT);
  const res=await fetch(`${s.authorizeUrl}&as=${as}`,{redirect:'manual'});
  const back=new URL(res.headers.get('location')!);
  expect(back.searchParams.get('state')).toBe(s.state);
  return premium.finishLink(accountId,back.searchParams.get('state')!,back.searchParams.get('code')!);
}

describe('the live Practical client (proposed contract, against a fake Practical)',()=>{
  it('Practical only over https (or this machine, for tests); no credentials or query in its address',()=>{
    expect(practicalBase('https://api.practical.example/')).toBe('https://api.practical.example');
    expect(practicalBase('http://127.0.0.1:9000')).toBe('http://127.0.0.1:9000');
    expect(()=>practicalBase('http://api.practical.example')).toThrow(/https/);
    expect(()=>practicalBase('https://user:pw@api.practical.example')).toThrow(/plain/);
    expect(()=>practicalBase('https://api.practical.example/?key=x')).toThrow(/plain/);
  });

  it('links through Practical\'s consent: state round trip, PKCE checked by Practical, the code used once',async()=>{
    const {service,premium}=setup();
    const a=await service.signIn('email',{sub:'l@example.com',email:'l@example.com',emailVerified:true});
    const s=await premium.startLink(a.id,REDIRECT);
    const url=new URL(s.authorizeUrl);
    expect(url.origin+url.pathname).toBe(`${base}/api/integrations/simulator/authorize`);
    expect(Object.fromEntries(url.searchParams)).toEqual({state:s.state,code_challenge:s.codeChallenge,code_challenge_method:'S256',redirect_uri:REDIRECT,client_id:CLIENT_ID});
    expect(s.authorizeUrl).not.toContain(PREMIUM_TOKEN);
    const res=await fetch(`${s.authorizeUrl}&as=p-1`,{redirect:'manual'}),back=new URL(res.headers.get('location')!);
    const code=back.searchParams.get('code')!;
    expect(await premium.finishLink(a.id,s.state,code)).toEqual({ok:true,practicalAccountId:'p-1'});
    // (The exchange went server to server, the credential in the header, the verifier and client in the body.)
    const ex=fake.seen.filter(r=>r.url.endsWith('/link/exchange')).at(-1)!;
    expect(ex.auth).toBe(`Bearer ${PREMIUM_TOKEN}`);
    expect(JSON.parse(ex.body)).toMatchObject({code,client_id:CLIENT_ID,redirect_uri:REDIRECT,code_verifier:expect.any(String)});
    // A code used again is refused, and a fresh link with someone else's code fails at Practical's PKCE check.
    const b=await service.signIn('email',{sub:'m@example.com',email:'m@example.com',emailVerified:true});
    const sb=await premium.startLink(b.id,REDIRECT);
    expect(await premium.finishLink(b.id,sb.state,code)).toEqual({ok:false,reason:'code'});
    const other=await fetch(`${(await premium.startLink(a.id,REDIRECT)).authorizeUrl}&as=p-9`,{redirect:'manual'});
    const stolen=new URL(other.headers.get('location')!).searchParams.get('code')!;
    const sc=await premium.startLink(b.id,REDIRECT);
    expect(await premium.finishLink(b.id,sc.state,stolen)).toEqual({ok:false,reason:'code'});
  });

  it('a launch asks Practical: verified Premium (a date ahead, or never) opens unlimited drives; nothing is used',async()=>{
    const {service,premium,store}=setup();
    for(const [i,expiry] of [{kind:'at',at:new Date(Date.now()+86400_000).toISOString()},{kind:'never'}].entries()){
      const a=await service.signIn('email',{sub:`p${i}@example.com`,email:`p${i}@example.com`,emailVerified:true});
      fake.accounts.set(`prem-${i}`,learnerPremium(expiry));
      expect(await link(premium,a.id,`prem-${i}`)).toMatchObject({ok:true});
      const r=await service.startDrive(a.id,'free','goodmayes-free-drive');
      expect(r).toMatchObject({ok:true,drive:{paidFrom:'premium'}});
      if(r.ok)await service.driveStatus(a.id,r.drive.id,'completed');
      expect((await store.findAccount({id:a.id}))!.balance).toBe(0);
    }
    const ent=fake.seen.filter(r=>r.url.endsWith('/entitlement')).at(-1)!;
    expect(ent.auth).toBe(`Bearer ${PREMIUM_TOKEN}`);
    expect(ent.url).toBe('/api/integrations/simulator/entitlement');
  });

  it('unknown end, an instructor, or an answer Practical cannot give: nothing granted, the learner asked first',async()=>{
    const {service,premium}=setup();
    const a=await service.signIn('email',{sub:'u@example.com',email:'u@example.com',emailVerified:true});
    expect(await link(premium,a.id,'u-1')).toMatchObject({ok:true});
    fake.accounts.set('u-1',learnerPremium({kind:'unknown'}));
    expect(await service.startDrive(a.id,'free','goodmayes-free-drive')).toEqual({ok:false,reason:'premium-unconfirmed'});
    fake.accounts.set('u-1',{type:'instructor',status:'active',expiry:{kind:'never'},checkedAt:now()});
    expect(await service.startDrive(a.id,'free','goodmayes-free-drive')).toEqual({ok:false,reason:'no-sessions'});
    fake.accounts.set('u-1',learnerPremium({kind:'never'}));
    for(const mode of ['500','401','slow','html'] as const){
      fake.next=mode;
      expect(await service.startDrive(a.id,'free','goodmayes-free-drive'),mode).toEqual({ok:false,reason:'premium-unconfirmed'});
    }
    // (And a malformed answer: a bare null end.)
    fake.accounts.set('u-1',{type:'learner_premium',status:'active',expiresAt:null,checkedAt:now()});
    expect(await service.startDrive(a.id,'free','goodmayes-free-drive')).toEqual({ok:false,reason:'premium-unconfirmed'});
  });

  it('a wrong credential is refused by Practical and grants nothing; no credential ever appears in an error',async()=>{
    const api=client({premiumToken:'wrong-token'});
    const errors:string[]=[];
    for(const f of [()=>api.entitlement('p-1'),()=>api.exchangeCode('x','y'),()=>client({demandToken:'wrong'}).centreDemand(),
      ()=>client({base:'http://127.0.0.1:1'}).entitlement('p-1')])await f().then(()=>{throw new Error('should fail')},(e:Error)=>errors.push(e.message));
    expect(errors).toEqual(['Practical answered 401','Practical answered 401','Practical answered 401','Practical unreachable (network)']);
    for(const e of errors)expect(e).not.toMatch(/token|Bearer/i);
  });

  it('test-centre requests with their own credential only, then cut to what the simulator may see',async()=>{
    fake.demand=[{centre:'Hendon',area:'NW9',requests:5,firstAt:'2026-11-02T08:00:00Z',lastAt:'2026-11-03T09:00:00Z',email:'x@y.z'}];
    const {premium}=setup();
    expect(await premium.centreDemand()).toEqual([{centre:'Hendon',area:'NW9',requests:5,firstAt:'2026-11-02',lastAt:'2026-11-03'}]);
    expect(fake.seen.filter(r=>r.url.endsWith('/centre-demand')).at(-1)!.auth).toBe(`Bearer ${DEMAND_TOKEN}`);
    expect(await setup(client({demandToken:null})).premium.centreDemand()).toBe(null);
  });
});

describe('the switch: off by default; live Practical only on staging, every credential set; never on production yet',()=>{
  const live={PRACTICAL_API_BASE:'https://api.practical.example',PRACTICAL_CLIENT_ID:'sim',PRACTICAL_PREMIUM_TOKEN:'t',PRACTICAL_NOTICE_SECRET:'n'};
  const hosted=(base:string,o:Record<string,string>={})=>loadConfig({PRACTICAL_PREMIUM:'1',APP_BASE_URL:base,STRIPE_SECRET_KEY:'sk_test_x',STRIPE_WEBHOOK_SECRET:'w',
    RESEND_API_KEY:'r',MONGODB_URI:'mongodb://x',SESSION_SECRET:'s'.repeat(40),...o});
  it('off unless PRACTICAL_PREMIUM=1',()=>{
    expect(loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://x.example',...live}).practicalPremium).toBe(null);
  });
  it('production refused, whatever is set',()=>{
    expect(()=>hosted('https://vr.drivingpractice.live',live)).toThrow(/staging only/);
  });
  it('staging: refused until every credential is set, naming what is missing (never their values)',()=>{
    expect(()=>hosted('https://staging.drivingpractice.live',{PRACTICAL_API_BASE:'https://api.practical.example'}))
      .toThrow('PRACTICAL_PREMIUM on staging needs PRACTICAL_CLIENT_ID, PRACTICAL_PREMIUM_TOKEN, PRACTICAL_NOTICE_SECRET');
    expect(hosted('https://staging.drivingpractice.live',live).practicalPremium?.live).toEqual({base:'https://api.practical.example',clientId:'sim',premiumToken:'t',demandToken:null});
  });
  it('local fakes: the mock unless a live Practical is named, then all of it is needed',()=>{
    expect(loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'http://localhost:4173',PRACTICAL_PREMIUM:'1'}).practicalPremium?.live).toBe(null);
    expect(()=>loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'http://localhost:4173',PRACTICAL_PREMIUM:'1',PRACTICAL_API_BASE:'http://127.0.0.1:9'})).toThrow(/needs PRACTICAL_CLIENT_ID/);
  });
});
