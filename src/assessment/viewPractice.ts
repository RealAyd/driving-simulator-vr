import {IMPROVE,worldToLocal,type Pose,type Seconds,type SimEvent,type SimModule} from '../contracts';
import type {PassingVehicle} from '../actors/passingVehicle';

/**
 * Beside the learner, outside door-mirror coverage (vehicle-local metres,
 * other vehicle's centre). The door mirrors cover 3–21° (driver) and
 * -1–25° (passenger) outward from straight back, so an overtaking car leaves
 * the mirror when its centre is about level with the learner's, and is seen
 * directly once it is about 2 m ahead. Checked against rendered mirror pixels
 * in tests/browser/g3-mirrors.spec.ts.
 */
export function blindSpotSide(learner:Pose,other:Pose):'left'|'right'|null{
  const p=worldToLocal(learner,other.position);
  if(p.z<-2.2||p.z>.4)return null;
  if(p.x>=1.2&&p.x<=4.5)return 'right';
  if(p.x<=-1.2&&p.x>=-4.5)return 'left';
  return null;
}

const VIEW_NAMES:Record<string,string>={
  'interior':'interior mirror','right-door':'right door mirror','left-door':'left door mirror',
  'right-shoulder':'right shoulder','left-shoulder':'left shoulder'
};

/**
 * Practice notes for the mirror and blind-spot check. Not scored: it reports
 * which views were used (and how they were selected) and whether a shoulder
 * check happened while each passing road user was in a blind spot.
 */
export class ViewPracticeSummary implements SimModule{
  readonly id='view-practice';
  private readonly visits=new Map<string,{side:'left'|'right';checked:boolean}[]>();
  private readonly current=new Map<string,{side:'left'|'right';checked:boolean}|null>();

  constructor(
    private readonly passers:PassingVehicle[],
    private readonly learner:()=>Pose,
    private readonly events:()=>readonly SimEvent[],
    private readonly now:()=>Seconds
  ){}

  fixedUpdate():void{
    const pose=this.learner();
    const recent=this.events().filter(e=>e.type==='observation.dwell'&&this.now()-e.time<.05);
    for(const p of this.passers){
      const side=blindSpotSide(pose,p.pose);
      let visit=this.current.get(p.id)??null;
      if(side&&!visit){
        visit={side,checked:false};
        this.current.set(p.id,visit);
        const list=this.visits.get(p.id)??[];
        list.push(visit);
        this.visits.set(p.id,list);
      }else if(!side&&visit){
        this.current.set(p.id,null);
        visit=null;
      }
      if(visit&&recent.some(e=>e.payload['target']===`${visit!.side}-shoulder`))visit.checked=true;
    }
  }

  /** Plain-language notes for the results screen. */
  notes(names:Record<string,string>):string[]{
    const out:string[]=[];
    const used=new Map<string,Set<string>>();
    for(const e of this.events())if(e.type==='observation.dwell'){
      const key=VIEW_NAMES[String(e.payload['target'])]??String(e.payload['target']);
      const set=used.get(key)??new Set<string>();
      set.add(String(e.payload['source']));
      used.set(key,set);
    }
    out.push(used.size
      ?'Views used: '+[...used].map(([v,s])=>`${v} (${[...s].join(', ')})`).join('; ')+'.'
      :IMPROVE+'No mirror or shoulder views were used.');
    for(const [id,list] of this.visits){
      for(const v of list){
        out.push(v.checked
          ?`You checked over your ${v.side} shoulder while the ${names[id]??id} was in your ${v.side} blind spot.`
          :IMPROVE+`The ${names[id]??id} passed through your ${v.side} blind spot without a ${v.side} shoulder check.`);
      }
    }
    out.push('Looking at a mirror shows where you pointed the view, not what you noticed.');
    return out;
  }

  reset():void{
    this.visits.clear();
    this.current.clear();
  }

  dispose():void{}
}
