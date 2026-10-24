import {randomUUID} from 'node:crypto';
import {MemorySupportStore,type SupportStore} from './supportStore.js';

/**
 * What the service keeps: accounts, the append-only sessions ledger, drives (one consumed session each), sign-in
 * codes, rate-limit counters and flags for an admin to review. The Mongo store is used when hosted; the memory store
 * in tests and local development.
 */
export interface Account{
  id:string;
  /** Verified, lower case; null only for an Apple account that withheld it (not expected on first sign-in). */
  email:string|null;
  /** The email with Gmail dots and any +suffix removed: one free drive per person, whichever alias they use. */
  emailKey:string|null;
  googleSub?:string;
  appleSub?:string;
  referralCode:string;
  /** The account whose link brought this one (set once, at creation). */
  referredBy?:string;
  /** Sessions usable for any drive: the cached sum of the ledger's entries without a pot. */
  balance:number;
  /** Starter Pass allowances, one pot per mode (each used only for its own kind of drive). */
  allowances?:Partial<Record<Pot,number>>;
  createdAt:Date;
  /** First payment with money (not a 100% promo code): starts the referrer's reward. */
  firstPaidAt?:Date;
  starterBought?:boolean;
  /** The checkout that bought the Starter Pass (a second one is refunded, not granted). */
  starterCheckout?:string;
}

/** What a drive is: the server decides from the scenario, never from what the browser says. */
export type Mode='lesson'|'test'|'free';
/** A Starter Pass allowance pot (absent on an entry: the general sessions balance). */
export type Pot=Mode;

export type LedgerType='purchase'|'promo'|'allowance'|'referral_free_drive'|'referral_bonus'|'consumed'|'drive_refund'|'refund'|'starter_duplicate'|'adjustment';

export interface LedgerEntry{
  id:string;
  product:'simulator';
  accountId:string;
  type:LedgerType;
  sessionsDelta:number;
  /** Which balance the delta moves: a Starter allowance pot, or (absent) the general sessions. */
  pot?:Pot;
  amountPence:number;
  currency:string;
  stripe?:{event?:string;checkoutSession?:string;paymentIntent?:string;paymentLink?:string;charge?:string};
  actor:'customer'|'system'|'stripe'|'admin';
  /** The admin's email, on an entry an admin recorded. */
  by?:string;
  reason:string;
  /** Unique: the same payment, drive or reward can never be recorded twice. */
  idempotencyKey:string;
  createdAt:Date;
}

export interface Drive{
  id:string;
  accountId:string;
  kind:string;
  scenario:string;
  startedAt:Date;
  /** 'unpaid': not started, for want of a session. */
  status:'started'|'loaded'|'failed'|'completed'|'unpaid';
  mode:Mode;
  /** Where its session came from (a refund goes back there); 'admin': an ADMIN_EMAILS account's drive, uses none. */
  paidFrom:Pot|'sessions'|'admin';
  refunded?:boolean;
}

export interface LoginCode{
  id:string;
  email:string;
  tokenHash:string;
  codeHash:string;
  expiresAt:Date;
  usedAt?:Date;
  attempts:number;
  ref?:string;
}

export interface Flag{id:string;kind:string;data:Record<string,unknown>;createdAt:Date;resolvedAt?:Date;resolvedBy?:string;note?:string}

export type LedgerQuery={accountId?:string;paymentIntent?:string;type?:LedgerType;types?:LedgerType[];since?:Date;until?:Date};
/** Sign-ups through each referrer's link: how many joined, and how many of those have paid with money. */
export interface ReferrerCount{referrerId:string;joined:number;paid:number}

export type AccountQuery={id:string}|{email:string}|{emailKey:string}|{googleSub:string}|{appleSub:string}|{referralCode:string};

