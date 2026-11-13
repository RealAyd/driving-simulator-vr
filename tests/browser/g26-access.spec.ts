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
  // (Shown once the account is read, which waits on the main thread: slow while a second page builds its scene.)
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
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

test('G26: a free try without signing up (one free drive here), used only when completed; then Start asks to sign up to save progress; Continue driving opens the paywall from the Starter Pass; paying starts the drive',async({page})=>{
  test.setTimeout(300_000);
  await gated(page);
  await expect(page.locator('#account-chip')).toHaveText('Sign in');
  await expect(page.locator('#free-badge')).toHaveText('Your first 3 drives are free');
  await expect(page.locator('[data-public-link]').first()).toBeHidden();
  await expect(page.locator('#view-passes')).toBeVisible();
  // Each card says its free try is there.
  await expect(page.locator('[data-try]')).toHaveText(['1 free','1 free','1 free']);
  await pick(page,'moving-off');
  // The device's free try: this practice drive is its first free drive, with no sign-up.
  await expect(page.locator('#session-note')).toHaveText('Your free drive: no sign-up needed, used if you complete it');
  // Started and left part-way: nothing used.
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible();
  expect((await (await page.request.get('/api/me')).json()).trial).toEqual({lesson:1,test:1,free:1});
  // Completed (moved off with assisted steering once the road users have passed): the free drive is used.
  await page.evaluate(()=>{const r=document.querySelector<HTMLInputElement>('input[name="steering"][value="assist"]')!;r.checked=true;r.dispatchEvent(new Event('change'))});
  await page.click('#retry-button');
  await expect.poll(()=>read(page,'session()'),{timeout:20_000}).toBe('running');
  await page.waitForFunction(()=>{const p=(window as any).__drivingPractice.passersDetail();return p.length>0&&p.every((x:any)=>x.pose.position.z<-10)},undefined,{timeout:200_000,polling:200});
  await page.locator('canvas').first().focus();
  await page.keyboard.down('KeyW');
  await expect(page.locator('#screen-results')).toBeVisible({timeout:120_000});
  await page.keyboard.up('KeyW');
  expect((await read(page,'result()')).outcome).toBe('completed');
  await expect.poll(async()=>(await (await page.request.get('/api/me')).json()).trial,{timeout:10_000}).toEqual({lesson:1,test:1,free:0});
  await page.click('#menu-button');
  await page.click('#place-back');
  // Used: the home screen says so on Free Drive (the drills use the free drive too), and the others are still free.
  await expect(page.locator('[data-try=free]')).toHaveText('Free try used');
  await expect(page.locator('[data-try=lesson]')).toHaveText('1 free');
  await expect(page.locator('[data-try=test]')).toHaveText('1 free');
  await expect(page.locator('#free-badge')).toHaveText('2 free drives left');
  await page.screenshot({path:test.info().outputPath('g26-free-try-used.png')});
  await pick(page,'moving-off');
  await expect(page.locator('#session-note')).toHaveText('You have used your free drive. Your 1 free lesson and 1 free mock test are still there.');
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
  // Continue driving, with nothing to drive on: the paywall, with the unlimited passes.
  await expect(page.locator('#screen-account')).toHaveAttribute('data-mode','paywall');
  await expect(page.locator('#account-main-title')).toHaveText('Keep driving');
  await expect(page.locator('#account-balance')).toBeHidden();
  await expect(page.locator('#pack-list [data-pack=monthly]')).toContainText('Monthly Unlimited Pass');
  await expect(page.locator('#pack-list [data-pack=monthly]')).toContainText('Cancel anytime');
  await expect(page.locator('#pack-list [data-pack=starter]')).toHaveCount(0);
  // Invite a friend is there too: the way to keep driving for free.
  await expect(page.locator('#screen-account .invite-box')).toBeVisible();
  await expect(page.locator('#screen-account .invite-box')).toContainText('you both get 2 free drives');
  await page.screenshot({path:test.info().outputPath('g26-paywall.png')});
  // Paid: the drive that was waiting starts, and every drive is unlimited for the month.
  await page.click('#pack-list [data-pack=monthly]');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  await expect(page.locator('#screen-account')).toBeHidden();
  const me=await (await page.request.get('/api/me')).json();
  expect(me.balance).toBe(0);
  expect((Date.parse(me.unlimitedUntil)-Date.now())/86400_000).toBeGreaterThan(28);
  // (The account screen is behind the drive: its contents are checked as they are.)
  await expect(page.locator('#account-chip')).toHaveText('Unlimited');
  await expect(page.locator('#account-balance')).toHaveText('Unlimited');
  await expect(page.locator('#account-balance-unit')).toHaveText(/^until \d{1,2} \w{3}$/);
});

test('G26: invite a friend from the home screen: the friend signs in with 2 free drives; once they complete a drive, the inviter gets 2',async({browser})=>{
  test.setTimeout(240_000);
  const inviter=await browser.newPage();
  await gated(inviter);
  // The home screen's invite card: signed out, it opens sign-in; signed in, the account screen with the link.
  await expect(inviter.locator('#invite-home')).toBeVisible();
  await expect(inviter.locator('#invite-home')).toContainText('You both get 2 free drives');
  await inviter.click('#invite-home');
  await signInByEmail(inviter,'inviter@example.com');
  const link=await inviter.inputValue('#invite-link');
  expect(link).toMatch(/\?ref=[A-Z2-9]{8}$/);
  const friend=await browser.newPage();
  await gated(friend,`./${new URL(link).search}`);
  await friend.click('#account-chip');
  await expect(friend.locator('#account-invited')).toHaveText('A friend invited you: sign in for 2 free drives.');
  await signInByEmail(friend,'friend@example.com');
  await expect(friend.locator('#account-balance')).toHaveText('2');
  // The friend completes a drive (as the app reports it).
  const drive=await (await friend.request.post('/api/drives',{data:{kind:'free',scenario:'goodmayes-free-drive'}})).json() as {driveId:string};
  await friend.request.post(`/api/drives/${drive.driveId}/completed`,{data:{}});
  await friend.close();
  await inviter.reload();
  await expect(inviter.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(inviter.locator('#account-chip')).toHaveText('2 drives',{timeout:30_000});
  await inviter.click('#account-chip');
  await expect(inviter.locator('#invite-stats')).toContainText('1 joined with your link · 2 free drives earned');
});

test('G26: blocking access.json does not open the paid app: where the accounts service answers, drives still go through it (the free try)',async({page})=>{
  await page.route('**/access.json',r=>r.abort());
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
  await pick(page,'moving-off');
  // (The note follows the account check, which waits for the server.)
  await expect(page.locator('#session-note')).toHaveText('Your free drive: no sign-up needed, used if you complete it',{timeout:20_000});
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
