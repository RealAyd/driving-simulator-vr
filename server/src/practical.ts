import {createHmac,timingSafeEqual} from 'node:crypto';

/**
 * The Practical backend, as the simulator's server sees it. PROPOSED: follows the draft contract
 * (RealAyd/Driving-Practice, handover/practical-web-shared-account-migration,
 * docs/RELEASE2-SIMULATOR-PRACTICAL-API-CONTRACT.md), not yet agreed or built on Practical's side. Only the mock below
 * implements it; the feature cannot be turned on outside local fakes until a live client exists (config.ts).
 */

/** When an entitlement ends, said outright: a date, verified never, or not known (which never opens anything). */
export type Expiry={kind:'at';at:string}|{kind:'never'}|{kind:'unknown'};

/** What Practical says about an account, already resolved from its independent grants (web, native, manual, legacy). */
export interface PracticalEntitlement{
  /** 'learner_premium' only opens the simulator; an instructor's access never does. */
  type:'learner_premium'|'instructor'|'none';
  status:'active'|'inactive'|'unknown';
  expiry:Expiry;
  /** When Practical worked it out (UTC). An answer not made just now is stale and opens nothing. */
  checkedAt:string;
}

/** One test centre's requests, as the simulator may see them: no requester, no email, no free text; days, not times. */
export interface CentreDemand{centre:string;area:string;requests:number;firstAt:string;lastAt:string}
/** Fewer requests than this for a centre are not shown: a handful could point to who asked. */
export const MIN_DEMAND=3;

export interface PracticalApi{
  /** Where the learner's browser goes to consent at Practical (its address for this state and PKCE challenge). */
  authorizeUrl(p:{state:string;codeChallenge:string;redirectUri:string}):string;
  /** The learner's consent at Practical, finished: a one-time code and the PKCE verifier, for the verified account id. */
  exchangeCode(code:string,verifier:string):Promise<{practicalAccountId:string}>;
  /** Now, for one linked account: Practical's answer as it came (parseEntitlement checks it). Throws when unreachable. */
  entitlement(practicalAccountId:string):Promise<unknown>;
  /** New "Request my test centre" demand, sanitised by Practical. */
  centreDemand():Promise<unknown[]>;
}

/** How old Practical's answer may be (ms), and how far ahead of the simulator's clock it may say it was made. */
export const FRESH_MS=60_000,CLOCK_SKEW_MS=5_000;

/** Practical's answer, checked field by field: null when anything is missing, of another kind or out of range. */
export function parseEntitlement(raw:unknown):PracticalEntitlement|null{
  if(!raw||typeof raw!=='object')return null;
  const o=raw as Record<string,unknown>,x=o['expiry'] as Record<string,unknown>|undefined;
  const type=o['type'],status=o['status'],checkedAt=o['checkedAt'];
  if(type!=='learner_premium'&&type!=='instructor'&&type!=='none')return null;
  if(status!=='active'&&status!=='inactive'&&status!=='unknown')return null;
  if(typeof checkedAt!=='string'||!isoDate(checkedAt))return null;
  if(!x||typeof x!=='object')return null;
  let expiry:Expiry;
  if(x['kind']==='never')expiry={kind:'never'};
  else if(x['kind']==='unknown')expiry={kind:'unknown'};
  else if(x['kind']==='at'&&typeof x['at']==='string'&&isoDate(x['at']))expiry={kind:'at',at:x['at']};
  else return null;
  return {type,status,expiry,checkedAt};
}
const isoDate=(s:string)=>/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(s)&&!Number.isNaN(Date.parse(s));

/**
 * Learner Premium, confirmed: a learner Premium, active, worked out just now, ending at a time still ahead or verified
 * never to end. An instructor's access, an unknown status or end, an expired one or a stale answer: never.
 */
export function premiumConfirmed(e:PracticalEntitlement,now=new Date()):boolean{
  if(e.type!=='learner_premium'||e.status!=='active')return false;
  const age=now.getTime()-Date.parse(e.checkedAt);
  if(age>FRESH_MS||age< -CLOCK_SKEW_MS)return false;
  if(e.expiry.kind==='never')return true;
  return e.expiry.kind==='at'&&Date.parse(e.expiry.at)>now.getTime();
}

