import {describe,expect,it} from 'vitest';
import {centreName,centreOf,cleanName,pointsOf,tally,weekStart} from '../src/board.js';
import {loadConfig} from '../src/config.js';
import {OutboxMailer,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore,type Drive} from '../src/store.js';

let n=0;
const mock=(owner:string,minutesAgo:number,passed:boolean,driving:number,p:Partial<Drive>={}):Drive=>({id:`d${++n}`,accountId:owner,owner,kind:'test',
  scenario:'area-hull-test-centre-mock-test',mode:'test',paidFrom:'sessions',status:'completed',
  startedAt:new Date(Date.now()-(minutesAgo+20)*60_000),endedAt:new Date(Date.now()-minutesAgo*60_000),
  result:{seconds:900,test:{passed,driving,serious:0,dangerous:0,finished:true}},...p});

describe('leaderboards: names, centres, weeks, points',()=>{
  it('names: letters, numbers and a few marks; no rude words or pretending to be us',()=>{
    expect(cleanName('  Ade   Bamo ')).toBe('Ade Bamo');
    expect(cleanName('RoundaboutRuler')).toBe('RoundaboutRuler');
    expect(cleanName("O'Neil School of Motoring",2,40)).toBe("O'Neil School of Motoring");
    for(const bad of ['x','<script>','DVSA Official','Driving Practice','sh1t driver','F U C K'.replace(/ /g,'')])expect(cleanName(bad)).toBeNull();
  });
  it('centres from scenario ids, and their names',()=>{
    expect(centreOf('area-hull-test-centre-mock-test')).toBe('area-hull-test-centre');
    expect(centreOf('goodmayes-mock-test')).toBe('goodmayes');
    expect(centreOf('chelmsford-route-1')).toBe('chelmsford');
    expect(centreName('area-hull-test-centre')).toBe('Hull');
    expect(centreName('goodmayes')).toBe('Goodmayes');
  });
  it('the week starts on Monday at midnight, UK time (summer and winter)',()=>{
    expect(weekStart(new Date('2026-11-19T15:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(weekStart(new Date('2026-11-16T00:30:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
    // British Summer Time: Monday 00:00 in London is 23:00 on Sunday UTC.
    expect(weekStart(new Date('2026-07-15T12:00:00Z')).toISOString()).toBe('2026-07-12T23:00:00.000Z');
    // The same Monday however many milliseconds into a second it is asked.
    expect(weekStart(new Date('2026-11-19T15:00:00.490Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });
  it('points: 10 for a finished test, 20 more for a pass, one off per driving fault; implausible results do not count',()=>{
    expect(pointsOf(mock('a',10,true,4))).toBe(26);
    expect(pointsOf(mock('a',10,false,14))).toBe(0);
    expect(pointsOf(mock('a',10,false,3))).toBe(7);
    expect(pointsOf(mock('a',10,true,4,{result:{seconds:60,test:{passed:true,driving:4,serious:0,dangerous:0,finished:true}}}))).toBeNull();
    expect(pointsOf(mock('a',10,true,0,{result:{seconds:900,test:{passed:true,driving:0,serious:2,dangerous:0,finished:true}}}))).toBeNull();
    expect(pointsOf(mock('a',10,true,4,{owner:undefined}))).toBeNull();
  });
  it('at most five tests a day count; ties go to whoever got there first',()=>{
    const drives=[...Array.from({length:7},(_,i)=>mock('busy',10+i,true,10)),mock('steady',30,true,0),mock('steady',29,true,0),mock('steady',28,true,0),mock('steady',27,true,0)];
    const t=tally(drives,'area-hull-test-centre');
    // busy: 5 × 20 = 100; steady: 4 × 30 = 120.
    expect(t.map(r=>[r.owner,r.points,r.tests])).toEqual([['steady',120,4],['busy',100,5]]);
  });
});

describe('leaderboards through the service',()=>{
  const setup=()=>{
    const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example'});
    const store=new MemoryStore(),service=new Service(config,store,new OutboxMailer(),fakeIdentities,fakeStripe(config));
    return {store,service};
  };
  const signUp=(s:Service,email:string,ref?:string)=>s.signIn('email',{sub:email,email,emailVerified:true},ref);
  it('a centre\'s board: opted-in names, others as Learner; the learner\'s own rank; settings checked',async()=>{
    const {store,service}=setup();
    const a=await signUp(service,'ade@example.com'),b=await signUp(service,'bo@example.com');
    expect(await service.setBoard(a.id,{show:true,name:'Ade',school:'Top Gear Driving School'})).toMatchObject({ok:true});
    expect(await service.setBoard(b.id,{show:true,name:'x'})).toEqual({error:'name'});
    for(const d of [mock(a.id,40,true,3),mock(b.id,30,true,1),mock(b.id,20,false,5)])await store.createDrive(d);
    const board=await service.board(a.id);
    expect(board).toMatchObject({centre:'area-hull-test-centre',name:'Hull',me:{rank:2,points:27,of:2}});
    expect(board.top.map(r=>[r.rank,r.name,r.school,r.points,r.me])).toEqual([[1,'Learner',null,34,false],[2,'Ade','Top Gear Driving School',27,true]]);
  });
  it('the admin gives last week\'s leader 7 unlimited days, and the friend who invited them too, once; a name can be hidden',async()=>{
    const {store,service}=setup();
    const inviter=await signUp(service,'inviter@example.com');
    const leader=await signUp(service,'leader@example.com',inviter.referralCode);
    await service.setBoard(leader.id,{show:true,name:'Speedy'});
    const lastWeek=new Date(weekStart(new Date()).getTime()-2*86400_000);
    await store.createDrive(mock(leader.id,0,true,2,{startedAt:new Date(lastWeek.getTime()-20*60_000),endedAt:lastWeek}));
    const l=await service.leaders();
    expect(l.centres).toHaveLength(1);
    expect(l.centres[0]).toMatchObject({name:'Hull',awarded:false,top:[{account:leader.id,name:'Speedy',points:28,referredBy:inviter.id}]});
    expect(await service.awardLeader('boss@example.com','area-hull-test-centre',l.week)).toEqual({ok:true,winner:leader.id,referrer:inviter.id});
    expect(await service.awardLeader('boss@example.com','area-hull-test-centre',l.week)).toEqual({error:'already'});
    for(const id of [leader.id,inviter.id])expect((Date.parse((await service.me(id))!.unlimitedUntil!)-Date.now())/86400_000).toBeGreaterThan(6.9);
    expect((await service.leaders()).centres[0]!.awarded).toBe(true);
    // This week's board shows last week's leader by their name, until hidden.
    expect((await service.board(leader.id,'area-hull-test-centre')).leader).toMatchObject({name:'Speedy'});
    await service.hideOnBoard(leader.id,true);
    expect((await service.board(leader.id,'area-hull-test-centre')).leader).toMatchObject({name:'Learner'});
  });
});
