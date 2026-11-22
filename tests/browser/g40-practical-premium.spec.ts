import type {ChildProcess} from 'node:child_process';
import {expect,test,type Page} from '@playwright/test';
import {startServer,stopServer} from './server';
import {pick} from './home';

// Practical Premium (Release 2) with the accounts service running locally with fakes and the mocked Practical: link
// through the mock consent page, Premium shown, a drive under Premium uses nothing, a Premium-first card, and the
// question asked when Premium cannot be confirmed. Nothing here talks to a real Practical.
test.describe.configure({mode:'serial'});
let api:ChildProcess;
test.beforeAll(async()=>{api=await startServer({PRACTICAL_PREMIUM:'1',PRACTICAL_PREMIUM_FIRST:'crossing-restricted-view',PRACTICAL_NOTICE_SECRET:'test-only-secret'})});
test.afterAll(()=>stopServer(api));

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
async function home(page:Page){
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
}
/** Links the signed-in account through the mock Practical's consent page, as one of its kinds of account. */
async function link(page:Page,kind:string){
  await page.click('#account-chip');
  await page.click('#practical-link');
  await expect(page.locator('h1')).toHaveText('Mock Practical: allow the simulator?');
  await page.click(`text=${kind}`);
  await expect(page.locator('#screen-account')).toBeVisible({timeout:60_000});
}
const me=async(page:Page)=>(await (await page.request.get('/api/me')).json()) as {balance:number};

test('G40: link to Practical, Premium shown; a Premium drive uses nothing; a Premium-first card; unconfirmed Premium asks first',async({page})=>{
  test.setTimeout(480_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await home(page);
  await page.request.post('/api/dev/signin',{data:{email:'learner@example.com'}});
  await home(page);

  // Not linked: the account screen offers the link.
  await page.click('#account-chip');
  await expect(page.locator('#practical-link')).toBeVisible();
  await expect(page.locator('#practical-unlink')).toBeHidden();
  await page.screenshot({path:test.info().outputPath('g40-01-not-linked.png')});
  await page.click('#account-close');

  // Linked as a learner whose web Premium runs for another month: Premium shown.
  await link(page,'monthly');
  await expect(page.locator('#account-balance')).toHaveText('Unlimited');
  await expect(page.locator('#account-balance-unit')).toHaveText('with Practical Premium');
  await expect(page.locator('#account-chip')).toHaveText('Unlimited');
  await expect(page.locator('#practical-unlink')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('g40-02-premium-linked.png')});
  await page.click('#account-close');

  // The zebra card opens first to Premium learners: it says so.
  await page.click('[data-drive-mode=lesson]');
  const card=page.locator('[data-exercise="zebra"][data-premium-first]').first();
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath('g40-03-premium-first-card.png')});

  // A drive under Premium, with no sessions at all: it starts, and nothing is used.
  expect((await me(page)).balance).toBe(0);
  await card.click();
  await expect(page.locator('#session-note')).toHaveText('Practical Premium: unlimited');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible();
  expect((await me(page)).balance).toBe(0);
  await page.click('#menu-button');
  await page.click('#place-back');

  // Practical cannot be reached: nothing is granted, and with sessions held the learner is asked first.
  await page.click('#account-chip');
  await page.click('#practical-unlink');
  await expect(page.locator('#practical-link')).toBeVisible();
  await page.click('#account-close');
  await page.request.post('/api/dev/checkout',{data:{pack:'vr-5'}});
  await link(page,'unreachable');
  await expect(page.locator('#practical-status')).toHaveText('Practical Premium could not be confirmed');
  await page.click('#account-close');
  await pick(page,'moving-off');
  await page.click('#start-practice');
  await expect(page.locator('#premium-prompt')).toBeVisible({timeout:30_000});
  await expect(page.locator('#premium-use-session')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('g40-04-premium-unconfirmed.png')});
  // Cancel: nothing starts, nothing used.
  await page.click('#premium-cancel');
  await expect(page.locator('#premium-prompt')).toBeHidden();
  expect(await read(page,'session()')).not.toBe('running');
  expect((await me(page)).balance).toBe(5);
  // Use a session: the drive starts on one (used when completed, as any session drive).
  await page.click('#start-practice');
  await expect(page.locator('#premium-prompt')).toBeVisible({timeout:30_000});
  await page.click('#premium-use-session');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  expect(errors).toEqual([]);
});

test('G40: off, nothing of it shows',async({page})=>{
  await stopServer(api);
  api=await startServer({});
  await home(page);
  await page.request.post('/api/dev/signin',{data:{email:'off@example.com'}});
  await home(page);
  await page.click('#account-chip');
  await expect(page.locator('#account-main')).toBeVisible();
  await expect(page.locator('#practical-box')).toBeHidden();
  await expect(page.locator('[data-premium-first]')).toHaveCount(0);
  expect((await page.request.get('/api/practical/status')).status()).toBe(404);
});
