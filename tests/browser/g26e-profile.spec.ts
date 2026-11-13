import {expect,test} from '@playwright/test';

// The learner's profile on the account screen, from the accounts service's answer (fixed here): totals, the best mock
// test, weak areas, faults per test and the last drives; nothing shown before anything is driven.
const ago=(d:number)=>new Date(Date.now()-d*86400_000).toISOString();
const me={signedIn:true,id:'a',email:'learner@example.com',balance:0,allowances:{lesson:0,test:0,free:0},starterBought:false,referralCode:'ABCD2345',
  invited:0,rewarded:0,history:[],trial:{lesson:0,test:0,free:0},unlimitedUntil:null};
async function open(page:import('@playwright/test').Page,profile:object){
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.route('**/api/config',r=>r.fulfill({json:{gate:true,googleClientId:null,appleServicesId:null,appleRedirect:'',packs:[],devCheckout:false}}));
  await page.route('**/api/me',r=>r.fulfill({json:me}));
  await page.route('**/api/profile',r=>r.fulfill({json:profile}));
  await page.route('**/api/recent',r=>r.fulfill({json:{recent:[]}}));
  await page.goto('./');
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
  await page.click('#account-chip');
}

test('G26e: the profile shows totals, the best mock test, weak areas, faults per test and recent drives',async({page})=>{
  test.setTimeout(120_000);
  await open(page,{totals:{lesson:2,test:3,free:1,minutes:95},best:{tests:3,passes:1,fewestFaults:5,bestAt:ago(1),scenario:'goodmayes-mock-test'},
    weak:[{label:'Junctions – observation',times:4,serious:1,dangerous:0}],
    progress:[{at:ago(3),driving:12,serious:1,dangerous:0,passed:false},{at:ago(2),driving:9,serious:0,dangerous:0,passed:false},{at:ago(1),driving:5,serious:0,dangerous:0,passed:true}],
    recent:[{scenario:'goodmayes-mock-test',mode:'test',at:ago(1),outcome:'completed',test:{passed:true,driving:5,serious:0,dangerous:0,finished:true}},
      {scenario:'goodmayes-lesson',mode:'lesson',at:ago(2),outcome:'completed',lesson:{title:'Junctions',good:6,improve:2}}]});
  const p=page.locator('#profile');
  await expect(p).toBeVisible();
  await expect(p.locator('.profile-stat')).toHaveText(['3Mock tests','2Lessons','1Free drives','95Minutes']);
  await expect(p.locator('.profile-best')).toContainText('Passed with 5 driving faults');
  await expect(p.locator('.profile-best')).toContainText('1 of 3 tests passed');
  await expect(p.locator('.profile-weak li')).toHaveText(['Junctions – observation4×1 serious']);
  await expect(p.locator('.profile-chart rect')).toHaveCount(3);
  await expect(p.locator('.profile-recent li').first()).toContainText('Passed · 5 driving faults');
  await expect(p.locator('.profile-recent li').nth(1)).toContainText('6 good · 2 to improve');
});

test('G26e: nothing driven yet: no profile section',async({page})=>{
  test.setTimeout(120_000);
  await open(page,{totals:{lesson:0,test:0,free:0,minutes:0},best:null,weak:[],progress:[],recent:[]});
  await page.waitForTimeout(800);
  await expect(page.locator('#profile')).toBeHidden();
});
