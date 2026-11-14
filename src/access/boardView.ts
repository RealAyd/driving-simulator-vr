/**
 * The leaderboard on the account screen (GET /api/board): the learner's test centre this week, the top ten, where they
 * are, last week's leader, and whether (and how) their own name shows.
 */

export interface Board{
  centre:string|null;name?:string;week:{from:string};
  settings:{show:boolean;name:string;school?:string;hidden?:boolean};
  top:Array<{rank:number;name:string;school:string|null;points:number;tests:number;passes:number;me:boolean}>;
  me:{rank:number;points:number;of:number;top?:number}|null;
  leader:{name:string;school:string|null;points:number}|null;
}

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls?:string,text?:string)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
};
export const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]??'th'}`;

/** Fills `box` with the board; before the learner's first mock test, an invitation to join (`start` opens Mock Tests). */
/** What a learner shares: their place (if any), and what a friend gets from their link. */
export function shareText(b:Board):string{
  const where=b.centre==='uk'?'in the UK':`at ${b.name}`;
  const got=b.me?`I'm ${b.me.top?`in the top ${b.me.top}% `:''}${where} this week on Driving Practice: ${ordinal(b.me.rank)} of ${b.me.of}. `:'';
  return `${got}Practise your driving test on real UK roads. Join with my link and get 2 free drives. If you top the weekly leaderboard, we both win free unlimited drives.`;
}

export function renderBoard(box:HTMLElement,b:Board,save:(s:{show:boolean;name:string;school:string})=>Promise<string|null>,start:()=>void,share:(text:string)=>void):void{
  box.hidden=false;
  if(!b.centre){
    const join=el('div','board-join');
    const go=el('button','','Start a mock test');go.type='button';go.addEventListener('click',start);
    join.append(el('b','','Join the leaderboard by completing a mock test'),go);
    box.replaceChildren(join);
    return;
  }
  const parts:HTMLElement[]=[el('h3','',`${b.name} · this week`)];
  // The top three on a podium (second, first, third), the rest in a list.
  if(b.top.length){
    const podium=el('div','podium');
    for(const [k,cls] of [[1,'p2'],[0,'p1'],[2,'p3']] as const){
      const r=b.top[k],slot=el('div',cls+(r?.me?' me':''));
      if(r)slot.append(el('span','who',r.name),el('span','pts',`${r.points} pts`));
      slot.append(el('span','block',String(k+1)));
      podium.append(slot);
    }
    parts.push(podium);
  }
  if(b.top.length>3){
    const list=el('ol','board-list');
    for(const r of b.top.slice(3)){
      const li=el('li',r.me?'me':'');
      const who=el('span','board-who');who.append(el('b','',r.name),...(r.school?[el('small','',r.school)]:[]));
      li.append(el('span','board-rank',String(r.rank)),who,el('span','board-points',`${r.points}`));
      list.append(li);
    }
    parts.push(list);
  }
  if(b.me)parts.push(el('p','board-me',`${b.me.top?`Top ${b.me.top}% · `:''}${ordinal(b.me.rank)} of ${b.me.of} · ${b.me.points} points`));
  const shareButton=el('button','primary board-share',b.me?'Share and invite friends':'Invite friends');shareButton.type='button';
  shareButton.addEventListener('click',()=>share(shareText(b)));
  parts.push(shareButton,el('p','board-perk','Friends get 2 free drives. When one wins, you win too.'));
  if(b.leader)parts.push(el('p','board-leader',`Leader last week: ${b.leader.name}${b.leader.school?` (${b.leader.school})`:''}`));
  // Their name on the board: off until they choose it.
  const form=el('details','board-settings');
  const summary=el('summary','',b.settings.show?`Shown as ${b.settings.name}`:'Show my name on the board');
  const show=el('input');show.type='checkbox';show.checked=b.settings.show;show.id='board-show';
  const showLabel=el('label','board-check');showLabel.append(show,' Show my name');
  const name=el('input');name.id='board-name';name.placeholder='Your name or an app name';name.maxLength=24;name.value=b.settings.name;name.setAttribute('autocomplete','nickname');
  const school=el('input');school.id='board-school';school.placeholder='Driving school (optional)';school.maxLength=40;school.value=b.settings.school??'';
  const button=el('button','','Save');button.type='button';
  const status=el('p','board-status');status.setAttribute('role','status');
  if(b.settings.hidden)status.textContent='Your name is hidden from the board.';
  button.addEventListener('click',async()=>{
    status.textContent='Saving…';
    status.textContent=await save({show:show.checked,name:name.value,school:school.value})??'Saved.';
  });
  form.append(summary,showLabel,name,school,button,status);
  parts.push(form);
  box.replaceChildren(...parts);
}
