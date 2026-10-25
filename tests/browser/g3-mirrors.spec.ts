import {expect,test,type Page} from '@playwright/test';
import {openMenu,pick} from './home';

// iPhone 14 Pro Max in landscape (CSS pixels), touch input.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(300_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

type Rect={left:number;top:number;right:number;bottom:number};
/** Pixels of a road user's colour inside a screen rectangle, and their mean x (0..1 across it), from a real screenshot. */
async function count(page:Page,rect:Rect,colour:'purple'|'yellow'){
  const clip={x:Math.max(0,rect.left+1),y:Math.max(0,rect.top+1),width:Math.max(2,rect.right-rect.left-2),height:Math.max(2,rect.bottom-rect.top-2)};
  const png=(await page.screenshot({clip})).toString('base64');
  return page.evaluate(async([data,colour])=>{
    const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
    const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
    const px=ctx.getImageData(0,0,c.width,c.height).data;
    let n=0,sx=0;
    for(let i=0;i<px.length;i+=4){
      const r=px[i]!,g=px[i+1]!,b=px[i+2]!;
      if(colour==="purple"?r>90&&b>150&&g<90:r>140&&g>110&&b<80&&r>=g){n++;sx+=(i/4)%c.width}
    }
    return {n,x:n?sx/n/c.width:NaN};
  },[png,colour] as const);
}
const mirror=async(page:Page,id:string):Promise<Rect>=>(await read(page,'mirrors()')).find((m:any)=>m.id===id);
const userZ=(page:Page,id:string,below:number)=>page.waitForFunction(([id,below])=>{
  const p=(window as any).__drivingPractice.passersDetail().find((x:any)=>x.id===id);return p&&p.started&&p.pose.position.z<below;
},[id,below] as const,{timeout:180_000});
const overlaps=(a:Rect,b:Rect)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
/** No HUD control may cover a mirror's glass. */
async function controlsClear(page:Page,rect:Rect){
  for(const id of ['hud-left','hud-centre','touch-controls','hud-top','hud-view-label','hud-behind']){
    const box=await page.locator('#'+id).boundingBox();
    if(!box)continue;
    expect(overlaps(rect,{left:box.x,top:box.y,right:box.x+box.width,bottom:box.y+box.height}),`#${id} covers the mirror`).toBe(false);
  }
}
const onScreen=(r:Rect)=>r.left>=0&&r.top>=0&&r.right<=932&&r.bottom<=430;

