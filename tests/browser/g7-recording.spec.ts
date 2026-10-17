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
  // Frames are captured while the scene plays (no ffmpeg here) and assembled into a GIF afterwards.
  test('G7: recording: the purple car and the cyclist pass while the learner checks each view',async({page},testInfo)=>{
    test.setTimeout(400_000);
    await startMovingOff(page,'car-then-cyclist');
    let frame=0,recording=true;
    const capture=(async()=>{
      while(recording){
        await page.screenshot({path:testInfo.outputPath(`frame-${String(frame++).padStart(4,'0')}.png`)});
        await page.waitForTimeout(150);
      }
    })();
    await waitFor(page,`${z('purple-car')}<45`);
    await tap(page,'[data-view=interior]');
    await waitFor(page,`${z('purple-car')}<22`);
    await tap(page,'[data-view=right-door]');
    await waitFor(page,`${z('purple-car')}<2`);
    await tap(page,'[data-view=right-shoulder]');
    await waitFor(page,`${z('purple-car')}<-8`);
    await tap(page,'[data-view=left-door]');
    await waitFor(page,`${z('cyclist')}<14`);
    await tap(page,'[data-view=interior]');
    await waitFor(page,`${z('cyclist')}<3`);
    await tap(page,'[data-view=right-shoulder]');
    await waitFor(page,`${z('cyclist')}<-6`);
    await tap(page,'[data-view=forward]');
    await page.waitForTimeout(1500);
    recording=false;
    await capture;
    testInfo.annotations.push({type:'frames',description:String(frame)});
  });
