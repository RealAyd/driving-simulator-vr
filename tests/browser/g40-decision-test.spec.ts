import {expect,test} from '@playwright/test';

// The decision mock test (src/decision): the car drives itself; at each decision the scene stops, the learner picks
// observations and actions in order, confirms, and Continue plays on. Brentwood route 1's eight challenges, with the
// blue car pulled out in front of (the examiner holds the car), then practising a challenge from the results.
test('G40: a decision test: pause, choose in order, confirm, the examiner holds an unsafe go, results and practice',async({page})=>{
  test.setTimeout(1_800_000);
  await page.setViewportSize({width:844,height:390});
  await page.addInitScript(()=>{try{for(const k of ['dp-tips-seen','dp-tour-home','dp-tour-place','dp-tour-drive'])localStorage.setItem(k,'1')}catch{}});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=test]');
  await page.click('[data-decision-route="brentwood-1"]');
  await expect(page.locator('#exercise-detail')).toBeVisible({timeout:300_000});
  await page.click('#start-practice');
  const answers:Record<string,string[]>={
    'queens-road-roundabout/approach':['signal-left','mirror-interior','mirror-left'],
    'queens-road-roundabout/line':['look-right','go'],
    'queens-road-roundabout/clear':['look-right','go'],
    'chatham-way-mini/approach':['mirror-interior'],
    'chatham-way-mini/line':['look-right','go'],
    'high-street-lights/approach':['give-way'],
    'high-street-lights/clear':['look-left','go'],
    'western-road-mini/approach':['mirror-interior','mirror-right','signal-right'],
    'western-road-mini/line':['look-right','give-way'],
    'western-road-mini/clear':['look-right','go'],
    'william-hunter-way-zebra/approach':['mirror-interior','give-way'],
    'william-hunter-way-zebra/clear':['look-left','look-right','go'],
    'william-hunter-way-mini/approach':['mirror-interior'],
    'william-hunter-way-mini/line':['look-right','go'],
    'wilsons-corner/approach':['mirror-interior','mirror-left','signal-left'],
    'wilsons-corner/line':['look-right','give-way'],
    'wilsons-corner/clear':['look-right','go'],
    'queens-road-mini/approach':['mirror-interior','mirror-right','signal-right'],
    'queens-road-mini/line':['look-right','go']
  };
  const seen:string[]=[];
  for(;;){
    const at=await page.waitForFunction(()=>{const d=(window as any).__drivingPractice.decision(),s=(window as any).__drivingPractice.session();
      return d?.state==='paused'?`${d.at.challenge}/${d.at.stage}`:s==='finished'?'finished':null},undefined,{timeout:300_000,polling:250}).then(h=>h.jsonValue());
    if(at==='finished')break;
    seen.push(at as string);
    await expect(page.locator('#decision-panel')).toBeVisible();
    await expect(page.locator('#decision-step')).toHaveText(/^Challenge \d of 8$/);
    // The scene is still while deciding.
    const t=await page.evaluate(()=>(window as any).__drivingPractice.simTime());
    await page.waitForTimeout(600);
    expect(await page.evaluate(()=>(window as any).__drivingPractice.simTime())).toBe(t);
    for(const a of answers[at as string]!)await page.click(`#decision-buttons [data-action="${a}"]`);
    // Done asks first; No goes back to the buttons, still paused.
    await page.click('#decision-done');
    await page.click('#decision-no');
    await expect(page.locator('#decision-buttons')).toBeVisible();
    await page.click('#decision-done');
    await page.click('#decision-yes');
    if(at==='queens-road-roundabout/line')await expect(page.locator('#decision-note')).toHaveText(/examiner took control/);
    else await expect(page.locator('#decision-note')).toHaveText('Recorded.');
    await page.click('#decision-continue');
  }
  // Going in front of the blue car was held, and the decision came again once it had passed.
  expect(seen).toEqual(Object.keys(answers));
  await expect(page.locator('#screen-results')).toBeVisible({timeout:60_000});
  await expect(page.locator('#results-title')).toHaveText('Decision mock test: FAIL');
  await expect(page.locator('#results-summary')).toHaveText('1 minor · 0 serious · 1 dangerous');
  // The signal before the mirrors stays marked although the mirrors came after.
  await expect(page.locator('.decision-faults')).toContainText(['Signalled before the mirrors','Pulled out in front of the blue car']);
  // Practise the roundabout again: the marking shows after the decision.
  await page.click('.decision-practise >> nth=0');
  await page.waitForFunction(()=>(window as any).__drivingPractice.decision()?.state==='paused',undefined,{timeout:300_000,polling:250});
  for(const a of ['mirror-interior','mirror-left','signal-left'])await page.click(`#decision-buttons [data-action="${a}"]`);
  await page.click('#decision-done');await page.click('#decision-yes');
  await expect(page.locator('#decision-note')).toHaveText('Well judged.');
});
