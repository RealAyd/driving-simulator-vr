import Stripe from 'stripe';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {Config} from './config.js';
import type {Identity,IdentityVerifier,Mailer,StripeApi,StripeEvent} from './service.js';

/** Email through Resend's API. */
export function resendMailer(config:Config):Mailer{
  return {async send(m){
    const res=await fetch('https://api.resend.com/emails',{method:'POST',
      headers:{Authorization:`Bearer ${config.resendApiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:config.emailFrom,to:[m.to],reply_to:config.emailReplyTo,subject:m.subject,text:m.text,html:m.html})});
    // (The provider's message is kept for the log; the key never is.)
    if(!res.ok)throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0,300)}`);
  }};
}

/** Google and Apple ID tokens, checked against their published keys (signature, issuer, audience, expiry). */
export function identityVerifier(config:Config):IdentityVerifier{
  const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  const appleKeys=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  const verified=(v:unknown)=>v===true||v==='true';
  return {
    async google(credential){
      if(!config.googleClientId)throw new Error('Google sign-in is not set up');
      const {payload}=await jwtVerify(credential,googleKeys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.googleClientId});
      return {sub:String(payload.sub),email:typeof payload['email']==='string'?payload['email']:null,emailVerified:verified(payload['email_verified'])} satisfies Identity;
    },
    async apple(idToken){
      if(!config.appleServicesId)throw new Error('Apple sign-in is not set up');
      const {payload}=await jwtVerify(idToken,appleKeys,{issuer:'https://appleid.apple.com',audience:config.appleServicesId});
      return {sub:String(payload.sub),email:typeof payload['email']==='string'?payload['email']:null,emailVerified:verified(payload['email_verified'])} satisfies Identity;
    }
  };
}

export function stripeApi(config:Config):StripeApi{
  const stripe=new Stripe(config.stripeSecretKey!);
  const links=new Map<string,{url:string;metadata:Record<string,string>}>();
  return {
    constructEvent:(raw,signature)=>stripe.webhooks.constructEvent(raw,signature,config.stripeWebhookSecret!) as unknown as StripeEvent,
    async paymentLink(id){
      const known=links.get(id);
      if(known)return known;
      const link=await stripe.paymentLinks.retrieve(id).catch(()=>null);
      if(!link)return null;
      const v={url:link.url,metadata:{...link.metadata}};
      links.set(id,v);
      return v;
    },
    async refund(paymentIntent,reason){
      // (Idempotent at Stripe too: one refund per payment, however often this is asked.)
      const r=await stripe.refunds.create({payment_intent:paymentIntent,reason:'duplicate',metadata:{why:reason}},{idempotencyKey:`dp-refund-${paymentIntent}`});
      return r.status==='succeeded'||r.status==='pending';
    }
  };
}

// ---- Local development and tests (DP_DEV_FAKES=1): nothing leaves the machine ----

export class OutboxMailer implements Mailer{
  readonly sent:Array<{to:string;subject:string;text:string;html:string}>=[];
  async send(m:{to:string;subject:string;text:string;html:string}){this.sent.push(m)}
}

/** Fake identities: the "token" is `sub|email`. */
export const fakeIdentities:IdentityVerifier={
  async google(t){const [sub='',email='']=t.split('|');return {sub,email,emailVerified:true}},
  async apple(t){const [sub='',email='']=t.split('|');return {sub,email:email||null,emailVerified:true}}
};

/** Refunds the fake Stripe was asked for (tests read them). */
export const refunds:string[]=[];
/** Fake Stripe: events are trusted JSON (signature "dev"); a payment link's id is its pack's id. */
export function fakeStripe(config:Config):StripeApi{
  return {
    constructEvent(raw,signature){
      if(signature!=='dev')throw new Error('bad signature');
      return JSON.parse(raw.toString('utf8')) as StripeEvent;
    },
    async paymentLink(id){
      const pack=config.packs.find(p=>p.id===id);
      return pack?{url:pack.links[config.stripeMode],metadata:{}}:null;
    },
    async refund(paymentIntent){refunds.push(paymentIntent);return !paymentIntent.includes('refuse')}
  };
}
