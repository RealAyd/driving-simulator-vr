import {randomUUID} from 'node:crypto';

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
  status:'started'|'loaded'|'failed'|'completed';
  mode:Mode;
  /** Where its session came from (a refund goes back there). */
  paidFrom:Pot|'sessions';
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

export interface Flag{id:string;kind:string;data:Record<string,unknown>;createdAt:Date}

export type AccountQuery={id:string}|{email:string}|{emailKey:string}|{googleSub:string}|{appleSub:string}|{referralCode:string};

export interface Store{
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
  ledger(q:{accountId?:string;paymentIntent?:string;type?:LedgerType}):Promise<LedgerEntry[]>;
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
  flags():Promise<Flag[]>;
}

export class MemoryStore implements Store{
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
  async ledger(q:{accountId?:string;paymentIntent?:string;type?:LedgerType}){
    return this.entries.filter(e=>(!q.accountId||e.accountId===q.accountId)&&(!q.paymentIntent||e.stripe?.paymentIntent===q.paymentIntent)&&(!q.type||e.type===q.type));
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
  async flags(){return [...this.flagged]}
}
