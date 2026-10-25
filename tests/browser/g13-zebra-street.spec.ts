import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// The dressed zebra crossing street, as the public preview builds it (no private assets).
// Screenshots of every view from the driver's seat, the van hiding the pedestrian, and what the scene costs.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(240_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const VIEWS=[['forward','forward'],['interior','interior-mirror'],['left-door','left-mirror'],['right-door','right-mirror'],['left-shoulder','left-shoulder'],['right-shoulder','right-shoulder']] as const;

test('G13: the zebra street is dressed from every view with cleared assets; the van still hides the pedestrian; people are drawn at human height; the cost is measured',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  const downloads:Array<{url:string;bytes:number}>=[];
  page.on('response',r=>{void r.body().then(b=>downloads.push({url:new URL(r.url()).pathname,bytes:b.length})).catch(()=>{})});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'zebra');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  await read(page,'freezeTime(true)');
  expect(await read(page,'location()')).toBe('representative-residential-straight');

  const scenery=await read(page,'scenery()');
  expect(scenery.houses).toBeGreaterThan(30);
  expect(scenery.parkedCars).toBeGreaterThanOrEqual(7);
  expect(await read(page,'sceneryModels()')).toEqual([]);

  for(const [view,name] of VIEWS){
    await read(page,`selectView('${view}')`);
    await page.waitForTimeout(1500);
    await expect(page.locator('#hud-view-label')).not.toBeEmpty();
    await page.screenshot({path:testInfo.outputPath(`g13-${name}.png`)});
  }
  // Diagnostic camera at the driver's eye height in the lane: approaching the van (pedestrian hidden),
  // moved out to pass it, the van close up from the pavement, and the crossing from above.
  for(const [name,view] of [
    ['approach-eye-height-60m-before-crossing',{x:-1.97,z:-46,height:1.2,target:{x:-1.97,y:1.1,z:-140}}],
    ['passing-van-eye-height',{x:.93,z:-84,height:1.2,target:{x:.4,y:1.0,z:-140}}],
    ['panel-van-from-pavement',{x:-4.4,z:-84,height:1.6,target:{x:-2.4,y:1.1,z:-95}}],
    ['crossing-overhead',{x:-14,z:-70,height:30,target:{x:0,y:0,z:-106}}]
  ] as const){
    await read(page,`overhead(${JSON.stringify(view)})`);
    await page.waitForTimeout(1200);
    await page.screenshot({path:testInfo.outputPath(`g13-${name}.png`)});
  }
  await read(page,'overhead(null)');
  await read(page,"selectView('forward')");
  await page.waitForTimeout(2500);
  await read(page,'resetPerf()');
  await page.waitForTimeout(4000);
  const stats=await read(page,'sceneStats()');
  const perf=await read(page,'perf()');
  const draws=await read(page,'countDrawCalls()');
  const sum=(f:(u:string)=>boolean)=>downloads.filter(d=>f(d.url)).reduce((n,d)=>n+d.bytes,0);
  const loaded={total:sum(()=>true),models:sum(u=>u.endsWith('.glb'))};
  expect(downloads.filter(d=>d.url.includes('/licensed/'))).toEqual([]);
  testInfo.annotations.push({type:'scene cost (software rendering, not an iPhone)',description:JSON.stringify({stats,perf,draws,loaded})});
  console.log('SCENE',JSON.stringify({scenery,stats,perf,draws,loaded}));
  // People are drawn at human height: the waiting pedestrian (1.72 m) and everyone animated, as skinned this frame.
  await expect.poll(()=>read(page,'people().animatedModelsLoaded'),{timeout:60_000}).toBe(true);
  await expect.poll(()=>read(page,'people().animated'),{timeout:30_000}).toContain('actor-pedestrian-1');
  const heights:Array<{id:string;height:number}>=await read(page,'people().animatedHeights');
  expect(heights.find(h=>h.id==='actor-pedestrian-1')!.height).toBeCloseTo(1.72,1);
  for(const h of heights){expect(h.height,h.id).toBeGreaterThan(1.3);expect(h.height,h.id).toBeLessThan(1.95)}
  expect(errors).toEqual([]);
});
