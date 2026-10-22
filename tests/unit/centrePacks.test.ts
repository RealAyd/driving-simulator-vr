import {describe,expect,it} from 'vitest';
import {centreFile,packCentre} from '../../src/generator/area';
import centres from '../../content/centres/test-centres.json';

describe('test centres built in advance',()=>{
  it('every centre has its own pack file',()=>{
    const list=(Array.isArray(centres)?centres:(centres as {centres:Array<{name:string}>}).centres) as Array<{name:string}>;
    const files=list.map(c=>centreFile(c.name));
    expect(new Set(files).size).toBe(files.length);
    expect(centreFile('Chelmsford (Hanbury Road)')).toBe('chelmsford-hanbury-road.json.gz');
  });
  it('a pack keeps whole numbers and rounds the rest to the centimetre',()=>{
    const pack=JSON.parse(packCentre('X',350,'2026-10-22','s',{a:1.23456,b:[7,-0.004],c:'t'}));
    expect(pack).toEqual({version:1,centre:'X',half:350,date:'2026-10-22',summary:'s',location:{a:1.23,b:[7,0],c:'t'}});
  });
});
