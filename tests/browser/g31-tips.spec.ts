import {expect,test,type Page} from '@playwright/test';

// One control tip at the start of every drive: on screen for a few seconds (or until closed), not again on resuming
// from pause, and the next one on the next drive.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G31: a control tip at the start of each drive',async({page},testInfo)=>{
  test.setTimeout(240_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=free]');
  await page.click('[data-exercise=goodmayes]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  await expect(page.locator('#hud-tip')).toBeVisible({timeout:10_000});
  const first=(await read(page,'tip()')).text as string;
  // Touch screen, assisted steering: the first tip is about the mirror and shoulder buttons.
  expect(first).toContain('mirror or shoulder button');
  await expect(page.locator('#hud-tip-text')).toHaveText(first);
  await page.screenshot({path:testInfo.outputPath('g31-tip.png')});
  await page.click('#hud-tip-close');
  await expect(page.locator('#hud-tip')).toBeHidden();
  // Pause and resume: no tip again.
  await page.click('#hud-pause');
  // Help from the pause menu opens beside the drive (the drive is kept).
  await expect(page.locator('#help-paused')).toHaveAttribute('target','_blank');
  await page.click('#resume-button');
  await page.waitForTimeout(2500);
  await expect(page.locator('#hud-tip')).toBeHidden();
  // Start over: a new drive, the next tip.
  await page.click('#hud-pause');
  await page.click('#restart-button');
  await expect(page.locator('#hud-tip')).toBeVisible({timeout:10_000});
  const second=(await read(page,'tip()')).text as string;
  expect(second).not.toBe(first);
  expect(second).toContain('Signal left or Signal right');
  // It goes by itself after a few seconds.
  await expect(page.locator('#hud-tip')).toBeHidden({timeout:15_000});
  expect(errors).toEqual([]);
});
