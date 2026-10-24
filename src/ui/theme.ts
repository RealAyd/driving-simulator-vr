/**
 * Light or dark menus (the home screen and the other screens; the driving view keeps its own look over the road).
 * The phone's setting is followed until the driver chooses; the choice is remembered on this device.
 */
type Theme='light'|'dark';
const KEY='dp.theme.v1';

export function setUpTheme(button:HTMLButtonElement):void{
  const saved=():Theme|null=>{try{const v=localStorage.getItem(KEY);return v==='light'||v==='dark'?v:null}catch{return null}};
  const system=window.matchMedia?.('(prefers-color-scheme: light)');
  const current=():Theme=>saved()??(system?.matches?'light':'dark');
  const apply=()=>{
    const theme=current();
    document.documentElement.dataset['theme']=theme;
    button.setAttribute('aria-pressed',String(theme==='light'));
    button.setAttribute('aria-label',theme==='light'?'Light mode. Tap for dark mode':'Dark mode. Tap for light mode');
    button.querySelector('span')!.textContent=theme==='light'?'Light':'Dark';
  };
  button.addEventListener('click',()=>{
    try{localStorage.setItem(KEY,current()==='light'?'dark':'light')}catch{/* this visit only */}
    if(!saved())document.documentElement.dataset['theme']=current()==='light'?'dark':'light';
    apply();
  });
  system?.addEventListener?.('change',()=>{if(!saved())apply()});
  apply();
}
