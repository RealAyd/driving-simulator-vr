import {randomUUID} from 'node:crypto';
import {Binary,type Collection,type Db} from 'mongodb';
import type {Attachment,OutboxItem,SupportStore,Ticket,TicketMessage,TicketState} from './supportStore.js';

type Doc<T extends {id:string}>=Omit<T,'id'>&{_id:string};
const out=<T extends {id:string}>(d:Doc<T>|null):T|null=>{
  if(!d)return null;
  const {_id,...rest}=d;
  return {...rest,id:_id} as unknown as T;
};

/** Support in the hosted database: tickets, ticket_messages, attachments, notification_outbox, counters. */
export class MongoSupportStore implements SupportStore{
  constructor(private readonly db:Db){}

  private get tickets():Collection<Doc<Ticket>>{return this.db.collection('tickets')}
  private get msgs():Collection<Doc<TicketMessage>>{return this.db.collection('ticket_messages')}
  private get files():Collection<Omit<Doc<Attachment>,'data'>&{data:Binary}>{return this.db.collection('attachments')}
  private get outbox():Collection<Doc<OutboxItem>>{return this.db.collection('notification_outbox')}
  private get counters():Collection<{_id:string;n:number}>{return this.db.collection('counters')}

  async indexes(){
    await this.tickets.createIndex({accountId:1,updatedAt:-1},{sparse:true});
    await this.tickets.createIndex({state:1,updatedAt:-1});
    await this.tickets.createIndex({nextReminderAt:1},{sparse:true});
    await this.msgs.createIndex({ticketId:1,createdAt:1});
    // Uploads never put on a message are removed by the database.
    await this.files.createIndex({expiresAt:1},{expireAfterSeconds:0});
    await this.outbox.createIndex({status:1,nextAttemptAt:1});
    await this.outbox.createIndex({ticketId:1},{sparse:true});
  }

  async nextTicketNumber(){
    const r=await this.counters.findOneAndUpdate({_id:'ticket'},{$inc:{n:1}},{upsert:true,returnDocument:'after'});
    return r!.n;
  }
  async createTicket(t:Omit<Ticket,'id'>){
    const doc={...t,_id:randomUUID()} as Doc<Ticket>;
    await this.tickets.insertOne(doc);
    return out<Ticket>(doc)!;
  }
  async getTicket(id:string){return out<Ticket>(await this.tickets.findOne({_id:id}))}
  async updateTicket(id:string,set:Partial<Omit<Ticket,'id'>>,unset:Array<keyof Ticket>=[]){
    await this.tickets.updateOne({_id:id},{$set:set,...(unset.length?{$unset:Object.fromEntries(unset.map(k=>[k,'']))}:{})});
  }
  async listTickets(q:{accountId?:string;states?:readonly TicketState[];limit:number}){
    const filter={...(q.accountId?{accountId:q.accountId}:{}),...(q.states?{state:{$in:[...q.states]}}:{})};
    return (await this.tickets.find(filter).sort({updatedAt:-1}).limit(q.limit).toArray()).map(d=>out<Ticket>(d)!);
  }
  async countTickets(q:{states?:readonly TicketState[];overdue?:boolean}){
    return this.tickets.countDocuments({...(q.states?{state:{$in:[...q.states]}}:{}),...(q.overdue===undefined?{}:{overdue:q.overdue})});
  }
  async claimDueReminder(now:Date,next:Date){
    return out<Ticket>(await this.tickets.findOneAndUpdate({nextReminderAt:{$lte:now}},
      {$set:{nextReminderAt:next,overdue:true},$inc:{reminders:1}},{returnDocument:'after'}));
  }
  async addMessage(m:Omit<TicketMessage,'id'|'createdAt'>){
    const doc={...m,_id:randomUUID(),createdAt:new Date()} as Doc<TicketMessage>;
    await this.msgs.insertOne(doc);
    return out<TicketMessage>(doc)!;
  }
  async messages(ticketId:string){
    return (await this.msgs.find({ticketId}).sort({createdAt:1}).toArray()).map(d=>out<TicketMessage>(d)!);
  }
  async saveAttachment(a:Omit<Attachment,'id'|'createdAt'>){
    const id=randomUUID(),createdAt=new Date();
    await this.files.insertOne({...a,_id:id,createdAt,data:new Binary(a.data)});
    return {...a,id,createdAt};
  }
  async getAttachment(id:string){
    const d=await this.files.findOne({_id:id});
    if(!d||(d.expiresAt&&d.expiresAt<=new Date()))return null;
    const {_id,data,...rest}=d;
    return {...rest,id:_id,data:Buffer.from(data.buffer)} as Attachment;
  }
  async claimAttachment(id:string,claimHash:string,ticketId:string){
    const r=await this.files.updateOne({_id:id,claimHash,ticketId:{$exists:false},expiresAt:{$gt:new Date()}},{$set:{ticketId},$unset:{expiresAt:''}});
    return r.modifiedCount===1;
  }
  async enqueue(item:Omit<OutboxItem,'id'|'createdAt'|'status'|'attempts'|'nextAttemptAt'>,at=new Date()){
    const doc={...item,_id:randomUUID(),createdAt:new Date(),status:'pending',attempts:0,nextAttemptAt:at} as Doc<OutboxItem>;
    await this.outbox.insertOne(doc);
    return out<OutboxItem>(doc)!;
  }
  async claimOutbox(now:Date,leaseUntil:Date){
    return out<OutboxItem>(await this.outbox.findOneAndUpdate({status:'pending',nextAttemptAt:{$lte:now}},
      {$set:{nextAttemptAt:leaseUntil},$inc:{attempts:1}},{sort:{nextAttemptAt:1},returnDocument:'after'}));
  }
  async updateOutbox(id:string,set:Partial<Omit<OutboxItem,'id'>>){await this.outbox.updateOne({_id:id},{$set:set})}
  async listOutbox(q:{status?:OutboxItem['status'];ticketId?:string;limit:number}){
    const filter={...(q.status?{status:q.status}:{}),...(q.ticketId?{ticketId:q.ticketId}:{})};
    return (await this.outbox.find(filter).sort({createdAt:-1}).limit(q.limit).toArray()).map(d=>out<OutboxItem>(d)!);
  }
  async getOutbox(id:string){return out<OutboxItem>(await this.outbox.findOne({_id:id}))}
}
