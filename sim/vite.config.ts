import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {execSync} from 'node:child_process';

// The simulator is an isolated preview: its HTML entry lives in sim/ so the
// legacy production page at the repository root is never replaced by a build.
const repoRoot=fileURLToPath(new URL('..',import.meta.url));

// Shown on the start screen so a device test can be tied to an exact commit.
const commit=(()=>{
  try{
    const sha=execSync('git rev-parse --short HEAD').toString().trim();
    const dirty=execSync('git status --porcelain').toString().trim()?'+local changes':'';
    return sha+dirty;
  }catch{return 'unknown'}
})();

export default defineConfig({
  define:{__BUILD_COMMIT__:JSON.stringify(commit)},
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
