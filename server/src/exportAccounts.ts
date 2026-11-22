import {createHash} from 'node:crypto';
import type {Db} from 'mongodb';

/**
 * A read-only export of every account: who it is (email, Google and Apple ids), what it can do now (sessions, old
 * Starter Pass drives, an unlimited pass and where that came from), every grant with its source, drives and progress.
 * For reconciling accounts before and after a migration. It only reads: `find` and `countDocuments`, and one
 * `connectionStatus` to see what the database user may do (`readOnlyUser`). Nothing here writes, makes an index or
 * changes a setting; the CLI (exportCli.ts) runs only as a database user that cannot write.
 * Not exported: sign-in codes, tokens, trials, visits, support tickets, marketing choices, and any text an admin typed
 * (an adjustment's note): an entry carries a label naming what it was, not the note.
 */

/** Where a ledger entry came from, by its idempotency key (unknown: a key of no form this service writes). */
export type EntrySource='stripe-checkout'|'stripe-renewal'|'stripe-refund'|'drive'|'drive-refund'|'referral'|'admin'|'leaderboard'|'unknown';
export function entrySource(key:string):EntrySource{
  const p=key.slice(0,key.indexOf(':')+1);
  return ({'checkout:':'stripe-checkout','invoice:':'stripe-renewal','refund:':'stripe-refund','starter-duplicate:':'stripe-refund',
    'drive:':'drive','drive-refund:':'drive-refund','referral-free:':'referral','referral-bonus:':'referral',
    'adjustment:':'admin','unlimited:':'admin','leader:':'leaderboard'} as Record<string,EntrySource>)[p]??'unknown';
}
/** What an entry was, without what an admin typed: an adjustment's note is free text, an unlimited grant's follows ': '. */
export function entryLabel(key:string,reason:string):string{
  if(key.startsWith('adjustment:'))return 'Admin adjustment';
  if(key.startsWith('unlimited:'))return reason.split(': ')[0]!;
  return reason;
}

/** Ledger entries that put time on an unlimited pass (or end it), and where each came from. */
export type UnlimitedSource='stripe-pass'|'stripe-promo-code'|'stripe-renewal'|'admin'|'leaderboard'|'other';

export interface ExportedLedgerEntry{
  id:string;accountId:string;type:string;sessionsDelta:number;pot:string|null;amountPence:number;currency:string;
  actor:string;by:string|null;source:EntrySource;label:string;idempotencyKey:string;createdAt:string|null;
  stripe:{checkoutSession?:string;paymentIntent?:string;paymentLink?:string;charge?:string;event?:string}|null;
}

export interface ExportedAccount{
  id:string;
  email:string|null;emailKey:string|null;
  googleSub:string|null;appleSub:string|null;
  referralCode:string|null;referredBy:string|null;
  createdAt:string|null;firstPaidAt:string|null;
  access:{
    /** The account's cached general sessions, and the same summed from the ledger (they should agree). */
    sessions:number;sessionsFromLedger:number;sessionsMatch:boolean;
    allowances:Record<string,number>;allowancesFromLedger:Record<string,number>;allowancesMatch:boolean;
    starterBought:boolean;
    unlimited:{active:boolean;until:string|null;subscriptions:Array<{id:string;pack:string}>;
      /** The latest grant that put time on it (or ended it), as recorded in the ledger. */
      source:UnlimitedSource|null;sourceEntry:string|null;sourceLabel:string|null;sourceAt:string|null};
    /** The simulator has no Premium: this stays null until a verified Practical entitlement exists. */
    premium:null;
  };
  /** Every grant and use, summed by ledger type and by source. */
  ledger:{entries:number;byType:Record<string,{count:number;sessions:number;amountPence:number}>;bySource:Partial<Record<EntrySource,number>>};
  drives:{total:number;completed:number;byMode:Record<string,number>;lastStartedAt:string|null};
  progress:{lessonsDone:string[]};
}

