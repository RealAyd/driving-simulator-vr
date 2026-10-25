import {writeFileSync} from 'node:fs';
import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

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
  await pick(page,'moving-off');
  await expect(page.locator('#exercise-briefing h2')).toHaveText('Move off when safe');
  await expect(page.locator('#exercise-briefing')).toContainText('A purple car may approach from behind on your right, and a yellow cyclist may approach from behind on your left.');
  await read(page,`forceVariant('${variant}')`);
  await page.click('#start-practice');
  expect(await read(page,'variant()')).toBe(variant);
}
const tap=(page:Page,selector:string)=>page.locator(selector).dispatchEvent('pointerdown');
const go=async(page:Page,down:boolean)=>page.locator('[data-hold=throttle]').dispatchEvent(down?'pointerdown':'pointerup');
  // Frames are saved while the scene plays; assemble them with ffmpeg afterwards (Playwright's own video needs its bundled ffmpeg).
  test('G7: recording: the purple car and the cyclist pass while the learner checks each view',async({page},testInfo)=>{
    test.setTimeout(400_000);
    await startMovingOff(page,'car-then-cyclist');
    // Chrome's screencast streams every rendered frame (with timestamps) for a real-time video.
    const cdp=await page.context().newCDPSession(page);
    let frame=0;
    const times:number[]=[];
    cdp.on('Page.screencastFrame',async f=>{
      writeFileSync(testInfo.outputPath(`frame-${String(frame++).padStart(5,'0')}.jpg`),Buffer.from(f.data,'base64'));
      times.push(f.metadata.timestamp??0);
      await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});
    });
    await cdp.send('Page.startScreencast',{format:'jpeg',quality:80,everyNthFrame:1});
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
    await cdp.send('Page.stopScreencast');
    const seconds=times.length>1?times.at(-1)!-times[0]!:0;
    writeFileSync(testInfo.outputPath('timing.json'),JSON.stringify({frames:frame,seconds}));
    testInfo.annotations.push({type:'frames',description:`${frame} frames over ${seconds.toFixed(1)} s`});
  });
