import {isPartialPostcode,isPostcode,type AreaRequest} from '../generator/area';

/**
 * "Drive anywhere": a search box on the home screen for a driving test centre (from the list in
 * content/centres, DVSA's centres with their latest pass rates) or a postcode or place (postcodes.io, open data).
 * Picking a result builds that area (generator/area.ts).
 */

export interface TestCentre{name:string;lat:number;lon:number;passRate:number|null;tests:number;
  /** How the position was found: the centre itself on the map, the street in its name, or only its town (approximate). */
  located:'centre'|'street'|'town';
  /** The centre's postcode, where known: typing it finds the centre. */
  postcode?:string}

const files=import.meta.glob('../../content/centres/*.json',{eager:true,import:'default'}) as Record<string,TestCentre[]>;
export const TEST_CENTRES:TestCentre[]=Object.values(files).flat();

const POSTCODES='https://api.postcodes.io';
interface Result{label:string;detail:string;pick:()=>Promise<AreaRequest|null>}

const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

const centreRequest=(c:TestCentre):AreaRequest=>({label:`${c.name} test centre`,lat:c.lat,lon:c.lon,testCentre:c.located!=='town',centre:c.name});
const centreDetail=(c:TestCentre)=>[c.passRate!==null?`pass rate ${c.passRate.toFixed(0)}%`:'test centre',c.located==='town'?'area approximate':''].filter(Boolean).join(' · ');

/** Every test centre, alphabetically, in a few folded letter groups (A–D, E–H…): each opens to a list to tap. */
export function setUpCentreBrowser(container:HTMLElement,onPick:(r:AreaRequest)=>void):void{
  const groups=[['A','D'],['E','H'],['I','L'],['M','P'],['Q','T'],['U','Z']] as const;
  const sorted=[...TEST_CENTRES].sort((a,b)=>a.name.localeCompare(b.name));
  container.replaceChildren(...groups.map(([from,to])=>{
    const inGroup=sorted.filter(c=>{const l=c.name[0]!.toUpperCase();return l>=from&&l<=to});
    const details=document.createElement('details');details.className='more centre-group';
    const summary=document.createElement('summary');summary.textContent=`${from}–${to}`;
    const count=document.createElement('small');count.textContent=`${inGroup.length} centres`;summary.append(count);
    const list=document.createElement('ul');list.className='area-results centre-list';
    details.append(summary,list);
    // Built when first opened: the page stays light.
    details.addEventListener('toggle',()=>{
      if(!details.open||list.childElementCount)return;
      list.append(...inGroup.map(c=>{
        const li=document.createElement('li'),b=document.createElement('button');b.type='button';
        const t=document.createElement('b');t.textContent=c.name;const d=document.createElement('small');d.textContent=centreDetail(c);
        b.append(t,d);b.addEventListener('click',()=>onPick(centreRequest(c)));li.append(b);return li;
      }));
    });
    return details;
  }));
}

export function setUpAreaSearch(input:HTMLInputElement,list:HTMLElement,status:HTMLElement,onPick:(r:AreaRequest)=>void,fetcher:typeof fetch=fetch.bind(globalThis)):void{
  let seq=0,timer=0;
  // Online lookups give up after 5 s: matching test centres are already on screen.
  const json=async(url:string)=>{const r=await fetcher(url,{signal:AbortSignal.timeout(5000)});return r.ok?r.json():null};
  const show=(results:Result[])=>{
    list.replaceChildren(...results.map(r=>{
      const li=document.createElement('li'),b=document.createElement('button');
      b.type='button';
      const t=document.createElement('b');t.textContent=r.label;
      const d=document.createElement('small');d.textContent=r.detail;
      b.append(t,d);
      b.addEventListener('click',async()=>{
        list.hidden=true;
        status.textContent='Finding it…';
        try{const req=await r.pick();if(req){status.textContent='';onPick(req)}else status.textContent='Could not find that place.'}
        catch{status.textContent='No connection: searching needs the internet.'}
      });
      li.append(b);return li;
    }));
    list.hidden=results.length===0;
  };
  const search=async(q:string,mine:number)=>{
    const results:Result[]=[];
    const words=norm(q).split(' ').filter(Boolean);
    const compact=q.replace(/\s/g,'').toUpperCase();
    // Test centres first, at once (no network): by postcode, then names starting with what was typed, then containing it.
    const scored=TEST_CENTRES.map(c=>{
      const n=norm(c.name);
      const score=c.postcode&&c.postcode.replace(/\s/g,'')===compact?0:n.startsWith(words.join(' '))?1:words.every(w=>n.includes(w))?2:9;
      return {c,score};
    }).filter(x=>x.score<9).sort((a,b)=>a.score-b.score||a.c.name.localeCompare(b.c.name)).slice(0,8);
    for(const {c} of scored)results.push({label:`${c.name} test centre`,detail:centreDetail(c),pick:async()=>centreRequest(c)});
    show(results);
    try{
      if(isPostcode(q)){
        const pc=q.trim().toUpperCase();
        results.unshift({label:pc,detail:'postcode',pick:async()=>{const d=await json(`${POSTCODES}/postcodes/${encodeURIComponent(pc)}`);return d?.result?{label:d.result.postcode,lat:d.result.latitude,lon:d.result.longitude}:null}});
      }else if(isPartialPostcode(q)){
        const d=await json(`${POSTCODES}/postcodes/${encodeURIComponent(q.trim())}/autocomplete?limit=6`);
        for(const pc of (d?.result??[]) as string[])results.push({label:pc,detail:'postcode',pick:async()=>{const r=await json(`${POSTCODES}/postcodes/${encodeURIComponent(pc)}`);return r?.result?{label:r.result.postcode,lat:r.result.latitude,lon:r.result.longitude}:null}});
      }else if(q.trim().length>=3){
        // Towns and areas (Ordnance Survey Open Names), after the centres.
        const d=await json(`${POSTCODES}/places?q=${encodeURIComponent(q.trim())}&limit=5`);
        for(const p of (d?.result??[]) as Array<{name_1:string;county_unitary:string|null;region:string|null;local_type:string;latitude:number;longitude:number}>)
          results.push({label:p.name_1,detail:[p.local_type,p.county_unitary??p.region].filter(Boolean).join(' · '),pick:async()=>({label:p.name_1,lat:p.latitude,lon:p.longitude})});
      }
    }catch{/* offline or slow: the test centres shown are enough */}
    if(mine!==seq)return;
    show(results);
    if(results.length===0&&q.trim().length>=3)status.textContent='Nothing found. Try a test centre, a town or a full postcode, or browse the centres below.';
  };
  input.addEventListener('input',()=>{
    clearTimeout(timer);
    status.textContent='';
    const q=input.value;
    if(q.trim().length<2){list.hidden=true;return}
    const mine=++seq;
    // Test centres show straight away; the online lookups wait for a pause in typing.
    timer=window.setTimeout(()=>void search(q,mine),120);
  });
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();(list.querySelector('button') as HTMLButtonElement|null)?.click()}});
}
