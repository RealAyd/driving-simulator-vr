import {createServer,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {loadConfig} from '../src/config.js';
import {handler} from '../src/http.js';
import {OutboxMailer,OutboxPusher,fakeIdentities,fakeStripe} from '../src/providers.js';
import {Service} from '../src/service.js';
import {MemoryStore} from '../src/store.js';
import {imageType,phoneNumber} from '../src/support.js';

const MIN=60_000;
const PNG=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.alloc(200,7)]);
const config=loadConfig({DP_DEV_FAKES:'1',APP_BASE_URL:'https://staging.example',ADMIN_EMAILS:'boss@example.com',SUPPORT_INBOX:'inbox@example.com',SUPPORT_PUSH_URL:'https://ntfy.example/secret-topic'});
const mail=new OutboxMailer(),pusher=new OutboxPusher();
const service=new Service(config,new MemoryStore(),mail,fakeIdentities,fakeStripe(config),pusher);
const support=service.support;
let server:Server,base='';
beforeAll(async()=>{
  server=createServer(handler(service,mail));
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(()=>server.close());

type Reply={status:number;json:any;headers:Headers;body:Buffer};
/** A browser on the app's site; signed in as `email` if given. */
async function browser(email?:string){
  let cookie='';
  const call=async(path:string,body?:unknown,headers:Record<string,string>={}):Promise<Reply>=>{
    const raw=Buffer.isBuffer(body);
    const res=await fetch(base+path,{method:body===undefined?'GET':'POST',
      headers:{...(body===undefined?{}:{'Content-Type':raw?'image/png':'application/json',Origin:'https://staging.example'}),...(cookie?{Cookie:cookie}:{}),...headers},
      ...(body===undefined?{}:{body:raw?body:JSON.stringify(body)})});
    const set=res.headers.get('set-cookie');
    if(set)cookie=set.split(';')[0]!;
    const buf=Buffer.from(await res.arrayBuffer());
    return {status:res.status,headers:res.headers,body:buf,json:res.headers.get('content-type')?.includes('json')?JSON.parse(buf.toString()):null};
  };
  if(email)await call('/api/dev/signin',{email});
  return call;
}
const form=(over:Record<string,unknown>={})=>({email:'pat@example.com',phone:'07700 900123',category:'bug',description:'The mirror view stays black after a call.',...over});
const linkOf=(text:string)=>{const u=new URL(/(https:\/\/staging\.example\/support\.html\?\S+)/.exec(text)![1]!);return {id:u.searchParams.get('ticket')!,t:u.searchParams.get('t')!}};

describe('support requests',()=>{
  it('checks the form: email, phone, category, description; a bot filling the hidden field gets nothing',async()=>{
    const b=await browser();
    for(const [over,error] of [[{email:'nope'},'email'],[{phone:'12'},'phone'],[{category:'x'},'category'],[{description:'short'},'description'],[{website:'http://spam'},'invalid']] as const){
      const r=await b('/api/support/tickets',form(over));
      expect(r.status).toBe(400);
      expect(r.json.error).toBe(error);
    }
    expect(phoneNumber('07700 900123')).toBe('+447700900123');
    expect(phoneNumber('+1 (415) 555-0100')).toBe('+14155550100');
    expect(phoneNumber('0044 7700 900123')).toBe('+447700900123');
    expect(phoneNumber('hello')).toBeNull();
    expect(imageType(PNG)).toBe('image/png');
    expect(imageType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });

  it('a signed-out request: a DP reference, the admin alerted (email and phone), the customer emailed a link to follow it',async()=>{
    const b=await browser();
    const before=mail.sent.length;
    const r=await b('/api/support/tickets',form({description:'Refund please <script>alert(1)</script>',category:'refund',email:'Pat.Out@Example.com'}));
    expect(r.status).toBe(200);
    expect(r.json.ref).toMatch(/^DP-\d{4}$/);
    // Signed out, nothing more is given back: the link goes only to the email address.
    expect(r.json.token).toBeUndefined();
    expect(await support.tick()).toMatchObject({sent:3});
    const sent=mail.sent.slice(before);
    const toAdmin=sent.find(m=>m.to==='inbox@example.com')!;
    expect(toAdmin.subject).toContain(`[Highest] ${r.json.ref} New highest priority request`);
    expect(toAdmin.html).toContain('&lt;script&gt;');
    expect(toAdmin.html).not.toContain('<script>');
    expect(toAdmin.text).toContain('+447700900123');
    expect(toAdmin.text).toContain(`https://staging.example/admin.html#support/${r.json.id}`);
    const toCustomer=sent.find(m=>m.to==='pat.out@example.com')!;
    expect(toCustomer.subject).toBe(`We have your request ${r.json.ref}`);
    expect(pusher.sent.at(-1)).toMatchObject({url:'https://ntfy.example/secret-topic',urgent:true});
    // The link opens it signed out; without it (or with another request's link) nothing is shown.
    const link=linkOf(toCustomer.text);
    expect(link.id).toBe(r.json.id);
    const view=await b(`/api/support/tickets/${link.id}?t=${link.t}`);
    expect(view.json.ticket).toMatchObject({ref:r.json.ref,stateLabel:'With our team'});
    expect((await b(`/api/support/tickets/${link.id}`)).status).toBe(404);
    expect((await b(`/api/support/tickets/${link.id}?t=${support.token('another-ticket')}`)).status).toBe(404);
    expect((await (await browser('someone@example.com'))(`/api/support/tickets/${link.id}`)).status).toBe(404);
  });

  it('screenshots: checked by their bytes, size limited, kept for the request, shown only to its customer and admins',async()=>{
    const b=await browser();
    expect((await b('/api/support/attachments',Buffer.from('GIF89a not accepted'))).status).toBe(415);
    expect((await b('/api/support/attachments',Buffer.alloc(10*1024*1024+1,1))).status).toBe(413);
    expect((await b('/api/support/attachments',PNG,{Origin:'https://evil.example'})).status).toBe(403);
    const up=(await b('/api/support/attachments',PNG)).json;
    const stolen=(await b('/api/support/attachments',PNG)).json;
    const r=(await b('/api/support/tickets',form({email:'shots@example.com',attachments:[up,{id:stolen.id,claim:'wrong'}]}))).json;
    await support.tick();
    const link=linkOf(mail.sent.find(m=>m.to==='shots@example.com')!.text);
    const view=(await b(`/api/support/tickets/${link.id}?t=${link.t}`)).json;
    expect(view.messages[0].attachments).toEqual([up.id]);
    const img=await b(`/api/support/attachments/${up.id}?t=${link.t}`);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/png');
    expect(img.headers.get('content-security-policy')).toContain('sandbox');
    expect(img.body.equals(PNG)).toBe(true);
    expect((await b(`/api/support/attachments/${up.id}`)).status).toBe(404);
    expect((await (await browser('boss@example.com'))(`/api/support/attachments/${up.id}`)).status).toBe(200);
    // An upload cannot be put on a second request.
    const again=(await b('/api/support/tickets',form({email:'shots2@example.com',attachments:[up]}))).json;
    expect((await support.customerView(again.id,{token:support.token(again.id)}))!.messages[0]!.attachments).toEqual([]);
    expect(r.ref).toBeTruthy();
  });

  it('the 5-minute timer: a reminder when it passes, again every 30 minutes, until acknowledged; opening it does not count',async()=>{
    const t0=new Date();
    const {id}=(await support.create(form({email:'timer@example.com'}),{accountId:null,ip:'t'},t0)) as {id:string};
    await support.tick(t0);
    const reminders=()=>mail.sent.filter(m=>m.to==='inbox@example.com'&&m.subject.includes('Overdue')&&m.text.includes(id)).length;
    await support.tick(new Date(t0.getTime()+4*MIN));
    expect(reminders()).toBe(0);
    await support.adminView(id,new Date(t0.getTime()+4.5*MIN));
    await support.tick(new Date(t0.getTime()+5*MIN));
    expect(reminders()).toBe(1);
    expect((await support.adminView(id))!.ticket.overdue).toBe(true);
    await support.tick(new Date(t0.getTime()+20*MIN));
    expect(reminders()).toBe(1);
    await support.tick(new Date(t0.getTime()+35*MIN));
    expect(reminders()).toBe(2);
    // An internal note does not stop it; Acknowledge does.
    await support.adminMessage(id,'boss@example.com',{text:'Looking at logs',internal:true});
    await support.tick(new Date(t0.getTime()+65*MIN));
    expect(reminders()).toBe(3);
    await support.acknowledge(id,'boss@example.com');
    await support.tick(new Date(t0.getTime()+200*MIN));
    expect(reminders()).toBe(3);
    const v=(await support.adminView(id))!;
    expect(v.ticket).toMatchObject({state:'in_progress',overdue:false,responseDueAt:null});
    expect(v.messages.map(m=>m.from)).toEqual(['customer','note','event']);
  });

  it('two-way: the admin replies (customer emailed; notes never shown); the customer replies (waiting again); resolved, then reopened by a reply',async()=>{
    const pat=await browser('pat-in@example.com');
    const r=(await pat('/api/support/tickets',form({email:'pat-in@example.com',category:'question'}))).json;
    await support.adminMessage(r.id,'boss@example.com',{text:'Internal: check the ledger',internal:true});
    await support.adminMessage(r.id,'boss@example.com',{text:'Hello Pat,\n\nTry restarting the drive.'});
    await support.tick();
    const email=mail.sent.filter(m=>m.to==='pat-in@example.com').at(-1)!;
    expect(email.subject).toBe(`Re: your request ${r.ref}`);
    expect(email.text).toContain('Try restarting the drive.');
    expect(email.text).not.toContain('Internal');
    // Signed in: listed with an unread reply; opening it reads it.
    let list=(await pat('/api/support/tickets')).json.tickets;
    expect(list[0]).toMatchObject({ref:r.ref,unread:true,stateLabel:'Replied: over to you'});
    const view=(await pat(`/api/support/tickets/${r.id}`)).json;
    expect(view.messages.map((m:{from:string})=>m.from)).toEqual(['customer','admin']);
    expect(JSON.stringify(view)).not.toContain('Internal');
    list=(await pat('/api/support/tickets')).json.tickets;
    expect(list[0].unread).toBe(false);
    // The customer answers: waiting for an admin again, with a new timer; the admin sees it unread.
    expect((await pat(`/api/support/tickets/${r.id}/messages`,{text:'Still black.'})).status).toBe(200);
    let a=(await support.adminView(r.id))!;
    expect(a.ticket.state).toBe('awaiting_admin');
    expect(a.ticket.responseDueAt).not.toBeNull();
    await support.setState(r.id,'boss@example.com','resolved');
    await support.tick();
    expect(mail.sent.filter(m=>m.to==='pat-in@example.com').at(-1)!.subject).toBe(`Your request ${r.ref} is resolved`);
    await pat(`/api/support/tickets/${r.id}/messages`,{text:'It happened again'});
    a=(await support.adminView(r.id))!;
    expect(a.ticket.state).toBe('reopened');
    expect(a.messages.filter(m=>m.from==='event').map(m=>m.text)).toEqual(['State: Awaiting admin → Resolved']);
    expect(a.ticket.signedIn).toBe(true);
  });

  it('the queue: highest priority first; within a priority, overdue first, then the longest waiting',async()=>{
    const t0=new Date(Date.now()-60*MIN);
    const make=async(category:string,email:string,at:Date)=>((await support.create(form({category,email}),{accountId:null,ip:`q-${email}`},at)) as {id:string}).id;
    const oldNormal=await make('question','q1@example.com',t0);
    const newHigh=await make('paid-no-access','q2@example.com',new Date());
    const newNormal=await make('bug','q3@example.com',new Date());
    const lower=await make('suggestion','q4@example.com',t0);
    await support.setPriority(newNormal,'boss@example.com','lower');
    const ids=(await support.queue('open')).tickets.map(t=>t.id).filter(id=>[oldNormal,newHigh,newNormal,lower].includes(id));
    expect(ids).toEqual([newHigh,oldNormal,lower,newNormal]);
    expect((await support.adminView(newNormal))!.messages.at(-1)!.text).toBe('Priority: Normal → Lower');
  });

  it('the outbox: a failing email is retried after 1, 5, 15 and 60 minutes, then shown as failed; Retry now sends it',async()=>{
    let down=true;
    const flaky={sent:[] as string[],async send(m:{to:string}){if(down)throw new Error('provider unavailable');this.sent.push(m.to)}};
    const s=new Service(config,new MemoryStore(),flaky,fakeIdentities,fakeStripe(config),null).support;
    await s.create(form({email:'retry@example.com'}),{accountId:null,ip:'r'});
    const t0=new Date();
    expect((await s.tick(t0)).sent).toBe(0);
    for(const m of [0.5,1,6,21,81]){
      const r=await s.tick(new Date(t0.getTime()+m*MIN));
      if(m===0.5)expect(r.sent+r.failed).toBe(0);
    }
    // (The overdue reminders queued meanwhile are still being tried.)
    const failed=(await s.failedNotifications()).items;
    expect(failed.map(f=>f.to).sort()).toEqual(['inbox@example.com','retry@example.com']);
    expect(failed.find(f=>f.to==='inbox@example.com')!.subject).toContain('New normal priority request');
    expect(failed[0]).toMatchObject({status:'failed',attempts:5,lastError:'provider unavailable'});
    down=false;
    for(const f of failed)expect(await s.retry(f.id)).toBe(true);
    expect((await s.tick()).sent).toBe(2);
    expect(flaky.sent.sort()).toEqual(['inbox@example.com','retry@example.com']);
    expect((await s.counts()).failedNotifications).toBe(0);
  });

  it('admin API: learners are refused; the admin sees the queue, answers, and the overview counts support',async()=>{
    const learner=await browser('learner-s@example.com');
    expect((await learner('/api/admin/support')).status).toBe(403);
    const boss=await browser('boss@example.com');
    const q=(await boss('/api/admin/support?state=open')).json.tickets;
    expect(q.length).toBeGreaterThan(0);
    const id=q[0].id;
    expect((await boss(`/api/admin/support/${id}/acknowledge`,{})).json.ok).toBe(true);
    expect((await boss(`/api/admin/support/${id}/priority`,{priority:'urgent'})).status).toBe(400);
    expect((await boss(`/api/admin/support/${id}/messages`,{text:'On it',internal:false})).status).toBe(200);
    expect((await boss(`/api/admin/support/${id}`)).json.ticket.state).toBe('awaiting_customer');
    expect((await boss(`/api/admin/support/${id}/messages`,{text:'x'},{Origin:'https://evil.example'})).status).toBe(403);
    const o=(await boss('/api/admin/overview')).json;
    expect(o.support).toMatchObject({open:expect.any(Number),overdue:expect.any(Number)});
  });
});
