import {createHash,randomBytes} from 'node:crypto';
import {cleanDemand,premiumConfirmed,verifyNotice,type CentreDemand,type PracticalApi} from './practical.js';
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
  constructor(private readonly store:PremiumStore,private readonly api:PracticalApi,private readonly options:PremiumOptions,
    private readonly now:()=>Date=()=>new Date()){}

  /** Linking, begun by the signed-in learner: a one-time state and the PKCE challenge to send to Practical's sign-in. */
  async startLink(accountId:string):Promise<{state:string;codeChallenge:string;codeChallengeMethod:'S256'}>{
    const state=b64url(randomBytes(32)),verifier=b64url(randomBytes(48));
    await this.store.saveState({stateHash:sha(state),accountId,verifier,expiresAt:new Date(this.now().getTime()+LINK_STATE_MS)});
    return {state,codeChallenge:b64url(createHash('sha256').update(verifier).digest()),codeChallengeMethod:'S256'};
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

  /** Asks Practical now, records the answer, and says whether it is an active learner Premium. */
  async check(accountId:string,reason:'launch'|'notice'|'status'):Promise<AtLaunch>{
    const link=await this.store.findLink({accountId});
    if(!link)return {state:'unlinked'};
    const at=this.now();
    try{
      const e=await Promise.race([this.api.entitlement(link.practicalAccountId),
        new Promise<never>((_,fail)=>setTimeout(()=>fail(new Error('timeout')),CHECK_TIMEOUT_MS).unref?.())]);
      const ok=premiumConfirmed(e,at);
      const c=await this.store.recordCheck({accountId,practicalAccountId:link.practicalAccountId,at,result:ok?'confirmed':'inactive',
        type:typeof e.type==='string'?e.type.slice(0,40):null,expiresAt:e.expiresAt instanceof Date?e.expiresAt:null,reason});
      return ok?{state:'confirmed',checkId:c.id}:{state:'inactive',checkId:c.id};
    }catch(err){
      const c=await this.store.recordCheck({accountId,practicalAccountId:link.practicalAccountId,at,result:'error',type:null,expiresAt:null,reason,
        error:String(err instanceof Error?err.message:err).slice(0,120)});
      return {state:'unconfirmed',checkId:c.id};
    }
  }

  /** Whether a scenario is one that opens first to verified learner Premium (until the owner opens it to everyone). */
  premiumFirst(scenario:string):boolean{
    return !this.options.generalAvailability&&this.options.premiumFirst.includes(scenario);
  }

  /** A notice from Practical: verified, then a fresh check for the account it names. It grants nothing by itself. */
  async notice(body:string,timestamp:string|undefined,signature:string|undefined):Promise<'checked'|'unknown-account'|'refused'>{
    const n=verifyNotice(body,timestamp,signature,this.options.noticeSecret,this.now().getTime());
    if(!n)return 'refused';
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
