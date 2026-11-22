import {createHash,randomBytes} from 'node:crypto';
import {NOTICE_WINDOW_MS,cleanDemand,parseEntitlement,premiumConfirmed,verifyNotice,type CentreDemand,type PracticalApi} from './practical.js';
import type {PremiumStore} from './premiumStore.js';

/**
 * Practical Premium in the simulator (Release 2, off unless PRACTICAL_PREMIUM=1): a learner's active Premium opens
 * unlimited sessions while Practical says it is active, checked afresh at each launch. It is never a credit, a pass or
 * a copied flag: balances, Starter allowances, unlimitedUntil, subscriptions and the ledger are not touched here.
 * A check that fails grants nothing: there is no grace period and no stored check opens a later drive.
 */

/** How long linking may take between leaving for Practical's sign-in and coming back (ms). */
export const LINK_STATE_MS=10*60_000;
/** How long Practical has to answer a check before it counts as not confirmed (ms). */
export const CHECK_TIMEOUT_MS=5_000;

export interface PremiumOptions{
  /** Scenario ids that open first to verified learner Premium (new challenges). */
  premiumFirst:readonly string[];
  /** The owner's switch: those scenarios open to everyone (general availability). */
  generalAvailability:boolean;
  /** Shared secret for Practical's signed notices; null: notices refused. */
  noticeSecret:string|null;
}

/** What a launch may do: Premium confirmed now (and the check that said so), or why not. */
export type AtLaunch={state:'confirmed';checkId:string}|{state:'unlinked'}|{state:'inactive';checkId:string}|{state:'unconfirmed';checkId:string};

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const b64url=(b:Buffer)=>b.toString('base64url');

export class Premium{
  constructor(private readonly store:PremiumStore,readonly api:PracticalApi,private readonly options:PremiumOptions,
    private readonly now:()=>Date=()=>new Date()){}

  /** Linking, begun by the signed-in learner: a one-time state and the PKCE challenge to send to Practical's sign-in. */
  async startLink(accountId:string,redirectUri='/'):Promise<{state:string;codeChallenge:string;codeChallengeMethod:'S256';authorizeUrl:string}>{
    const state=b64url(randomBytes(32)),verifier=b64url(randomBytes(48));
    await this.store.saveState({stateHash:sha(state),accountId,verifier,expiresAt:new Date(this.now().getTime()+LINK_STATE_MS)});
    const codeChallenge=b64url(createHash('sha256').update(verifier).digest());
    return {state,codeChallenge,codeChallengeMethod:'S256',authorizeUrl:this.api.authorizeUrl({state,codeChallenge,redirectUri})};
  }

  /** What the app needs to show: the scenarios open first to Premium (none once the owner opens them to everyone). */
  get premiumFirstList():readonly string[]{return this.options.generalAvailability?[]:this.options.premiumFirst}

  /** For the admin hub: links now, and the last `days` days of checks (Premium drives are the confirmed launches). */
  async report(days=30){
    const since=new Date(this.now().getTime()-days*86400_000);
    return {linked:await this.store.linkCount(),days,checks:await this.store.checkCounts(since)};
  }

  /**
   * Back from Practical's sign-in: the state (once, for this same account, in time) and the code, exchanged server to
   * server for the verified Practical account. No email is matched: this is the only way accounts are linked.
   */
  async finishLink(accountId:string,state:string,code:string):Promise<{ok:true;practicalAccountId:string}|{ok:false;reason:'state'|'code'|'taken'}>{
    const s=await this.store.takeState(sha(state),this.now());
    if(!s||s.accountId!==accountId)return {ok:false,reason:'state'};
    let practicalAccountId:string;
    try{({practicalAccountId}=await this.api.exchangeCode(code,s.verifier))}catch{return {ok:false,reason:'code'}}
    const at=this.now();
    if(await this.store.link({accountId,practicalAccountId,linkedAt:at,consentAt:at})==='taken')return {ok:false,reason:'taken'};
    return {ok:true,practicalAccountId};
  }

  /** Unlinked: Premium ends for this account at once; nothing bought is touched. */
  unlink(accountId:string){return this.store.unlink(accountId)}

