import {expect,test} from '@playwright/test';

// Anyone can start: someone new is pointed to a free drive first; then "New to driving? Start here" opens lesson 1
// with assisted steering and the easiest level; each
// mode is explained in a line; driving words are explained in plain English; the text can be made larger; after a
// lesson, the home screen offers the next one.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});

test('G25: first steps: start here, plain English, larger text, the next lesson',async({page},testInfo)=>{
  test.setTimeout(180_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  // Someone new: a free drive first.
  await expect(page.locator('#first-title')).toHaveText('New here? Start with a free drive');
  await expect(page.locator('#first-start')).toHaveText('Start a free drive');
  await page.click('#first-start');
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:90_000});
  await expect(page.locator('[data-drive-mode=free]')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:testInfo.outputPath('g25-free-drive.png')});
  // Once a free drive has been driven, the lessons come next.
  await page.evaluate(()=>localStorage.setItem('dp.first-drive.v1','1'));
  await page.reload();
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#first-title')).toHaveText('New to driving? Start here');
  await page.click('[data-drive-mode=test]');
  await expect(page.locator('#mode-summary')).toContainText('Mock test');
  await page.click('[data-drive-mode=free]');
  await expect(page.locator('#mode-summary')).toContainText('Nothing is marked');
  await page.screenshot({path:testInfo.outputPath('g25-home.png')});
  // Words explained.
  await page.click('#words-home');
  await expect(page.locator('#glossary')).toBeVisible();
  await expect(page.locator('#glossary dt',{hasText:'Blind spot'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('g25-words.png')});
  await page.click('#glossary .primary');
  await expect(page.locator('#glossary')).toBeHidden();
  // Larger text, remembered.
  await page.click('#text-size');
  await expect(page.locator('html')).toHaveAttribute('data-text','large');
  await page.screenshot({path:testInfo.outputPath('g25-large.png')});
  await page.click('#text-size');await page.click('#text-size');
  await expect(page.locator('html')).toHaveAttribute('data-text','normal');
  // Start here: lesson 1's briefing, assisted steering, the easy level.
  await page.click('#first-start');
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:90_000});
  await expect(page.locator('#exercise-briefing')).toContainText('Lesson 1: Moving off and stopping');
  await expect(page.locator('#start-practice')).toHaveText('Start lesson');
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  await page.screenshot({path:testInfo.outputPath('g25-lesson-1.png')});
  // A lesson already done: the next one is offered.
  await page.evaluate(()=>localStorage.setItem('dp-lessons-done',JSON.stringify(['moving-off-stopping'])));
  await page.reload();
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('#first-start')).toHaveText('Continue: lesson 2');
  expect(errors).toEqual([]);
});
