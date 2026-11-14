/**
 * The leaderboard on the account screen (GET /api/board): the learner's test centre this week, the top ten, where they
 * are, last week's leader, and whether (and how) their own name shows.
 */

export interface Board{
  centre:string|null;name?:string;week:{from:string};
  settings:{show:boolean;name:string;school?:string;hidden?:boolean};
  top:Array<{rank:number;name:string;school:string|null;points:number;tests:number;passes:number;me:boolean}>;
  me:{rank:number;points:number;of:number}|null;
  leader:{name:string;school:string|null;points:number}|null;
}

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls?:string,text?:string)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
};
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]??'th'}`;

/** Fills `box` with the board; before the learner's first mock test, an invitation to join (`start` opens Mock Tests). */
export function renderBoard(box:HTMLElement,b:Board,save:(s:{show:boolean;name:string;school:string})=>Promise<string|null>,start:()=>void):void{
  box.hidden=false;
  if(!b.centre){
    const join=el('div','board-join');
    const go=el('button','','Start a mock test');go.type='button';go.addEventListener('click',start);
    join.append(el('b','','Join the leaderboard by completing a mock test'),go);
    box.replaceChildren(el('h3','','Leaderboard'),join);
    return;
  }
  const parts:HTMLElement[]=[el('h3','',`Leaderboard · ${b.name} · this week`)];
  if(b.top.length){
    const list=el('ol','board-list');
    for(const r of b.top){
      const li=el('li',r.me?'me':'');
      const who=el('span','board-who');who.append(el('b','',r.name),...(r.school?[el('small','',r.school)]:[]));
      li.append(el('span','board-rank',String(r.rank)),who,el('span','board-points',`${r.points}`));
      list.append(li);
    }
    parts.push(list);
  }
  if(b.me&&!b.top.some(r=>r.me))parts.push(el('p','board-me',`You: ${ordinal(b.me.rank)} of ${b.me.of} · ${b.me.points} points`));
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
