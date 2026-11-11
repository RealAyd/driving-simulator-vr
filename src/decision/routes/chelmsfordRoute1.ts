import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BRITVIC_CAR,CYCLIST,HAMLET_CAR,MOULSHAM_CAR} from './chelmsfordRoute1Paths';

/**
 * Chelmsford route 1, south and Moulsham: eight challenges from the test centre on Cromar Way (Unit 12, the centre
 * car tests moved to on 5 October 2026), left at the Cromar Way lights, down Waterhouse Lane and Westway, the Britvic
 * Roundabout, London Road and the Miami Roundabout, Moulsham Street, St John's Road, Mildmay Road and Hamlet Road,
 * back down Moulsham Street, and home by Southborough Road, New London Road and Writtle Road. Chosen from the map
 * (content/packs/chelmsford/ROUTES.md): Moulsham Street north of St John's Road is one-way southbound, so the loop
 * goes up it no further than the crossroads. Scene chelmsford-route-1 (OpenStreetMap). A practice route, not a
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
 * the hazard is in view only at the line; the Cromar Way lights keep
 * a third: the red light, then someone still crossing on green, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-747,-132.4)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the lights at the end of Cromar Way. They are red.'}},
  'westway-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-902.1,229)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Writtle Road lights. They are red.'}},
  'britvic-roundabout':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-917.7,898.3)},when:{actor:'britvic-car',at:p(-912.8,936.3)},frame:{yaw:-50,pitch:30},
    state:'Approaching the Britvic Roundabout.'}},
  'st-johns-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(173.1,202)},when:{actor:'moulsham-car',at:p(215.3,159.4)},frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the St John\'s Road crossroads.'}},
  // (At the line: the corner houses hide Moulsham Street until there.)
  'hamlet-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(298.3,85.2)},when:{actor:'hamlet-car',at:p(302.3,67.5)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the end of Hamlet Road. Moulsham Street is one-way, from the right.'}},
  'moulsham-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(215.4,159.4)},when:{actor:'zebra-pedestrian',at:p(204.2,177.7)},panel:'right',frame:{yaw:0,pitch:44,shift:5},
    state:'On Moulsham Street, the zebra crossing just ahead.'}}
};

export const CHELMSFORD_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'chelmsford-1',
  title:'Chelmsford route 1',
  scene:'chelmsford-route-1',
  briefing:'Chelmsford route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-504.6,z:23.1,headingDeg:14.5},
  // Cromar Way, Waterhouse Lane, Westway, the Britvic Roundabout, London Road, the Miami Roundabout, Moulsham Street,
  // St John's Road, Mildmay Road, Hamlet Road (pulling up and moving off), Moulsham Street, Southborough Road, New London Road, Writtle Road,
  // Westway, Waterhouse Lane and back along Cromar Way.
  through:pts([[-874,91],[-1029,722],[-752,805],[122,269],[297,270],[435,284],[414,179],[252,119],[150,250],[-66,327],[-180,300],
    [-426,354],[-867,61],[-507,38]]),
  // Pulled in to the kerb on Hamlet Road, past Lady Lane (St John's Road has cars parked along the far kerb: no room
  // for anyone to pass a car pulled up there).
  shifts:[{from:p(439.5,205.4),to:p(428.5,195.1),left:.35}],
  actors:[
    // Crossing the end of Cromar Way, right to left, still on the crossing as the lights turn green.
    {id:'cromar-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-767.3,-157.7],[-774.7,-148.3]])},
    {id:'britvic-car',name:'white car',colour:'#e5e7eb',speed:10,path:pts(BRITVIC_CAR)},
    {id:'moulsham-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(MOULSHAM_CAR)},
    // Behind the car into Hamlet Road, past it at the kerb, and right into Upper Roman Road.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'hamlet-car',name:'grey car',colour:'#8a9099',speed:10,path:pts(HAMLET_CAR)},
    // Waiting at the Moulsham Street zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[205.3,178.8],[197.3,171.2]])}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'Cromar Way, left at the lights on to Waterhouse Lane',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(-490.9,-34.5),
      starts:[{actor:'cromar-pedestrian',at:p(-763.5,-146.9),delay:0}],
      lights:p(-768.6,-151),
      endAt:p(-808,-132.4),
      quiet:[{x:-785,z:-158,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-741.6,-127.9)},lights:'red',frame:{yaw:0,pitch:22},state:'Approaching the lights at the end of Cromar Way.'},
        line:{pause:{kind:'stop',at:p(-764.3,-147.6)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        green:{pause:{kind:'stop',at:p(-764.3,-147.6)},lights:'red',when:{actor:'cromar-pedestrian',at:p(-771.6,-152.1)},panel:'right',frame:{yaw:0,pitch:30},
          state:'At the stop line. The lights have turned green.'},
        clear:{pause:{kind:'stop',at:p(-764.3,-147.6)},when:{actor:'cromar-pedestrian',at:p(-774.4,-148.7)},panel:'right',frame:{yaw:20,pitch:30},
          state:'Still at the stop line, on green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the lights, so the traffic behind and the people at the crossing know where you are going.'}},
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
          buttons:['look-left','look-right','mirror-left','give-way','go','horn'],
          neutral:['look-right','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left','look-right'],any:true,fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look along the crossing first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Moved off with someone still crossing',
              message:'Green means go only if the way is clear. The pedestrian was still on the crossing in front of you, walking into the way you were turning. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','give-way'],['look-right','look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait, even on green: the pedestrian was still crossing in front of you, into the way you were turning.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go'],
          neutral:['look-right'],
          rules:[
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: a cyclist may have come up beside you while you waited.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['mirror-left','go'],['look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Left mirror, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'westway-lights',
      title:'Traffic lights, ahead',
      where:'Waterhouse Lane at the Writtle Road lights, ahead on to Westway',
      instruction:'At the traffic lights, follow the road ahead, please.',
      instructAt:p(-858.7,28.9),
      starts:[],
      lights:p(-914.5,262.6),
      endAt:p(-933,318.8),
      quiet:[{x:-915,z:270,radius:32}],
      place:{
        approach:{pause:{kind:'moving',at:p(-902.1,229)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the lights at 25 mph.'},
        line:{pause:{kind:'stop',at:p(-912.2,256.6)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-912.2,256.6)},lights:'red',frame:{yaw:0,pitch:28},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-left','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic coming out of Writtle Road, and anyone crossing, at risk.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: a left signal says you are turning into Writtle Road.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the lights were red.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['look-right','look-left','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-interior','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-junction',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before going',
              message:'Green means go only if the way is clear. Look across the junction for anyone late through the lights, or still crossing, before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the junction was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look across the junction both ways, then go: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'britvic-roundabout',
      turn:'left',
      title:'Roundabout, first exit',
      where:'Westway at the Britvic Roundabout, first exit on to London Road',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(-1024.5,656.6),
      starts:[{actor:'britvic-car',at:p(-1001.1,801.8),delay:0}],
      endAt:p(-853,886),
      // The entry, and the circulating carriageway to the right, where the white car comes round.
      quiet:[{x:-897,z:903,radius:32},{x:-913,z:940,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-942.4,881.7)},frame:{yaw:0,pitch:22},state:'Approaching the Britvic Roundabout at 25 mph.'},
        line:{pause:{kind:'stop',at:p(-901.8,899.9)},when:{actor:'britvic-car',at:p(-912.8,936.3)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-901.8,899.9)},when:{actor:'britvic-car',at:p(-858.2,889.2)},frame:{yaw:-50,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'Signal left on the approach for the first exit, and keep it on as you go round.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
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
              message:'The white car coming round the roundabout from the right was close, heading for your exit. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming round from the right: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: nothing more was coming round.'
        }
      ]
    },
    {
      id:'st-johns-right',
      turn:'right',
      title:'Crossroads, right turn',
      where:'Moulsham Street, right into St John\'s Road',
      instruction:'At the crossroads, turn right, please.',
      instructAt:p(101.9,292.2),
      starts:[{actor:'moulsham-car',at:p(-2.2,400),delay:0}],
      endAt:p(219.4,200.7),
      // (Kept quiet through St John's Road: with cars parked along its far kerb, there is no room to meet traffic in it.)
      quietUntil:p(333.4,305.2),
      // The crossroads, the one-way part of Moulsham Street ahead, where the oncoming blue car comes from, and St John's
      // Road.
      quiet:[{x:190,z:185,radius:28},{x:240,z:130,radius:40},{x:245,z:225,radius:45},{x:310,z:285,radius:45}],
      place:{
        approach:{pause:{kind:'moving',at:p(163.3,213.4)},frame:{yaw:0,pitch:20},state:'On Moulsham Street at 25 mph, the crossroads ahead.'},
        centre:{pause:{kind:'stop',at:p(184.1,189.1)},when:{actor:'moulsham-car',at:p(215.3,159.4)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into St John\'s Road.'},
        clear:{pause:{kind:'stop',at:p(184.1,189.1)},when:{actor:'moulsham-car',at:p(160.2,222)},frame:{yaw:20,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming blue car',
              message:'The blue car coming down Moulsham Street was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the blue car coming down Moulsham Street was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into St John\'s Road',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming down Moulsham Street: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check St John\'s Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'hamlet-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Hamlet Road, past Lady Lane',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(457.4,260.5),
      starts:[{actor:'cyclist',at:p(457.4,260.5),delay:0}],
      endAt:p(428.5,195.1),
      selfCancel:false,
      quiet:[{x:435,z:200,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(469.6,231.4)},frame:{yaw:-15,pitch:28},state:'Turned into Hamlet Road at 20 mph, Lady Lane just behind.'},
        stopped:{pause:{kind:'stop',at:p(428.5,195.1)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Lady Lane, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning in from Lady Lane and Mildmay Road would come round the corner on to you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}},
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Lady Lane; mirrors, then signal left.'
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
      id:'hamlet-move-off',
      turn:'right',
      title:'Moving off',
      where:'Hamlet Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(428.5,195.1),
      // (Up Mildmay Road behind the car as it turns into Hamlet Road, coming to pull up.)
      starts:[{actor:'cyclist',at:p(457.4,260.5),delay:0}],
      endAt:p(372.9,144.8),
      quiet:[{x:428,z:195,radius:45}],
      place:{
        check:{pause:{kind:'stop',at:p(428.5,195.1)},when:{actor:'cyclist',at:p(446,209)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(428.5,195.1)},when:{actor:'cyclist',at:p(417.1,177.1)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist coming up Hamlet Road was just behind your right shoulder, about to pass. The examiner had to stop the car.'}},
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
              message:'The cyclist had gone by, turning into Upper Roman Road, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'hamlet-emerge',
      turn:'left',
      title:'Emerging on to a one-way street',
      where:'Hamlet Road, left on to Moulsham Street',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(372.9,144.8),
      starts:[{actor:'hamlet-car',at:p(392,160),delay:0}],
      endAt:p(259.3,111.5),
      // The junction, Moulsham Street to the right, where the grey car comes from, and Anchor Street, where it turns off.
      quiet:[{x:292,z:84,radius:26},{x:335,z:35,radius:40},{x:228,z:115,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(326.3,107.6)},frame:{yaw:0,pitch:22},state:'Approaching the end of Hamlet Road at 15 mph.'},
        line:{pause:{kind:'stop',at:p(298.3,85.2)},when:{actor:'hamlet-car',at:p(319.3,50.6)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(298.3,85.2)},when:{actor:'hamlet-car',at:p(256.2,114.6)},frame:{yaw:-60,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic coming down Moulsham Street knows where you are going.'}},
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
              message:'Look right first: Moulsham Street is one-way here, and all its traffic comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the grey car',
              message:'The grey car coming down Moulsham Street from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the grey car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the grey car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the grey car coming down Moulsham Street from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the grey car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: on a one-way street people cross looking only one way, and a cyclist may be coming the wrong way.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming down Moulsham Street: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: nothing more was coming down Moulsham Street.'
        }
      ]
    },
    {
      id:'moulsham-zebra',
      title:'Zebra crossing',
      where:'Moulsham Street, the zebra crossing at St John\'s Road',
      instruction:'Follow the road ahead, please.',
      instructAt:p(238.8,133.3),
      starts:[{actor:'zebra-pedestrian',at:p(259.3,111.5),delay:0}],
      endAt:p(185.3,192.6),
      quiet:[{x:201,z:175,radius:26},{x:228,z:115,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(225.4,148.2)},frame:{yaw:0,pitch:22},state:'On Moulsham Street at 20 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(206.7,169)},when:{actor:'zebra-pedestrian',at:p(202.3,174.5)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(206.7,169)},when:{actor:'zebra-pedestrian',at:p(197.6,171.5)},frame:{yaw:0,pitch:30},
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
    }
  ]
},BEFORE));
