import {defineConfig} from 'vitest/config';

// Long checks over every test centre pack (npm run stress): routes, directions, marking, scenery placement.
export default defineConfig({
  assetsInclude:['**/*.glb'],
  test:{include:['tests/stress/**/*.test.ts'],environment:'node',testTimeout:3_600_000,hookTimeout:600_000}
});
