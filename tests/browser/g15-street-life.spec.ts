import {expect,test,type Page} from '@playwright/test';

// Street life in every exercise: the location label, signs (Brentwood), background people, the buses
// (Brentwood) and the new cyclist and crossing pedestrian figures, from the driver's seat.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(480_000);
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const start=async(page:Page,exercise:string)=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click(`[data-exercise=${exercise}]`);
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
};

test('G15: Brentwood shows its street names, signs, bus stops, people and buses; the waiting bus pulls away',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page,'brentwood');
  await expect(page.locator('#hud-place')).toHaveText('High Street · Brentwood · 20 mph');
  const signs=await read(page,'signage()');
  const kinds=(k:string)=>signs.panels.filter((p:any)=>p.kind===k);
  expect(kinds('street-name').length).toBeGreaterThanOrEqual(8);
  expect(kinds('mini-roundabout').length).toBe(6);
  expect(kinds('bus-flag').length).toBe(6);
  expect(signs.shelters.length).toBe(5);
  const people=await read(page,'people()');
  expect(people.crowd.length).toBeGreaterThan(20);
  // Buses: the westbound one waits at Coach Stop E, then pulls away; the eastbound one is on its way.
  const buses=await read(page,'buses()');
  expect(buses.map((b:any)=>b.state)).toEqual(['waiting','driving']);
  await page.screenshot({path:testInfo.outputPath('g15-brentwood-forward.png')});
  await expect.poll(async()=>(await read(page,'buses()'))[0].state,{timeout:300_000,intervals:[1000]}).toBe('driving');
  // (Stopping at each call under controlled braking is checked in tests/unit/bus.test.ts in simulated time.)
  // Signs and people stay put while time passes (diagnostic camera views for the record).
  await read(page,'freezeTime(true)');
  await read(page,"selectView('interior')");
  await page.waitForTimeout(1500);
  await page.screenshot({path:testInfo.outputPath('g15-brentwood-interior-bus-at-stop.png')});
  expect(errors).toEqual([]);
});

test('G15: the representative streets say so; people walk there but keep clear of the hazards',async({page},testInfo)=>{
  for(const exercise of ['zebra','moving-off']){
    await start(page,exercise);
    await expect(page.locator('#hud-place')).toHaveText('Practice street · representative, not a real place');
    const signs=await read(page,'signage()');
    expect(signs.panels.filter((p:any)=>p.kind==='street-name'||p.kind==='fascia')).toEqual([]);
    const people=await read(page,'people()');
    expect(people.crowd.length).toBeGreaterThan(4);
    if(exercise==='zebra')expect(people.drawn).toContain('actor-pedestrian-1');
    await page.screenshot({path:testInfo.outputPath(`g15-${exercise}-forward.png`)});
  }
});
