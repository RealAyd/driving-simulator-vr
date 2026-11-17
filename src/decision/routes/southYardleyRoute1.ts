import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BARN_CAR,CLAY_N_CAR,CYCLIST,LRN_CAR,WLN_CAR} from './southYardleyRoute1Paths';

/**
 * Birmingham (South Yardley), Gilbertstone Avenue and Barn Lane: eight challenges from the test centre on Clay Lane,
 * left out of the test centre on to Clay Lane, right at the mini-roundabout on to Gilbertstone Avenue, left at the
 * Coventry Road lights, left off Coventry Road into Clay Lane, pulling up and moving off on Clay Lane, down past the
 * test centre and over the Woodcock Lane North mini-roundabout on to Clay Lane and Barn Lane, right into Richmond Road
 * across the oncoming traffic, right into Pierce Avenue, right out of Pierce Avenue on to Lincoln Road North, left at
 * the Bosworth Road crossroads on to Clay Lane and The Vineries, right at The Vineries mini-roundabout, and home by
 * Woodcock Lane North and Clay Lane, left into the test centre. Chosen from the map and the published evidence
 * (content/packs/birmingham-south-yardley/ROUTES.md).
 * Scene birmingham-south-yardley-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line. */
const BEFORE:Record<string,BeforeMerge>={
  'gilbertstone-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(274.3,-597.5)},lights:'red',when:{actor:'gilbertstone-pedestrian',at:p(295.6,-626.2)},panel:'right',frame:{yaw:0,pitch:40,shift:4},
    state:'On Gilbertstone Avenue at 30 mph. The Coventry Road lights are red.'}},
  // (In the junction: traffic queuing on Barn Lane, not the map, sets when the car gets there.)
  'richmond-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(412.2,497.4)},when:{actor:'barn-car',at:p(441.6,499.2)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting on Barn Lane to turn right into Richmond Road.'}},
  'pierce-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(291,929.3)},when:{actor:'pierce-pedestrian',at:p(279.3,932.6)},frame:{yaw:-20,pitch:40,shift:-4},
    state:'Waiting on Richmond Road to turn right into Pierce Avenue.'}},
  // (At the line: the houses on the corner hide Lincoln Road North until there.)
  'pierce-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-224,755.1)},when:{actor:'lrn-car',at:p(-222.3,725.7)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the end of Pierce Avenue.'}},
  // (At the line: the houses on the corner hide Woodcock Lane North until there.)
  'vineries-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-405.9,349.6)},when:{actor:'wln-car',at:p(-414.3,333)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}}
};

