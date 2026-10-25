import {expect,test,type Page} from '@playwright/test';
import {pick} from './home';

// The dressed Moving off street, as the public preview builds it (no private assets).
// Screenshots of every view from the driver's seat, and what the scene costs.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(240_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const VIEWS=[['forward','forward'],['interior','interior-mirror'],['left-door','left-mirror'],['right-door','right-mirror'],['left-shoulder','left-shoulder'],['right-shoulder','right-shoulder']] as const;

test('G9: the Moving off street is dressed from every view; parked cars and scenery use real models; the cost is measured',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Everything the page downloads (uncompressed bytes, as served by the preview server).
  const downloads:Array<{url:string;bytes:number}>=[];
  page.on('response',r=>{void r.body().then(b=>downloads.push({url:new URL(r.url()).pathname,bytes:b.length})).catch(()=>{})});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await pick(page,'moving-off');
  await read(page,"forceVariant('car-then-cyclist')");
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  await read(page,'freezeTime(true)');
  await read(page,'countDrawCalls()');

  const scenery=await read(page,'scenery()');
  expect(scenery.houses).toBeGreaterThan(40);
  expect(scenery.parkedCars).toBeGreaterThanOrEqual(8);
  expect(scenery.carModels).toEqual(['batch-b-compact-hatchback','batch-b-saloon','batch-b-large-saloon','batch-b-pickup','v2-peugeot-208','v2-pickup']);
  // Only cleared assets: nothing from the private (git-ignored) folder.
  expect(await read(page,'sceneryModels()')).toEqual([]);

  for(const [view,name] of VIEWS){
    await read(page,`selectView('${view}')`);
    await page.waitForTimeout(1500);
    await expect(page.locator('#hud-view-label')).not.toBeEmpty();
    await page.screenshot({path:testInfo.outputPath(`g9-${name}.png`)});
  }
  // Close-ups from the pavement (diagnostic camera at eye height): parked hatchback, SUV and saloon, and a drive.
  for(const [name,view] of [
    ['parked-suv-and-saloon',{x:4.6,z:-40,height:1.6,target:{x:2,y:.7,z:-60}}],
    ['parked-hatchback',{x:-1,z:84,height:1.6,target:{x:2.4,y:.6,z:92}}],
    ['houses-west-from-pavement',{x:-4.4,z:-30,height:1.6,target:{x:-12,y:3,z:-12}}]
  ] as const){
    await read(page,`overhead(${JSON.stringify(view)})`);
    await page.waitForTimeout(1200);
    await page.screenshot({path:testInfo.outputPath(`g9-${name}.png`)});
  }
  await read(page,'overhead(null)');
  await read(page,"selectView('forward')");
  await page.waitForTimeout(2500);
  const stats=await read(page,'sceneStats()');
  const perf=await read(page,'perf()');
  const sum=(f:(u:string)=>boolean)=>downloads.filter(d=>f(d.url)).reduce((n,d)=>n+d.bytes,0);
  const loaded={total:sum(()=>true),models:sum(u=>u.endsWith('.glb')),scripts:sum(u=>u.endsWith('.js')),glb:downloads.filter(d=>d.url.endsWith('.glb')).map(d=>`${d.url.split('/').pop()} ${d.bytes}`)};
  // No private (licensed) files are requested by the public configuration.
  expect(downloads.filter(d=>d.url.includes('/licensed/'))).toEqual([]);
  testInfo.annotations.push({type:'scene cost (software rendering in CI, not an iPhone)',description:JSON.stringify({...stats,perf,loaded})});
  console.log('SCENE',JSON.stringify({scenery,stats,perf,loaded}));
  expect(errors).toEqual([]);
});
