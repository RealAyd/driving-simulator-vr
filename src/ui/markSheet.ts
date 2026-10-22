import type {AttemptResult,Finding,Severity,Vec2} from '../contracts';

/**
 * The mock test report in the shape of the DVSA driving test report (DL25): the sections in the sheet's order, a
 * stroke for each driving fault, S and D for serious and dangerous faults, the totals and the verdict; and a map of
 * the drive with each fault where it happened.
 */

/** DL25 sections, in the sheet's order, and the marking rules recorded under each. */
export const DL25_SECTIONS:ReadonlyArray<{label:string;rules:readonly string[]}>=[
  {label:'Vehicle checks',rules:['vehicle-checks']},
  {label:'Move off – safely',rules:['moving-off-safety']},
  {label:'Use of mirrors – signalling',rules:['mirrors-signalling']},
  {label:'Use of mirrors – change direction',rules:['mirrors-change-direction']},
  {label:'Use of mirrors – change speed',rules:['mirrors-change-speed']},
  {label:'Signals – necessary',rules:['signals-necessary']},
  {label:'Signals – correctly',rules:['signals-correctly']},
  {label:'Signals – timed',rules:['signals-timed']},
  {label:'Response to signs/signals – traffic lights',rules:['traffic-lights']},
  {label:'Use of speed',rules:['speed-limit']},
  {label:'Following distance',rules:['following-distance']},
  {label:'Progress – undue hesitation',rules:['traffic-lights-hesitation']},
  {label:'Junctions – approach speed',rules:['junctions-approach-speed']},
  {label:'Junctions – observation',rules:['junctions-observation']},
  {label:'Control – steering',rules:['positioning-pavement','control-off-road']},
  {label:'Positioning – normal driving',rules:['positioning-normal']},
  {label:'Position / normal stops',rules:['normal-stops']},
  {label:'Awareness and planning',rules:['control-collision']}
];

export interface SheetRow{label:string;driving:number;serious:number;dangerous:number}

/** The sheet's rows that have a mark, in the sheet's order (a rule not on it goes last, under its own name). */
export function markSheet(findings:readonly Finding[]):SheetRow[]{
  const rows=new Map<string,SheetRow>();
  const sectionOf=(rule:string)=>DL25_SECTIONS.find(s=>s.rules.includes(rule))?.label??rule.replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
  for(const f of findings){
    if(f.severity==='advice')continue;
    const label=sectionOf(f.ruleId);
    const row=rows.get(label)??{label,driving:0,serious:0,dangerous:0};
    if(f.severity==='minor')row.driving++;else row[f.severity]++;
    rows.set(label,row);
  }
  const order=(l:string)=>{const i=DL25_SECTIONS.findIndex(s=>s.label===l);return i<0?DL25_SECTIONS.length:i};
  return [...rows.values()].sort((a,b)=>order(a.label)-order(b.label));
}

export interface DriveMap{
  roads:Vec2[][];
  /** Where the car was, about once a second. */
  track:Array<{t:number;x:number;z:number}>;
}
export interface SheetExtras{
  /** What the route had: its length and time, and the kinds of junction on it. */
  route:{metres:number;seconds:number;kinds:string[]};
  map:DriveMap|null;
}

const SVG='http://www.w3.org/2000/svg';
function el<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,className?:string):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}
const svg=(tag:string,attrs:Record<string,string|number>)=>{
  const node=document.createElementNS(SVG,tag);
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
  return node;
};

/** Where the car was at `t` (between the samples either side). */
export function positionAt(track:DriveMap['track'],t:number):Vec2|null{
  if(track.length===0)return null;
  let i=track.findIndex(p=>p.t>=t);
  if(i<0)i=track.length-1;
  const b=track[i]!,a=track[Math.max(0,i-1)]!;
  const k=b.t>a.t?Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))):1;
  return {x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k};
}

const SEV_CLASS:Record<Exclude<Severity,'advice'>,string>={minor:'pin-driving',serious:'pin-serious',dangerous:'pin-dangerous'};

