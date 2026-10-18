import {expect,test,type Page} from '@playwright/test';

// Full drives at software-rendering frame rates take minutes of real time.
test.setTimeout(480_000);

type Car={position:{x:number;z:number};heading:number;speed:number};
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

/** Metres past z = 40 (40 m behind the start) on the straight; the road itself now starts 290 m further back, at z = 330. */
const alongOf=(car:Car)=>40-car.position.z;
const GIVE_WAY=(436-290)-2-1;

/**
 * A simple scripted driver: holds keys to track a target speed and lateral
 * position. Decisions use live simulation state, never fixed durations, so
 * the result does not depend on how fast the machine renders.
 */
class TestDriver{
  private held=new Set<string>();
  constructor(private page:Page){}
  private async hold(key:string,on:boolean){
    if(on&&!this.held.has(key)){this.held.add(key);await this.page.keyboard.down(key)}
    if(!on&&this.held.has(key)){this.held.delete(key);await this.page.keyboard.up(key)}
  }
  async release(){for(const k of [...this.held])await this.hold(k,false)}
  async drive(opts:{speed:(car:Car)=>number;laneX:(car:Car)=>number;until:(car:Car,ped:{state:string})=>boolean;timeout?:number}){
    const end=Date.now()+(opts.timeout??240_000);
    for(;;){
      if(await read(this.page,'session()')!=='running')return this.release();
      const car:Car=await read(this.page,'vehicle()');
      const ped=await read(this.page,'pedestrian()');
      if(opts.until(car,ped))return this.release();
      if(Date.now()>end)throw new Error(`TestDriver timed out at z=${car.position.z.toFixed(1)} speed=${car.speed.toFixed(1)}`);
      const target=opts.speed(car);
      await this.hold('KeyW',car.speed<target-.3);
      await this.hold('Space',car.speed>target+.6||target===0);
      // Steer toward the target lane: desired heading proportional to lateral
      // error, gentler at speed so lane changes do not overshoot.
      const heading=car.heading>Math.PI?car.heading-2*Math.PI:car.heading;
      const limit=car.speed>9?.07:.2,gain=car.speed>9?.05:.15;
      const desired=Math.max(-limit,Math.min(limit,(opts.laneX(car)-car.position.x)*gain));
      const band=car.speed>9?.01:.02;
      await this.hold('KeyD',car.speed>.5&&heading<desired-band);
      await this.hold('KeyA',car.speed>.5&&heading>desired+band);
      await sleep(30);
    }
  }
}

async function startExercise(page:Page){
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.click('[data-exercise=zebra]');
  await page.click('#start-practice');
  expect(await read(page,'session()')).toBe('running');
}

/** Pass the parked van in the right-hand lane between along 95 and 155. */
const passVanLane=(car:Car)=>{const a=alongOf(car);return a>95&&a<155?1.3:-1.6};
/** Fast attempt: change lane early at low speed, then hold the other lane at 30 mph. */
const passVanLaneFast=(car:Car)=>{const a=alongOf(car);return a>45&&a<160?1.3:-1.6};
const fastSpeed=(car:Car)=>{const a=alongOf(car);return a<75?7:13.4};

