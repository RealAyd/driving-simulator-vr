import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CURFEW_CAR,CYCLIST,EXIT_CAR,POUND_CAR,RING_CAR,SPUR_CAR} from './chertseyRoute1Paths';

/**
 * Chertsey (London), Pyrcroft Road and Free Prae Road: eight challenges from the test centre in the Hanworth Lane
 * business park, right out of the test centre on to Hanworth Lane, up The Knoll and Bell Bridge Road to the Pyrcroft
 * Road roundabout (right, the third exit), along Pyrcroft Road and up Guildford Street, ahead at the Curfew Bell Road
 * mini-roundabout, over the signal crossing on Heriot Road, along London Street and right into Pound Road, pulling up
 * and moving off on Free Prae Road, back by Eastworth Road, Queen Street, Station Road and Guildford Road, left out of
 * the Guildford Road slip on to the A320, and round The Knoll roundabout back to the test centre. Chosen from the map
 * and the published evidence (content/packs/chertsey-london/ROUTES.md).
 * Scene chertsey-london-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
 */
const pts=(a:readonly (readonly number[])[]):Vec2[]=>a.map(([x,z])=>({x:x!,z:z!}));
const p=(x:number,z:number):Vec2=>({x,z});

const MIRRORS_FIRST:Fault={level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
  message:'Mirrors first, then signal: you need to know who your signal is for.'};
const HORN:Fault={level:'feedback',heading:'Use of horn',title:'Horn not needed',
  message:'Use the horn only to warn others of your presence when they may not have seen you.'};
const WRONG_LEFT:Fault={level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
  message:'You are turning left: a right signal tells everyone you are going the other way.'};
const WRONG_RIGHT:Fault={level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
  message:'You are turning right: a left signal tells everyone you are going the other way.'};
const PED_HORN:Fault={level:'serious',heading:'Use of horn',title:'Horn at a pedestrian',
  message:'Never sound the horn at someone crossing: it can startle them in the road.'};

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first on the move unless
 * the hazard is in view only at the line, or the moment is set by where the car waits. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the hedges and parked cars along Hanworth Lane hide the road to the right until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-353.4,454.7)},when:{actor:'exit-car',at:p(-391,444.1)},frame:{yaw:-70,pitch:36,shift:-4},
    state:'At the end of the test centre\'s way out.'}},
  // (At the line: the island and the cars on the roundabout hide the traffic coming round until there.)
  'pyrcroft-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-365.9,-110.8)},when:{actor:'ring-car',at:p(-346.9,-112)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Pyrcroft Road roundabout.'}},
  // (At the line: the buildings on the corner hide Guildford Street to the right until there.)
  'curfew-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-120.3,-144.3)},when:{actor:'curfew-car',at:p(-100.9,-162)},frame:{yaw:-50,pitch:36,shift:-4},
    state:'At the give way line of the mini-roundabout.'}},
  'heriot-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(103.8,-266.5)},lights:'red',when:{actor:'heriot-pedestrian',at:p(124.84,-287.79)},panel:'right',frame:{yaw:0,pitch:48,shift:4},
    state:'On Heriot Road at 30 mph. The crossing\'s lights are red.'}},
  // (Where the car waits to turn: the oncoming car, not the map, sets when it gets there.)
  'pound-turn':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(438.7,-298)},when:{actor:'pound-car',at:p(460.2,-296.8)},frame:{yaw:-20,pitch:40,shift:-4},
    state:'Waiting at the end of London Street to turn right into Pound Road.'}},
  // (At the line: the bushes on the slip's island hide Bell Bridge Road until there.)
  'slip-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-381,173.9)},when:{actor:'spur-car',at:p(-387.7,163.5)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of the Guildford Road slip.'}}
};