/** The map: the streets round the drive, the way driven, the start and finish, a numbered pin for each fault. */
function driveMap(map:DriveMap,faults:Array<{n:number;f:Finding;at:Vec2}>):SVGSVGElement|null{
  const pts=[...map.track,...faults.map(f=>f.at)];
  if(map.track.length<2)return null;
  const pad=40;
  const x0=Math.min(...pts.map(p=>p.x))-pad,x1=Math.max(...pts.map(p=>p.x))+pad;
  const z0=Math.min(...pts.map(p=>p.z))-pad,z1=Math.max(...pts.map(p=>p.z))+pad;
  const w=x1-x0,h=z1-z0,scale=Math.max(w,h)/600;
  const root=svg('svg',{viewBox:`${x0} ${z0} ${w} ${h}`,class:'drive-map',role:'img','aria-label':'Map of the drive, with each fault where it happened'}) as SVGSVGElement;
  const line=(p:Vec2[])=>p.map((q,i)=>`${i?'L':'M'}${q.x.toFixed(1)} ${q.z.toFixed(1)}`).join('');
  const near=(r:Vec2[])=>r.some(p=>p.x>x0-50&&p.x<x1+50&&p.z>z0-50&&p.z<z1+50);
  for(const r of map.roads)if(near(r))root.append(svg('path',{d:line(r),class:'map-road','stroke-width':9*scale}));
  root.append(svg('path',{d:line(map.track),class:'map-track','stroke-width':4*scale}));
  const start=map.track[0]!,end=map.track.at(-1)!;
  root.append(svg('circle',{cx:start.x,cy:start.z,r:7*scale,class:'map-start'}),svg('rect',{x:end.x-6*scale,y:end.z-6*scale,width:12*scale,height:12*scale,class:'map-end'}));
  // Pins at the same place fan out round it, so each number can be read.
  const drawnAt:Vec2[]=[];
  for(const {n,f,at:spot} of faults){
    let at=spot;
    const r=22*scale;
    for(let k=1;drawnAt.some(p=>Math.hypot(p.x-at.x,p.z-at.z)<r)&&k<12;k++)at={x:spot.x+Math.cos(k*1.1)*r*(1+k/6),z:spot.z+Math.sin(k*1.1)*r*(1+k/6)};
    drawnAt.push(at);
    const g=svg('g',{class:`map-pin ${SEV_CLASS[f.severity as Exclude<Severity,'advice'>]}`});
    g.append(svg('circle',{cx:at.x,cy:at.z,r:11*scale}));
    const label=svg('text',{x:at.x,y:at.z+4*scale,'font-size':12*scale,'text-anchor':'middle'});
    label.textContent=String(n);
    const title=svg('title',{});title.textContent=`${n}. ${f.explanation}`;
    g.append(label,title);
    root.append(g);
  }
  return root;
}

/** Fills `box` with the marking sheet, the route line and the map (a mock test only); true when the map's key lists
 * every fault (the separate list of findings is then not needed). */
export function renderMarkSheet(box:HTMLElement,result:AttemptResult,extras:SheetExtras|null):boolean{
  const mock=result.mockTest;
  box.replaceChildren();
  box.hidden=!mock;
  if(!mock)return false;
  const verdict=!mock.finished?'ENDED EARLY':mock.passed?'PASSED':'NOT PASSED';
  box.append(el('div',verdict,`stamp ${!mock.finished?'stamp-early':mock.passed?'stamp-pass':'stamp-fail'}`));
  if(extras){
    const {metres,seconds,kinds}=extras.route;
    box.append(el('p',[`${(metres/1609.34).toFixed(1)} mile route`,`${Math.max(1,Math.round(seconds/60))} min`,...(kinds.length?[kinds.join(', ')]:[])].join(' · '),'sheet-route'));
  }
  const table=el('table',undefined,'mark-sheet');
  const head=el('tr');
  for(const [t,c] of [['Section','sec'],['Driving','drv'],['S','s'],['D','d']] as const)head.append(el('th',t,c));
  table.append(el('thead'),el('tbody'),el('tfoot'));
  table.tHead!.append(head);
  const rows=markSheet(result.findings);
  for(const r of rows){
    const tr=el('tr');
    const tally=el('td','/'.repeat(r.driving),'drv tally');
    tally.setAttribute('aria-label',`${r.driving} driving fault${r.driving===1?'':'s'}`);
    tr.append(el('td',r.label,'sec'),tally,el('td',r.serious?'S':'','s'),el('td',r.dangerous?'D':'','d'));
    table.tBodies[0]!.append(tr);
  }
  if(rows.length===0){const tr=el('tr');const td=el('td','No faults recorded.','sec none');td.colSpan=4;tr.append(td);table.tBodies[0]!.append(tr)}
  const total=el('tr');
  total.append(el('td','Total','sec'),el('td',String(mock.driving),`drv${mock.driving>15?' nonzero':''}`),el('td',String(mock.serious),`s${mock.serious?' nonzero':''}`),el('td',String(mock.dangerous),`d${mock.dangerous?' nonzero':''}`));
  table.tFoot!.append(total);
  box.append(table,el('p','Pass: 15 or fewer driving faults and no serious or dangerous faults.','sheet-rule'));
  // The map, with the faults numbered in the order they happened.
  const map=extras?.map;
  if(map){
    // (Vehicle checks happen before the drive, not anywhere on it: on the sheet, not the map.)
    const placed=(f:Finding)=>f.severity!=='advice'&&f.ruleId!=='vehicle-checks';
    const faults=result.findings.filter(placed).sort((a,b)=>a.time-b.time)
      .map((f,i)=>({n:i+1,f,at:positionAt(map.track,f.time)})).filter((x):x is {n:number;f:Finding;at:Vec2}=>!!x.at);
    const drawn=driveMap(map,faults);
    if(drawn){
      const fig=el('figure',undefined,'sheet-map');
      fig.append(drawn);
      const key=el('ol',undefined,'map-key');
      for(const {n,f} of faults){const li=el('li',undefined,`key-${f.severity}`);li.value=n;li.append(el('b',`${n}.`),document.createTextNode(` ${f.explanation}`));key.append(li)}
      const cap=el('figcaption','Your drive: ● start, ■ finish; numbered pins are faults (orange driving, red serious, dark red dangerous).');
      fig.append(cap);
      box.append(fig);
      if(faults.length)box.append(key);
      return faults.length===result.findings.filter(placed).length;
    }
  }
  return false;
}
