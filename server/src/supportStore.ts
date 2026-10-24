import {randomUUID} from 'node:crypto';

/**
 * What support keeps: tickets (DP-0001, …), their messages (customer, admin, internal notes and logged changes),
 * screenshots, and the notification outbox (every email and push, retried until sent or given up).
 */
export type TicketState='awaiting_admin'|'in_progress'|'awaiting_customer'|'resolved'|'reopened';
export type Priority='highest'|'high'|'normal'|'lower';

export interface Ticket{
  id:string;
  /** DP-0001: what the customer and the admin quote. */
  ref:string;
  product:'simulator';
  /** The signed-in account that sent it, or the account whose verified email it was sent from. */
  accountId?:string;
  email:string;
  phone?:string;
  category:string;
  priority:Priority;
  state:TicketState;
  /** The start of the description, for the queue. */
  summary:string;
  createdAt:Date;
  updatedAt:Date;
  /** When it started waiting for an admin (submitted, or the latest customer reply); absent while it is not. */
  awaitingSince?:Date;
  /** 5 minutes after awaitingSince; absent once acknowledged or answered. */
  responseDueAt?:Date;
  /** When the next overdue reminder goes (absent: none due). */
  nextReminderAt?:Date;
  overdue:boolean;
  reminders:number;
  lastCustomerMessageAt:Date;
  lastAdminMessageAt?:Date;
  customerReadAt?:Date;
  adminReadAt?:Date;
}

export interface TicketMessage{
  id:string;
  ticketId:string;
  /** 'note': internal, never shown to the customer. 'event': a logged change (priority, state), admin only. */
  from:'customer'|'admin'|'note'|'event';
  /** The admin's email, on an admin message, note or event. */
  by?:string;
  text:string;
  attachments:string[];
  createdAt:Date;
}

export interface Attachment{
  id:string;
  type:'image/jpeg'|'image/png'|'image/webp'|'image/heic';
  size:number;
  data:Buffer;
  /** Proves the uploader owns it, until it is put on a message (hash of the token returned on upload). */
  claimHash:string;
  ticketId?:string;
  createdAt:Date;
  /** An upload never used is deleted after this. */
  expiresAt?:Date;
}

export interface OutboxItem{
  id:string;
  kind:'email'|'push';
  /** Email address, or the push topic URL. */
  to:string;
  subject:string;
  text:string;
  html?:string;
  /** Push: urgent (phone alert) or not. */
  urgent?:boolean;
  ticketId?:string;
  status:'pending'|'sent'|'failed';
  attempts:number;
  nextAttemptAt:Date;
  lastError?:string;
  createdAt:Date;
  sentAt?:Date;
}

export const OPEN_STATES:readonly TicketState[]=['awaiting_admin','in_progress','awaiting_customer','reopened'];

export interface SupportStore{
  /** 1, 2, 3, … (atomic). */
  nextTicketNumber():Promise<number>;
  createTicket(t:Omit<Ticket,'id'>):Promise<Ticket>;
  getTicket(id:string):Promise<Ticket|null>;
  updateTicket(id:string,set:Partial<Omit<Ticket,'id'>>,unset?:Array<keyof Ticket>):Promise<void>;
  /** Newest activity first. */
  listTickets(q:{accountId?:string;states?:readonly TicketState[];limit:number}):Promise<Ticket[]>;
  countTickets(q:{states?:readonly TicketState[];overdue?:boolean}):Promise<number>;
  /**
   * One ticket whose reminder is due, moved on to `next` (so two workers never remind twice). Null when none.
   */
  claimDueReminder(now:Date,next:Date):Promise<Ticket|null>;
  addMessage(m:Omit<TicketMessage,'id'|'createdAt'>):Promise<TicketMessage>;
  messages(ticketId:string):Promise<TicketMessage[]>;
  saveAttachment(a:Omit<Attachment,'id'|'createdAt'>):Promise<Attachment>;
  getAttachment(id:string):Promise<Attachment|null>;
  /** Puts an upload on a ticket: only with its claim, and only once. */
  claimAttachment(id:string,claimHash:string,ticketId:string):Promise<boolean>;
  enqueue(item:Omit<OutboxItem,'id'|'createdAt'|'status'|'attempts'|'nextAttemptAt'>,at?:Date):Promise<OutboxItem>;
  /** One due item, leased until `leaseUntil` with its attempt counted (atomic). */
  claimOutbox(now:Date,leaseUntil:Date):Promise<OutboxItem|null>;
  updateOutbox(id:string,set:Partial<Omit<OutboxItem,'id'>>):Promise<void>;
  /** Newest first. */
  listOutbox(q:{status?:OutboxItem['status'];ticketId?:string;limit:number}):Promise<OutboxItem[]>;
  getOutbox(id:string):Promise<OutboxItem|null>;
}

