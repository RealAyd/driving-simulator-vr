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
  await expect(page.locator('#account-note')).toContainText('Done: you have 0 sessions and your Starter Pass',{timeout:20_000});
  await expect(page.locator('#account-starter')).toContainText('Starter Pass left: 1 lesson, 1 mock test, 1 free drive');
  // Once per account: no longer offered.
  await expect(page.locator('#pack-list [data-pack=starter]')).toHaveCount(0);
  await expect(page.locator('#account-chip')).toHaveText('0 sessions + Starter');
  await page.click('#account-close');
  // This practice drive is a free drive: it uses the Starter's free drive (not the lesson or the mock test).
  await expect(page.locator('#session-note')).toContainText('Uses your Starter Pass free drive');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  const me=await (await page.request.get('/api/me')).json();
  expect(me.allowances).toEqual({lesson:1,test:1,free:0});
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
  await friend.close();
  await inviter.reload();
  await expect(inviter.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(inviter.locator('#account-chip')).toHaveText('1 session',{timeout:30_000});
  await inviter.click('#account-chip');
  await expect(inviter.locator('#invite-stats')).toContainText('1 joined with your link · 1 free session earned');
});

test('G26: without access.json (the preview copies) nothing is gated',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.waitForTimeout(500);
  await expect(page.locator('#account-chip')).toBeHidden();
  await page.click('[data-exercise=moving-off]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
});
