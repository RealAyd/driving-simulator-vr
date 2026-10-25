import {expect,test} from '@playwright/test';
import {openMenu} from './home';

// Light or dark menus: by the daylight in Great Britain until the driver chooses from the home screen's menu; the
// choice is remembered (and not undone by the time of day).
test.use({viewport:{width:430,height:932},hasTouch:true,isMobile:true});

test('G28: light by day, dark by night, switched from the menu, and remembered',async({page,browser})=>{
  // (The theme is set as the page's HTML loads, so these do not wait for every model to download.)
  test.setTimeout(180_000);
  const theme=()=>page.evaluate(()=>document.documentElement.dataset['theme']);
  await page.clock.setFixedTime(new Date('2026-12-21T12:00:00Z'));
  await page.goto('./',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  expect(await theme()).toBe('light');
  await expect(page.locator('#theme-toggle')).toHaveText('Light');
  // The menus are light: dark text on a light card.
  expect(await page.locator('#screen-start .brand h1').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(15, 23, 42)');
  await openMenu(page);
  await page.click('#theme-toggle');
  expect(await theme()).toBe('dark');
  await expect(page.locator('#theme-toggle')).toHaveText('Dark');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  expect(await theme()).toBe('dark');
  expect(await page.locator('#screen-start .brand h1').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(241, 245, 249)');

  // Someone else, on a winter evening: dark without choosing; Help follows the same rule.
  const evening=await browser.newPage();
  await evening.clock.setFixedTime(new Date('2026-12-21T17:30:00Z'));
  await evening.goto('./support.html',{waitUntil:'domcontentloaded'});
  expect(await evening.evaluate(()=>document.documentElement.dataset['theme'])).toBe('dark');
  await evening.close();
});
