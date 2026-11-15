import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EPSOM_CAR,REIGATE_CAR,RIDGE_CAR,STONECOT_CAR} from './mordenRoute1Paths';

/**
 * Morden route 1, Sutton Common Road, Forest Road and Reigate Avenue: eight challenges from the test centre at 10
 * Tudor Drive (its service road off Tudor Drive, by the Epsom Road lights), ahead at the Tudor Drive lights into Sutton
 * Common Road, left at the Forest Road mini-roundabout, pulling up and moving off on Forest Road, Love Lane and
 * Glastonbury Road, right on to Reigate Avenue, back up Sutton Common Road over its zebra crossing, Woodstock Avenue
 * and Elm Road West, left on to Epsom Road, and right into the test centre. Chosen from the map and the published
 * evidence (content/packs/morden-london/ROUTES.md). Scene morden-route-1 (OpenStreetMap). A practice route, not a
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

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first on the move unless
 * the hazard is in view only at the line; leaving the test centre keeps a third: the red light, then someone still
 * crossing on green, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-775.9,159.8)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Tudor Drive lights. They are red.'}},
  'forest-road-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-263.9,497.5)},when:{actor:'ridge-car',at:p(-259.9,531.6)},frame:{yaw:-40,pitch:30},
    state:'Approaching the mini-roundabout.'}},
  // (At the line: the houses on the corner hide Reigate Avenue until there.)
  'reigate-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(311.4,692.6)},when:{actor:'reigate-car',at:p(292.9,714.6)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Glastonbury Road.'}},
  'sutton-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(-96.9,800.2)},when:{actor:'zebra-pedestrian',at:p(-107.4,779.2)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Sutton Common Road, the zebra crossing just ahead.'}},
  // (At the line, as above: the corner hides Epsom Road to the right.)
  'elm-road-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-564.8,-36.6)},when:{actor:'epsom-car',at:p(-549.1,-62.9)},frame:{yaw:-65,pitch:40,shift:-4},
    state:'At the end of Elm Road West.'}},
  'centre-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(-695,121.7)},when:{actor:'stonecot-car',at:p(-752.3,180.5)},frame:{yaw:0,pitch:40,shift:-4},
    state:'On Epsom Road, the test centre\'s way in just ahead on the right.'}}
};

export const MORDEN_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'morden-london-1',
  title:'Morden route 1',
  scene:'morden-route-1',
  briefing:'Morden route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-765,z:154.6,headingDeg:303},
  // The test centre's service road, Tudor Drive, Sutton Common Road, Forest Road, Love Lane, Glastonbury Road, Reigate
  // Avenue, Sutton Common Road, Woodstock Avenue, Elm Road West, Epsom Road and back into the service road.
  through:pts([[-491,350],[-44,347],[138,403],[315,699],[150,830],[-150,650],[-450,400],[-599,151],[-531,-13],[-640,50],[-750,150]]),
  // Pulled in to the kerb on Forest Road, past Romany Gardens (no cars parked along it: room for the cyclist to pass).
  shifts:[{from:p(-66,362.8),to:p(-45.2,345.6),left:.35}],
  actors:[
    // Crossing Sutton Common Road, right to left, on the far side of the junction, still crossing as the lights turn green.
    {id:'crossing-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-737.4,196],[-730.2,185.2]])},
    {id:'ridge-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(RIDGE_CAR)},
    // Behind the car along Forest Road, past it at the kerb, and left into Morden Way.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'reigate-car',name:'blue car',colour:'#2563eb',speed:11,path:pts(REIGATE_CAR)},
    // Waiting at the Sutton Common Road zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-109.6,780.3],[-101.4,776.3]])},
    {id:'epsom-car',name:'black car',colour:'#1f2328',speed:10,path:pts(EPSOM_CAR)},
    {id:'stonecot-car',name:'silver car',colour:'#c3c7cf',speed:10,path:pts(STONECOT_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      title:'Leaving the test centre',
      where:'Out of the test centre on to Tudor Drive, ahead at the Epsom Road lights into Sutton Common Road',
      // (Said once the car has turned out of the way out: the way back in passes the start, so a point on Tudor Drive.)
      instruction:'At the traffic lights, follow the road ahead, please.',
      instructAt:p(-780.9,156.5),
      starts:[{actor:'crossing-pedestrian',at:p(-780.9,156.5),delay:0}],
      lights:p(-763.6,164.8),
      endAt:p(-719.2,198.1),
      quiet:[{x:-748,z:182,radius:32},{x:-734,z:191,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-775.9,159.8)},lights:'red',frame:{yaw:0,pitch:22},state:'Approaching the Tudor Drive lights.'},
        line:{pause:{kind:'stop',at:p(-768.2,163.9)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        green:{pause:{kind:'stop',at:p(-768.2,163.9)},lights:'red',when:{actor:'crossing-pedestrian',at:p(-732.4,188.5)},frame:{yaw:0,pitch:36,shift:4},
          state:'At the stop line. The lights have turned green.'},
        clear:{pause:{kind:'stop',at:p(-768.2,163.9)},when:{actor:'crossing-pedestrian',at:p(-730.6,185.8)},frame:{yaw:0,pitch:36,shift:4},
          state:'Still at the stop line, on green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-left','signal-right'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic crossing from Epsom Road and Stonecot Hill at risk.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Sutton Common Road: a left signal says you are turning on to Epsom Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Sutton Common Road: a right signal says you are turning on to Stonecot Hill.'}}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the lights were red. No signal: you were going ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go'],
          neutral:['look-left','look-right','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-interior','give-way']],
          next:{wait:'green',go:'green'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'green',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left','look-right'],any:true,fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look across the junction first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Moved off with someone still crossing',
              message:'Green means go only if the way is clear. The pedestrian was still on the crossing at the start of Sutton Common Road, walking into your lane. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','give-way'],['look-right','look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait, even on green: the pedestrian was still crossing Sutton Common Road, in the lane you were going into.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-junction',anyOf:['look-left','look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before going',
              message:'Green means go only if the way is clear. Look across the junction for anyone late through the lights from Epsom Road or Stonecot Hill before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look across the junction both ways, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'forest-road-mini',
      turn:'left',
      title:'Mini-roundabout, left turn',
      where:'Sutton Common Road at the Forest Road mini-roundabout, left into Forest Road',
      instruction:'At the mini-roundabout, turn left, please.',
      instructAt:p(-334.9,450.7),
      starts:[{actor:'ridge-car',at:p(-309.8,467.2),delay:0}],
      endAt:p(-221.8,495.8),
      // The mini-roundabout, and Ridge Road to the right, where the white car comes from.
      quiet:[{x:-242,z:517,radius:26},{x:-285,z:550,radius:36}],
      place:{
        approach:{pause:{kind:'moving',at:p(-268.1,494.7)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 25 mph.'},
        line:{pause:{kind:'stop',at:p(-251.6,506.1)},when:{actor:'ridge-car',at:p(-253.3,525.8)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-251.6,506.1)},when:{actor:'ridge-car',at:p(-207.2,457.8)},frame:{yaw:15,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the mini-roundabout, so the traffic on it and behind you knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left for Forest Road.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming up Ridge Road from the right was close, going ahead into Forest Road, the road you were turning into. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming up Ridge Road from the right was close, on its way across the mini-roundabout into Forest Road.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went across. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had turned off into Morden Way and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the white car had gone and nothing more was coming.'
        }
      ]
    },
    {
      id:'forest-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Forest Road, past Romany Gardens',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-85.3,378.6),
      starts:[{actor:'cyclist',at:p(-85.3,378.6),delay:0}],
      endAt:p(-45.2,345.6),
      selfCancel:false,
      quiet:[{x:-45,z:346,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-69.8,366)},frame:{yaw:-15,pitch:28},state:'On Forest Road at 20 mph, Romany Gardens just on the left.'},
        stopped:{pause:{kind:'stop',at:p(-45.2,345.6)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Romany Gardens, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Romany Gardens could not see past you, and those turning in would meet you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Romany Gardens; mirrors, then signal left.'
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
      id:'forest-move-off',
      turn:'right',
      title:'Moving off',
      where:'Forest Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-45.2,345.6),
      // (Along Forest Road behind the car as it comes to pull up.)
      starts:[{actor:'cyclist',at:p(-85.3,378.6),delay:0}],
      endAt:p(6.3,301.3),
      quiet:[{x:-45,z:346,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-45.2,345.6)},when:{actor:'cyclist',at:p(-56.5,357.1)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-45.2,345.6)},when:{actor:'cyclist',at:p(-21.7,307.8)},frame:{yaw:-170,pitch:26},
          state:'Still at the kerb.'}
      },
      stages:[
        {
          id:'check',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','signal-left','give-way','go'],
          neutral:['signal-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['mirror-right','blind-spot-right'],any:true,fault:{level:'minor',heading:'Move off - safety',title:'Waited without looking',
              message:'Waiting was right, but check the right mirror and over your shoulder first so you know what you are waiting for.'}},
            {kind:'unsafe',id:'pulled-into-cyclist',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off into the cyclist',
              message:'The cyclist coming along Forest Road was just behind your right shoulder, about to pass. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the cyclist behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','blind-spot-right','give-way'],['blind-spot-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors and your right blind spot, then wait: the cyclist was coming past.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','give-way','go'],
          neutral:['mirror-interior','signal-right'],
          rules:[
            {kind:'required',id:'fresh-blind-spot',anyOf:['blind-spot-right'],when:'go',fault:{level:'serious',heading:'Move off - safety',title:'No blind spot check before moving off',
              message:'Look over your right shoulder just before you move off: a cyclist can be there, out of the mirror\'s view.'}},
            {kind:'before',id:'mirror-before-blind-spot',action:'go',needs:['mirror-right'],fault:{level:'minor',heading:'Move off - safety',title:'No right mirror',
              message:'Check the right mirror as well as your blind spot before moving off.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe chance to move off',
              message:'The cyclist had gone by, turning into Morden Way, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'reigate-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Glastonbury Road, right on to Reigate Avenue',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(243,601.2),
      starts:[{actor:'reigate-car',at:p(264.2,635),delay:0}],
      endAt:p(270.6,737.9),
      // The junction, Reigate Avenue to the right (south-west), where the blue car comes from, and to the north-east, where it goes.
      quiet:[{x:314,z:700,radius:28},{x:262,z:745,radius:45},{x:360,z:657,radius:36}],
      place:{
        approach:{pause:{kind:'moving',at:p(298.7,677.8)},frame:{yaw:0,pitch:22},state:'Approaching the end of Glastonbury Road at 15 mph.'},
        line:{pause:{kind:'stop',at:p(311.4,692.6)},when:{actor:'reigate-car',at:p(292.9,714.6)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(311.4,692.6)},when:{actor:'reigate-car',at:p(344.2,671.6)},frame:{yaw:-40,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Reigate Avenue knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Reigate Avenue comes from the right, and it is a 40 mph road.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming along Reigate Avenue from the right was close and fast, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming along Reigate Avenue from the right was close, and on a 40 mph road it closes the gap fast.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming along it before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Reigate Avenue was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Reigate Avenue was clear both ways.'
        }
      ]
    },
    {
      id:'sutton-zebra',
      title:'Zebra crossing',
      where:'Sutton Common Road, the zebra crossing by Taunton Close',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-47.6,901.9),
      starts:[{actor:'zebra-pedestrian',at:p(-56.2,883.9),delay:0}],
      endAt:p(-117.2,757.9),
      quiet:[{x:-105,z:778,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-93.4,807.5)},frame:{yaw:0,pitch:22},state:'On Sutton Common Road at 25 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(-102.9,787.6)},when:{actor:'zebra-pedestrian',at:p(-106.9,779.1)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(-102.9,787.6)},when:{actor:'zebra-pedestrian',at:p(-101.7,776.4)},frame:{yaw:0,pitch:30},
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
      id:'elm-road-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Elm Road West, left on to Epsom Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-505.8,4.1),
      starts:[{actor:'epsom-car',at:p(-545.5,-26.1),delay:0}],
      endAt:p(-593.6,-8.5),
      // The crossroads, Epsom Road to the right (north-east), where the black car comes from, and Lower Morden Lane, where it turns.
      quiet:[{x:-571,z:-40,radius:26},{x:-540,z:-80,radius:36},{x:-600,z:-62,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-545.5,-26.1)},frame:{yaw:0,pitch:22},state:'Approaching the end of Elm Road West at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-564.8,-36.6)},when:{actor:'epsom-car',at:p(-549.1,-62.9)},frame:{yaw:-70,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-564.8,-36.6)},when:{actor:'epsom-car',at:p(-605.9,-61.3)},frame:{yaw:-30,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Epsom Road knows where you are going.'}},
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming down Epsom Road from the right was close. It was signalling to turn into Lower Morden Lane, but a signal is no promise: never pull out until you see it turn. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming down Epsom Road from the right was close. It signalled to turn into Lower Morden Lane, but wait until it does.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car turned. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking on your side of Epsom Road, coming towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had turned into Lower Morden Lane and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the black car had turned off and Epsom Road was clear.'
        }
      ]
    },
    {
      id:'centre-right',
      turn:'right',
      title:'Right turn into the test centre',
      where:'Epsom Road, right into the test centre',
      instruction:'Turn right into the test centre, please.',
      instructAt:p(-648.5,62.8),
      starts:[{actor:'stonecot-car',at:p(-624,31.2),delay:0}],
      // (The Tudor Drive lights held green all round: the silver car comes through them from Stonecot Hill.)
      lights:p(-759.2,192.8),lightsAll:true,
      endAt:p(-732.9,146.7),
      // The way in, Epsom Road ahead, where the oncoming silver car comes from, and the junction.
      quiet:[{x:-714,z:146,radius:20},{x:-735,z:165,radius:24},{x:-750,z:185,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-685.7,109.9)},frame:{yaw:0,pitch:20},state:'On Epsom Road at 30 mph, the test centre\'s way in ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(-713.2,143.7)},when:{actor:'stonecot-car',at:p(-736.2,162.5)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into the test centre.'},
        clear:{pause:{kind:'stop',at:p(-713.2,143.7)},when:{actor:'stonecot-car',at:p(-693.5,114.1)},frame:{yaw:-30,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming silver car',
              message:'The silver car coming through the lights from Stonecot Hill was going ahead up Epsom Road, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the silver car coming the other way through the lights was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into the way in',
              message:'Before you turn, look into the way in (on your right) for anyone walking across it or a car coming out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming through the lights: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the way in is clear, then turn: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
