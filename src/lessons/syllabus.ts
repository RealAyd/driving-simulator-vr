import type {ManoeuvreKind} from '../test/manoeuvres';
import type {Location,Road} from '../contracts';
import type {JunctionChoice,RoadNetwork,RoadPos,Route} from '../test/route';

/**
 * Driving lessons: one topic each, in the order a learner usually meets them, taught to the UK standard (The
 * Highway Code, and DVSA's National standard for driving cars and light vans). Each lesson has the instructor's
 * briefing (spoken and shown before the drive), a route on the place's real streets chosen for that topic's
 * junctions, and the points the instructor coaches and gives feedback on as you drive. Not a test: there is no
 * pass or fail; the report says what went well and what to work on. Draft content, not reviewed by an ADI.
 */

export type Coaching=
  /** Mirrors, signal, position, speed, look at every turn (the routine for all lessons). */
  |'routine'
  /** Emerging from a road end: stop or give way at the line, look right, left, right. */
  |'emerge'
  /** Turning right: position just left of the middle, give way to oncoming traffic. */
  |'right-turn'
  /** Mini-roundabouts: give way to the right; signals for the exit. */
  |'roundabout'
  /** Traffic lights: stop at red and amber, go on green only if the way is clear. */
  |'lights'
  /** Pedestrian crossings: look for people, be ready to stop, never stop on the zig-zags. */
  |'crossings'
  /** When to signal and when not to (straight ahead: no signal). */
  |'signals'
  /** Pulling up on the left and moving off again, several times. */
  |'stops';

export interface Lesson{
  id:string;
  number:number;
  title:string;
  /** One line for the lesson list. */
  summary:string;
  /** What the learner will be able to do. */
  objective:string;
  /** The instructor's briefing, paragraphs (the first is spoken when the drive starts). */
  briefing:string[];
  /** The Highway Code rules it rests on (for the report and further reading). */
  rules:string;
  coaching:Coaching[];
  /** Route length (metres) and how much each step counts towards the lesson's topic. */
  length:number;
  score:(j:JunctionChoice)=>number;
  /** A junction the route must reach (the area's mini-roundabout or traffic lights), by the shortest way there. */
  goal?:(j:JunctionChoice)=>boolean;
  /** Extra score for a route (crossings passed, for example). */
  routeScore?:(route:Route,location:Location)=>number;
  /** What the lesson needs from the area, said when the area has none. */
  needs?:string;
  /** Manoeuvres asked for along the drive (manoeuvres.ts). */
  manoeuvres?:readonly ManoeuvreKind[];
}

/** Crossings the route drives over (zebra and signal crossings on the roads and stretches it uses). */
export function crossingsOn(route:Route,location:Location):number{
  let n=0;
  for(const c of location.crossings)
    if(route.legs.some(l=>l.road.id===c.roadId&&c.along>=Math.min(l.from,l.to)-1&&c.along<=Math.max(l.from,l.to)+1))n++;
  return n;
}

