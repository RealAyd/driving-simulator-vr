import {expect,test,type Page} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

/** Counts strongly red and blue pixels in the left and right halves of the mirror glass, as drawn on screen. */
async function mirrorColours(page:Page){
  const rect=(await read(page,'mirrors()'))[0];
  const inset=2;
  const clip={x:rect.left+inset,y:rect.top+inset,width:rect.right-rect.left-2*inset,height:rect.bottom-rect.top-2*inset};
  const png=(await page.screenshot({clip})).toString('base64');
  return page.evaluate(async(data:string)=>{
    const img=new Image();
    img.src='data:image/png;base64,'+data;
    await img.decode();
    const c=document.createElement('canvas');
    c.width=img.width;c.height=img.height;
    const ctx=c.getContext('2d')!;
    ctx.drawImage(img,0,0);
    const {data:px,width,height}=ctx.getImageData(0,0,c.width,c.height);
    const out={redLeft:0,redRight:0,blueLeft:0,blueRight:0,redColumns:0,width,height};
    const redColumn=new Array(width).fill(false);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4,r=px[i]!,g=px[i+1]!,b=px[i+2]!;
      const left=x<width/2;
      if(r>120&&g<70&&b<70){left?out.redLeft++:out.redRight++;redColumn[x]=true}
      if(b>120&&r<70&&g<110)left?out.blueLeft++:out.blueRight++;
    }
    out.redColumns=redColumn.filter(Boolean).length;
    return out;
  },png);
}

test('G1: interior mirror shows the real scene behind, correctly oriented, and updates as the car moves',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.click('#start-button');
  await page.waitForTimeout(800);

  const rect=(await read(page,'mirrors()'))[0];
  expect(rect.right-rect.left).toBeGreaterThan(40);  // visible on screen
  expect(rect.left).toBeGreaterThan(0);
  await page.screenshot({path:testInfo.outputPath('g1-01-mirror-at-start.png')});

  const atStart=await mirrorColours(page);
  testInfo.annotations.push({type:'mirror pixels at start',description:JSON.stringify(atStart)});
  // Red car is parked behind on the left: in a mirror it must appear on the left.
  expect(atStart.redLeft).toBeGreaterThan(20);
  expect(atStart.redLeft).toBeGreaterThan(atStart.redRight*4);
  // Blue car behind on the right appears on the right.
  expect(atStart.blueRight).toBeGreaterThan(5);
  expect(atStart.blueRight).toBeGreaterThan(atStart.blueLeft*4);

  // Drive away: the red car must get narrower in the mirror (live updates).
  // Width, not area: an interior mirror shows a thin strip, so a more distant
  // car shows more of its height while getting narrower.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3000);
  await page.keyboard.up('KeyW');
  const later=await mirrorColours(page);
  testInfo.annotations.push({type:'mirror pixels after driving 3 s',description:JSON.stringify(later)});
  expect(later.redColumns).toBeLessThan(atStart.redColumns*.8);
  await page.screenshot({path:testInfo.outputPath('g1-02-mirror-after-moving.png')});
  expect(errors).toEqual([]);
});

test('G1: road sits under the car, kerb raises it, and braking from 30 mph stops predictably',async({page})=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.click('#start-button');

  const start=await read(page,'vehicle()');
  expect(start.position.y).toBeCloseTo(0,6);         // carriageway surface
  const cam=await read(page,'camera()');
  expect(cam.position[1]-start.position.y).toBeCloseTo(1.2,2); // eye height above the road, not sea level

  // Accelerate to about 30 mph, then brake fully and measure the stop.
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>(window as any).__drivingPractice.vehicle().speed>=13.4,null,{timeout:20_000});
  await page.keyboard.up('KeyW');
  const before=await read(page,'vehicle()');
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>(window as any).__drivingPractice.vehicle().speed===0,null,{timeout:10_000});
  await page.keyboard.up('Space');
  const after=await read(page,'vehicle()');
  const distance=Math.hypot(after.position.x-before.position.x,after.position.z-before.position.z);
  const v=before.speed;
  const predicted=v*v/(2*7.5);
  test.info().annotations.push({type:'braking',description:`from ${v.toFixed(2)} m/s stopped in ${distance.toFixed(2)} m (v²/2a = ${predicted.toFixed(2)} m)`});
  // Allow for up to two frames of input latency at the measured speed.
  expect(Math.abs(distance-predicted)).toBeLessThan(1+v*2/60);
  expect(Math.abs(after.position.x+1.6)).toBeLessThan(.05); // still in its lane

  // Steer left onto the pavement: the car rises by the kerb height.
  await page.keyboard.down('KeyW');await page.keyboard.down('KeyA');
  await page.waitForFunction(()=>(window as any).__drivingPractice.vehicle().position.x< -3.4,null,{timeout:10_000});
  await page.keyboard.up('KeyA');await page.keyboard.up('KeyW');
  const kerb=await read(page,'vehicle()');
  expect(kerb.position.y).toBeCloseTo(.12,6);
});

test('G1: measured frame times (environment recorded)',async({page},testInfo)=>{
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:30_000});
  await page.click('#start-button');
  await page.waitForTimeout(1000);
  await read(page,'resetPerf()');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(6000);
  await page.keyboard.up('KeyW');
  const perf=await read(page,'perf()');
  const renderer=await read(page,'renderer()');
  const report={measuredAt:new Date().toISOString(),userAgent:await page.evaluate(()=>navigator.userAgent),renderer,quality:await read(page,'quality'),perf};
  testInfo.annotations.push({type:'perf',description:JSON.stringify(report)});
  mkdirSync('test-results',{recursive:true});
  writeFileSync('test-results/g1-perf.json',JSON.stringify(report,null,2));
  expect(perf.frames).toBeGreaterThan(10);
});
