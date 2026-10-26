import type {ChildProcess} from 'node:child_process';
import {expect,test,type Page} from '@playwright/test';
import {startServer,stopServer} from './server';

// The admin hub (/admin.html) against the accounts service with local fakes: ADMIN_EMAILS is boss@example.com.
test.describe.configure({mode:'serial'});
let api:ChildProcess;
test.beforeAll(async()=>{api=await startServer({ADMIN_EMAILS:'boss@example.com'})});
test.afterAll(()=>stopServer(api));

async function signIn(page:Page,email:string){
  await page.goto('./admin.html');
  await expect(page.locator('#signin')).toBeVisible();
  await page.fill('#email',email);
  await page.click('#email-form button');
  await expect(page.locator('#code-form')).toBeVisible();
  const mail=await (await page.request.get('/api/dev/outbox')).json() as Array<{to:string;subject:string}>;
  await page.fill('#code',/(\d{6})/.exec(mail.filter(m=>m.to===email).at(-1)!.subject)![1]!);
  await page.click('#code-form button');
}

test('G29: a learner is not let in; the admin sees the overview, finds a customer, adjusts their sessions, and sees payments and referrals',async({page,browser})=>{
  test.setTimeout(120_000);
  // A customer who has bought sessions.
  const customer=await browser.newPage();
  await customer.goto('./admin.html');
  await customer.request.post('/api/dev/signin',{data:{email:'customer@example.com'}});
  await customer.request.post('/api/dev/checkout',{data:{pack:'vr-15'}});
  await customer.close();

  await signIn(page,'learner@example.com');
  await expect(page.locator('#denied')).toBeVisible();
  await expect(page.locator('#tabs')).toBeHidden();
  await page.click('#signout');

  await signIn(page,'boss@example.com');
  await expect(page.locator('#tabs')).toBeVisible();
  await expect(page.locator('#who')).toHaveText('boss@example.com');
  await expect(page.locator('#stats .stat')).toHaveCount(14);
  await expect(page.locator('#stats')).toContainText('£24.99');
  await page.screenshot({path:test.info().outputPath('g29-overview.png'),fullPage:true});

  await page.click('[data-tab=customers]');
  await page.fill('#customer-q','customer@');
  await page.click('#customer-search button');
  await expect(page.locator('#customer-rows tr')).toHaveCount(1);
  await page.click('#customer-rows tr');
  await expect(page.locator('#customer-email')).toHaveText('customer@example.com');
  await expect(page.locator('#customer-balance')).toHaveText('15');
  page.on('dialog',d=>d.accept());
  await page.fill('#adjust-n','2');
  await page.fill('#adjust-reason','Goodwill: the drive froze');
  await page.click('#adjust button');
  await expect(page.locator('#customer-balance')).toHaveText('17');
  await expect(page.locator('#ledger-rows tr').first()).toContainText('Goodwill: the drive froze');
  await expect(page.locator('#ledger-rows tr').first()).toContainText('boss@example.com');
  await page.screenshot({path:test.info().outputPath('g29-customer.png'),fullPage:true});

  await page.click('[data-tab=payments]');
  await expect(page.locator('#payment-rows')).toContainText('customer@example.com');
  await expect(page.locator('#payments-total')).toContainText('£24.99 paid');
  const download=page.waitForEvent('download');
  await page.click('#csv');
  expect((await download).suggestedFilename()).toMatch(/^payments-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/);

  await page.click('[data-tab=referrals]');
  await expect(page.locator('#referrals-note')).toContainText('0 people have brought in sign-ups');
});
