import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BRIDGE_CAR,GREY_CAR,STJOHNS_CAR,VAN,WORTON_CAR} from './isleworthRoute2Paths';

/**
 * Isleworth (Fleming Way) route 2, Bridge Road, London Road and St John's Road: eight challenges from the test centre
 * at Unit 8, The Wireless Factory, Fleming Way, left out of Fleming Way on to Worton Road, right at the Worton Road
 * mini-roundabout into Bridge Road, right at the London Road lights, over the zebra crossing by Thornbury Road, right
 * at the St John's Road lights, pulling up and moving off on St John's Road, and home by Twickenham Road, right into
 * Worton Road at its lights and left into the test centre. Chosen from the map and the
 * published evidence (content/packs/isleworth-fleming-way/ROUTES.md). Scene isleworth-fleming-way-route-2
 * (OpenStreetMap). A practice route, not a confirmed test route.
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

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first on the move. */
const BEFORE:Record<string,BeforeMerge>={
  'paget-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-66.9,422.1)},when:{actor:'bridge-car',at:p(-111.1,394)},frame:{yaw:-45,pitch:30},
    state:'Approaching the mini-roundabout.'}},
  'london-lights':{first:'approach',second:'turn',place:{pause:{kind:'moving',at:p(-450.4,-53.7)},when:{actor:'london-pedestrian',at:p(-469.1,-111.3)},frame:{yaw:10,pitch:44,shift:4},
    state:'Approaching the London Road lights on green.'}},
  'thornbury-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(-155.9,-309.1)},when:{actor:'zebra-pedestrian',at:p(-135.75,-327.5)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On London Road, the zebra crossing just ahead.'}},
  'stjohns-lights':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(244.7,-473.2)},when:{actor:'stjohns-car',at:p(330.2,-478)},frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the St John\'s Road lights on green.'}},
  'worton-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(939.9,307.5)},when:{actor:'van',at:p(931.3,385.1)},frame:{yaw:0,pitch:40,shift:-4},
    state:'On Twickenham Road, the turn into Worton Road just ahead.'}}
};