export interface Store{
  /** Support tickets, their messages and screenshots, and the notification outbox. */
  readonly support:SupportStore;
  findAccount(q:AccountQuery):Promise<Account|null>;
  /** Fails (null) if the email is already used. */
  createAccount(a:Omit<Account,'id'|'balance'|'createdAt'>):Promise<Account|null>;
  updateAccount(id:string,set:Partial<Omit<Account,'id'|'balance'>>):Promise<void>;
  /**
   * Marks the Starter Pass bought by this checkout: 'won' the first time, 'same' when it was this checkout already
   * (a replayed event), 'lost' when another checkout bought it before. Atomic.
   */
  claimStarter(accountId:string,checkoutSession:string):Promise<'won'|'same'|'lost'>;
  /** How many accounts this one's link brought in. */
  countReferred(referrerId:string):Promise<number>;
  /**
   * Records an entry and moves the balance (or the entry's pot) by its delta. 'duplicate': the idempotency key was
   * already recorded (nothing changes). With `requireBalance` a debit happens only if what it comes from stays at or
   * above zero ('insufficient' if not).
   */
  appendLedger(e:Omit<LedgerEntry,'id'|'createdAt'>,opts?:{requireBalance?:boolean}):Promise<'ok'|'duplicate'|'insufficient'>;
  /** Oldest first. `since` inclusive, `until` exclusive. */
  ledger(q:LedgerQuery):Promise<LedgerEntry[]>;
  createDrive(d:Omit<Drive,'id'>):Promise<Drive>;
  getDrive(id:string):Promise<Drive|null>;
  updateDrive(id:string,set:Partial<Omit<Drive,'id'>>):Promise<void>;
  countDrives(q:{accountId:string;since:Date;refunded?:boolean}):Promise<number>;
  saveLoginCode(c:Omit<LoginCode,'id'>):Promise<LoginCode>;
  findLoginCode(q:{tokenHash:string}|{email:string}):Promise<LoginCode|null>;
  updateLoginCode(id:string,set:Partial<Omit<LoginCode,'id'>>):Promise<void>;
  /** Counts a hit in a fixed window; false once `max` is reached. */
  rateHit(key:string,windowMs:number,max:number):Promise<boolean>;
  flag(kind:string,data:Record<string,unknown>):Promise<void>;
  /** Newest first (at most 200). */
  flags(q?:{state?:'open'|'resolved'|'all'}):Promise<Flag[]>;
  /** false if there is no such flag or it was resolved already. */
  resolveFlag(id:string,by:string,note:string):Promise<boolean>;

  // ---- For the admin hub ----
  /** Newest first. `search`: part of the email, or an exact referral code or account id. */
  listAccounts(q:{search?:string;limit:number}):Promise<Account[]>;
  findAccounts(ids:string[]):Promise<Account[]>;
  countAccounts(q:{since?:Date;paid?:boolean;referred?:boolean}):Promise<number>;
  /** Sessions and Starter Pass drives held by all accounts. */
  heldTotals():Promise<{sessions:number;allowances:number}>;
  /** Newest first. */
  listDrives(q:{accountId?:string;since?:Date;limit:number}):Promise<Drive[]>;
  referrers():Promise<ReferrerCount[]>;
  /** Drives started since then, by kind, and how many failed to load. */
  driveCounts(since:Date):Promise<Record<Mode|'failed'|'total',number>>;
}

export class MemoryStore implements Store{
  readonly support=new MemorySupportStore();
  private accounts=new Map<string,Account>();
  private entries:LedgerEntry[]=[];
  private drives=new Map<string,Drive>();
  private codes=new Map<string,LoginCode>();
  private rates=new Map<string,{until:number;n:number}>();
  private flagged:Flag[]=[];

