import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,HERTFORD_CAR,INNOVA_CAR,ONCOMING_CAR,RING_CAR,SOLAR_CAR} from './enfieldRoute1Paths';

/**
 * Enfield (Innova Business Park), Ordnance Road and Hertford Road: eight challenges from the test centre off Solar Way,
 * left out of its way in on to Solar Way, left at the Innova Way roundabout, along Innova Way and south on Mollison
 * Avenue, right at the Ordnance Road lights, over the zebra crossing on Ordnance Road, right at the Hertford Road lights,
 * right into Totteridge Road, pulling up and moving off, left into Mandeville Road, right out of it on to Hertford Road,
 * right at the Bullsmoor Lane lights on to Mollison Avenue, and the second exit at the Mollison Avenue roundabout back
 * down Solar Way into the test centre. Chosen from the map and the published evidence
 * (content/packs/enfield-innova/ROUTES.md).
 * Scene enfield-innova-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line, or traffic on the way sets when the car gets there. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the first decision is taken where the car waits, so the silver car is there whatever the start.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(587.4,-268.9)},when:{actor:'solar-car',at:p(584.4,-300)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of the test centre\'s way out, at the edge of Solar Way.'}},
  // (At the line: the island hides the car coming round until there.)
  'innova-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(549.6,29.4)},when:{actor:'innova-car',at:p(537.6,49)},frame:{yaw:-55,pitch:40,shift:-4},
    state:'At the give way line of the Innova Way roundabout.'}},
  // (In the junction: the queue at these lights, not the map, sets when the car gets there.)
  'ordnance-lights':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(673.8,515.4)},when:{actor:'oncoming-car',at:p(659.1,544)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting in the junction to turn right into Ordnance Road. The lights are green.'}},
  'ordnance-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(224.1,484.7)},when:{actor:'zebra-pedestrian',at:p(201.45,483.4)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Ordnance Road, the zebra crossing just ahead.'}},
  // (At the line: the corner hides Hertford Road to the right until there.)
  'mandeville-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-405.2,-155.4)},when:{actor:'hertford-car',at:p(-397.4,-192.5)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the end of Mandeville Road.'}},
  // (At the line: the island hides the car coming round until there.)
  'mollison-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(615.6,-442.1)},when:{actor:'ring-car',at:p(626.5,-431.2)},frame:{yaw:-50,pitch:40,shift:-4},
    state:'At the give way line of the Mollison Avenue roundabout, in the right-hand lane.'}}
};

export const ENFIELD_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'enfield-innova-1',
  title:'Enfield: Ordnance Road and Hertford Road',
  scene:'enfield-innova-route-1',
  briefing:'Enfield, Ordnance Road and Hertford Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:689.7,z:-269,headingDeg:277},
  // The test centre's way in, Solar Way, Innova Way, Mollison Avenue, Ordnance Road, Hertford Road, Totteridge Road,
  // Mandeville Road, Hertford Road, Mollison Avenue, the Mollison Avenue roundabout, Solar Way and back into the centre.
  through:pts([[565,-83],[640,64],[721,259],[689,426],[592,519],[201,482],[-172,454],[-510,268],[-285,149],[-338,-78],[-380,-237],[340,-428],[600,-439],[583,-300],[660,-273]]),
  // Pulled in to the kerb on Totteridge Road, with no car parked opposite (room for the cyclist to pass). And through
  // the small Innova Way roundabout: kept left on the way in, clear of the bollard on Solar Way's splitter island, then
  // right round the island, so the car does not cut the corner on to the footway on the way out into Innova Way.
  shifts:[{from:p(-489.8,273.5),to:p(-459.8,275),left:.35},{from:p(550.2,24.4),to:p(549,36.3),left:.5},{from:p(558.8,46.5),to:p(561.4,49.5),left:-.8},
    // And clear of the kerbs on the inside of the right turns at the Hertford Road lights (the planned line runs along
    // the left kerb into Hertford Road) and the Bullsmoor Lane lights (along the right kerb into Mollison Avenue).
    {from:p(-737.8,366.2),to:p(-735.4,363),left:-1.4},{from:p(-338.5,-502.5),to:p(-334.5,-505.1),left:1.2}],
  actors:[
    {id:'solar-car',name:'silver car',colour:'#c3c7cf',speed:9,path:pts(SOLAR_CAR)},
    {id:'innova-car',name:'white car',colour:'#e5e7eb',speed:7,path:pts(INNOVA_CAR)},
    {id:'oncoming-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(ONCOMING_CAR)},
    // Waiting at the Ordnance Road zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[201.7,487.6],[201,476.6]])},
    // Behind the car along Totteridge Road, past it at the kerb, and on towards Mandeville Road.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'hertford-car',name:'red car',colour:'#b91c1c',speed:9,path:pts(HERTFORD_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre: emerging, left turn',
      where:'The test centre\'s way out, left on to Solar Way',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(689.7,-269),
      // (Set going as the car comes up to the edge of Solar Way, so it is there whatever the start.)
      starts:[{actor:'solar-car',at:p(640,-274.7),delay:0}],
      endAt:p(579,-237.6),
      // The way out, Solar Way to the right, where the silver car comes from, and to the left.
      quiet:[{x:582,z:-266,radius:22},{x:586,z:-305,radius:30},{x:578,z:-228,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(620.2,-277)},frame:{yaw:0,pitch:22},state:'Driving out of the test centre.'},
        line:{pause:{kind:'stop',at:p(587.4,-268.9)},when:{actor:'solar-car',at:p(584.4,-300)},frame:{yaw:-70,pitch:26},state:'At the edge of Solar Way.'},
        clear:{pause:{kind:'stop',at:p(587.4,-268.9)},when:{actor:'solar-car',at:p(578.4,-228.7)},frame:{yaw:-20,pitch:26},state:'Still at the edge of Solar Way.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left as you come out, so the drivers on Solar Way know where you are going.'}},
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
              message:'Look right first: the traffic in the lane you join comes down Solar Way from the right, and the view that way is poor.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car coming down Solar Way from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the silver car\'s way',
              message:'The view right was already clear enough to see it coming: creeping forward only puts the front of the car into the silver car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the silver car coming down Solar Way from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking towards you up Solar Way.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The silver car had gone by and Solar Way was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the silver car had gone by and Solar Way was clear.'
        }
      ]
    },
    {
      id:'innova-roundabout',
      turn:'left',
      title:'Small roundabout, left turn',
      where:'Solar Way at the Innova Way roundabout, first exit into Innova Way',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(560.4,-28.5),
      // (Set going as the car comes up to the line, so it is there whatever held the car up.)
      starts:[{actor:'innova-car',at:p(555.1,6),delay:0}],
      endAt:p(592.2,57.2),
      // (And the Innova Way end at Mollison Avenue, where the car turns right across the northbound carriageway, kept
      // quiet until the car is on its way south: in traffic, a car coming north met it there.)
      quietUntil:p(747.5,124),
      // The roundabout, Innova Way to the right, where the white car comes from, and Electric Avenue; the end of Innova
      // Way and Mollison Avenue's northbound carriageway coming up to it.
      quiet:[{x:549,z:45,radius:22},{x:505,z:54,radius:30},{x:550,z:88,radius:16},{x:745,z:76,radius:24},{x:741,z:115,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(555.1,6)},frame:{yaw:0,pitch:22},state:'Approaching the Innova Way roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(549.6,29.4)},when:{actor:'innova-car',at:p(537.6,49)},frame:{yaw:-55,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(549.6,29.4)},when:{actor:'innova-car',at:p(571.8,55)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach and keep it on as you go round.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Slow down for a roundabout this small: traffic coming round from the right is on you in a moment.'}}
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming round from Innova Way, on your right, was already on the roundabout, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming round from Innova Way, on your right, was already on the roundabout.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone out into Innova Way and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the white car had gone out into Innova Way.'
        }
      ]
    },
    {
      id:'ordnance-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Mollison Avenue at the Ordnance Road lights, right into Ordnance Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(695.4,398.9),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(677.3,498.8),delay:0}],
      lights:p(677.6,497),lightsAll:true,
      endAt:p(638.9,524.9),
      // The junction, Mollison Avenue to the south, where the oncoming car comes from, the mouth of Ordnance Road and
      // Smeaton Road opposite it.
      quiet:[{x:670,z:515,radius:28},{x:661,z:556,radius:26},{x:640,z:522,radius:16},{x:700,z:515,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(682.8,467.5)},frame:{yaw:0,pitch:20},state:'Approaching the Ordnance Road lights on green.'},
        centre:{pause:{kind:'stop',at:p(673.8,515.4)},when:{actor:'oncoming-car',at:p(659.1,544)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(673.8,515.4)},when:{actor:'oncoming-car',at:p(667.7,488.9)},frame:{yaw:40,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The blue car coming up Mollison Avenue the other way was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the blue car coming up Mollison Avenue the other way was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Ordnance Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Ordnance Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'ordnance-zebra',
      title:'Zebra crossing',
      where:'Ordnance Road, the zebra crossing by Tysoe Avenue',
      instruction:'Follow the road ahead, please.',
      instructAt:p(282.1,487.9),
      // (Set going as the car comes up to the crossing, so they step on as it comes, whatever held it up.)
      starts:[{actor:'zebra-pedestrian',at:p(262.1,486.5),delay:0}],
      endAt:p(182.2,482.7),
      quiet:[{x:201,z:482,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(247.1,485.8)},frame:{yaw:0,pitch:22},state:'On Ordnance Road at 30 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(208.2,483.9)},when:{actor:'zebra-pedestrian',at:p(201.45,483.4)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(208.2,483.9)},when:{actor:'zebra-pedestrian',at:p(201.05,477.8)},frame:{yaw:0,pitch:30},
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
      id:'totteridge-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Totteridge Road, on the straight between Hertford Road and Mandeville Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-549.6,270.4),
      starts:[{actor:'cyclist',at:p(-549.6,270.4),delay:0}],
      endAt:p(-459.8,275),
      selfCancel:false,
      // The pull-up, and Totteridge Road behind it.
      quiet:[{x:-460,z:275,radius:34},{x:-530,z:271,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(-499.7,272.8)},frame:{yaw:-15,pitch:28},state:'On Totteridge Road at 30 mph.'},
        stopped:{pause:{kind:'stop',at:p(-459.8,275)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past the Hertford Road junction, with no car parked opposite.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning in from Hertford Road or Mandeville Road could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place on the straight, clear of the junctions and the parked cars opposite; mirrors, then signal left.'
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
      id:'totteridge-move-off',
      turn:'right',
      title:'Moving off',
      where:'Totteridge Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-459.8,275),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(-549.6,270.4),delay:0}],
      endAt:p(-390,279.2),
      // (And Totteridge Road on from here and Mandeville Road, with cars parked on both sides in places, kept quiet until
      // the car is near the end of Mandeville Road: no room there to meet traffic.)
      quietUntil:p(-344,-89.1),
      quiet:[{x:-460,z:275,radius:50},{x:-400,z:279,radius:24},{x:-330,z:282,radius:40},{x:-288,z:230,radius:45},{x:-284,z:150,radius:40},
        {x:-283,z:80,radius:40},{x:-305,z:10,radius:40},{x:-330,z:-55,radius:40}],
      place:{
        check:{pause:{kind:'stop',at:p(-459.8,275)},when:{actor:'cyclist',at:p(-475.2,275.8)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-459.8,275)},when:{actor:'cyclist',at:p(-430.5,276.6)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'mandeville-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Mandeville Road, right on to Hertford Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-344,-89.1),
      // (Set going as the car comes up to the line, so it is there whatever held the car up on the way.)
      starts:[{actor:'hertford-car',at:p(-378.7,-137.7),delay:0}],
      endAt:p(-402.5,-189.5),
      // The junction, Hertford Road to the right, where the red car comes from, and to the left; Cunningham Avenue on the
      // way up to it.
      quiet:[{x:-410,z:-162,radius:22},{x:-392,z:-202,radius:30},{x:-426,z:-130,radius:22},{x:-368,z:-128,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(-378.7,-137.7)},frame:{yaw:0,pitch:22},state:'Approaching the end of Mandeville Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-405.2,-155.4)},when:{actor:'hertford-car',at:p(-397.4,-192.5)},frame:{yaw:-60,pitch:26},state:'At the end of Mandeville Road.'},
        clear:{pause:{kind:'stop',at:p(-405.2,-155.4)},when:{actor:'hertford-car',at:p(-427.9,-130.3)},frame:{yaw:30,pitch:26},state:'Still at the end of Mandeville Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Hertford Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Hertford Road, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming down Hertford Road from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming down Hertford Road from the right was close, in the lane you were crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left as well: turning right, you join the far lane, and its traffic comes up Hertford Road from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone by and Hertford Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the red car had gone by and Hertford Road was clear both ways.'
        }
      ]
    },
    {
      id:'mollison-roundabout',
      turn:'right',
      title:'Roundabout, right turn',
      where:'Mollison Avenue at the Solar Way roundabout, second exit into Solar Way',
      instruction:'At the roundabout, take the second exit, please.',
      instructAt:p(514.5,-433),
      // (Set going as the car comes up to the line, so it is there whatever held the car up on the way.)
      starts:[{actor:'ring-car',at:p(598.9,-439.4),delay:0}],
      endAt:p(654.2,-410.1),
      // The roundabout's entry, its west side, where the black car comes round from Solar Way, and its north side.
      quiet:[{x:618,z:-443,radius:22},{x:628,z:-420,radius:22},{x:633,z:-400,radius:18},{x:648,z:-462,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(583.9,-439.2)},frame:{yaw:0,pitch:22},state:'Approaching the Mollison Avenue roundabout at 40 mph.'},
        line:{pause:{kind:'stop',at:p(615.6,-442.1)},when:{actor:'ring-car',at:p(626.5,-431.2)},frame:{yaw:-50,pitch:28},state:'At the give way line, in the right-hand lane.'},
        clear:{pause:{kind:'stop',at:p(615.6,-442.1)},when:{actor:'ring-car',at:p(645.9,-464.5)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','lane-right','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'The second exit, Solar Way, is past twelve o\'clock: signal right on the approach, and left once you pass the first exit.'}},
            {kind:'required',id:'no-lane',anyOf:['lane-right'],fault:{level:'minor',heading:'Positioning - lane discipline',title:'Not in the right-hand lane',
              message:'Going round to the right, approach in the right-hand lane, so traffic for the first exit can pass on your left.'}},
            {kind:'before',id:'signal-before-lane',action:'lane-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Changed lane before signalling',
              message:'Mirrors, signal, then move over: signal before you change lane.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','lane-right'],['mirror-right','mirror-interior','signal-right','lane-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, signal right, then the right-hand lane: Solar Way is the second exit, round to the right.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round from Solar Way, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Solar Way, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Mollison Avenue and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round towards Mollison Avenue.'
        }
      ]
    }
  ]
},BEFORE));
