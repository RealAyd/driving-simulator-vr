import {expect,test} from '@playwright/test';
import {openMenu} from './home';

// The home screen: the picture, the line, three cards (Free Drive, Guided Practice, Mock Tests) and the menu. Guided
// Practice holds the lessons (lesson 1 starts on the easiest level with assisted steering; done ones are ticked, the
// next stands out) and the drills; driving words are explained in plain English; the text can be made larger.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});

test('G25: home: three cards, the menu, guided practice with lessons and drills, plain English, larger text',async({page},testInfo)=>{
  test.setTimeout(180_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('.home-tagline')).toHaveText('Drive smarter. Test ready.');
  await expect(page.locator('.mode-card b')).toHaveText(['Free Drive','Guided Practice','Mock Tests']);
  // (A preview copy is not paid: no free-try badge and no passes.)
  await expect(page.locator('#free-badge')).toBeHidden();
  await expect(page.locator('#view-passes')).toBeHidden();
  // Real reviews of the Driving Practice app, and the way to it.
  await expect(page.locator('.review')).toHaveCount(5);
  await expect(page.locator('#other-app-link')).toHaveAttribute('href','https://drivingpractice.live/app');
  await page.screenshot({path:testInfo.outputPath('g25-home.png'),fullPage:true});

  // Free Drive: the places, no drills.
  await page.click('[data-drive-mode=free]');
  await expect(page.locator('#place-title')).toHaveText('Free Drive');
  await expect(page.locator('[data-exercise=goodmayes]')).toBeVisible();
  await expect(page.locator('#drills')).toBeHidden();
  await page.click('#place-back');
  await expect(page.locator('.mode-cards')).toBeVisible();

  // The menu: words explained, and larger text (remembered).
  await openMenu(page);
  await page.click('#words-home');
  await expect(page.locator('#home-menu')).toBeHidden();
  await expect(page.locator('#glossary')).toBeVisible();
  await expect(page.locator('#glossary dt',{hasText:'Blind spot'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('g25-words.png')});
  await page.click('#glossary .primary');
  await expect(page.locator('#glossary')).toBeHidden();
  await openMenu(page);
  await page.click('#text-size');
  await expect(page.locator('html')).toHaveAttribute('data-text','large');
  await page.screenshot({path:testInfo.outputPath('g25-large.png')});
  await page.click('#text-size');await page.click('#text-size');
  await expect(page.locator('html')).toHaveAttribute('data-text','normal');
  await page.keyboard.press('Escape');
  await expect(page.locator('#home-menu')).toBeHidden();

  // Guided Practice: the drills, and the lessons at Goodmayes; lesson 1 on the easy level with assisted steering.
  await page.click('[data-drive-mode=lesson]');
  await expect(page.locator('#place-title')).toHaveText('Guided Practice');
  await expect(page.locator('#drills [data-exercise]')).toHaveCount(4);
  await page.click('[data-exercise=goodmayes]');
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:90_000});
  await expect(page.locator('#lesson-list [data-lesson]').first()).toHaveClass(/next/);
  await page.click('#lesson-list [data-lesson]');
  await expect(page.locator('#exercise-briefing')).toContainText('Lesson 1: Moving off and stopping');
  await expect(page.locator('#start-practice')).toHaveText('Start lesson');
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  await expect(page.locator('[data-difficulty=easy]')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:testInfo.outputPath('g25-lesson-1.png')});

  // A lesson done: ticked, and the next one stands out.
  await page.evaluate(()=>localStorage.setItem('dp-lessons-done',JSON.stringify(['moving-off-stopping'])));
  await page.click('#lesson-back');
  await page.click('#exercise-back');
  await page.click('[data-exercise=goodmayes]');
  await expect(page.locator('#lesson-list [data-lesson]').nth(0)).toHaveClass(/done/);
  await expect(page.locator('#lesson-list [data-lesson]').nth(1)).toHaveClass(/next/);
  expect(errors).toEqual([]);
});
