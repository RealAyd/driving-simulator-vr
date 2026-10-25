/**
 * Paid access: where the app is hosted with its accounts service (access.json says `gate: true`), each drive,
 * lesson or mock test started uses one session. This signs the driver in (Google, Apple, or a code by email),
 * sells sessions through Stripe Payment Links and shows the balance and invite link. Without access.json (the
 * preview copies) nothing is gated.
 */
type Pot='lesson'|'test'|'free';
type Pack={id:string;label:string;price:string;description:string;sessions:number;allowances:Partial<Record<Pot,number>>;starter:boolean;onSale:boolean};
type Config={gate:boolean;googleClientId:string|null;appleServicesId:string|null;appleRedirect:string;packs:Pack[];devCheckout:boolean};
/** The device's free try (no sign-up): what is left of one lesson, one mock test and one free drive. */
type Trial=Record<Pot,number>;
type Me=({signedIn:false}|{signedIn:true;id:string;email:string|null;balance:number;allowances:Record<Pot,number>;starterBought:boolean;referralCode:string;invited:number;rewarded:number;admin?:boolean;
  history:Array<{type:string;sessions:number;amountPence:number;reason:string;at:string}>})&{trial?:Trial};
/** A drive the server has started (its session used). */
export type PaidDrive={id:string};

const byId=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const store={
  get:(k:string)=>{try{return localStorage.getItem(k)}catch{return null}},
  set:(k:string,v:string|null)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{/* kept for this visit only */}}
};
const REF_KEY='dp.referral.v1',BUY_KEY='dp.buying.v1';
/** What a drive is, from its scenario (as the server decides it). */
const modeOf=(scenario:string):Pot=>scenario.endsWith('-mock-test')?'test':scenario.endsWith('-lesson')?'lesson':'free';
const POT_NAME:Record<Pot,string>={lesson:'lesson',test:'mock test',free:'free drive'};
/** A free try's drive by kind, as said to the learner. */
const TRY_NAME:Record<Pot,string>={lesson:'free lesson',test:'free mock test',free:'free drive'};
/** Everything the account can start: general sessions plus Starter allowances. */
const total=(me:Me)=>me.signedIn?me.balance+me.allowances.lesson+me.allowances.test+me.allowances.free:0;