const copy=<T extends object>(o:T):T=>({...o});

export class MemorySupportStore implements SupportStore{
  private n=0;
  private tickets=new Map<string,Ticket>();
  private msgs:TicketMessage[]=[];
  private files=new Map<string,Attachment>();
  private outbox:OutboxItem[]=[];

  async nextTicketNumber(){return ++this.n}
  async createTicket(t:Omit<Ticket,'id'>){const ticket={...t,id:randomUUID()};this.tickets.set(ticket.id,ticket);return copy(ticket)}
  async getTicket(id:string){const t=this.tickets.get(id);return t?copy(t):null}
  async updateTicket(id:string,set:Partial<Ticket>,unset:Array<keyof Ticket>=[]){
    const t=this.tickets.get(id);
    if(!t)return;
    Object.assign(t,set);
    for(const k of unset)delete t[k];
  }
  async listTickets(q:{accountId?:string;states?:readonly TicketState[];limit:number}){
    return [...this.tickets.values()].filter(t=>(!q.accountId||t.accountId===q.accountId)&&(!q.states||q.states.includes(t.state)))
      .sort((a,b)=>b.updatedAt.getTime()-a.updatedAt.getTime()).slice(0,q.limit).map(copy);
  }
  async countTickets(q:{states?:readonly TicketState[];overdue?:boolean}){
    return [...this.tickets.values()].filter(t=>(!q.states||q.states.includes(t.state))&&(q.overdue===undefined||t.overdue===q.overdue)).length;
  }
  async claimDueReminder(now:Date,next:Date){
    const t=[...this.tickets.values()].find(x=>x.nextReminderAt&&x.nextReminderAt<=now);
    if(!t)return null;
    Object.assign(t,{nextReminderAt:next,overdue:true,reminders:t.reminders+1});
    return copy(t);
  }
  async addMessage(m:Omit<TicketMessage,'id'|'createdAt'>){const msg={...m,id:randomUUID(),createdAt:new Date()};this.msgs.push(msg);return copy(msg)}
  async messages(ticketId:string){return this.msgs.filter(m=>m.ticketId===ticketId).map(copy)}
  async saveAttachment(a:Omit<Attachment,'id'|'createdAt'>){const f={...a,id:randomUUID(),createdAt:new Date()};this.files.set(f.id,f);return copy(f)}
  async getAttachment(id:string){const f=this.files.get(id);return f&&(!f.expiresAt||f.expiresAt>new Date())?copy(f):null}
  async claimAttachment(id:string,claimHash:string,ticketId:string){
    const f=this.files.get(id);
    if(!f||f.ticketId||f.claimHash!==claimHash||(f.expiresAt&&f.expiresAt<=new Date()))return false;
    f.ticketId=ticketId;delete f.expiresAt;
    return true;
  }
  async enqueue(item:Omit<OutboxItem,'id'|'createdAt'|'status'|'attempts'|'nextAttemptAt'>,at=new Date()){
    const o:OutboxItem={...item,id:randomUUID(),createdAt:new Date(),status:'pending',attempts:0,nextAttemptAt:at};
    this.outbox.push(o);
    return copy(o);
  }
  async claimOutbox(now:Date,leaseUntil:Date){
    const o=this.outbox.find(x=>x.status==='pending'&&x.nextAttemptAt<=now);
    if(!o)return null;
    o.nextAttemptAt=leaseUntil;o.attempts++;
    return copy(o);
  }
  async updateOutbox(id:string,set:Partial<OutboxItem>){const o=this.outbox.find(x=>x.id===id);if(o)Object.assign(o,set)}
  async listOutbox(q:{status?:OutboxItem['status'];ticketId?:string;limit:number}){
    return this.outbox.filter(o=>(!q.status||o.status===q.status)&&(!q.ticketId||o.ticketId===q.ticketId)).reverse().slice(0,q.limit).map(copy);
  }
  async getOutbox(id:string){const o=this.outbox.find(x=>x.id===id);return o?copy(o):null}
}
