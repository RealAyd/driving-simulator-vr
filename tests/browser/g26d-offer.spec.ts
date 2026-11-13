import {expect,test,type Page} from '@playwright/test';

// The Black Friday banner: on the home screen while the week pass is on sale (the server says so), opening the
// passes; gone once the sale ends. The accounts service's answers are fixed here.
const packs=(weekOnSale:boolean)=>[
  {id:'black-friday-week',label:'Weekly Unlimited Pass',price:'£4.99 a week',description:'Cancel anytime',deal:'-85% off',sticker:'Limited Time Discount',sessions:0,allowances:{},starter:false,unlimited:{days:7},saleEnds:'2026-11-30',onSale:weekOnSale},
  {id:'monthly',label:'Monthly Unlimited Pass',price:'£10.99 a month',description:'Cancel anytime',deal:'-85% off',sticker:'Limited Time Discount',sessions:0,allowances:{},starter:false,unlimited:{monthly:true},onSale:true}];
async function home(page:Page,weekOnSale:boolean,me:object){
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.route('**/api/config',r=>r.fulfill({json:{gate:true,googleClientId:null,appleServicesId:null,appleRedirect:'',packs:packs(weekOnSale),devCheckout:false}}));
  await page.route('**/api/me',r=>r.fulfill({json:me}));
  await page.route('**/api/recent',r=>r.fulfill({json:{recent:[]}}));
  await page.goto('./');
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
}
const signedIn={signedIn:true,id:'a',email:'learner@example.com',balance:0,allowances:{lesson:0,test:0,free:0},starterBought:false,referralCode:'ABCD2345',
  invited:0,rewarded:0,history:[],trial:{lesson:0,test:0,free:0},unlimitedUntil:null};

test('G26d: Black Friday banner while the week pass is on sale; it opens the passes; signed out, sign-up first',async({page})=>{
  test.setTimeout(120_000);
  await home(page,true,signedIn);
  const banner=page.locator('#offer-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Black Friday');
  await expect(banner).toContainText('Unlimited drives all week');
  await expect(banner).not.toContainText('£');
  await banner.click();
  await expect(page.locator('#screen-account')).toHaveAttribute('data-mode','paywall');
  const week=page.locator('#pack-list [data-pack=black-friday-week]');
  for(const t of ['Limited Time Discount','Weekly Unlimited Pass','-85% off','Cancel anytime','£4.99','/week'])await expect(week).toContainText(t);
  await expect(page.locator('#pack-list [data-pack=monthly] .price')).toHaveText('£10.99/month');
});

test('G26d: signed out, the banner asks to sign up first',async({page})=>{
  test.setTimeout(120_000);
  await home(page,true,{signedIn:false,trial:{lesson:1,test:1,free:1}});
  await page.click('#offer-banner');
  await expect(page.locator('#screen-account')).toHaveAttribute('data-mode','save');
  await expect(page.locator('#account-signin')).toBeVisible();
});

test('G26d: once the week pass is not on sale, no banner',async({page})=>{
  test.setTimeout(120_000);
  await home(page,false,signedIn);
  await page.waitForTimeout(1000);
  await expect(page.locator('#offer-banner')).toBeHidden();
});
