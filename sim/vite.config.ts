import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {execSync} from 'node:child_process';

// The simulator is an isolated preview: its HTML entry lives in sim/ so the
// legacy production page at the repository root is never replaced by a build.
const repoRoot=fileURLToPath(new URL('..',import.meta.url));

// Shown in the About panel so a device test can be tied to an exact build.
const git=(args:string)=>{try{return execSync(`git ${args}`,{stdio:['ignore','pipe','ignore']}).toString().trim()}catch{return ''}};
const commit=(git('rev-parse --short HEAD')||'unknown')+(git('status --porcelain')?' + local changes':'');
const ref=git('rev-parse --abbrev-ref HEAD');
const branch=ref&&ref!=='HEAD'?ref:process.env.PREVIEW_SOURCE_BRANCH??process.env.GITHUB_HEAD_REF??'unknown';

export default defineConfig({
  define:{
    __BUILD_COMMIT__:JSON.stringify(commit),
    __BUILD_BRANCH__:JSON.stringify(branch),
    __BUILD_TIME__:JSON.stringify(new Date().toISOString().replace('T',' ').slice(0,16)+' UTC')
  },
  root:fileURLToPath(new URL('.',import.meta.url)),
  base:'./',
  publicDir:`${repoRoot}public`,
  server:{fs:{allow:[repoRoot]}},
  build:{
    outDir:`${repoRoot}dist-sim`,
    emptyOutDir:true,
    sourcemap:true,
    chunkSizeWarningLimit:6000
  }
});
