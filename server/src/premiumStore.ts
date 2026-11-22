import {randomUUID} from 'node:crypto';
import {MongoServerError,type Db} from 'mongodb';

/**
 * What Practical Premium keeps, apart from the simulator's accounts and ledger (which it never changes): the link
 * between a simulator account and a verified Practical account, the one-time states of linking in progress, and every
 * entitlement check made (append-only, for audit: none of them grants anything later).
 */
export interface PracticalLink{accountId:string;practicalAccountId:string;linkedAt:Date;consentAt:Date}
/** A link being made: the state sent to Practical (kept hashed), its PKCE verifier, whose it is, until when. */
export interface LinkState{stateHash:string;accountId:string;verifier:string;expiresAt:Date}
export interface EntitlementCheck{
  id:string;accountId:string;practicalAccountId:string;at:Date;
  /** 'confirmed': an active learner Premium; 'inactive': anything else Practical said; 'error': it could not be asked. */
  result:'confirmed'|'inactive'|'error';
  /** As Practical answered (null when it could not be asked or answered out of shape). */
  type:string|null;status:string|null;expiry:'at'|'never'|'unknown'|null;expiresAt:Date|null;
  /** What asked: a launch, a notice from Practical, or the learner's own status screen. */
  reason:'launch'|'notice'|'status';
  /** Why it is not an answer: unreachable, timeout, malformed, stale, or unverified (a status or end not known). */
  error?:string;
}

export interface PremiumStore{
  /** 'taken': that Practical account (or this simulator account) is linked already. */
  link(l:PracticalLink):Promise<'ok'|'taken'>;
  findLink(q:{accountId:string}|{practicalAccountId:string}):Promise<PracticalLink|null>;
  unlink(accountId:string):Promise<boolean>;
  saveState(s:LinkState):Promise<void>;
  /** Single use: the state, taken (removed), if it is there and unexpired. */
  takeState(stateHash:string,now:Date):Promise<LinkState|null>;
  recordCheck(c:Omit<EntitlementCheck,'id'>):Promise<EntitlementCheck>;
  checks(accountId:string,limit?:number):Promise<EntitlementCheck[]>;
  /** A notice's event, the first time it is seen (true); false for one seen before (kept until `until`). */
  claimEvent(eventId:string,until:Date):Promise<boolean>;
  /** For the admin hub: checks and their results, and Premium drives, since a moment. */
  checkCounts(since:Date):Promise<Record<'confirmed'|'inactive'|'error'|'premiumDrives',number>>;
  /** How many accounts are linked now. */
  linkCount():Promise<number>;
}

export class MemoryPremiumStore implements PremiumStore{
  private readonly links:PracticalLink[]=[];
  private readonly states=new Map<string,LinkState>();
  private readonly log:EntitlementCheck[]=[];
  async link(l:PracticalLink){
    if(this.links.some(x=>x.accountId===l.accountId||x.practicalAccountId===l.practicalAccountId))return 'taken' as const;
    this.links.push({...l});return 'ok' as const;
  }
  async findLink(q:{accountId:string}|{practicalAccountId:string}){
    const l='accountId' in q?this.links.find(x=>x.accountId===q.accountId):this.links.find(x=>x.practicalAccountId===q.practicalAccountId);
    return l?{...l}:null;
  }
  async unlink(accountId:string){const i=this.links.findIndex(x=>x.accountId===accountId);if(i<0)return false;this.links.splice(i,1);return true}
  async saveState(s:LinkState){this.states.set(s.stateHash,{...s})}
  async takeState(stateHash:string,now:Date){
    const s=this.states.get(stateHash);this.states.delete(stateHash);
    return s&&s.expiresAt.getTime()>now.getTime()?s:null;
  }
  async recordCheck(c:Omit<EntitlementCheck,'id'>){const x={...c,id:randomUUID()};this.log.push(x);return {...x}}
  async checks(accountId:string,limit=20){return this.log.filter(c=>c.accountId===accountId).slice(-limit).reverse()}
  private readonly events=new Map<string,Date>();
  async claimEvent(eventId:string,until:Date){if(this.events.has(eventId))return false;this.events.set(eventId,until);return true}
  async checkCounts(since:Date){
    const n={confirmed:0,inactive:0,error:0,premiumDrives:0};
    for(const c of this.log)if(c.at.getTime()>=since.getTime()){n[c.result]++;if(c.reason==='launch'&&c.result==='confirmed')n.premiumDrives++}
    return n;
  }
  async linkCount(){return this.links.length}
}