export interface Manifest{
  tool:'simulator-account-export';version:1;
  exportedAt:string;database:string;
  /** Documents in each collection read, at the time of the export. */
  counts:Record<string,number>;
  accounts:number;
  /** Accounts whose cached balance or allowances differ from their ledger (to look at before migrating). */
  mismatched:string[];
  totals:{accounts:number;withBalance:number;unlimitedActive:number;activeSubscription:number;promoOrReferral:number;
    unknownSourceEntries:number;accountsWithUnknownSource:number;mismatched:number};
  files:Record<string,{bytes:number;sha256:string}>;
}

const iso=(d:unknown)=>d instanceof Date?d.toISOString():typeof d==='string'?d:null;
const str=(v:unknown)=>typeof v==='string'?v:null;
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:0;

/** Where an entry that moves no sessions put time on an unlimited pass from, or null if it is not one. */
export function unlimitedSource(e:{type:string;sessionsDelta:number;label:string;idempotencyKey:string},unlimitedLabels:readonly string[]):UnlimitedSource|null{
  if(e.sessionsDelta!==0)return null;
  const k=e.idempotencyKey,r=e.label;
  if(k.startsWith('unlimited:'))return 'admin';
  if(k.startsWith('leader:'))return 'leaderboard';
  if(k.startsWith('invoice:'))return 'stripe-renewal';
  if(k.startsWith('checkout:')&&unlimitedLabels.some(l=>r.startsWith(l)))return e.type==='promo'?'stripe-promo-code':'stripe-pass';
  if(/^unlimited/i.test(r))return 'other';
  return null;
}

/** What the database user may do here: true when no write action is granted on this database (or any). */
export async function readOnlyUser(db:Db):Promise<{readOnly:boolean;users:string[];writes:string[]}>{
  const s=await db.command({connectionStatus:1,showPrivileges:true}) as {authInfo?:{authenticatedUsers?:Array<{user:string;db:string}>;
    authenticatedUserPrivileges?:Array<{resource:{db?:string;collection?:string;anyResource?:boolean;cluster?:boolean};actions:string[]}>}};
  const users=(s.authInfo?.authenticatedUsers??[]).map(u=>`${u.user}@${u.db}`);
  const WRITE=new Set(['insert','update','remove','createIndex','dropIndex','dropCollection','dropDatabase','createCollection','collMod',
    'renameCollectionSameDB','convertToCapped','emptycapped','bypassDocumentValidation','applyOps']);
  const writes=new Set<string>();
  for(const p of s.authInfo?.authenticatedUserPrivileges??[]){
    const here=p.resource.anyResource||p.resource.db===''||p.resource.db===db.databaseName;
    if(here)for(const a of p.actions)if(WRITE.has(a))writes.add(a);
  }
  // (No one signed in: a database without access control, as in tests. Not read-only: anyone may write.)
  return {readOnly:users.length>0&&writes.size===0,users,writes:[...writes].sort()};
}

const COLLECTIONS=['accounts','ledger_entries','drives','trials','flags'] as const;

/**
 * Every account with its access, grants, drives and progress, the full ledger, and a manifest with counts and each
 * file's checksum. `write` is given each file's name and lines (the CLI writes them to disk; tests keep them).
 */
