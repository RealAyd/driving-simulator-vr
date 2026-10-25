import {writeFileSync} from 'node:fs';
import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// What each mirror shows of the yellow cyclist as it approaches the parked learner and passes.
// Pixels are read from each mirror's own image (all mirrors rendering every frame), so the
// coverage of all three is measured at once; the screen holds the left-mirror view and is recorded.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(900_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G11: left mirror coverage of the cyclist: measured along its whole approach, recorded from the driver\'s seat',async({page},testInfo)=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'moving-off');
  // The cyclist sets off at once from 80 m behind; the purple car comes much later.
  await read(page,"forceVariant('cyclist-then-late-car')");
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  await read(page,'allMirrorsLive(true)');
  await read(page,"selectView('left-door')");

  // The frame-by-frame recording (docs) is heavy in software rendering: only with RECORD=1.
  const record=!!process.env.RECORD;
  const cdp=await page.context().newCDPSession(page);
  let frame=0;
  cdp.on('Page.screencastFrame',async f=>{
    writeFileSync(testInfo.outputPath(`frame-${String(frame++).padStart(5,'0')}.jpg`),Buffer.from(f.data,'base64'));
    await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});
  });
  if(record)await cdp.send('Page.startScreencast',{format:'jpeg',quality:80,everyNthFrame:1});

  type Row={t:number;behind:number;lateral:number;interior:number;left:number;leftX:number|null;right:number};
  const rows:Row[]=[];
  // The learner's car: rear bumper 2.15 m behind its centre at z 0; x −2.15.
  for(let i=0;i<400;i++){
    const t=await read(page,'simTime()');
    let c=(await read(page,'passersDetail()')).find((p:any)=>p.id==='cyclist');
    if(c?.started){
      // Hold simulated time and let two frames render, so the pose and the mirror images are from the same moment
      // (rendering can be about 1 fps in CI).
      await read(page,'freezeTime(true)');
      await read(page,'resetPerf()');
      await expect.poll(async()=>(await read(page,'perf()')).frames,{timeout:30_000}).toBeGreaterThanOrEqual(2);
      c=(await read(page,'passersDetail()')).find((p:any)=>p.id==='cyclist');
      const [interior,left,right]=await Promise.all(['interior','left-door','right-door'].map(id=>read(page,`mirrorPixels('${id}','yellow')`)));
      rows.push({t:+t.toFixed(1),behind:+(c.pose.position.z-2.15).toFixed(1),lateral:+(c.pose.position.x+2.15).toFixed(2),interior:interior.n,left:left.n,leftX:left.x===null?null:+left.x.toFixed(2),right:right.n});
      await read(page,'freezeTime(false)');
      if(c.pose.position.z<-6)break;
    }
    // Next sample after about 0.4 s of simulated time (a wall-clock wait would give fewer samples on slow machines).
    await expect.poll(async()=>(await read(page,'simTime()'))-t,{timeout:60_000,intervals:[100]}).toBeGreaterThanOrEqual(.4);
  }
  if(record)await cdp.send('Page.stopScreencast');
  writeFileSync(testInfo.outputPath('coverage.json'),JSON.stringify(rows,null,1));
  console.log('COVERAGE\n'+rows.filter((_,i)=>i%2===0).map(r=>`${r.behind}\t${r.lateral}\t${r.interior}\t${r.left}\t${r.leftX}\t${r.right}`).join('\n'));

  const at=(lo:number,hi:number)=>rows.filter(r=>r.behind>=lo&&r.behind<hi);
  // Far back (beyond about 25 m behind the car) the cyclist is at the inner edge of the left mirror.
  const far=at(25,80);
  expect(far.some(r=>r.left>0)).toBe(true);
  expect(far.filter(r=>r.left>0).every(r=>(r.leftX??0)>.6)).toBe(true);
  // It grows in the mirror as it closes (more pixels from 25–40 m than from 50–80 m).
  const mean=(list:Row[])=>list.reduce((n,r)=>n+r.left,0)/Math.max(1,list.length);
  expect(mean(at(25,40))).toBeGreaterThan(mean(at(50,80)));
  // Close behind and in line with the car (3–10 m behind, within the car's width) it is hidden from the left mirror by
  // the car itself, and in the interior mirror. (Step 14: the rider is now a human figure leaning forward to the bars,
  // its head and shoulders about 0.3 m further forward than the old cylinder, so it leaves the left mirror's inner
  // edge about 10.5 m behind instead of 12 m. The window was 3–12 m with the cyclist left of the car's centre line;
  // the cyclist starts to move out at 10 m, so in-line samples are now those within the car's width.)
  const close=at(3,10).filter(r=>r.lateral<.5);
  expect(close.length).toBeGreaterThan(0);
  // Hidden: at most a stray pixel or two at the edge of the car's body (the right mirror also reads a constant 1 px).
  expect(close.every(r=>r.left<=2)).toBe(true);
  expect(close.some(r=>r.interior>0)).toBe(true);
  testInfo.annotations.push({type:'samples',description:String(rows.length)});
});
