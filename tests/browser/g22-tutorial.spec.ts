import {expect,test,type Page} from '@playwright/test';
import {openMenu,pick} from './home';

// The tutorial: Tutorial on the home screen and ? while driving show a tour that points at each part of the
// screen; the drive is held still while it shows.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G22: tutorial tours on the home screen and while driving',async({page},testInfo)=>{
  test.setTimeout(240_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  // Not by itself in an automated browser (tests); from the button.
  await expect(page.locator('#tour')).toBeHidden();
  // (Tutorial is in the menu.)
  await openMenu(page);
  await page.click('#tutorial-home');
  await expect(page.locator('#tour')).toBeVisible();
  await expect(page.locator('.tour-tip b')).toHaveText('Free Drive');
  await page.screenshot({path:testInfo.outputPath('g22-home-1.png')});
  await page.click('.tour-next');
  await expect(page.locator('.tour-tip b')).toHaveText('Guided Practice');
  await page.click('.tour-next');
  await expect(page.locator('.tour-tip b')).toHaveText('Mock Tests');
  await page.click('.tour-skip');
  await expect(page.locator('#tour')).toBeHidden();
  // A tap outside the highlight ends the tour (and does nothing else).
  await openMenu(page);
  await page.click('#tutorial-home');
  await expect(page.locator('#tour')).toBeVisible();
  await page.mouse.click(5,425);
  await expect(page.locator('#tour')).toBeHidden();
  await expect(page.locator('#screen-start')).toBeVisible();
  // The highlighted part works: the Free Drive card ends the tour and opens its places, where Tutorial shows theirs.
  await openMenu(page);
  await page.click('#tutorial-home');
  await expect(page.locator('.tour-tip b')).toHaveText('Free Drive');
  await page.click('[data-drive-mode=free]');
  await expect(page.locator('#tour')).toBeHidden();
  await expect(page.locator('#place-title')).toHaveText('Free Drive');
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  // Help is on the home screen.
  await expect(page.locator('#help-home')).toHaveAttribute('href','support.html');

  await pick(page,'goodmayes','free');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  await page.click('#hud-tutorial');
  await expect(page.locator('#tour')).toBeVisible();
  await expect(page.locator('.tour-tip b')).toHaveText('Go');
  await page.screenshot({path:testInfo.outputPath('g22-drive-1.png')});
  // Held still while the tour shows.
  const t0=await read(page,'simTime()');
  await page.waitForTimeout(1500);
  expect(await read(page,'simTime()')).toBe(t0);
  const titles:string[]=[];
  for(let i=0;i<20&&await page.locator('#tour').isVisible();i++){
    titles.push(await page.locator('.tour-tip b').textContent()??'');
    if(i===4)await page.screenshot({path:testInfo.outputPath('g22-drive-mirrors.png')});
    await page.click('.tour-next');
  }
  expect(titles).toEqual(expect.arrayContaining(['Go','Brake','Drive or Reverse','Mirrors and shoulder checks','Signals','Car controls','Pause']));
  await expect(page.locator('#tour')).toBeHidden();
  await expect.poll(()=>read(page,'simTime()')).toBeGreaterThan(t0);
  expect(errors).toEqual([]);
});
