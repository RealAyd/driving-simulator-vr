import {expect,test} from '@playwright/test';

// The signs of a long route are drawn on one sheet. A sheet over a phone's limits (about 16.7 million pixels a canvas,
// 4096 a side on older ones) is not drawn there at all: every sign came out black (the owner's report, Cardiff's
// Morrisons roundabout). Tottenham has the most signs (958, a 1024 by 32768 sheet before): the sheet stays within them.
test('G41: a route with many signs draws them on a sheet a phone can show',async({page})=>{
  test.setTimeout(600_000);
  await page.setViewportSize({width:844,height:390});
  await page.addInitScript(()=>{try{for(const k of ['dp-tips-seen','dp-tour-home','dp-tour-place','dp-tour-drive'])localStorage.setItem(k,'1')}catch{}});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=test]');
  await page.click('[data-decision-route="tottenham-1"]');
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:300_000});
  const s=await page.evaluate(()=>(window as any).__drivingPractice.signage()) as {sheet:{width:number;height:number;scale:number};panels:unknown[]};
  expect(s.panels.length).toBeGreaterThan(500);
  expect(s.sheet.width).toBeLessThanOrEqual(4096);
  expect(s.sheet.height).toBeLessThanOrEqual(4096);
  expect(s.sheet.width*s.sheet.height).toBeLessThanOrEqual(16_777_216);
  // (Drawn smaller to fit, but still legible: no less than half size.)
  expect(s.sheet.scale).toBeGreaterThan(.5);
});
