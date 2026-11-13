/**
 * Paid access: where the app is hosted with its accounts service (access.json says `gate: true`), each lesson, mock
 * test or free drive completed uses one session. This signs the driver in (Google, Apple, or a code by email),
 * sells sessions through Stripe Payment Links and shows the balance and invite link. Without access.json (the
 * preview copies) nothing is gated.
 */
type Pot='lesson'|'test'|'free';
type Pack={id:string;label:string;price:string;description:string;sessions:number;allowances:Partial<Record<Pot,number>>;starter:boolean;onSale:boolean;
  /** Staging: shown as it will be live, bought on the live site. */
  preview?:boolean;
  deal?:string;sticker?:string;
  unlimited?:{days?:number;monthly?:boolean};saleEnds?:string};
type Config={gate:boolean;googleClientId:string|null;appleServicesId:string|null;appleRedirect:string;packs:Pack[];devCheckout:boolean;signInFirst?:boolean};
/** The device's free try (no sign-up): what is left of its lessons, mock tests and free drives (FREE_EACH of each). */
type Trial=Record<Pot,number>;
type Me=({signedIn:false}|{signedIn:true;id:string;email:string|null;balance:number;allowances:Record<Pot,number>;starterBought:boolean;referralCode:string;invited:number;rewarded:number;admin?:boolean;
  /** An unlimited pass: every drive until then (ISO), or null. */
  unlimitedUntil?:string|null;
  lessonsDone?:string[];
  history:Array<{type:string;sessions:number;amountPence:number;reason:string;at:string}>})&{trial?:Trial};
/** A drive the server has started (its session used). */
export type PaidDrive={id:string};
/** How a finished drive went, for the learner's profile (the server keeps it with the drive). */
export interface DriveSummary{seconds:number;test?:{passed:boolean;driving:number;serious:number;dangerous:number;finished:boolean};
  lesson?:{title:string;good:number;improve:number};areas?:Array<{label:string;driving:number;serious:number;dangerous:number}>}
/**
 * What the account screen is for: the account itself; signing up once the free try of a kind is used ("save your
 * progress", then the drive carries on); or the paywall, the packs from the Starter Pass up.
 */
type Mode='account'|'save'|'paywall';

const byId=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const store={
  get:(k:string)=>{try{return localStorage.getItem(k)}catch{return null}},
  set:(k:string,v:string|null)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{/* kept for this visit only */}}
};
const REF_KEY='dp.referral.v1',BUY_KEY='dp.buying.v1';
/** What a drive is, from its scenario (as the server decides it). */
const modeOf=(scenario:string):Pot=>scenario.endsWith('-mock-test')?'test':scenario.endsWith('-lesson')?'lesson':'free';
const POT_NAME:Record<Pot,string>={lesson:'lesson',test:'mock test',free:'free drive'};
/** Free drives of each kind on a device's free try (the server's TRIAL_EACH decides; this is for the wording). */
const FREE_EACH=1;
/** A free try's drives by kind, as said to the learner: one, and more than one. */
const TRY_NAME:Record<Pot,[string,string]>={lesson:['free lesson','free lessons'],test:['free mock test','free mock tests'],free:['free drive','free drives']};
/** "3 free lessons", "1 free drive". */
const cap=(t:string)=>t[0]!.toUpperCase()+t.slice(1);
const freeCount=(k:Pot,n:number)=>`${n} ${TRY_NAME[k][n===1?0:1]}`;
/** What unlocks more drives for free, said where the free ones run out. */
const INVITE_UNLOCK='Invite a friend: you both get 2 free drives.';
/** Everything the account can start: general sessions plus Starter allowances. */
const total=(me:Me)=>me.signedIn?me.balance+me.allowances.lesson+me.allowances.test+me.allowances.free:0;
/** The end of an unlimited pass still running, or null. */
const unlimitedUntil=(me:Me):Date|null=>me.signedIn&&me.unlimitedUntil&&Date.parse(me.unlimitedUntil)>Date.now()?new Date(me.unlimitedUntil):null;
/** "27 Nov". */
const day=(d:Date|string)=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'});

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

import {lessonsDone,mergeLessonsDone} from '../lessons/progress';
import {renderProfile,type Profile} from './profileView';
import {renderBoard,type Board} from './boardView';

