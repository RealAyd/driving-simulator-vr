import {expect,test,type Page} from '@playwright/test';

// Mock test at Goodmayes: the examiner briefs and gives directions (shown and spoken), assisted steering follows
// the route, and the result is a pass/fail report in the marking sheet's terms.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
/** A cautious bot driver: about 15 mph, 8 mph through the junction it was directed to, and waits behind traffic. */
const pedal=(page:Page)=>page.evaluate(`(()=>{const d=window.__drivingPractice,v=d.vehicle(),fx=Math.sin(v.heading),fz=-Math.cos(v.heading);
  const ahead=d.traffic().filter(c=>c.visible).some(c=>{const ox=c.pose.position.x-v.position.x,oz=c.pose.position.z-v.position.z,a=ox*fx+oz*fz;return a>0&&a<12&&Math.abs(ox*fz-oz*fx)<1.95});
  const e=d.examiner(),st=e&&e.steps[e.index],slow=st&&Math.hypot(st.at.x-v.position.x,st.at.z-v.position.z)<28,top=slow?3.5:6.5;
  const s=Math.abs(v.speed);return ahead||s>top+1.5?(s>.2?'brake':'hold'):s<top?'go':'coast'})()`) as Promise<'go'|'coast'|'brake'|'hold'>;
const driveUntil=async(page:Page,done:()=>Promise<boolean>,timeout:number)=>{
  const end=Date.now()+timeout;
  let held:string|null=null;
  const hold=async(key:string|null)=>{if(held===key)return;if(held)await page.keyboard.up(held);if(key)await page.keyboard.down(key);held=key};
  while(Date.now()<end){
    if(await done())break;
    const p=await pedal(page);
    await hold(p==='go'?'KeyW':p==='brake'?'KeyS':null);
    await page.waitForTimeout(150);
  }
  await hold(null);
};

test('G21: mock test: briefing, directions along the route, then a pass/fail report',async({page},testInfo)=>{
  test.setTimeout(400_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  // A fixed route: the first direction (a left turn) comes about 170 m from the start.
  await page.goto('./?routeSeed=1');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await expect(page.locator('[data-drive-mode=test]')).toHaveAttribute('aria-pressed','true');
  await page.click('[data-exercise=goodmayes]');
  await expect(page.locator('#exercise-title')).toContainText('mock test');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  // The tell me question first: three answers to choose from; then the briefing.
  await expect(page.locator('#hud-question')).toBeVisible({timeout:20_000});
  await expect(page.locator('#hud-question-choices button')).toHaveCount(3);
  await page.screenshot({path:testInfo.outputPath('g21-tell-me.png')});
  await page.locator('#hud-question-choices button').first().click();
  await expect(page.locator('#hud-question')).toBeHidden();
  await expect(page.locator('#hud-task')).toContainText('mock driving test',{timeout:20_000});
  // The car's controls (show me): dipped headlights on shows the tell-tale.
  await page.click('#hud-controls-toggle');
  await expect(page.locator('#hud-controls button')).toHaveCount(9);
  await page.screenshot({path:testInfo.outputPath('g21-controls.png')});
  await page.click('[data-car-control=dipped]');
  await expect(page.locator('#hud-telltales')).toContainText('Dipped');
  await page.click('#hud-controls-toggle');
  await page.click('[data-car-control=dipped]');
  await expect(page.locator('#hud-telltales')).not.toContainText('Dipped');
  const ex=await read(page,'examiner()');
  expect(ex.steps.length).toBeGreaterThanOrEqual(6);
  // Drive (assisted steering keeps to the route) until the examiner has given the first direction and it is done.
  await driveUntil(page,async()=>(await read(page,'examiner()')).index>=1,240_000);
  const state=await read(page,'examiner()');
  expect(state.index,`stuck at ${JSON.stringify((await read(page,'vehicle()')).position)}: ${state.lastSaid}`).toBeGreaterThanOrEqual(1);
  // Still going: the test is not ended by anything along the way.
  expect(await read(page,'session()')).toBe('running');
  const after=await read(page,'examiner()');
  expect(after.lastSaid.length).toBeGreaterThan(5);
  await page.screenshot({path:testInfo.outputPath('g21-driving.png')});
  // End early: the report reads as a mock test result.
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible({timeout:30_000});
  await expect(page.locator('#results-title')).toContainText('Mock test:');
  await expect(page.locator('#results-summary')).toContainText('driving fault');
  await page.screenshot({path:testInfo.outputPath('g21-result.png')});
  expect(errors).toEqual([]);
});
