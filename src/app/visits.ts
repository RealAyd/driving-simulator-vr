/**
 * Visits: how the app is used, sent to Driving Practice's own server (POST /api/visits; summed up on the admin hub's
 * Visitors tab). Nothing goes to anyone else, no cookie is set, and nothing typed is ever sent: a random id for the
 * device (in this browser's storage), one for this opening of the app, where it was opened from, the screens shown,
 * the buttons pressed (by their id or label), drives started and how they ended, and a heartbeat while on screen.
 * Off when the browser asks sites not to track (Global Privacy Control or Do Not Track), when turned off on the Cookies
 * page (legal/cookies.html), and in automated browsers.
 */
type Data=Record<string,string|number|boolean>;
interface Pending{type:string;screen:string;target?:string;data?:Data;t:number}

const VISITOR_KEY='dp-visitor';
const FLUSH_MS=15_000,PING_MS=30_000;

const randomId=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return [...b].map(x=>x.toString(36).padStart(2,'0')).join('').slice(0,20)};
const clean=(s:string|null|undefined,max=80)=>(s??'').replace(/[^\w .:/#+&'()-]/g,'').trim().slice(0,max);

function deviceOf():Data{
  const ua=navigator.userAgent,touch=navigator.maxTouchPoints>1,short=Math.min(screen.width,screen.height);
  const os=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&touch)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'macOS':/CrOS/.test(ua)?'ChromeOS':/Linux/.test(ua)?'Linux':'other';
  const device=/OculusBrowser|Quest|Pico/.test(ua)?'headset':!touch?'computer':short>=600?'tablet':'phone';
  const browser=/Edg\//.test(ua)?'Edge':/SamsungBrowser/.test(ua)?'Samsung':/CriOS|Chrome\//.test(ua)?'Chrome':/FxiOS|Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'other';
  const net=(navigator as {connection?:{effectiveType?:string}}).connection?.effectiveType;
  return {os,device,browser,width:innerWidth,height:innerHeight,lang:clean(navigator.language,12),...(net?{net}:{})};
}

export class Visits{
  private readonly on:boolean;
  private readonly visitor:string;
  /** The page's own first record (index.html: "landed", sent before the app loaded): this visit carries on from it. */
  private readonly landing=(window as {__dpLanding?:{visitor:string;session:string;fresh:boolean;from:Data}}).__dpLanding;
  private readonly session=this.landing?.session??randomId();
  private queue:Pending[]=[];
  private screen='loading';
  private visible=document.visibilityState==='visible';
  private shownAt=performance.now();

  /** `screenNow` names the screen showing (checked every second; a change is a 'screen' event). */
  constructor(private readonly screenNow:()=>string){
    const nav=navigator as Navigator&{globalPrivacyControl?:boolean};
    let optedOut=false;
    try{optedOut=localStorage.getItem('dp-visits-off')==='1'}catch{/* storage blocked */}
    this.on=!optedOut&&!nav.globalPrivacyControl&&nav.doNotTrack!=='1'&&!nav.webdriver&&typeof fetch==='function';
    let stored:string|null=null;
    try{stored=this.landing?.fresh?null:localStorage.getItem(VISITOR_KEY)}catch{/* storage blocked: a new id each time */}
    this.visitor=this.landing?.visitor??(stored&&/^[a-z0-9]{8,40}$/.test(stored)?stored:randomId());
    if(!stored&&this.on)try{localStorage.setItem(VISITOR_KEY,this.visitor)}catch{/* as above */}
    if(!this.on)return;
    // Where this opening came from (read before the app tidies the address).
    const q=new URLSearchParams(location.search),from:Data={};
    const standalone=matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true;
    if(standalone)from['standalone']=true;
    for(const [k,name] of [['utm_source','src'],['utm_medium','medium'],['utm_campaign','campaign'],['src','src']] as const){const v=clean(q.get(k),60);if(v&&!from[name])from[name]=v}
    if(q.get('ref'))from['ref']=true;
    try{const r=document.referrer&&new URL(document.referrer);if(r&&r.host!==location.host)from['referrer']=clean(r.host,80)}catch{/* no referrer */}
    this.add('open',{...this.landing?.from,...from,...deviceOf(),newVisitor:this.landing?.fresh??!stored});
    // Screens, heartbeats and leaving.
    setInterval(()=>this.checkScreen(),1000);
    setInterval(()=>{if(this.visible)this.add('ping')},PING_MS);
    setInterval(()=>this.flush(),FLUSH_MS);
    document.addEventListener('visibilitychange',()=>{
      this.visible=document.visibilityState==='visible';
      if(!this.visible){this.add('leave',{seconds:Math.round((performance.now()-this.shownAt)/1000)});this.flush(true)}
      else{this.shownAt=performance.now();this.add('ping',{back:true})}
    });
    addEventListener('pagehide',()=>this.flush(true));
    // Buttons and links pressed: their id, or failing that their label (never what was typed).
    document.addEventListener('click',e=>{
      const el=(e.target as Element|null)?.closest?.('button,a,[role="button"],[role="tab"],summary,label,input[type="radio"],input[type="checkbox"],select');
      if(el)this.add('click',undefined,this.nameOf(el));
    },{capture:true,passive:true});
  }

  /** A drive started, or how it ended (outcome, and seconds driven). */
  drive(phase:'start'|'end',scenario:string,data:Data={}):void{this.add('drive',{phase,...data},clean(scenario))}
  /** Signed in (or signed up) during this visit. */
  signedIn():void{this.add('signin')}

  private nameOf(el:Element):string{
    const tag=el.tagName.toLowerCase();
    if(el.id)return `#${el.id}`;
    const input=el as HTMLInputElement;
    if(tag==='input')return `${input.name||input.type}=${clean(input.value,30)}`;
    const data=el as HTMLElement;
    for(const k of ['tab','exercise','scenario','lesson','action','centre'])if(data.dataset?.[k])return `${k}:${clean(data.dataset[k],50)}`;
    const label=el.getAttribute('aria-label')??(el.textContent??'');
    return `${tag}:${clean(label.replace(/\s+/g,' '),50)||'?'}`;
  }

  private checkScreen(){
    const now=this.screenNow();
    if(now===this.screen)return;
    this.screen=now;
    this.add('screen');
  }

  private add(type:string,data?:Data,target?:string){
    if(!this.on)return;
    if(type!=='screen'&&type!=='open')this.checkScreen();
    this.queue.push({type,screen:this.screen,...(target?{target}:{}),...(data&&Object.keys(data).length?{data}:{}),t:Date.now()});
    if(this.queue.length>=50)this.flush();
  }

  private flush(leaving=false){
    if(!this.queue.length)return;
    const now=Date.now(),events=this.queue.splice(0,60).map(({t,...e})=>({...e,ago:Math.max(0,now-t)}));
    const body=JSON.stringify({visitor:this.visitor,session:this.session,events});
    // Leaving: a beacon gets out as the page goes; otherwise a quiet post (a failure is not retried).
    if(leaving&&navigator.sendBeacon?.('/api/visits',new Blob([body],{type:'application/json'})))return;
    void fetch('/api/visits',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body}).catch(()=>{});
  }
}
