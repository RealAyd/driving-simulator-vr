import type {PracticalApi} from './practical.js';

/**
 * The live Practical client (Release 2), for the PROPOSED contract (RealAyd/Driving-Practice,
 * docs/RELEASE2-SIMULATOR-PRACTICAL-API-CONTRACT.md). Practical has not built these endpoints yet: the paths and shapes
 * here follow the draft and are adjusted once both sides agree. Off unless config.ts allows it (staging only, every
 * credential set); the mock (practical.ts) stands in everywhere else.
 *
 * - Browser consent: GET <base>/api/integrations/simulator/authorize?state&code_challenge&code_challenge_method=S256
 *   &redirect_uri&client_id (the learner's browser goes there; Practical sends it back with ?state&code).
 * - Code exchange: POST <base>/api/integrations/simulator/link/exchange {code, code_verifier, redirect_uri, client_id}
 *   → {practicalAccountId}, service-authenticated (the Premium credential).
 * - Entitlement: POST <base>/api/integrations/simulator/entitlement {practicalAccountId} → PracticalEntitlement,
 *   service-authenticated (the Premium credential; scope simulator.premium.read). Checked by parseEntitlement.
 * - Test-centre requests: GET <base>/api/integrations/simulator/centre-demand → [{centre, area, requests, firstAt,
 *   lastAt}], its own credential (scope simulator.centre-demand.read). Sanitised again by cleanDemand.
 *
 * Credentials travel only in the Authorization header, never in an address, and never appear in an error.
 */
export interface PracticalClientOptions{
  /** Practical's address: https only (http only for a test server on this machine). */
  base:string;
  /** The simulator's client id at Practical (not a secret). */
  clientId:string;
  /** Where Practical sends the learner back to after consent: this app's own address. */
  redirectUri:string;
  /** Service credential for linking and entitlement (scope simulator.premium.read). */
  premiumToken:string;
  /** Service credential for test-centre requests (scope simulator.centre-demand.read); null: none. */
  demandToken:string|null;
  /** How long a request may take (ms). */
  timeoutMs?:number;
  fetch?:typeof fetch;
}

/** A Practical address this client will call: https, or http to this machine (tests). */
export function practicalBase(base:string):string{
  const u=new URL(base);
  const local=u.hostname==='127.0.0.1'||u.hostname==='localhost';
  if(u.protocol!=='https:'&&!(u.protocol==='http:'&&local))throw new Error('Practical must be reached over https');
  if(u.username||u.password||u.search||u.hash)throw new Error('Practical base address must be a plain origin and path');
  return u.toString().replace(/\/$/,'');
}

export class HttpPracticalApi implements PracticalApi{
  private readonly base:string;
  private readonly fetch:typeof fetch;
  constructor(private readonly o:PracticalClientOptions){
    this.base=practicalBase(o.base);
    this.fetch=o.fetch??fetch;
  }

  authorizeUrl(p:{state:string;codeChallenge:string;redirectUri:string}):string{
    const q=new URLSearchParams({state:p.state,code_challenge:p.codeChallenge,code_challenge_method:'S256',redirect_uri:this.o.redirectUri,client_id:this.o.clientId});
    return `${this.base}/api/integrations/simulator/authorize?${q}`;
  }

  async exchangeCode(code:string,verifier:string):Promise<{practicalAccountId:string}>{
    const r=await this.call('POST','/api/integrations/simulator/link/exchange',this.o.premiumToken,
      {code,code_verifier:verifier,redirect_uri:this.o.redirectUri,client_id:this.o.clientId}) as {practicalAccountId?:unknown};
    if(typeof r?.practicalAccountId!=='string'||!/^[\w-]{1,100}$/.test(r.practicalAccountId))throw new Error('Practical: malformed exchange answer');
    return {practicalAccountId:r.practicalAccountId};
  }

  entitlement(practicalAccountId:string):Promise<unknown>{
    return this.call('POST','/api/integrations/simulator/entitlement',this.o.premiumToken,{practicalAccountId});
  }

  async centreDemand():Promise<unknown[]>{
    if(!this.o.demandToken)throw new Error('Practical: no credential for test-centre requests');
    const r=await this.call('GET','/api/integrations/simulator/centre-demand',this.o.demandToken);
    if(!Array.isArray(r))throw new Error('Practical: malformed test-centre answer');
    return r;
  }

  /** One request: JSON in and out, the credential in the header, a time limit; any failure throws (never grants). */
  private async call(method:'GET'|'POST',path:string,token:string,body?:unknown):Promise<unknown>{
    let res:Response;
    try{
      res=await this.fetch(`${this.base}${path}`,{method,redirect:'error',signal:AbortSignal.timeout(this.o.timeoutMs??5000),
        headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})});
    }catch(e){
      // (Only the kind of failure: never the address with anything in it, never the credential.)
      throw new Error(`Practical unreachable (${e instanceof Error&&e.name==='TimeoutError'?'timeout':'network'})`);
    }
    if(!res.ok)throw new Error(`Practical answered ${res.status}`);
    if(!(res.headers.get('content-type')??'').includes('application/json'))throw new Error('Practical: not JSON');
    try{return await res.json() as unknown}catch{throw new Error('Practical: malformed JSON')}
  }
}
