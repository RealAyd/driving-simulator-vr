import {expect,test,type Page} from '@playwright/test';

// iPhone 14 Pro Max in landscape (CSS pixels), touch input.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(300_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

type Rect={left:number;top:number;right:number;bottom:number};
/** Counts pixels of a colour class inside a screen rectangle, from a real screenshot. */
async function count(page:Page,rect:Rect,colour:'magenta'|'yellow'){
  const clip={x:Math.max(0,rect.left+1),y:Math.max(0,rect.top+1),width:Math.max(2,rect.right-rect.left-2),height:Math.max(2,rect.bottom-rect.top-2)};
  const png=(await page.screenshot({clip})).toString('base64');
  return page.evaluate(async([data,colour])=>{
    const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
    const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
    const px=ctx.getImageData(0,0,c.width,c.height).data;
    let n=0;
    for(let i=0;i<px.length;i+=4){
      const r=px[i]!,g=px[i+1]!,b=px[i+2]!;
      if(colour==='magenta'?r>110&&b>100&&g<70:r>170&&g>140&&b<90)n++;
    }
    return n;
  },[png,colour] as const);
}
const mirror=async(page:Page,id:string):Promise<Rect>=>(await read(page,'mirrors()')).find((m:any)=>m.id===id);
const carZ=(page:Page,id:string,below:number)=>page.waitForFunction(([id,below])=>{
  const p=(window as any).__drivingPractice.passers().find((x:any)=>x.id===id);return p&&p.pose.position.z<below;
},[id,below] as const,{timeout:180_000});

test('G3: phone layout, mirrors show the passing car, and only a shoulder check shows the blind spot',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  expect(await read(page,'quality')).toBe('phone');
  await expect(page.locator('input[name=steering][value=assist]')).toBeChecked();
  await page.click('#start-mirror-check');
  await page.click('#briefing-go');
  await expect(page.locator('#touch-controls')).toBeVisible();
  await expect(page.locator('[data-view]')).toHaveCount(5);

  // 1. Interior mirror: the magenta car approaching from behind.
  await carZ(page,'overtaking-car',16);
  await read(page,"holdView('interior')");
  await page.waitForTimeout(700);
  const interior=await count(page,await mirror(page,'interior'),'magenta');
  await page.screenshot({path:testInfo.outputPath('g3-01-interior-mirror.png')});
  await read(page,'holdView(null)');

  // 2. Right door mirror as the car comes up alongside.
  await read(page,"holdView('right-door')");
  await carZ(page,'overtaking-car',7);
  await page.waitForTimeout(200);
  const doorBehind=await count(page,await mirror(page,'right-door'),'magenta');
  await page.screenshot({path:testInfo.outputPath('g3-02-right-door-mirror.png')});

  // 3. Blind spot: beside the driver the car has left the door mirror...
  // Simulation time is frozen so both views are compared at the same instant.
  await carZ(page,'overtaking-car',-.3);
  await read(page,'freezeTime(true)');
  await page.waitForTimeout(200);
  const doorBeside=await count(page,await mirror(page,'right-door'),'magenta');
  await page.screenshot({path:testInfo.outputPath('g3-03-right-door-mirror-blind-spot.png')});
  // ...and a right shoulder check shows it.
  await read(page,"holdView('right-shoulder')");
  await page.waitForTimeout(600);
  const zAtCheck=(await read(page,'passers()')).find((p:any)=>p.id==='overtaking-car').pose.position.z;
  testInfo.annotations.push({type:'car z (frozen) for mirror and shoulder views',description:zAtCheck.toFixed(2)});
  const shoulder=await count(page,{left:0,top:0,right:932,bottom:430},'magenta');
  await page.screenshot({path:testInfo.outputPath('g3-04-right-shoulder.png')});
  // Unfreeze while still looking, so the glance is recorded during the blind-spot moment.
  await read(page,'freezeTime(false)');
  await page.waitForFunction(()=>(window as any).__drivingPractice.events().some((e:any)=>e.type==='observation.dwell'&&e.payload.target==='right-shoulder'),null,{timeout:30_000});
  await read(page,'holdView(null)');

  // 4. Left door mirror: the cyclist filtering up the left side.
  await read(page,"holdView('left-door')");
  await carZ(page,'cyclist',7);
  await page.waitForTimeout(200);
  const leftDoor=await count(page,await mirror(page,'left-door'),'yellow');
  await page.screenshot({path:testInfo.outputPath('g3-05-left-door-mirror.png')});
  await read(page,'holdView(null)');

  const evidence={interior,doorBehind,doorBeside,shoulder,leftDoor};
  testInfo.annotations.push({type:'mirror pixels',description:JSON.stringify(evidence)});
  expect(interior,JSON.stringify(evidence)).toBeGreaterThan(30);
  expect(doorBehind,JSON.stringify(evidence)).toBeGreaterThan(30);
  expect(doorBeside,JSON.stringify(evidence)).toBeLessThan(5);
  expect(shoulder,JSON.stringify(evidence)).toBeGreaterThan(2000);
  expect(leftDoor,JSON.stringify(evidence)).toBeGreaterThan(10);

  // Observations are labelled by how they were made, never as eye tracking.
  const dwells=(await read(page,'events()')).filter((e:any)=>e.type==='observation.dwell');
  expect(new Set(dwells.map((e:any)=>e.payload.target))).toEqual(new Set(['interior','right-door','right-shoulder','left-door']));
  for(const d of dwells)expect(d.payload.source).toBe('touch view button');

  // End from the pause menu: practice notes report the blind-spot check.
  await page.click('#hud-pause');
  await page.click('#end-button');
  await expect(page.locator('#screen-results')).toBeVisible();
  const result=await read(page,'result()');
  testInfo.annotations.push({type:'notes',description:result.notes.join(' | ')});
  expect(result.notes.join(' ')).toMatch(/checked over your right shoulder while the magenta car was in your right blind spot/);
  expect(result.notes.join(' ')).toMatch(/Steering assistance was on/);
  await page.screenshot({path:testInfo.outputPath('g3-06-results.png')});
  expect(errors).toEqual([]);
});
