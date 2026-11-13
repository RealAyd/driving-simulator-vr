import {TEST_CENTRES} from '../ui/areaSearch';

/**
 * Recently practised, a notification on the home screen: real drives completed on this service (GET /api/recent),
 * said plainly: "Mini-roundabout practice in Brentwood, completed 2 mins ago". Nothing about who; nothing invented.
 */

export interface RecentDrive{scenario:string;mode:'lesson'|'test'|'free';secondsAgo:number}

/** The bundled practices, by scenario id. */
const NAMED:Record<string,string>={
  'goodmayes-free-drive':'Free drive in Goodmayes',
  'goodmayes-mock-test':'Mock test in Goodmayes',
  'goodmayes-lesson':'Lesson in Goodmayes',
  'brentwood-guided-traversal':'Mini-roundabout practice in Brentwood',
  'brentwood-kings-road-zebra':'Zebra crossing practice in Brentwood',
  'crossing-restricted-view':'Zebra crossing practice',
  'moving-off-safely':'Moving off practice',
  'moving-off-intro':'Mirrors and blind spots practice'
};
const KIND={free:'Free drive',test:'Mock test',lesson:'Lesson'} as const;

const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
let centreBySlug:Map<string,string>|null=null;
/** The place of an area built on the phone (`area-<slug>-free-drive`): a test centre by name, else the place as typed. */
function areaPlace(scenario:string):string|null{
  const m=/^area-(.+)-(free-drive|mock-test|lesson)$/.exec(scenario);
  if(!m)return null;
  centreBySlug??=new Map(TEST_CENTRES.map(c=>[slug(`${c.name} test centre`),c.name]));
  const known=centreBySlug.get(m[1]!);
  if(known)return known;
  const words=m[1]!.replace(/-test-centre$/,'').split('-').filter(Boolean);
  // (A postcode stays in capitals; a place name gets capital letters.)
  return /\d/.test(m[1]!)?words.join(' ').toUpperCase():words.map(w=>w[0]!.toUpperCase()+w.slice(1)).join(' ');
}

export function describeDrive(d:Pick<RecentDrive,'scenario'|'mode'>):string{
  const named=NAMED[d.scenario];
  if(named)return named;
  const place=areaPlace(d.scenario);
  return place?`${KIND[d.mode]} ${d.mode==='test'?'at':'in'} ${place}`:KIND[d.mode];
}

export function ago(seconds:number):string{
  const n=(v:number,unit:string)=>`${v} ${unit}${v===1?'':'s'} ago`;
  if(seconds<60)return 'just now';
  if(seconds<3600)return n(Math.floor(seconds/60),'min');
  if(seconds<86400)return n(Math.floor(seconds/3600),'hour');
  return n(Math.floor(seconds/86400),'day');
}

/** How the notification paces itself (ms): first one after FIRST, each shown for SHOW, GAP between, ROUND before going round again. */
export const TOAST={FIRST:2000,SHOW:5000,GAP:3000,ROUND:20_000,REFRESH:120_000};

/**
 * The home screen's notification: one recent drive at a time slides in at the bottom, stays a few seconds and goes,
 * then the next. Only while `onHome()` (never during a drive or over another screen); closed, it stays away for the
 * visit. Nothing to show, nothing shows.
 */
export function showRecentToast(el:HTMLElement,what:HTMLElement,when:HTMLElement,close:HTMLElement,onHome:()=>boolean,timing=TOAST):void{
  let items:RecentDrive[]=[],fetchedAt=0,next=0,closed=false;
  try{closed=sessionStorage.getItem('dp.recent.closed')==='1'}catch{/* (No storage: it shows.) */}
  const load=async()=>{
    try{
      const r=await fetch('/api/recent',{cache:'no-store'});
      if(r.ok){items=((await r.json()) as {recent?:RecentDrive[]}).recent??[];fetchedAt=Date.now();next=0}
    }catch{/* (Offline: what was there stays.) */}
  };
  const hide=()=>{el.classList.add('out');setTimeout(()=>{if(el.classList.contains('out'))el.hidden=true},400)};
  close.addEventListener('click',()=>{
    closed=true;hide();
    try{sessionStorage.setItem('dp.recent.closed','1')}catch{/* (Closed for this page only.) */}
  });
  const step=()=>{
    if(closed)return;
    // (Not on the home screen, or the tab is hidden: look again shortly.)
    if(!items.length||document.hidden||!onHome()){setTimeout(step,timing.GAP);return}
    const d=items[next]!;
    what.textContent=describeDrive(d);
    when.textContent=`completed ${ago(d.secondsAgo+Math.round((Date.now()-fetchedAt)/1000))}`;
    el.hidden=false;
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove('out')));
    next=(next+1)%items.length;
    // (Leaving the home screen, starting a drive or opening sign-in: it goes at once.)
    const watch=setInterval(()=>{if(!onHome())hide()},250);
    setTimeout(()=>{clearInterval(watch);hide();setTimeout(step,next===0?timing.ROUND:timing.GAP)},timing.SHOW);
  };
  void load().then(()=>setTimeout(step,timing.FIRST));
  setInterval(()=>{if(!document.hidden)void load()},timing.REFRESH);
}