export const LESSONS:readonly Lesson[]=[
  {id:'moving-off-stopping',number:1,title:'Moving off and stopping',summary:'Prepare, observe, move off; pull up on the left safely.',
    objective:'Move off safely from the side of the road and pull up again close to the kerb in a safe, legal place.',
    briefing:[
      'In this lesson we\'ll practise moving off and stopping. Before you move off: look all round (mirrors and both blind spots), then look right again just before you go, as things keep changing. Signal only if it would help someone. When I ask you to pull up, check your mirrors, signal left if it helps others, and stop close to the kerb.',
      'Moving off: prepare the car, then observe all round (mirrors and the blind spot over your right shoulder), and move off only when it is safe, without making anyone change speed or direction.',
      'Pulling up: choose a safe, legal place. Not within 10 metres of a junction, not on the zig-zags of a crossing, not at a bus stop, and not tight behind a parked car. Stop parallel to and close to the kerb, about a drain\'s width away.'
    ],
    rules:'Highway Code rules 159–161 (moving off, once moving, mirrors), 239–243 (waiting and parking).',
    coaching:['routine','stops'],length:1400,score:()=>1},
  {id:'left-turns',number:2,title:'Turning left into side roads',summary:'Mirrors, signal, position, speed, look (MSPSL) for left turns.',
    objective:'Turn left into side roads using the full routine, at a safe speed, keeping to the left.',
    briefing:[
      'This lesson is about turning left into side roads. For every turn use the routine: Mirrors, Signal, Position, Speed, Look. Check the interior mirror first, then the left mirror, then signal left in good time (never the signal before the mirrors), keep to the left, slow to about 10 miles an hour, and look into the new road before you turn.',
      'Watch for cyclists and pedestrians on your left: give way to anyone crossing the road you are turning into. Do not swing out to the right before turning left, and do not cut the corner.',
      'Signal after checking your mirrors, early enough that others know what you will do, but not so early that they think you are turning into an earlier road.'
    ],
    rules:'Highway Code rules 159–161, 170, 182–183 (turning left).',
    coaching:['routine'],length:1600,score:s=>s.kind==='side'&&s.turn==='left'?4:0},
  {id:'right-turns',number:3,title:'Turning right into side roads',summary:'Position just left of the middle; give way to oncoming traffic.',
    objective:'Turn right into side roads from just left of the middle of the road, waiting for a safe gap in oncoming traffic.',
    briefing:[
      'Today we\'re turning right into side roads. Mirrors (the interior one first, then the right), then signal right, then position just left of the middle of the road so traffic can pass on your left. Slow down, and look for oncoming traffic.',
      'Oncoming traffic going straight ahead or turning left has priority: wait at the turning point, opposite the centre of the new road, until there is a safe gap. Do not cut the corner.',
      'Before you turn, look into the new road for pedestrians crossing and for anything waiting to come out.'
    ],
    rules:'Highway Code rules 179–180 (turning right).',
    coaching:['routine','right-turn'],length:1600,score:s=>s.kind==='side'&&s.turn==='right'?4:0},
  {id:'emerging',number:4,title:'Emerging at T-junctions',summary:'Give way and stop lines; look right, left, right; judge a safe gap.',
    objective:'Emerge from side roads into a main road safely, turning left and right, after effective observation.',
    briefing:[
      'This lesson is about emerging: coming out of a side road at a T-junction. Approach slowly, with the routine. At a Stop sign you must stop at the line; at give way lines, stop if you need to, and give way to traffic on the main road.',
      'Look right, left, and right again, and keep looking as you creep forward if your view is blocked by parked cars. Only go when there is a gap big enough that nobody on the main road has to slow down or swerve.',
      'Turning right out of a junction, you have to cross traffic from the right and join traffic from the left, so you need a gap both ways.'
    ],
    rules:'Highway Code rules 170–172 (junctions, stop and give way lines).',
    coaching:['routine','emerge'],length:1600,score:s=>s.kind==='end'?4:0},
  {id:'crossroads',number:5,title:'Crossroads and priority',summary:'Who goes first: turning right against oncoming traffic, offside to offside.',
    objective:'Deal with crossroads safely: priority when turning right, and turning right with an oncoming car also turning right.',
    briefing:[
      'Crossroads are where roads join from both sides. Take extra care: traffic may come from any of the other three directions.',
      'When you are turning right and an oncoming vehicle is going straight ahead or turning left, it has priority. Wait at your turning point until it has passed.',
      'When you and an oncoming vehicle are both turning right, pass offside to offside (keep the other vehicle on your right and turn behind it) unless the layout or the other driver makes nearside to nearside safer. Look out for traffic behind it.',
      'At an unmarked crossroads nobody has priority: go slowly, look carefully, and be ready to stop.'
    ],
    rules:'Highway Code rules 179–181 (turning right; both turning right).',
    coaching:['routine','right-turn','emerge'],length:1800,score:s=>s.crossroads?(s.turn==='right'?5:3):0,goal:j=>j.crossroads,
    needs:'crossroads'},
  {id:'mini-roundabouts',number:6,title:'Mini-roundabouts',summary:'Give way to the right; signal for your exit; no signal straight ahead.',
    objective:'Use mini-roundabouts safely: give way to traffic from the right, with the right signals and position for each exit.',
    briefing:[
      'Mini-roundabouts work like roundabouts: give way to traffic from your right, and go round the painted circle clockwise. There is less room, so slow right down and be ready to stop. Watch for vehicles doing U-turns and for long vehicles that have to drive over the centre.',
      'Signals. Turning left (the first exit): signal left on the approach and keep it on. Going straight ahead: no signal on the approach; signal left after you pass the exit before the one you want. Turning right: signal right on the approach, then change to a left signal after you pass the exit before yours.',
      'Do not signal straight ahead on the approach: it would tell others you are turning.'
    ],
    rules:'Highway Code rules 184–190 (roundabouts and mini-roundabouts).',
    coaching:['routine','roundabout','signals'],length:1800,score:s=>s.kind==='roundabout'?6:0,goal:j=>j.kind==='roundabout',needs:'mini-roundabouts'},
  {id:'traffic-lights',number:7,title:'Traffic lights',summary:'Red, red and amber, green, amber; stop lines; green only if the way is clear.',
    objective:'Approach and go through traffic lights correctly, at the right speed, stopping at the line when you should.',
    briefing:[
      'Traffic lights run red, red and amber, green, amber, red. Red and red-and-amber both mean stop. Green means you may go on if the way is clear. Amber means stop at the stop line, unless you are so close that stopping might cause a crash.',
      'Approach at a speed where you could stop if the lights change. Stop behind the white stop line. When you are waiting, keep watching the lights: a secondary light across the junction helps.',
      'On green, look before you go: someone may still be crossing, and do not go if you cannot clear the junction.'
    ],
    rules:'Highway Code rules 175–176 (traffic lights).',
    coaching:['routine','lights'],length:1800,score:s=>s.kind==='lights'?6:0,goal:j=>j.kind==='lights',routeScore:(r,l)=>crossingsOn(r,l),needs:'traffic lights'},
  {id:'crossings',number:8,title:'Pedestrian crossings',summary:'Zebra and signal crossings: look for people, be ready to stop.',
    objective:'Approach pedestrian crossings at a safe speed, give way to people crossing, and never stop or overtake on the zig-zags.',
    briefing:[
      'Look well ahead for crossings: the zig-zag lines, the flashing beacons of a zebra, or the lights of a signal crossing. Slow down and be ready to stop.',
      'At a zebra, give way to anyone who has started to cross, and look for people waiting to cross. At a signal crossing, obey the lights. Never overtake, park or wait on the zig-zag lines.',
      'Do not wave people across: there may be traffic they cannot see.'
    ],
    rules:'Highway Code rules 191–199 (pedestrian crossings).',
    coaching:['routine','crossings'],length:1800,score:()=>0,routeScore:(r,l)=>crossingsOn(r,l)*4,needs:'pedestrian crossings'},
  {id:'signals',number:9,title:'Signals: when and when not to',summary:'Signal to help others; no signal straight ahead; cancel after the turn.',
    objective:'Signal clearly and in good time when it helps others, not when it does not, and cancel after use.',
    briefing:[
      'Signals warn and inform other road users, including pedestrians, of what you intend to do. Check your mirrors first, then signal in good time.',
      'Do not signal when you are going straight ahead, even at junctions: it would suggest you are turning. Be careful not to signal too early when there is another road before the one you want.',
      'Cancel the signal after the turn. A signal does not give you priority.'
    ],
    rules:'Highway Code rules 103–104 (signals).',
    coaching:['routine','signals'],length:1800,score:s=>s.turn==='ahead'?4:2},
  {id:'mixed',number:10,title:'Putting it together',summary:'All the junctions on one drive, with less help from the instructor.',
    objective:'Drive a route with every kind of junction the area has, using the routine without reminders.',
    briefing:[
      'This drive puts everything together: side roads, emerging, crossroads, traffic lights and roundabouts where the area has them. I\'ll give directions as an examiner would, and remind you less. At the end I\'ll go through what went well.'
    ],
    rules:'The Highway Code, rules 159–199.',
    coaching:['routine','right-turn','emerge','roundabout','lights','crossings','signals'],length:2400,score:s=>s.kind==='roundabout'||s.kind==='lights'?3:s.crossroads?2:1},
  {id:'manoeuvres',number:11,title:'Manoeuvres and the emergency stop',summary:'Emergency stop; pulling up on the right and reversing; parallel parking.',
    objective:'Stop quickly and under control when told to, and carry out the test\'s road manoeuvres with good control and all-round observation.',
    briefing:[
      'Today we\'ll practise the manoeuvres from the test: an emergency stop, pulling up on the right and reversing about two car lengths, and parking behind a car at the kerb. I\'ll tell you each one as we go.',
      'Emergency stop: when I say stop, brake firmly at once, keep both hands on the wheel and the car straight. You don\'t need to check the mirrors first. Afterwards, look all round, both blind spots too, before moving off.',
      'Reversing: look all round before you start, keep looking while you move (mostly out of the back), go slowly, and stop if anyone comes near. Keep reasonably close to the kerb and finish parallel to it.',
      'Pulling up on the right: mirrors and a right signal first, and wait for oncoming traffic to pass before you cross.'
    ],
    rules:'Highway Code rules 117–126 (stopping), 200–203 (reversing) and 239–243 (parking).',
    coaching:['routine','signals'],length:2400,score:()=>1,manoeuvres:['emergency-stop','pull-up-right','parallel-park']}
];

