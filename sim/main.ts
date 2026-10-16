import {boot} from '../src/app/main';

boot().catch(error=>{
  console.error('[Driving Practice] startup failed',error);
  const screen=document.getElementById('screen-error');
  const message=document.getElementById('error-message');
  if(screen&&message&&screen.hidden){
    message.textContent=(error as Error)?.message??String(error);
    screen.hidden=false;
    document.getElementById('screen-loading')?.setAttribute('hidden','');
  }
});
