import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import type {Config} from './config.js';
import {EMAIL,normaliseEmail,type Mailer} from './service.js';
import type {Store} from './store.js';
import {OPEN_STATES,type Attachment,type OutboxItem,type Priority,type Ticket,type TicketState} from './supportStore.js';

/** Phone alerts (ntfy): a title, the text, urgent or not, and the page a tap opens. */
export interface Pusher{push(url:string,m:{title:string;text:string;urgent:boolean;click:string}):Promise<void>}

/** What a customer can ask about, and how urgent each is to begin with (an admin can change it). */
export const CATEGORIES:ReadonlyArray<{id:string;label:string;priority:Priority}>=[
  {id:'refund',label:'Refund request',priority:'highest'},
  {id:'paid-no-access',label:'I paid but cannot get in',priority:'high'},
  {id:'missing-sessions',label:'Sessions or drives missing',priority:'high'},
  {id:'blocked',label:'A payment or drive failed and I am stuck',priority:'high'},
  {id:'bug',label:'Something is not working',priority:'normal'},
  {id:'scenario',label:'A question about a lesson, test or marking',priority:'normal'},
  {id:'complaint',label:'Complaint',priority:'normal'},
  {id:'question',label:'General question',priority:'normal'},
  {id:'suggestion',label:'Suggestion or improvement',priority:'lower'}
];
const PRIORITIES:readonly Priority[]=['highest','high','normal','lower'];
const PRIORITY_RANK:Record<Priority,number>={highest:0,high:1,normal:2,lower:3};
const PRIORITY_LABEL:Record<Priority,string>={highest:'Highest',high:'High',normal:'Normal',lower:'Lower'};
export const STATE_LABEL:Record<TicketState,string>={awaiting_admin:'Awaiting admin',in_progress:'In progress',awaiting_customer:'Awaiting customer',resolved:'Resolved',reopened:'Reopened'};

/** An admin must acknowledge or answer within this long; then reminders repeat (config) until they do. */
export const RESPONSE_MINUTES=5;
/** A failed email or push is tried again after these many minutes; then it is marked failed (and shown in the hub). */
const RETRY_MINUTES=[1,5,15,60];
export const MAX_SCREENSHOTS=5,MAX_SCREENSHOT_BYTES=10*1024*1024;
const DESCRIPTION_MIN=10,DESCRIPTION_MAX=4000,MESSAGE_MAX=4000;
const MINUTE=60_000;

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const paragraphs=(s:string)=>esc(s).split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
const sha256=(s:string)=>createHash('sha256').update(s).digest('hex');