export async function exportAccounts(db:Db,opts:{unlimitedLabels:readonly string[];now?:Date;
  write:(name:string,lines:AsyncIterable<string>|Iterable<string>)=>Promise<{bytes:number;sha256:string}>}):Promise<Manifest>{
  const now=opts.now??new Date();
  const counts:Record<string,number>={};
  for(const c of COLLECTIONS)counts[c]=await db.collection(c).countDocuments({});
  // The ledger, by account (read once, in order).
  const ledger=new Map<string,ExportedLedgerEntry[]>();
  const all:ExportedLedgerEntry[]=[];
  for await(const d of db.collection('ledger_entries').find({},{sort:{createdAt:1,_id:1}})){
    const s=d['stripe'] as Record<string,unknown>|undefined;
    const e:ExportedLedgerEntry={id:String(d._id),accountId:String(d['accountId']??''),type:String(d['type']??''),sessionsDelta:num(d['sessionsDelta']),
      pot:str(d['pot']),amountPence:num(d['amountPence']),currency:String(d['currency']??''),actor:String(d['actor']??''),by:str(d['by']),
      source:entrySource(String(d['idempotencyKey']??'')),label:entryLabel(String(d['idempotencyKey']??''),String(d['reason']??'')),
      idempotencyKey:String(d['idempotencyKey']??''),createdAt:iso(d['createdAt']),
      stripe:s?Object.fromEntries(['checkoutSession','paymentIntent','paymentLink','charge','event'].filter(k=>typeof s[k]==='string').map(k=>[k,s[k] as string])):null};
    all.push(e);
    const l=ledger.get(e.accountId);if(l)l.push(e);else ledger.set(e.accountId,[e]);
  }
  // Drives, by account (the owner when it was on a device's free try).
  const drives=new Map<string,ExportedAccount['drives']>();
  for await(const d of db.collection('drives').find({},{projection:{accountId:1,owner:1,mode:1,status:1,startedAt:1}})){
    const who=str(d['owner'])??str(d['accountId']);
    if(!who||who.startsWith('trial:'))continue;
    const x=drives.get(who)??{total:0,completed:0,byMode:{},lastStartedAt:null};
    x.total++;if(d['status']==='completed')x.completed++;
    const m=String(d['mode']??'unknown');x.byMode[m]=(x.byMode[m]??0)+1;
    const at=iso(d['startedAt']);if(at&&(!x.lastStartedAt||at>x.lastStartedAt))x.lastStartedAt=at;
    drives.set(who,x);
  }
  const accounts:ExportedAccount[]=[];
  const mismatched:string[]=[];
  for await(const d of db.collection('accounts').find({},{sort:{createdAt:1,_id:1}})){
    const id=String(d._id),entries=ledger.get(id)??[];
    const byType:ExportedAccount['ledger']['byType']={},bySource:ExportedAccount['ledger']['bySource']={};
    let sessionsFromLedger=0;const allowancesFromLedger:Record<string,number>={};
    let latest:{e:ExportedLedgerEntry;src:UnlimitedSource}|null=null;
    for(const e of entries){
      const t=byType[e.type]??={count:0,sessions:0,amountPence:0};
      t.count++;t.sessions+=e.sessionsDelta;t.amountPence+=e.amountPence;bySource[e.source]=(bySource[e.source]??0)+1;
      if(e.pot)allowancesFromLedger[e.pot]=(allowancesFromLedger[e.pot]??0)+e.sessionsDelta;else sessionsFromLedger+=e.sessionsDelta;
      const src=unlimitedSource(e,opts.unlimitedLabels);
      if(src)latest={e,src};
    }
    const allowances:Record<string,number>={};
    for(const [k,v] of Object.entries((d['allowances']??{}) as Record<string,unknown>))allowances[k]=num(v);
    const pots=new Set([...Object.keys(allowances),...Object.keys(allowancesFromLedger)]);
    const allowancesMatch=[...pots].every(p=>(allowances[p]??0)===(allowancesFromLedger[p]??0));
    const sessions=num(d['balance']),sessionsMatch=sessions===sessionsFromLedger;
    if(!sessionsMatch||!allowancesMatch)mismatched.push(id);
    const until=d['unlimitedUntil'] instanceof Date?d['unlimitedUntil']:null;
    const subs=Array.isArray(d['subscriptions'])?(d['subscriptions'] as Array<{id:unknown;pack:unknown}>).map(s=>({id:String(s.id),pack:String(s.pack)})):[];
    accounts.push({
      id,email:str(d['email']),emailKey:str(d['emailKey']),googleSub:str(d['googleSub']),appleSub:str(d['appleSub']),
      referralCode:str(d['referralCode']),referredBy:str(d['referredBy']),createdAt:iso(d['createdAt']),firstPaidAt:iso(d['firstPaidAt']),
      access:{sessions,sessionsFromLedger,sessionsMatch,allowances,allowancesFromLedger,allowancesMatch,starterBought:d['starterBought']===true,
        unlimited:{active:!!until&&until.getTime()>now.getTime(),until:until?.toISOString()??null,subscriptions:subs,
          source:latest?.src??null,sourceEntry:latest?.e.id??null,sourceLabel:latest?.e.label??null,sourceAt:latest?.e.createdAt??null},
        premium:null},
      ledger:{entries:entries.length,byType,bySource},
      drives:drives.get(id)??{total:0,completed:0,byMode:{},lastStartedAt:null},
      progress:{lessonsDone:Array.isArray(d['lessonsDone'])?(d['lessonsDone'] as unknown[]).map(String):[]},
    });
  }
  const files:Manifest['files']={};
  files['accounts.jsonl']=await opts.write('accounts.jsonl',accounts.map(a=>JSON.stringify(a)+'\n'));
  files['ledger.jsonl']=await opts.write('ledger.jsonl',all.map(e=>JSON.stringify(e)+'\n'));
  files['accounts.csv']=await opts.write('accounts.csv',csv(accounts));
  const totals:Manifest['totals']={accounts:accounts.length,
    withBalance:accounts.filter(a=>a.access.sessions>0||Object.values(a.access.allowances).some(v=>v>0)).length,
    unlimitedActive:accounts.filter(a=>a.access.unlimited.active).length,
    activeSubscription:accounts.filter(a=>a.access.unlimited.active&&a.access.unlimited.subscriptions.length>0).length,
    promoOrReferral:accounts.filter(a=>(a.ledger.byType['promo']?.count??0)+(a.ledger.bySource.referral??0)+(a.ledger.bySource.leaderboard??0)>0).length,
    unknownSourceEntries:all.filter(e=>e.source==='unknown').length,
    accountsWithUnknownSource:accounts.filter(a=>(a.ledger.bySource.unknown??0)>0).length,
    mismatched:mismatched.length};
  return {tool:'simulator-account-export',version:1,exportedAt:now.toISOString(),database:db.databaseName,counts,accounts:accounts.length,
    mismatched,totals,files};
}

