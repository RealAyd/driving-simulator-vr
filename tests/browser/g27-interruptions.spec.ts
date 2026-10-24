import {expect,test,type Page} from '@playwright/test';

// The phone taking over during a drive (an alarm, a call): the drive pauses, and stays paused until resumed.
// On iPhone an alarm can leave the page showing but take its sound; Safari reports the audio as interrupted.
// Here the page's AudioContext is suspended from outside, as the phone would.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(240_000);
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

async function startDrive(page:Page){
  await page.addInitScript(()=>{
    const w=window as any,Base=w.AudioContext;
    w.__contexts=[];
    w.AudioContext=class extends Base{constructor(...a:any[]){super(...a);w.__contexts.push(this)}};
  });
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=moving-off]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:60_000}).toBe('running');
  // Sound starts with a tap or a key (the browser allows audio only after one).
  await page.mouse.click(466,215);
  await page.keyboard.press('Shift');
  await expect.poll(()=>page.evaluate(()=>(window as any).__contexts[0]?.state),{timeout:15_000}).toBe('running');
}

test('G27: the phone interrupting the sound (an alarm or a call) pauses the drive; it stays paused when the sound comes back',async({page})=>{
  await startDrive(page);
  await page.evaluate(()=>(window as any).__contexts[0].suspend());
  await expect.poll(()=>read(page,'session()'),{timeout:10_000}).toBe('paused');
  await page.evaluate(()=>(window as any).__contexts[0].resume());
  await page.waitForTimeout(1500);
  expect(await read(page,'session()')).toBe('paused');
});

test('G27: on a phone, losing focus to the system (a call screen, an alarm) pauses the drive',async({page})=>{
  await startDrive(page);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect.poll(()=>read(page,'session()'),{timeout:10_000}).toBe('paused');
});
