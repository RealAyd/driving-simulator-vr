import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {describe as group,expect,it} from 'vitest';
import {describe,notReady,retrying} from '../src/startup.js';

group('starting before the database is reached',()=>{
  it('keeps trying the database, waiting longer each time, until it answers',async()=>{
    let tries=0;const waits:number[]=[];const failures:number[]=[];
    const store=await retrying(async()=>{if(++tries<7)throw new Error('connect ECONNREFUSED');return 'store'},
      attempt=>failures.push(attempt),async s=>{waits.push(s)});
    expect(store).toBe('store');
    expect(failures).toEqual([1,2,3,4,5,6]);
    expect(waits).toEqual([1,2,5,10,30,30]);
  });
  it('answers meanwhile: the health check up but not ready, the API "starting", to be tried again',async()=>{
    const server=createServer(notReady);
    await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
    const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try{
      const health=await fetch(`${base}/healthz`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ok:true,ready:false});
      const config=await fetch(`${base}/api/config`);
      expect(config.status).toBe(503);
      expect(config.headers.get('retry-after')).toBe('5');
      expect(await config.json()).toEqual({error:'starting'});
    }finally{server.close()}
  });
  it('never logs a connection string (it carries the database password)',()=>{
    expect(describe(new Error('bad auth for mongodb://user:secret@db.example:27017/dp'))).toBe('bad auth for mongodb://…');
    expect(describe(new Error('mongodb+srv://u:p@x/y unreachable'))).toBe('mongodb://… unreachable');
  });
});
