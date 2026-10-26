import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// The simulator is an isolated preview: its HTML entry lives in sim/ so the
// legacy production page at the repository root is never replaced by a build.
const repoRoot=fileURLToPath(new URL('..',import.meta.url));

// Shown in the About panel so a device test can be tied to an exact build.
const git=(args:string)=>{try{return execSync(`git ${args}`,{stdio:['ignore','pipe','ignore']}).toString().trim()}catch{return ''}};
const commit=(git('rev-parse --short HEAD')||'unknown')+(git('status --porcelain')?' + local changes':'');
const ref=git('rev-parse --abbrev-ref HEAD');
const branch=ref&&ref!=='HEAD'?ref:process.env.PREVIEW_SOURCE_BRANCH??process.env.GITHUB_HEAD_REF??'unknown';

// Content fingerprints for files the app loads by a fixed name (models, the built test centres): added to their
// addresses (src/assets/versioned.ts) so a changed file is fetched afresh however long a host lets browsers keep it.
const hash=(buffers:Buffer[])=>{const h=createHash('sha1');for(const b of buffers)h.update(b);return h.digest('hex').slice(0,8)};
const files=(dir:string):string[]=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const publicDir=`${repoRoot}public`;
const assetVersions:Record<string,string>=Object.fromEntries(
  [...files(`${publicDir}/assets/models`),...files(`${publicDir}/assets/licensed`)].map(f=>[path.relative(publicDir,f).split(path.sep).join('/'),hash([fs.readFileSync(f)])]));
// (The 351 test centres share one fingerprint: one entry instead of hundreds.)
assetVersions['centres/']=hash(files(`${publicDir}/centres`).sort().map(f=>fs.readFileSync(f)));

export default defineConfig({
  define:{
    __ASSET_VERSIONS__:JSON.stringify(assetVersions),
    __BUILD_COMMIT__:JSON.stringify(commit),
    __BUILD_BRANCH__:JSON.stringify(branch),
    __BUILD_TIME__:JSON.stringify(new Date().toISOString().replace('T',' ').slice(0,16)+' UTC')
  },
  root:fileURLToPath(new URL('.',import.meta.url)),
  base:'./',
  publicDir:`${repoRoot}public`,
  // The accounts service (server/), when run locally: same origin, as when hosted.
  server:{fs:{allow:[repoRoot]},proxy:{'/api':'http://localhost:8787'}},
  preview:{proxy:{'/api':'http://localhost:8787'}},
  build:{
    outDir:`${repoRoot}dist-sim`,
    emptyOutDir:true,
    sourcemap:true,
    chunkSizeWarningLimit:6000
  }
});