/** The image type from the file's own bytes (whatever it claims to be); null if it is not one we accept. */
export function imageType(b:Buffer):Attachment['type']|null{
  if(b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'image/jpeg';
  if(b.length>=8&&b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return 'image/png';
  if(b.length>=12&&b.toString('latin1',0,4)==='RIFF'&&b.toString('latin1',8,12)==='WEBP')return 'image/webp';
  if(b.length>=12&&b.toString('latin1',4,8)==='ftyp'&&['heic','heix','hevc','heim','heis','mif1','msf1'].includes(b.toString('latin1',8,12)))return 'image/heic';
  return null;
}

/** A phone number in international form (+447700900123); a UK number starting 0 becomes +44. Null if it is not one. */
export function phoneNumber(raw:string):string|null{
  let p=raw.replace(/[\s().-]/g,'');
  if(p.startsWith('00'))p=`+${p.slice(2)}`;
  if(/^0\d{9,10}$/.test(p))p=`+44${p.slice(1)}`;
  return /^\+[1-9]\d{6,14}$/.test(p)?p:null;
}

/** Who is looking at a ticket: its customer (signed in, or with the link from their email) or an admin. */
export type Viewer={accountId?:string|null;token?:string|null};
type Upload={id:string;claim:string};

/**
 * Support requests: the customer's form and thread, the admin queue, the 5-minute response timer with repeating
 * reminders, and the outbox that delivers every email and push (retried, and shown in the hub if it fails).
 */
export class Support{
  /** Called after something is queued (the server runs the worker straight away; tests run it by hand). */
  onQueued:()=>void=()=>{};

  constructor(private readonly config:Config,private readonly store:Store,private readonly mail:Mailer,private readonly pusher:Pusher|null){}

  private get db(){return this.store.support}

  categories(){return CATEGORIES.map(c=>({id:c.id,label:c.label}))}

  // ---- The customer's link: a signature of the ticket id (nothing to store; works in every email) ----

  token(ticketId:string){return createHmac('sha256',this.config.sessionSecret).update(`ticket:${ticketId}`).digest('base64url')}
  private tokenOk(ticketId:string,token:string|null|undefined){
    if(!token)return false;
    const want=this.token(ticketId);
    return token.length===want.length&&timingSafeEqual(Buffer.from(token),Buffer.from(want));
  }
  private customerLink(t:Ticket){return `${this.config.appBaseUrl}/support.html?ticket=${t.id}&t=${this.token(t.id)}`}
  private adminLink(t:Ticket){return `${this.config.appBaseUrl}/admin.html#support/${t.id}`}
  private canView(t:Ticket,v:Viewer){return (!!v.accountId&&t.accountId===v.accountId)||this.tokenOk(t.id,v.token)}

  // ---- Screenshots ----

  async upload(data:Buffer,ip:string):Promise<Upload|{error:'type'|'size'|'slow-down'}>{
    if(data.length>MAX_SCREENSHOT_BYTES)return {error:'size'};
    const type=imageType(data);
    if(!type)return {error:'type'};
    if(!await this.store.rateHit(`upload:${ip}`,3600_000,40))return {error:'slow-down'};
    const claim=randomBytes(24).toString('base64url');
    const a=await this.db.saveAttachment({type,size:data.length,data,claimHash:sha256(claim),expiresAt:new Date(Date.now()+24*3600_000)});
    return {id:a.id,claim};
  }

  /** The uploads named on a message that belong to whoever sent it (others are left out). */
  private async claim(uploads:unknown,ticketId:string):Promise<string[]>{
    if(!Array.isArray(uploads))return [];
    const ids:string[]=[];
    for(const u of uploads.slice(0,MAX_SCREENSHOTS)){
      const {id,claim}=(u??{}) as Partial<Upload>;
      if(typeof id==='string'&&typeof claim==='string'&&await this.db.claimAttachment(id,sha256(claim),ticketId))ids.push(id);
    }
    return ids;
  }

  /** A screenshot, for the ticket's customer or an admin. */
  async attachment(id:string,v:Viewer&{admin?:boolean}):Promise<Attachment|null>{
    const a=await this.db.getAttachment(id);
    if(!a?.ticketId)return null;
    if(v.admin)return a;
    const t=await this.db.getTicket(a.ticketId);
    return t&&this.canView(t,v)?a:null;
  }

  // ---- The customer's side ----

  async create(input:Record<string,unknown>,ctx:{accountId:string|null;ip:string},now=new Date()):Promise<{ref:string;id:string}|{error:string}>{
    // (A form field people never see: filled in, it is a bot. It is told nothing.)
    if(input['website'])return {error:'invalid'};
    const email=normaliseEmail(String(input['email']??''));
    if(!EMAIL.test(email)||email.length>254)return {error:'email'};
    const rawPhone=String(input['phone']??'').trim();
    const phone=rawPhone?phoneNumber(rawPhone):null;
    if(rawPhone&&!phone)return {error:'phone'};
    const category=CATEGORIES.find(c=>c.id===input['category']);
    if(!category)return {error:'category'};
    const description=String(input['description']??'').trim();
    if(description.length<DESCRIPTION_MIN||description.length>DESCRIPTION_MAX)return {error:'description'};
    if(!await this.store.rateHit(`support-ip:${ctx.ip}`,3600_000,10)||!await this.store.rateHit(`support-email:${email}`,3600_000,5))return {error:'slow-down'};
    // Linked to an account only when signed in: someone signed out could type anyone's email (replies and the link
    // still go to that address, so only its owner reads them).
    const accountId=ctx.accountId;
    const n=await this.db.nextTicketNumber();
    const ticket=await this.db.createTicket({ref:`DP-${String(n).padStart(4,'0')}`,product:'simulator',...(accountId?{accountId}:{}),email,...(phone?{phone}:{}),
      category:category.id,priority:category.priority,state:'awaiting_admin',summary:description.replace(/\s+/g,' ').slice(0,140),createdAt:now,updatedAt:now,
      awaitingSince:now,responseDueAt:new Date(now.getTime()+RESPONSE_MINUTES*MINUTE),nextReminderAt:new Date(now.getTime()+RESPONSE_MINUTES*MINUTE),
      overdue:false,reminders:0,lastCustomerMessageAt:now,customerReadAt:now});
    const attachments=await this.claim(input['attachments'],ticket.id);
    await this.db.addMessage({ticketId:ticket.id,from:'customer',text:description,attachments});
    // The admin alerts first, then the customer's copy (each its own outbox item: a failed email never loses the request).
    await this.alertAdmin(ticket,`New ${PRIORITY_LABEL[ticket.priority].toLowerCase()} priority request`,description,attachments.length);
    await this.db.enqueue({kind:'email',to:email,ticketId:ticket.id,subject:`We have your request ${ticket.ref}`,
      text:`Thank you: we have your request ${ticket.ref} (${category.label}).\n\nWe will reply by email. To add details or screenshots, or to see our replies:\n${this.customerLink(ticket)}\n\nWhat you sent:\n${description}\n\nDriving Practice support`,
      html:`<p>Thank you: we have your request <b>${ticket.ref}</b> (${esc(category.label)}).</p><p>We will reply by email. To add details or screenshots, or to see our replies, <a href="${this.customerLink(ticket)}">open your request</a>.</p><p style="color:#666">What you sent:</p>${paragraphs(description)}<p>Driving Practice support</p>`});
    this.onQueued();
    return {ref:ticket.ref,id:ticket.id};
  }

  /** A signed-in customer's requests, newest activity first, with whether there is a reply they have not seen. */
  async mine(accountId:string){
    return (await this.db.listTickets({accountId,limit:50})).map(t=>({id:t.id,ref:t.ref,category:t.category,summary:t.summary,state:t.state,stateLabel:customerState(t.state),
      updatedAt:t.updatedAt.toISOString(),unread:!!t.lastAdminMessageAt&&(!t.customerReadAt||t.lastAdminMessageAt>t.customerReadAt)}));
  }

  /** The customer's view of one request (no internal notes or logged changes); it counts as read. */
  async customerView(id:string,v:Viewer,now=new Date()){
    const t=await this.db.getTicket(id);
    if(!t||!this.canView(t,v))return null;
    await this.db.updateTicket(id,{customerReadAt:now});
    const msgs=(await this.db.messages(id)).filter(m=>m.from==='customer'||m.from==='admin');
    return {ticket:{id:t.id,ref:t.ref,category:t.category,categoryLabel:CATEGORIES.find(c=>c.id===t.category)?.label??t.category,state:t.state,stateLabel:customerState(t.state),
      email:t.email,createdAt:t.createdAt.toISOString()},
      messages:msgs.map(m=>({id:m.id,from:m.from,text:m.text,attachments:m.attachments,createdAt:m.createdAt.toISOString()}))};
  }

  async customerReply(id:string,v:Viewer,input:Record<string,unknown>,now=new Date()):Promise<{ok:true}|{error:string}>{
    const t=await this.db.getTicket(id);
    if(!t||!this.canView(t,v))return {error:'not-found'};
    const text=String(input['text']??'').trim();
    if(!text||text.length>MESSAGE_MAX)return {error:'text'};
    if(!await this.store.rateHit(`support-reply:${id}`,3600_000,20))return {error:'slow-down'};
    const attachments=await this.claim(input['attachments'],id);
    await this.db.addMessage({ticketId:id,from:'customer',text,attachments});
    // Waiting for an admin again; a timer already running keeps its time (more replies do not push it back).
    const waiting=!!t.responseDueAt;
    const due=waiting?t.responseDueAt!:new Date(now.getTime()+RESPONSE_MINUTES*MINUTE);
    await this.db.updateTicket(id,{state:t.state==='resolved'?'reopened':'awaiting_admin',updatedAt:now,lastCustomerMessageAt:now,customerReadAt:now,
      awaitingSince:waiting&&t.awaitingSince?t.awaitingSince:now,responseDueAt:due,...(waiting?{}:{nextReminderAt:due,overdue:false})});
    const updated=(await this.db.getTicket(id))!;
    await this.alertAdmin(updated,t.state==='resolved'?'Reopened by the customer':'The customer replied',text,attachments.length);
    this.onQueued();
    return {ok:true};
  }

  // ---- The admin's side ----

  /**
   * The queue: highest priority first; within a priority, overdue first; then the longest waiting for an admin;
   * then the rest by latest activity.
   */
  async queue(filter:string,now=new Date()){
    const states:readonly TicketState[]|undefined=filter==='all'?undefined:filter==='open'?OPEN_STATES:
      filter==='awaiting_admin'?['awaiting_admin','reopened']:(['in_progress','awaiting_customer','resolved'] as TicketState[]).includes(filter as TicketState)?[filter as TicketState]:OPEN_STATES;
    const list=await this.db.listTickets({...(states?{states}:{}),limit:300});
    const overdue=(t:Ticket)=>t.overdue||(!!t.responseDueAt&&t.responseDueAt<=now);
    list.sort((a,b)=>PRIORITY_RANK[a.priority]-PRIORITY_RANK[b.priority]||Number(overdue(b))-Number(overdue(a))
      ||(a.awaitingSince?.getTime()??Infinity)-(b.awaitingSince?.getTime()??Infinity)||b.updatedAt.getTime()-a.updatedAt.getTime());
    return {tickets:list.map(t=>({id:t.id,ref:t.ref,email:t.email,category:t.category,categoryLabel:CATEGORIES.find(c=>c.id===t.category)?.label??t.category,
      priority:t.priority,state:t.state,stateLabel:STATE_LABEL[t.state],summary:t.summary,overdue:overdue(t),
      awaitingSince:t.awaitingSince?.toISOString()??null,responseDueAt:t.responseDueAt?.toISOString()??null,updatedAt:t.updatedAt.toISOString(),
      unread:!t.adminReadAt||t.lastCustomerMessageAt>t.adminReadAt}))};
  }

  /** One request with everything (notes, logged changes, its emails); opening it marks it read but does not stop the timer. */
  async adminView(id:string,now=new Date()){
    const t=await this.db.getTicket(id);
    if(!t)return null;
    await this.db.updateTicket(id,{adminReadAt:now});
    // (Signed out: the account with that email, if any, as a hint; it was not proved to be them.)
    const [msgs,outbox,account]=await Promise.all([this.db.messages(id),this.db.listOutbox({ticketId:id,limit:50}),
      t.accountId?this.store.findAccount({id:t.accountId}):this.store.findAccount({email:t.email})]);
    return {
      ticket:{id:t.id,ref:t.ref,email:t.email,phone:t.phone??null,signedIn:!!t.accountId,accountId:account?.id??null,accountEmail:account?.email??null,category:t.category,
        categoryLabel:CATEGORIES.find(c=>c.id===t.category)?.label??t.category,priority:t.priority,state:t.state,stateLabel:STATE_LABEL[t.state],
        createdAt:t.createdAt.toISOString(),awaitingSince:t.awaitingSince?.toISOString()??null,responseDueAt:t.responseDueAt?.toISOString()??null,
        overdue:t.overdue||(!!t.responseDueAt&&t.responseDueAt<=now),reminders:t.reminders},
      messages:msgs.map(m=>({id:m.id,from:m.from,by:m.by??null,text:m.text,attachments:m.attachments,createdAt:m.createdAt.toISOString()})),
      outbox:outbox.map(outboxOut)
    };
  }

  /** "I am on it": stops the timer and reminders. */
  async acknowledge(id:string,by:string,now=new Date()):Promise<boolean>{
    const t=await this.db.getTicket(id);
    if(!t)return false;
    await this.stopTimer(t,now,t.state==='awaiting_admin'||t.state==='reopened'?'in_progress':t.state);
    await this.db.addMessage({ticketId:id,from:'event',by,text:'Acknowledged',attachments:[]});
    return true;
  }

  private async stopTimer(t:Ticket,now:Date,state:TicketState){
    await this.db.updateTicket(t.id,{state,overdue:false,updatedAt:now},['responseDueAt','nextReminderAt','awaitingSince']);
  }

  /** A reply to the customer (stops the timer, and emails them), or an internal note (changes nothing else). */
  async adminMessage(id:string,by:string,input:Record<string,unknown>,now=new Date()):Promise<{ok:true}|{error:string}>{
    const t=await this.db.getTicket(id);
    if(!t)return {error:'not-found'};
    const text=String(input['text']??'').trim();
    if(!text||text.length>MESSAGE_MAX)return {error:'text'};
    const attachments=await this.claim(input['attachments'],id);
    if(input['internal']===true){
      await this.db.addMessage({ticketId:id,from:'note',by,text,attachments});
      await this.db.updateTicket(id,{updatedAt:now});
      return {ok:true};
    }
    await this.db.addMessage({ticketId:id,from:'admin',by,text,attachments});
    await this.stopTimer(t,now,'awaiting_customer');
    await this.db.updateTicket(id,{lastAdminMessageAt:now});
    await this.db.enqueue({kind:'email',to:t.email,ticketId:id,subject:`Re: your request ${t.ref}`,
      text:`${text}\n\n${attachments.length?`(${attachments.length} screenshot${attachments.length===1?'':'s'} attached to your request.)\n\n`:''}To reply, or to see the whole conversation:\n${this.customerLink(t)}\n\nDriving Practice support`,
      html:`${paragraphs(text)}${attachments.length?`<p style="color:#666">${attachments.length} screenshot${attachments.length===1?'':'s'} attached to your request.</p>`:''}<p><a href="${this.customerLink(t)}">Reply or see the whole conversation</a></p><p>Driving Practice support</p>`});
    this.onQueued();
    return {ok:true};
  }

  async setState(id:string,by:string,state:unknown,now=new Date()):Promise<boolean>{
    const t=await this.db.getTicket(id);
    if(!t||!(['in_progress','awaiting_customer','resolved'] as unknown[]).includes(state)||t.state===state)return !!t&&t.state===state;
    const s=state as TicketState;
    await this.stopTimer(t,now,s);
    await this.db.addMessage({ticketId:id,from:'event',by,text:`State: ${STATE_LABEL[t.state]} → ${STATE_LABEL[s]}`,attachments:[]});
    if(s==='resolved'){
      await this.db.enqueue({kind:'email',to:t.email,ticketId:id,subject:`Your request ${t.ref} is resolved`,
        text:`We have marked your request ${t.ref} as resolved. If you need anything more, reply here and it opens again:\n${this.customerLink(t)}\n\nDriving Practice support`,
        html:`<p>We have marked your request <b>${t.ref}</b> as resolved. If you need anything more, <a href="${this.customerLink(t)}">reply here</a> and it opens again.</p><p>Driving Practice support</p>`});
      this.onQueued();
    }
    return true;
  }

  async setPriority(id:string,by:string,priority:unknown,now=new Date()):Promise<boolean>{
    const t=await this.db.getTicket(id);
    if(!t||!PRIORITIES.includes(priority as Priority))return false;
    if(t.priority===priority)return true;
    await this.db.updateTicket(id,{priority:priority as Priority,updatedAt:now});
    await this.db.addMessage({ticketId:id,from:'event',by,text:`Priority: ${PRIORITY_LABEL[t.priority]} → ${PRIORITY_LABEL[priority as Priority]}`,attachments:[]});
    return true;
  }

  async counts(){
    const [open,waiting,overdue]=await Promise.all([this.db.countTickets({states:OPEN_STATES}),this.db.countTickets({states:['awaiting_admin','reopened']}),
      this.db.countTickets({states:OPEN_STATES,overdue:true})]);
    const failed=(await this.db.listOutbox({status:'failed',limit:100})).length;
    return {open,awaitingAdmin:waiting,overdue,failedNotifications:failed};
  }

  async failedNotifications(){return {items:(await this.db.listOutbox({status:'failed',limit:100})).map(outboxOut)}}

  /** "Retry now" on a failed email or push. */
  async retry(id:string,now=new Date()):Promise<boolean>{
    const o=await this.db.getOutbox(id);
    if(!o||o.status==='sent')return false;
    await this.db.updateOutbox(id,{status:'pending',attempts:0,nextAttemptAt:now});
    this.onQueued();
    return true;
  }

  // ---- Alerts and delivery ----

  private async alertAdmin(t:Ticket,headline:string,text:string,screenshots:number){
    const category=CATEGORIES.find(c=>c.id===t.category)?.label??t.category;
    const lines=[`${headline}: ${t.ref}`,`Priority: ${PRIORITY_LABEL[t.priority]}`,`Category: ${category}`,`From: ${t.email}${t.phone?` · ${t.phone}`:''}${t.accountId?'':' (not signed in)'}`,
      ...(screenshots?[`Screenshots: ${screenshots}`]:[]),'',text,'',`Answer or acknowledge within ${RESPONSE_MINUTES} minutes: ${this.adminLink(t)}`];
    await this.db.enqueue({kind:'email',to:this.config.supportInbox,ticketId:t.id,subject:`[${PRIORITY_LABEL[t.priority]}] ${t.ref} ${headline}: ${t.summary.slice(0,60)}`,
      text:lines.join('\n'),html:`<p><b>${esc(headline)}: ${t.ref}</b></p><p>Priority: ${PRIORITY_LABEL[t.priority]}<br>Category: ${esc(category)}<br>From: ${esc(t.email)}${t.phone?` · ${esc(t.phone)}`:''}${t.accountId?'':' (not signed in)'}${screenshots?`<br>Screenshots: ${screenshots}`:''}</p>${paragraphs(text)}<p><a href="${this.adminLink(t)}">Open in the admin hub</a> (answer or acknowledge within ${RESPONSE_MINUTES} minutes)</p>`});
    if(this.pusher&&this.config.supportPushUrl)await this.db.enqueue({kind:'push',to:this.config.supportPushUrl,ticketId:t.id,urgent:t.priority==='highest'||t.priority==='high',
      subject:`${t.ref} ${headline}`,text:`${PRIORITY_LABEL[t.priority]} · ${category}: ${t.summary.slice(0,120)}`});
  }

  /**
   * The worker: reminders for requests not acknowledged in time, then due emails and pushes. Safe with several
   * servers (each item is claimed atomically). Returns what it did, for the log and tests.
   */
  async tick(now=new Date()):Promise<{reminded:number;sent:number;failed:number}>{
    let reminded=0,sent=0,failed=0;
    for(let i=0;i<20;i++){
      const t=await this.db.claimDueReminder(now,new Date(now.getTime()+this.config.supportReminderMinutes*MINUTE));
      if(!t)break;
      reminded++;
      const waited=Math.round((now.getTime()-(t.awaitingSince??t.createdAt).getTime())/MINUTE);
      await this.alertAdmin(t,`Overdue: waiting ${waited} minute${waited===1?'':'s'}`,t.summary,0);
    }
    for(let i=0;i<50;i++){
      const o=await this.db.claimOutbox(now,new Date(now.getTime()+2*MINUTE));
      if(!o)break;
      try{
        if(o.kind==='email')await this.mail.send({to:o.to,subject:o.subject,text:o.text,html:o.html??`<p>${esc(o.text)}</p>`});
        else if(this.pusher)await this.pusher.push(o.to,{title:o.subject,text:o.text,urgent:!!o.urgent,click:o.ticketId?`${this.config.appBaseUrl}/admin.html#support/${o.ticketId}`:`${this.config.appBaseUrl}/admin.html`});
        else throw new Error('No push service');
        await this.db.updateOutbox(o.id,{status:'sent',sentAt:new Date()});
        sent++;
      }catch(e){
        const error=(e instanceof Error?e.message:String(e)).slice(0,300);
        const giveUp=o.attempts>RETRY_MINUTES.length;
        await this.db.updateOutbox(o.id,giveUp?{status:'failed',lastError:error}:{lastError:error,nextAttemptAt:new Date(now.getTime()+RETRY_MINUTES[o.attempts-1]!*MINUTE)});
        if(giveUp)failed++;
        console.error(`Support ${o.kind} ${giveUp?'failed':'will be retried'}: ${error}`);
      }
    }
    return {reminded,sent,failed};
  }
}

/** The customer sees fewer states: whether it is with us, with them, or done. */
function customerState(s:TicketState){return s==='awaiting_customer'?'Replied: over to you':s==='resolved'?'Resolved':'With our team'}
const outboxOut=(o:OutboxItem)=>({id:o.id,kind:o.kind,to:o.kind==='push'?'phone alert':o.to,subject:o.subject,status:o.status,attempts:o.attempts,
  lastError:o.lastError??null,createdAt:o.createdAt.toISOString(),sentAt:o.sentAt?.toISOString()??null,ticketId:o.ticketId??null});
