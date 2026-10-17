import {expect,test,type Page} from '@playwright/test';

// iPhone 14 Pro Max in landscape (CSS pixels), touch input.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(300_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const user=async(page:Page,id:string)=>(await read(page,'passersDetail()')).find((p:any)=>p.id===id);
const waitFor=(page:Page,test:string)=>page.waitForFunction(test,undefined,{timeout:200_000,polling:100});
const z=(id:string)=>`(window.__drivingPractice.passersDetail().find(p=>p.id==='${id}')||{pose:{position:{z:1e9}}}).pose.position.z`;

async function startMovingOff(page:Page,variant:string){
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await expect(page.locator('#exercise-briefing h2')).toHaveText('Move off when safe');
  await expect(page.locator('#exercise-briefing')).toContainText('A purple car may approach from behind on your right, and a yellow cyclist may approach from behind on your left.');
  await read(page,`forceVariant('${variant}')`);
  await page.click('#start-practice');
  expect(await read(page,'variant()')).toBe(variant);
}
const tap=(page:Page,selector:string)=>page.locator(selector).dispatchEvent('pointerdown');
const go=async(page:Page,down:boolean)=>page.locator('[data-hold=throttle]').dispatchEvent(down?'pointerdown':'pointerup');
async function checkAll(page:Page){
  for(const v of ['interior','right-door','right-shoulder','left-door','left-shoulder','forward']){
    await tap(page,`[data-view=${v}]`);
    await page.waitForTimeout(700);
  }
}

test('G6: moving off into the purple car\'s path is flagged with evidence, in plain language, even after checking every view earlier and signalling',async({page},testInfo)=>{
  await startMovingOff(page,'car-then-cyclist');
  await checkAll(page);
  await page.click('#hud-ind-right');
  await waitFor(page,`${z('purple-car')}<14`);
  await go(page,true);
  await expect(page.locator('#screen-results')).toBeVisible({timeout:120_000});
  await go(page,false);
  await page.screenshot({path:testInfo.outputPath('g6-01-conflict-results.png'),fullPage:true});
  const result=await read(page,'result()');
  const conflict=result.findings.find((f:any)=>f.incidentId==='conflict-purple-car');
  expect(conflict).toBeTruthy();
  expect(['serious','dangerous']).toContain(conflict.severity);
  expect(conflict.explanation).toMatch(/purple car/);
  await expect(page.locator('#results-findings')).toContainText('purple car');
  await expect(page.locator('#results-findings')).toContainText('evidence: ev-');
  // The earlier checks were out of date at the moment of moving off.
  expect(result.findings.map((f:any)=>f.incidentId)).toContain('observation-right-blind-spot');
  expect(result.rubricVersion).toContain('draft');
});

test('G6: the car stays parked until the learner moves off; waiting, checking again and moving into the clear road succeeds',async({page},testInfo)=>{
  await startMovingOff(page,'car-then-cyclist');
  await tap(page,'[data-view=right-door]');
  // Both road users pass; nothing starts the learner's car or ends the exercise.
  await waitFor(page,`${z('purple-car')}<-10&&${z('cyclist')}<-8`);
  await page.waitForTimeout(1500);
  expect(await read(page,'session()')).toBe('running');
  expect((await read(page,'vehicle()')).speed).toBe(0);
  // Refresh the checks, signal and move off.
  await checkAll(page);
  await page.click('#hud-ind-right');
  await expect(page.locator('#hud-ind-right')).toHaveClass(/armed/);
  await page.screenshot({path:testInfo.outputPath('g6-02-signalling.png')});
  await go(page,true);
  await expect(page.locator('#screen-results')).toBeVisible({timeout:120_000});
  await go(page,false);
  await page.screenshot({path:testInfo.outputPath('g6-03-safe-results.png'),fullPage:true});
  const result=await read(page,'result()');
  expect(result.outcome).toBe('completed');
  expect(result.findings).toEqual([]);
  await expect(page.locator('#results-title')).toHaveText('Exercise completed');
  await expect(page.locator('#results-notes')).toContainText('You waited while the purple car and the yellow cyclist passed');
  await expect(page.locator('#results-notes')).toContainText('not eye tracking');
});

test('G6: pause freezes road users and timing during their approach; restart resets road users, views, signals and findings; Exit is reported as exiting',async({page})=>{
  await startMovingOff(page,'car-then-cyclist');
  await waitFor(page,`${z('purple-car')}<70`);
  await page.click('#hud-ind-right');
  await tap(page,'[data-view=left-door]');
  await page.click('#hud-pause');
  await expect(page.locator('#screen-paused')).toBeVisible();
  const before=await user(page,'purple-car'),t0=await read(page,'simTime()');
  await page.waitForTimeout(1500);
  const after=await user(page,'purple-car');
  expect(after.pose.position.z).toBe(before.pose.position.z);
  expect(await read(page,'simTime()')).toBe(t0);
  await expect(page.locator('#hud-view-label')).toHaveText('View: Forward');   // views released on pause
  await page.click('#resume-button');
  await waitFor(page,`${z('purple-car')}<${before.pose.position.z-5}`);

  await page.click('#hud-pause');
  await page.click('#restart-button');
  expect((await user(page,'purple-car')).started).toBe(false);
  expect((await read(page,'vehicle()')).indicator).toBe('off');
  expect(await read(page,'findings()')).toEqual([]);
  const types=(await read(page,'events()')).map((e:any)=>e.type);
  expect(types).not.toContain('view.selected');
  expect(types).not.toContain('actor.passed');

  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#results-title')).toHaveText('You exited the exercise');
  await expect(page.locator('#results-notes')).toContainText('did not move off');

  // Zebra crossing is independent: no moving-off road users, timings or findings carry over.
  await page.click('#menu-button');
  await page.click('[data-exercise=zebra]');
  await page.click('#start-practice');
  expect(await read(page,'scenario()')).toBe('crossing-restricted-view');
  expect(await read(page,'passers()')).toEqual([]);
  expect(await read(page,'variant()')).toBeNull();
  expect(await read(page,'findings()')).toEqual([]);
  expect((await read(page,'pedestrian()')).state).toBe('waiting');
});

test('G6: the guided introduction keeps the car parked (Go does nothing) and offers the exercise next',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await page.click('#start-intro');
  await go(page,true);
  await page.waitForTimeout(1500);
  expect((await read(page,'vehicle()')).speed).toBe(0);
  await go(page,false);
  await expect(page.locator('#hud-task')).toContainText('Interior mirror');
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#next-button')).toHaveText('Start Moving off safely');
  await page.click('#next-button');
  await expect(page.locator('#exercise-title')).toHaveText('Moving off safely');
});

