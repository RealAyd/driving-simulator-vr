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
