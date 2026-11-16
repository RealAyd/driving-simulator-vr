import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {ADMINGTON_CAR,CYCLIST,GGL_CAR,GRANBY_E_CAR,GRANBY_W_CAR,ONCOMING_CAR,RING_CAR} from './garrettsGreenRoute1Paths';

/**
 * Birmingham (Garretts Green), Meadway and The Radleys: eight challenges from the test centre on Granby Avenue, right
 * out of the test centre on to Granby Avenue, right at its end on to Garretts Green Lane, right at the Meadway
 * roundabout, right at the Mackadown Lane lights, pulling up and moving off on Mackadown Lane, right on to The Radleys
 * and over its signal crossing, round by the Church Road roundabout and Sheldon Heath Road into Kenmure Road, left out of
 * Kenmure Road on to Admington Road, Mickleton Avenue, right at the Garretts Green Lane mini-roundabout, and home by
 * Granby Avenue, left into the test centre. Chosen from the map and the published evidence
 * (content/packs/birmingham-garretts-green/ROUTES.md).
 * Scene birmingham-garretts-green-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line; leaving the test centre keeps a third: a car from the right, then one from
 * the left, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the road users the decisions wait for are set going as the car comes to its stop, so traffic on the
  // way cannot make them early; the first decision is taken where the car waits.)
  'meadway-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-429,-662.4)},when:{actor:'ring-car',at:p(-431.9,-683.7)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Meadway roundabout.'}},
  // (In the junction: the queue at these lights, not the map, sets when the car gets there.)
  'mackadown-lights':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(118.2,-886.9)},when:{actor:'oncoming-car',at:p(158.3,-904.3)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting in the junction to turn right into Mackadown Lane. The lights are green.'}},
  'radleys-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(258.5,619.9)},lights:'red',when:{actor:'radleys-pedestrian',at:p(229.5,643.7)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On The Radleys at 30 mph. The crossing\'s lights are red.'}},
  // (At the line: the corner hides Admington Road until there.)
  'kenmure-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-28.5,489.5)},when:{actor:'admington-car',at:p(-9.9,507.3)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Kenmure Road.'}},
  // (At the line: the houses on the corner hide Garretts Green Lane until there.)
  'mickleton-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-328.1,104.9)},when:{actor:'ggl-car',at:p(-322.8,84.4)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}}
};

export const GARRETTS_GREEN_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'birmingham-garretts-green-1',
  title:'Garretts Green: Meadway and The Radleys',
  scene:'birmingham-garretts-green-route-1',
  briefing:'Garretts Green, Meadway and The Radleys: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:251.32,z:-53.87,headingDeg:219.34},
  // The test centre's way out, Granby Avenue, Garretts Green Lane, the Meadway roundabout, Meadway, Mackadown Lane (under
  // the low bridge), The Radleys, the Church Road roundabout, Sheldon Heath Road, Kenmure Road, Admington Road,
  // Mickleton Avenue, Garretts Green Lane, Granby Avenue and back into the test centre. (The last point is just off the
  // way in, on the side away from the unnamed road beside it, so the plan takes the way in.)
  through:pts([[-54,-224],[-334,-475],[-314,-790],[230,-823],[427,-361],[520,84],[343,558],[34,815],[-161,752],[-146,574],[-89,353],[-253,158],[-301,-54],[-2,-181],[274,-66]]),
  // Pulled in to the kerb on Mackadown Lane, south of the low bridge (no cars parked along it here: room for the
  // cyclist to pass).
  shifts:[{from:p(516.4,-10.9),to:p(517.1,19),left:.5}],
  actors:[
    {id:'granby-e-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(GRANBY_E_CAR)},
    {id:'granby-w-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(GRANBY_W_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    {id:'oncoming-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(ONCOMING_CAR)},
    // Behind the car down Mackadown Lane, and out round it at the kerb.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    // On the crossing on The Radleys, from the kerb on the car's left, across in front of it.
    {id:'radleys-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[230.7,645.2],[225.9,639.2]])},
    {id:'admington-car',name:'red car',colour:'#b91c1c',speed:9,path:pts(ADMINGTON_CAR)},
    // (Paced to come down to the mini-roundabout as the car stops at the line, as a driver easing up to it would.)
    {id:'ggl-car',name:'green car',colour:'#15803d',speed:9,waits:true,path:pts(GGL_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, right on to Granby Avenue',
      instruction:'When you\'re ready, drive out of the test centre and turn right, please.',
      instructAt:p(251.32,-53.87),
      // (The blue car comes from the end of Granby Avenue, only 50 m away: set going as the car comes to the line, so
      // it comes after the white car.)
      starts:[{actor:'granby-e-car',at:p(251.32,-53.87),delay:0},{actor:'granby-w-car',at:p(220.3,-17.3),delay:3}],
      endAt:p(185.6,-24.2),
      // The way out, Granby Avenue to the right, where the white car comes from, and to the left, towards its end.
      quiet:[{x:213,z:-9,radius:22},{x:180,z:-32,radius:30},{x:238,z:14,radius:28}],
      place:{
        line:{pause:{kind:'stop',at:p(216.6,-12.7)},when:{actor:'granby-e-car',at:p(185.9,-26.3)},frame:{yaw:-70,pitch:32},
          state:'At the end of the test centre\'s way out, at the edge of Granby Avenue.'},
        left:{pause:{kind:'stop',at:p(216.6,-12.7)},when:{actor:'granby-w-car',at:p(229.5,11.3)},frame:{yaw:60,pitch:32},
          state:'Still at the edge of Granby Avenue.'},
        clear:{pause:{kind:'stop',at:p(216.6,-12.7)},when:{actor:'granby-w-car',at:p(180.7,-28.1)},frame:{yaw:-30,pitch:32},
          state:'Still at the edge of Granby Avenue.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Granby Avenue, which you cross, comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Granby Avenue know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning right: a left signal misleads everyone on Granby Avenue.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Granby Avenue from the right was a second or two away in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'left',go:'left'},
          explain:'Signal right and wait: the white car coming along Granby Avenue from the right was close, in the lane you were crossing.'
        },
        {
          id:'left',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-right','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left as well: turning right, you join the far lane, and its traffic comes from the left, from the end of Granby Avenue.'}},
            {kind:'unsafe',id:'pulled-out-left',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The white car had passed, but the blue car coming from the left was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait again: the right was clear, but the blue car coming from the left was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car came by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look left',
              message:'Look left again too: more traffic may be coming from the end of Granby Avenue.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Granby Avenue was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Granby Avenue was clear both ways.'
        }
      ]
    },
    {
      id:'meadway-roundabout',
      turn:'right',
      title:'Roundabout, turn right',
      where:'Garretts Green Lane at the Meadway roundabout, right (third exit) on to Meadway',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(-381.3,-606.2),
      // (Set going as the car comes to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(-420.4,-654.2),delay:0}],
      endAt:p(-423.1,-711.6),
      // The entry, the roundabout to the right, where the black car comes round from Meadway, its far side, and the way
      // out on to Meadway.
      quiet:[{x:-430,z:-663,radius:16},{x:-428,z:-690,radius:18},{x:-462,z:-680,radius:20},{x:-428,z:-708,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-404.9,-640.1)},frame:{yaw:0,pitch:22},state:'Approaching the Meadway roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-429,-662.4)},when:{actor:'ring-car',at:p(-431.9,-683.7)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-429,-662.4)},when:{actor:'ring-car',at:p(-468.1,-672.5)},frame:{yaw:-40,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so the traffic round it knows you are not leaving at Meadway west or Lea Hall Road.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for the third exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round the roundabout from Meadway, on your right, was close and crossing your way in on its way to Lea Hall Road. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Meadway, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Lea Hall Road and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go'],['look-right','mirror-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round towards Lea Hall Road.'
        }
      ]
    },
    {
      id:'mackadown-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Meadway at the Mackadown Lane lights, right into Mackadown Lane',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-8.4,-845.6),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(110.5,-884.1),delay:0}],
      lights:p(87.4,-875.5),lightsAll:true,
      endAt:p(155.5,-872.4),
      // The junction, East Meadway opposite, where the oncoming car comes from, and the mouth of Mackadown Lane.
      quiet:[{x:127,z:-889,radius:26},{x:170,z:-908,radius:22},{x:152,z:-874,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(60.5,-865)},frame:{yaw:0,pitch:20},state:'Approaching the Mackadown Lane lights on green.'},
        centre:{pause:{kind:'stop',at:p(118.2,-886.9)},when:{actor:'oncoming-car',at:p(158.3,-904.3)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(118.2,-886.9)},when:{actor:'oncoming-car',at:p(96.1,-875.4)},frame:{yaw:30,pitch:32},
          state:'Still waiting in the junction.'}
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
              message:'Move to the right-hand side of your lane to turn right: traffic behind can pass on your left.'}},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The grey car coming along East Meadway opposite, going ahead on to Meadway, was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the grey car coming along East Meadway opposite was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Mackadown Lane',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Mackadown Lane is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'mackadown-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Mackadown Lane, south of the low bridge',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(519.6,-49.2),
      starts:[{actor:'cyclist',at:p(519.6,-49.2),delay:0}],
      endAt:p(517.1,19),
      selfCancel:false,
      // The pull-up, and the low bridge and Tile Cross Road behind it.
      quiet:[{x:517,z:19,radius:34},{x:524,z:-80,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(516.4,-13.9)},frame:{yaw:-15,pitch:28},state:'On Mackadown Lane at 30 mph, past the low bridge.'},
        stopped:{pause:{kind:'stop',at:p(517.1,19)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past the bridge, clear of the junctions and the parked cars.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction, nor just past the low bridge: drivers coming out of Tile Cross Road or through the bridge could not see past you.'}},
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
      id:'mackadown-move-off',
      turn:'right',
      title:'Moving off',
      where:'Mackadown Lane, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(517.1,19),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(519.6,-49.2),delay:0}],
      endAt:p(522.3,99.7),
      quiet:[{x:517,z:19,radius:50},{x:521,z:85,radius:20}],
      place:{
        check:{pause:{kind:'stop',at:p(517.1,19)},when:{actor:'cyclist',at:p(515.1,1.3)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(517.1,19)},when:{actor:'cyclist',at:p(519,55.1)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by along Mackadown Lane and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'radleys-crossing',
      title:'Pedestrian crossing',
      where:'The Radleys, the signal crossing by Lychgate Avenue',
      instruction:'Follow the road ahead, please.',
      instructAt:p(321.9,574.9),
      // (Set going as the car comes up to the crossing, so they step out as it comes, whatever traffic held it up.)
      starts:[{actor:'radleys-pedestrian',at:p(273.1,609.4),delay:0}],
      lights:p(231.5,641.6),
      endAt:p(195.9,670.5),
      // The crossing, Lychgate Avenue just before it, and The Radleys beyond.
      // (And Kenmure Road, Admington Road and Mickleton Avenue, narrow with cars parked along one side, kept quiet until
      // the car is out on Garretts Green Lane: one coming the other way would meet it face to face.)
      quietUntil:p(-312.3,65.7),
      quiet:[{x:229,z:642,radius:24},{x:252,z:622,radius:14},{x:205,z:664,radius:16},
        {x:-200,z:625,radius:40},{x:-130,z:575,radius:45},{x:-70,z:535,radius:40},{x:-50,z:420,radius:40},{x:-90,z:330,radius:40},{x:-150,z:220,radius:40},{x:-230,z:170,radius:40},{x:-290,z:135,radius:25}],
      place:{
        approach:{pause:{kind:'moving',at:p(258.5,619.9)},lights:'red',frame:{yaw:0,pitch:24},state:'On The Radleys at 30 mph, the signal crossing ahead.'},
        line:{pause:{kind:'stop',at:p(236,637.7)},lights:'red',when:{actor:'radleys-pedestrian',at:p(229.5,643.7)},panel:'right',frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(236,637.7)},when:{actor:'radleys-pedestrian',at:p(226.6,640.1)},frame:{yaw:0,pitch:30},
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
              message:'The lights were red with someone stepping out to cross. Speeding up to get through would put them at risk.'}},
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
          explain:'Check the crossing both ways, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'kenmure-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Kenmure Road, left on to Admington Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-95.3,529.2),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'admington-car',at:p(-35.7,495),delay:0}],
      endAt:p(-39.1,445),
      // The junction, Admington Road to the right, where the red car comes from, and Admington Road ahead to the left.
      quiet:[{x:-22,z:486,radius:20},{x:-3,z:516,radius:24},{x:-36,z:452,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-61.8,509.6)},frame:{yaw:0,pitch:22},state:'Approaching the end of Kenmure Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-28.5,489.5)},when:{actor:'admington-car',at:p(-9.9,507.3)},frame:{yaw:-70,pitch:26},state:'At the end of Kenmure Road.'},
        clear:{pause:{kind:'stop',at:p(-28.5,489.5)},when:{actor:'admington-car',at:p(-30,464.3)},frame:{yaw:-30,pitch:26},state:'Still at the end of Kenmure Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Admington Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the lane you join comes from the right, round the bend of Admington Road.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming round the bend of Admington Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming round the bend of Admington Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be coming down Admington Road towards you, or overtaking the parked cars.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone by and Admington Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the red car had gone by and Admington Road was clear.'
        }
      ]
    },
    {
      id:'mickleton-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'Mickleton Avenue at the Garretts Green Lane mini-roundabout, right on to Garretts Green Lane',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(-276.3,145.1),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ggl-car',at:p(-324.7,110),delay:0}],
      endAt:p(-312.3,65.7),
      // The mini-roundabout, Garretts Green Lane to the right, where the green car comes from, and Garretts Green Lane
      // on towards Meon Grove, where it goes.
      quiet:[{x:-334,z:94,radius:16},{x:-314,z:72,radius:20},{x:-360,z:110,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-301.6,129.2)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-328.1,104.9)},when:{actor:'ggl-car',at:p(-322.8,84.4)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-328.1,104.9)},when:{actor:'ggl-car',at:p(-353.8,106.9)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right','speed-up'],
          neutral:['mirror-left','position-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so everyone at the mini-roundabout knows you are turning on to Garretts Green Lane.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the green car was coming down Garretts Green Lane, on your right.'}}
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
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming down Garretts Green Lane, on your right, was at the mini-roundabout, going round across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming down Garretts Green Lane, on your right, was there first, going round in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went round. Look right again, up Garretts Green Lane, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone on towards Meon Grove and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the green car had gone.'
        }
      ]
    }
  ]
},BEFORE));
