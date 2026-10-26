import type {ChildProcess} from 'node:child_process';
import {expect,test,type Page} from '@playwright/test';
import {startServer,stopServer} from './server';
import {pick} from './home';

// Paid access with the accounts service (server/) running locally with fakes: no real email, sign-in or payment.
// The preview build is ungated; access.json is served here as the hosted copy has it.
test.describe.configure({mode:'serial'});
let api:ChildProcess;
test.beforeAll(async()=>{api=await startServer({})});
test.afterAll(()=>stopServer(api));

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
async function gated(page:Page,path='./'){
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.goto(path);
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#account-chip')).toBeVisible({timeout:20_000});
}
/** Signs in with a code from the (fake) email. */
async function signInByEmail(page:Page,email:string){
  await page.fill('#email-input',email);
  await page.click('#email-send');
  await expect(page.locator('#code-form')).toBeVisible();
  const mail=await (await page.request.get('/api/dev/outbox')).json() as Array<{to:string;subject:string}>;
  const code=/(\d{6})/.exec(mail.filter(m=>m.to===email).at(-1)!.subject)![1]!;
  await page.fill('#code-input',code);
  await page.click('#code-send');
  await expect(page.locator('#account-main')).toBeVisible();
}

test('G26: a free try without signing up (one free drive here); then Start asks to sign up to save progress; Continue driving opens the paywall from the Starter Pass; paying starts the drive',async({page})=>{
  test.setTimeout(300_000);
  await gated(page);
  await expect(page.locator('#account-chip')).toHaveText('Sign in');
  await expect(page.locator('#free-badge')).toHaveText('Your first 3 drives are free');
  await expect(page.locator('#view-passes')).toBeVisible();
  // Each card says its free try is there.
  await expect(page.locator('[data-try]')).toHaveText(['Free','Free','Free']);
  await pick(page,'moving-off');
  // The device's free try: this practice drive is its free drive, with no sign-up.
  await expect(page.locator('#session-note')).toHaveText('Your free drive: no sign-up needed');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  expect((await (await page.request.get('/api/me')).json()).trial).toEqual({lesson:1,test:1,free:0});
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible();
  await page.click('#menu-button');
  // Used: the home screen says so on Free Drive (the drills use the free drive too), and the others are still free.
  await page.click('#place-back');
  await expect(page.locator('[data-try=free]')).toHaveText('Free try used');
  await expect(page.locator('[data-try=lesson]')).toHaveText('Free');
  await expect(page.locator('[data-try=test]')).toHaveText('Free');
  await expect(page.locator('#free-badge')).toHaveText('2 free drives left');
  await page.screenshot({path:test.info().outputPath('g26-free-try-used.png')});
  await pick(page,'moving-off');
  await expect(page.locator('#session-note')).toHaveText('You have used your free drive. Your free lesson and free mock test are still there.');
  // Used: Start asks to sign up, to save progress (a lesson finished on this device goes to the account).
  await page.evaluate(()=>localStorage.setItem('dp-lessons-done',JSON.stringify(['moving-off-and-stopping'])));
  await expect(page.locator('#session-note')).toContainText('You have used your free drive');
  await page.click('#start-practice');
  await expect(page.locator('#screen-account')).toBeVisible();
  await expect(page.locator('#account-title')).toHaveText('Sign up to save your progress');
  await expect(page.locator('#code-send')).toHaveText('Continue driving');
  await expect(page.locator('#trial-note')).toBeHidden();
  expect(await read(page,'session()')).toBe('ready');
  await signInByEmail(page,'learner@example.com');
  expect((await (await page.request.get('/api/me')).json()).lessonsDone).toEqual(['moving-off-and-stopping']);
  // Continue driving, with nothing to drive on: the paywall, from the Starter Pass up.
  await expect(page.locator('#screen-account')).toHaveAttribute('data-mode','paywall');
  await expect(page.locator('#account-main-title')).toHaveText('Keep driving');
  await expect(page.locator('#account-balance')).toBeHidden();
  await expect(page.locator('#pack-list [data-pack]')).toHaveCount(4);
  await expect(page.locator('#pack-list [data-pack]').first()).toHaveAttribute('data-pack','starter');
  await expect(page.locator('#pack-list [data-pack=starter]')).toContainText('1 lesson, 1 mock test and 1 free drive · once per account');
  await page.screenshot({path:test.info().outputPath('g26-paywall.png')});
  // Paid: the drive that was waiting starts, on the Starter's free drive (not the lesson or the mock test).
  await page.click('#pack-list [data-pack=starter]');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  await expect(page.locator('#screen-account')).toBeHidden();
  const me=await (await page.request.get('/api/me')).json();
  expect(me.allowances).toEqual({lesson:1,test:1,free:0});
  expect(me.balance).toBe(0);
  // (The account screen is behind the drive: its contents are checked as they are.)
  await expect(page.locator('#account-chip')).toHaveText('2 drives');
  await expect(page.locator('#account-balance-unit')).toHaveText('drives');
  await expect(page.locator('#account-breakdown')).toContainText('Starter Pass');
  await expect(page.locator('#account-breakdown')).toContainText('Lesson: ready');
  await expect(page.locator('#account-breakdown .used')).toHaveText('Free drive: used');
  await expect(page.locator('#account-breakdown')).toContainText('0 sessions');
  // Once per account: no longer offered.
  await expect(page.locator('#pack-list [data-pack=starter]')).toHaveCount(0);
  expect(me.history[0].type).toBe('consumed');
});

