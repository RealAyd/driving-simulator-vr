/**
 * After an update the previous build's files are gone from the server. A page loaded before the update (a tab left
 * open, or one the phone restored from its cache) then fails to fetch the parts it loads later, such as the 3D model
 * loader, and the cars are drawn as plain boxes. When that happens before a drive has started, the page reloads
 * once, past any cached copy, so it gets the current version; during a drive nothing is interrupted.
 */
const KEY='dp-stale-reload';
export const STALE_EVENT='dp:stale-build';

/** A failed import of one of the app's own files (Chrome, Safari and Firefox word it differently). */
export function isStaleImport(error:unknown):boolean{
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload/i.test(String((error as Error)?.message??error));
}

export function reportStaleBuild():void{window.dispatchEvent(new Event(STALE_EVENT))}

/** Reloads the page fresh when the build is stale, unless `busy` (a drive under way), at most once a minute. */
export function reloadWhenStale(busy:()=>boolean):void{
  const handle=(event:Event)=>{
    if(busy())return;
    try{const last=Number(sessionStorage.getItem(KEY)??0);if(Date.now()-last<60_000)return;sessionStorage.setItem(KEY,String(Date.now()))}catch{return}
    event.preventDefault();
    const url=new URL(location.href);url.searchParams.set('v',String(Date.now()));
    location.replace(url.toString());
  };
  window.addEventListener('vite:preloadError',handle);
  window.addEventListener(STALE_EVENT,handle);
}
