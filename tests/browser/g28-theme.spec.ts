import {expect,test} from '@playwright/test';

// Light or dark menus from the home screen: follows the phone's setting until chosen; the choice is remembered.
test.use({viewport:{width:430,height:932},hasTouch:true,isMobile:true,colorScheme:'light'});

test('G28: light or dark mode: follows the phone, switches from the home screen, and is remembered',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  const theme=()=>page.evaluate(()=>document.documentElement.dataset['theme']);
  expect(await theme()).toBe('light');
  await expect(page.locator('#theme-toggle')).toHaveText('Light');
  // The menus are light: dark text on a light card.
  const ink=await page.locator('#screen-start .brand h1').evaluate(e=>getComputedStyle(e).color);
  expect(ink).toBe('rgb(15, 23, 42)');
  await page.click('#theme-toggle');
  expect(await theme()).toBe('dark');
  await expect(page.locator('#theme-toggle')).toHaveText('Dark');
  await page.reload();
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  expect(await theme()).toBe('dark');
  expect(await page.locator('#screen-start .brand h1').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(241, 245, 249)');
});
