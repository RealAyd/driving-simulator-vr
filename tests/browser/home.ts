import {expect,type Page} from '@playwright/test';

// The home screen has three cards (Free Drive, Guided Practice, Mock Tests); each opens the places to drive it.
// The drills are under Guided Practice.
type Mode='free'|'lesson'|'test';
const TITLE:Record<Mode,string>={free:'Free Drive',lesson:'Guided Practice',test:'Mock Tests'};
const DRILLS=new Set(['brentwood','kings-road','zebra','moving-off']);

/** Opens an exercise from wherever the home screen is: its card first (if another card's places are showing, back). */
export async function pick(page:Page,exercise:string,mode:Mode=DRILLS.has(exercise)?'lesson':'free'):Promise<void>{
  const places=page.locator('#place-list');
  if(!(await places.isVisible())||(await page.locator('#place-title').textContent())!==TITLE[mode]){
    if(await places.isVisible())await page.click('#place-back');
    await page.click(`[data-drive-mode=${mode}]`);
    await expect(page.locator('#place-title')).toHaveText(TITLE[mode]);
  }
  await page.click(`[data-exercise=${exercise}]`);
}

/** Opens the home screen's menu (tutorial, words, help, theme, text size, full screen, about), if it is closed. */
export async function openMenu(page:Page):Promise<void>{
  if(!(await page.locator('#home-menu').isVisible()))await page.click('#menu-toggle');
  await expect(page.locator('#home-menu')).toBeVisible();
}
