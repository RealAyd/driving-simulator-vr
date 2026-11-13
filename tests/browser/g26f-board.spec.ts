import {expect,test} from '@playwright/test';

// The leaderboard on the account screen (the accounts service's answers fixed here): the centre's top ten, the
// learner's own row, last week's leader, and their name settings sent when saved (a refused name says why).
const me={signedIn:true,id:'a',email:'learner@example.com',balance:0,allowances:{lesson:0,test:0,free:0},starterBought:false,referralCode:'ABCD2345',
  invited:0,rewarded:0,history:[],trial:{lesson:0,test:0,free:0},unlimitedUntil:null};
const empty={totals:{lesson:0,test:1,free:0,minutes:15},best:null,weak:[],progress:[],recent:[]};

test('G26f: the leaderboard for the learner\'s centre, and their name on it',async({page})=>{
  test.setTimeout(120_000);
  const sent:unknown[]=[];
  await page.route('**/access.json',r=>r.fulfill({json:{gate:true}}));
  await page.route('**/api/config',r=>r.fulfill({json:{gate:true,googleClientId:null,appleServicesId:null,appleRedirect:'',packs:[],devCheckout:false}}));
  await page.route('**/api/me',r=>r.fulfill({json:me}));
  await page.route('**/api/profile',r=>r.fulfill({json:empty}));
  await page.route('**/api/recent',r=>r.fulfill({json:{recent:[]}}));
  await page.route('**/api/board',r=>r.fulfill({json:{centre:'area-hull-test-centre',name:'Hull',week:{from:new Date().toISOString()},settings:{show:false,name:''},
    top:[{rank:1,name:'RoundaboutRuler',school:null,points:128,tests:5,passes:4,me:false},{rank:2,name:'Learner',school:null,points:30,tests:1,passes:1,me:true}],
    me:{rank:2,points:30,of:2},leader:{name:'Speedy',school:'Hull Driving Academy',points:142}}}));
  await page.route('**/api/board/me',async r=>{const body=r.request().postDataJSON();sent.push(body);
    await r.fulfill(body.name==='x'?{status:400,json:{error:'name'}}:{json:{ok:true,board:body}})});
  await page.goto('./');
  await expect(page.locator('#account-chip')).toBeVisible({timeout:60_000});
  await page.click('#account-chip');
  const board=page.locator('#board');
  await expect(board.locator('h3')).toHaveText('Leaderboard · Hull · this week');
  await expect(board.locator('.board-list li')).toHaveCount(2);
  await expect(board.locator('.board-list li.me')).toContainText('Learner');
  await expect(board.locator('.board-leader')).toHaveText('Leader last week: Speedy (Hull Driving Academy)');
  await board.locator('summary').click();
  await page.check('#board-show');
  await page.fill('#board-name','x');
  await board.locator('button',{hasText:'Save'}).click();
  await expect(board.locator('.board-status')).toContainText('Choose a name');
  await page.fill('#board-name','Ade');
  await page.fill('#board-school','Top Gear Driving School');
  await board.locator('button',{hasText:'Save'}).click();
  await expect.poll(()=>sent.length).toBe(2);
  expect(sent[1]).toEqual({show:true,name:'Ade',school:'Top Gear Driving School'});
});
