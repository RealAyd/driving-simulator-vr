import {readFileSync} from 'node:fs';

import type {Pot} from './store.js';

/**
 * A pack on sale. `sessions`: general sessions (any drive). `allowances`: drives of one kind only (the Starter Pass).
 * `starter`: once per account. `links`: its Stripe Payment Link in each mode (public addresses).
 */
export interface Pack{id:string;label:string;price:string;description?:string;sessions:number;allowances?:Partial<Record<Pot,number>>;starter?:boolean;links:{test:string;live:string};
  /** Unlimited drives of every kind: for `days` from payment, or `monthly`; `renews` (a Stripe subscription): each renewal extends it to
   * the end of the period paid for, with a day's grace for the renewal to arrive. */
  unlimited?:{days?:number;monthly?:boolean;renews?:boolean};
  /** The last day it is on sale (YYYY-MM-DD, UK): after it, not offered and not sold. */
  saleEnds?:string;
  /** No longer sold, kept so that payments and refunds of it are still recognised. */
  retired?:boolean;
  /** Shown on the pass: the offer ("-85% off") and a sticker above it ("Limited Time Discount"). */
  deal?:string;sticker?:string}

export interface Config{
  port:number;
  /** https://staging.drivingpractice.live: links in emails, the origin allowed to post. */
  appBaseUrl:string;
  sessionSecret:string;
  mongoUri:string|null;
  stripeSecretKey:string|null;
  stripeWebhookSecret:string|null;
  /** From the Stripe key: which of each pack's links is in use. */
  stripeMode:'test'|'live';
  resendApiKey:string|null;
  emailFrom:string;
  emailReplyTo:string;
  googleClientId:string|null;
  appleServicesId:string|null;
  adminEmails:string[];
  /** Every drive needs a signed-in account (no free try while signed out). On by default for staging.drivingpractice.live; SIGN_IN_FIRST=1 or 0 overrides. */
  signInFirst:boolean;
  /** Where new support requests and overdue reminders are emailed. */
  supportInbox:string;
  /** Optional phone alerts: an ntfy topic URL (e.g. https://ntfy.sh/<private topic>). */
  supportPushUrl:string|null;
  /** Overdue reminders repeat this often until the request is acknowledged. */
  supportReminderMinutes:number;
  packs:Pack[];
  /** Local development and tests only: in-memory store, emails kept in an outbox, a pretend checkout. */
  devFakes:boolean;
  /**
   * Practical Premium (Release 2): null, off (the default, and the only setting outside local fakes until the live
   * Practical client exists). PRACTICAL_PREMIUM=1 turns it on against the mocked Practical; PRACTICAL_PREMIUM_FIRST
   * lists scenario ids open first to verified Premium; PRACTICAL_CHALLENGES_GA=1 opens them to everyone.
   */
  practicalPremium:{premiumFirst:string[];generalAvailability:boolean;noticeSecret:string|null;
    /** The live Practical (practicalClient.ts); null: the local mock (local fakes only). */
    live:{base:string;clientId:string;premiumToken:string;demandToken:string|null}|null}|null;
}

