import {expect,test,type Page} from '@playwright/test';
// Diagnostic only (not in CI): steady-state frame times per exercise (PERF_EXERCISES, default all three),
// stationary at the start, forward view with mirrors and one mirror view; plus scene counts.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
test('perf probe',async({page})=>{
  test.skip(!process.env.PERF_PROBE,'diagnostic');
  test.setTimeout(600_000);
  const out:any={};
  for(const exercise of (process.env.PERF_EXERCISES??'moving-off,zebra,brentwood').split(',')){
    await page.goto('./');
    await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
    await page.click(`[data-exercise=${exercise}]`);
    await page.click('#start-practice');
    await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
    await read(page,'freezeTime(true)');
    await page.waitForTimeout(3000);
    const st=await read(page,'sceneStats()');
    const row:any={triangles:Math.round(st.triangles),vertices:st.vertices,meshes:st.meshes,materials:st.materials,textures:st.textures,extra:await read(page,'sceneExtras?.()')??null};
    const measure=async(label:string)=>{
      await page.waitForTimeout(1000);
      await read(page,'resetPerf()');
      await page.waitForTimeout(5000);
      const p=await read(page,'perf()');
      row[label]=`${p.averageFps.toFixed(1)} fps, p50 ${p.p50Ms.toFixed(0)} ms, p95 ${p.p95Ms.toFixed(0)} ms`;
    };
    await measure('forward');
    await read(page,"selectView('interior')");await measure('interiorMirror');await read(page,"selectView('forward')");
    if(process.env.PERF_PROBE==='detail'){
      await read(page,'fog(false)');await measure('noFog');await read(page,'fog(true)');
      await read(page,'mirrorsEnabled(false)');await measure('mirrorsOff');await read(page,'mirrorsEnabled(true)');
    }
    out[exercise]=row;
  }
  console.log('PERF',JSON.stringify(out));
});
