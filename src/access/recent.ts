import {TEST_CENTRES} from '../ui/areaSearch';

/**
 * "Recently practised" on the home screen: real drives completed on this service (GET /api/recent), said plainly:
 * "Mini-roundabout practice in Brentwood · 2 mins ago". Nothing about who; nothing invented (empty means hidden).
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

/** Fills the home screen's list (hidden while there is nothing to show), and again every two minutes. */
export function showRecent(section:HTMLElement,list:HTMLElement):void{
  const load=async()=>{
    let recent:RecentDrive[]=[];
    try{
      const r=await fetch('/api/recent',{cache:'no-store'});
      if(r.ok)recent=((await r.json()) as {recent?:RecentDrive[]}).recent??[];
    }catch{/* (Offline: the list stays as it was.) */return}
    list.replaceChildren(...recent.map(d=>{
      const li=document.createElement('li');
      const what=document.createElement('b');what.textContent=describeDrive(d);
      const when=document.createElement('span');when.textContent=`completed ${ago(d.secondsAgo)}`;
      li.append(what,' ',when);return li;
    }));
    section.hidden=!recent.length;
  };
  void load();
  setInterval(()=>{if(!document.hidden)void load()},120_000);
}