export const SOUTH_YARDLEY_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'birmingham-south-yardley-1',
  title:'South Yardley: Gilbertstone Avenue and Barn Lane',
  scene:'birmingham-south-yardley-route-1',
  briefing:'South Yardley, Gilbertstone Avenue and Barn Lane: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-348.83,z:-194.01,headingDeg:97.95},
  // The test centre's way out, Clay Lane, the Gilbertstone Avenue mini-roundabout, Gilbertstone Avenue (kept on it to
  // the lights, not by Gotham Road), Coventry Road, Clay Lane back south past the test centre, the Woodcock Lane North
  // mini-roundabout, Clay Lane, Barn Lane, Richmond Road, Pierce Avenue, Lincoln Road North, Clay Lane, The Vineries,
  // Woodcock Lane North and back into the test centre. (The last point is on the way in's bend, more than 20 m from
  // Clay Lane, so the plan takes the way in.)
  through:pts([[-175,-238],[285,-608],[200,-721],[-5,-865],[-297,-660],[-335,-80],[-245,220],[95,404],[381,720],[45,849],[-169,570],[-315,380],[-375,165],[-354,-208]]),
  // Pulled in to the kerb on Clay Lane, south of Coventry Road (no cars parked along it, and no side roads).
  shifts:[{from:p(-295.4,-588.6),to:p(-297.1,-558.8),left:.5}],
  actors:[
    {id:'clay-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(CLAY_N_CAR)},
    // Across the mouth of Gilbertstone Avenue at the lights, from the kerb on the car's left, on the red.
    {id:'gilbertstone-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[294.1,-627.5],[301.2,-621.2]])},
    // Behind the car down Clay Lane, and out round it at the kerb.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'barn-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(BARN_CAR)},
    // Along Richmond Road's far footway, across the mouth of Pierce Avenue as the car comes to turn into it.
    {id:'pierce-pedestrian',name:'pedestrian',colour:'#1d4ed8',speed:1.3,kind:'pedestrian',waits:true,path:pts([[277.4,938.1],[282,924.9]])},
    {id:'lrn-car',name:'red car',colour:'#b91c1c',speed:9,path:pts(LRN_CAR)},
    // (Paced to come down to the mini-roundabout as the car stops at the line, as a driver easing up to it would.)
    {id:'wln-car',name:'green car',colour:'#15803d',speed:9,waits:true,path:pts(WLN_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, left on to Clay Lane',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(-348.83,-194.01),
      starts:[{actor:'clay-car',at:p(-348.83,-194.01),delay:0}],
      endAt:p(-331.4,-217.3),
      // The way out, Clay Lane to the right, where the white car comes from, and to the left, towards the mini-roundabout.
      quiet:[{x:-334,z:-193,radius:18},{x:-334,z:-140,radius:34},{x:-328,z:-240,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(-338.3,-192.8)},when:{actor:'clay-car',at:p(-332.9,-157.4)},frame:{yaw:-70,pitch:32},
          state:'At the end of the test centre\'s way out, at the edge of Clay Lane.'},
        clear:{pause:{kind:'stop',at:p(-338.3,-192.8)},when:{actor:'clay-car',at:p(-330.4,-229)},frame:{yaw:-30,pitch:32},
          state:'Still at the edge of Clay Lane.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','mirror-left','signal-left','signal-right','give-way','go'],
          neutral:['look-left','mirror-interior','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning left, you join the near lane of Clay Lane, and its traffic comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the drivers on Clay Lane know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming up Clay Lane from the right was a few seconds away, in the lane you were joining. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-left','give-way'],['signal-left','look-right','give-way'],['look-right','look-left','signal-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal left and wait: the white car coming up Clay Lane from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car came by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: a driver coming down Clay Lane may be overtaking a parked car on your side.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had passed and Clay Lane was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had passed and Clay Lane was clear.'
        }
      ]
    },
    {
      id:'gilbertstone-lights',
      turn:'left',
      title:'Traffic lights, left turn',
      where:'Gilbertstone Avenue at the Coventry Road lights, left on to Coventry Road',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(187.7,-502.5),
      // (Set going as the car comes up to the lights, so they step out as it comes, whatever traffic held it up.)
      starts:[{actor:'gilbertstone-pedestrian',at:p(261.4,-585),delay:0}],
      lights:p(293,-621.5),
      endAt:p(280.3,-649.8),
      // The mouth of Gilbertstone Avenue, the junction and Coventry Road's westbound carriageway the car turns on to.
      quiet:[{x:296,z:-622,radius:16},{x:304,z:-632,radius:14},{x:282,z:-648,radius:16},{x:278,z:-600,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(267.8,-591.4)},lights:'red',frame:{yaw:0,pitch:24},state:'On Gilbertstone Avenue at 30 mph, the Coventry Road lights ahead.'},
        line:{pause:{kind:'stop',at:p(290.1,-615.5)},lights:'red',when:{actor:'gilbertstone-pedestrian',at:p(295.6,-626.2)},panel:'right',frame:{yaw:0,pitch:30},
          state:'Stopped at the lights.'},
        clear:{pause:{kind:'stop',at:p(290.1,-615.5)},when:{actor:'gilbertstone-pedestrian',at:p(299.7,-622.5)},frame:{yaw:-10,pitch:30},
          state:'Still at the lights. They have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','slow-down','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the drivers behind know you are turning on to Coventry Road.'}},
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red with someone stepping out across Gilbertstone Avenue. Speeding up to get through would put them at risk.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left','slow-down'],['mirror-left','mirror-interior','signal-left','slow-down'],['mirror-interior','mirror-left','slow-down','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, signal left, and slow down: the lights were red.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-right','look-left','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red and the pedestrian was crossing Gilbertstone Avenue in front of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-left','give-way'],['look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red and the pedestrian was crossing in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-right'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Green means go only if the way is clear. Look left along the crossing and into Coventry Road before you turn: someone may be late across.'}},
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror',
              message:'Check the left mirror before you turn left: a cyclist can come up on your left while you wait at the lights.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the pedestrian was across your side: this was the time to go.'}}
          ],
          accepted:[['mirror-left','look-left','go'],['look-left','mirror-left','go'],['look-right','mirror-left','look-left','go']],
          next:{go:'done'},
          explain:'Left mirror and a look left along the crossing, then go: the lights were green and the pedestrian was across your side.'
        }
      ]
    },
    {
      id:'clay-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Clay Lane, south of Coventry Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-293.4,-627.5),
      starts:[{actor:'cyclist',at:p(-293.4,-627.5),delay:0}],
      endAt:p(-296.6,-558.8),
      selfCancel:false,
      // The pull-up, and Clay Lane behind it.
      quiet:[{x:-297,z:-559,radius:34},{x:-292,z:-640,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(-295,-594.6)},frame:{yaw:-15,pitch:28},state:'On Clay Lane at 30 mph, Coventry Road behind you.'},
        stopped:{pause:{kind:'stop',at:p(-296.6,-558.8)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight, well clear of the Coventry Road junction behind you.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning in off Coventry Road could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place on the straight, clear of the junction; mirrors, then signal left.'
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
      id:'clay-move-off',
      turn:'right',
      title:'Moving off',
      where:'Clay Lane, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-296.6,-558.8),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(-293.4,-627.5),delay:0}],
      endAt:p(-303.8,-448.3),
      quiet:[{x:-297,z:-559,radius:50},{x:-302,z:-470,radius:20}],
      place:{
        check:{pause:{kind:'stop',at:p(-296.6,-558.8)},when:{actor:'cyclist',at:p(-297.3,-578.9)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-296.6,-558.8)},when:{actor:'cyclist',at:p(-299.4,-521.9)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by down Clay Lane and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'richmond-right',
      turn:'right',
      title:'Turning right, oncoming traffic',
      where:'Barn Lane, right into Richmond Road',
      instruction:'Take the next road on the right, please.',
      instructAt:p(282.3,488.8),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'barn-car',at:p(389.7,499),delay:0}],
      endAt:p(428.3,540),
      // The junction, Barn Lane ahead, where the oncoming car comes from, and the mouth of Richmond Road.
      quiet:[{x:417,z:498,radius:20},{x:465,z:497,radius:30},{x:427,z:528,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(360.2,500.6)},frame:{yaw:0,pitch:20},state:'On Barn Lane at 30 mph, Richmond Road ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(412.2,497.4)},when:{actor:'barn-car',at:p(441.6,499.2)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Richmond Road.'},
        clear:{pause:{kind:'stop',at:p(412.2,497.4)},when:{actor:'barn-car',at:p(392.9,501.2)},frame:{yaw:30,pitch:32},
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
              message:'Turning right, you give way to traffic coming the other way. The grey car coming along Barn Lane, going ahead past Richmond Road, was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the grey car coming along Barn Lane the other way was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Richmond Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Richmond Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'pierce-right',
      turn:'right',
      title:'Turning right, someone crossing the side road',
      where:'Richmond Road, right into Pierce Avenue',
      instruction:'Take the next road on the right, please.',
      instructAt:p(323.7,845.9),
      // (Set going as the car comes up to the turn, so they step out as it comes, whatever traffic held it up.)
      starts:[{actor:'pierce-pedestrian',at:p(302.1,901.5),delay:0}],
      endAt:p(249.9,922.5),
      // The junction, Richmond Road ahead, where oncoming traffic would come from, and the mouth of Pierce Avenue.
      quiet:[{x:288,z:932,radius:18},{x:268,z:985,radius:30},{x:266,z:926,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(304.2,896)},frame:{yaw:0,pitch:20},state:'On Richmond Road at 30 mph, Pierce Avenue ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(291,929.3)},when:{actor:'pierce-pedestrian',at:p(279.3,932.6)},frame:{yaw:-20,pitch:32},
          state:'Waiting to turn right into Pierce Avenue.'},
        clear:{pause:{kind:'stop',at:p(291,929.3)},when:{actor:'pierce-pedestrian',at:p(282,924.9)},frame:{yaw:-30,pitch:32},
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
              message:'Mirrors, signal, then position: signal before you move over.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'centre'},
          explain:'Interior and right mirrors, signal right, then position just left of the middle of the road.'
        },
        {
          id:'centre',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look into the road you are turning into first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Turned in with someone crossing',
              message:'The pedestrian crossing the mouth of Pierce Avenue was walking into your way. People crossing a road you turn into have priority. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-right','give-way'],['mirror-right','look-right','give-way'],['look-right','look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the pedestrian crossing the mouth of Pierce Avenue was walking into your way, and has priority.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Pierce Avenue',
              message:'Look into Pierce Avenue again before you turn: someone else may have stepped out behind the pedestrian.'}},
            {kind:'required',id:'check-oncoming',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check ahead',
              message:'Look along Richmond Road ahead too before you turn across it: something may be coming the other way.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The pedestrian was across and nothing was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','look-left','go']],
          next:{go:'done'},
          explain:'Look along Richmond Road and into Pierce Avenue again, then go: the pedestrian was across.'
        }
      ]
    },
    {
      id:'pierce-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Pierce Avenue, right on to Lincoln Road North',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-142.2,784.2),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'lrn-car',at:p(-204.2,761.9),delay:0}],
      endAt:p(-219.1,704.6),
      // The junction, Lincoln Road North to the right, where the red car comes from, and to the left, where it goes.
      quiet:[{x:-230,z:751,radius:18},{x:-214,z:700,radius:30},{x:-252,z:800,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(-192.9,766.1)},frame:{yaw:0,pitch:22},state:'Approaching the end of Pierce Avenue at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-224,755.1)},when:{actor:'lrn-car',at:p(-222.3,725.7)},frame:{yaw:-70,pitch:26},state:'At the end of Pierce Avenue.'},
        clear:{pause:{kind:'stop',at:p(-224,755.1)},when:{actor:'lrn-car',at:p(-238.6,773.2)},frame:{yaw:-30,pitch:26},state:'Still at the end of Pierce Avenue.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Lincoln Road North knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Lincoln Road North, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming down Lincoln Road North from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming down Lincoln Road North from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: turning right, you join the far lane, and its traffic comes from the left, up from Lincoln Road.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone by and Lincoln Road North was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the red car had gone by and Lincoln Road North was clear.'
        }
      ]
    },
    {
      id:'vineries-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'The Vineries at the Woodcock Lane North mini-roundabout, right into Woodcock Lane North',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(-324.7,378.8),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'wln-car',at:p(-378.1,359.9),delay:0}],
      endAt:p(-410.1,312.1),
      // The mini-roundabout, Woodcock Lane North to the right, where the green car comes from, and Woodcock Lane North on
      // towards Oxford Drive, where it goes.
      quiet:[{x:-417,z:344,radius:16},{x:-402,z:292,radius:28},{x:-438,z:388,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-378.1,359.9)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-405.9,349.6)},when:{actor:'wln-car',at:p(-414.3,333)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-405.9,349.6)},when:{actor:'wln-car',at:p(-429.6,373.9)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right','speed-up'],
          neutral:['mirror-left','position-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so everyone at the mini-roundabout knows you are turning into Woodcock Lane North.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the green car was coming down Woodcock Lane North, on your right.'}}
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
              message:'The green car coming down Woodcock Lane North, on your right, was at the mini-roundabout, going on across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming down Woodcock Lane North, on your right, was there first, going on across in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went across. Look right again, up Woodcock Lane North, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone on towards Oxford Drive and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the green car had gone on towards Oxford Drive.'
        }
      ]
    }
  ]
},BEFORE));
