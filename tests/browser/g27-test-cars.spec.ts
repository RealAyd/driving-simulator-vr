import {expect,test,type Page} from '@playwright/test';

// The car set (the default since 2026-10-24): CC BY models in traffic and at the kerb, credited on screen.
// ?cars=old keeps the earlier cars.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

const startGoodmayes=async(page:Page,url:string)=>{
  await page.goto(url);
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=free]');
  await page.click('[data-exercise=goodmayes]');
  await expect(page.locator('#busy')).toBeHidden({timeout:120_000});
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
};

test('G27: the car set loads, drives and is credited by default; ?cars=old gives the earlier cars',async({page},testInfo)=>{
  test.setTimeout(600_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));

  await startGoodmayes(page,'./');
  await expect.poll(async()=>(await read(page,'scenery()')).carModels.filter((id:string)=>id.startsWith('v2-')).length,{timeout:60_000}).toBeGreaterThan(8);
  await expect(page.locator('#hud-credit')).toContainText('Comrade1280');
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