export function loadConfig(env:NodeJS.ProcessEnv=process.env):Config{
  const devFakes=env['DP_DEV_FAKES']==='1';
  if(devFakes&&env['NODE_ENV']==='production')throw new Error('DP_DEV_FAKES cannot be used with NODE_ENV=production');
  const need=(name:string)=>{
    const v=env[name];
    if(!v&&!devFakes)throw new Error(`Missing ${name}`);
    return v||null;
  };
  const stripeSecretKey=need('STRIPE_SECRET_KEY');
  const sessionSecret=env['SESSION_SECRET']??(devFakes?'dev-only-secret-dev-only-secret-dev-only':'');
  if(sessionSecret.length<32)throw new Error('SESSION_SECRET must be at least 32 characters');
  const packsFile=env['PACKS_FILE']??new URL('../packs.json',import.meta.url).pathname;
  const premiumOn=env['PRACTICAL_PREMIUM']==='1';
  // Practical Premium against the live Practical: every credential set (kept in the Hostless app's settings, never in
  // code). Outside local fakes only on staging: production is refused here until a reviewed change allows it, after
  // the owner's approval (Release 2 waits on Release 1).
  // (PRACTICAL_NOTICE_SECRET is optional: change notices are left out for now, the owner's decision; unset, they are refused.)
  const liveNeeds=['PRACTICAL_API_BASE','PRACTICAL_CLIENT_ID','PRACTICAL_PREMIUM_TOKEN'];
  const liveMissing=liveNeeds.filter(k=>!env[k]);
  const live=premiumOn&&liveMissing.length<liveNeeds.length;
  if(premiumOn&&!devFakes){
    if(!/^https:\/\/staging\.drivingpractice\.live\/?$/.test(env['APP_BASE_URL']??''))throw new Error('PRACTICAL_PREMIUM is allowed on staging only until Release 2 is approved');
    if(liveMissing.length)throw new Error(`PRACTICAL_PREMIUM on staging needs ${liveMissing.join(', ')}`);
  }
  if(live&&liveMissing.length)throw new Error(`PRACTICAL_PREMIUM with the live Practical needs ${liveMissing.join(', ')}`);
  return {
    port:Number(env['PORT']??8787),
    appBaseUrl:(env['APP_BASE_URL']??'http://localhost:4173').replace(/\/$/,''),
    sessionSecret,
    mongoUri:need('MONGODB_URI'),
    stripeSecretKey,
    stripeWebhookSecret:need('STRIPE_WEBHOOK_SECRET'),
    stripeMode:stripeSecretKey?.includes('_live_')?'live':'test',
    resendApiKey:need('RESEND_API_KEY'),
    emailFrom:env['EMAIL_FROM']??'Driving Practice <support@drivingpractice.live>',
    emailReplyTo:env['EMAIL_REPLY_TO']??'support.drivingpractice@gmail.com',
    googleClientId:env['GOOGLE_CLIENT_ID']||null,
    appleServicesId:env['APPLE_SERVICES_ID']||null,
    supportInbox:env['SUPPORT_INBOX']??env['EMAIL_REPLY_TO']??'support.drivingpractice@gmail.com',
    supportPushUrl:env['SUPPORT_PUSH_URL']||null,
    supportReminderMinutes:Math.max(5,Number(env['SUPPORT_REMINDER_MINUTES']??30)||30),
    signInFirst:env['SIGN_IN_FIRST']?env['SIGN_IN_FIRST']==='1':/^https:\/\/staging\.drivingpractice\.live\/?$/.test(env['APP_BASE_URL']??''),
    adminEmails:(env['ADMIN_EMAILS']??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
    // (Local fakes: each pack gets a placeholder link so a pretend checkout can name it.)
    packs:(JSON.parse(readFileSync(packsFile,'utf8')) as {packs:Pack[]}).packs
      .map(p=>devFakes&&!p.links.test?{...p,links:{...p.links,test:`https://buy.stripe.com/test_dev_${p.id}`}}:p),
    devFakes,
    practicalPremium:premiumOn?{premiumFirst:(env['PRACTICAL_PREMIUM_FIRST']??'').split(',').map(s=>s.trim()).filter(Boolean),
      generalAvailability:env['PRACTICAL_CHALLENGES_GA']==='1',noticeSecret:env['PRACTICAL_NOTICE_SECRET']||null,
      live:live?{base:env['PRACTICAL_API_BASE']!,clientId:env['PRACTICAL_CLIENT_ID']!,premiumToken:env['PRACTICAL_PREMIUM_TOKEN']!,
        demandToken:env['PRACTICAL_DEMAND_TOKEN']||null}:null}:null
  };
}