export const ISLEWORTH_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'isleworth-fleming-way-2',
  title:'Isleworth route 2',
  scene:'isleworth-fleming-way-route-2',
  briefing:'Isleworth route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:456.73,z:438.51,headingDeg:352.06},
  // Fleming Way, Worton Road, Bridge Road, London Road, St John's Road, Twickenham Road, Worton Road and back into
  // Fleming Way.
  through:pts([[200,425],[-295,236],[-344,-170],[-62,-401],[328,-350],[604,-107],[1007,84],[700,390],[461,455]]),
  // Pulled in to the kerb on St John's Road, short of Nottingham Road (no cars parked along it: room for the grey car).
  shifts:[{from:p(426.1,-216.7),to:p(439.8,-202.1),left:.35}],
  actors:[
    {id:'worton-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(WORTON_CAR)},
    {id:'bridge-car',name:'black car',colour:'#1f2328',speed:10,path:pts(BRIDGE_CAR)},
    // Crossing London Road at the crossing just past the junction, from the far side, late on the lights.
    {id:'london-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-470.5,-114.4],[-466.3,-105.3]])},
    // Waiting at the zebra by Thornbury Road on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-138.2,-329.9],[-131,-322.9]])},
    {id:'stjohns-car',name:'silver car',colour:'#c3c7cf',speed:10,path:pts(STJOHNS_CAR)},
    // Behind the car along St John's Road, to its pull-up, past it, and left into Nottingham Road.
    {id:'grey-car',name:'grey car',colour:'#8a9099',speed:9,yields:true,path:pts(GREY_CAR)},
    {id:'van',name:'white van',colour:'#f5f5f4',speed:10,path:pts(VAN)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'Fleming Way, left on to Worton Road',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(456.73,438.51),
      starts:[{actor:'worton-car',at:p(456.73,438.51),delay:0}],
      endAt:p(405.1,412.7),
      // The way out, and Worton Road to the right, where the white car comes from.
      quiet:[{x:453,z:405,radius:22},{x:480,z:396,radius:30},{x:420,z:411,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(452.7,409.3)},when:{actor:'worton-car',at:p(475.7,397.9)},frame:{yaw:-70,pitch:32},
          state:'At the end of Fleming Way, at the edge of Worton Road.'},
        clear:{pause:{kind:'stop',at:p(452.7,409.3)},when:{actor:'worton-car',at:p(420,411)},frame:{yaw:-30,pitch:32},
          state:'Still at the edge of Worton Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','signal-left','signal-right','creep','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning left, you join the near lane of Worton Road, and its traffic comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the drivers on Worton Road know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Worton Road from the right was close, in the lane you were joining. Wait for it to pass. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s lane.'}}
          ],
          accepted:[['look-right','signal-left','give-way'],['signal-left','look-right','give-way'],['look-right','look-left','signal-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal left and wait: the white car coming along Worton Road from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking on your side of Worton Road, coming towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and Worton Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Worton Road was clear.'
        }
      ]
    },
    {
      id:'paget-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'Worton Road at the Bridge Road mini-roundabout, right into Bridge Road',
      instruction:'At the mini-roundabout, turn right into Bridge Road, please.',
      instructAt:p(-29.3,435.5),
      // (Set going earlier, so it is on its way down Bridge Road as the car comes up to the mini-roundabout.)
      starts:[{actor:'bridge-car',at:p(89.9,446),delay:0}],
      endAt:p(-130.2,384.6),
      // The mini-roundabout, and Bridge Road to the right, where the black car comes from.
      quiet:[{x:-95,z:411,radius:22},{x:-118,z:392,radius:24},{x:-120,z:438,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-48.2,429.3)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-82.7,415.7)},when:{actor:'bridge-car',at:p(-111.1,394)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-82.7,415.7)},when:{actor:'bridge-car',at:p(-124.5,438.7)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so everyone at the mini-roundabout knows you are turning into Bridge Road.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the black car was coming down Bridge Road, on your right.'}}
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming down Bridge Road, on your right, was at the mini-roundabout, going round across your way towards Worton Road. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming down Bridge Road, on your right, was there first, going round in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went round. Look right again, up Bridge Road, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone out along Worton Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone.'
        }
      ]
    },
    {
      id:'london-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Bridge Road at the London Road lights, right on to London Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-422.5,-12.2),
      starts:[{actor:'london-pedestrian',at:p(-422.5,-12.2),delay:0}],
      lights:p(-472.2,-86.3),lightsAll:true,
      endAt:p(-443.9,-123.5),
      // The junction, and the crossing on London Road just past it, where the pedestrian is.
      quiet:[{x:-478,z:-100,radius:26},{x:-462,z:-113,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-439.2,-37.1)},frame:{yaw:0,pitch:20},state:'Approaching the lights on green.'},
        turn:{pause:{kind:'stop',at:p(-477.9,-106.5)},when:{actor:'london-pedestrian',at:p(-469.1,-111.3)},panel:'right',frame:{yaw:0,pitch:32},
          state:'Turning right on to London Road. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-477.9,-106.5)},when:{actor:'london-pedestrian',at:p(-467.6,-108)},frame:{yaw:20,pitch:32},
          state:'Waiting short of the crossing on London Road.'}
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
              message:'Move to the right-hand side of your lane to turn right: traffic behind turning left can pass on your left.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move over.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into a turn',
              message:'Green means go if it is safe: turning, you need a speed you can stop from for anyone still on the crossing ahead.'}}
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
              message:'Look along London Road, the way you are turning, first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove at someone still crossing',
              message:'Someone was still on the crossing just round the corner, in your lane. Your green does not make them vanish: wait until they are clear. The examiner had to stop the car.'}},
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
              message:'Before you go, look again along London Road and the crossing: is anyone else stepping out?'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited with the way clear',
              message:'The pedestrian was past your lane: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the crossing again, then go: the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'thornbury-zebra',
      title:'Zebra crossing',
      where:'London Road, the zebra crossing by Thornbury Road',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-190.2,-281.5),
      starts:[{actor:'zebra-pedestrian',at:p(-190.2,-281.5),delay:0}],
      endAt:p(-116.3,-348.6),
      quiet:[{x:-135,z:-327,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-174.5,-293.9)},frame:{yaw:0,pitch:22},state:'On London Road at 30 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(-140.4,-323.2)},when:{actor:'zebra-pedestrian',at:p(-135.75,-327.5)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(-140.4,-323.2)},when:{actor:'zebra-pedestrian',at:p(-132.8,-324.7)},frame:{yaw:0,pitch:30},
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
              message:'The pedestrian was across your half and on to the far side: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look both ways along the crossing, then go: the pedestrian was past your half.'
        }
      ]
    },
    {
      id:'stjohns-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'London Road at the St John\'s Road lights, right into St John\'s Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(195.1,-467.6),
      // (Set going earlier, so it is coming the other way as the car comes up to the lights.)
      starts:[{actor:'stjohns-car',at:p(95.4,-459.9),delay:0}],
      lights:p(283,-476.5),lightsAll:true,
      endAt:p(308.2,-431.5),
      // The junction, and London Road ahead, where the oncoming silver car comes from.
      quiet:[{x:299,z:-474,radius:24},{x:330,z:-478,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(224.9,-470.6)},frame:{yaw:0,pitch:20},state:'Approaching the St John\'s Road lights on green.'},
        centre:{pause:{kind:'stop',at:p(291.6,-477)},when:{actor:'stjohns-car',at:p(330.2,-478)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(291.6,-477)},when:{actor:'stjohns-car',at:p(271.4,-472.1)},frame:{yaw:-30,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming silver car',
              message:'Green does not give you priority over oncoming traffic going ahead. The silver car coming along London Road was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the silver car coming along London Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into St John\'s Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check St John\'s Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'stjohns-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'St John\'s Road, past St John\'s Court',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(406,-238.9),
      starts:[{actor:'grey-car',at:p(406,-238.9),delay:0}],
      endAt:p(439.8,-202.1),
      selfCancel:false,
      quiet:[{x:440,z:-202,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(422.7,-220.3)},frame:{yaw:15,pitch:28},state:'On St John\'s Road at 20 mph, a car behind.'},
        stopped:{pause:{kind:'stop',at:p(439.8,-202.1)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: past St John\'s Court, well short of Nottingham Road.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning in and out of Nottingham Road would meet you or not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place clear of the junctions; mirrors (the grey car was behind), then signal left.'
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
      id:'stjohns-move-off',
      turn:'right',
      title:'Moving off',
      where:'St John\'s Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(439.8,-202.1),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'grey-car',at:p(406,-238.9),delay:0}],
      endAt:p(495.8,-160.4),
      quiet:[{x:440,z:-202,radius:50},{x:478,z:-178,radius:20}],
      place:{
        check:{pause:{kind:'stop',at:p(439.8,-202.1)},when:{actor:'grey-car',at:p(428.3,-211.2)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(439.8,-202.1)},when:{actor:'grey-car',at:p(488.5,-195.4)},frame:{yaw:-170,pitch:26},
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
              message:'The grey car had gone by, turning into Nottingham Road, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the grey car had gone by.'
        }
      ]
    },
    {
      id:'worton-right',
      turn:'right',
      title:'Right turn at the lights',
      where:'Twickenham Road at the Worton Road lights, right into Worton Road',
      instruction:'At the traffic lights, turn right into Worton Road, please.',
      instructAt:p(945.2,267.9),
      starts:[{actor:'van',at:p(945.2,267.9),delay:0}],
      endAt:p(907.5,353.4),
      // The junction, and Twickenham Road ahead, where the oncoming white van comes from.
      quiet:[{x:936,z:348,radius:24},{x:932,z:385,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(942,287.6)},frame:{yaw:0,pitch:20},state:'On Twickenham Road at 20 mph, the Worton Road lights ahead.'},
        centre:{pause:{kind:'stop',at:p(938.5,337.5)},when:{actor:'van',at:p(931.3,385.1)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Worton Road. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(938.5,337.5)},when:{actor:'van',at:p(936.9,301)},frame:{yaw:-30,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming white van',
              message:'Green does not give you priority over oncoming traffic going ahead. The white van coming up Twickenham Road was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the white van coming up Twickenham Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Worton Road',
              message:'Before you turn, look into Worton Road (on your right) for anyone crossing it or a car waiting at its lights.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Worton Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
