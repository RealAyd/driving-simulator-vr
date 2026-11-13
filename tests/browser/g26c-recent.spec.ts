import {expect,test} from '@playwright/test';

// Recently practised: a notification on the home screen, one real drive at a time (the list here is the server's
// answer, fixed for the test); it goes when a screen opens over home, and closed it stays away for the visit.
test('G26c: recently practised notification: shows one drive, goes over sign-in, closes for the visit',async({page})=>{
  test.setTimeout(120_000);
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.route('**/api/recent',r=>r.fulfill({json:{recent:[
    {scenario:'brentwood-guided-traversal',mode:'free',secondsAgo:130},
    {scenario:'area-hull-test-centre-mock-test',mode:'test',secondsAgo:1500}]}}));
  await page.goto('./');
  const toast=page.locator('#recent-toast');
  await expect(toast).toBeVisible({timeout:60_000});
  await expect(page.locator('#recent-what')).toHaveText('Mini-roundabout practice in Brentwood');
  await expect(page.locator('#recent-when')).toHaveText('completed 2 mins ago');
  // Sign-in opened over home: it goes at once.
  await page.click('#account-chip');
  await expect(toast).toBeHidden({timeout:3000});
  await page.click('#account-close');
  await expect(toast).toBeVisible({timeout:30_000});
  await page.click('#recent-close');
  await expect(toast).toBeHidden();
  await page.waitForTimeout(12_000);
  await expect(toast).toBeHidden();
});
