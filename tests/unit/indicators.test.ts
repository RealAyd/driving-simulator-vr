import {describe,expect,it} from 'vitest';
import {parseLocation,type PassingVehicleActorDef} from '../../src/contracts';
import {PassingVehicle} from '../../src/actors/passingVehicle';
import {Traffic} from '../../src/actors/traffic';
import {kerbFootprints,layoutTownscape} from '../../src/world/townscape';
import {prepareRoundabouts} from '../../src/world/roundabouts';
import {BRENTWOOD_ROUTE_1} from '../../src/decision/routes/brentwoodRoute1';
import {BRENTWOOD_ROUTE_2} from '../../src/decision/routes/brentwoodRoute2';
import {actorDefs} from '../../src/decision/actors';

const node=(m:string)=>import(/* @vite-ignore */ m);

const car=(path:Array<[number,number]>,extra:Partial<PassingVehicleActorDef>={}):PassingVehicle=>new PassingVehicle({
  id:'test-car',kind:'passing-vehicle',body:'car',path:path.map(([x,z])=>({x,z})),speed:8,delaySeconds:0,repeat:false,
  colour:'#888888',yieldsToLearner:false,...extra});

/** Its signal at each metre along its path. */
function signals(v:PassingVehicle):string[]{
  const out:string[]=[];
  for(let s=0;s<v.length;s+=1){
    while(v.travelled<s&&v.travelled<v.length-.01)v.fixedUpdate(Math.min(.05,(s-v.travelled)/v.speed));
    out.push(v.indicating);
  }
  return out;
}

/** North 100 m, then (a corner of radius `r`) a turn of `deg` degrees (right positive), then 60 m on. */
function turnPath(deg:number,r=6):Array<[number,number]>{
  const pts:Array<[number,number]>=[];
  for(let z=0;z>-100;z-=5)pts.push([0,z]);
  const sign=Math.sign(deg),cx=sign*r;
  for(let k=0;k<=12;k++){const a=deg*Math.PI/180*k/12;pts.push([cx-sign*r*Math.cos(a),-100-r*Math.sin(Math.abs(a))])}
  const h=deg*Math.PI/180,[ex,ez]=pts.at(-1)!;
  for(let d=5;d<=60;d+=5)pts.push([ex+Math.sin(h)*d,ez-Math.cos(h)*d]);
  return pts;
}