type Doc<T>=Omit<T,'id'>&{_id:string};
export class MongoPremiumStore implements PremiumStore{
  constructor(private readonly db:Db){}
  private get links(){return this.db.collection<Doc<PracticalLink&{id:string}>>('practical_links')}
  private get states(){return this.db.collection<LinkState&{_id:string}>('practical_link_states')}
  private get log(){return this.db.collection<Doc<EntitlementCheck>>('entitlement_checks')}
  private get events(){return this.db.collection<{_id:string;until:Date}>('practical_notice_events')}
  async indexes(){
    // One Practical account to one simulator account, both ways.
    await this.links.createIndex({practicalAccountId:1},{unique:true});
    await this.states.createIndex({expiresAt:1},{expireAfterSeconds:0});
    await this.log.createIndex({accountId:1,at:-1});
    await this.log.createIndex({at:-1});
    await this.events.createIndex({until:1},{expireAfterSeconds:0});
  }
  async link(l:PracticalLink){
    try{await this.links.insertOne({_id:l.accountId,accountId:l.accountId,practicalAccountId:l.practicalAccountId,linkedAt:l.linkedAt,consentAt:l.consentAt});return 'ok' as const}
    catch(e){if(e instanceof MongoServerError&&e.code===11000)return 'taken' as const;throw e}
  }
  async findLink(q:{accountId:string}|{practicalAccountId:string}){
    const d=await this.links.findOne('accountId' in q?{_id:q.accountId}:{practicalAccountId:q.practicalAccountId});
    return d?{accountId:d._id,practicalAccountId:d.practicalAccountId,linkedAt:d.linkedAt,consentAt:d.consentAt}:null;
  }
  async unlink(accountId:string){return (await this.links.deleteOne({_id:accountId})).deletedCount===1}
  async saveState(s:LinkState){await this.states.insertOne({_id:s.stateHash,...s})}
  async takeState(stateHash:string,now:Date){
    const d=await this.states.findOneAndDelete({_id:stateHash});
    return d&&d.expiresAt.getTime()>now.getTime()?{stateHash:d.stateHash,accountId:d.accountId,verifier:d.verifier,expiresAt:d.expiresAt}:null;
  }
  async recordCheck(c:Omit<EntitlementCheck,'id'>){const id=randomUUID();await this.log.insertOne({_id:id,...c});return {...c,id}}
  async checks(accountId:string,limit=20){
    return (await this.log.find({accountId},{sort:{at:-1},limit}).toArray()).map(({_id,...rest})=>({...rest,id:_id}) as EntitlementCheck);
  }
  async claimEvent(eventId:string,until:Date){
    try{await this.events.insertOne({_id:eventId,until});return true}
    catch(e){if(e instanceof MongoServerError&&e.code===11000)return false;throw e}
  }
  async checkCounts(since:Date){
    const n={confirmed:0,inactive:0,error:0,premiumDrives:0};
    for(const r of await this.log.aggregate<{_id:'confirmed'|'inactive'|'error';n:number}>([{$match:{at:{$gte:since}}},{$group:{_id:'$result',n:{$sum:1}}}]).toArray())n[r._id]=r.n;
    n.premiumDrives=await this.log.countDocuments({at:{$gte:since},reason:'launch',result:'confirmed'});
    return n;
  }
  async linkCount(){return this.links.countDocuments({})}
}
