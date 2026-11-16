import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {A10_CAR,CYCLIST,MINI_CAR,RING_CAR,SELBY_CAR,WHL_EAST_CAR} from './tottenhamRoute1Paths';

/**
 * Tottenham, the A10 and Wilbury Way: eight challenges from the test centre at the Selby Centre, Selby Road, right into
 * Oak Avenue, right out of Weir Hall Road on to White Hart Lane, right at the lights on to the A10 Great Cambridge
 * Road, right at the Wilbury Way lights over the crossing, pulling up and moving off on Wilbury Way, down Weir Hall
 * Road, right at the Weir Hall Avenue roundabout, left out of Weir Hall Avenue on to the A10, back along White Hart
 * Lane, and left at the Creighton Road mini-roundabout to Selby Road. Chosen from the map and the published evidence
 * (content/packs/tottenham/ROUTES.md).
 * Scene tottenham-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
  // (Where the car waits to turn: the oncoming car, not the map, sets when it gets there.)
  'leave-test-centre':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(333.6,534.9)},when:{actor:'selby-car',at:p(330.8,553.9)},frame:{yaw:0,pitch:40,shift:-3},
    state:'Waiting on Selby Road to turn right into Oak Avenue.'}},
  // (At the line: the houses on the corner hide White Hart Lane until there.)
  'weir-hall-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(78.6,672.1)},when:{actor:'whl-car',at:p(59.34,674.94)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the end of Weir Hall Road.'}},
  'wilbury-crossing':{first:'approach',second:'turn',place:{pause:{kind:'moving',at:p(-244.7,-149.3)},when:{actor:'wilbury-pedestrian',at:p(-232.39,-184.3)},frame:{yaw:-25,pitch:44,shift:-4},
    state:'Approaching the Wilbury Way lights on green.'}},
  // (At the line: the roundabout's island and the corner hide the car coming round until there.)
  'weir-hall-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(72.4,148.2)},when:{actor:'ring-car',at:p(64.1,159.7)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Weir Hall Avenue roundabout.'}},
  // (At the line: the corner hides the A10 until there.)
  'a10-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-159.1,184.2)},when:{actor:'a10-car',at:p(-168.9,158.7)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Weir Hall Avenue.'}},
  // (At the line: the corner hides Creighton Road until there.)
  'creighton-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(310.1,678)},when:{actor:'mini-car',at:p(345,671.2)},frame:{yaw:-45,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}}
};

export const TOTTENHAM_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'tottenham-1',
  title:'Tottenham: the A10 and Wilbury Way',
  scene:'tottenham-route-1',
  briefing:'Tottenham, the A10 and Wilbury Way: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:332.93,z:450.92,headingDeg:179.37},
  // Selby Road, Oak Avenue, Weir Hall Road, White Hart Lane, the A10 north, Wilbury Way, Weir Hall Road, Weir Hall
  // Avenue, the A10 south, White Hart Lane, and back up Selby Road.
  through:pts([[200,538],[80,600],[-100,676],[-195,120],[-120,-205],[75,-30],[-10,166],[-130,176],[-170,330],[-176,590],[-120,672],[150,697],[332,520],[330.5,440]]),
  // Pulled in to the kerb on Wilbury Way (no cars parked along it: room for the cyclist to pass). Wide of the inside
  // corner turning out of Oak Avenue into Weir Hall Road (square in the map). And clear of the bollards on the
  // splitter islands' noses at the two Weir Hall Avenue roundabouts (lanes about 2.3 m wide beside them).
  shifts:[{from:p(-53.8,-196.4),to:p(-31.2,-185.8),left:.35},{from:p(89.3,537.1),to:p(84.4,539.3),left:-1},
    {from:p(72.8,140.2),to:p(72.3,150.2),left:1},
    {from:p(63.27,173.92),to:p(61.05,171.89),left:-.8},{from:p(56.77,166.44),to:p(50,166.4),left:.35},
    {from:p(-57.5,166.6),to:p(-67.5,166.7),left:.7},{from:p(-95.1,172.4),to:p(-104.2,173.1),left:.5}],
  actors:[
    {id:'selby-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(SELBY_CAR)},
    {id:'whl-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(WHL_EAST_CAR)},
    // On the crossing over the mouth of Wilbury Way, from the far kerb, late on the lights.
    {id:'wilbury-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-232.9,-187],[-231.1,-177.5]])},
    // Behind the car along Wilbury Way, past it at the kerb, and right into Plowman Close.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    {id:'a10-car',name:'grey car',colour:'#8a9099',speed:12,path:pts(A10_CAR)},
    // (Paced to come to the mini-roundabout as the car stops at the line, as a driver easing up to it would.)
    {id:'mini-car',name:'green car',colour:'#15803d',speed:9,waits:true,path:pts(MINI_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre, right turn',
      where:'Selby Road, right into Oak Avenue',
      instruction:'Take the next road on the right, please.',
      instructAt:p(332.93,450.92),
      // (Set going as the car comes to wait, so it is there whatever held the car up on the way.)
      starts:[{actor:'selby-car',at:p(333.3,495.9),delay:0}],
      endAt:p(312,542.5),
      // (And Oak Avenue and Weir Hall Road, narrow with cars parked, kept quiet until the car is on to them.)
      quietUntil:p(79.9,630.1),
      // The junction, Selby Road and White Hart Lane where the oncoming car comes from, and Oak Avenue.
      quiet:[{x:332,z:540,radius:22},{x:332,z:585,radius:30},{x:331,z:630,radius:24},{x:290,z:540,radius:30},{x:220,z:537,radius:45},
        {x:140,z:535,radius:40},{x:84,z:560,radius:30},{x:80,z:610,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(333.4,515)},frame:{yaw:0,pitch:20},state:'On Selby Road, leaving the test centre.'},
        centre:{pause:{kind:'stop',at:p(333.6,534.9)},when:{actor:'selby-car',at:p(330.8,553.9)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Oak Avenue.'},
        clear:{pause:{kind:'stop',at:p(333.6,534.9)},when:{actor:'selby-car',at:p(330.8,521.2)},frame:{yaw:40,pitch:32},
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
              message:'Move to just left of the middle of the road to turn right: anyone behind can pass on your left.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move over.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'centre'},
          explain:'Interior and right mirrors, signal right, then position just left of the middle of the road.'
        },
        {
          id:'centre',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','flash-lights'],
          neutral:['look-right','look-left','mirror-right'],
          rules:[
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming car',
              message:'The blue car coming up Selby Road towards you was a few seconds away, and turning right you give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the blue car coming up Selby Road towards you has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Oak Avenue',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing its mouth.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and nothing more was coming: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Oak Avenue is clear to turn into, then go: the blue car had gone by.'
        }
      ]
    },
    {
      id:'weir-hall-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Weir Hall Road, right on to White Hart Lane',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(79.9,630.1),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'whl-car',at:p(79.2,655.1),delay:0}],
      endAt:p(36.1,677.1),
      // The junction, White Hart Lane to the right, where the white car comes from, and to the left.
      quiet:[{x:78,z:680,radius:22},{x:40,z:676,radius:30},{x:115,z:690,radius:28}],
      place:{
        approach:{pause:{kind:'moving',at:p(79.3,650.1)},frame:{yaw:0,pitch:22},state:'Approaching the end of Weir Hall Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(78.6,672.1)},when:{actor:'whl-car',at:p(59.34,674.94)},frame:{yaw:-60,pitch:28},state:'At the end of Weir Hall Road.'},
        clear:{pause:{kind:'stop',at:p(78.6,672.1)},when:{actor:'whl-car',at:p(110.95,689.58)},frame:{yaw:-20,pitch:28},state:'Still at the end of Weir Hall Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on White Hart Lane knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of White Hart Lane, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along White Hart Lane from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming along White Hart Lane from the right was close, in the lane you cross.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and White Hart Lane was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and White Hart Lane was clear.'
        }
      ]
    },
    {
      id:'wilbury-crossing',
      turn:'right',
      title:'Pedestrian crossing at the lights, right turn',
      where:'The A10 at the Wilbury Way lights, right over the crossing into Wilbury Way',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-229.2,-46.1),
      // (Set going as the car comes up to the lights, so they are on the crossing as it turns in, whatever traffic held it up.)
      starts:[{actor:'wilbury-pedestrian',at:p(-244.9,-124.4),delay:0}],
      lights:p(-245.9,-156.8),lightsAll:true,
      endAt:p(-209.6,-187.9),
      // The junction, the crossing over the mouth of Wilbury Way, and Wilbury Way just along it.
      quiet:[{x:-240,z:-172,radius:26},{x:-232,z:-183,radius:16},{x:-205,z:-188,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-244.9,-124.4)},frame:{yaw:0,pitch:20},state:'In the right-turn lane for the Wilbury Way lights, on green.'},
        turn:{pause:{kind:'stop',at:p(-241.1,-179.7)},when:{actor:'wilbury-pedestrian',at:p(-232.39,-184.3)},frame:{yaw:-20,pitch:32},
          state:'Turning right into Wilbury Way. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-241.1,-179.7)},when:{actor:'wilbury-pedestrian',at:p(-231.67,-180.5)},frame:{yaw:-20,pitch:32},
          state:'Waiting short of the crossing on Wilbury Way.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right in good time so the drivers behind and the people at the crossing know you are turning.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into a turn',
              message:'Green means go if it is safe: turning, you need a speed you can stop from for anyone still on the crossing in the road you turn into.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'turn'},
          explain:'Interior and right mirrors, then signal right: you are already in the right-turn lane.'
        },
        {
          id:'turn',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look into Wilbury Way, the way you are turning, first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove at someone still crossing',
              message:'Someone was still on the crossing over the mouth of Wilbury Way, in your lane. Your green does not make them vanish: wait until they are clear. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-right','give-way'],['mirror-interior','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: someone was still on the crossing over the mouth of Wilbury Way, in your lane.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Before you go, look again along the crossing: is anyone else stepping out?'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited with the way clear',
              message:'The pedestrian was past your lane, nearly at the far kerb: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the crossing again, then go: the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'wilbury-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Wilbury Way, between Pentyre Avenue and Plowman Close',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-77.1,-205.2),
      starts:[{actor:'cyclist',at:p(-77.1,-205.2),delay:0}],
      endAt:p(-31.2,-185.8),
      selfCancel:false,
      // The pull-up, and Pentyre Avenue on the way to it.
      quiet:[{x:-31,z:-186,radius:34},{x:-117,z:-206,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(-53.8,-196.4)},frame:{yaw:-15,pitch:28},state:'On Wilbury Way at 30 mph.'},
        stopped:{pause:{kind:'stop',at:p(-31.2,-185.8)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past Pentyre Avenue, clear of the mini-roundabout ahead.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Pentyre Avenue could not see past you.'}},
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
      id:'wilbury-move-off',
      turn:'right',
      title:'Moving off',
      where:'Wilbury Way, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-31.2,-185.8),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(-77.1,-205.2),delay:0}],
      endAt:p(9.7,-167.1),
      // (And Weir Hall Road, narrow with cars parked, kept quiet until the car is past the Amersham Avenue mini-roundabout.)
      quietUntil:p(74.1,74.3),
      quiet:[{x:-31,z:-186,radius:50},{x:23,z:-159,radius:18},{x:79,z:-110,radius:30},{x:76,z:-50,radius:35},{x:76,z:10,radius:32},{x:73,z:58,radius:18}],
      place:{
        check:{pause:{kind:'stop',at:p(-31.2,-185.8)},when:{actor:'cyclist',at:p(-44.9,-189.2)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-31.2,-185.8)},when:{actor:'cyclist',at:p(-0.8,-171.6)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist was just behind you, coming past. Let them go by before you move off. The examiner had to stop the car.'}},
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
              message:'The cyclist had gone by, on towards Plowman Close, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'weir-hall-roundabout',
      turn:'right',
      title:'Roundabout, right turn',
      where:'Weir Hall Road at the Weir Hall Avenue roundabout, third exit on to Weir Hall Avenue',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(74.1,74.3),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(73.3,124.2),delay:0}],
      endAt:p(54.4,166.4),
      // The roundabout's entry, its west side, where the black car comes round from Weir Hall Road south, and that road.
      quiet:[{x:72,z:150,radius:20},{x:62,z:165,radius:22},{x:71,z:190,radius:22},{x:90,z:165,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(73.3,124.2)},frame:{yaw:0,pitch:22},state:'Approaching the Weir Hall Avenue roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(72.4,148.2)},when:{actor:'ring-car',at:p(64.1,159.7)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(72.4,148.2)},when:{actor:'ring-car',at:p(93.7,164.4)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
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
              message:'The black car coming round the roundabout from your right was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone off along Weir Hall Avenue and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone off along Weir Hall Avenue.'
        }
      ]
    },
    {
      id:'a10-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Weir Hall Avenue, left on to the A10 Great Cambridge Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-117.9,175.9),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'a10-car',at:p(-137.5,179.6),delay:0}],
      endAt:p(-165.3,215.4),
      // (And Weir Hall Avenue, narrow with cars parked, kept quiet until the car is on the A10.)
      quietUntil:p(-165.3,215.4),
      // The junction, the A10 to the right, where the grey car comes from, and Weir Hall Avenue behind.
      quiet:[{x:-166,z:186,radius:20},{x:-176,z:150,radius:36},{x:-172,z:110,radius:26},{x:-135,z:178,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-137.5,179.6)},frame:{yaw:0,pitch:22},state:'Approaching the end of Weir Hall Avenue at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-159.1,184.2)},when:{actor:'a10-car',at:p(-168.9,158.7)},frame:{yaw:-70,pitch:26},state:'At the end of Weir Hall Avenue.'},
        clear:{pause:{kind:'stop',at:p(-159.1,184.2)},when:{actor:'a10-car',at:p(-165.3,215.2)},frame:{yaw:-30,pitch:26},state:'Still at the end of Weir Hall Avenue.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on the A10 knows where you are going.'}},
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
              message:'Look right first: the A10 is one way here, and all its traffic comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the grey car',
              message:'The grey car coming down the A10 from the right was close, in the nearside lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the grey car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the grey car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the grey car coming down the A10 from the right was close, in the lane you join.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the grey car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be crossing the end of Weir Hall Avenue on foot.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and the A10 was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the grey car had gone by and the A10 was clear.'
        }
      ]
    },
    {
      id:'creighton-mini',
      turn:'left',
      title:'Mini-roundabout, left turn',
      where:'White Hart Lane at the Creighton Road mini-roundabout, left towards Selby Road',
      instruction:'At the mini-roundabout, turn left, please.',
      instructAt:p(259,686.8),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'mini-car',at:p(288.7,682.9),delay:0}],
      endAt:p(329.4,652),
      // The mini-roundabout, Creighton Road to the right, where the green car comes from, and White Hart Lane north.
      quiet:[{x:330,z:672,radius:22},{x:365,z:670,radius:30},{x:331,z:630,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(288.7,682.9)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(310.1,678)},when:{actor:'mini-car',at:p(345,671.2)},frame:{yaw:-45,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(310.1,678)},when:{actor:'mini-car',at:p(329.4,651.3)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so everyone at the mini-roundabout knows you are turning left.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the green car was coming along Creighton Road, on your right.'}}
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
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming along Creighton Road, on your right, was at the mini-roundabout, turning right round it across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming along Creighton Road, on your right, was there first, turning round in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went round. Look right again, along Creighton Road, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone on up White Hart Lane and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the green car had gone on up White Hart Lane.'
        }
      ]
    }
  ]
},BEFORE));
