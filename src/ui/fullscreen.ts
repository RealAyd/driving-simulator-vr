/**
 * Full screen. Where the browser allows it (Android, iPad, desktop) the page goes full screen and turns to
 * landscape; Safari on iPhone does not let a page cover the screen, so the button explains Add to Home Screen
 * instead (the app then opens full screen, in landscape: public/manifest.webmanifest). Hidden once installed.
 */
type FsDoc=Document&{webkitFullscreenEnabled?:boolean;webkitFullscreenElement?:Element|null;webkitExitFullscreen?:()=>void};
type FsEl=HTMLElement&{webkitRequestFullscreen?:()=>void};

export const installed=()=>matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true;

export function setUpFullscreen(buttons:HTMLButtonElement[],showHowTo:()=>void):void{
  const doc=document as FsDoc;
  const canGoFull=!!(doc.fullscreenEnabled||doc.webkitFullscreenEnabled);
  const isFull=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
  const refresh=()=>{for(const b of buttons){b.hidden=installed();b.setAttribute('aria-pressed',String(isFull()));b.setAttribute('aria-label',isFull()?'Leave full screen':'Full screen')}};
  for(const b of buttons)b.addEventListener('click',async()=>{
    if(!canGoFull){showHowTo();return}
    try{
      if(isFull()){if(doc.exitFullscreen)await doc.exitFullscreen();else doc.webkitExitFullscreen?.();return}
      const el=document.documentElement as FsEl;
      if(el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});else el.webkitRequestFullscreen?.();
      await (screen.orientation as ScreenOrientation&{lock?:(o:string)=>Promise<void>}).lock?.('landscape').catch(()=>{});
    }catch{showHowTo()}
  });
  for(const type of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(type,refresh);
  refresh();
}
