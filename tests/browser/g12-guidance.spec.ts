import {expect,test,type Page} from '@playwright/test';

// Route guidance (the pull-out path painted on the road) is optional: off for an independent attempt.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G12: route guidance is off by default, can be switched on from the exercise screen, and is reported',async({page},testInfo)=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await expect(page.locator('#guide-option')).toBeVisible();
  await expect(page.locator('#guide-toggle')).not.toBeChecked();
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  expect(await read(page,'guidanceShown()')).toBe(false);
  expect((await read(page,'events()')).find((e:any)=>e.type==='session.started').payload.guidance).toBe(false);
  await page.screenshot({path:testInfo.outputPath('g12-01-no-guidance.png')});

  // Back to the exercise screen, switch it on.
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible();
  await page.click('#menu-button');
  await page.click('[data-exercise=moving-off]');
  await page.check('#guide-toggle');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  expect(await read(page,'guidanceShown()')).toBe(true);
  await page.waitForTimeout(800);
  await page.screenshot({path:testInfo.outputPath('g12-02-guidance-on.png')});
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#results-notes')).toContainText('Route guidance was shown');

  // Zebra crossing has no route guidance: no option shown.
  await page.click('#menu-button');
  await page.click('[data-exercise=zebra]');
  await expect(page.locator('#guide-option')).toBeHidden();
});