test('G3: all three mirrors are findable, unobstructed and show the purple car and cyclist the right way round; shoulders show the blind spots',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  expect(await read(page,'quality')).toBe('phone');
  await pick(page,'moving-off');
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  await page.click('#start-intro');
  await expect(page.locator('[data-view]')).toHaveCount(6);
  await expect(page.locator('#hud-view-label')).toHaveText('View: Forward');

  // Forward view: the interior mirror hangs near the upper centre, the right mirror is in view, and nothing covers them.
  await page.waitForTimeout(600);
  const interior=await mirror(page,'interior');
  const cx=(interior.left+interior.right)/2,cy=(interior.top+interior.bottom)/2;
  testInfo.annotations.push({type:'interior mirror (forward view)',description:JSON.stringify(interior)});
  expect(cx).toBeGreaterThan(932*.2);   // not pushed into the corner
  expect(cx).toBeLessThan(932*.5);      // left of centre, as seen from the right-hand seat
  expect(cy).toBeLessThan(430*.42);     // upper part of the windscreen
  expect(interior.right-interior.left).toBeGreaterThan(110);
  await controlsClear(page,interior);
  const right=await mirror(page,'right-door');
  expect(onScreen(right)).toBe(true);
  await controlsClear(page,right);
  await page.screenshot({path:testInfo.outputPath('g3-00-forward.png')});

  // Each view button reaches its view (the glass fully on screen and clear of controls) and Forward comes back.
  for(const id of ['interior','left-door','right-door'] as const){
    await read(page,`selectView('${id}')`);
    await page.waitForTimeout(900);
    const r=await mirror(page,id);
    expect(onScreen(r),`${id} on screen`).toBe(true);
    expect(r.right-r.left,`${id} size`).toBeGreaterThan(100);
    await controlsClear(page,r);
    await expect(page.locator(`[data-view=${id}]`)).toHaveClass(/selected/);
  }
  await read(page,"selectView('forward')");
  await expect.poll(async()=>Math.abs((await read(page,'head()')).yaw)).toBeLessThan(.02);
  await expect(page.locator('#hud-view-label')).toHaveText('View: Forward');

  // 1. The purple car approaching from behind on the right: interior mirror (right half of the glass) and right mirror.
  await userZ(page,'purple-car',18);
  await read(page,'freezeTime(true)');
  await read(page,"selectView('interior')");
  await page.waitForTimeout(900);
  const inInterior=await count(page,await mirror(page,'interior'),'purple');
  await page.screenshot({path:testInfo.outputPath('g3-01-interior-mirror.png')});
  await read(page,"selectView('right-door')");
  await page.waitForTimeout(900);
  const inRight=await count(page,await mirror(page,'right-door'),'purple');
  await page.screenshot({path:testInfo.outputPath('g3-02-right-mirror.png')});
  testInfo.annotations.push({type:'purple car behind',description:`interior ${JSON.stringify(inInterior)}, right mirror ${JSON.stringify(inRight)}`});
  expect(inInterior.n).toBeGreaterThan(80);
  // Behind and to the right of the car, so on the right of the interior mirror as the driver sees it.
  expect(inInterior.x).toBeGreaterThan(.5);
  expect(inRight.n).toBeGreaterThan(80);
  // The same in the mirror's own image (independent of what is seen around the glass's rounded corners).
  const inRightImage=await read(page,"mirrorPixels('right-door','purple')");
  expect(inRightImage.n).toBeGreaterThan(80);

  // 2. Alongside: gone from the right mirror; the right shoulder check shows it.
  await read(page,'freezeTime(false)');
  await userZ(page,'purple-car',-.5);
  await read(page,'freezeTime(true)');
  await read(page,"selectView('right-door')");
  await page.waitForTimeout(900);
  // Counted in the mirror's own image: on screen, the real car is seen through the window around the glass.
  const alongsideMirror=await read(page,"mirrorPixels('right-door','purple')");
  await read(page,"selectView('right-shoulder')");
  await page.waitForTimeout(1100);
  const shoulder=await count(page,{left:0,top:0,right:932,bottom:320},'purple');
  await page.screenshot({path:testInfo.outputPath('g3-03-right-shoulder.png')});
  testInfo.annotations.push({type:'purple car alongside',description:`right mirror ${alongsideMirror.n}, right shoulder ${shoulder.n}`});
  // Real mirror geometry: alongside, at most a sliver of its rear stays in the glass (no coverage is faked).
  expect(alongsideMirror.n).toBeLessThan(inRightImage.n*.15);
  expect(shoulder.n).toBeGreaterThan(1500);

  // 3. The cyclist approaching along the kerb from behind. Parked at the kerb, nothing can pass on your
  // left, so it rides in line behind your car: further back it shows at the inner edge of the left
  // mirror, past your car's own side; closer, your car hides it there but the interior mirror shows it.
  await read(page,"selectView('forward')");
  await read(page,'freezeTime(false)');
  await userZ(page,'cyclist',34);
  await read(page,'freezeTime(true)');
  await read(page,"selectView('left-door')");
  await page.waitForTimeout(1100);
  const leftFar=await count(page,await mirror(page,'left-door'),'yellow');
  await page.screenshot({path:testInfo.outputPath('g3-04-left-mirror.png')});
  await read(page,'freezeTime(false)');
  await userZ(page,'cyclist',12.5);
  await read(page,'freezeTime(true)');
  await read(page,"selectView('interior')");
  await page.waitForTimeout(1100);
  const interiorNear=await count(page,await mirror(page,'interior'),'yellow');
  await page.screenshot({path:testInfo.outputPath('g3-05-interior-cyclist.png')});
  // 4. It moves out to pass on your right: right shoulder.
  await read(page,'freezeTime(false)');
  await userZ(page,'cyclist',1);
  await read(page,'freezeTime(true)');
  await read(page,"selectView('right-shoulder')");
  await page.waitForTimeout(1100);
  const shoulderCyclist=await count(page,{left:0,top:0,right:932,bottom:320},'yellow');
  await page.screenshot({path:testInfo.outputPath('g3-06-right-shoulder-cyclist.png')});
  await read(page,"selectView('left-shoulder')");
  await page.waitForTimeout(1100);
  await page.screenshot({path:testInfo.outputPath('g3-07-left-shoulder.png')});
  testInfo.annotations.push({type:'cyclist',description:`left mirror at ~33 m ${JSON.stringify(leftFar)}, interior mirror at ~12 m ${JSON.stringify(interiorNear)}, right shoulder alongside ${shoulderCyclist.n}`});
  expect(leftFar.n).toBeGreaterThan(3);
  expect(leftFar.x).toBeGreaterThan(.55); // inner edge of the left mirror, next to the car's own side
  expect(interiorNear.n).toBeGreaterThan(20);
  expect(shoulderCyclist.n).toBeGreaterThan(200);
  await read(page,'freezeTime(false)');
  expect(errors).toEqual([]);
});