export const CHERTSEY_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'chertsey-london-1',
  title:'Chertsey: Pyrcroft Road and Free Prae Road',
  scene:'chertsey-london-route-1',
  briefing:'Chertsey, Pyrcroft Road and Free Prae Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-338,z:430.5,headingDeg:212.5},
  // The test centre's way out, Hanworth Lane, The Knoll, Bell Bridge Road, the Pyrcroft Road roundabout, Pyrcroft Road,
  // Guildford Street, Heriot Road, London Street, Pound Road, Free Prae Road, Eastworth Road, Queen Street, Station Road,
  // Guildford Road and its slip on to the A320, The Knoll roundabout, The Knoll, Hanworth Lane and back into the test
  // centre's way in.
  through:pts([[-380,448],[-440,336],[-390,50],[-240,-46],[-150,-110],[75,-215],[300,-385],[426,-190],[340,75],[175,214],[127,254],
    [50,268],[-138,129],[-320,147],[-405,188],[-436,339],[-380,448],[-345,434]]),
  // Kept right past the signal post on the kerb at the Pyrcroft Road lights. And pulled in to the kerb on Free Prae Road
  // (no cars parked along it: room for the cyclist to pass). (Back by Queen Street, not round the Eastworth Road
  // roundabout into Victory Road: its tight exit put the car on the footway, a post on the splitter island beside it.)
  shifts:[{from:p(-248.4,-57.1),to:p(-235.1,-53.1),left:-.4},
    {from:p(376.7,-31.3),to:p(371.7,-11.9),left:.6}],
  actors:[
    {id:'exit-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(EXIT_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    {id:'curfew-car',name:'red car',colour:'#b91c1c',speed:8,path:pts(CURFEW_CAR)},
    // On the crossing on Heriot Road, from the kerb on the car's left, across in front of it.
    {id:'heriot-pedestrian',name:'pedestrian',colour:'#1d4ed8',speed:1.3,kind:'pedestrian',waits:true,path:pts([[124.08,-289.2],[128.44,-281.1]])},
    {id:'pound-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(POUND_CAR)},
    // Behind the car down Free Prae Road, out round it at the kerb, and on.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'spur-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(SPUR_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre, emerging right',
      where:'Out of the test centre, right on to Hanworth Lane',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-338,430.5),
      starts:[{actor:'exit-car',at:p(-338,430.5),delay:0}],
      endAt:p(-380.9,451.6),
      // The way out's mouth, Hanworth Lane to the right (west), where the white car comes from, and to the east, where
      // it goes.
      quiet:[{x:-356,z:459,radius:14},{x:-385,z:447,radius:20},{x:-415,z:432,radius:18},{x:-330,z:471,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-344.2,440.3)},frame:{yaw:0,pitch:22},state:'Driving out of the test centre.'},
        line:{pause:{kind:'stop',at:p(-353.4,454.7)},when:{actor:'exit-car',at:p(-391,444.1)},frame:{yaw:-70,pitch:30},state:'At the end of the way out.'},
        clear:{pause:{kind:'stop',at:p(-353.4,454.7)},when:{actor:'exit-car',at:p(-345.3,464.4)},frame:{yaw:-10,pitch:30},state:'Still at the end of the way out.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right as you come to the end of the way out, so the traffic on Hanworth Lane knows where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Hanworth Lane, which you cross, comes from the right, off The Knoll.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Hanworth Lane from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming along Hanworth Lane from the right was close, in the lane you were crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming out of the business park before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Hanworth Lane was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Hanworth Lane was clear both ways.'
        }
      ]
    },
    {
      id:'pyrcroft-roundabout',
      turn:'right',
      title:'Roundabout, right turn',
      where:'Bell Bridge Road at the Pyrcroft Road roundabout, third exit on to Pyrcroft Road',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(-368,-76),
      // (Set going as the direction is given: paced to come round as the car stops at the line.)
      starts:[{actor:'ring-car',at:p(-368,-76),delay:0}],
      endAt:p(-330.6,-114.6),
      // The entry, the roundabout's south side, where the black car comes round from Pyrcroft Road east, Pyrcroft Road
      // west, where it goes, and the exit on to Pyrcroft Road east.
      quiet:[{x:-366,z:-115,radius:12},{x:-352,z:-113,radius:12},{x:-332,z:-103,radius:16},{x:-375,z:-132,radius:12},{x:-356,z:-126,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-365.9,-95.8)},frame:{yaw:0,pitch:22},state:'Approaching the Pyrcroft Road roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-365.9,-110.8)},when:{actor:'ring-car',at:p(-346.9,-112)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-365.9,-110.8)},when:{actor:'ring-car',at:p(-376.5,-134.4)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so everyone at it knows you are going round.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right: you are taking the third exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round the roundabout from Pyrcroft Road, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Pyrcroft Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone off west along Pyrcroft Road and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone off west along Pyrcroft Road.'
        }
      ]
    },
    {
      id:'curfew-mini',
      title:'Mini-roundabout, ahead',
      where:'Guildford Street at the Curfew Bell Road mini-roundabout, ahead along Guildford Street',
      instruction:'At the mini-roundabout, follow the road ahead, please.',
      instructAt:p(-149.5,-94.2),
      // (Set going as the direction is given: paced to come to the mini-roundabout as the car stops at the line.)
      starts:[{actor:'curfew-car',at:p(-149.5,-94.2),delay:0}],
      endAt:p(-104,-162.9),
      // The mini-roundabout, Guildford Street to the right, where the red car comes from, and Curfew Bell Road to the
      // left, where it goes.
      quiet:[{x:-115,z:-153,radius:14},{x:-95,z:-167,radius:16},{x:-140,z:-164,radius:14},{x:-123,z:-133,radius:10}],
      place:{
        approach:{pause:{kind:'moving',at:p(-129.6,-122.9)},frame:{yaw:0,pitch:22},state:'On Guildford Street at 20 mph, the mini-roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(-120.3,-144.3)},when:{actor:'curfew-car',at:p(-100.9,-162)},frame:{yaw:-50,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-120.3,-144.3)},when:{actor:'curfew-car',at:p(-137.2,-163.5)},frame:{yaw:20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'No mirror on the approach',
              message:'Check the interior mirror as you slow for the mini-roundabout: you need to know how close the traffic behind is.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead along Guildford Street: a left signal says you are turning into Curfew Bell Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead along Guildford Street: a right signal says you are going round the mini-roundabout and back.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the red car was coming down Guildford Street to it from the right.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left']],
          next:{then:'line'},
          explain:'Interior mirror and no signal: you were going ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming down Guildford Street, on your right, was at the mini-roundabout, turning across your way into Curfew Bell Road. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming down Guildford Street, on your right, was there first, turning across in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went across. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone into Curfew Bell Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go ahead: the red car had gone into Curfew Bell Road.'
        }
      ]
    },
    {
      id:'heriot-crossing',
      title:'Pedestrian crossing at the traffic lights',
      where:'Heriot Road, the signal crossing past Beomonds Row',
      instruction:'Follow the road ahead, please.',
      instructAt:p(92.1,-248),
      // (Set going as the car comes up to the crossing, so they are on it as the car arrives, whatever held it up.)
      starts:[{actor:'heriot-pedestrian',at:p(92.1,-248),delay:0}],
      lights:p(126.25,-285.18),
      endAt:p(145.4,-298.2),
      // (And Heriot Road on to the London Street mini-roundabout, and Bridge Road at the Pound Road turn, kept quiet until
      // the car waits to turn there: in traffic, a car coming out of the mini-roundabout met it face to face where Heriot
      // Road's one-way pair joins, and cars coming along Bridge Road were still there when the turn came.)
      quietUntil:p(438.7,-298),
      // The crossing, Heriot Road before it, and on past it to the London Street mini-roundabout.
      quiet:[{x:126,z:-285,radius:22},{x:106,z:-268,radius:16},{x:146,z:-298,radius:14},{x:167,z:-345,radius:18},
        {x:157,z:-400,radius:18},{x:154,z:-432,radius:16},{x:160,z:-453,radius:14},{x:135,z:-468,radius:14},{x:185,z:-447,radius:12},
        {x:465,z:-302,radius:16},{x:490,z:-328,radius:18},{x:515,z:-356,radius:18},{x:545,z:-377,radius:16},{x:578,z:-383,radius:18},
        {x:478,z:-358,radius:12},{x:455,z:-375,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(103.8,-266.5)},lights:'red',frame:{yaw:0,pitch:24},state:'On Heriot Road at 30 mph, the signal crossing ahead.'},
        line:{pause:{kind:'stop',at:p(121.1,-284.3)},lights:'red',when:{actor:'heriot-pedestrian',at:p(124.84,-287.79)},panel:'right',frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(121.1,-284.3)},when:{actor:'heriot-pedestrian',at:p(127.97,-281.98)},frame:{yaw:0,pitch:30},
          state:'Still at the crossing. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'before',id:'mirror-before-stopping',action:'give-way',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Stopped before the mirror',
              message:'Check the interior mirror before you slow down to stop: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The crossing\'s lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red with someone stepping on to the crossing. Speeding up to get through would put them at risk.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the crossing was at red, with someone stepping out to cross.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-right','look-left','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red and the pedestrian was crossing in front of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-right','give-way'],['look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red and the pedestrian was crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Pedestrian crossings',title:'No check before going',
              message:'Green means go only if the way is clear. Check the crossing both ways for anyone late across before you move off.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the crossing was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the crossing both ways, then go: the lights were green and the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'pound-turn',
      turn:'right',
      title:'Right turn across oncoming traffic',
      where:'London Street, right into Pound Road',
      instruction:'Take the next road on the right, please.',
      instructAt:p(381.5,-329.2),
      // (Set going as the direction is given: paced to come along as the car waits to turn.)
      starts:[{actor:'pound-car',at:p(381.5,-329.2),delay:0}],
      endAt:p(436.9,-266.2),
      // The junction, Bridge Road ahead, where the grey car comes from, and the mouth of Willow Walk on it (in traffic, a
      // car out of Willow Walk followed the grey car in), London Street west, where it goes, and Pound Road.
      quiet:[{x:443,z:-292,radius:14},{x:465,z:-302,radius:16},{x:490,z:-328,radius:18},{x:515,z:-356,radius:18},{x:545,z:-377,radius:16},
        {x:478,z:-358,radius:12},{x:455,z:-375,radius:14},{x:437,z:-273,radius:12},{x:420,z:-301,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(414.8,-307)},frame:{yaw:0,pitch:20},state:'On London Street at 30 mph.'},
        centre:{pause:{kind:'stop',at:p(438.7,-298)},when:{actor:'pound-car',at:p(460.2,-296.8)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Pound Road.'},
        clear:{pause:{kind:'stop',at:p(438.7,-298)},when:{actor:'pound-car',at:p(421,-301)},frame:{yaw:40,pitch:32},
          state:'Still waiting to turn right.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right in good time so the drivers behind and coming the other way know you are turning.'}},
            {kind:'required',id:'no-position',anyOf:['position-right'],fault:{level:'minor',heading:'Positioning - normal driving',title:'Not positioned for the right turn',
              message:'Keep to the right of your lane to turn right: anyone behind going ahead can pass on your left.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move over.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'centre'},
          explain:'Interior and right mirrors, signal right, then position to the right of your lane.'
        },
        {
          id:'centre',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','flash-lights'],
          neutral:['look-right','look-left','mirror-right'],
          rules:[
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming car',
              message:'The grey car coming along Bridge Road towards you was a few seconds away, and turning right you give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the grey car coming along Bridge Road towards you has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Pound Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing its mouth.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and nothing more was coming: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Pound Road is clear to turn into, then go: the grey car had gone by.'
        }
      ]
    },
    {
      id:'free-prae-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Free Prae Road, past Stepgates',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(392.7,-79.2),
      starts:[{actor:'cyclist',at:p(392.7,-79.2),delay:0}],
      endAt:p(374.8,-21.5),
      selfCancel:false,
      // The pull-up, and Free Prae Road behind it, back to the Stepgates crossroads.
      quiet:[{x:375,z:-22,radius:34},{x:386,z:-62,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(381.4,-49.7)},frame:{yaw:-15,pitch:28},state:'On Free Prae Road at 30 mph, past Stepgates.'},
        stopped:{pause:{kind:'stop',at:p(374.8,-21.5)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','signal-left','signal-right','stop-at-junction','stop-past-junction'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal to pull in',
              message:'Signal left before you pull in, so anyone behind knows you are stopping.'}},
            {kind:'required',id:'place',anyOf:['stop-past-junction'],fault:{level:'serious',heading:'Normal stops',title:'No safe place chosen',
              message:'Choose where to stop before you pull in: on the straight past Stepgates, clear of the junctions.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop opposite or within 10 metres of a junction: drivers turning out of Fairway or Stepgates could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place on the straight, clear of the junctions; mirrors, then signal left.'
        },
        {
          id:'stopped',safe:'approach',
          buttons:['handbrake','neutral','signal-off','hazards','horn'],
          rules:[
            {kind:'required',id:'handbrake',anyOf:['handbrake'],fault:{level:'minor',heading:'Control - parking brake',title:'Handbrake not on',
              message:'Put the handbrake on when you stop: the car must not roll.'}},
            {kind:'required',id:'neutral',anyOf:['neutral'],fault:{level:'minor',heading:'Control - gears',title:'Left in gear',
              message:'Select neutral once the handbrake is on.'}},
            {kind:'required',id:'cancel',anyOf:['signal-off'],fault:{level:'minor',heading:'Signals - correctly',title:'Signal left on',
              message:'Cancel the signal once you have stopped: left on, others may wait, thinking you are about to turn.'}},
            {kind:'before',id:'handbrake-first',action:'neutral',needs:['handbrake'],fault:{level:'minor',heading:'Control - parking brake',title:'Neutral before the handbrake',
              message:'Handbrake first, then neutral: in that order the car cannot roll.'}},
            {kind:'distractor',id:'hazards',action:'hazards',fault:{level:'feedback',heading:'Signals - correctly',title:'Hazard lights not needed',
              message:'Hazard lights are for warning of a hazard or an obstruction, not for a normal stop at the kerb.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['handbrake','neutral','signal-off'],['handbrake','signal-off','neutral'],['signal-off','handbrake','neutral']],
          next:{then:'done'},
          explain:'Handbrake on, neutral, and cancel the signal.'
        }
      ]
    },
    {
      id:'free-prae-move-off',
      turn:'right',
      title:'Moving off',
      where:'Free Prae Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(374.8,-21.5),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(392.7,-79.2),delay:0}],
      endAt:p(363.6,17),
      // (And the end of Queen Street on Station Road, and the corner where Station Road meets Guildford Road, kept quiet
      // until the car is round it: in traffic, a car on Station Road waiting for the car to come out of Queen Street while
      // the car waited for it held both for a minute, and one coming round the tight corner met it there.)
      quietUntil:p(-256,97),
      quiet:[{x:375,z:-22,radius:45},{x:366,z:6,radius:16},{x:103,z:304,radius:24},{x:126,z:258,radius:20},{x:72,z:284,radius:18},{x:140,z:316,radius:18},
        {x:-227,z:60,radius:20},{x:-205,z:76,radius:14},{x:-222,z:40,radius:14},{x:-245,z:84,radius:12}],
      place:{
        check:{pause:{kind:'stop',at:p(374.8,-21.5)},when:{actor:'cyclist',at:p(377.84,-41.28)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(374.8,-21.5)},when:{actor:'cyclist',at:p(367.7,-3.69)},frame:{yaw:-170,pitch:26},
          state:'Still at the kerb.'}
      },
      stages:[
        {
          id:'check',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','signal-left','give-way','go'],
          neutral:['signal-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['mirror-right','blind-spot-right'],any:true,fault:{level:'minor',heading:'Move off - safety',title:'Waited without looking',
              message:'Waiting was right, but check the mirror and blind spot first so you know what you are waiting for.'}},
            {kind:'unsafe',id:'pulled-into-cyclist',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off into the cyclist',
              message:'The cyclist was just behind you on Free Prae Road, coming past. Let them go by before you move off. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the cyclist behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','give-way'],['mirror-right','blind-spot-right','give-way'],['mirror-interior','mirror-right','blind-spot-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirror and blind spot, then wait: the cyclist was coming past.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','give-way','go'],
          neutral:['mirror-interior','signal-right'],
          rules:[
            {kind:'required',id:'fresh-blind-spot',anyOf:['blind-spot-right'],when:'go',fault:{level:'serious',heading:'Move off - safety',title:'No blind spot check before moving off',
              message:'Look over your right shoulder just before you move off: another cyclist or a motorcyclist can be there, out of the mirror\'s view.'}},
            {kind:'before',id:'mirror-first',action:'go',needs:['mirror-right'],fault:{level:'minor',heading:'Move off - safety',title:'No right mirror',
              message:'Check the right mirror as well as your blind spot before moving off.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe chance to move off',
              message:'The cyclist had gone by along Free Prae Road and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'slip-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'The Guildford Road slip, left on to the A320 towards The Knoll roundabout',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-338.1,158.2),
      // (Set going as the direction is given: paced to come down Bell Bridge Road as the car stops at the line.)
      starts:[{actor:'spur-car',at:p(-338.1,158.2),delay:0}],
      // (Bell Bridge Road's crossing lights, just up the road, held green while the blue car comes through them.)
      lights:p(-387.2,149.5),
      lightsAll:true,
      endAt:p(-410.1,196.6),
      // The end of the slip, Bell Bridge Road to the right, where the blue car comes from, and the A320 on to the
      // roundabout, where it goes.
      quiet:[{x:-388,z:173,radius:14},{x:-387,z:140,radius:24},{x:-406,z:189,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(-356.3,166.4)},frame:{yaw:0,pitch:22},state:'On the Guildford Road slip at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-381,173.9)},when:{actor:'spur-car',at:p(-387.7,163.5)},frame:{yaw:-70,pitch:26},state:'At the end of the slip.'},
        clear:{pause:{kind:'stop',at:p(-381,173.9)},when:{actor:'spur-car',at:p(-412.6,194.7)},frame:{yaw:-30,pitch:26},state:'Still at the end of the slip.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic coming down Bell Bridge Road knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning left, you join the A320\'s lane, and its traffic comes down Bell Bridge Road from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming down Bell Bridge Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming down Bell Bridge Road from the right was close, in the lane you join.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be walking across the end of the slip, or waiting at The Knoll roundabout ahead.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Bell Bridge Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Bell Bridge Road was clear.'
        }
      ]
    }
  ]
},BEFORE));
