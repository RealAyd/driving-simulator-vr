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

export function setUpAreaSearch(input:HTMLInputElement,list:HTMLElement,status:HTMLElement,onPick:(r:AreaRequest)=>void,fetcher:typeof fetch=fetch.bind(globalThis)):void{
  let seq=0,timer=0;
  const json=async(url:string)=>{const r=await fetcher(url);return r.ok?r.json():null};
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
    const nq=norm(q);
    // Test centres by name (every word typed appears in the name).
    const words=nq.split(' ').filter(Boolean);
    for(const c of TEST_CENTRES){
      if(results.length>=6)break;
      const byPostcode=!!c.postcode&&c.postcode.replace(/\s/g,'')===q.replace(/\s/g,'').toUpperCase();
      if(byPostcode||words.every(w=>norm(c.name).includes(w)))results.push({label:`${c.name} test centre`,
        detail:[c.passRate!==null?`pass rate ${c.passRate.toFixed(0)}%`:'test centre',c.located==='town'?'area approximate':''].filter(Boolean).join(' · '),
        pick:async()=>({label:`${c.name} test centre`,lat:c.lat,lon:c.lon,testCentre:c.located!=='town'})});
    }
    try{
      if(isPostcode(q)){
        const pc=q.trim().toUpperCase();
        results.unshift({label:pc,detail:'postcode',pick:async()=>{const d=await json(`${POSTCODES}/postcodes/${encodeURIComponent(pc)}`);return d?.result?{label:d.result.postcode,lat:d.result.latitude,lon:d.result.longitude}:null}});
      }else if(isPartialPostcode(q)){
        const d=await json(`${POSTCODES}/postcodes/${encodeURIComponent(q.trim())}/autocomplete?limit=6`);
        for(const pc of (d?.result??[]) as string[])results.push({label:pc,detail:'postcode',pick:async()=>{const r=await json(`${POSTCODES}/postcodes/${encodeURIComponent(pc)}`);return r?.result?{label:r.result.postcode,lat:r.result.latitude,lon:r.result.longitude}:null}});
      }else if(q.trim().length>=3&&results.length<6){
        // Towns and areas (Ordnance Survey Open Names).
        const d=await json(`${POSTCODES}/places?q=${encodeURIComponent(q.trim())}&limit=${6-results.length}`);
        for(const p of (d?.result??[]) as Array<{name_1:string;county_unitary:string|null;region:string|null;local_type:string;latitude:number;longitude:number}>)
          results.push({label:p.name_1,detail:[p.local_type,p.county_unitary??p.region].filter(Boolean).join(' · '),pick:async()=>({label:p.name_1,lat:p.latitude,lon:p.longitude})});
      }
    }catch{if(mine===seq)status.textContent='No connection: searching needs the internet.'}
    if(mine!==seq)return;
    show(results);
    if(results.length===0&&q.trim().length>=3)status.textContent='Nothing found. Try a test centre, a town or a full postcode.';
  };
  input.addEventListener('input',()=>{
    clearTimeout(timer);
    status.textContent='';
    const q=input.value;
    if(q.trim().length<2){list.hidden=true;return}
    const mine=++seq;
    timer=window.setTimeout(()=>void search(q,mine),220);
  });
  input.addEventListener('keydown',e=>{if(e.key==='Enter')(list.querySelector('button') as HTMLButtonElement|null)?.click()});
}
