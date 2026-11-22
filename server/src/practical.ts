import {createHmac,timingSafeEqual} from 'node:crypto';

/**
 * The Practical backend, as the simulator's server sees it. PROVISIONAL: the Practical builders supply the real
 * account-linking, Premium eligibility and test-centre request contract after Release 1; these shapes are what the
 * simulator needs from it, and only the mock below implements them. No live client exists, and the feature cannot be
 * turned on outside local fakes until one does (config.ts).
 */

/** What Practical says about an account's entitlement. Only a learner Premium counts here (`premiumConfirmed`). */
export interface PracticalEntitlement{
  /** 'learner_premium': a learner's Premium, native, web or a manual grant. Anything else (an instructor's access,
   * the free instructor app) never opens the simulator. */
  type:'learner_premium'|'instructor'|'none'|string;
  status:'active'|'inactive'|string;
  /** When it ends, as Practical recorded it (null: no end given, which does not count as active). */
  expiresAt:Date|null;
}

/** One test centre's requests, as the simulator may see them: no requester, no email, no free text. */
export interface CentreDemand{centre:string;area:string;requests:number;firstAt:string;lastAt:string}

export interface PracticalApi{
  /** The learner's sign-in to Practical, finished: a one-time code and the PKCE verifier for the verified account id. */
  exchangeCode(code:string,verifier:string):Promise<{practicalAccountId:string}>;
  /** Now, for one linked account. Throws when Practical cannot be asked or answers out of shape. */
  entitlement(practicalAccountId:string):Promise<PracticalEntitlement>;
  /** New "Request my test centre" demand, sanitised by Practical. */
  centreDemand():Promise<unknown[]>;
}

/** Only an active learner Premium with an end after now: an instructor's access, an expired or open-ended one, never. */
export function premiumConfirmed(e:PracticalEntitlement,now=new Date()):boolean{
  return e.type==='learner_premium'&&e.status==='active'&&e.expiresAt instanceof Date&&e.expiresAt.getTime()>now.getTime();
}

/** How long a signed notice from Practical stays acceptable (ms): older ones are replays. */
export const NOTICE_WINDOW_MS=5*60_000;

/**
 * A notice from Practical (Premium changed for an account), signed with the shared secret over `<timestamp>.<body>`
 * (HMAC-SHA256, hex). Returns the account it names, or null: unsigned, wrong signature, too old or out of shape.
 * A notice grants nothing: it only starts a fresh check.
 */
export function verifyNotice(body:string,timestamp:string|undefined,signature:string|undefined,secret:string|null,now=Date.now()):{practicalAccountId:string}|null{
  if(!secret||!timestamp||!signature||!/^\d{10,13}$/.test(timestamp)||!/^[0-9a-f]{64}$/.test(signature))return null;
  const at=timestamp.length<=10?Number(timestamp)*1000:Number(timestamp);
  if(Math.abs(now-at)>NOTICE_WINDOW_MS)return null;
  const want=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest();
  const got=Buffer.from(signature,'hex');
  if(got.length!==want.length||!timingSafeEqual(got,want))return null;
  try{
    const o=JSON.parse(body) as {practicalAccountId?:unknown};
    return typeof o.practicalAccountId==='string'&&/^[\w-]{1,100}$/.test(o.practicalAccountId)?{practicalAccountId:o.practicalAccountId}:null;
  }catch{return null}
}

/** Only the fields named in CentreDemand, of the right kinds; anything else Practical sends is dropped. */
export function cleanDemand(rows:unknown[]):CentreDemand[]{
  const out:CentreDemand[]=[];
  for(const r of rows){
    if(!r||typeof r!=='object')continue;
    const o=r as Record<string,unknown>;
    const text=(v:unknown,n:number)=>typeof v==='string'&&v.trim()?v.trim().slice(0,n):null;
    const centre=text(o['centre'],120),area=text(o['area'],12),first=text(o['firstAt'],40),last=text(o['lastAt'],40);
    const requests=typeof o['requests']==='number'&&Number.isInteger(o['requests'])&&o['requests']>0?o['requests']:null;
    if(centre&&area&&first&&last&&requests&&!Number.isNaN(Date.parse(first))&&!Number.isNaN(Date.parse(last)))
      out.push({centre,area,requests,firstAt:new Date(first).toISOString(),lastAt:new Date(last).toISOString()});
  }
  return out;
}

/** Local fakes and tests: a Practical whose answers are set by hand. */
export class MockPracticalApi implements PracticalApi{
  /** code → the Practical account it signs in. */
  readonly codes=new Map<string,{practicalAccountId:string;verifier?:string}>();
  /** account → its entitlement, or 'error' (Practical cannot be asked). */
  readonly entitlements=new Map<string,PracticalEntitlement|'error'>();
  demand:unknown[]=[];
  calls=0;
  async exchangeCode(code:string,verifier:string){
    const c=this.codes.get(code);
    if(!c||(c.verifier&&c.verifier!==verifier))throw new Error('invalid code');
    this.codes.delete(code);
    return {practicalAccountId:c.practicalAccountId};
  }
  async entitlement(practicalAccountId:string){
    this.calls++;
    const e=this.entitlements.get(practicalAccountId);
    if(e==='error')throw new Error('Practical unreachable');
    return e??{type:'none',status:'inactive',expiresAt:null};
  }
  async centreDemand(){return this.demand}
}
