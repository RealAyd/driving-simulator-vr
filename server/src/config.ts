import {readFileSync} from 'node:fs';

import type {Pot} from './store.js';

/**
 * A pack on sale. `sessions`: general sessions (any drive). `allowances`: drives of one kind only (the Starter Pass).
 * `starter`: once per account. `links`: its Stripe Payment Link in each mode (public addresses).
 */
export interface Pack{id:string;label:string;price:string;description?:string;sessions:number;allowances?:Partial<Record<Pot,number>>;starter?:boolean;links:{test:string;live:string}}

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
  packs:Pack[];
  /** Local development and tests only: in-memory store, emails kept in an outbox, a pretend checkout. */
  devFakes:boolean;
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
    adminEmails:(env['ADMIN_EMAILS']??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
    // (Local fakes: each pack gets a placeholder link so a pretend checkout can name it.)
    packs:(JSON.parse(readFileSync(packsFile,'utf8')) as {packs:Pack[]}).packs
      .map(p=>devFakes&&!p.links.test?{...p,links:{...p.links,test:`https://buy.stripe.com/test_dev_${p.id}`}}:p),
    devFakes
  };
}