test('G3: mirror rendering cost (headless software rendering, not representative of the iPhone)',async({page},testInfo)=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'moving-off');
  await page.click('#start-intro');
  const measure=async(label:string)=>{
    await read(page,'resetPerf()');
    await page.waitForTimeout(3000);
    const p=await read(page,'perf()');
    testInfo.annotations.push({type:`frame time, ${label}`,description:`${p.averageFps.toFixed(1)} fps avg, p95 ${p.p95Ms.toFixed(1)} ms over ${p.frames} frames`});
    return p;
  };
  await measure('forward view (interior + right mirror rendering, every 2nd frame)');
  await read(page,"selectView('right-door')");
  await measure('right mirror selected (it renders every frame)');
  await read(page,'mirrorsEnabled(false)');
  await measure('mirrors switched off (diagnostic)');
  await read(page,'mirrorsEnabled(true)');
});

test('G3: with the iPhone 14 Pro Max landscape safe areas (59 px each side, 21 px home indicator), controls stay on screen and clear of every mirror; About shows the build',async({page},testInfo)=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  // Chromium does not emulate env(safe-area-inset-*); apply the device's values directly.
  await page.addStyleTag({content:':root{--sl:59px!important;--sr:59px!important;--sb:21px!important;--st:8px!important}'});
  await openMenu(page);
  await page.click('#about-open');
  await expect(page.locator('#about-branch')).not.toBeEmpty();
  await expect(page.locator('#about-commit')).toHaveText(/^[0-9a-f]{7}/);
  await page.screenshot({path:testInfo.outputPath('g3-10-about.png')});
  await page.click('#about-close');
  await pick(page,'moving-off');
  await page.click('#start-intro');
  for(const view of ['forward','interior','left-door','right-door'] as const){
    await read(page,`selectView('${view}')`);
    await page.waitForTimeout(900);
    for(const id of ['hud-left','hud-centre','touch-controls','hud-top','hud-view-label','hud-behind']){
      // (The view label shows only away from the forward view.)
      const b=await page.locator('#'+id).boundingBox();
      if(!b)continue;
      expect(b.x,`#${id} left of the cut-out`).toBeGreaterThanOrEqual(id==='hud-centre'?59:58);
      expect(b.x+b.width,`#${id} right edge`).toBeLessThanOrEqual(932-58);
      expect(b.y+b.height,`#${id} above the home indicator`).toBeLessThanOrEqual(430-20);
    }
    for(const m of await read(page,'mirrors()'))if(onScreen(m))await controlsClear(page,m);
    await page.screenshot({path:testInfo.outputPath(`g3-11-safe-area-${view}.png`)});
  }
});
