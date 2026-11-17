import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,HEATHWAY_CAR,ISAN_CAR,RING_CAR,TYWERN_CAR} from './cardiffLlanishenRoute1Paths';

/**
 * Cardiff (Llanishen), Caerphilly Road and Heath: eight challenges from the test centre on Lambourne Crescent in
 * Cardiff Business Park, up Parc Tŷ Glas and left at the Tŷ Glas Avenue lights, Tŷ Glas Road to the Morrisons
 * roundabout, first exit on to Caerphilly Road and down it to the Birchgrove lights, left there over the crossing into
 * Heathwood Road (pulling up and moving off), Cefn Carnau Road, left out on to St Isan Road, right out on to Heathway,
 * Maes-y-coed Road, right at the Caerphilly Road lights, and home by the Morrisons roundabout, Tŷ Glas Road, Ashbourn
 * Way and Malvern Drive. Chosen from the map and the published evidence (content/packs/cardiff-llanishen/ROUTES.md).
 * Scene cardiff-llanishen-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first taken where the
 * hazard is in view: at the line where a corner or the island hides it until there, on the move at the lights. */
const BEFORE:Record<string,BeforeMerge>={
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(89.9,-813.8)},lights:'red',frame:{yaw:0,pitch:40,shift:-3},
    state:'Approaching the Tŷ Glas Avenue lights on red.'}},
  // (At the line: Morrisons and the trees on the corner hide Thornhill Road until there.)
  'morrisons-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-447.3,-693.5)},when:{actor:'ring-car',at:p(-460,-702.9)},frame:{yaw:-55,pitch:40,shift:-4},
    state:'At the give way line of the Morrisons roundabout.'}},
  'birchgrove-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-263.2,812.8)},when:{actor:'birchgrove-pedestrian',at:p(-261,838.6)},frame:{yaw:0,pitch:44,shift:-3},
    state:'Approaching the Birchgrove lights on green.'}},
  // (At the line: the houses on the corner hide St Isan Road until there.)
  'cefn-carnau-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(518.6,156.4)},when:{actor:'isan-car',at:p(528.3,143.5)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Cefn Carnau Road.'}},
  // (At the line: the houses on the corner hide Heathway until there.)
  'st-isan-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(148,354.3)},when:{actor:'heathway-car',at:p(143.4,334.5)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of St Isan Road.'}},
  // (In the junction: waiting to turn, with the oncoming car in view.)
  'caerphilly-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(-362.5,-20.7)},when:{actor:'tywern-car',at:p(-393.8,-19.1)},frame:{yaw:0,pitch:32,shift:-4},
    state:'Waiting in the junction to turn right on to Caerphilly Road.'}}
};

