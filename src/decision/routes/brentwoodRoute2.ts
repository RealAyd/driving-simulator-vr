import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BROOK_CAR,DRIVE_CAR,LONDON_CAR,LONDON_VAN,PULLUP_VAN,WARLEY_CAR} from './brentwoodRoute2Paths';

/**
 * Brentwood route 2, Kavanaghs Road, London Road and Mascalls Lane: eight challenges from the test centre on Warley
 * Hill, by Crescent Road and Kavanaghs Road to London Road, left at the Brook Street lights, down Mascalls Lane and
 * back up Warley Hill (the owner's route, 6 November 2026, with the Eagle Way crossroads before The Drive
 * mini-roundabout: the map has no mini-roundabout on Mascalls Lane; content/packs/brentwood/ROUTES.md). Scene
 * brentwood-routes (OpenStreetMap). A practice route, not a confirmed test route.
 */
const pts=(a:readonly (readonly number[])[]):Vec2[]=>a.map(([x,z])=>({x:x!,z:z!}));
const p=(x:number,z:number):Vec2=>({x,z});

const MIRRORS_FIRST:Fault={level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
  message:'Mirrors first, then signal: you need to know who your signal is for.'};
const HORN:Fault={level:'feedback',heading:'Use of horn',title:'Horn not needed',
  message:'Use the horn only to warn others of your presence when they may not have seen you.'};
const WRONG_LEFT:Fault={level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
  message:'You are turning left: a right signal tells everyone you are going the other way.'};

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts); Brook Street keeps a third:
 * the red light, then a car blocking the turn on green, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'crescent-road-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(534.4,-264.8)},when:{actor:'zebra-pedestrian',at:p(515.4,-271.6)},frame:{yaw:30,pitch:30},
    state:'Turning into Crescent Road, the zebra crossing just ahead.'}},
  'kavanaghs-emerge':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-349.3,-547.9)},when:{actor:'london-car',at:p(-303.4,-595.9)},frame:{yaw:-45,pitch:30},
    state:'Approaching the end of Kavanaghs Road.'}},
  'brook-street-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-1051.5,-204.6)},lights:'red',frame:{yaw:0,pitch:26},
    state:'Approaching the lights. They are red.'}},
  'eagle-way-crossroads':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(53.8,1015.7)},when:{actor:'warley-car',at:p(49.3,1086.8)},frame:{yaw:-50,pitch:28},
    state:'Approaching the crossroads.'}},
  'test-centre-entry':{first:'approach',second:'entrance',place:{pause:{kind:'moving',at:p(514.3,43.8)},when:{actor:'tc-pedestrian',at:p(514.6,29)},frame:{yaw:20,pitch:30},
    state:'Approaching the test centre\'s way in.'}}
};

