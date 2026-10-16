import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

// The simulator is an isolated preview: its HTML entry lives in sim/ so the
// legacy production page at the repository root is never replaced by a build.
const repoRoot=fileURLToPath(new URL('..',import.meta.url));

export default defineConfig({
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
