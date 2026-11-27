import {expect,test} from '@playwright/test';

// A decision test left while a decision is waiting, then a normal mock test: nothing of the decision test is left on
// screen, and nothing goes wrong (its panel used to stay up, and confirming in it stopped the app).
test('G42: a decision test left mid-decision, then a normal mock test: no decision panel, no error',async({page})=>{
  test.setTimeout(900_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:844,height:390});
  await page.addInitScript(()=>{try{for(const k of ['dp-tips-seen','dp-tour-home','dp-tour-place','dp-tour-drive'])localStorage.setItem(k,'1')}catch{}});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=test]');
  await page.click('[data-decision-route="brentwood-1"]');
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:300_000});
  await page.click('#start-practice');
  await page.waitForFunction(()=>(window as any).__drivingPractice.decision()?.state==='paused',undefined,{timeout:300_000,polling:250});
  await expect(page.locator('#decision-panel')).toBeVisible();
  await page.click('#hud-pause');await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible();
  await expect(page.locator('#decision-panel')).toBeHidden();
  await page.click('#menu-button');
  await page.click('[data-exercise=goodmayes]');
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:300_000});
  await page.click('#start-practice');
  await expect.poll(()=>page.evaluate(()=>(window as any).__drivingPractice.session()),{timeout:60_000}).toBe('running');
  await page.waitForTimeout(3000);
  await expect(page.locator('#decision-panel')).toBeHidden();
  await expect(page.locator('text=Something went wrong')).toBeHidden();
  expect(errors).toEqual([]);
});
