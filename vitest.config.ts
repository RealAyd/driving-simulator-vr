import {defineConfig} from 'vitest/config';

export default defineConfig({
  // Models are assets (the asset-register test reads them as data URLs).
  assetsInclude:['**/*.glb'],
  test:{include:['tests/unit/**/*.test.ts'],environment:'node'}
});
