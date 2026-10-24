import {execSync,spawn,type ChildProcess} from 'node:child_process';
import {expect,test,type Page} from '@playwright/test';

// Paid access with the accounts service (server/) running locally with fakes: no real email, sign-in or payment.
// The preview build is ungated; access.json is served here as the hosted copy has it.
test.describe.configure({mode:'serial'});
let api:ChildProcess;
test.beforeAll(async()=>{
  execSync('npm run build:server',{stdio:'ignore'});
  api=spawn('node',['server/dist/index.js'],{env:{...process.env,DP_DEV_FAKES:'1',PORT:'8787',APP_BASE_URL:'http://localhost:4173'},stdio:'ignore'});
  await expect.poll(async()=>(await fetch('http://localhost:8787/healthz').catch(()=>null))?.status??0,{timeout:15_000}).toBe(200);
});
test.afterAll(()=>{api?.kill()});

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
async function gated(page:Page,path='./'){
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.goto(path);
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#account-chip')).toBeVisible();
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

test('G26: nothing is free: Start asks to sign in; signed in with no sessions it asks to buy; a pack adds its sessions; each drive uses one',async({page})=>{
  test.setTimeout(240_000);
  await gated(page);
  await expect(page.locator('#account-chip')).toHaveText('Sign in');
  await page.click('[data-exercise=moving-off]');
  await expect(page.locator('#session-note')).toContainText('Sign in to start');
  await page.click('#start-practice');
  await expect(page.locator('#screen-account')).toBeVisible();
  await expect(page.locator('#account-reason')).toContainText('Sign in to start');
  expect(await read(page,'session()')).toBe('ready');
  await signInByEmail(page,'learner@example.com');
  await expect(page.locator('#account-balance')).toHaveText('0');
  // The packs on sale; the starter once per account.
  await expect(page.locator('#pack-list [data-pack]')).toHaveCount(4);
  await expect(page.locator('#pack-list [data-pack=starter]')).toContainText('1 lesson, 1 mock test and 1 free drive · once per account');
  await page.click('#account-close');
  await page.click('#start-practice');
  await expect(page.locator('#account-note')).toContainText('You have no free drives or sessions left');
  await page.click('#pack-list [data-pack=starter]');
  await expect(page.locator('#account-note')).toContainText('Payment received. Starter Pass added: 1 lesson, 1 mock test and 1 free drive.',{timeout:20_000});
  // The headline counts every drive that can be started; the breakdown shows what they are.
  await expect(page.locator('#account-balance')).toHaveText('3');
  await expect(page.locator('#account-balance-unit')).toHaveText('drives you can start');
  await expect(page.locator('#account-breakdown')).toContainText('Starter Pass');
  await expect(page.locator('#account-breakdown')).toContainText('Lesson: ready');
  await expect(page.locator('#account-breakdown')).toContainText('Mock test: ready');
  await expect(page.locator('#account-breakdown')).toContainText('Free drive: ready');
  await expect(page.locator('#account-breakdown')).toContainText('0 sessions');
  // Once per account: no longer offered.
  await expect(page.locator('#pack-list [data-pack=starter]')).toHaveCount(0);
  await expect(page.locator('#account-chip')).toHaveText('3 drives');
  await page.click('#account-close');
  // This practice drive is a free drive: it uses the Starter's free drive (not the lesson or the mock test).
  await expect(page.locator('#session-note')).toContainText('Uses your Starter Pass free drive');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  const me=await (await page.request.get('/api/me')).json();
  expect(me.allowances).toEqual({lesson:1,test:1,free:0});
  // (The account screen is behind the drive: its contents are checked as they are.)
  await expect(page.locator('#account-chip')).toHaveText('2 drives');
  await expect(page.locator('#account-breakdown .used')).toHaveText('Free drive: used');
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

test('G26: blocking access.json does not open the paid app: where the accounts service answers, Start still asks to sign in',async({page})=>{
  await page.route('**/access.json',r=>r.abort());
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#account-chip')).toBeVisible({timeout:20_000});
  await page.click('[data-exercise=moving-off]');
  await page.click('#start-practice');
  await expect(page.locator('#screen-account')).toBeVisible();
  expect(await read(page,'session()')).toBe('ready');
});

test('G26: the guided introduction needs no session because it is parked: the car cannot be driven, and nothing is saved',async({page})=>{
  test.setTimeout(180_000);
  await gated(page);
  await page.click('[data-exercise=moving-off]');
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
  await page.click('[data-exercise=moving-off]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
});
