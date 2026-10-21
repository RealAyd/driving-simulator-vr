import {expect,test,type Page} from '@playwright/test';

// The Kings Road zebra (Brentwood): drives with steering assistance (phone layout), speed and observations by the
// test. Decisions use live simulation state, never fixed durations.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(600_000);
type Car={position:{x:number;z:number};heading:number;speed:number};
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
/** The crossing is at the world origin and the car approaches from the north (z < 0): metres to its centre. */
const toCrossing=(c:Car)=>c.position.z<0?Math.hypot(c.position.x,c.position.z):-Math.hypot(c.position.x,c.position.z);
const GIVE_WAY=1.5+1.1;

async function start(page:Page){
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=kings-road]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
}
/** Holds Go or Brake to track a target speed until `until`; steering is the exercise's assistance. */
async function drive(page:Page,speed:(c:Car)=>number,until:(c:Car,p:{state:string})=>boolean,timeout=300_000){
  const held=new Set<string>();
  const hold=async(k:string,on:boolean)=>{if(on&&!held.has(k)){held.add(k);await page.keyboard.down(k)}if(!on&&held.has(k)){held.delete(k);await page.keyboard.up(k)}};
  const end=Date.now()+timeout;
  try{
    for(;;){
      if(await read(page,'session()')!=='running')return;
      const car:Car=await read(page,'vehicle()');
      if(until(car,await read(page,'pedestrian()')))return;
      if(Date.now()>end)throw new Error(`timed out ${toCrossing(car).toFixed(1)} m before the crossing at ${car.speed.toFixed(1)} m/s`);
      const target=speed(car);
      await hold('KeyW',car.speed<target-.3);
      await hold('Space',car.speed>target+.6||target===0);
      await sleep(30);
    }
  }finally{for(const k of [...held])await hold(k,false)}
}

test('G16: Kings Road, careful: passes the bus slowly, checks the mirror, gives way to the passenger, completes',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);
  await expect(page.locator('#hud-place')).toHaveText('Kings Road · Brentwood · 30 mph');
  expect((await read(page,'buses()'))[0].state).toBe('waiting');
  await page.screenshot({path:testInfo.outputPath('g16-01-start.png')});
  await drive(page,c=>toCrossing(c)>80?8:5.5,c=>toCrossing(c)<52);
  await page.screenshot({path:testInfo.outputPath('g16-02-passing-the-bus.png')});
  // Mirror check just before slowing for the crossing (no screenshot in between: on a slow renderer that takes
  // seconds of simulated time, longer than the look-back the rule allows).
  await read(page,"holdView('interior')");
  await page.waitForFunction(()=>(window as any).__drivingPractice.events().some((e:any)=>e.type==='observation.dwell'&&e.payload.target==='interior'),null,{timeout:60_000});
  await read(page,"holdView(null)");
  await drive(page,c=>toCrossing(c)-2.15<GIVE_WAY+2.5?0:3,
    (c,p)=>c.speed===0&&toCrossing(c)-2.15<GIVE_WAY+6&&(p.state==='preparing'||p.state==='crossing'));
  await page.screenshot({path:testInfo.outputPath('g16-03-giving-way.png')});
  await page.waitForFunction(()=>(window as any).__drivingPractice.pedestrian().state==='clear',null,{timeout:120_000});
  await drive(page,()=>7,()=>false);
  await expect(page.locator('#screen-results')).toBeVisible({timeout:60_000});
  const result=await read(page,'result()');
  const summary=JSON.stringify({outcome:result.outcome,findings:result.findings.map((f:any)=>`${f.severity}:${f.ruleId}:${f.explanation}`),notes:result.notes});
  testInfo.annotations.push({type:'careful result',description:summary});
  expect(result.outcome,summary).toBe('completed');
  expect(result.findings.filter((f:any)=>f.severity==='serious'||f.severity==='dangerous'),summary).toEqual([]);
  expect(result.notes.join(' '),summary).toMatch(/Gave way to the pedestrian/);
  expect(result.notes.join(' '),summary).toMatch(/Checked the interior mirror/);
  expect(errors).toEqual([]);
});

test('G16: Kings Road, fast: 30 mph past the bus is flagged, naming the bus',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);
  await drive(page,()=>13.4,()=>false);
  await expect(page.locator('#screen-results')).toBeVisible({timeout:60_000});
  const result=await read(page,'result()');
  const summary=JSON.stringify({outcome:result.outcome,findings:result.findings.map((f:any)=>`${f.severity}:${f.ruleId}:${f.explanation}`)});
  testInfo.annotations.push({type:'fast result',description:summary});
  const speed=result.findings.find((f:any)=>f.ruleId==='approach.speed');
  expect(speed?.severity,summary).toBe('serious');
  expect(speed.explanation).toContain('past the bus at the stop');
  expect(errors).toEqual([]);
});