  async findAccount(q:AccountQuery){
    const [k,v]=Object.entries(q)[0] as [keyof Account,string];
    const a=[...this.accounts.values()].find(x=>x[k]===v);
    return a?{...a,allowances:{...a.allowances}}:null;
  }
  async createAccount(a:Omit<Account,'id'|'balance'|'createdAt'>){
    if(a.email&&[...this.accounts.values()].some(x=>x.email===a.email))return null;
    const acc:Account={...a,id:randomUUID(),balance:0,createdAt:new Date()};
    this.accounts.set(acc.id,acc);
    return {...acc};
  }
  async updateAccount(id:string,set:Partial<Account>){
    const a=this.accounts.get(id);
    if(a)Object.assign(a,set);
  }
  async countReferred(referrerId:string){return [...this.accounts.values()].filter(a=>a.referredBy===referrerId).length}
  async claimStarter(accountId:string,checkoutSession:string){
    const a=this.accounts.get(accountId);
    if(!a)return 'lost' as const;
    if(a.starterCheckout)return a.starterCheckout===checkoutSession?'same' as const:'lost' as const;
    a.starterCheckout=checkoutSession;a.starterBought=true;
    return 'won' as const;
  }
  async appendLedger(e:Omit<LedgerEntry,'id'|'createdAt'>,opts:{requireBalance?:boolean}={}){
    if(this.entries.some(x=>x.idempotencyKey===e.idempotencyKey))return 'duplicate' as const;
    const a=this.accounts.get(e.accountId);
    if(!a)throw new Error('no such account');
    const have=e.pot?a.allowances?.[e.pot]??0:a.balance;
    if(opts.requireBalance&&have+e.sessionsDelta<0)return 'insufficient' as const;
    this.entries.push({...e,id:randomUUID(),createdAt:new Date()});
    if(e.pot)a.allowances={...a.allowances,[e.pot]:have+e.sessionsDelta};
    else a.balance+=e.sessionsDelta;
    return 'ok' as const;
  }
  async ledger(q:LedgerQuery){
    return this.entries.filter(e=>(!q.accountId||e.accountId===q.accountId)&&(!q.paymentIntent||e.stripe?.paymentIntent===q.paymentIntent)&&(!q.type||e.type===q.type)
      &&(!q.types||q.types.includes(e.type))&&(!q.since||e.createdAt>=q.since)&&(!q.until||e.createdAt<q.until)).map(e=>({...e}));
  }
  async createDrive(d:Omit<Drive,'id'>){
    const drive={...d,id:randomUUID()};
    this.drives.set(drive.id,drive);
    return {...drive};
  }
  async getDrive(id:string){const d=this.drives.get(id);return d?{...d}:null}
  async updateDrive(id:string,set:Partial<Drive>){const d=this.drives.get(id);if(d)Object.assign(d,set)}
  async countDrives(q:{accountId:string;since:Date;refunded?:boolean}){
    return [...this.drives.values()].filter(d=>d.accountId===q.accountId&&d.startedAt>=q.since&&(q.refunded===undefined||!!d.refunded===q.refunded)).length;
  }
  async saveLoginCode(c:Omit<LoginCode,'id'>){
    const code={...c,id:randomUUID()};
    this.codes.set(code.id,code);
    return {...code};
  }
  async findLoginCode(q:{tokenHash:string}|{email:string}){
    const all=[...this.codes.values()].filter(c=>'tokenHash' in q?c.tokenHash===q.tokenHash:c.email===q.email);
    const latest=all.sort((a,b)=>b.expiresAt.getTime()-a.expiresAt.getTime())[0];
    return latest?{...latest}:null;
  }
  async updateLoginCode(id:string,set:Partial<LoginCode>){const c=this.codes.get(id);if(c)Object.assign(c,set)}
  async rateHit(key:string,windowMs:number,max:number){
    const now=Date.now(),r=this.rates.get(key);
    if(!r||r.until<=now){this.rates.set(key,{until:now+windowMs,n:1});return true}
    if(r.n>=max)return false;
    r.n++;return true;
  }
  async flag(kind:string,data:Record<string,unknown>){this.flagged.push({id:randomUUID(),kind,data,createdAt:new Date()})}
  async flags(q:{state?:'open'|'resolved'|'all'}={}){
    const state=q.state??'all';
    return this.flagged.filter(f=>state==='all'||(state==='open')===!f.resolvedAt).reverse().slice(0,200).map(f=>({...f}));
  }
  async resolveFlag(id:string,by:string,note:string){
    const f=this.flagged.find(x=>x.id===id);
    if(!f||f.resolvedAt)return false;
    Object.assign(f,{resolvedAt:new Date(),resolvedBy:by,note});
    return true;
  }
  private newest(){return [...this.accounts.values()].sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime())}
  async listAccounts(q:{search?:string;limit:number}){
    const t=q.search?.trim().toLowerCase();
    return this.newest().filter(a=>!t||a.email?.includes(t)||a.referralCode.toLowerCase()===t||a.id===t).slice(0,q.limit).map(a=>({...a,allowances:{...a.allowances}}));
  }
  async findAccounts(ids:string[]){return ids.flatMap(id=>{const a=this.accounts.get(id);return a?[{...a}]:[]})}
  async countAccounts(q:{since?:Date;paid?:boolean;referred?:boolean}){
    return [...this.accounts.values()].filter(a=>(!q.since||a.createdAt>=q.since)&&(!q.paid||!!a.firstPaidAt)&&(!q.referred||!!a.referredBy)).length;
  }
  async heldTotals(){
    let sessions=0,allowances=0;
    for(const a of this.accounts.values()){sessions+=a.balance;allowances+=Object.values(a.allowances??{}).reduce((n,v)=>n+(v??0),0)}
    return {sessions,allowances};
  }
  async listDrives(q:{accountId?:string;since?:Date;limit:number}){
    return [...this.drives.values()].filter(d=>(!q.accountId||d.accountId===q.accountId)&&(!q.since||d.startedAt>=q.since))
      .sort((a,b)=>b.startedAt.getTime()-a.startedAt.getTime()).slice(0,q.limit).map(d=>({...d}));
  }
  async referrers(){
    const by=new Map<string,ReferrerCount>();
    for(const a of this.accounts.values()){
      if(!a.referredBy)continue;
      const r=by.get(a.referredBy)??{referrerId:a.referredBy,joined:0,paid:0};
      r.joined++;if(a.firstPaidAt)r.paid++;
      by.set(a.referredBy,r);
    }
    return [...by.values()].sort((a,b)=>b.joined-a.joined);
  }
  async driveCounts(since:Date){
    const n={lesson:0,test:0,free:0,failed:0,total:0};
    for(const d of this.drives.values())if(d.startedAt>=since&&d.status!=='unpaid'){n.total++;n[d.mode]++;if(d.status==='failed')n.failed++}
    return n;
  }
}
