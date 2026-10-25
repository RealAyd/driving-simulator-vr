import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// A driving lesson at Goodmayes: Lesson on the home screen, the syllabus, a lesson's briefing, then the drive with
// the instructor (directions, reminders when something is not done, a word after each junction) and the report.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
/** A bot driver that never checks mirrors or signals: about 15 mph, 8 mph near the junction, waits behind traffic. */
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

test('G23: a lesson: syllabus, briefing, the instructor coaching on the drive, and the lesson report',async({page},testInfo)=>{
  test.setTimeout(400_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?routeSeed=1');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'goodmayes','lesson');
  // The syllabus: eleven lessons (the last the manoeuvres), and what is coming.
  await expect(page.locator('#lesson-list [data-lesson]')).toHaveCount(11);
  await expect(page.locator('#start-practice')).toBeDisabled();
  await page.screenshot({path:testInfo.outputPath('g23-syllabus.png')});
  await page.click('[data-lesson=left-turns]');
  await expect(page.locator('#exercise-briefing')).toContainText('Mirrors, Signal, Position, Speed, Look');
  await expect(page.locator('#start-practice')).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath('g23-briefing.png')});
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  // No tell me question on a lesson: the instructor's briefing.
  await expect(page.locator('#hud-task')).toContainText('turning left into side roads',{timeout:20_000});
  expect(await page.locator('#hud-question').isVisible()).toBe(false);
  // Drive (assisted steering) through the first junction without mirrors or a signal: reminders, then advice.
  await driveUntil(page,async()=>(await read(page,'examiner()')).index>=1,240_000);
  const said=(await read(page,'events()')).length;
  expect(said).toBeGreaterThan(0);
  await page.screenshot({path:testInfo.outputPath('g23-driving.png')});
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible({timeout:30_000});
  await expect(page.locator('#results-title')).toHaveText('Lesson 2: Turning left into side roads');
  await expect(page.locator('#results-summary')).toContainText('to work on');
  const result=await read(page,'result()');
  expect(result.notes.join(' ')).toMatch(/signal left|mirrors/);
  await page.screenshot({path:testInfo.outputPath('g23-report.png'),fullPage:true});
  expect(errors).toEqual([]);
});

test('G23: lesson 11, manoeuvres: the emergency stop (pull in, briefing, STOP on screen and spoken, a prompt stop is not faulted)',async({page},testInfo)=>{
  test.setTimeout(700_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?routeSeed=2');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'goodmayes','lesson');
  await page.click('[data-lesson=manoeuvres]');
  await expect(page.locator('#exercise-briefing')).toContainText('emergency stop');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  const manoeuvre=async()=>(await read(page,'examiner()'))?.manoeuvre as {kind:string;phase:string;faults:string[];notes:string[];waiting:string}|null;
  // Drive until the instructor asks for the emergency stop and the car has pulled in.
  await driveUntil(page,async()=>(await manoeuvre())?.phase==='pull-in',300_000);
  expect(await manoeuvre()).toMatchObject({kind:'emergency-stop',phase:'pull-in'});
  // In to the kerb (assisted steering finds a gap between the parked cars), then stop.
  // (At the kerb: nearer it than the lane keeps, about 0.6 m.)
  await driveUntil(page,async()=>{const m=await manoeuvre();return Number(/kerb (-?[\d.]+)/.exec(m?.waiting??'')?.[1]??9)<.45},90_000);
  await page.keyboard.down('KeyS');await page.waitForTimeout(3500);await page.keyboard.up('KeyS');
  await expect.poll(async()=>(await manoeuvre())?.phase,{timeout:20_000}).toBe('brief');
  // Off again, up to speed: on STOP (shown big on screen), brake at once.
  await page.keyboard.down('KeyW');
  await expect(page.locator('#hud-flash')).toBeVisible({timeout:120_000});
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyS');
  await page.screenshot({path:testInfo.outputPath('g23-stop.png')});
  await expect.poll(async()=>(await manoeuvre())?.phase,{timeout:20_000}).toBe('after');
  await page.keyboard.up('KeyS');
  const m=(await manoeuvre())!;
  expect(m.faults).not.toContain('controlled-stop-promptness');
  expect(m.notes.join(' ')).toMatch(/brakes on \d\.\d s after/);
  expect(errors).toEqual([]);
});
