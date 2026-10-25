/**
 * Light or dark menus (the home screen and the other screens; the driving view keeps its own look over the road).
 * public/theme.js sets it as the page loads: the daylight in Great Britain until the driver chooses here; the choice
 * is remembered on this device. This is the menu's button.
 */
type Theme='light'|'dark';
type DpTheme={KEY:string;saved():Theme|null;current():Theme;apply():void};
const dpTheme=()=>(window as unknown as {dpTheme?:DpTheme}).dpTheme;

export function setUpTheme(button:HTMLButtonElement):void{
  const shown=():Theme=>document.documentElement.dataset['theme']==='light'?'light':'dark';
  const render=()=>{
    const theme=shown();
    button.setAttribute('aria-pressed',String(theme==='light'));
    button.setAttribute('aria-label',theme==='light'?'Light mode. Tap for dark mode':'Dark mode. Tap for light mode');
    button.querySelector('span')!.textContent=theme==='light'?'Light':'Dark';
  };
  button.addEventListener('click',()=>{
    const next:Theme=shown()==='light'?'dark':'light';
    try{localStorage.setItem(dpTheme()?.KEY??'dp.theme.v1',next)}catch{/* this visit only */}
    document.documentElement.dataset['theme']=next;
    render();
  });
  // (Dusk and dawn change it while the page is open, until the driver has chosen.)
  setInterval(()=>{if(dpTheme()&&!dpTheme()!.saved()){dpTheme()!.apply();render()}},60_000);
  if(!document.documentElement.dataset['theme'])dpTheme()?.apply();
  render();
}
