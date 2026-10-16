import * as esbuild from 'esbuild';
import path from 'node:path';
const shim = path.resolve('three-shim.cjs');
await esbuild.build({
  entryPoints: ['entry.js'], bundle: true, format: 'iife', minify: true, target: 'es2020',
  outfile: '../../vendor/google-tiles.bundle.js', legalComments: 'eof',
  banner: { js: '/* 3d-tiles-renderer@0.3.46 + three@0.164.0 DRACOLoader, bundled against A-Frame 1.6 window.THREE. Rebuild: tools/google-tiles (npm install && node build.mjs). */' },
  plugins: [{ name: 'three-shim', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: shim })); } }],
});
