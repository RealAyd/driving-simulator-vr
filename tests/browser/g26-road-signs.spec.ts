import {expect,test,type Page} from '@playwright/test';

// Road signs and markings: give way lines at side road mouths (and STOP lines where mapped), speed limit signs
// where the limit changes. Goodmayes: drawn at each mouth, nothing breaks.
test.use({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
const read=(page:Page,expr:string)=>page.evaluate(`window.__drivingPractice.${expr}`) as Promise<any>;

test('G26: give way lines at side road mouths and speed limit signs',async({page},testInfo)=>{
  test.setTimeout(240_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#screen-start')).toBeVisible({timeout:60_000});
  await page.click('[data-drive-mode=free]');
  await page.click('[data-exercise=goodmayes]');
  await expect(page.locator('#busy')).toBeHidden({timeout:90_000});
  await page.click('#start-practice');
  await expect.poll(()=>read(page,'session()'),{timeout:120_000}).toBe('running');
  const mouths=await read(page,'mouths()');
  expect(mouths.length).toBeGreaterThan(10);
  const m=mouths.find((m:{road:string})=>/Road/.test(m.road))??mouths[0];
  // 20 m back from the line (the mouth point is 12 m back), so the triangle shows over the bonnet.
  const r=m.headingDeg*Math.PI/180;
  await page.evaluate(([x,z,h])=>(window as any).__drivingPractice.placeCar(x,z,h),[m.x-Math.sin(r)*8,m.z+Math.cos(r)*8,m.headingDeg]);
  await page.waitForTimeout(1500);
  await page.screenshot({path:testInfo.outputPath('g26-give-way.png')});
  const signs=(await read(page,'signs()')).panels.filter((p:{kind:string})=>p.kind==='speed-limit');
  expect(signs.length).toBeGreaterThan(0);
  const s=signs[0];
  // 14 m in front of the sign, facing it.
  const x=s.x+s.normal.x*14,z=s.z+s.normal.z*14,h=Math.atan2(-s.normal.x,s.normal.z)*180/Math.PI;
  const road=await read(page,`roadAt(${x},${z})`);
  await page.evaluate(([x,z,h])=>(window as any).__drivingPractice.placeCar(x,z,h),[road.x+(x-road.x)*.3,road.z+(z-road.z)*.3,h]);
  await page.waitForTimeout(1500);
  await page.screenshot({path:testInfo.outputPath('g26-speed-limit.png')});
  expect(errors).toEqual([]);
});
