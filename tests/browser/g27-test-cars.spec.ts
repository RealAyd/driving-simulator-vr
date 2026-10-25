import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// The car set by default: the earlier cars with the new Peugeot 208 (the learner's car) and pickup (CC BY, credited
// on screen); none of the rest of the new pack (white ghost-like shapes on the owner's phone). ?cars=old: the earlier cars.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

const startGoodmayes=async(page:Page,url:string)=>{
  await page.goto(url);
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'goodmayes','free');
  await expect(page.locator('#busy')).toBeHidden({timeout:120_000});
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
};

test('G27: the default cars (earlier set, Peugeot 208, pickup) load, drive and are credited; ?cars=old gives the earlier cars',async({page},testInfo)=>{
  test.setTimeout(600_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));

  await startGoodmayes(page,'./');
  await expect.poll(async()=>(await read(page,'scenery()')).carModels.filter((id:string)=>id.startsWith('v2-')).sort(),{timeout:60_000}).toEqual(['v2-peugeot-208','v2-pickup']);
  await expect(page.locator('#hud-credit')).toContainText('cars: muha692, Comrade1280 (Sketchfab, CC BY 4.0)');
  await page.screenshot({path:testInfo.outputPath('g27-new-start.png')});
  await page.click('#hud-behind');
  await expect.poll(async()=>(await read(page,'behind()')).carModel,{timeout:30_000}).toBe(true);
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await read(page,'vehicle()')).speed,{timeout:60_000}).toBeGreaterThan(4);
  await page.keyboard.up('KeyW');
  for(let i=0;i<4;i++){
    await page.waitForTimeout(2500);
    await page.screenshot({path:testInfo.outputPath(`g27-new-behind-${i}.png`)});
  }
  const fpsNew=await read(page,'fps()');
  expect(await read(page,'session()')).toBe('running');

  await startGoodmayes(page,'./?cars=old');
  await expect.poll(async()=>(await read(page,'scenery()')).carModels.length,{timeout:60_000}).toBeGreaterThan(2);
  expect((await read(page,'scenery()')).carModels.some((id:string)=>id.startsWith('v2-'))).toBe(false);
  await expect(page.locator('#hud-credit')).not.toContainText('Comrade1280');
  const fpsCurrent=await read(page,'fps()');
  await page.screenshot({path:testInfo.outputPath('g27-current-start.png')});
  testInfo.annotations.push({type:'fps',description:`new ${fpsNew.toFixed(1)} current ${fpsCurrent.toFixed(1)}`});
  console.log(`fps: new ${fpsNew.toFixed(1)}, current ${fpsCurrent.toFixed(1)}`);
  expect(errors).toEqual([]);
});