export const CARDIFF_LLANISHEN_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'cardiff-llanishen-1',
  title:'Cardiff (Llanishen): Caerphilly Road and Heath',
  scene:'cardiff-llanishen-route-1',
  briefing:'Cardiff (Llanishen), Caerphilly Road and Heath: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:229.09,z:-362.78,headingDeg:356.87},
  // Lambourne Crescent, Parc Tŷ Glas, Tŷ Glas Avenue, Tŷ Glas Road, the Morrisons roundabout, Caerphilly Road, the
  // Birchgrove lights, Heathwood Road, Cefn Carnau Road, St Isan Road, Heathway, Maes-y-coed Road, Caerphilly Road, the
  // Morrisons roundabout, Tŷ Glas Road, Ashbourn Way, Malvern Drive, Parc Tŷ Glas and back into Lambourne Crescent.
  through:pts([[160,-414],[80,-600],[-266,-873],[-400,-724],[-436,-532],[-405,-360],[-385,-140],[-340,200],[-300,560],[-262,800],[0,694],[200,572],[420,436],[560,222],[300,290],[145,200],[152,-25],[-150,-35],[-385,-140],[-418,-380],[-455,-620],[-400,-724],[-250,-748],[-140,-721],[-60,-470],[-37,-420],[18,-386],[200,-415],[234,-352]]),
  // Pulled in to the kerb on Heathwood Road (no cars parked along it: room for the cyclist to pass). And out wide round
  // the turn from Caerphilly Road into Heathwood Road at the Birchgrove lights (an island between the two: the line
  // turned before its tip, over the pavement).
  shifts:[{from:p(38,670.1),to:p(72.1,649.1),left:.35},{from:p(-261.1,849),to:p(-256,853),left:-3.2}],
  actors:[
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    // On the crossing over Caerphilly Road at the Birchgrove lights, from the left-hand kerb across the car's lane, late on the lights.
    {id:'birchgrove-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-257.8,838.6],[-268.3,838.6]])},
    // Behind the car along Heathwood Road, past it at the kerb, and left into Heathway.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'isan-car',name:'white car',colour:'#e5e7eb',speed:9,waits:true,path:pts(ISAN_CAR)},
    {id:'heathway-car',name:'blue car',colour:'#2563eb',speed:9,waits:true,path:pts(HEATHWAY_CAR)},
    {id:'tywern-car',name:'silver car',colour:'#a8adb4',speed:10,path:pts(TYWERN_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre, left at the traffic lights',
      where:'Parc Tŷ Glas at the Tŷ Glas Avenue lights, left on to Tŷ Glas Avenue',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(81.6,-749.5),
      starts:[],
      lights:p(90.5,-834.7),
      endAt:p(62.8,-870.9),
      // The junction, Tŷ Glas Avenue both ways, and Parc Tŷ Glas's way in beside the car's.
      quiet:[{x:96,z:-850,radius:28},{x:60,z:-872,radius:22},{x:130,z:-835,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(89.9,-813.8)},lights:'red',frame:{yaw:0,pitch:22},state:'Approaching the Tŷ Glas Avenue lights on red.'},
        line:{pause:{kind:'stop',at:p(90.2,-830.8)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(90.2,-830.8)},lights:'red',frame:{yaw:20,pitch:28},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the lights, so the drivers behind know where you are going.'}},
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
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','mirror-interior','give-way','go'],
          neutral:['look-right','look-left','mirror-interior'],
          rules:[
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: a cyclist may have come up beside you while you waited.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and Tŷ Glas Avenue was clear: this was the time to go.'}}
          ],
          accepted:[['mirror-left','go'],['look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Left mirror, then go: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'morrisons-roundabout',
      turn:'left',
      title:'Roundabout, first exit',
      where:'Tŷ Glas Road at the Morrisons roundabout, first exit on to Caerphilly Road',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(-382.6,-732.7),
      // (Set going as the car comes up to the line, so it comes round as the car gets there, whatever held it up.)
      starts:[{actor:'ring-car',at:p(-429.6,-706.4),delay:0}],
      endAt:p(-455.6,-663.3),
      // The roundabout, Thornhill Road, where the black car comes from, Caerphilly Road south and Beulah Road.
      quiet:[{x:-463,z:-689,radius:24},{x:-469,z:-728,radius:26},{x:-455,z:-660,radius:20},{x:-487,z:-677,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-421.5,-710.1)},frame:{yaw:0,pitch:22},state:'Approaching the Morrisons roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-447.3,-693.5)},when:{actor:'ring-car',at:p(-460,-702.9)},frame:{yaw:-55,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-447.3,-693.5)},when:{actor:'ring-car',at:p(-475.6,-683.2)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so the drivers waiting to come on know you are leaving there.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round past Caerphilly Road: everyone waiting at the other entries would be misled.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left for the first exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming down Thornhill Road on to the roundabout, on your right, was close, about to come round across your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming on to the roundabout from Thornhill Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone round and off along Beulah Road, and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone off along Beulah Road.'
        }
      ]
    },
    {
      id:'birchgrove-lights',
      turn:'left',
      title:'Pedestrian crossing at the lights, left turn',
      where:'Caerphilly Road at the Birchgrove lights, left into Heathwood Road over the crossing',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(-268.7,760.1),
      // (Set going as the car comes up to the lights, so they are on the crossing as it gets there, whatever held it up.)
      starts:[{actor:'birchgrove-pedestrian',at:p(-266,786),delay:0}],
      lights:p(-261.3,835.8),lightsAll:true,
      endAt:p(-234.9,836.9),
      // The junction, the crossing over Caerphilly Road in front of the car, Heathwood Road, and Caerphilly Road and
      // Birchgrove Road beyond.
      quiet:[{x:-262,z:858,radius:30},{x:-262,z:825,radius:16},{x:-236,z:838,radius:20},{x:-262,z:895,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-263.2,812.8)},frame:{yaw:0,pitch:20},state:'Approaching the Birchgrove lights on green.'},
        line:{pause:{kind:'stop',at:p(-261.7,830.8)},when:{actor:'birchgrove-pedestrian',at:p(-261,838.6)},frame:{yaw:0,pitch:32},
          state:'At the stop line. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-261.7,830.8)},when:{actor:'birchgrove-pedestrian',at:p(-265.3,838.6)},frame:{yaw:-10,pitch:32},
          state:'Waiting at the stop line, short of the crossing. The lights are green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left in good time so the drivers behind and the people at the crossing know you are turning.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up for the green',
              message:'Green means go if it is safe: someone was still on the crossing in front of you, so you need a speed you can stop from.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-right','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look along the crossing, from the left-hand kerb where people step out, first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove at someone still crossing',
              message:'Someone was still on the crossing over Caerphilly Road, in your lane. Your green does not make them vanish: wait until they are clear. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-left','give-way'],['mirror-interior','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: someone was still on the crossing in front of you, in your lane.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Before you go, look again along the crossing and into Heathwood Road, where there is a crossing too: is anyone else stepping out?'}},
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: a cyclist may have come up beside you while you waited.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited with the way clear',
              message:'The pedestrian was past your lane and the lights were still green: this was the time to go.'}}
          ],
          accepted:[['look-left','mirror-left','go'],['mirror-left','look-left','go'],['look-right','look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Look along the crossing and into Heathwood Road again, left mirror, then go: the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'heathwood-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Heathwood Road, on the straight before St Anthony Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(4,691.1),
      starts:[{actor:'cyclist',at:p(4,691.1),delay:0}],
      endAt:p(72.1,649.1),
      selfCancel:false,
      // The pull-up, and the lane on the right on the way to it.
      quiet:[{x:72,z:649,radius:34},{x:30,z:676,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(38,670.1)},frame:{yaw:-15,pitch:28},state:'On Heathwood Road at 20 mph.'},
        stopped:{pause:{kind:'stop',at:p(72.1,649.1)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight, clear of the side roads.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Ton-yr-ywen Avenue or St Anthony Road could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place on the straight, clear of the side roads; mirrors, then signal left.'
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
      id:'heathwood-move-off',
      turn:'right',
      title:'Moving off',
      where:'Heathwood Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(72.1,649.1),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(4,691.1),delay:0}],
      endAt:p(135.9,609.7),
      quiet:[{x:72,z:649,radius:50},{x:140,z:606,radius:22}],
      place:{
        check:{pause:{kind:'stop',at:p(72.1,649.1)},when:{actor:'cyclist',at:p(60,659)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(72.1,649.1)},when:{actor:'cyclist',at:p(96.8,633.8)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on towards Heathway, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'cefn-carnau-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Cefn Carnau Road, left on to St Isan Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(550.5,208.9),
      // (Set going as the car comes up to the end of the road, so it comes along St Isan Road as the car gets to the line.)
      starts:[{actor:'isan-car',at:p(540,191.9),delay:0}],
      endAt:p(487,170.1),
      // (And St Isan Road, narrow with cars parked, kept quiet until the car is at the end of it.)
      quietUntil:p(148,354.3),
      // The junction, St Isan Road to the right, where the white car comes from, and St Isan Road to the left, the way on.
      quiet:[{x:516,z:150,radius:22},{x:545,z:132,radius:30},{x:485,z:170,radius:24},{x:440,z:198,radius:40},{x:370,z:242,radius:40},
        {x:300,z:287,radius:40},{x:225,z:331,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(540,191.9)},frame:{yaw:0,pitch:22},state:'Approaching the end of Cefn Carnau Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(518.6,156.4)},when:{actor:'isan-car',at:p(528.3,143.5)},frame:{yaw:-70,pitch:26},state:'At the end of Cefn Carnau Road.'},
        clear:{pause:{kind:'stop',at:p(518.6,156.4)},when:{actor:'isan-car',at:p(500.8,161.2)},frame:{yaw:-30,pitch:26},state:'Still at the end of Cefn Carnau Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on St Isan Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the lane you join comes from the right, along St Isan Road.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along St Isan Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming along St Isan Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be coming along St Isan Road or overtaking the parked cars towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and St Isan Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and St Isan Road was clear.'
        }
      ]
    },
    {
      id:'st-isan-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'St Isan Road, right on to Heathway',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(207.3,344.4),
      // (Set going as the car comes up to the end of the road, so it comes down Heathway as the car gets to the line.)
      starts:[{actor:'heathway-car',at:p(188.7,351.4),delay:0}],
      endAt:p(142.5,329.2),
      // (And Heathway, cars parked along it, kept quiet until the car is at the end of it.)
      quietUntil:p(152.9,-30),
      // The junction, Heathway to the right, where the blue car comes from, and Heathway to the left, where it goes.
      quiet:[{x:141,z:353,radius:22},{x:144,z:315,radius:30},{x:139,z:392,radius:26},{x:146,z:250,radius:45},{x:148,z:160,radius:45},
        {x:151,z:70,radius:45},{x:153,z:-10,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(188.7,351.4)},frame:{yaw:0,pitch:22},state:'Approaching the end of St Isan Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(148,354.3)},when:{actor:'heathway-car',at:p(143.4,334.5)},frame:{yaw:-70,pitch:26},state:'At the end of St Isan Road.'},
        clear:{pause:{kind:'stop',at:p(148,354.3)},when:{actor:'heathway-car',at:p(142.2,373.3)},frame:{yaw:-10,pitch:26},state:'Still at the end of St Isan Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Heathway knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane, which you cross, comes from the right, down Heathway.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming down Heathway from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming down Heathway from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: turning right, you join the far lane, and its traffic comes from the left, up Heathway.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Heathway was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Heathway was clear both ways.'
        }
      ]
    },
    {
      id:'caerphilly-right',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Maes-y-coed Road at the Caerphilly Road lights, right on to Caerphilly Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-289.8,-26.8),
      // (Set going as the car comes up to the lights, so it comes over the junction as the car waits to turn.)
      starts:[{actor:'tywern-car',at:p(-309.8,-25.9),delay:0}],
      lights:p(-350.7,-22.3),lightsAll:true,
      endAt:p(-373.6,-40.7),
      // The junction, Tŷ Wern Road opposite, where the silver car comes from, Maes-y-coed Road behind the car, and
      // Caerphilly Road both ways.
      quiet:[{x:-370,z:-21,radius:28},{x:-410,z:-14,radius:30},{x:-335,z:-25,radius:20},{x:-374,z:-58,radius:22},{x:-364,z:12,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-334.8,-24.1)},frame:{yaw:0,pitch:20},state:'Approaching the Caerphilly Road lights on green.'},
        centre:{pause:{kind:'stop',at:p(-362.5,-20.7)},when:{actor:'tywern-car',at:p(-393.8,-19.1)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right.'},
        clear:{pause:{kind:'stop',at:p(-362.5,-20.7)},when:{actor:'tywern-car',at:p(-336.3,-27.1)},frame:{yaw:30,pitch:32},
          state:'Still waiting in the junction. The lights are green.'}
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
              message:'The silver car coming out of Tŷ Wern Road opposite, going straight over on its green, was a few seconds away, and it has priority over you turning right. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the silver car coming out of Tŷ Wern Road opposite was going straight over, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Caerphilly Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be on the crossing there.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming out of Tŷ Wern Road and the lights were still green: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Caerphilly Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