export const BRENTWOOD_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'brentwood-2',
  title:'Brentwood route 2',
  scene:'brentwood-routes',
  briefing:'Brentwood route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:493.9,z:12.1,headingDeg:98},
  // Warley Hill, Crescent Road, Kavanaghs Road, London Road west, Mascalls Lane, the Eagle Way crossroads and back up
  // Warley Hill into the test centre.
  through:pts([[539,-276],[200,-130],[-64,-264],[-360,-569],[-719,-385],[-1081,-190],[-944,85],[-669,477],[-136,933],[-41,981],
    [128,956],[243,755],[366,505],[447,321],[520,10],[473,16]]),
  // Pulled in to the kerb on London Road; and over to the middle of the narrow one-way link round the island at
  // Albert Street (the lane path keeps to its right-hand edge there).
  shifts:[{from:p(-791,-345.5),to:p(-806.9,-337.2),left:.35},{from:p(391,437),to:p(392.2,432.8),left:1}],
  actors:[
    // Waiting at the Crescent Road zebra, the far side, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[514,-273],[521.6,-265.4],[518,-261.5]])},
    {id:'london-car',name:'red car',colour:'#b91c1c',speed:10,path:pts(LONDON_CAR)},
    // Well behind the red car (it turns off, left, behind the car).
    {id:'london-van',name:'white van',colour:'#f1f1ee',speed:10,yields:true,path:pts(LONDON_VAN)},
    // Behind the car to its pull-up on London Road, and past it.
    {id:'pullup-van',name:'grey van',colour:'#9aa0a6',speed:12.5,yields:true,path:pts(PULLUP_VAN)},
    // Stopped just into Mascalls Lane, in the way of the car turning in; then on, and right into Mascalls Gardens.
    {id:'brook-car',name:'silver car',colour:'#b8bcc2',speed:9,waits:true,path:pts(BROOK_CAR)},
    {id:'warley-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(WARLEY_CAR)},
    {id:'drive-car',name:'black car',colour:'#1f2328',speed:9,path:pts(DRIVE_CAR)},
    // Along the footway past the test centre's way in, from ahead.
    {id:'tc-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',path:pts([[514.6,31],[514.6,-2]])}
  ],
  challenges:[
    {
      id:'crescent-road-zebra',
      turn:'left',
      title:'Left turn, zebra crossing',
      where:'Warley Hill, left into Crescent Road',
      instruction:'Take the next road on the left, please.',
      instructAt:p(525.8,-201.6),
      starts:[{actor:'zebra-pedestrian',at:p(525.8,-201.6),delay:0}],
      endAt:p(509.5,-260),
      quiet:[{x:526,z:-272,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(527.7,-216.5)},frame:{yaw:0,pitch:20},state:'On Warley Hill at 25 mph, Crescent Road ahead on the left.'},
        zebra:{pause:{kind:'stop',at:p(524.1,-272.7)},when:{actor:'zebra-pedestrian',at:p(517.8,-269.2)},frame:{yaw:0,pitch:30},
          state:'Turned into Crescent Road, stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(524.1,-272.7)},when:{actor:'zebra-pedestrian',at:p(521.4,-265.6)},frame:{yaw:0,pitch:30},
          state:'Still at the zebra crossing.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left in good time for Crescent Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'zebra'},
          explain:'Interior and left mirrors (a cyclist could be on your left), then signal left for Crescent Road.'
        },
        {
          id:'zebra',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-right','look-left'],
          rules:[
            {kind:'unsafe',id:'zebra',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove on to the zebra with someone crossing',
              message:'The pedestrian was on the zebra crossing, coming towards your side. Give way to anyone on a zebra. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'serious',heading:'Use of horn',title:'Horn at a pedestrian',
              message:'Never sound the horn at someone crossing: it can startle them in the road.'}}
          ],
          accepted:[['give-way'],['look-left','give-way'],['look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the pedestrian was on the zebra crossing, coming across in front of you.'
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
      id:'kavanaghs-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Kavanaghs Road, left on to London Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-262,-491),
      starts:[{actor:'london-car',at:p(-262,-491),delay:0},{actor:'london-van',at:p(-262,-491),delay:0}],
      endAt:p(-377.5,-558),
      // The junction, and London Road to the right, where the red car and the van come from.
      quiet:[{x:-360,z:-568,radius:26},{x:-290,z:-604,radius:45}],
      place:{
        approach:{pause:{kind:'moving',at:p(-337,-533.7)},frame:{yaw:0,pitch:22},state:'Approaching the end of Kavanaghs Road at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-357.6,-562.6)},when:{actor:'london-car',at:p(-330.1,-582.5)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-357.6,-562.6)},when:{actor:'london-car',at:p(-388.3,-552)},frame:{yaw:-65,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach so the traffic on London Road knows where you are going.'}},
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
              message:'Look right first: that is where the traffic in the lane you join comes from.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming along London Road from the right was a few seconds away, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car passed. Look right again: the van behind it is still coming.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking on your side of London Road, coming towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The van was well back up London Road: there was time to turn left and get up to speed ahead of it.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the van was far enough back for a left turn.'
        }
      ]
    },
    {
      id:'london-road-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'London Road, past Westwood Avenue',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-639.2,-422),
      starts:[{actor:'pullup-van',at:p(-585.4,-448.6),delay:0}],
      endAt:p(-804.3,-338.6),
      selfCancel:false,
      quiet:[{x:-719,z:-385,radius:26},{x:-790,z:-346,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(-693,-395.6)},frame:{yaw:20,pitch:28},state:'On London Road at 25 mph, Westwood Avenue ahead on the left, a van behind.'},
        stopped:{pause:{kind:'stop',at:p(-804.3,-338.6)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','signal-left','signal-right','stop-at-junction','stop-past-junction'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:{level:'serious',heading:'Use of mirrors - signalling',title:'Signalled before checking behind',
              message:'The van was close behind. Check the mirrors before you signal and slow down, so you know how much warning it needs.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal to pull in',
              message:'Signal left before you pull in, so the van behind knows you are stopping.'}},
            {kind:'required',id:'place',anyOf:['stop-past-junction'],fault:{level:'serious',heading:'Normal stops',title:'No safe place chosen',
              message:'Choose where to stop before you pull in: past Westwood Avenue, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Westwood Avenue could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}},
            {kind:'before',id:'signal-junction',action:'signal-left',needs:['stop-past-junction','stop-at-junction'],any:true,fault:{level:'minor',heading:'Signals - timed',title:'Signal could be misread',
              message:'With Westwood Avenue just ahead on the left, a left signal given now looks like a turn into it. Choose your place first, then signal once past the junction.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place past Westwood Avenue; mirrors (the van was close behind), then signal left once past the junction.'
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
              message:'Cancel the signal once you have stopped: left on, the van behind may wait, thinking you are about to turn.'}},
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
      id:'london-road-move-off',
      turn:'right',
      title:'Moving off',
      where:'London Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-804.3,-338.6),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'pullup-van',at:p(-585.4,-448.6),delay:0}],
      endAt:p(-853.1,-313.3),
      quiet:[{x:-804,z:-339,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-804.3,-338.6)},when:{actor:'pullup-van',at:p(-795.5,-345.3)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-804.3,-338.6)},when:{actor:'pullup-van',at:p(-819.2,-331.2)},frame:{yaw:-170,pitch:26},
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
            {kind:'unsafe',id:'pulled-into-van',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off in front of the van',
              message:'The van was just behind you, coming past. Let it go by before you move off. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the van behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','give-way'],['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors, then wait: the van was coming past.'
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
              message:'The van had gone by and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the van had gone by.'
        }
      ]
    },
    {
      id:'brook-street-lights',
      turn:'left',
      title:'Traffic lights, left turn',
      where:'London Road at the Brook Street lights, left into Mascalls Lane',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(-1002.6,-232.5),
      starts:[{actor:'brook-car',at:p(-1063.4,-197.7),delay:3}],
      lights:p(-1071.7,-193.3),
      endAt:p(-1066.5,-161.4),
      quiet:[{x:-1076,z:-188,radius:30},{x:-1062,z:-150,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1046.3,-207.5)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the lights at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-1067.2,-195.6)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        green:{pause:{kind:'stop',at:p(-1067.2,-195.6)},lights:'red',frame:{yaw:60,pitch:30},state:'At the stop line. The lights have turned green.'},
        clear:{pause:{kind:'stop',at:p(-1067.2,-195.6)},when:{actor:'brook-car',at:p(-1049.7,-124.4)},frame:{yaw:55,pitch:30},state:'Still at the stop line, on green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the lights.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Slow down to stop at the line.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left, ready to stop at the red light.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go'],
          neutral:['look-left','look-right','mirror-left'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-left','give-way']],
          next:{wait:'green',go:'green'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'green',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','mirror-left','look-right','give-way','go','horn'],
          neutral:['look-right','mirror-left'],
          rules:[
            {kind:'before',id:'look-into-road',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look into Mascalls Lane first: that is what you are waiting for.'}},
            {kind:'unsafe',id:'no-space',action:'go',fault:{level:'serious',heading:'Junctions - observation',title:'Turned in with no space to finish the turn',
              message:'Green means go only if there is space. The silver car stopped just inside Mascalls Lane left no room: you would have been stuck across the junction. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'serious',heading:'Use of horn',title:'Horn to hurry a driver',
              message:'The horn is not for telling another driver to move: wait for the silver car to go.'}}
          ],
          accepted:[['look-left','give-way'],['look-left','mirror-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line, even on green: the silver car stopped just inside Mascalls Lane left no space to complete the turn.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','mirror-left','look-right','give-way','go'],
          neutral:['look-right','look-left'],
          rules:[
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: a cyclist may have come up beside you while you waited.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The silver car had moved on and the lights were green: this was the time to go.'}}
          ],
          accepted:[['mirror-left','go'],['look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Left mirror, then go: the lights were green and the silver car had moved on.'
        }
      ]
    },
    {
      id:'eagle-way-crossroads',
      turn:'left',
      title:'Crossroads, left turn',
      where:'Mascalls Lane at the Eagle Way crossroads, left on to Warley Hill',
      instruction:'At the crossroads, turn left, please.',
      instructAt:p(-31,984.8),
      starts:[{actor:'warley-car',at:p(-31,984.8),delay:0}],
      endAt:p(92.7,1005.5),
      // The crossroads, and Warley Road to the right, where the blue car comes from.
      quiet:[{x:80,z:1029,radius:30},{x:40,z:1110,radius:36}],
      place:{
        approach:{pause:{kind:'moving',at:p(25.7,1003.9)},frame:{yaw:0,pitch:22},state:'Approaching the crossroads at 20 mph.'},
        line:{pause:{kind:'stop',at:p(72.1,1023.9)},when:{actor:'warley-car',at:p(61.3,1059.7)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(72.1,1023.9)},when:{actor:'warley-car',at:p(102.4,990.4)},frame:{yaw:-55,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach: at a crossroads, others need to know you are not going ahead.'}},
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
              message:'Look right first: the traffic coming up Warley Road joins the lane you turn into.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming up Warley Road from the right was close, going ahead into the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming up Warley Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-ahead',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: traffic coming down Warley Hill, and from Eagle Way opposite, can be turning across your way.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The crossroads was clear every way: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go, keeping well to the left on Warley Hill.'
        }
      ]
    },
    {
      id:'the-drive-mini',
      title:'Mini-roundabout, ahead',
      where:'Warley Hill at The Drive, ahead',
      instruction:'At the mini-roundabout, follow the road ahead, please.',
      instructAt:p(290.1,650.2),
      starts:[{actor:'drive-car',at:p(290.1,650.2),delay:0}],
      endAt:p(350.1,531.5),
      quiet:[{x:340,z:556,radius:28},{x:372,z:500,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(331.7,568.1)},when:{actor:'drive-car',at:p(348.9,541.3)},frame:{yaw:-5,pitch:24},
          state:'Approaching the mini-roundabout at 15 mph.'}
      },
      stages:[
        {
          id:'approach',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','mirror-left','mirror-right','signal-left','signal-right','give-way','go'],
          neutral:['look-left','mirror-interior','mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look right',
              message:'Look right into The Drive before you go: at a mini-roundabout, traffic from the right has priority.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Gave way when there was no need',
              message:'The black car coming the other way was going straight on, past you in its own lane, and nothing was coming out of The Drive: there was no one to give way to.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: a left signal says you are turning left into The Drive.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: a right signal says you are turning right, round the mini-roundabout.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['mirror-interior','look-right','go']],
          next:{go:'done'},
          explain:'Look right, then carry on ahead without stopping: nothing was coming from The Drive, and the oncoming black car was going straight on in its own lane.'
        }
      ]
    },
    {
      id:'test-centre-entry',
      turn:'left',
      title:'Into the test centre',
      where:'Warley Hill, left into the test centre',
      instruction:'Turn left into the test centre, please.',
      instructAt:p(501.3,118),
      starts:[{actor:'tc-pedestrian',at:p(505.1,98.4),delay:0}],
      endAt:p(495.5,15.1),
      quiet:[{x:516,z:20,radius:28}],
      place:{
        approach:{pause:{kind:'moving',at:p(508.7,78.7)},frame:{yaw:0,pitch:22},state:'On Warley Hill at 25 mph, the test centre ahead on the left.'},
        entrance:{pause:{kind:'stop',at:p(516.2,25.3)},when:{actor:'tc-pedestrian',at:p(514.6,16.5)},frame:{yaw:25,pitch:32},
          state:'Stopped at the way in.'},
        clear:{pause:{kind:'stop',at:p(516.2,25.3)},when:{actor:'tc-pedestrian',at:p(514.6,10)},frame:{yaw:25,pitch:32},
          state:'Still at the way in.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left in good time for the test centre.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'entrance'},
          explain:'Interior and left mirrors, then signal left.'
        },
        {
          id:'entrance',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go','horn'],
          neutral:['look-right','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look along the footway first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'across-footway',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Turned in across the pedestrian',
              message:'The pedestrian was walking across the way in. People on the footway have priority over you turning in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'serious',heading:'Use of horn',title:'Horn at a pedestrian',
              message:'Sounding the horn to hurry someone on the footway is aggressive and can startle them. Wait for them to pass.'}}
          ],
          accepted:[['look-left','give-way'],['look-left','mirror-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the pedestrian walking along the footway was crossing the way in.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','mirror-left','look-right','give-way','go'],
          neutral:['look-right','look-left'],
          rules:[
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn in: a cyclist may have come up on your left while you waited.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited when the way in was clear',
              message:'The pedestrian was past and the way in was clear: this was the time to turn in.'}}
          ],
          accepted:[['mirror-left','go'],['look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Left mirror, then turn in: the pedestrian had passed.'
        }
      ]
    }
  ]
},BEFORE));