async function api<T>(path:string,body?:unknown):Promise<{status:number;data:T|null}>{
  try{
    const res=await fetch(`/api/${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',
      headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:res.status,data:await res.json().catch(()=>null) as T|null};
  }catch{return {status:0,data:null}}
}
const loadScript=(src:string)=>new Promise<void>((ok,fail)=>{
  if(document.querySelector(`script[src="${src}"]`))return ok();
  const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>ok();s.onerror=()=>fail(new Error(src));document.head.append(s);
});

/** The paid app's own addresses. */
const PAID_HOSTS=new Set(['vr.drivingpractice.live','staging.drivingpractice.live']);

export class Access{
  /** Whether drives need sessions here. */
  gate=false;
  private config:Config|null=null;
  me:Me={signedIn:false};
  /** Called whenever the balance or sign-in changes (the home screen shows it). */
  onChange:()=>void=()=>{};

  async init():Promise<void>{
    const local=await fetch('./access.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null) as {gate?:boolean}|null;
    // Gated where the file says so, always on the paid addresses (blocking the file does not open them), and, if the
    // file cannot be read, wherever the accounts service answers. A preview copy ships {"gate":false} (the hosted
    // deploy writes {"gate":true} over it).
    let gated=!!local?.gate||PAID_HOSTS.has(location.hostname)||/\.hostless\.app$/.test(location.hostname);
    if(!gated&&!local){const cfg=await api<Config>('config');gated=cfg.status===200&&cfg.data?.gate===true}
    if(!gated)return;
    this.gate=true;
    // A referral link (?ref=CODE) is kept until sign-in; the return from sign-in or checkout says what happened.
    const params=new URLSearchParams(location.search);
    const ref=params.get('ref');
    if(ref&&/^[A-Za-z0-9]{4,20}$/.test(ref))store.set(REF_KEY,ref.toUpperCase());
    const signin=params.get('signin'),checkout=params.get('checkout');
    if(ref||signin||checkout){for(const k of ['ref','signin','checkout'])params.delete(k);history.replaceState(null,'',`${location.pathname}${params.size?`?${params}`:''}${location.hash}`)}
    this.wire();
    const cfg=await api<Config>('config');
    this.config=cfg.data;
    await this.refresh();
    byId('account-chip').hidden=false;
    if(signin==='expired'||signin==='failed')this.open(signin==='expired'?'That sign-in link has expired or was used already: ask for a new code.':'Sign-in did not finish. Please try again.');
    else if(signin==='done')this.open();
    if(checkout)void this.awaitPayment();
  }

  private get ref(){return store.get(REF_KEY)}

  async refresh():Promise<void>{
    const r=await api<Me>('me');
    if(r.data)this.me=r.data;
    if(this.me.signedIn)store.set(REF_KEY,null);
    this.render();
    this.onChange();
  }

  /** Whether this device's free drive is still there to take (someone new: suggest it first). */
  freeDriveOpen():boolean{
    if((this.me.trial?.free??0)<1)return false;
    return !this.me.signedIn||(!this.me.admin&&total(this.me)===0);
  }

  /** A line for the exercise screen under Start, for the drive about to start. */
  note(scenario:string|null):string{
    if(!this.gate)return '';
    const pot=scenario?modeOf(scenario):null;
    const free=!!pot&&(this.me.trial?.[pot]??0)>0;
    if(!this.me.signedIn)return free?`Your ${TRY_NAME[pot]}: no sign-up needed`
      :pot?`You have used your ${TRY_NAME[pot]}: sign in to carry on.`:'Sign in to start: each drive uses one session.';
    if(this.me.admin)return 'Admin: drives do not use sessions';
    if(pot&&this.me.allowances[pot]>0)return `Uses your Starter Pass ${POT_NAME[pot]}`;
    const n=this.me.balance;
    if(n>0)return `Uses 1 session · you have ${n}`;
    return free?`Uses your ${TRY_NAME[pot]}`:`No ${pot?`${POT_NAME[pot]} or `:''}sessions left: buy more to start.`;
  }

  /**
   * Before a drive: false if it cannot start (the account screen opens to sign in or buy); otherwise the drive whose
   * session was used (null where nothing is gated).
   */
  async begin(kind:string,scenario:string):Promise<PaidDrive|null|false>{
    if(!this.gate)return null;
    const pot=modeOf(scenario);
    const free=(this.me.trial?.[pot]??0)>0;
    // Signed out: the device's free try (one of each kind), then an account.
    if(!this.me.signedIn&&!free){this.open(`You have used your ${TRY_NAME[pot]}. Sign in to carry on: each drive, lesson or mock test then uses one session.`);return false}
    // Admins drive without sessions (the server checks it too); otherwise sessions, then the free try.
    if(this.me.signedIn&&!this.me.admin&&this.me.balance<1&&this.me.allowances[pot]<1&&!free){this.open(`You have no ${POT_NAME[pot]}s or sessions left. Buy more to start.`);return false}
    const r=await api<{driveId:string;balance:number;error?:string}>('drives',{kind,scenario});
    if(r.status===200&&r.data){void this.refresh();return {id:r.data.driveId}}
    if(r.status===401){await this.refresh();this.open('Please sign in again.');return false}
    if(r.status===402){await this.refresh();this.open(this.me.signedIn?'You have no sessions left. Buy more to start.':`You have used your ${TRY_NAME[pot]}. Sign in to carry on.`);return false}
    if(r.status===429){this.open('Free tries from this connection are used up for today. Sign in to carry on.');return false}
    this.open('Driving Practice could not be reached. Check your connection and try again.');
    return false;
  }

  /** How the drive went: one that failed to load gives its session back. */
  report(drive:PaidDrive|null,status:'loaded'|'failed'|'completed'):void{
    if(!drive)return;
    void api(`drives/${drive.id}/${status}`,{}).then(()=>{if(status==='failed')void this.refresh()});
  }

  // ---- The account screen ----

  open(reason?:string):void{
    byId('screen-account').hidden=false;
    byId('account-reason').textContent=reason??'';byId('account-reason').hidden=!reason;
    byId('account-note').textContent=this.me.signedIn&&reason?reason:'';
    this.render();
    if(!this.me.signedIn)void this.providers();
  }
  close():void{byId('screen-account').hidden=true}

  private wire(){
    byId('account-chip').addEventListener('click',()=>this.open());
    byId('account-close').addEventListener('click',()=>this.close());
    let email='';
    byId('email-form').addEventListener('submit',e=>{
      e.preventDefault();
      email=byId<HTMLInputElement>('email-input').value.trim();
      const status=byId('signin-status');
      status.textContent='Sending…';
      void api<{result:string}>('auth/email',{email,...(this.ref?{ref:this.ref}:{})}).then(r=>{
        if(r.status===200){byId('code-form').hidden=false;byId<HTMLInputElement>('code-input').focus();status.textContent=`We emailed a 6-digit code to ${email}. Type it here (or open the link in the email on this device). Check spam if it is not there in a minute.`}
        else status.textContent=r.status===400?'That email address does not look right.':r.status===429?'Too many codes asked for: wait a few minutes and try again.':'Could not send the code. Check your connection and try again.';
      });
    });
    byId('code-form').addEventListener('submit',e=>{
      e.preventDefault();
      const code=byId<HTMLInputElement>('code-input').value.replace(/\D/g,'');
      void api('auth/email/code',{email,code}).then(async r=>{
        if(r.status===200){byId('signin-status').textContent='';await this.refresh()}
        else byId('signin-status').textContent='That code is wrong or has expired. Check it, or ask for a new one.';
      });
    });
    byId('apple-button').addEventListener('click',()=>void this.appleSignIn());
    byId('account-signout').addEventListener('click',()=>void api('auth/logout',{}).then(()=>this.refresh()));
    byId('invite-share').addEventListener('click',()=>{
      const link=byId<HTMLInputElement>('invite-link').value;
      const nav=navigator as Navigator&{share?:(d:{title:string;text:string;url:string})=>Promise<void>};
      if(nav.share)void nav.share({title:'Driving Practice',text:'Practise for your driving test on real UK streets. Your first drive is free with my link:',url:link}).catch(()=>{});
      else void navigator.clipboard?.writeText(link).then(()=>{byId('invite-share').textContent='Copied'});
    });
  }

  private render(){
    const me=this.me,signedIn=me.signedIn;
    byId('account-signin').hidden=signedIn;
    byId('account-main').hidden=!signedIn;
    byId('account-invited').hidden=signedIn||!this.ref;
    // The free try, while any of it is left on this device.
    const left=(['lesson','test','free'] as const).filter(k=>(me.trial?.[k]??0)>0);
    byId('trial-note').hidden=signedIn||!left.length;
    byId('trial-note').textContent=left.length===3?'No sign-up needed to try: one free lesson, one free mock test and one free drive on this device.'
      :`Still free to try on this device, no sign-up needed: ${left.map(k=>`your ${TRY_NAME[k]}`).join(' and ')}.`;
    // "or with your email" only under a Google or Apple button.
    document.querySelector<HTMLElement>('#account-signin .divider')!.hidden=!this.config?.googleClientId&&!this.config?.appleServicesId;
    const chip=byId('account-chip');
    const starterLeft=signedIn?(['lesson','test','free'] as const).filter(p=>me.allowances[p]>0):[];
    const drives=total(me);
    chip.textContent=signedIn?(me.admin?'Admin':`${drives} drive${drives===1?'':'s'}`):'Sign in';
    if(!signedIn)return;
    byId('account-email').textContent=me.email??'Apple account';
    // The headline is everything that can be started; below it, what that is made of.
    byId('account-balance').textContent=String(drives);
    byId('account-balance-unit').textContent=drives===1?'drive':'drives';
    const rows:HTMLElement[]=[];
    if(me.starterBought||starterLeft.length){
      const li=document.createElement('li');
      const b=document.createElement('b');b.textContent='Starter Pass';
      const kinds=document.createElement('div');kinds.className='kinds';
      for(const p of ['lesson','test','free'] as const){
        const i=document.createElement('i');const left=me.allowances[p]>0;
        i.className=left?'':'used';
        i.textContent=`${POT_NAME[p][0]!.toUpperCase()}${POT_NAME[p].slice(1)}: ${left?'ready':'used'}`;
        kinds.append(i);
      }
      li.append(b,kinds);rows.push(li);
    }
    {
      const li=document.createElement('li');
      const b=document.createElement('b');b.textContent=`${me.balance} session${me.balance===1?'':'s'}`;
      const span=document.createElement('span');span.textContent=me.balance>0?'for any lesson, mock test or free drive':'buy a pack below';
      li.append(b,span);rows.push(li);
    }
    byId('account-breakdown').replaceChildren(...rows);
    const packs=(this.config?.packs??[]).filter(p=>!(p.starter&&me.starterBought)&&p.onSale);
    byId('pack-list').replaceChildren(...packs.map(p=>{
      const b=document.createElement('button');b.type='button';b.dataset['pack']=p.id;
      const left=document.createElement('span');
      const t=document.createElement('b');t.textContent=p.label;
      const d=document.createElement('small');d.textContent=` ${p.description}${p.starter?' · once per account':''}`;
      left.append(t,d);
      const price=document.createElement('span');price.className='price';price.textContent=p.price;
      b.append(left,price);
      b.addEventListener('click',()=>void this.buy(p));
      return b;
    }));
    if(!packs.length)byId('pack-list').textContent='Sessions are not on sale yet.';
    byId<HTMLInputElement>('invite-link').value=`${location.origin}${location.pathname}?ref=${me.referralCode}`;
    byId('admin-link').hidden=!me.admin;
    byId('invite-stats').textContent=me.invited?`${me.invited} joined with your link · ${me.rewarded} free session${me.rewarded===1?'':'s'} earned`:'';
    const LABEL:Record<string,string>={purchase:'Bought',promo:'Promotion',referral_free_drive:'Free drive (invited)',referral_bonus:'Free session (you invited someone)',
      consumed:'Used',drive_refund:'Given back (did not load)',refund:'Refunded',adjustment:'Adjusted',allowance:'Starter Pass',
      starter_duplicate:'Starter Pass already bought: payment refunded'};
    byId('account-history').replaceChildren(...me.history.map(h=>{
      const li=document.createElement('li');
      li.textContent=`${new Date(h.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}: ${h.type==='allowance'||h.type==='starter_duplicate'?h.reason:LABEL[h.type]??h.type}${h.sessions?` ${h.sessions>0?'+':''}${h.sessions}`:''}${h.amountPence>0?` (£${(h.amountPence/100).toFixed(2)})`:''}`;
      return li;
    }));
  }

  private async buy(p:Pack){
    if(!this.me.signedIn)return;
    store.set(BUY_KEY,JSON.stringify({total:total(this.me),balance:this.me.balance,starter:this.me.starterBought,at:Date.now()}));
    if(this.config?.devCheckout){
      // Local development: a pretend payment, delivered to the server as Stripe would.
      await api('dev/checkout',{pack:p.id});
      await this.awaitPayment();
      return;
    }
    // The payment page's address comes from the server, made for this account.
    const r=await api<{url?:string;error?:string}>('checkout',{pack:p.id});
    if(r.status===200&&r.data?.url){location.href=r.data.url;return}
    byId('account-note').textContent=r.data?.error==='starter-bought'?'You already have the Starter Pass: it can be bought once per account.'
      :r.status===401?'Please sign in again.':'Could not open the payment page. Check your connection and try again.';
    await this.refresh();
  }

  /** Back from checkout: Stripe tells the server a moment later, so the balance is checked until it rises. */
  private async awaitPayment(){
    const before=(()=>{try{return JSON.parse(store.get(BUY_KEY)??'null') as {total:number;balance?:number;starter?:boolean}|null}catch{return null}})();
    this.open();
    const note=byId('account-note');
    note.textContent='Payment received: adding your sessions…';
    for(let i=0;i<30;i++){
      // Every few seconds the server also asks Stripe directly (crediting does not wait for Stripe's webhook).
      if(i%3===0)await api('checkout/reconcile',{}).catch(()=>null);
      await this.refresh();
      if(this.me.signedIn&&total(this.me)>(before?.total??-1)){
        // What this payment added, said plainly.
        const added=this.me.balance-(before?.balance??0),starterNow=this.me.starterBought&&before?.starter===false;
        const parts=[...(starterNow?['Starter Pass added: 1 lesson, 1 mock test and 1 free drive']:[]),...(added>0?[`${added} session${added===1?'':'s'} added`]:[])];
        note.textContent=`Payment received. ${parts.length?`${parts.join('; ')}.`:'Your drives are updated.'} Choose a drive and press Start.`;
        store.set(BUY_KEY,null);
        return;
      }
      await new Promise(r=>setTimeout(r,2000));
    }
    note.textContent='Your payment is taking longer than usual to arrive. It will show here when it does; if it does not within a few minutes, contact support.drivingpractice@gmail.com.';
  }

  // ---- Google and Apple ----

  private providersReady=false;
  private async providers(){
    if(this.providersReady||!this.config)return;
    this.providersReady=true;
    const {googleClientId,appleServicesId}=this.config;
    if(googleClientId)void loadScript('https://accounts.google.com/gsi/client').then(()=>{
      const g=(window as unknown as {google?:{accounts:{id:{initialize(o:object):void;renderButton(el:HTMLElement,o:object):void}}}}).google;
      if(!g)return;
      g.accounts.id.initialize({client_id:googleClientId,ux_mode:'popup',callback:(r:{credential:string})=>void this.providerSignIn('google',r.credential)});
      const el=byId('google-button');el.hidden=false;
      g.accounts.id.renderButton(el,{theme:'filled_black',size:'large',shape:'pill',text:'continue_with',width:Math.min(400,el.clientWidth||320)});
    }).catch(()=>{});
    if(appleServicesId)void loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_GB/appleid.auth.js').then(()=>{
      const a=(window as unknown as {AppleID?:{auth:{init(o:object):void}}}).AppleID;
      if(!a)return;
      a.auth.init({clientId:appleServicesId,scope:'email',redirectURI:this.config!.appleRedirect,state:this.ref?`ref:${this.ref}`:'none',usePopup:true});
      byId('apple-button').hidden=false;
    }).catch(()=>{});
  }

  private async appleSignIn(){
    const a=(window as unknown as {AppleID?:{auth:{signIn():Promise<{authorization:{id_token:string}}>}}}).AppleID;
    try{const r=await a!.auth.signIn();await this.providerSignIn('apple',r.authorization.id_token)}
    catch{byId('signin-status').textContent='Apple sign-in did not finish. Please try again, or use your email.'}
  }

  private async providerSignIn(provider:'google'|'apple',credential:string){
    const r=await api(`auth/${provider}`,{credential,...(this.ref?{ref:this.ref}:{})});
    if(r.status===200)await this.refresh();
    else byId('signin-status').textContent=`${provider==='google'?'Google':'Apple'} sign-in did not work. Please try again, or use your email.`;
  }
}
