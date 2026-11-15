import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {MANOR_DOWN,MILL_CAR,PASS_CAR,RAMPART_CAR,WAIN_CAR} from './salisburyRoute2Paths';

/**
 * Salisbury route 2, the city and Castle Street: eight challenges from the test centre on Rougemont Close, right on to
 * Manor Road, Kelsey Road and Rampart Road, right at the Milford Street lights, through the city by New Canal and
 * Minster Street, up Castle Street past Chipper Lane and the Mill Stream Approach mini-roundabout, round Castle
 * Roundabout, and home by Churchill Way North, St Mark's Roundabout, Wain-a-long Road and Manor Road. Chosen from the
 * map and the roads public information names (content/packs/salisbury/ROUTES.md). Scene salisbury-route-2
 * (OpenStreetMap). A practice route, not a confirmed test route.
 */
const pts=(a:readonly (readonly number[])[]):Vec2[]=>a.map(([x,z])=>({x:x!,z:z!}));
const p=(x:number,z:number):Vec2=>({x,z});

const MIRRORS_FIRST:Fault={level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
  message:'Mirrors first, then signal: you need to know who your signal is for.'};
const HORN:Fault={level:'feedback',heading:'Use of horn',title:'Horn not needed',
  message:'Use the horn only to warn others of your presence when they may not have seen you.'};
const WRONG_RIGHT:Fault={level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
  message:'You are turning right: a left signal tells everyone you are going the other way.'};
const PED_HORN:Fault={level:'serious',heading:'Use of horn',title:'Horn at a pedestrian',
  message:'Never sound the horn at someone crossing: it can startle them in the road.'};

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first on the move unless
 * the hazard is in view only at the line. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the houses on the corner hide Manor Road to the left until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(209.2,-168.2)},when:{actor:'manor-down',at:p(224.1,-186.2)},panel:'right',frame:{yaw:60,pitch:44,shift:4},
    state:'At the end of Rougemont Close.'}},
  'milford-lights':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(46.2,218.4)},when:{actor:'rampart-car',at:p(52.2,291.4)},frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Milford Street lights on green.'}},
  'castle-street-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-445.3,54.6)},lights:'red',when:{actor:'castle-pedestrian',at:p(-442,29.3)},panel:'right',frame:{yaw:0,pitch:44,shift:5},
    state:'On Castle Street, the Chipper Lane lights ahead. They are red.'}},
  'castle-street-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-421.3,-251.2)},when:{actor:'mill-car',at:p(-420.9,-282.8)},frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the mini-roundabout at Mill Stream Approach.'}},
  'castle-roundabout':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-489.6,-536.2)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching Castle Roundabout. The lights are red.'}},
  'manor-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(300.9,-382.3)},when:{actor:'wain-car',at:p(313.5,-316.1)},frame:{yaw:0,pitch:44,shift:-4},
    state:'On Wain-a-long Road, Manor Road just ahead on the right.'}}
};

