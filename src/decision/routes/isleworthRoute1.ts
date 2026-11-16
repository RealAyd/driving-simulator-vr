import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BLUE_CAR,CYCLIST,HALL_CAR,HEATH_CAR,RING_CAR,VANGOGH_CAR,WORTON_CAR} from './isleworthRoute1Paths';

/**
 * Isleworth (Fleming Way), Twickenham Road and Whitton Dene: eight challenges from the test centre at Unit 8, The
 * Wireless Factory, Fleming Way, right out of Fleming Way on to Worton Road, right at the Twickenham Road lights, right
 * at the Mogden Lane lights over the crossing into Mogden Lane, ahead at the Mogden Lane roundabout on to Whitton Dene,
 * pulling up and moving off, right at the Hall Road mini-roundabout, round by Eaton Road and Tudor Road, left out of
 * Heath Road on to Worton Road, and home along Worton Road, right into the test centre. Chosen from the map and the
 * published evidence (content/packs/isleworth-fleming-way/ROUTES.md).
 * Scene isleworth-fleming-way-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
  // (In the junction: the queue at these lights, not the map, sets when the car gets there.)
  'twickenham-lights':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(705.2,-527.6)},when:{actor:'vangogh-car',at:p(750.5,-534.5)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting in the junction to turn right into Twickenham Road. The lights are green.'}},
  'mogden-crossing':{first:'approach',second:'turn',place:{pause:{kind:'moving',at:p(568.9,236)},when:{actor:'mogden-pedestrian',at:p(559.35,279.8)},frame:{yaw:-10,pitch:44,shift:-4},
    state:'Approaching the Mogden Lane lights on green.'}},
  // (At the line: the roundabout's island hides the car coming round until there.)
  'mogden-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(9.8,401)},when:{actor:'ring-car',at:p(-15.1,395.8)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Mogden Lane roundabout.'}},
  // (At the line: the corner hides Hall Road until there.)
  'hall-road-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-719.6,526)},when:{actor:'hall-car',at:p(-732.7,505.9)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}},
  // (At the line: the corner hides Hall Road until there.)
  'heath-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-525.1,-275.7)},when:{actor:'heath-car',at:p(-522.1,-239.7)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Heath Road.'}}
};

export const ISLEWORTH_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'isleworth-fleming-way-1',
  title:'Isleworth: Twickenham Road and Whitton Dene',
  scene:'isleworth-fleming-way-route-1',
  briefing:'Isleworth, Twickenham Road and Whitton Dene: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:241.81,z:-436.47,headingDeg:352.06},
  // Fleming Way, Worton Road, Twickenham Road, Mogden Lane, the Mogden Lane roundabout, Whitton Dene, Hall Road, Eaton
  // Road, Ellerdine Road, Tudor Road, Heath Road, Worton Road and back into Fleming Way.
  through:pts([[485,-485],[585,-125],[285,345],[-401,498],[-629,193],[-590,-30],[-670,-230],[-590,-275],[-383,-407],[-115,-450],[246,-418],[165,-325]]),
  // Pulled in to the kerb on Whitton Dene, past the bend (no cars parked along it: room for the cyclist to pass).
  // And kept left into the Mogden Lane roundabout, clear of the bollard on the splitter island's nose.
  shifts:[{from:p(25.6,390.6),to:p(7.3,402.6),left:.9},{from:p(-339.5,498.5),to:p(-369.5,500.1),left:.35}],
  actors:[
    {id:'worton-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(WORTON_CAR)},
    {id:'blue-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(BLUE_CAR)},
    {id:'vangogh-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(VANGOGH_CAR)},
    // On the crossing just round the corner in Mogden Lane, from the far kerb to the island, late on the lights.
    {id:'mogden-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[560.1,283.3],[558.4,275.6]])},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    // Behind the car along Whitton Dene, past it at the kerb, and left into Queensbridge Park.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    // (Paced to come down to the mini-roundabout as the car stops at the line, as a driver easing up to it would.)
    {id:'hall-car',name:'green car',colour:'#15803d',speed:9,waits:true,path:pts(HALL_CAR)},
    {id:'heath-car',name:'white car',colour:'#f5f5f4',speed:9,path:pts(HEATH_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'Fleming Way, right on to Worton Road',
      instruction:'When you\'re ready, drive out of the test centre and turn right, please.',
      instructAt:p(241.81,-436.47),
      starts:[{actor:'worton-car',at:p(241.81,-436.47),delay:0},{actor:'blue-car',at:p(241.81,-436.47),delay:0}],
      endAt:p(275.7,-485.9),
      // The way out, Worton Road to the right, where the white car comes from, and to the left.
      quiet:[{x:238,z:-470,radius:22},{x:275,z:-485,radius:30},{x:200,z:-465,radius:30}],
      place:{
        line:{pause:{kind:'stop',at:p(237.8,-465.7)},when:{actor:'worton-car',at:p(259.7,-476.7)},frame:{yaw:-70,pitch:32},
          state:'At the end of Fleming Way, at the edge of Worton Road.'},
        left:{pause:{kind:'stop',at:p(237.8,-465.7)},when:{actor:'blue-car',at:p(214.5,-468.5)},frame:{yaw:60,pitch:32},
          state:'Still at the edge of Worton Road.'},
        clear:{pause:{kind:'stop',at:p(237.8,-465.7)},when:{actor:'blue-car',at:p(274.5,-485.6)},frame:{yaw:-30,pitch:32},
          state:'Still at the edge of Worton Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Worton Road, which you cross, comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Worton Road know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning right: a left signal misleads everyone on Worton Road.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Worton Road from the right was a second or two away in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'left',go:'left'},
          explain:'Signal right and wait: the white car coming along Worton Road from the right was close, in the lane you were crossing.'
        },
        {
          id:'left',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-right','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left as well: turning right, you join the far lane, and its traffic comes from the left, out of the Ruskin Road mini-roundabout.'}},
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
              message:'Look left again too: more traffic may be coming out of the mini-roundabout towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Worton Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Worton Road was clear both ways.'
        }
      ]
    },
    {
      id:'twickenham-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Worton Road at the Twickenham Road lights, right into Twickenham Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(635.1,-512),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'vangogh-car',at:p(698.3,-526.4),delay:0}],
      lights:p(701.6,-527.2),lightsAll:true,
      endAt:p(720.9,-495.6),
      // The junction, Van Gogh Close opposite, where the oncoming car comes from, and the mouth of Twickenham Road.
      quiet:[{x:716,z:-527,radius:26},{x:750,z:-540,radius:22},{x:721,z:-505,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(674.1,-520.1)},frame:{yaw:0,pitch:20},state:'Approaching the Twickenham Road lights on green.'},
        centre:{pause:{kind:'stop',at:p(705.2,-527.6)},when:{actor:'vangogh-car',at:p(750.5,-534.5)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(705.2,-527.6)},when:{actor:'vangogh-car',at:p(690.8,-521.1)},frame:{yaw:30,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The grey car coming out of Van Gogh Close opposite, going ahead along Worton Road, was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the grey car coming out of Van Gogh Close opposite was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Twickenham Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Twickenham Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'mogden-crossing',
      turn:'right',
      title:'Pedestrian crossing at the lights, right turn',
      where:'Twickenham Road at the Mogden Lane lights, right into Mogden Lane over its crossing',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(558.4,168.9),
      // (Set going as the car comes up to the lights, so they are on the crossing as it turns in, whatever traffic held it up.)
      starts:[{actor:'mogden-pedestrian',at:p(565.2,218.4),delay:0}],
      lights:p(572.1,250.1),lightsAll:true,
      endAt:p(533.1,282.1),
      // (And Briar Close, just along Mogden Lane, kept quiet until the car is past it.)
      quietUntil:p(474.5,295),
      // The junction, the crossing on Mogden Lane, and Briar Close just along it.
      quiet:[{x:572,z:268,radius:26},{x:559,z:279,radius:16},{x:503,z:284,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(558.4,168.9)},frame:{yaw:0,pitch:20},state:'Approaching the Mogden Lane lights on green.'},
        turn:{pause:{kind:'stop',at:p(567.6,277.1)},when:{actor:'mogden-pedestrian',at:p(559.35,279.8)},frame:{yaw:0,pitch:32},
          state:'Turning right into Mogden Lane. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(567.6,277.1)},when:{actor:'mogden-pedestrian',at:p(558.4,275.6)},frame:{yaw:0,pitch:32},
          state:'Waiting short of the crossing on Mogden Lane.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right in good time so the drivers behind and the people at the crossing know you are turning.'}},
            {kind:'required',id:'no-position',anyOf:['position-right'],fault:{level:'minor',heading:'Positioning - normal driving',title:'Not positioned for the right turn',
              message:'Move to the right-hand side of your lane to turn right: traffic behind can pass on your left.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move over.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into a turn',
              message:'Green means go if it is safe: turning, you need a speed you can stop from for anyone still on the crossing in the road you turn into.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'turn'},
          explain:'Interior and right mirrors, signal right, then position to the right of your lane.'
        },
        {
          id:'turn',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look into Mogden Lane, the way you are turning, first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove at someone still crossing',
              message:'Someone was still on the crossing just round the corner in Mogden Lane, in your lane. Your green does not make them vanish: wait until they are clear. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-right','give-way'],['mirror-interior','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: someone was still on the crossing just round the corner, in your lane.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Before you go, look again along the crossing: is anyone else stepping out?'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited with the way clear',
              message:'The pedestrian was on the island, past your lane: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the crossing again, then go: the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'mogden-roundabout',
      title:'Roundabout, ahead',
      where:'Mogden Lane at the Mogden Lane roundabout, second exit on to Whitton Dene',
      instruction:'At the roundabout, take the second exit, please.',
      instructAt:p(52.9,378.7),
      starts:[{actor:'ring-car',at:p(52.9,378.7),delay:0}],
      endAt:p(-54.9,411.8),
      // The roundabout's entry, and its north side, where the black car comes round from Whitton Dene.
      quiet:[{x:8,z:400,radius:22},{x:-15,z:395,radius:26},{x:-40,z:420,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(34.1,385.4)},frame:{yaw:0,pitch:22},state:'Approaching the Mogden Lane roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(9.8,401)},when:{actor:'ring-car',at:p(-15.1,395.8)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(9.8,401)},when:{actor:'ring-car',at:p(4.5,425.9)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'No mirror on the approach',
              message:'Check the interior mirror as you slow for the roundabout: you need to know how close the traffic behind is.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signalled left too early',
              message:'For the second exit, going ahead, give no signal on the approach: signal left only once you pass Rugby Road, the exit before yours.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round past Whitton Dene: everyone waiting at the other entries would be misled.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left']],
          next:{then:'line'},
          explain:'Interior mirror and no signal on the approach: you were going ahead, the second exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round the roundabout from Whitton Dene, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Rugby Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round towards Rugby Road.'
        }
      ]
    },
    {
      id:'whitton-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Whitton Dene, past the bend by Harlequin Close',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-294.3,469.9),
      starts:[{actor:'cyclist',at:p(-294.3,469.9),delay:0}],
      endAt:p(-369.5,500.1),
      selfCancel:false,
      // The pull-up, and Harlequin Close on the way to it.
      quiet:[{x:-370,z:500,radius:34},{x:-276,z:454,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(-329.8,496.3)},frame:{yaw:-15,pitch:28},state:'On Whitton Dene at 30 mph, round the bend.'},
        stopped:{pause:{kind:'stop',at:p(-369.5,500.1)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past the bend, clear of the junctions ahead.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Arnold Crescent or Queensbridge Park could not see past you.'}},
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
      id:'whitton-move-off',
      turn:'right',
      title:'Moving off',
      where:'Whitton Dene, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-369.5,500.1),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(-294.3,469.9),delay:0}],
      endAt:p(-444.4,497.7),
      quiet:[{x:-370,z:500,radius:50},{x:-416,z:505,radius:20}],
      place:{
        check:{pause:{kind:'stop',at:p(-369.5,500.1)},when:{actor:'cyclist',at:p(-354.6,497.6)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-369.5,500.1)},when:{actor:'cyclist',at:p(-401.2,499.6)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, turning into Queensbridge Park, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'hall-road-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'Whitton Dene at the Hall Road mini-roundabout, right into Hall Road',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(-672.9,515),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'hall-car',at:p(-683.2,517.6),delay:0}],
      endAt:p(-735.9,507.7),
      // (And the narrow loop by Eaton Road, Ellerdine Road and Tudor Road, and the side roads on the way home, kept quiet
      // until the car is past them: in traffic, cars met the car face to face at the mouth of Eaton Road, and pulling
      // out of Riverside Walk.)
      quietUntil:p(-79.5,-438),
      // The mini-roundabout, and Hall Road to the right, where the green car comes from; Heath Road, Clayton Road and
      // Riverside Walk.
      quiet:[{x:-732,z:525,radius:22},{x:-731,z:495,radius:26},{x:-765,z:537,radius:20},{x:-515,z:-276,radius:14},{x:-170,z:-433,radius:12},{x:-97,z:-435,radius:14},
        {x:-588,z:-31,radius:45},{x:-620,z:-115,radius:60},{x:-650,z:-195,radius:40},{x:-670,z:-245,radius:35}],
      place:{
        approach:{pause:{kind:'moving',at:p(-692.3,519.9)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-719.6,526)},when:{actor:'hall-car',at:p(-732.7,505.9)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-719.6,526)},when:{actor:'hall-car',at:p(-760.1,536.1)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right','speed-up'],
          neutral:['mirror-left','position-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so everyone at the mini-roundabout knows you are turning into Hall Road.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the green car was coming down Hall Road, on your right.'}}
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
              message:'The green car coming down Hall Road, on your right, was at the mini-roundabout, turning right round it across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming down Hall Road, on your right, was there first, turning round in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went round. Look right again, into Hall Road, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone along Whitton Dene and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the green car had gone.'
        }
      ]
    },
    {
      id:'heath-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Heath Road, left on to Worton Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-594,-277.1),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'heath-car',at:p(-539.1,-276),delay:0}],
      endAt:p(-486.9,-304.6),
      // The junction, Hall Road to the right, where the white car comes from, and County Gardens just along Worton Road.
      quiet:[{x:-514,z:-274,radius:22},{x:-522,z:-235,radius:30},{x:-505,z:-285,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-574,-276.8)},frame:{yaw:0,pitch:22},state:'Approaching the end of Heath Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-525.1,-275.7)},when:{actor:'heath-car',at:p(-522.1,-239.7)},frame:{yaw:-70,pitch:26},state:'At the end of Heath Road.'},
        clear:{pause:{kind:'stop',at:p(-525.1,-275.7)},when:{actor:'heath-car',at:p(-492.8,-299.1)},frame:{yaw:-30,pitch:26},state:'Still at the end of Heath Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Worton Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the lane you join comes from the right, up Hall Road.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming up Hall Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming up Hall Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be coming out of County Gardens or overtaking towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and Worton Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Worton Road was clear.'
        }
      ]
    }
  ]
},BEFORE));
