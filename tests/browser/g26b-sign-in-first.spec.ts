import type {ChildProcess} from 'node:child_process';
import {expect,test} from '@playwright/test';
import {startServer,stopServer} from './server';
import {pick} from './home';

// Staging (SIGN_IN_FIRST): nothing is free while signed out; Start asks to sign in, and once signed in the drive starts.
let api:ChildProcess;
test.beforeAll(async()=>{api=await startServer({SIGN_IN_FIRST:'1'})});
test.afterAll(()=>stopServer(api));

test('G26b: sign-in first: no free try signed out; Start opens sign-in; signed in, the drive starts',async({page})=>{
  test.setTimeout(300_000);
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.goto('./');
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
  await expect(page.locator('#free-badge')).toBeHidden();
  // A way to the public site, on the home screen and on sign-in.
  await expect(page.locator('#screen-start [data-public-link] a')).toHaveAttribute('href','https://vr.drivingpractice.live/');
  await expect(page.locator('#screen-start [data-public-link]')).toBeVisible();
  await expect(page.locator('[data-try]')).toHaveCount(3);
  for(const tag of await page.locator('[data-try]').all())await expect(tag).toBeHidden();
  await pick(page,'moving-off');
  await expect(page.locator('#session-note')).toHaveText('Sign in to start');
  await page.click('#start-practice');
  await expect(page.locator('#screen-account')).toBeVisible();
  await expect(page.locator('#account-title')).toHaveText('Sign in');
  await expect(page.locator('#screen-account [data-public-link]')).toBeVisible();
  await page.fill('#email-input','tester@example.com');
  await page.click('#email-send');
  await expect(page.locator('#code-form')).toBeVisible();
  const mail=await (await page.request.get('/api/dev/outbox')).json() as Array<{to:string;subject:string}>;
  await page.fill('#code-input',/(\d{6})/.exec(mail.filter(m=>m.to==='tester@example.com').at(-1)!.subject)![1]!);
  await page.click('#code-send');
  // (Signed in with the device's free try: the drive that was waiting starts.)
  await expect.poll(()=>page.evaluate('window.__drivingPractice.session()'),{timeout:60_000}).toBe('running');
});
