import {describe,expect,it} from 'vitest';
import {readdirSync,statSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import register from '../../content/assets/register.json';

/** All shipped model files under public/assets/models. */
function shipped(dir='public/assets/models'):string[]{
  return readdirSync(dir).flatMap(name=>{
    const path=join(dir,name);
    return statSync(path).isDirectory()?shipped(path):[path];
  });
}

describe('asset register',()=>{
  it('lists every shipped model, each from a pack whose licence allows public redistribution',()=>{
    const files=shipped();
    expect(files.length).toBeGreaterThan(0);
    for(const file of files){
      const entry=register.models.find(m=>m.file===file);
      expect(entry,`${file} is not in content/assets/register.json`).toBeTruthy();
      const pack=register.packs.find(p=>p.id===entry!.pack);
      expect(pack?.redistributionAllowed,`${file}: pack licence must allow redistribution`).toBe(true);
      expect(entry!.modifications.length).toBeGreaterThan(0);
    }
  });

  it('keeps shipped models small enough for a phone, with no original archives in the repository',()=>{
    for(const file of shipped()){
      expect(file).toMatch(/\.glb$/);
      expect(statSync(file).size,file).toBeLessThan(1_000_000);
    }
    const tracked=readFileSync('.gitignore','utf8');
    expect(tracked).toMatch(/assets-incoming/);
  });
});