/** A cell as text a spreadsheet shows as typed (a leading = + - @ would make it a formula). */
export const cell=(v:unknown)=>{
  let s=v===null||v===undefined?'':String(v);
  if(/^[=+\-@\t\r]/.test(s))s=`'${s}`;
  return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
};

/** One row per account: the fields compared when reconciling. */
export function*csv(accounts:readonly ExportedAccount[]):Iterable<string>{
  yield ['id','email','google','apple','created','first_paid','sessions','sessions_ledger','sessions_match','allowances','unlimited_active',
    'unlimited_until','unlimited_source','subscriptions','premium','drives','drives_completed','lessons_done'].join(',')+'\n';
  for(const a of accounts){
    const u=a.access.unlimited;
    yield [a.id,a.email,a.googleSub?'yes':'',a.appleSub?'yes':'',a.createdAt,a.firstPaidAt,a.access.sessions,a.access.sessionsFromLedger,
      a.access.sessionsMatch&&a.access.allowancesMatch?'yes':'no',Object.entries(a.access.allowances).map(([k,v])=>`${k}:${v}`).join(' '),
      u.active?'yes':'no',u.until,u.source,u.subscriptions.map(s=>s.pack).join(' '),'',a.drives.total,a.drives.completed,a.progress.lessonsDone.length]
      .map(cell).join(',')+'\n';
  }
}

/** A writer's checksum: what a file's lines add up to. */
export async function digest(lines:AsyncIterable<string>|Iterable<string>,sink:(chunk:string)=>void|Promise<void>):Promise<{bytes:number;sha256:string}>{
  const h=createHash('sha256');let bytes=0;
  for await(const l of lines){h.update(l);bytes+=Buffer.byteLength(l);await sink(l)}
  return {bytes,sha256:h.digest('hex')};
}