/** How long a signed notice from Practical stays acceptable (ms): older ones are refused. */
export const NOTICE_WINDOW_MS=5*60_000;

/**
 * A notice from Practical (Premium changed for an account): `{eventId, practicalAccountId}`, signed with the shared
 * secret over `<timestamp>.<raw body>` (HMAC-SHA256, hex; X-DP-Timestamp, X-DP-Signature). Null: unsigned, wrong
 * signature, outside the window or out of shape. Replays inside the window are stopped by eventId (premium.ts).
 * A notice grants nothing: it only starts a fresh check.
 */
export function verifyNotice(body:string,timestamp:string|undefined,signature:string|undefined,secret:string|null,now=Date.now()):{eventId:string;practicalAccountId:string}|null{
  if(!secret||!timestamp||!signature||!/^\d{10,13}$/.test(timestamp)||!/^[0-9a-f]{64}$/.test(signature))return null;
  const at=timestamp.length<=10?Number(timestamp)*1000:Number(timestamp);
  if(Math.abs(now-at)>NOTICE_WINDOW_MS)return null;
  const want=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest();
  const got=Buffer.from(signature,'hex');
  if(got.length!==want.length||!timingSafeEqual(got,want))return null;
  try{
    const o=JSON.parse(body) as {eventId?:unknown;practicalAccountId?:unknown};
    const id=(v:unknown)=>typeof v==='string'&&/^[\w-]{1,100}$/.test(v);
    return id(o.eventId)&&id(o.practicalAccountId)?{eventId:o.eventId as string,practicalAccountId:o.practicalAccountId as string}:null;
  }catch{return null}
}

/**
 * Only the fields named in CentreDemand, of the right kinds; anything else Practical sends is dropped. Dates are cut to
 * the day (UTC), centres with fewer than MIN_DEMAND requests are left out (Practical should already do both), and the
 * most requested come first.
 */
export function cleanDemand(rows:unknown[]):CentreDemand[]{
  const out:CentreDemand[]=[];
  for(const r of rows){
    if(!r||typeof r!=='object')continue;
    const o=r as Record<string,unknown>;
    const text=(v:unknown,n:number)=>typeof v==='string'&&v.trim()?v.trim().slice(0,n):null;
    const centre=text(o['centre'],120),area=text(o['area'],12),first=text(o['firstAt'],40),last=text(o['lastAt'],40);
    const requests=typeof o['requests']==='number'&&Number.isInteger(o['requests'])&&o['requests']>0?o['requests']:null;
    if(centre&&area&&first&&last&&requests&&requests>=MIN_DEMAND&&!Number.isNaN(Date.parse(first))&&!Number.isNaN(Date.parse(last)))
      out.push({centre,area,requests,firstAt:new Date(first).toISOString().slice(0,10),lastAt:new Date(last).toISOString().slice(0,10)});
  }
  return out.sort((a,b)=>b.requests-a.requests||a.centre.localeCompare(b.centre));
}

/**
 * One of a Practical account's independent grants, as the mock keeps them (Practical's own resolver works these out
 * from web orders, RevenueCat, manual and legacy records; the simulator only ever sees the resolved answer).
 */
export interface MockGrant{
  source:'stripe_web'|'revenuecat'|'admin_manual'|'legacy';
  type:'learner_premium'|'instructor';
  /** 'revoked': refunded or cancelled (that source only). */
  state:'active'|'revoked';
  expiry:Expiry;
}

/**
 * The mock's stand-in for Practical's resolver: learner Premium while any one learner grant is active and has not
 * ended, whatever happened to the others (a refund revokes only its own source). A grant whose end is unknown proves
 * nothing; with no other evidence the answer is status unknown.
 */