describe('road users signal for their turns',()=>{
  it('a scripted car signals left from about 35 m before a left turn until it has turned',()=>{
    const plan=signals(car(turnPath(-90)));
    const on=plan.map((s,i)=>s==='left'?i:-1).filter(i=>i>=0);
    expect(plan.every(s=>s!=='right')).toBe(true);
    expect(on[0]).toBeGreaterThan(55);expect(on[0]).toBeLessThan(75);
    expect(on.at(-1)!).toBeLessThan(115);
    expect(plan.at(-1)).toBe('off');
  });

  it('and right for a right turn',()=>{
    const plan=signals(car(turnPath(90)));
    expect(plan.filter(s=>s==='right').length).toBeGreaterThan(30);
    expect(plan.includes('left')).toBe(false);
  });

  it('not for a straight road, nor a gentle bend',()=>{
    expect(signals(car([[0,0],[0,-200]])).every(s=>s==='off')).toBe(true);
    expect(signals(car(turnPath(30,90))).every(s=>s==='off')).toBe(true);
  });

  it('as the scenario says where it says (round a roundabout)',()=>{
    const v=car([[0,0],[0,-200]],{signals:[{from:{x:0,z:-20},to:{x:0,z:-60},side:'right'}]});
    const plan=signals(v);
    expect(plan[10]).toBe('off');expect(plan[40]).toBe('right');expect(plan[100]).toBe('off');
  });

  it('round a mini-roundabout\'s disc: right for a right turn (not left for its first swing), none for ahead',()=>{
    // A right turn round a disc at (0,-100), radius 4: swinging left to pass it on the right, then round to the east.
    const right:Array<[number,number]>=[[0,0],[0,-90],[-2,-95],[-4,-99],[-3.5,-102],[-2,-104],[0,-104.5],[3,-104],[6,-103],[12,-102],[60,-102]];
    const plan=signals(car(right));
    expect(plan.includes('left')).toBe(false);expect(plan.filter(s=>s==='right').length).toBeGreaterThan(30);
    // Ahead: left round it, then back to the line.
    const ahead:Array<[number,number]>=[[0,0],[0,-92],[-2.5,-96],[-4,-100],[-2.5,-104],[0,-108],[0,-200]];
    expect(signals(car(ahead)).every(s=>s==='off')).toBe(true);
  });

  it('a cyclist or someone on foot shows no indicators',()=>{
    expect(signals(car(turnPath(-90),{body:'cyclist'})).every(s=>s==='off')).toBe(true);
  });

  it('the routes\' cars signal for their turns as the Highway Code says',()=>{
    const get=(route:typeof BRENTWOOD_ROUTE_1,id:string)=>new PassingVehicle({...actorDefs(route).find(d=>d.id===id)!,delaySeconds:0});
    const at=(v:PassingVehicle,x:number,z:number)=>{
      let best=Infinity,side='';
      for(let s=0;s<v.length;s+=1){
        while(v.travelled<s&&v.travelled<v.length-.01)v.fixedUpdate(.05);
        const d=Math.hypot(v.pose.position.x-x,v.pose.position.z-z);if(d<best){best=d;side=v.indicating}
      }
      return side;
    };
    // Route 1: the grey car down Kings Road on to Warley Hill, left into Myrtle Road.
    expect(at(get(BRENTWOOD_ROUTE_1,'kings-car'),547,-300),'kings-car').toBe('left');
    // On straight down Kings Road, no signal.
    expect(at(get(BRENTWOOD_ROUTE_1,'kings-car'),566,-420),'kings-car straight').toBe('off');
    // Route 2: the red car along London Road, right into South Weald Road.
    expect(at(get(BRENTWOOD_ROUTE_2,'london-car'),-440,-526),'london-car').toBe('right');
    // The blue car up Warley Hill, right into The Drive at the mini-roundabout.
    expect(at(get(BRENTWOOD_ROUTE_2,'warley-car'),326,582),'warley-car').toBe('right');
  });

  it('background traffic signals before it turns at a junction',async()=>{
    const {gunzipSync}=await node('node:zlib'),{readFileSync}=await node('node:fs');
    const loc=parseLocation(JSON.parse(gunzipSync(readFileSync('public/centres/basildon.json.gz')).toString()).location);
    prepareRoundabouts(loc);
    const learner={pose:{position:{x:175,y:0,z:27},heading:Math.PI/2},speed:0};
    const traffic=new Traffic(loc,{count:14,buses:2,parked:kerbFootprints(layoutTownscape(loc)!),learner:()=>learner,seed:5});
    const drivers=(traffic as unknown as {drivers:Array<{car:{id:string};leg:{road:unknown;ring?:unknown;points:Array<{x:number;z:number}>}}>}).drivers;
    // For each turn made (on to a junction's way through that turns), what it signalled just before.
    const before=new Map<string,string[]>(),last=new Map<string,unknown>();
    let turns=0,signalled=0;
    for(let t=0;t<120;t+=1/30){
      traffic.fixedUpdate(1/30);
      for(const d of drivers){
        const c=traffic.cars.find(x=>x.id===d.car.id)!;
        if(!c.visible){before.delete(c.id);continue}
        const was=last.get(c.id);last.set(c.id,d.leg);
        if(d.leg.road){const b=before.get(c.id)??[];b.push(c.indicating??'off');if(b.length>45)b.shift();before.set(c.id,b);continue}
        if(was===d.leg||d.leg.ring)continue;
        // Just on to a way through a junction.
        const p=d.leg.points,a={x:p[1]!.x-p[0]!.x,z:p[1]!.z-p[0]!.z},b={x:p.at(-1)!.x-p.at(-2)!.x,z:p.at(-1)!.z-p.at(-2)!.z};
        const turn=Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z);
        if(Math.abs(turn)<1)continue;
        const want=turn>0?'right':'left',b0=before.get(c.id)??[];
        if(b0.length<45)continue;
        turns++;
        if(b0.slice(-30).every(s=>s===want))signalled++;
      }
    }
    expect(turns).toBeGreaterThan(5);
    expect(signalled).toBe(turns);
  },120_000);
});
