import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {KINGS_CAR,MELBOURNE_CAR,NORTH_CAR,RAINSFORD_CAR,ROXWELL_CAR} from './chelmsfordRoute2Paths';

/**
 * Chelmsford route 2, north by Rainsford and Melbourne: eight challenges from the test centre on Cromar Way (Unit 12,
 * the centre car tests moved to on 5 October 2026), right at the Cromar Way lights, up Waterhouse Lane and Rainsford
 * Lane, over Parkway into Primrose Hill, Rainsford Road and Roxwell Road, right at the Chignal Road lights, Melbourne
 * Avenue, the North Avenue roundabout and Kings Road, and home by Park Avenue, Rainsford Road and Rainsford Lane.
 * Chosen from the map (content/packs/chelmsford/ROUTES.md): from Rainsford Lane, Rainsford Road westbound is reached
 * by Primrose Hill, straight over the Parkway lights. Scene chelmsford-route-2 (OpenStreetMap). A practice route, not a
 * confirmed test route.
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

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts); Primrose Hill keeps a third:
 * someone crossing the end of it, then a car coming along Rainsford Road, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-90.6,981.9)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the lights at the end of Cromar Way. They are red.'}},
  'primrose-emerge':{first:'approach',second:'pedestrian',place:{pause:{kind:'moving',at:p(191.7,-26.8)},when:{actor:'primrose-pedestrian',at:p(173.8,-32)},panel:'right',frame:{yaw:0,pitch:30},
    state:'Approaching the end of Primrose Hill. Someone is crossing it.'}},
  'chignal-lights':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(-714.9,-196.9)},when:{actor:'roxwell-car',at:p(-800.4,-201)},frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Chignal Road lights on green.'}},
  'melbourne-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(-244,-1124.5)},when:{actor:'zebra-pedestrian',at:p(-217,-1130.4)},panel:'right',frame:{yaw:0,pitch:44,shift:5},
    state:'On Melbourne Avenue, the zebra crossing just ahead.'}},
  // (At the line, as Kings Road below: the corner houses hide the road from the right until there.)
  'north-avenue-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(8.2,-1148.8)},when:{actor:'north-car',at:p(22.7,-1136.9)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the give way line.'}},
  'kings-road-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(306.9,-668.2)},when:{actor:'kings-car',at:p(296.4,-653.1)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the end of North Avenue.'}}
};

export const CHELMSFORD_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'chelmsford-2',
  title:'Chelmsford route 2',
  scene:'chelmsford-route-2',
  briefing:'Chelmsford route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:150.4,z:1136.3,headingDeg:14.5},
  // Cromar Way, Waterhouse Lane, Rainsford Lane, Primrose Hill, Rainsford Road, Roxwell Road, Chignal Road, Melbourne
  // Avenue, North Avenue, Kings Road, Park Avenue, Rainsford Road, Rainsford Lane, Waterhouse Lane and back along
  // Cromar Way.
  through:pts([[23,721],[-86,-115],[-802,-555],[-539,-1066],[128,-985],[156,-577],[3,755],[148,1151]]),
  // Pulled in to the kerb on Melbourne Avenue, past Pines Road.
  shifts:[{from:p(-747.3,-1024.8),to:p(-732.3,-1026.1),left:.35}],
  actors:[
    // Crossing the end of Primrose Hill, left to right, as the car comes to turn out of it.
    {id:'primrose-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[171.8,-29.2],[177.4,-39.6]])},
    {id:'rainsford-car',name:'green car',colour:'#15803d',speed:10,path:pts(RAINSFORD_CAR)},
    {id:'roxwell-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(ROXWELL_CAR)},
    // Behind the car into Melbourne Avenue, to its pull-up, and past it.
    {id:'melbourne-car',name:'grey car',colour:'#8a9099',speed:10,yields:true,path:pts(MELBOURNE_CAR)},
    // Waiting at the Melbourne Avenue zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-217.2,-1131.9],[-215.8,-1121.9]])},
    {id:'north-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(NORTH_CAR)},
    {id:'kings-car',name:'black car',colour:'#1f2328',speed:10,path:pts(KINGS_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'Cromar Way, right at the lights on to Waterhouse Lane',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(130.5,1059),
      starts:[],
      lights:p(-113.6,962.2),
      endAt:p(-112.5,916.5),
      quiet:[{x:-125,z:950,radius:32}],
      place:{
        approach:{pause:{kind:'moving',at:p(-90.6,981.9)},lights:'red',frame:{yaw:0,pitch:22},state:'Approaching the lights at the end of Cromar Way.'},
        line:{pause:{kind:'stop',at:p(-107.1,967.5)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-107.1,967.5)},lights:'red',frame:{yaw:-20,pitch:30},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach to the lights, so the traffic behind knows where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Slow down to stop at the line.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right, ready to stop at the red light.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','look-right','mirror-right'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['mirror-right'],
          rules:[
            {kind:'required',id:'check-junction',anyOf:['look-left','look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Green means go only if the way is clear. Look both ways along Waterhouse Lane for anyone late through the lights, or still crossing, before you turn.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the junction was clear: this was the time to go.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','mirror-right','go']],
          next:{go:'done'},
          explain:'Look both ways along Waterhouse Lane, then turn right: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'primrose-emerge',
      turn:'left',
      title:'Emerging, left turn, pedestrian crossing',
      where:'Primrose Hill, left on to Rainsford Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(276.5,25.9),
      starts:[{actor:'rainsford-car',at:p(243.4,3.4),delay:0},{actor:'primrose-pedestrian',at:p(243.4,3.4),delay:0}],
      endAt:p(97.7,-40),
      // The junction, and Rainsford Road to the right, where the green car comes from.
      quiet:[{x:172,z:-40,radius:26},{x:230,z:-46,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(209.8,-18.3)},frame:{yaw:0,pitch:22},state:'Approaching the end of Primrose Hill at 15 mph.'},
        pedestrian:{pause:{kind:'moving',at:p(191.7,-26.8)},when:{actor:'primrose-pedestrian',at:p(173.8,-32)},frame:{yaw:0,pitch:30},state:'Someone is crossing the end of Primrose Hill.'},
        line:{pause:{kind:'stop',at:p(179.5,-30.9)},when:{actor:'rainsford-car',at:p(228.5,-48.2)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(179.5,-30.9)},when:{actor:'rainsford-car',at:p(125.4,-37.8)},frame:{yaw:-55,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Rainsford Road knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'pedestrian'},
          explain:'Interior and left mirrors, then signal left.'
        },
        {
          id:'pedestrian',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','give-way','go','horn'],
          neutral:['look-left','look-right'],
          rules:[
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Drove at someone crossing the end of the road',
              message:'The pedestrian was crossing the end of Primrose Hill, in front of you. People crossing a road you are turning out of or into have priority. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-left','give-way'],['look-right','give-way']],
          next:{wait:'line',go:'line'},
          explain:'Give way: the pedestrian was crossing the end of Primrose Hill in front of you, and has priority.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: that is where the traffic in the lane you join comes from.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming along Rainsford Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming along Rainsford Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking on your side of Rainsford Road, coming towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming along Rainsford Road: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: nothing more was coming along Rainsford Road.'
        }
      ]
    },
    {
      id:'chignal-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Roxwell Road at the Chignal Road lights, right into Chignal Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-570,-196.9),
      starts:[{actor:'roxwell-car',at:p(-570,-196.9),delay:0}],
      lights:p(-731.7,-196.1),
      endAt:p(-746.2,-246.2),
      // The junction, and Roxwell Road ahead, where the oncoming blue car comes from.
      quiet:[{x:-740,z:-200,radius:30},{x:-800,z:-201,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(-629.9,-198.6)},frame:{yaw:0,pitch:20},state:'Approaching the lights on green.'},
        centre:{pause:{kind:'stop',at:p(-737.8,-196.6)},when:{actor:'roxwell-car',at:p(-800.4,-201)},frame:{yaw:10,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-737.8,-196.6)},when:{actor:'roxwell-car',at:p(-679.4,-201.5)},frame:{yaw:20,pitch:32},
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
              message:'Move to just left of the middle of the road to turn right: traffic behind can pass on your left.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move towards the middle of the road.'}},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming blue car',
              message:'Green does not give you priority over oncoming traffic going ahead. The blue car was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the blue car coming along Roxwell Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Chignal Road',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Chignal Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'melbourne-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Melbourne Avenue, past Pines Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-861.2,-1009.8),
      starts:[{actor:'melbourne-car',at:p(-920.6,-995.9),delay:0}],
      endAt:p(-732.3,-1026.1),
      selfCancel:false,
      quiet:[{x:-745,z:-1025,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-831.8,-1015.6)},frame:{yaw:15,pitch:28},state:'On Melbourne Avenue at 25 mph, Pines Road ahead on the left, a car behind.'},
        stopped:{pause:{kind:'stop',at:p(-732.3,-1026.1)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','signal-left','signal-right','stop-at-junction','stop-past-junction'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:{level:'serious',heading:'Use of mirrors - signalling',title:'Signalled before checking behind',
              message:'The grey car was behind. Check the mirrors before you signal and slow down, so you know how much warning it needs.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal to pull in',
              message:'Signal left before you pull in, so the grey car behind knows you are stopping.'}},
            {kind:'required',id:'place',anyOf:['stop-past-junction'],fault:{level:'serious',heading:'Normal stops',title:'No safe place chosen',
              message:'Choose where to stop before you pull in: past Pines Road, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Pines Road could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}},
            {kind:'before',id:'signal-junction',action:'signal-left',needs:['stop-past-junction','stop-at-junction'],any:true,fault:{level:'minor',heading:'Signals - timed',title:'Signal could be misread',
              message:'With Pines Road just ahead on the left, a left signal given now looks like a turn into it. Choose your place first, then signal once past the junction.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place past Pines Road; mirrors (the grey car was behind), then signal left once past the junction.'
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
              message:'Cancel the signal once you have stopped: left on, the grey car behind may wait, thinking you are about to turn.'}},
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
      id:'melbourne-move-off',
      turn:'right',
      title:'Moving off',
      where:'Melbourne Avenue, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-732.3,-1026.1),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'melbourne-car',at:p(-920.6,-995.9),delay:0}],
      endAt:p(-663.6,-1037.2),
      quiet:[{x:-732,z:-1026,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-732.3,-1026.1)},when:{actor:'melbourne-car',at:p(-760,-1022)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-732.3,-1026.1)},when:{actor:'melbourne-car',at:p(-689.7,-1031.9)},frame:{yaw:-170,pitch:26},
          state:'Still at the kerb.'}
      },
      stages:[
        {
          id:'check',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','signal-left','give-way','go'],
          neutral:['signal-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['mirror-interior','mirror-right','blind-spot-right'],any:true,fault:{level:'minor',heading:'Move off - safety',title:'Waited without looking',
              message:'Waiting was right, but check the mirrors first so you know what you are waiting for.'}},
            {kind:'unsafe',id:'pulled-into-car',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off in front of the grey car',
              message:'The grey car was just behind you, coming past. Let it go by before you move off. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the grey car behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','give-way'],['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors, then wait: the grey car was coming past.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','give-way','go'],
          neutral:['mirror-interior','signal-right'],
          rules:[
            {kind:'required',id:'fresh-blind-spot',anyOf:['blind-spot-right'],when:'go',fault:{level:'serious',heading:'Move off - safety',title:'No blind spot check before moving off',
              message:'Look over your right shoulder just before you move off: a cyclist or motorcyclist can be there, out of the mirror\'s view.'}},
            {kind:'before',id:'mirror-first',action:'go',needs:['mirror-right'],fault:{level:'minor',heading:'Move off - safety',title:'No right mirror',
              message:'Check the right mirror as well as your blind spot before moving off.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe chance to move off',
              message:'The grey car had gone by and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the grey car had gone by.'
        }
      ]
    },
    {
      id:'melbourne-zebra',
      title:'Zebra crossing',
      where:'Melbourne Avenue, the zebra crossing by Salerno Way',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-332.8,-1111.4),
      starts:[{actor:'zebra-pedestrian',at:p(-332.8,-1111.4),delay:0}],
      endAt:p(-184.5,-1132.2),
      quiet:[{x:-216,z:-1127,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-244,-1124.5)},frame:{yaw:0,pitch:22},state:'On Melbourne Avenue at 25 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(-227.2,-1126.9)},when:{actor:'zebra-pedestrian',at:p(-216.6,-1127.2)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(-227.2,-1126.9)},when:{actor:'zebra-pedestrian',at:p(-215.9,-1122.4)},frame:{yaw:0,pitch:30},
          state:'Still at the zebra crossing.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Pedestrian crossings',title:'Did not slow for the crossing',
              message:'Someone was stepping on to the zebra crossing. Slow down in good time to stop for them.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Sped up at a zebra crossing',
              message:'The pedestrian was stepping on to the zebra. Speeding up to get over first puts them at risk.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'zebra'},
          explain:'Interior mirror, then slow down: the pedestrian was stepping on to the zebra crossing.'
        },
        {
          id:'zebra',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-right','look-left'],
          rules:[
            {kind:'unsafe',id:'zebra',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove on to the zebra with someone crossing',
              message:'The pedestrian was on the zebra crossing in front of you. Give way to anyone on a zebra. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-left','give-way'],['look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the pedestrian was on the zebra crossing in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Pedestrian crossings',title:'No check before going',
              message:'Before you drive over the crossing, look both ways along it for anyone else about to step on.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a clear crossing',
              message:'The pedestrian was across and no one else was waiting: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look both ways along the crossing, then go: the pedestrian was across.'
        }
      ]
    },
    {
      id:'north-avenue-roundabout',
      turn:'right',
      title:'Roundabout, right turn',
      where:'Melbourne Avenue at the North Avenue roundabout, second exit into North Avenue',
      instruction:'At the roundabout, turn right, please.',
      instructAt:p(-134.8,-1136.5),
      starts:[{actor:'north-car',at:p(-134.8,-1136.5),delay:0}],
      endAt:p(101.7,-1050.9),
      // The roundabout, and North Avenue to the right, where the white car comes up.
      quiet:[{x:38,z:-1140,radius:30},{x:60,z:-1095,radius:32}],
      place:{
        approach:{pause:{kind:'moving',at:p(-15.5,-1147.3)},frame:{yaw:0,pitch:22},state:'Approaching the roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(8.2,-1148.8)},when:{actor:'north-car',at:p(43.5,-1122.8)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(8.2,-1148.8)},when:{actor:'north-car',at:p(89,-1161.3)},frame:{yaw:-40,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach to turn right at a roundabout, then left once you pass the exit before yours.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right to turn right at the roundabout.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming up North Avenue was on the roundabout, coming round from the right across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone out into Partridge Avenue and nothing more was coming: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the white car had gone out into Partridge Avenue.'
        }
      ]
    },
    {
      id:'kings-road-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'North Avenue, right on to Kings Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(242.4,-787),
      starts:[{actor:'kings-car',at:p(265,-743.4),delay:0}],
      endAt:p(263.7,-632.3),
      // The junction, and Kings Road to the right, where the black car comes from.
      quiet:[{x:305,z:-655,radius:28},{x:255,z:-628,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(279.7,-717.2)},frame:{yaw:0,pitch:22},state:'Approaching the end of North Avenue at 15 mph.'},
        line:{pause:{kind:'stop',at:p(306.9,-668.2)},when:{actor:'kings-car',at:p(258.7,-631.6)},frame:{yaw:-80,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(306.9,-668.2)},when:{actor:'kings-car',at:p(361.3,-686.4)},frame:{yaw:-60,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Kings Road knows where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right'],['mirror-interior','mirror-right','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Kings Road comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming along Kings Road from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming along Kings Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming along it before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Kings Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Kings Road was clear both ways.'
        }
      ]
    }
  ]
},BEFORE));
