import {expect,test,type Page} from '@playwright/test';
// Diagnostic only (not in CI): steady-state frame times in Moving off, forward view, mirrors on and off.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
test('perf probe',async({page})=>{
  test.skip(!process.env.PERF_PROBE,'diagnostic');
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  await read(page,'freezeTime(true)');
  await page.waitForTimeout(3000);
  const out:any={};
  const measure=async(label:string)=>{
    await page.waitForTimeout(1000);
    await read(page,'resetPerf()');
    await page.waitForTimeout(4000);
    out[label]=(await read(page,'perf()')).averageFps.toFixed(1);
  };
  await measure('all');
  if(process.env.PERF_PROBE==='detail'){
    await read(page,'fog(false)');await measure('noFog');await read(page,'fog(true)');
    await read(page,"showMeshes('parked-cars',false)");await measure('noParkedCars');await read(page,"showMeshes('parked-cars',true)");
    for(const m of ['streetscape-detail','streetscape-brick','streetscape-roof']){await read(page,`showMeshes('${m}',false)`);await measure(`no-${m}`);await read(page,`showMeshes('${m}',true)`)}
    await read(page,"showMeshes('streetscape',false)");await measure('noStreetscape');
    await read(page,"showMeshes('parked-cars',false)");await measure('noStreetscapeNoCars');
  }
  await read(page,'mirrorsEnabled(false)');await measure('mirrorsOff');
  console.log('PERF',JSON.stringify(out));
});
