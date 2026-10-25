import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// Drives are in landscape: a phone held upright is asked to turn, and the drive holds still until it is.
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G32: upright, the drive asks for the phone to be turned and waits; turned, it carries on',async({page},testInfo)=>{
  test.setTimeout(240_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  // The menus work upright.
  await expect(page.locator('#rotate-hint')).toBeHidden();
  await pick(page,'goodmayes','free');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  await expect(page.locator('#rotate-hint')).toBeVisible();
  await expect(page.locator('#rotate-title')).toHaveText('Turn your phone sideways');
  await page.screenshot({path:testInfo.outputPath('g32-upright.png')});
  const t0=await read(page,'simTime()');
  await page.waitForTimeout(1500);
  expect(await read(page,'simTime()')).toBe(t0);
  // Turned: the hint goes and the drive carries on.
  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('#rotate-hint')).toBeHidden();
  await expect.poll(()=>read(page,'simTime()'),{timeout:10_000}).toBeGreaterThan(t0);
  await page.screenshot({path:testInfo.outputPath('g32-landscape.png')});
  // Back upright: held again.
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#rotate-hint')).toBeVisible();
  const t1=await read(page,'simTime()');
  await page.waitForTimeout(1000);
  expect(await read(page,'simTime()')).toBe(t1);
  expect(errors).toEqual([]);
});