test('G26: an invite link: the friend signs in and has one free drive; the inviter is rewarded with one session after the friend first pays',async({browser})=>{
  test.setTimeout(240_000);
  const inviter=await browser.newPage();
  await gated(inviter);
  await inviter.click('#account-chip');
  await signInByEmail(inviter,'inviter@example.com');
  const link=await inviter.inputValue('#invite-link');
  expect(link).toMatch(/\?ref=[A-Z2-9]{8}$/);
  const friend=await browser.newPage();
  await gated(friend,`./${new URL(link).search}`);
  await friend.click('#account-chip');
  await expect(friend.locator('#account-invited')).toBeVisible();
  await signInByEmail(friend,'friend@example.com');
  await expect(friend.locator('#account-balance')).toHaveText('1');
  await friend.click('#pack-list [data-pack=vr-5]');
  await expect(friend.locator('#account-balance')).toHaveText('6',{timeout:20_000});
  await expect(friend.locator('#account-note')).toContainText('Payment received. 5 sessions added.');
  await friend.close();
  await inviter.reload();
  await expect(inviter.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(inviter.locator('#account-chip')).toHaveText('1 drive',{timeout:30_000});
  await inviter.click('#account-chip');
  await expect(inviter.locator('#invite-stats')).toContainText('1 joined with your link · 1 free session earned');
});

test('G26: blocking access.json does not open the paid app: where the accounts service answers, drives still go through it (the free try)',async({page})=>{
  await page.route('**/access.json',r=>r.abort());
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#account-chip')).toBeVisible({timeout:20_000});
  await pick(page,'moving-off');
  // (The note follows the account check, which waits for the server.)
  await expect(page.locator('#session-note')).toHaveText('Your free drive: no sign-up needed',{timeout:20_000});
});

test('G26: the guided introduction needs no session because it is parked: the car cannot be driven, and nothing is saved',async({page})=>{
  test.setTimeout(180_000);
  await gated(page);
  await pick(page,'moving-off');
  await page.click('#start-intro');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  // Accelerate with the keyboard (the on-screen Go is not shown here): the car stays put.
  await page.locator('canvas').first().focus();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3000);
  await page.keyboard.up('KeyW');
  expect((await read(page,'vehicle()')).speed).toBeLessThan(.05);
  // Ended from the pause menu: not saved; trying again is free (still parked).
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible();
  await expect(page.locator('#results-meta')).toContainText('parked practice: not scored and not saved');
  await page.click('#retry-button');
  await expect.poll(()=>read(page,'session()'),{timeout:20_000}).toBe('running');
  await expect(page.locator('#screen-account')).toBeHidden();
});

test('G26: without access.json or an accounts service (the preview copies) nothing is gated',async({page})=>{
  await page.route('**/api/**',r=>r.fulfill({status:404,contentType:'text/html',body:'no service here'}));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.waitForTimeout(500);
  await expect(page.locator('#account-chip')).toBeHidden();
  await pick(page,'moving-off');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
});
