import type {ChildProcess} from 'node:child_process';
import {expect,test,type Page} from '@playwright/test';
import {startServer,stopServer} from './server';

// Support: the customer's form and thread (/support.html) and the admin's Support tab, against the accounts service
// with local fakes (emails kept in the dev outbox). ADMIN_EMAILS is boss@example.com.
test.describe.configure({mode:'serial'});
let api:ChildProcess;
test.beforeAll(async()=>{api=await startServer({ADMIN_EMAILS:'boss@example.com',SUPPORT_INBOX:'inbox@example.com'})});
test.afterAll(()=>stopServer(api));

// A real 1×1 PNG (the browser must be able to show it).
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
type Mail={to:string;subject:string;text:string};
const mails=async(page:Page)=>await (await page.request.get('/api/dev/outbox')).json() as Mail[];
async function adminSignIn(page:Page){
  await page.goto('./admin.html');
  await page.fill('#email','boss@example.com');
  await page.click('#email-form button');
  await expect(page.locator('#code-form')).toBeVisible();
  const code=/(\d{6})/.exec((await mails(page)).filter(m=>m.to==='boss@example.com').at(-1)!.subject)![1]!;
  await page.fill('#code',code);
  await page.click('#code-form button');
  await expect(page.locator('#tabs')).toBeVisible();
}

test('G30: a signed-out request with a screenshot; the admin answers in the hub; the customer reads and replies from the emailed link',async({page,browser})=>{
  test.setTimeout(120_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  // The customer, signed out.
  await page.goto('./support.html');
  await expect(page.locator('#new')).toBeVisible();
  await page.fill('#email','learner@example.com');
  await page.fill('#phone','07700 900123');
  await page.selectOption('#category','paid-no-access');
  await page.fill('#description','I bought VR 5 but the app still says 0 drives.');
  await page.setInputFiles('#files',{name:'shot.png',mimeType:'image/png',buffer:PNG});
  await page.click('#send');
  await expect(page.locator('#sent-title')).toHaveText(/^Request DP-\d{4} sent$/);
  const ref=/DP-\d{4}/.exec(await page.locator('#sent-title').textContent()??'')![0]!;
  await page.screenshot({path:test.info().outputPath('g30-sent.png'),fullPage:true});
  // The admin's alert and the customer's copy (the worker sends them at once).
  await expect.poll(async()=>(await mails(page)).filter(m=>m.subject.includes(ref)).length,{timeout:10_000}).toBe(2);
  const all=await mails(page);
  expect(all.find(m=>m.to==='inbox@example.com'&&m.subject.includes(ref))!.subject).toContain('[High]');
  const copy=all.find(m=>m.to==='learner@example.com'&&m.subject.includes(ref))!;
  const link=new URL(/(http:\/\/localhost:4173\/support\.html\?\S+)/.exec(copy.text)![1]!);

  // The admin: Support tab, the request at the top, read it, a note, then a reply.
  const admin=await browser.newPage();
  await adminSignIn(admin);
  await expect(admin.locator('#support-count')).toHaveText('(1)');
  await admin.click('[data-tab=support]');
  await expect(admin.locator('#support-rows tr').first()).toContainText(ref);
  await expect(admin.locator('#support-rows tr').first().locator('.pri')).toHaveText('High');
  await admin.click('#support-rows tr >> nth=0');
  await expect(admin.locator('#ticket-title')).toHaveText(`${ref}: I paid but cannot get in`);
  await expect(admin.locator('#ticket-facts')).toContainText('+447700900123');
  await expect(admin.locator('#ticket-thread img')).toHaveCount(1);
  await expect.poll(()=>admin.locator('#ticket-thread img').evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBe(1);
  await admin.fill('#ticket-text','Checked the ledger: payment arrived.');
  await admin.click('#ticket-note');
  await expect(admin.locator('.bubble.note')).toContainText('Checked the ledger');
  admin.on('dialog',d=>d.accept());
  await admin.fill('#ticket-text','Sorry about that: your 5 sessions are there now.');
  await admin.click('#ticket-send');
  await expect(admin.locator('#ticket-reply-msg')).toContainText('Sent to the customer.');
  await expect(admin.locator('#ticket-state')).toHaveText('Awaiting customer');
  await admin.screenshot({path:test.info().outputPath('g30-admin-ticket.png'),fullPage:true});
  await expect.poll(async()=>(await mails(admin)).some(m=>m.to==='learner@example.com'&&m.subject===`Re: your request ${ref}`),{timeout:10_000}).toBe(true);
  expect(JSON.stringify((await mails(admin)).filter(m=>m.to==='learner@example.com'))).not.toContain('Checked the ledger');

  // The customer opens the emailed link: the reply (not the note), their screenshot, and they answer.
  await page.goto(`./support.html${link.search}`);
  await expect(page.locator('#thread-title')).toHaveText(`${ref}: I paid but cannot get in`);
  await expect(page.locator('#thread .bubble')).toHaveCount(2);
  await expect(page.locator('#thread')).toContainText('your 5 sessions are there now');
  await expect(page.locator('#thread')).not.toContainText('Checked the ledger');
  await expect.poll(()=>page.locator('#thread img').evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBe(1);
  await page.fill('#reply-text','Thank you, it works.');
  await page.click('#reply-send');
  await expect(page.locator('#reply-msg')).toContainText('Sent.');
  await expect(page.locator('#thread .bubble')).toHaveCount(3);
  await page.screenshot({path:test.info().outputPath('g30-customer-thread.png'),fullPage:true});
  // Without the link, nothing.
  await page.goto(`./support.html?ticket=${link.searchParams.get('ticket')}`);
  await expect(page.locator('#offline')).toBeVisible();

  // Back with the admin: waiting again; resolve.
  await admin.click('#ticket-back');
  await admin.selectOption('#support-state','awaiting_admin');
  await expect(admin.locator('#support-rows tr').first()).toContainText(ref);
  await admin.click('#support-rows tr >> nth=0');
  await admin.click('#ticket-resolve');
  await expect(admin.locator('#ticket-state')).toHaveText('Resolved');
  expect(errors).toEqual([]);
});

test('G30: without the accounts service (a preview copy) the page offers email instead',async({page})=>{
  await page.route('**/api/support/config',r=>r.fulfill({status:404,contentType:'text/html',body:'not here'}));
  await page.goto('./support.html');
  await expect(page.locator('#offline')).toBeVisible();
  await expect(page.locator('#offline a')).toHaveAttribute('href',/^mailto:support\.drivingpractice@gmail\.com/);
  await expect(page.locator('#new')).toBeHidden();
});