export const SALISBURY_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'salisbury-2',
  title:'Salisbury route 2',
  scene:'salisbury-route-2',
  briefing:'Salisbury route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:179.1,z:-181.6,headingDeg:115},
  // Rougemont Close, Manor Road, Kelsey Road (pulling up and moving off), Rampart Road, Milford Street, New Canal, High
  // Street, Silver Street, Minster Street, Castle Street, Castle Roundabout, Churchill Way North, St Mark's Roundabout,
  // Wain-a-long Road, Manor Road and back into Rougemont Close.
  through:pts([[205,-100],[120,-30],[52,120],[-50,238],[-300,243],[-445,170],[-447,0],[-440,-200],[-460,-480],[-350,-700],[-150,-640],
    [296.8,-380.2],[234.8,-290.2],[187.8,-179.2]]),
  // Pulled in to the kerb on Kelsey Road, short of Elm Grove Road (the cars parked there are on the far side); wide of
  // the inside corners from High Street into Silver Street and from Silver Street into Minster Street.
  shifts:[{from:p(132,-31.3),to:p(118.3,-28.6),left:.35},{from:p(-496,230.5),to:p(-495.7,226.6),left:.6},{from:p(-436.4,217.1),to:p(-432,213.2),left:-.6}],
  actors:[
    // Down Manor Road from the left as the car comes out of Rougemont Close, in the lane it joins.
    {id:'manor-down',name:'white car',colour:'#e5e7eb',speed:10,path:pts(MANOR_DOWN)},
    // Down Manor Road and along Kelsey Road behind the car, coming up to it pulled up, and past it.
    {id:'pass-car',name:'grey car',colour:'#8a9099',speed:10,yields:true,path:pts(PASS_CAR)},
    {id:'rampart-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(RAMPART_CAR)},
    // Waiting at the Castle Street lights on the left, then across in front of the car.
    {id:'castle-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-443.6,29.1],[-436.4,30.1]])},
    {id:'mill-car',name:'black car',colour:'#1f2328',speed:10,path:pts(MILL_CAR)},
    {id:'wain-car',name:'green car',colour:'#15803d',speed:10,path:pts(WAIN_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'Rougemont Close, right on to Manor Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(181.7,-180.1),
      starts:[{actor:'manor-down',at:p(179.1,-181.6),delay:0}],
      endAt:p(218.8,-147.3),
      // The junction, and Manor Road to the left, where the white car comes from.
      quiet:[{x:219,z:-163,radius:24},{x:228,z:-215,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(196,-174)},frame:{yaw:0,pitch:22},state:'Leaving the test centre along Rougemont Close.'},
        line:{pause:{kind:'stop',at:p(209.2,-168.2)},when:{actor:'manor-down',at:p(224.1,-186.2)},panel:'right',frame:{yaw:75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(209.2,-168.2)},when:{actor:'manor-down',at:p(217.2,-138.9)},frame:{yaw:-40,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so anyone on Manor Road knows where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look both ways, and left as well as right: turning right, you join the lane of the traffic coming from the left.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming down Manor Road from the left was close, in the lane you were turning into. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','look-left','give-way'],['look-left','look-right','give-way'],['look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming down Manor Road from the left was close, in the lane you were turning into.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look left',
              message:'Your last look left was before the white car passed. Look left again just before you go.'}},
            {kind:'required',id:'look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look right',
              message:'Look right too before you go: turning right, you cross the lane of anyone coming up Manor Road.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Manor Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Manor Road was clear both ways.'
        }
      ]
    },
    {
      id:'kelsey-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Kelsey Road, past Manor Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(183.1,-41.1),
      starts:[{actor:'pass-car',at:p(210.3,-108.3),delay:0}],
      endAt:p(118.3,-28.6),
      selfCancel:false,
      // The car's pull-up, and the end of Manor Road, where the grey car turns in behind it.
      quiet:[{x:118,z:-29,radius:34},{x:200,z:-45,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(158.5,-36.3)},frame:{yaw:15,pitch:28},state:'On Kelsey Road, Elm Grove Road ahead on the left.'},
        stopped:{pause:{kind:'stop',at:p(118.3,-28.6)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Manor Road and short of Elm Grove Road, clear of both junctions.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning into Elm Grove Road would have to swing out round you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}},
            {kind:'before',id:'signal-junction',action:'signal-left',needs:['stop-past-junction','stop-at-junction'],any:true,fault:{level:'minor',heading:'Signals - timed',title:'Signal could be misread',
              message:'With Elm Grove Road ahead on the left, a left signal given too early looks like a turn into it. Choose your place first, then signal.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place clear of the junctions, short of Elm Grove Road; mirrors, then signal left.'
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
              message:'Cancel the signal once you have stopped: left on, others may think you are about to turn into Elm Grove Road.'}},
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
      id:'kelsey-move-off',
      turn:'right',
      title:'Moving off',
      where:'Kelsey Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(118.3,-28.6),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'pass-car',at:p(210.3,-108.3),delay:0}],
      endAt:p(69.2,-19.3),
      quiet:[{x:118,z:-29,radius:50},{x:200,z:-45,radius:22}],
      place:{
        check:{pause:{kind:'stop',at:p(118.3,-28.6)},when:{actor:'pass-car',at:p(143,-34.7)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(118.3,-28.6)},when:{actor:'pass-car',at:p(94.1,-24)},frame:{yaw:-170,pitch:26},
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
              message:'The grey car coming along Kelsey Road was just behind you, about to pass. Let it go by before you move off. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the grey car behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','give-way'],['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors, then wait: the grey car was coming up behind to pass.'
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
      id:'milford-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Rampart Road at the Milford Hill lights, right into Milford Street',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(41.6,150.6),
      starts:[{actor:'rampart-car',at:p(44.9,70.6),delay:0}],
      lights:p(47,239.4),
      endAt:p(4.7,246.8),
      // The junction, and Rampart Road ahead, where the oncoming blue car comes from.
      quiet:[{x:46,z:250,radius:28},{x:52,z:295,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(44.7,190)},frame:{yaw:0,pitch:20},state:'Approaching the lights on green.'},
        centre:{pause:{kind:'stop',at:p(47,244.3)},when:{actor:'rampart-car',at:p(49.2,276.7)},frame:{yaw:10,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(47,244.3)},when:{actor:'rampart-car',at:p(42.1,207.2)},frame:{yaw:20,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The blue car coming up Rampart Road was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the blue car coming up Rampart Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Milford Street',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Milford Street is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'castle-street-lights',
      title:'Traffic lights, pedestrian crossing',
      where:'Castle Street at the Chipper Lane lights, ahead',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-447.7,74.5),
      starts:[{actor:'castle-pedestrian',at:p(-436.3,116.7),delay:0}],
      lights:p(-442.1,31.9),
      endAt:p(-439.3,10),
      quiet:[{x:-441,z:28,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-448.2,79.4)},lights:'red',frame:{yaw:0,pitch:22},state:'On Castle Street, the lights ahead.'},
        line:{pause:{kind:'stop',at:p(-442.8,37.2)},lights:'red',when:{actor:'castle-pedestrian',at:p(-442,29.3)},panel:'right',frame:{yaw:0,pitch:30},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-442.8,37.2)},lights:'red',when:{actor:'castle-pedestrian',at:p(-436.6,30.1)},panel:'right',frame:{yaw:0,pitch:30},
          state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-right','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red and someone was crossing. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red for someone crossing Castle Street. Speeding up to get through puts them at risk.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: a right signal says you are turning, and Chipper Lane is one-way towards you.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the lights were red and someone was stepping on to the crossing.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['look-left','look-right','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'crossing',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove on to the crossing on red',
              message:'The lights were red and the pedestrian was crossing in front of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-left','give-way'],['look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the lights were red and the pedestrian was crossing in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Pedestrian crossings',title:'No check before going',
              message:'Green means go only if the crossing is clear. Look both ways along it for anyone hurrying across late before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look both ways along the crossing, then go: the pedestrian was across and the lights were green.'
        }
      ]
    },
    {
      id:'castle-street-mini',
      title:'Mini-roundabout, ahead',
      where:'Castle Street at the Mill Stream Approach mini-roundabout, ahead',
      instruction:'At the mini-roundabout, follow the road ahead, please.',
      instructAt:p(-423.6,-179.3),
      starts:[{actor:'mill-car',at:p(-426.5,-139.4),delay:0}],
      endAt:p(-425.6,-295.2),
      // The mini-roundabout, Castle Street beyond, where the black car comes from, and Mill Stream Approach, where it goes.
      quiet:[{x:-422,z:-270,radius:18},{x:-421,z:-295,radius:25},{x:-445,z:-265,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-423.6,-210)},frame:{yaw:0,pitch:22},state:'On Castle Street, past the zebra crossing, the mini-roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(-422.3,-260.2)},when:{actor:'mill-car',at:p(-420.9,-282.8)},frame:{yaw:-20,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-422.3,-260.2)},when:{actor:'mill-car',at:p(-439.2,-265.3)},frame:{yaw:0,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','signal-left','signal-right'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'minor',heading:'Junctions - approach speed',title:'Did not slow for the mini-roundabout',
              message:'Slow down on the approach so you can give way if anything comes from the right.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: a left signal says you are turning into Mill Stream Approach.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: no signal is needed, and a right signal says you are going round the mini-roundabout.'}}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down; no signal, going ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic from the right, and the black car turning across came round from there.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming down Castle Street was turning right round the mini-roundabout, across your way, and it was on your right. Give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming down Castle Street was turning right round the mini-roundabout, across your way.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had turned into Mill Stream Approach and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone and nothing more was coming.'
        }
      ]
    },
    {
      id:'castle-roundabout',
      turn:'right',
      title:'Roundabout with traffic lights',
      where:'Castle Street at Castle Roundabout, third exit on to Churchill Way North',
      instruction:'At the roundabout, take the third exit, that\'s to the right.',
      instructAt:p(-477.4,-487.9),
      starts:[],
      lights:p(-494.4,-564.1),
      endAt:p(-447.6,-635.1),
      // The entry, and the circulating carriageway to the right.
      quiet:[{x:-494,z:-567,radius:18},{x:-482,z:-588,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-485.5,-510)},lights:'red',frame:{yaw:0,pitch:22},state:'On Castle Street, Castle Roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(-492.1,-559.3)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-492.1,-559.3)},lights:'red',frame:{yaw:-40,pitch:30},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the third exit',
              message:'Going past the twelve o\'clock exit, signal right on the approach, and change to left once you pass the exit before yours.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Slow down to stop at the line.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for the third exit, ready to stop at the red light.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','look-right','mirror-right'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red, with traffic going round the roundabout in front of you. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look right before going',
              message:'Green means go only if the way is clear. Look right round the roundabout for anyone late through their red light before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the roundabout was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go'],['look-right','mirror-right','go']],
          next:{go:'done'},
          explain:'Look right round the roundabout, then go: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'manor-right',
      turn:'right',
      title:'Turning right into a side road',
      where:'Wain-a-long Road, right into Manor Road',
      instruction:'Take the next road on the right.',
      instructAt:p(294.4,-432),
      starts:[{actor:'wain-car',at:p(284.2,-448.5),delay:0}],
      // (St Mark's Roundabout's lights on the way, held green: the car is not kept standing at them behind a queue.)
      lights:p(230.7,-470.9),lightsAll:true,
      endAt:p(266.7,-347.7),
      // The junction, and Wain-a-long Road ahead, where the green car comes from.
      quiet:[{x:296,z:-356,radius:22},{x:312,z:-318,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(302.3,-413.7)},frame:{yaw:0,pitch:20},state:'On Wain-a-long Road, Manor Road ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(297.3,-359.7)},when:{actor:'wain-car',at:p(309,-325)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Manor Road.'},
        clear:{pause:{kind:'stop',at:p(297.3,-359.7)},when:{actor:'wain-car',at:p(297.4,-381.5)},frame:{yaw:20,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming green car',
              message:'The green car coming up Wain-a-long Road was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the green car coming up Wain-a-long Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Manor Road',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming up Wain-a-long Road: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Manor Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
