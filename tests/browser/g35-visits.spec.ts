import type {ChildProcess} from 'node:child_process';
import {expect,test} from '@playwright/test';
import {startServer,stopServer} from './server';

// Visits (src/app/visits.ts): the app reports where it was opened from, the screens shown and the buttons pressed to
// its own server, and the admin hub's Visitors tab sums them up. (Off in automated browsers: turned on here.)
test.describe.configure({mode:'serial'});
let api:ChildProcess;
test.beforeAll(async()=>{api=await startServer({ADMIN_EMAILS:'boss@example.com'})});
test.afterAll(()=>stopServer(api));

test('G35: a visit from a campaign link is recorded (screens, presses) and shown on the Visitors tab',async({page,context})=>{
  await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false}));
  let posts=0;
  page.on('request',r=>{if(r.url().endsWith('/api/visits'))posts++});
  await page.goto('./?utm_source=flyer&utm_campaign=autumn');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(async()=>{await page.click('[data-drive-mode=test]');await expect(page.locator('#place-list')).toBeVisible({timeout:1000})}).toPass({timeout:20_000});
  await page.waitForTimeout(1500);
  // Leaving sends what is left (a beacon as the page goes).
  await page.goto('about:blank');
  await expect.poll(()=>posts,{timeout:10_000}).toBeGreaterThan(0);
  // The admin sees it.
  const admin=await context.newPage();
  await admin.goto('./');
  await admin.request.post('/api/dev/signin',{data:{email:'boss@example.com'},headers:{Origin:'http://localhost:4173'}});
  await expect.poll(async()=>(await (await admin.request.get('/api/admin/visits?days=1')).json()).totals?.visitors,{timeout:10_000}).toBe(1);
  const v=await (await admin.request.get('/api/admin/visits?days=1')).json();
  expect(v.sources[0]).toMatchObject({source:'flyer',sessions:1});
  expect(v.campaigns[0].campaign).toBe('flyer · autumn');
  expect(v.screens.map((s:{screen:string})=>s.screen)).toContain('mock tests');
  expect(v.clicks.length).toBeGreaterThan(0);
  await admin.goto('./admin.html');
  await admin.click('[data-tab=visitors]');
  await expect(admin.locator('#visit-sources')).toContainText('flyer');
  await expect(admin.locator('#visit-screens')).toContainText('mock tests');
});

test('G35: someone who leaves while the app is still loading is counted (the page\'s own first record), with the social app it was opened in',async({browser})=>{
  const context=await browser.newContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0'});
  const page=await context.newPage();
  await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false}));
  // The app never arrives (a slow connection): only the page's own record goes.
  await page.route(/\/assets\/index-.*\.js$/,()=>new Promise(()=>{}));
  let landed=0;
  page.on('request',r=>{if(r.url().endsWith('/api/visits'))landed++});
  // (The page never finishes loading: waiting only until it starts.)
  await page.goto('./',{waitUntil:'commit'});
  await expect.poll(()=>landed,{timeout:10_000}).toBeGreaterThan(0);
  await page.close();
  const admin=await context.newPage();
  await admin.request.post('/api/dev/signin',{data:{email:'boss@example.com'},headers:{Origin:'http://localhost:4173'}});
  const v=await (await admin.request.get('/api/admin/visits?days=1')).json();
  expect(v.totals.leftWhileLoading).toBeGreaterThanOrEqual(1);
  expect(v.sources.map((s:{source:string})=>s.source)).toContain('instagram');
  await context.close();
});
