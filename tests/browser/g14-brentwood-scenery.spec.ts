import {expect,test,type Page} from '@playwright/test';

// The dressed Brentwood mini-roundabouts (map buildings with facades and shopfronts, trees, lights,
// the memorial), as the public preview builds it. Every view from the driver's seat, review views,
// and what the scene costs.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
test.setTimeout(240_000);

const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;
const VIEWS=[['forward','forward'],['interior','interior-mirror'],['left-door','left-mirror'],['right-door','right-mirror'],['left-shoulder','left-shoulder'],['right-shoulder','right-shoulder']] as const;

test('G14: Brentwood scenery is dressed from every view with cleared assets; the cost is measured',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  const downloads:Array<{url:string;bytes:number}>=[];
  page.on('response',r=>{void r.body().then(b=>downloads.push({url:new URL(r.url()).pathname,bytes:b.length})).catch(()=>{})});
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-exercise=brentwood]');
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()')).toBe('running');
  await read(page,'freezeTime(true)');
  expect(await read(page,'location()')).toBe('brentwood-paired-mini-roundabouts');
  await expect(page.locator('#hud-credit')).toContainText('© OpenStreetMap contributors');
  const scenery=await read(page,'scenery()');
  expect(scenery.houses).toBeGreaterThanOrEqual(30);
  expect(await read(page,'sceneryModels()')).toEqual([]);

  for(const [view,name] of VIEWS){
    await read(page,`selectView('${view}')`);
    await page.waitForTimeout(1500);
    await page.screenshot({path:testInfo.outputPath(`g14-${name}.png`)});
  }
  for(const [name,view] of [
    ['overhead-area',{x:5,z:0,height:95}],
    ['overhead-junctions',{x:12,z:0,height:38}],
    ['approach-rb1-eye-height',{x:-6,z:15.5,height:1.2,target:{x:8,y:1,z:8}}],
    ['link-to-rb2-eye-height',{x:9.5,z:3,height:1.2,target:{x:17,y:1,z:-9}}],
    ['memorial-and-shenfield-road',{x:24,z:-14,height:1.6,target:{x:38.6,y:3,z:-7.8}}],
    ['high-street-shopfronts',{x:-24,z:24,height:1.6,target:{x:-8,y:3,z:30}}]
  ] as const){
    await read(page,`overhead(${JSON.stringify(view)})`);
    await page.waitForTimeout(1200);
    await page.screenshot({path:testInfo.outputPath(`g14-${name}.png`)});
  }
  await read(page,'overhead(null)');
  await read(page,"selectView('forward')");
  await page.waitForTimeout(2500);
  await read(page,'resetPerf()');
  await page.waitForTimeout(4000);
  const stats=await read(page,'sceneStats()');
  const perf=await read(page,'perf()');
  const sum=(f:(u:string)=>boolean)=>downloads.filter(d=>f(d.url)).reduce((n,d)=>n+d.bytes,0);
  const loaded={total:sum(()=>true),models:sum(u=>u.endsWith('.glb'))};
  expect(downloads.filter(d=>d.url.includes('/licensed/'))).toEqual([]);
  testInfo.annotations.push({type:'scene cost (software rendering, not an iPhone)',description:JSON.stringify({stats,perf,loaded})});
  console.log('SCENE',JSON.stringify({scenery,stats,perf,loaded}));
  expect(errors).toEqual([]);
});
