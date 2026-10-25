import {execSync,spawn,type ChildProcess} from 'node:child_process';
import {expect} from '@playwright/test';

// The accounts service (server/) with local fakes, on the port the preview's /api goes to. One file's server must be
// gone before the next starts: otherwise the next file talks to the old one (another ADMIN_EMAILS, other accounts).
const HEALTH='http://localhost:8787/healthz';
const up=async()=>(await fetch(HEALTH).catch(()=>null))?.status===200;

export async function startServer(env:Record<string,string>):Promise<ChildProcess>{
  await expect.poll(up,{timeout:15_000}).toBe(false);
  execSync('npm run build:server',{stdio:'ignore'});
  const api=spawn('node',['server/dist/index.js'],{env:{...process.env,DP_DEV_FAKES:'1',PORT:'8787',APP_BASE_URL:'http://localhost:4173',...env},stdio:'ignore'});
  await expect.poll(up,{timeout:15_000}).toBe(true);
  return api;
}

export async function stopServer(api:ChildProcess|undefined):Promise<void>{
  if(!api||api.exitCode!==null)return;
  await new Promise(done=>{api.once('exit',done);api.kill()});
}
