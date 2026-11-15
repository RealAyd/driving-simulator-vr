import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BEV_CAR,CAMBORNE_CAR,CHURSTON_CAR,GRAND_CAR,HILL_CAR,LIGHTS_CAR,TUDOR_CAR} from './mordenRoute2Paths';

/**
 * Morden route 2, Beverley, Grand Drive and Churston Drive: eight challenges from the test centre at 10 Tudor Drive,
 * right out of its service road on to Tudor Drive, over the Tudor Drive zebra, ahead at the Beverley roundabout, right
 * at the Grand Drive lights into Cannon Hill Lane, ahead at the Camborne Road mini-roundabout into Churston Drive,
 * pulling up and moving off, right on to Hillcross Avenue, and home by the Beverley roundabout and Tudor Drive to the
 * test centre's way out. Chosen from the map and the published evidence (content/packs/morden-london/ROUTES.md).
 * Scene morden-route-2 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line; leaving the test centre keeps a third: a car from the right, then one from
 * the left out of the lights, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'tudor-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(164.4,262.2)},when:{actor:'zebra-pedestrian',at:p(139.3,250.9)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Tudor Drive, the zebra crossing just ahead.'}},
  // (At the line, as North Avenue in Chelmsford: the black car is in view coming round only from there.)
  'beverley-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-278,25.5)},when:{actor:'bev-car',at:p(-255.3,8.5)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Beverley roundabout.'}},
  'cannon-hill-lights':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(-474.7,-410.9)},when:{actor:'grand-car',at:p(-534.8,-502.9)},frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Cannon Hill Lane lights on green.'}},
  'churston-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-216.4,-548.8)},when:{actor:'camborne-car',at:p(-180.8,-534.5)},frame:{yaw:-45,pitch:30},
    state:'Approaching the mini-roundabout.'}},
  // (At the line: the corner hides Hillcross Avenue to the right until there.)
  'hillcross-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(129.8,-253.1)},when:{actor:'hill-car',at:p(116.5,-231.8)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the end of Churston Drive.'}}
};

export const MORDEN_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'morden-london-2',
  title:'Morden route 2',
  scene:'morden-route-2',
  briefing:'Morden route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:464.95,z:527.2,headingDeg:233},
  // The test centre's service road, Tudor Drive, the Beverley roundabout, Grand Drive, Cannon Hill Lane, Churston Drive,
  // Hillcross Avenue, the Beverley roundabout and back down Tudor Drive to the test centre's way out.
  through:pts([[7,204],[-359,-246],[-292,-521],[13,-439],[-72,-115],[440,519],[473,544.5]]),
  // Pulled in to the kerb on Churston Drive, past Thurleston Avenue (the parked cars on that side are well behind and
  // ahead: room for the grey car to pass).
  shifts:[{from:p(-25.4,-500.2),to:p(-7.8,-474.8),left:.35}],
  actors:[
    {id:'tudor-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(TUDOR_CAR)},
    {id:'lights-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(LIGHTS_CAR)},
    // Waiting at the Tudor Drive zebra on the left, then across both halves in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[138.6,252.8],[142.5,242.1]])},
    {id:'bev-car',name:'black car',colour:'#1f2328',speed:9,path:pts(BEV_CAR)},
    {id:'grand-car',name:'silver car',colour:'#c3c7cf',speed:10,path:pts(GRAND_CAR)},
    {id:'camborne-car',name:'green car',colour:'#15803d',speed:8,path:pts(CAMBORNE_CAR)},
    // Behind the car along Churston Drive, to its pull-up, past it, and left into Templecombe Way.
    {id:'churston-car',name:'grey car',colour:'#8a9099',speed:9,yields:true,path:pts(CHURSTON_CAR)},
    {id:'hill-car',name:'white van',colour:'#f5f5f4',speed:10,path:pts(HILL_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, right on to Tudor Drive',
      instruction:'When you\'re ready, drive out of the test centre and turn right, please.',
      instructAt:p(464.95,527.2),
      starts:[{actor:'tudor-car',at:p(464.95,527.2),delay:0},{actor:'lights-car',at:p(464.95,527.2),delay:0}],
      // (The Tudor Drive lights held green all round: the blue car comes through them from Sutton Common Road.)
      lights:p(517.3,576.3),lightsAll:true,
      endAt:p(443.9,525.9),
      // The way out, Tudor Drive to the right, where the white car comes from, and the lights to the left.
      quiet:[{x:458,z:532,radius:22},{x:438,z:516,radius:26},{x:490,z:560,radius:34}],
      place:{
        line:{pause:{kind:'stop',at:p(463.8,528.6)},when:{actor:'tudor-car',at:p(443.4,522)},frame:{yaw:-70,pitch:32},
          state:'At the end of the way out, at the edge of Tudor Drive.'},
        left:{pause:{kind:'stop',at:p(463.8,528.6)},when:{actor:'lights-car',at:p(476.3,549.7)},frame:{yaw:60,pitch:32},
          state:'Still at the edge of Tudor Drive.'},
        clear:{pause:{kind:'stop',at:p(463.8,528.6)},when:{actor:'lights-car',at:p(406,515.7)},frame:{yaw:-30,pitch:32},
          state:'Still at the edge of Tudor Drive.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Tudor Drive, which you cross, comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Tudor Drive know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning right: a left signal misleads everyone on Tudor Drive.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming down Tudor Drive from the right was a second or two away in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'left',go:'left'},
          explain:'Signal right and wait: the white car coming down Tudor Drive from the right was close, in the lane you were crossing.'
        },
        {
          id:'left',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-right','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left as well: turning right, you join the far lane, and its traffic comes from the left, out of the lights.'}},
            {kind:'unsafe',id:'pulled-out-left',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The white car had passed, but the blue car coming out of the lights from the left was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait again: the right was clear, but the blue car coming out of the lights from the left was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car came by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look left',
              message:'Look left again too: the lights may have let more traffic through towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Tudor Drive was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Tudor Drive was clear both ways.'
        }
      ]
    },
    {
      id:'tudor-zebra',
      title:'Zebra crossing',
      where:'Tudor Drive, the zebra crossing by Cardinal Avenue',
      instruction:'Follow the road ahead, please.',
      instructAt:p(203.4,286.7),
      starts:[{actor:'zebra-pedestrian',at:p(203.4,286.7),delay:0}],
      endAt:p(129.9,246.7),
      quiet:[{x:140,z:248,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(169.7,265.2)},frame:{yaw:0,pitch:22},state:'On Tudor Drive at 20 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(145.5,253.2)},when:{actor:'zebra-pedestrian',at:p(139.6,250.1)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(145.5,253.2)},when:{actor:'zebra-pedestrian',at:p(142,243.5)},frame:{yaw:0,pitch:30},
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
              message:'The pedestrian was on the zebra crossing in front of you. Give way to anyone on a zebra, even one with an island in the middle: it is one crossing. The examiner had to stop the car.'}},
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
      id:'beverley-roundabout',
      title:'Roundabout, ahead',
      where:'Tudor Drive at the Beverley roundabout, second exit on to Grand Drive',
      instruction:'At the roundabout, take the second exit, please.',
      instructAt:p(-253.6,54.5),
      // (Set going once the car is at the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'bev-car',at:p(-276.3,28),delay:0}],
      endAt:p(-296.2,-68.8),
      // The roundabout's entry, and its east side, where the black car comes round from Lower Morden Lane.
      quiet:[{x:-280,z:20,radius:22},{x:-245,z:5,radius:30},{x:-300,z:-30,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(-262.9,42.7)},frame:{yaw:0,pitch:22},state:'Approaching the Beverley roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-278,25.5)},when:{actor:'bev-car',at:p(-255.3,8.5)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-278,25.5)},when:{actor:'bev-car',at:p(-331.1,-12.1)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
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
              message:'For the second exit, going ahead, give no signal on the approach: signal left only once you pass the exit before yours.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round past Grand Drive: everyone waiting at the next entries would be misled.'}},
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
              message:'The black car coming round the roundabout from Lower Morden Lane, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
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
              message:'Your last look right was before the black car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone out into Lower Morden Lane and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone out into Lower Morden Lane.'
        }
      ]
    },
    {
      id:'cannon-hill-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Grand Drive at the Cannon Hill Lane lights, right into Cannon Hill Lane',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-441.3,-361),
      starts:[{actor:'grand-car',at:p(-441.3,-361),delay:0}],
      lights:p(-495.4,-441.5),lightsAll:true,
      endAt:p(-457.8,-467.2),
      // The junction, and Grand Drive ahead, where the oncoming silver car comes from.
      quiet:[{x:-498,z:-448,radius:28},{x:-525,z:-492,radius:38}],
      place:{
        approach:{pause:{kind:'moving',at:p(-474.7,-410.9)},frame:{yaw:0,pitch:20},state:'Approaching the lights on green.'},
        centre:{pause:{kind:'stop',at:p(-496.8,-444.2)},when:{actor:'grand-car',at:p(-516,-475.9)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-496.8,-444.2)},when:{actor:'grand-car',at:p(-465.2,-402.6)},frame:{yaw:30,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The silver car coming down Grand Drive was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the silver car coming down Grand Drive was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Cannon Hill Lane',
              message:'Before you turn, look into the road you are turning into (on your right): its crossing may have people on it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Cannon Hill Lane is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'churston-mini',
      title:'Mini-roundabout, ahead',
      where:'Cannon Hill Lane at the Camborne Road mini-roundabout, ahead into Churston Drive',
      instruction:'At the mini-roundabout, follow the road ahead, please.',
      instructAt:p(-296.7,-521.3),
      starts:[{actor:'camborne-car',at:p(-258.9,-534.1),delay:0}],
      endAt:p(-177.7,-558.7),
      // The mini-roundabout, and Camborne Road to the right, where the green car comes from.
      quiet:[{x:-190,z:-556,radius:24},{x:-170,z:-520,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-221,-547.1)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-207.9,-551.8)},when:{actor:'camborne-car',at:p(-180.8,-534.5)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-207.9,-551.8)},when:{actor:'camborne-car',at:p(-183.6,-600.5)},frame:{yaw:20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'No mirror on the approach',
              message:'Check the interior mirror as you slow for the mini-roundabout: you need to know how close the traffic behind is.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Churston Drive: a left signal says you are turning into Cannon Hill Lane.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Churston Drive: a right signal says you are turning into Camborne Road.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the green car was coming up to it from the right.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left']],
          next:{then:'line'},
          explain:'Interior mirror and no signal: you were going ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming up Camborne Road, on your right, was at the mini-roundabout, turning across your way into Cannon Hill Lane. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming from Camborne Road, on your right, was there first, turning across in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went across. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone into Cannon Hill Lane and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go ahead: the green car had gone.'
        }
      ]
    },
    {
      id:'churston-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Churston Drive, past Thurleston Avenue',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-42.4,-530.7),
      starts:[{actor:'churston-car',at:p(-42.4,-530.7),delay:0}],
      endAt:p(-7.8,-474.8),
      selfCancel:false,
      quiet:[{x:-8,z:-475,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-28,-504.4)},frame:{yaw:15,pitch:28},state:'On Churston Drive at 20 mph, Thurleston Avenue just behind on the left, a car behind.'},
        stopped:{pause:{kind:'stop',at:p(-7.8,-474.8)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: past Thurleston Avenue, clear of the junction and of the parked cars.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Thurleston Avenue could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place past Thurleston Avenue; mirrors (the grey car was behind), then signal left.'
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
      id:'churston-move-off',
      turn:'right',
      title:'Moving off',
      where:'Churston Drive, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-7.8,-474.8),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'churston-car',at:p(-42.4,-530.7),delay:0}],
      endAt:p(25,-420),
      quiet:[{x:-8,z:-475,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-7.8,-474.8)},when:{actor:'churston-car',at:p(-18.7,-489.6)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-7.8,-474.8)},when:{actor:'churston-car',at:p(20.5,-443.5)},frame:{yaw:-170,pitch:26},
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
              message:'The grey car had gone by, turning into Templecombe Way, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the grey car had gone by.'
        }
      ]
    },
    {
      id:'hillcross-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Churston Drive, right on to Hillcross Avenue',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(93.1,-309.9),
      starts:[{actor:'hill-car',at:p(93.1,-309.9),delay:0}],
      endAt:p(93.3,-210.3),
      // The junction, and Hillcross Avenue to the right (south-west), where the white van comes from.
      quiet:[{x:133,z:-247,radius:26},{x:100,z:-218,radius:36},{x:165,z:-295,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(113.1,-275.3)},frame:{yaw:0,pitch:22},state:'Approaching the end of Churston Drive at 15 mph.'},
        line:{pause:{kind:'stop',at:p(129.8,-253.1)},when:{actor:'hill-car',at:p(116.5,-231.8)},frame:{yaw:-80,pitch:26},state:'At the end of Churston Drive.'},
        clear:{pause:{kind:'stop',at:p(129.8,-253.1)},when:{actor:'hill-car',at:p(164,-297.9)},frame:{yaw:-40,pitch:26},state:'Still at the end of Churston Drive.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Hillcross Avenue knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Hillcross Avenue comes from the right, from the Beverley roundabout.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white van',
              message:'The white van coming along Hillcross Avenue from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white van\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white van\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white van coming along Hillcross Avenue from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming along it before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white van passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Hillcross Avenue was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Hillcross Avenue was clear both ways.'
        }
      ]
    }
  ]
},BEFORE));
