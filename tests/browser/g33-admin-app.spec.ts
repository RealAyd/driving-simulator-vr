import type {ChildProcess} from 'node:child_process';
import {expect,test,type Page} from '@playwright/test';
import {startServer,stopServer} from './server';
import {pick} from './home';

// An admin in the app: signed in under an alias of ADMIN_EMAILS (a Gmail address with a dot and a +tag), every kind
// of drive starts with no sessions, the simulation's options are on the account screen, and the hub opens.
test.describe.configure({mode:'serial'});
let api:ChildProcess;
test.beforeAll(async()=>{api=await startServer({ADMIN_EMAILS:'bossowner@gmail.com'})});
test.afterAll(()=>stopServer(api));

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G33: an admin starts lessons, mock tests and free drives with no sessions, sets the simulation options and opens the hub',async({page})=>{
  // (Goodmayes is built three times: one drive of each kind.)
  test.setTimeout(600_000);
  const email='boss.owner+dp@gmail.com';
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.goto('./');
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
  await page.click('#account-chip');
  await page.fill('#email-input',email);
  await page.click('#email-send');
  const mail=await (await page.request.get('/api/dev/outbox')).json() as Array<{to:string;subject:string}>;
  await page.fill('#code-input',/(\d{6})/.exec(mail.filter(m=>m.to===email).at(-1)!.subject)![1]!);
  await page.click('#code-send');
  await expect(page.locator('#admin-tools')).toBeVisible();
  await expect(page.locator('#account-chip')).toHaveText('Admin');
  await expect(page.locator('#account-balance')).toHaveText('0');
  await page.click('#account-close');

  // Every mode starts, none uses a session (the free tries stay too).
  for(const mode of ['free','lesson','test'] as const){
    await pick(page,'goodmayes',mode);
    await expect(page.locator('#session-note')).toHaveText('Admin: drives do not use sessions',{timeout:90_000});
    if(mode==='lesson')await page.click('#lesson-list [data-lesson]');
    await expect(page.locator('#busy')).toBeHidden({timeout:120_000});
    await page.click('#start-practice');
    await expect.poll(()=>read(page,'session()'),{timeout:90_000}).not.toBe('ready');
    await expect(page.locator('#screen-account')).toBeHidden();
    await page.goto('./');
    await expect(page.locator('#account-chip')).toHaveText('Admin',{timeout:60_000});
  }
  const me=await (await page.request.get('/api/me')).json();
  expect(me.admin).toBe(true);
  expect(me.balance).toBe(0);
  expect(me.trial).toEqual({lesson:1,test:1,free:1});

  // The simulation's options: a change reloads with it in the address.
  await page.click('#account-chip');
  await page.selectOption('[data-sim-option=cars]','old');
  await expect(page).toHaveURL(/[?&]cars=old/);
  await page.click('#account-chip',{timeout:60_000});
  await expect(page.locator('[data-sim-option=cars]')).toHaveValue('old');

  // The hub, with the same sign-in.
  const [hub]=await Promise.all([page.waitForEvent('popup'),page.click('#admin-hub')]);
  await expect(hub.locator('#tabs')).toBeVisible({timeout:20_000});
  await expect(hub.locator('#who')).toHaveText(email);
});
