/**
 * Full screen. Where the browser allows it (Android, iPad, desktop) the page goes full screen and turns to
 * landscape; Safari on iPhone does not let a page cover the screen, so the button explains Add to Home Screen
 * instead (the app then opens full screen, in landscape: public/manifest.webmanifest). Hidden once installed.
 */
type FsDoc=Document&{webkitFullscreenEnabled?:boolean;webkitFullscreenElement?:Element|null;webkitExitFullscreen?:()=>void};
type FsEl=HTMLElement&{webkitRequestFullscreen?:()=>void};

export const installed=()=>matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true;

/** The page is in full screen (the Fullscreen API), or opened as the installed app (which is full screen). */
export function fullScreenNow():boolean{
  const doc=document as FsDoc;
  return installed()||!!(doc.fullscreenElement||doc.webkitFullscreenElement);
}

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

/** A phone or tablet held upright (a touch screen in portrait). */
export const portraitTouch=()=>matchMedia('(orientation: portrait) and (pointer: coarse)').matches;

/**
 * Starting a drive on a phone held upright: where the browser allows it (Android), full screen turned to landscape.
 * Call from the tap that starts the drive (browsers allow full screen only then). Elsewhere (iPhone) nothing happens:
 * the drive asks for the phone to be turned instead.
 */
export async function preferLandscape():Promise<void>{
  if(!portraitTouch())return;
  const doc=document as FsDoc;
  try{
    if(!(doc.fullscreenElement||doc.webkitFullscreenElement)&&doc.fullscreenEnabled)await document.documentElement.requestFullscreen({navigationUI:'hide'});
    await (screen.orientation as ScreenOrientation&{lock?:(o:string)=>Promise<void>}).lock?.('landscape');
  }catch{/* not allowed here: the turn-your-phone screen asks instead */}
}