/** A lesson that still needs the map builder to support it (shown in the list, not started). */
export const LESSONS_COMING:readonly {title:string;summary:string}[]=[
  {title:'Roundabouts: lanes and positioning',summary:'Lane choice and signals on larger multi-lane roundabouts. Coming soon: the map builder does not yet lay out large roundabouts.'},
  {title:'Dual carriageways',summary:'Joining, lane discipline and leaving. Coming soon.'}
];

/**
 * The route for a lesson: by the shortest way to a junction of the lesson's kind, then on to the next one (up to
 * six, each a different junction), then on as usual, favouring its topic. A lesson with no particular junction
 * (moving off, signals) has the usual route, favouring its topic.
 */
export function planLesson(net:RoadNetwork,lesson:Lesson,location:Location,start:RoadPos,target:number,seed:number):Route{
  const goal=lesson.goal??(lesson.score({kind:'side',turn:'left',crossroads:false,at:{x:0,z:0}})>=4||lesson.score({kind:'side',turn:'right',crossroads:false,at:{x:0,z:0}})>=4||lesson.score({kind:'end',turn:'left',crossroads:false,at:{x:0,z:0}})>=4
    ?(j:JunctionChoice)=>lesson.score(j)>=4:null);
  const forced:Array<{road:Road;dir:1|-1}>=[];
  if(goal){
    const visited:Array<{x:number;z:number}>=[];
    let pos=start;
    for(let i=0;i<6;i++){
      const next=net.wayTo(pos,j=>goal(j)&&!visited.some(v=>Math.hypot(v.x-j.at.x,v.z-j.at.z)<25),seed+i,900);
      if(!next)break;
      forced.push(...next.way);visited.push(next.at);pos=next.end;
    }
  }
  const score=(r:Route)=>r.steps.reduce((n,st)=>n+lesson.score(st),0)+(lesson.routeScore?.(r,location)??0);
  return net.planFor(start,target,seed,score,forced.length?6:20,{...(forced.length?{forced}:{}),prefer:lesson.score});
}
