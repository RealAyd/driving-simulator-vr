import fs from 'node:fs';
import {expect,test,type Page} from '@playwright/test';

// Drive anywhere: a postcode is looked up (postcodes.io) and the streets round it are downloaded (OSM API) and
// built on the device. The two services are answered from saved responses here (fixtures, IG3 9QJ in Goodmayes).
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const fixture=(name:string)=>fs.readFileSync(new URL(`./fixtures/${name}`,import.meta.url));

test('G20: search a postcode, build the area on the device and drive there',async({page},testInfo)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  let osmCalls=0;
  await page.route('https://api.postcodes.io/**',route=>route.fulfill({contentType:'application/json',body:fixture('postcode-ig3-9qj.json'),headers:{'access-control-allow-origin':'*'}}));
  await page.route('https://api.openstreetmap.org/**',route=>{osmCalls++;return route.fulfill({contentType:'text/xml',body:fixture('osm-ig3-9qj.osm'),headers:{'access-control-allow-origin':'*'}})});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  // Typed key by key, letters that are also driving keys (W A S D, mirrors…) included: they go into the box.
  await page.locator('#area-query').pressSequentially('Wasdqe');
  await expect(page.locator('#area-query')).toHaveValue('Wasdqe');
  await page.fill('#area-query','IG3 9QJ');
  await expect(page.locator('#area-results button').first()).toContainText('IG3 9QJ');
  await page.locator('#area-results button').first().click();
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:60_000});
  await expect(page.locator('#exercise-title')).toContainText('IG3 9QJ');
  await expect(page.locator('#exercise-briefing')).toContainText('not an official test route');
  expect(osmCalls).toBe(1);
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  expect(await read(page,'location()')).toMatch(/^area-ig3-9qj/);
  // A mock test: the tell me question first (the car is held until it is answered).
  await expect(page.locator('#hud-question')).toBeVisible({timeout:20_000});
  await page.locator('#hud-question-choices button').first().click();
  await page.click('#hud-question-go');
  // Drives off along the street without leaving the route.
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:60_000}).toBeGreaterThan(4);
  await page.keyboard.up('KeyW');
  expect(await read(page,'session()')).toBe('running');
  await page.screenshot({path:testInfo.outputPath('g20-area.png')});
  expect(errors).toEqual([]);
});

test('G20: test centres show at once, even with no answer from the place search; every centre can be browsed by letter',async({page},testInfo)=>{
  test.setTimeout(120_000);
  // The place search never answers (a slow or missing connection).
  await page.route('https://api.postcodes.io/**',()=>new Promise(()=>{}));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.fill('#area-query','Basildon');
  await expect(page.locator('#area-results button').first()).toContainText('Basildon test centre',{timeout:2000});
  await page.fill('#area-query','');
  await page.locator('#centre-browser summary',{hasText:'A–D'}).click();
  await expect(page.locator('#centre-browser .centre-list button',{hasText:'Aberdeen North'}).first()).toBeVisible();
  await expect(page.locator('#centre-browser .centre-list button',{hasText:'Brentwood'}).first()).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('g20-browse.png'),fullPage:true});
});

test('G20: a test centre built in advance opens from its pack, with no call to OpenStreetMap',async({page},testInfo)=>{
  test.setTimeout(240_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  let osmCalls=0;
  await page.route('https://api.openstreetmap.org/**',route=>{osmCalls++;return route.abort()});
  await page.route('https://api.postcodes.io/**',()=>new Promise(()=>{}));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.fill('#area-query','Leeds');
  await page.locator('#area-results button',{hasText:/^Leeds test centre/}).first().click();
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:90_000});
  await expect(page.locator('#exercise-title')).toContainText('Leeds test centre');
  await expect(page.locator('#exercise-briefing')).toContainText('Built from OpenStreetMap data');
  expect(osmCalls).toBe(0);
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  await page.screenshot({path:testInfo.outputPath('g20-pack.png')});
  expect(errors).toEqual([]);
});
