/**
 * Driving test words in plain English, for anyone new to them (the briefings, the instructor and the report use
 * them). Opened from the home screen, a briefing and the report ("Words explained").
 */
export const GLOSSARY:ReadonlyArray<{term:string;means:string}>=[
  {term:'Mirrors – Signal – Position – Speed – Look (MSPSL)',means:'The routine for every turn and change of lane, in this order: check your mirrors (the inside one first, then the one on the side you are turning to), signal, move to the right place in the road, slow down, and look into the new road before you go.'},
  {term:'Blind spot',means:'The area beside and just behind the car that your mirrors cannot show. You see it by looking over your shoulder.'},
  {term:'Interior mirror',means:'The mirror in the middle of the windscreen. It shows what is behind you.'},
  {term:'Door mirrors',means:'The mirrors on the outside of each front door. They show what is behind and beside you on that side.'},
  {term:'Signal (indicator)',means:'The flashing light that tells others you are turning or pulling in or out. Signal after checking your mirrors, in good time, and cancel it after the turn.'},
  {term:'Give way',means:'Let other traffic go first. At give way lines you stop if you need to; at a stop sign you must always stop.'},
  {term:'Priority',means:'Who goes first. For example, traffic on the main road has priority over traffic coming out of a side road.'},
  {term:'Emerging',means:'Coming out of a side road onto another road, usually at a T-junction.'},
  {term:'Crossroads',means:'Where two roads cross each other, so traffic can come from four directions.'},
  {term:'Mini-roundabout',means:'A small roundabout painted on the road (a white circle). Give way to traffic from your right.'},
  {term:'Kerb',means:'The raised edge between the road and the pavement.'},
  {term:'Moving off',means:'Pulling away from where the car is parked or stopped. Look all round first, and look right again just before you go.'},
  {term:'Pull up',means:'Stop at the side of the road, close to the kerb, somewhere safe and legal.'},
  {term:'Emergency stop (controlled stop)',means:'Stopping as quickly and safely as you can, as if a child had run out. Brake firmly at once and keep the car straight.'},
  {term:'Parallel parking',means:'Reversing into a space at the kerb behind a parked car, finishing close to the kerb and level with it.'},
  {term:'Reverse / right',means:'Pulling up on the right-hand side of the road, reversing about two car lengths, then rejoining the traffic.'},
  {term:'Tell me / show me questions',means:'The vehicle safety questions on the test: one asked before you drive (tell me how you would…), one while driving (show me how you would…).'},
  {term:'Driving fault',means:'A minor mistake. You can have up to 15 and still pass, but more than a few of the same kind shows something to practise.'},
  {term:'Serious fault (S)',means:'A mistake that could have been dangerous. One serious fault fails the test.'},
  {term:'Dangerous fault (D)',means:'A mistake that was dangerous to you, the public or property. One dangerous fault fails the test.'},
  {term:'Marking sheet (DL25)',means:'The form examiners use on the real test. Our report is laid out the same way, with a stroke for each driving fault.'},
  {term:'Mock test',means:'A practice of the real driving test: an examiner gives directions and marks your driving. Nothing here is an official test.'},
  {term:'Assisted steering',means:'The app steers for you so you can learn speed, mirrors, signals and observation first. You can steer yourself at any time.'},
  {term:'Highway Code',means:'The official rules for everyone using roads in Great Britain. Lessons tell you which rules they cover.'}
];

/** Opens the "Words explained" dialog (made once). */
export function openGlossary():void{
  let dialog=document.getElementById('glossary') as HTMLDialogElement|null;
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='glossary';dialog.className='glossary';
    dialog.setAttribute('aria-labelledby','glossary-title');
    const h=document.createElement('h2');h.id='glossary-title';h.textContent='Words explained';
    const list=document.createElement('dl');
    for(const g of GLOSSARY){
      const dt=document.createElement('dt');dt.textContent=g.term;
      const dd=document.createElement('dd');dd.textContent=g.means;
      list.append(dt,dd);
    }
    const close=document.createElement('button');close.type='button';close.className='primary';close.textContent='Close';
    close.addEventListener('click',()=>dialog!.close());
    dialog.append(h,list,close);
    document.body.append(dialog);
  }
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}

/** Text size: normal, large or larger (remembered on this device). */
export type TextSize='normal'|'large'|'larger';
const TEXT_KEY='dp-text-size';
export function loadTextSize():TextSize{
  try{const v=localStorage.getItem(TEXT_KEY);return v==='large'||v==='larger'?v:'normal'}catch{return 'normal'}
}
export function applyTextSize(size:TextSize):void{
  document.documentElement.dataset['text']=size;
  try{localStorage.setItem(TEXT_KEY,size)}catch{/* not kept */}
}
