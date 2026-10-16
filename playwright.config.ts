import {defineConfig} from '@playwright/test';

// Uses the preinstalled Chromium when PW_CHROMIUM is set (CI images and
// sandboxes); otherwise Playwright's own browser.
const executablePath=process.env.PW_CHROMIUM;

export default defineConfig({
  testDir:'tests/browser',
  timeout:90_000,
  use:{
    baseURL:'http://localhost:4173/',
    viewport:{width:1280,height:720},
    launchOptions:{
      ...(executablePath?{executablePath}:{}),
      args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
    }
  },
  webServer:{
    command:'npm run preview',
    url:'http://localhost:4173/',
    reuseExistingServer:true,
    timeout:60_000
  },
  // In CI, failures also become GitHub check annotations (readable without log access).
  reporter:process.env.CI?[['github'],['list']]:[['list']]
});