export class Access{
  /** Whether drives need sessions here. */
  gate=false;
  private config:Config|null=null;
  me:Me={signedIn:false};
  /** Called whenever the balance or sign-in changes (the home screen shows it). */
  onChange:()=>void=()=>{};
  /** Signed in (or up) during this visit. */
  onSignIn:()=>void=()=>{};
  private checked=false;
  private mode:Mode='account';
  /** The drive that sent the learner here to sign up or buy, and its kind: started again once it can be. */
  private pending:{pot:Pot;again:()=>void}|null=null;

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
    const r=await api<Me>('me'),was=this.me.signedIn;
    if(r.data)this.me=r.data;
    // Signed in on this visit (not already signed in when the app opened).
    if(this.checked&&!was&&this.me.signedIn)this.onSignIn();
    if(r.data)this.checked=true;
    if(this.me.signedIn){store.set(REF_KEY,null);await this.syncProgress()}
    this.render();
    this.onChange();
    this.carryOn();
    // (Signed in on the account screen: their profile.)
    if(this.me.signedIn&&this.mode==='account'&&!byId('screen-account').hidden)void this.loadProfile();
  }

  /** Progress both ways: the account's lessons come to this device, and this device's go to the account. */
  async syncProgress():Promise<void>{
    if(!this.gate||!this.me.signedIn)return;
    mergeLessonsDone(this.me.lessonsDone??[]);
    const local=lessonsDone(),saved=this.me.lessonsDone??[];
    if(local.some(l=>!saved.includes(l))){
      const r=await api<{lessonsDone:string[]}>('progress',{lessons:local});
      if(r.data)this.me.lessonsDone=r.data.lessonsDone;
    }
  }

  /** Whether a drive of this kind can start now. */
  private canStart(pot:Pot):boolean{
    if((this.me.trial?.[pot]??0)>0)return true;
    return this.me.signedIn&&(!!this.me.admin||!!unlimitedUntil(this.me)||total(this.me)>0);
  }

  /** After signing up or paying: the drive that was waiting starts; signed up with nothing to drive on, the paywall. */
  private carryOn(){
    if(!this.me.signedIn||byId('screen-account').hidden)return;
    if(this.pending&&this.canStart(this.pending.pot)){const {again}=this.pending;this.pending=null;this.close();again();return}
    if(this.mode==='save')this.open(undefined,this.pending||(!this.me.admin&&!unlimitedUntil(this.me)&&total(this.me)===0)?'paywall':'account');
  }

  /** The free try still on this device, for someone not signed in (0 where nothing is gated). */
  freeLeft():number{
    if(!this.gate||this.me.signedIn)return 0;
    return (['lesson','test','free'] as const).reduce((n,k)=>n+Math.max(0,this.me.trial?.[k]??0),0);
  }

  /** The whole free try when none of it is used (for the home screen's "Your first 9 drives are free"). */
  readonly freeTotal=3*FREE_EACH;
  /** The free drives of one kind left on this device. */
  freeOf(pot:Pot):number{return Math.max(0,this.me.trial?.[pot]??0)}

  /** Whether a drive here would use the device's free try (paid drives, nothing bought or signed out, not an admin). */
  private onFreeTry():boolean{return this.gate&&(!this.me.signedIn&&!this.config?.signInFirst||this.me.signedIn&&(!this.me.admin&&!unlimitedUntil(this.me)&&total(this.me)===0))}
  /**
   * The free try of one kind on this device: 'free' (still there), 'used', or null where it is not what a drive would
   * use. The home screen's cards show it, so nobody tries for a second free one and thinks the app is not working.
   */
  tryState(pot:Pot):'free'|'used'|null{
    if(!this.onFreeTry())return null;
    return (this.me.trial?.[pot]??0)>0?'free':'used';
  }
  /** The other kinds still free on this device, said plainly ('' if none). */
  private stillFree(except:Pot):string{
    const left=(['free','lesson','test'] as const).filter(k=>k!==except&&(this.me.trial?.[k]??0)>0).map(k=>freeCount(k,this.me.trial![k]));
    if(!left.length)return '';
    return `Your ${left.join(' and ')} ${left.length>1||!left[0]!.startsWith('1 ')?'are':'is'} still there.`;
  }

  /** Invite a friend (the home screen's card): signed in, share the link at once; otherwise sign in, then the account screen has it. */
  invite():void{
    if(!this.me.signedIn){this.open();return}
    this.open();
    byId('invite-share').click();
  }

  /** The offer on sale now for the home screen's banner (the Black Friday pass while it is sold), or null. */
  offer():{price:string}|null{
    // (Not for someone whose pass is running: nothing to buy.)
    if(unlimitedUntil(this.me))return null;
    const p=this.gate?this.config?.packs.find(x=>x.id==='black-friday-week'&&(x.onSale||x.preview)):undefined;
    return p?{price:p.price}:null;
  }

  /** The passes: the paywall, or for someone not signed in, signing up first (the paywall follows). */
  viewPasses():void{this.open(undefined,!this.me.signedIn?'save':unlimitedUntil(this.me)?'account':'paywall')}

  /** A line for the exercise screen under Start, for the drive about to start. */
  note(scenario:string|null):string{
    if(!this.gate)return '';
    const pot=scenario?modeOf(scenario):null;
    const left=pot?this.me.trial?.[pot]??0:0;
    if(!this.me.signedIn&&this.config?.signInFirst)return 'Sign in to start';
    if(!this.me.signedIn)return pot&&left>0?`${left===1&&FREE_EACH===1?`Your ${TRY_NAME[pot][0]}`:`${cap(TRY_NAME[pot][0])} ${Math.max(1,FREE_EACH-left+1)} of ${Math.max(FREE_EACH,left)}`}: no sign-up needed, used if you complete it`
      :pot?`You have used your ${TRY_NAME[pot][FREE_EACH===1?0:1]}. ${this.stillFree(pot)||INVITE_UNLOCK}`:'Sign in to start: a completed drive uses one session.';
    if(this.me.admin)return 'Admin: drives do not use sessions';
    const until=unlimitedUntil(this.me);
    if(until)return `Unlimited until ${day(until)}`;
    const n=total(this.me);
    if(n>0)return `Uses 1 session if you complete it · you have ${n}`;
    if(pot&&left>0)return `Uses one of your ${freeCount(pot,left)}`;
    const rest=pot?this.stillFree(pot):'';
    return pot&&rest?`You have used your ${TRY_NAME[pot][FREE_EACH===1?0:1]}. ${rest}`:`No drives left. ${INVITE_UNLOCK}`;
  }

  /**
   * Before a drive: false if it cannot start (the account screen opens to sign in or buy); otherwise the drive whose
   * session was used (null where nothing is gated).
   */
  async begin(kind:string,scenario:string,again?:()=>void):Promise<PaidDrive|null|false>{
    if(!this.gate)return null;
    const pot=modeOf(scenario);
    // Signed out with this kind's free try used: sign up (progress saved), then the drive carries on. Signed in with
    // nothing to drive on: the paywall. Admins drive without sessions (the server checks it too).
    const stop=(reason?:string)=>{this.pending=again?{pot,again}:null;this.open(reason,this.me.signedIn?'paywall':'save');return false as const};
    if(!this.canStart(pot))return stop();
    const r=await api<{driveId:string;balance:number;error?:string}>('drives',{kind,scenario});
    if(r.status===200&&r.data){void this.refresh();return {id:r.data.driveId}}
    if(r.status===401){await this.refresh();return stop()}
    if(r.status===402){await this.refresh();return stop()}
    // (Too many new free tries from this connection today: the try itself was not used.)
    if(r.status===429)return stop('Too many free tries from this connection today. Sign up to keep driving.');
    this.open('Driving Practice could not be reached. Check your connection and try again.');
    return false;
  }

  /**
   * How the drive went: one that failed to load gives its session back; 'completed' only when driven to its end
   * ('ended' otherwise, with how: exited, a crash, out of time).
   */
  report(drive:PaidDrive|null,status:'loaded'|'failed'|'completed'|'ended',outcome?:string,result?:DriveSummary):void{
    if(!drive)return;
    // (A completed drive has just used its session: the balance is shown again.)
    void api(`drives/${drive.id}/${status}`,{...(outcome?{outcome}:{}),...(result?{result}:{})}).then(()=>{if(status==='completed'||status==='failed')void this.refresh()});
  }

  // ---- The account screen ----

  open(reason?:string,mode:Mode='account'):void{
    this.mode=mode;
    if(mode==='account')this.pending=null;
    const screen=byId('screen-account');
    screen.dataset['mode']=mode;
    byId('account-title').textContent=mode==='save'&&!this.config?.signInFirst?'Sign up to save your progress':'Sign in';
    byId('code-send').textContent=mode==='save'?'Continue driving':'Sign in';
    byId('account-main-title').textContent=mode==='paywall'?'Keep driving':'Your drives';
    screen.hidden=false;
    byId('account-reason').textContent=reason??'';byId('account-reason').hidden=!reason;
    byId('account-note').textContent=this.me.signedIn&&reason?reason:'';
    this.render();
    if(!this.me.signedIn)void this.providers();
    if(mode==='account')void this.loadProfile();
  }

  /** The learner's profile under their drives (account view only, signed in). */
  private async loadProfile(){
    const box=byId('profile');
    if(!this.me.signedIn){box.hidden=true;return}
    const r=await api<Profile>('profile');
    if(r.status===200&&r.data)renderProfile(box,r.data);
    await this.loadBoard();
  }

  /** The leaderboard for the learner's test centre, with their own settings. */
  private async loadBoard(){
    const box=byId('board');
    if(!this.me.signedIn){box.hidden=true;return}
    const r=await api<Board>('board');
    if(r.status!==200||!r.data)return;
    renderBoard(box,r.data,async s=>{
      const saved=await api<{ok?:boolean;error?:string}>('board/me',s);
      if(saved.status===200){void this.loadBoard();return null}
      return saved.data?.error==='school'?'That driving school name cannot be used.':'Choose a name of 2 to 24 letters or numbers (no rude words).';
    });
  }
  close():void{byId('screen-account').hidden=true;this.pending=null}

  private wire(){
    byId('account-chip').addEventListener('click',()=>this.open());
    // Admin: the simulation's load-time options (read from the address when the page loads, so changing one reloads).
    for(const select of document.querySelectorAll<HTMLSelectElement>('[data-sim-option]')){
      const key=select.dataset['simOption']!;
      select.value=new URLSearchParams(location.search).get(key)??'';
      select.addEventListener('change',()=>{
        const url=new URL(location.href);
        if(select.value)url.searchParams.set(key,select.value);else url.searchParams.delete(key);
        location.assign(url);
      });
    }
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
      if(nav.share)void nav.share({title:'Driving Practice',text:'Practise for your driving test on real UK streets. You get 2 free drives with my link:',url:link}).catch(()=>{});
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
    byId('trial-note').hidden=signedIn||!left.length||this.mode==='save';
    const counts=left.map(k=>freeCount(k,me.trial![k]));
    byId('trial-note').textContent=left.length===3&&left.every(k=>me.trial![k]>=FREE_EACH)?`No sign-up needed to try: ${counts[0]}, ${counts[1]} and ${counts[2]} on this device.`
      :`Still free to try on this device, no sign-up needed: ${counts.slice(0,-1).join(', ')}${counts.length>1?' and ':''}${counts.at(-1)}.`;
    // "or with your email" only under a Google or Apple button.
    document.querySelector<HTMLElement>('#account-signin .divider')!.hidden=!this.config?.googleClientId&&!this.config?.appleServicesId;
    // Staging (sign-in first) is a test site: a way to the public one for anyone but the admins.
    for(const el of document.querySelectorAll<HTMLElement>('[data-public-link]'))el.hidden=!this.config?.signInFirst||(signedIn&&!!me.admin);
    const chip=byId('account-chip');
    const starterLeft=signedIn?me.allowances.lesson+me.allowances.test+me.allowances.free:0;
    const drives=total(me);
    const until=unlimitedUntil(me);
    chip.textContent=signedIn?(me.admin?'Admin':until?'Unlimited':`${drives} drive${drives===1?'':'s'}`):'Sign in';
    if(!signedIn)return;
    byId('account-email').textContent=me.email??'Apple account';
    // The headline is everything that can be started; below it, what that is made of.
    byId('account-balance').textContent=until?'Unlimited':String(drives);
    byId('account-balance-unit').textContent=until?`until ${day(until)}`:drives===1?'drive':'drives';
    const rows:HTMLElement[]=[];
    // Starter Pass drives still held from before it became sessions (for any kind of drive).
    if(starterLeft>0){
      const li=document.createElement('li');
      const b=document.createElement('b');b.textContent=`${starterLeft} Starter Pass drive${starterLeft===1?'':'s'}`;
      const span=document.createElement('span');span.textContent='for any lesson, mock test or free drive';
      li.append(b,span);rows.push(li);
    }
    // (Sessions: only what can be used; never a number below nothing.)
    if(me.balance>0||(!until&&!starterLeft)){
      const n=Math.max(0,me.balance);
      const li=document.createElement('li');
      const b=document.createElement('b');b.textContent=`${n} session${n===1?'':'s'}`;
      const span=document.createElement('span');span.textContent=n>0?until?'kept for after your pass':'for any lesson, mock test or free drive':'or choose a pass below';
      li.append(b,span);rows.push(li);
    }
    byId('account-breakdown').replaceChildren(...rows);
    byId('account-breakdown').hidden=!rows.length;
    // A pass running: just how long it lasts; nothing to buy until it ends.
    byId('pack-list').hidden=!!until;
    const packs=(this.config?.packs??[]).filter(p=>!(p.starter&&me.starterBought)&&(p.onSale||p.preview));
    byId('pack-list').replaceChildren(...packs.map(p=>{
      const b=document.createElement('button');b.type='button';b.dataset['pack']=p.id;
      const el=(tag:string,cls:string,text:string)=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;return e};
      const left=el('span','pack-text','');
      if(p.sticker)left.append(el('span','pack-sticker',p.sticker));
      const title=el('span','pack-title','');title.append(el('b','',p.label),...(p.deal?[el('span','pack-deal',p.deal)]:[]));
      // (Each part of the description on its own line: "15 drives used to cost £24.99", "Cancel anytime".)
      left.append(title,...`${p.description}${p.starter?' · once per account':''}`.split(' · ').filter(Boolean).map(t=>el('small','',t)));
      // "£4.99 a week": the amount large, how often under it.
      const [amount,per]=p.price.split(' a ');
      const price=el('span','price','');price.append(el('b','',amount??''),...(per?[el('small','',`/${per}`)]:[]));
      b.append(left,...(p.price?[price]:[]));
      b.addEventListener('click',()=>void this.buy(p));
      return b;
    }));
    if(!packs.length)byId('pack-list').textContent='Passes are not on sale yet.';
    byId<HTMLInputElement>('invite-link').value=`${location.origin}${location.pathname}?ref=${me.referralCode}`;
    byId('admin-tools').hidden=!me.admin;
    byId('invite-stats').textContent=me.invited?`${me.invited} joined with your link · ${me.rewarded} free drive${me.rewarded===1?'':'s'} earned`:'';
    const LABEL:Record<string,string>={purchase:'Bought',promo:'Promotion',referral_free_drive:'Free drives (invited)',referral_bonus:'Free drives (a friend you invited drove)',
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
    if(p.preview){
      // Staging: said on the pass that was tapped, where it is seen.
      const card=document.querySelector<HTMLElement>(`#pack-list [data-pack="${p.id}"]`);
      if(card&&!card.querySelector('.pack-note')){
        const n=document.createElement('span');n.className='pack-note';n.textContent='Test site: buy this on vr.drivingpractice.live';
        card.querySelector('.pack-text')?.append(n);
      }
      return;
    }
    store.set(BUY_KEY,JSON.stringify({total:total(this.me),balance:this.me.balance,starter:this.me.starterBought,until:this.me.unlimitedUntil??null,at:Date.now()}));
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
    const before=(()=>{try{return JSON.parse(store.get(BUY_KEY)??'null') as {total:number;balance?:number;starter?:boolean;until?:string|null}|null}catch{return null}})();
    // (Paying from the paywall without leaving the page: the drive that was waiting starts once the sessions arrive.)
    this.open(undefined,this.pending?this.mode:'account');
    const note=byId('account-note');
    note.textContent='Payment received: adding it to your account…';
    for(let i=0;i<30;i++){
      // Every few seconds the server also asks Stripe directly (crediting does not wait for Stripe's webhook).
      if(i%3===0)await api('checkout/reconcile',{}).catch(()=>null);
      await this.refresh();
      const until=unlimitedUntil(this.me);
      if(until&&this.me.signedIn&&this.me.unlimitedUntil!==(before?.until??null)){
        note.textContent=`Payment received. Unlimited drives until ${day(until)}. Choose a drive and press Start.`;
        store.set(BUY_KEY,null);
        return;
      }
      if(this.me.signedIn&&total(this.me)>(before?.total??-1)){
        // What this payment added, said plainly.
        const added=this.me.balance-(before?.balance??0),starterNow=this.me.starterBought&&before?.starter===false;
        const parts=added>0?[`${starterNow?'Starter Pass: ':''}${added} session${added===1?'':'s'} added`]:[];
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