test('G2: a careful attempt (mirror check, slow approach, gives way) completes without serious findings',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await startExercise(page);
  await expect(page.locator('#hud-task')).toContainText('van is parked');  // kept for the Task button
  const driver=new TestDriver(page);

  // Approach and pass the van at about 12 mph, into the restricted-view zone.
  await driver.drive({speed:c=>alongOf(c)<90?8:5.5,laneX:passVanLane,until:c=>alongOf(c)>122});
  // Mirror check just before slowing (mouse-controlled view pointed at the interior mirror).
  await read(page,'look(-0.475,0.277)');
  await page.waitForFunction(()=>(window as any).__drivingPractice.events().some((e:any)=>e.type==='observation.dwell'),null,{timeout:20_000});
  await read(page,'look(0,0)');
  // Creep towards the crossing; stop short of the give-way line while the pedestrian is crossing.
  await driver.drive({
    speed:c=>{const front=alongOf(c)+2.15;return front>GIVE_WAY-2.5?0:3},
    laneX:passVanLane,
    until:(c,p)=>c.speed===0&&alongOf(c)+2.15>GIVE_WAY-6&&(p.state==='preparing'||p.state==='crossing')
  });
  expect((await read(page,'pedestrian()')).state).not.toBe('waiting');
  await page.screenshot({path:testInfo.outputPath('g2-01-waiting-for-pedestrian.png')});
  // The following car stops behind, keeping a gap.
  const follower=await read(page,'follower()');
  expect(follower.gap).toBeGreaterThan(1);
  // Wait for the pedestrian to finish crossing, then drive on to the end.
  await page.waitForFunction(()=>(window as any).__drivingPractice.pedestrian().state==='clear',null,{timeout:60_000});
  await driver.drive({speed:()=>8,laneX:c=>alongOf(c)<160?1.3:-1.6,until:()=>false,timeout:90_000});

  await expect(page.locator('#screen-results')).toBeVisible({timeout:30_000});
  const result=await read(page,'result()');
  testInfo.annotations.push({type:'careful result',description:JSON.stringify({outcome:result.outcome,findings:result.findings.map((f:any)=>`${f.severity}:${f.ruleId}`),notes:result.notes})});
  expect(result.outcome).toBe('completed');
  expect(result.findings.filter((f:any)=>f.severity==='serious'||f.severity==='dangerous')).toEqual([]);
  expect(result.notes.join(' ')).toMatch(/Gave way to the pedestrian/);
  expect(result.notes.join(' ')).toMatch(/mouse-controlled view/);
  await expect(page.locator('#results-meta')).toContainText('draft');
  await page.screenshot({path:testInfo.outputPath('g2-02-results-careful.png')});
  expect(errors).toEqual([]);
});

test('G2: a fast attempt is flagged, findings cite real events, and Try again restarts cleanly',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await startExercise(page);
  const driver=new TestDriver(page);
  await driver.drive({speed:fastSpeed,laneX:passVanLaneFast,until:()=>false,timeout:240_000});

  await expect(page.locator('#screen-results')).toBeVisible({timeout:30_000});
  const result=await read(page,'result()');
  const events=await read(page,'events()');
  testInfo.annotations.push({type:'fast result',description:JSON.stringify({outcome:result.outcome,findings:result.findings.map((f:any)=>`${f.severity}:${f.ruleId}:${f.incidentId}`)})});
  const summary=JSON.stringify({outcome:result.outcome,findings:result.findings.map((f:any)=>`${f.severity}:${f.ruleId}:${f.explanation}`)});
  expect(result.outcome,summary).toBe('completed');
  const speed=result.findings.find((f:any)=>f.ruleId==='approach.speed');
  expect(speed?.severity,summary).toBe('serious');
  const conflict=result.findings.filter((f:any)=>f.incidentId==='crossing-conflict');
  expect(conflict,summary).toHaveLength(1);
  expect(['serious','dangerous']).toContain(conflict[0].severity);
  for(const f of result.findings)for(const id of f.eventIds)expect(events.some((e:any)=>e.id===id)).toBe(true);
  await expect(page.locator('#results-findings li')).toHaveCount(result.findings.length);
  await page.screenshot({path:testInfo.outputPath('g2-03-results-fast.png')});

  // Saved on this device; Try again starts a clean attempt.
  expect(await read(page,'storage')).toBe('indexeddb');
  await expect(page.locator('#results-meta')).toContainText('saved on this device');
  await page.click('#retry-button');
  expect(await read(page,'session()')).toBe('running');
  const fresh=await read(page,'vehicle()');
  expect(fresh.position.z).toBeCloseTo(0,5);
  expect((await read(page,'pedestrian()')).state).toBe('waiting');
  expect(await read(page,'findings()')).toEqual([]);
  expect((await read(page,'events()')).map((e:any)=>e.type)).toEqual(['session.reset']);
  expect(errors).toEqual([]);
});
