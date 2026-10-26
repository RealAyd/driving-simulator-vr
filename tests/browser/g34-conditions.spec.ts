import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// Driving conditions: Day, Night, Rain or Night and rain, chosen with the drive's settings and remembered on the
// device; at night the lamps light the road and the car's headlights the way ahead; in rain, streaks and a grey sky.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G34: conditions: night and rain chosen with the settings, applied to the drive, remembered',async({page},testInfo)=>{
  test.setTimeout(240_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'goodmayes','free');
  await expect(page.locator('#busy')).toBeHidden({timeout:120_000});
  await expect(page.locator('input[name=conditions][value=day]')).toBeChecked();
  await page.locator('label.opt',{has:page.locator('input[name=conditions][value=night-rain]')}).click();
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  expect(await read(page,'conditions()')).toBe('night-rain');
  const light=await read(page,'lightNow()');
  expect(light.rain).toBe(true);
  expect(light.clear[0]).toBeLessThan(.2);
  await page.waitForTimeout(1500);
  await page.screenshot({path:testInfo.outputPath('g34-night-rain.png')});
  // Remembered: the next visit starts with the same choice.
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'goodmayes','free');
  await expect(page.locator('input[name=conditions][value=night-rain]')).toBeChecked();
  expect(errors).toEqual([]);
});
