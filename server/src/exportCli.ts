import {createWriteStream,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {MongoClient} from 'mongodb';
import {digest,exportAccounts,readOnlyUser} from './exportAccounts.js';

/**
 * node server/dist/exportCli.js --out <empty folder outside the repository>
 *
 * Reads MONGODB_URI from the environment (never printed) and writes accounts.jsonl, ledger.jsonl, accounts.csv and
 * manifest.json, readable by their owner only. Prints the manifest's counts and checksums, never an account.
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
    const manifest=await exportAccounts(db,{unlimitedLabels,write:async(name,lines)=>{
      const f=createWriteStream(join(dir,name),{mode:0o600});
      const r=await digest(lines,c=>{if(!f.write(c))return new Promise<void>(ok=>f.once('drain',()=>ok()))});
      await new Promise<void>((ok,fail)=>f.end((e?:Error|null)=>e?fail(e):ok()));
      return r;
    }});
    writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
    return {database:manifest.database,exportedAt:manifest.exportedAt,counts:manifest.counts,accounts:manifest.accounts,
      totals:manifest.totals,files:manifest.files,readOnlyUser:who.readOnly};
  }finally{await client.close()}
}

/** An error's message, with anything that looks like a database address hidden (a driver error can quote it). */
export const redact=(e:unknown)=>String(e instanceof Error?e.message:e).replace(/mongodb(\+srv)?:\/\/\S+/g,'mongodb://***');

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  runExport(process.argv.slice(2)).then(r=>console.log(JSON.stringify(r,null,2)),e=>{console.error(redact(e));process.exit(1)});
}
