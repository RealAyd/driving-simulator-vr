import {createWriteStream,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {MongoClient,type ClientSession} from 'mongodb';
import {digest,exportAccounts,readOnlyUser,summarise} from './exportAccounts.js';

/**
 * node server/dist/exportCli.js --out <empty folder outside the repository>
 *
 * Reads MONGODB_URI from the environment (never printed) and writes accounts.jsonl, ledger.jsonl, accounts.csv,
 * manifest.json (private: it lists account ids) and summary.json (counts and totals only: the one to share), readable
 * by their owner only. Prints the summary, never an account. Reads one moment: a snapshot where the server keeps them
 * (a replica set), else what existed when the export began (exportAccounts, `consistency`).
 * Runs only as a database user that cannot write (MongoDB's `read` role on this one database): the app's own user,
 * or a database without access control, is refused before anything is read.
 */
export async function runExport(argv:readonly string[],env:Record<string,string|undefined>=process.env){
  const arg=(k:string)=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:undefined};
  const out=arg('--out');
  const uri=env['MONGODB_URI'];
  if(!uri)throw new Error('MONGODB_URI is not set');
  if(!out)throw new Error('--out <folder> is required');
  const dir=resolve(out);
  // (Customer data never lands where it could be committed.)
  for(let d=dir;;){
    if(existsSync(join(d,'.git')))throw new Error('--out is inside a git repository: choose a folder outside it');
    const up=resolve(d,'..');if(up===d)break;d=up;
  }
  if(existsSync(dir)&&readdirSync(dir).length)throw new Error('--out must be empty');
  mkdirSync(dir,{recursive:true,mode:0o700});
  const packsFile=env['PACKS_FILE']??new URL('../packs.json',import.meta.url).pathname;
  const unlimitedLabels=(JSON.parse(readFileSync(packsFile,'utf8')) as {packs:Array<{label:string;unlimited?:unknown}>}).packs
    .filter(p=>p.unlimited).map(p=>p.label);
  const client=new MongoClient(uri,{readPreference:'secondaryPreferred',appName:'simulator-account-export'});
  try{
    await client.connect();
    const db=client.db();
    const who=await readOnlyUser(db);
    if(!who.readOnly)throw new Error(`Refused: the database user can write (${who.writes.join(', ')||'no access control'}). Use a read-only user.`);
    const session=await snapshot(client,db.databaseName);
    const manifest=await exportAccounts(db,{unlimitedLabels,...(session?{session}:{}),write:async(name,lines)=>{
      const f=createWriteStream(join(dir,name),{mode:0o600});
      const r=await digest(lines,c=>{if(!f.write(c))return new Promise<void>(ok=>f.once('drain',()=>ok()))});
      await new Promise<void>((ok,fail)=>f.end((e?:Error|null)=>e?fail(e):ok()));
      return r;
    }}).finally(()=>session?.endSession());
    writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
    const summary=summarise(manifest);
    writeFileSync(join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
    return {...summary,readOnlyUser:who.readOnly};
  }finally{await client.close()}
}

/** A snapshot session, if this server keeps them (a replica set); null on a single server. */
async function snapshot(client:MongoClient,database:string):Promise<ClientSession|null>{
  const session=client.startSession({snapshot:true});
  try{await client.db(database).collection('accounts').findOne({},{session,projection:{_id:1}});return session}
  catch{await session.endSession();return null}
}

/** An error's message, with anything that looks like a database address hidden (a driver error can quote it). */
export const redact=(e:unknown)=>String(e instanceof Error?e.message:e).replace(/mongodb(\+srv)?:\/\/\S+/g,'mongodb://***');

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  runExport(process.argv.slice(2)).then(r=>console.log(JSON.stringify(r,null,2)),e=>{console.error(redact(e));process.exit(1)});
}