export function mockResolve(grants:readonly MockGrant[],now:Date):PracticalEntitlement{
  const checkedAt=now.toISOString();
  const live=(g:MockGrant)=>g.state==='active'&&(g.expiry.kind==='never'||g.expiry.kind==='at'&&Date.parse(g.expiry.at)>now.getTime());
  const learner=grants.filter(g=>g.type==='learner_premium'&&live(g));
  if(learner.some(g=>g.expiry.kind==='never'))return {type:'learner_premium',status:'active',expiry:{kind:'never'},checkedAt};
  if(learner.length){
    const at=learner.map(g=>(g.expiry as {at:string}).at).sort().at(-1)!;
    return {type:'learner_premium',status:'active',expiry:{kind:'at',at},checkedAt};
  }
  if(grants.some(g=>g.type==='learner_premium'&&g.state==='active'&&g.expiry.kind==='unknown'))
    return {type:'learner_premium',status:'unknown',expiry:{kind:'unknown'},checkedAt};
  if(grants.some(g=>g.type==='instructor'&&live(g)))return {type:'instructor',status:'active',expiry:{kind:'unknown'},checkedAt};
  return {type:'none',status:'inactive',expiry:{kind:'unknown'},checkedAt};
}

/** The kinds of Practical account the mock's consent page offers. */
export const MOCK_KINDS=['monthly','lifetime','expired-plus-manual','instructor','none','unreachable'] as const;
export type MockKind=typeof MOCK_KINDS[number];

/** Local fakes and tests: a Practical whose accounts, grants and answers are set by hand. */
export class MockPracticalApi implements PracticalApi{
  /** code → the Practical account it signs in. */
  readonly codes=new Map<string,{practicalAccountId:string;verifier?:string}>();
  /** account → its grants (resolved as Practical would), or 'error' (unreachable), or a raw answer as given. */
  readonly accounts=new Map<string,MockGrant[]|'error'|{raw:unknown}>();
  demand:unknown[]=[];
  calls=0;
  constructor(private readonly now:()=>Date=()=>new Date()){}
  /** Local fakes: the mock's own consent page (http.ts, dev fakes only). */
  authorizeUrl(p:{state:string;codeChallenge:string;redirectUri:string}){
    const q=new URLSearchParams({state:p.state,code_challenge:p.codeChallenge,code_challenge_method:'S256',redirect_uri:p.redirectUri});
    return `/api/practical/mock/authorize?${q}`;
  }
  /** Local fakes: a Practical account of one of these kinds, signed in by a new one-time code (for the consent page). */
  consent(kind:MockKind):string{
    const id=`mock-${kind}-${Math.random().toString(36).slice(2,10)}`,code=`code-${Math.random().toString(36).slice(2,14)}`;
    const day=86400_000,at=(d:number)=>({kind:'at' as const,at:new Date(this.now().getTime()+d*day).toISOString()});
    const grants:Record<MockKind,MockGrant[]|'error'>={
      monthly:[{source:'stripe_web',type:'learner_premium',state:'active',expiry:at(30)}],
      lifetime:[{source:'admin_manual',type:'learner_premium',state:'active',expiry:{kind:'never'}}],
      'expired-plus-manual':[{source:'revenuecat',type:'learner_premium',state:'active',expiry:at(-3)},{source:'admin_manual',type:'learner_premium',state:'active',expiry:{kind:'never'}}],
      instructor:[{source:'stripe_web',type:'instructor',state:'active',expiry:at(30)}],
      none:[],
      unreachable:'error',
    };
    this.accounts.set(id,grants[kind]);this.codes.set(code,{practicalAccountId:id});
    return code;
  }
  async exchangeCode(code:string,verifier:string){
    const c=this.codes.get(code);
    if(!c||(c.verifier&&c.verifier!==verifier))throw new Error('invalid code');
    this.codes.delete(code);
    return {practicalAccountId:c.practicalAccountId};
  }
  async entitlement(practicalAccountId:string):Promise<unknown>{
    this.calls++;
    const a=this.accounts.get(practicalAccountId);
    if(a==='error')throw new Error('Practical unreachable');
    if(a&&!Array.isArray(a))return a.raw;
    return mockResolve(a??[],this.now());
  }
  async centreDemand(){return this.demand}
}
