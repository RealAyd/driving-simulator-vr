import {describe,expect,it} from 'vitest';
// (Node's fs, loaded at run time: the app's typecheck has no Node types.)
const {existsSync,readFileSync}=await (m=>import(/* @vite-ignore */ m))('node:fs') as {existsSync:(p:string)=>boolean;readFileSync:(p:string,e:'utf8')=>string};

const ORIGIN='https://vr.drivingpractice.live';
const sitemap=readFileSync('public/sitemap.xml','utf8');
const robots=readFileSync('public/robots.txt','utf8');
const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]!);
/** The file a listed address serves: the home page is the built sim/index.html, the rest are under public/. */
const fileOf=(loc:string)=>{const p=new URL(loc).pathname;return p==='/'?'sim/index.html':`public${p}`};

describe('sitemap and robots',()=>{
  it('lists only public, canonical pages that exist, each once',()=>{
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(locs.length).toBeGreaterThan(0);
    expect(new Set(locs).size).toBe(locs.length);
    for(const loc of locs){
      expect(loc.startsWith(`${ORIGIN}/`),loc).toBe(true);
      expect(loc,loc).not.toMatch(/[?#]/);
      const file=fileOf(loc);
      expect(existsSync(file),file).toBe(true);
      const html=readFileSync(file,'utf8');
      expect(html,file).not.toMatch(/noindex/);
      expect(html,file).toContain(`<link rel="canonical" href="${loc}">`);
    }
  });
  it('keeps private pages, the API and sign-in or checkout returns out',()=>{
    for(const loc of locs)expect(loc).not.toMatch(/admin|support|\/api\/|signin|checkout/);
    for(const rule of ['Disallow: /admin.html','Disallow: /support.html','Disallow: /api/','Disallow: /*?*signin=','Disallow: /*?*checkout='])
      expect(robots).toContain(rule);
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });
});
