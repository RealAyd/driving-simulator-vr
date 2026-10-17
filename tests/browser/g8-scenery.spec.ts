import {expect,test,type Page} from '@playwright/test';

// Scenery models from packs that may not be redistributed publicly are optional:
// built locally into public/assets/licensed/ (git-ignored), absent in CI and on staging.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(180_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
async function startExercise(page:Page,id:string){
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click(`[data-exercise=${id}]`);
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  await read(page,'freezeTime(true)');
}

test('G8: scenery models are optional; when present they replace the simple shapes without changing the exercise',async({page},testInfo)=>{
  await startExercise(page,'moving-off');
  // Give optional models time to load (or to be found absent).
  await page.waitForTimeout(3000);
  const models:string[]=await read(page,'sceneryModels()');
  expect(await read(page,'vehicle().speed')).toBe(0);
  if(!models.length){
    testInfo.annotations.push({type:'note',description:'No licensed scenery in this build (expected in CI and on staging).'});
    await expect(page.locator('#hud-left')).toBeVisible();
    return;
  }
  for(const [name,yaw] of [['terrace-left',-.75],['supermarket-right',.6],['downtown-right',.35]] as const){
    await read(page,`look(${yaw},.05)`);
    await page.waitForTimeout(600);
    await page.screenshot({path:testInfo.outputPath(`g8-${name}.png`)});
  }
  // A street-level view from the far pavement, to check each model faces the road.
  for(const [name,view] of [['street-east',{x:-5,z:-5,height:1.7,target:{x:14,y:4,z:-30}}],['street-west',{x:5,z:-25,height:1.7,target:{x:-12,y:3,z:-10}}]] as const){
    await read(page,`overhead(${JSON.stringify(view)})`);
    await page.waitForTimeout(600);
    await page.screenshot({path:testInfo.outputPath(`g8-${name}.png`)});
  }
  await read(page,'overhead(null)');
  await read(page,'look(0,0)');
  await startExercise(page,'brentwood');
  await page.waitForTimeout(3000);
  for(const [name,yaw] of [['signal-pole-ahead',0],['signal-pole-left',-.35]] as const){
    await read(page,`look(${yaw},.05)`);
    await page.waitForTimeout(600);
    await page.screenshot({path:testInfo.outputPath(`g8-${name}.png`)});
  }
});
