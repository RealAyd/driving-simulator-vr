import {describe,expect,it} from 'vitest';
import register from '../../content/assets/register.json';
import gitignore from '../../.gitignore?raw';
import {PROP_ASSETS} from '../../src/assets/models';

// Every shipped model file, as data URLs (so sizes can be checked without Node APIs).
const shipped=import.meta.glob('/public/assets/models/**/*',{query:'?inline',import:'default',eager:true}) as Record<string,string>;
const files=Object.keys(shipped).map(path=>path.slice(1));
const bytes=(dataUrl:string)=>Math.floor(dataUrl.slice(dataUrl.indexOf(',')+1).length*3/4);

describe('asset register',()=>{
  it('lists every shipped model, each from a pack whose licence allows public redistribution',()=>{
    expect(files.length).toBeGreaterThan(0);
    for(const file of files){
      const entry=register.models.find(m=>m.file===file&&m.storage==='public');
      expect(entry,`${file} is not in content/assets/register.json`).toBeTruthy();
      const pack=register.packs.find(p=>p.id===entry!.pack);
      expect(pack?.redistributionAllowed,`${file}: pack licence must allow redistribution`).toBe(true);
      expect(entry!.modifications.length).toBeGreaterThan(0);
    }
  });

  it('keeps shipped models small enough for a phone, with original archives kept out of the repository',()=>{
    for(const [path,data] of Object.entries(shipped)){
      expect(path).toMatch(/\.glb$/);
      expect(bytes(data),path).toBeLessThan(1_000_000);
    }
    expect(gitignore).toMatch(/assets-incoming/);
    expect(gitignore).toMatch(/\*\.zip/);
  });

  it('keeps models from packs that may not be (or are not known to be) publicly redistributed out of the repository',()=>{
    for(const [id,asset] of Object.entries(PROP_ASSETS)){
      const entry=register.models.find(m=>m.id===id);
      expect(entry,`${id} is not in content/assets/register.json`).toBeTruthy();
      expect(entry!.file).toBe(`public/${asset.url}`);
      expect(entry!.storage).toBe(asset.storage);
      const pack=register.packs.find(p=>p.id===entry!.pack)!;
      if(pack.redistributionAllowed!==true){
        expect(asset.storage,`${id}: licence does not allow public redistribution`).toBe('private');
        expect(asset.url).toMatch(/^assets\/licensed\//);
      }
    }
    expect(gitignore).toMatch(/^public\/assets\/licensed\/$/m);
  });
});