  /**
   * Asks Practical now, records the answer, and says what it allows. 'confirmed': an active learner Premium (premiumConfirmed).
   * 'inactive': Practical said plainly there is none (no Premium, an instructor's access, ended). 'unconfirmed': it
   * could not say: unreachable, too slow, an answer out of shape or stale, or a status or end it does not know. Only
   * 'confirmed' opens anything, and only for this launch.
   */
  async check(accountId:string,reason:'launch'|'notice'|'status'):Promise<AtLaunch>{
    const link=await this.store.findLink({accountId});
    if(!link)return {state:'unlinked'};
    const at=this.now(),base={accountId,practicalAccountId:link.practicalAccountId,at,reason};
    const failed=async(error:string)=>{
      const c=await this.store.recordCheck({...base,result:'error',type:null,status:null,expiry:null,expiresAt:null,error});
      return {state:'unconfirmed' as const,checkId:c.id};
    };
    let raw:unknown;
    try{
      raw=await Promise.race([this.api.entitlement(link.practicalAccountId),
        new Promise<never>((_,fail)=>{setTimeout(()=>fail(new Error('timeout')),CHECK_TIMEOUT_MS).unref?.()})]);
    }catch(err){return failed(String(err instanceof Error?err.message:err).slice(0,120))}
    const e=parseEntitlement(raw);
    if(!e)return failed('malformed');
    const ok=premiumConfirmed(e,at);
    // (Plainly none: no Premium, an instructor's access, or one that has ended. Anything Practical could not vouch for,
    // or an answer not made just now, is not "none": the learner is asked before a session is used.)
    const ended=e.status==='inactive'||e.type!=='learner_premium'||e.expiry.kind==='at'&&Date.parse(e.expiry.at)<=at.getTime();
    const fresh=Math.abs(at.getTime()-Date.parse(e.checkedAt))<=60_000;
    const result=ok?'confirmed':ended&&fresh?'inactive':'error';
    const c=await this.store.recordCheck({...base,result,type:e.type,status:e.status,expiry:e.expiry.kind,
      expiresAt:e.expiry.kind==='at'?new Date(e.expiry.at):null,...(result==='error'?{error:fresh?'unverified':'stale'}:{})});
    return ok?{state:'confirmed',checkId:c.id}:result==='inactive'?{state:'inactive',checkId:c.id}:{state:'unconfirmed',checkId:c.id};
  }

  /** Whether a scenario is one that opens first to verified learner Premium (until the owner opens it to everyone). */
  premiumFirst(scenario:string):boolean{
    return !this.options.generalAvailability&&this.options.premiumFirst.includes(scenario);
  }

  /** A notice from Practical: verified, then a fresh check for the account it names. It grants nothing by itself. */
  async notice(body:string,timestamp:string|undefined,signature:string|undefined):Promise<'checked'|'unknown-account'|'refused'|'repeat'>{
    const n=verifyNotice(body,timestamp,signature,this.options.noticeSecret,this.now().getTime());
    if(!n)return 'refused';
    // (Each event once: a replay inside the signature's window is answered, and does nothing.)
    if(!await this.store.claimEvent(n.eventId,new Date(this.now().getTime()+2*NOTICE_WINDOW_MS)))return 'repeat';
    const link=await this.store.findLink({practicalAccountId:n.practicalAccountId});
    if(!link)return 'unknown-account';
    await this.check(link.accountId,'notice');
    return 'checked';
  }

  /** The learner's own view: linked or not, and what Practical says now. */
  async status(accountId:string):Promise<{linked:boolean;premium:'confirmed'|'inactive'|'unconfirmed'|null}>{
    const r=await this.check(accountId,'status');
    return r.state==='unlinked'?{linked:false,premium:null}:{linked:true,premium:r.state};
  }

  /** New test-centre requests, as Practical sends them, cut to what the simulator may see. */
  async centreDemand():Promise<CentreDemand[]|null>{
    try{return cleanDemand(await this.api.centreDemand())}catch{return null}
  }
}
