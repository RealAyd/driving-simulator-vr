import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BEECHINGS_CAR,LONDON_CAR,PUMP_CAR,PUMP_UP_CAR,TESCO_CAR} from './gillinghamRoute2Paths';

/**
 * Gillingham route 2, Twydall, Beechings Way and Pump Lane: eight challenges from the test centre at Astra Park,
 * Courteney Road, the first exit at the Courteney Road roundabout by Tesco, Twydall Lane (from the Bowaters roundabout)
 * and its zebra crossing, right at the Goudhurst Road mini-roundabout on to Beechings Way, right at the Pump Lane
 * mini-roundabout, pulling up and moving off on Pump Lane, right on to London Road (the A2), its pedestrian lights, and
 * back to the test centre by Courteney Road. Chosen from the map and the published evidence
 * (content/packs/gillingham/ROUTES.md). Scene gillingham-route-2 (OpenStreetMap). A practice route, not a confirmed test
 * route.
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
  // (At the line: the Tesco way in, on the right, is in view only from there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-416.9,395.6)},when:{actor:'tesco-car',at:p(-397.2,396.6)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the give way line of the roundabout by Tesco.'}},
  'twydall-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(-339.3,-249.6)},when:{actor:'zebra-pedestrian',at:p(-325.6,-274.8)},frame:{yaw:0,pitch:44,shift:-4},
    state:'On Twydall Lane, the zebra crossing just ahead.'}},
  'goudhurst-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(42.8,-610.1)},when:{actor:'beechings-car',at:p(84.6,-626.3)},frame:{yaw:-45,pitch:44,shift:-4},
    state:'Approaching the mini-roundabout at the end of Goudhurst Road.'}},
  'pump-lane-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(620.7,-406.7)},when:{actor:'pump-up-car',at:p(642.3,-366)},frame:{yaw:-45,pitch:44,shift:-4},
    state:'On Beechings Way, approaching the Pump Lane mini-roundabout.'}},
  // (At the line: the hedges on the corner hide London Road to the right until there.)
  'london-road-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(262.8,314.5)},when:{actor:'london-car',at:p(238,315.8)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the end of Pump Lane.'}},
  'london-road-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-187.5,213.4)},lights:'red',when:{actor:'london-pedestrian',at:p(-220.2,205.1)},panel:'right',frame:{yaw:0,pitch:44,shift:5},
    state:'On London Road, the pedestrian lights ahead. They are red.'}}
};

export const GILLINGHAM_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'gillingham-2',
  title:'Gillingham route 2',
  scene:'gillingham-route-2',
  briefing:'Gillingham route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-415.03,z:573.11,headingDeg:278.66},
  // The test centre's way out, Courteney Road, the Tesco roundabout, the Bowaters roundabout, Twydall Lane, Twydall
  // Green, Goudhurst Road, Beechings Way, Pump Lane, London Road, the slip road to Courteney Road, and back into the way out.
  through:pts([[-438,507],[-388,316],[-376,37],[-327,-275],[-100,-578],[372,-513],[630,-280],[305,150],[-100,225],[-389,367]]),
  // Pulled in to the kerb on Pump Lane, past Aylward Way (no cars parked along it).
  // And kept off the inside corner turning into Twydall Green.
  shifts:[{from:p(522.4,-119.6),to:p(505.6,-101),left:.35},{from:p(-198,-467.7),to:p(-194.6,-469.5),left:-.5}],
  actors:[
    {id:'tesco-car',name:'green car',colour:'#15803d',speed:8,path:pts(TESCO_CAR)},
    // Waiting at the Twydall Lane zebra on the right, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-323.4,-273.8],[-330.6,-277.2]])},
    {id:'beechings-car',name:'silver car',colour:'#c3c7cf',speed:10,path:pts(BEECHINGS_CAR)},
    {id:'pump-up-car',name:'red car',colour:'#b91c1c',speed:9,path:pts(PUMP_UP_CAR),signals:[{from:p(628.5,-278.2),to:p(700,-372),side:'right'}]},
    // Behind the car along Pump Lane, to its pull-up, past it, and right into Begonia Avenue.
    {id:'pump-car',name:'grey car',colour:'#8a9099',speed:9,yields:true,path:pts(PUMP_CAR),signals:[{from:p(490,-90),to:p(440,-60),side:'right'}]},
    {id:'london-car',name:'white van',colour:'#f5f5f4',speed:12,path:pts(LONDON_CAR)},
    // Waiting at the pedestrian lights on the left, then across London Road in front of the car.
    {id:'london-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-220.8,207.5],[-218.8,199.3]])}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre, roundabout',
      where:'Courteney Road at the roundabout by Tesco, first exit towards the Bowaters roundabout',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(-438.3,533.5),
      starts:[{actor:'tesco-car',at:p(-433.5,473.9),delay:0}],
      endAt:p(-401.9,361.2),
      // The entry, the ring to the right, where the green car comes round, and the Tesco way in.
      quiet:[{x:-414,z:394,radius:12},{x:-394,z:398,radius:12},{x:-368,z:378,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-426.7,429.7)},frame:{yaw:0,pitch:22},state:'On Courteney Road at 25 mph, the roundabout by Tesco ahead.'},
        line:{pause:{kind:'stop',at:p(-416.9,395.6)},when:{actor:'tesco-car',at:p(-397.2,396.6)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-416.9,395.6)},when:{actor:'tesco-car',at:p(-402.1,365)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'Taking the first exit, signal left on the approach, so the traffic round the roundabout knows you are leaving there.'}},
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car out of the Tesco way in, on your right, was coming round the roundabout across your entry. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming round from the Tesco way in, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone out ahead of you and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go'],['look-right','mirror-left','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the green car had gone out ahead of you.'
        }
      ]
    },
    {
      id:'twydall-zebra',
      title:'Zebra crossing',
      where:'Twydall Lane, the zebra crossing by Lewis Avenue',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-348,-160.5),
      starts:[{actor:'zebra-pedestrian',at:p(-348,-160.5),delay:0}],
      endAt:p(-316.2,-304.9),
      quiet:[{x:-327,z:-275,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(-345.6,-220.3)},frame:{yaw:0,pitch:22},state:'On Twydall Lane at 25 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(-331.2,-268.9)},when:{actor:'zebra-pedestrian',at:p(-328,-275.9)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(-331.2,-268.9)},when:{actor:'zebra-pedestrian',at:p(-330.3,-277.1)},frame:{yaw:0,pitch:30},
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
              message:'Someone was stepping on to the zebra crossing from the right. Slow down in good time to stop for them.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Sped up at a zebra crossing',
              message:'The pedestrian was stepping on to the zebra. Speeding up to get over first puts them at risk.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-right','slow-down']],
          next:{then:'zebra'},
          explain:'Interior mirror, then slow down: the pedestrian was stepping on to the zebra crossing from the right.'
        },
        {
          id:'zebra',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-right','look-left'],
          rules:[
            {kind:'unsafe',id:'zebra',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove on to the zebra with someone crossing',
              message:'The pedestrian was on the zebra crossing, walking into your half of the road. Give way to anyone on a zebra. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-left','give-way'],['look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the pedestrian was on the zebra crossing, walking into your half of the road.'
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
      id:'goudhurst-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'Goudhurst Road, right at the mini-roundabout on to Beechings Way',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(21.9,-582.2),
      starts:[{actor:'beechings-car',at:p(-139.5,-578.4),delay:0}],
      endAt:p(91,-625.9),
      // The mini-roundabout, Beechings Way to the right, where the silver car comes from, and to the left, where it goes.
      quiet:[{x:63,z:-638,radius:14},{x:95,z:-622,radius:24},{x:40,z:-655,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(42.8,-610.1)},frame:{yaw:0,pitch:22},state:'On Goudhurst Road at 20 mph, the mini-roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(55,-629.5)},when:{actor:'beechings-car',at:p(84.6,-626.3)},frame:{yaw:-50,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(55,-629.5)},when:{actor:'beechings-car',at:p(35.2,-662.2)},frame:{yaw:-30,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach to turn right at a mini-roundabout.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for Beechings Way.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car coming along Beechings Way from the right was going ahead over the mini-roundabout, across your way. Give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the silver car coming along Beechings Way from the right was close, going ahead over the mini-roundabout.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car went by. Look right again, along Beechings Way, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The silver car had gone on towards Eastcourt Lane and nothing more was coming from the right: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the silver car had gone by and nothing more was coming from the right.'
        }
      ]
    },
    {
      id:'pump-lane-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'Beechings Way, right at the mini-roundabout into Pump Lane',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(589.7,-432),
      starts:[{actor:'pump-up-car',at:p(512.4,-477.2),delay:0}],
      endAt:p(643.2,-348.3),
      // The mini-roundabout, Pump Lane to the right, where the red car comes from, and Beechings Way beyond, where it goes.
      quiet:[{x:648,z:-384,radius:14},{x:640,z:-352,radius:24},{x:680,z:-376,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(620.7,-406.7)},frame:{yaw:0,pitch:22},state:'On Beechings Way at 25 mph, the mini-roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(639.5,-391.9)},when:{actor:'pump-up-car',at:p(642.3,-366)},frame:{yaw:-50,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(639.5,-391.9)},when:{actor:'pump-up-car',at:p(690.4,-375.5)},frame:{yaw:-20,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach to turn right at a mini-roundabout.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for Pump Lane.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic from the right, here out of Pump Lane.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming up Pump Lane, on your right, was signalling right: it was going round the mini-roundabout across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming up Pump Lane, on your right, was signalling right, round the mini-roundabout across your way.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went round. Look right again, into Pump Lane, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone on along Beechings Way and nothing more was coming up Pump Lane: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the red car had gone round and nothing more was coming up Pump Lane.'
        }
      ]
    },
    {
      id:'pump-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Pump Lane, past Aylward Way',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(552.3,-153.2),
      starts:[{actor:'pump-car',at:p(552.3,-153.2),delay:0}],
      endAt:p(505.6,-101),
      selfCancel:false,
      quiet:[{x:506,z:-101,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(529,-127.1)},frame:{yaw:15,pitch:28},state:'On Pump Lane at 25 mph, Aylward Way behind on the left, a car behind.'},
        stopped:{pause:{kind:'stop',at:p(505.6,-101)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Aylward Way and short of Begonia Avenue, clear of both junctions.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Begonia Avenue opposite could not see past you, and those turning in would meet you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right, into Begonia Avenue: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Aylward Way; mirrors (the grey car was behind), then signal left.'
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
      id:'pump-move-off',
      turn:'right',
      title:'Moving off',
      where:'Pump Lane, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(505.6,-101),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'pump-car',at:p(552.3,-153.2),delay:0}],
      endAt:p(472.3,-63.8),
      quiet:[{x:506,z:-101,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(505.6,-101)},when:{actor:'pump-car',at:p(509.2,-109.7)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(505.6,-101)},when:{actor:'pump-car',at:p(453,-63.4)},frame:{yaw:-170,pitch:26},
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
              message:'The grey car had gone by, turning into Begonia Avenue, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the grey car had gone by.'
        }
      ]
    },
    {
      id:'london-road-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Pump Lane, right on to London Road (A2)',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(293.1,244.6),
      starts:[{actor:'london-car',at:p(297.4,214.9),delay:0}],
      endAt:p(224.8,316.2),
      // The junction, London Road to the right (west), where the white van comes from, and to the left, where it goes.
      quiet:[{x:258,z:320,radius:14},{x:225,z:312,radius:28},{x:292,z:330,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(277,291.5)},frame:{yaw:0,pitch:22},state:'Approaching the end of Pump Lane at 15 mph.'},
        line:{pause:{kind:'stop',at:p(262.8,314.5)},when:{actor:'london-car',at:p(238,315.8)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(262.8,314.5)},when:{actor:'london-car',at:p(291.8,330)},frame:{yaw:-40,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on London Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of London Road comes from the right, and it is a 40 mph road.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white van',
              message:'The white van coming along London Road from the right was close and fast, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white van\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white van\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white van coming along London Road from the right was close, and on a 40 mph road it closes the gap fast.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming along it from Rainham before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white van passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'London Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: London Road was clear both ways.'
        }
      ]
    },
    {
      id:'london-road-lights',
      title:'Traffic lights, pedestrian crossing',
      where:'London Road (A2), the pedestrian lights short of the Bowaters roundabout',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-124.8,230.6),
      starts:[{actor:'london-pedestrian',at:p(-124.8,230.6),delay:0}],
      lights:p(-216.4,206.1),
      endAt:p(-240.7,199.4),
      quiet:[{x:-218,z:205,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-163.4,220)},lights:'red',frame:{yaw:0,pitch:22},state:'On London Road, the pedestrian lights ahead.'},
        line:{pause:{kind:'stop',at:p(-208.8,207.9)},lights:'red',when:{actor:'london-pedestrian',at:p(-220.2,205.1)},panel:'right',frame:{yaw:0,pitch:30},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-208.8,207.9)},lights:'red',when:{actor:'london-pedestrian',at:p(-219,200.1)},panel:'right',frame:{yaw:0,pitch:30},
          state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-right','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: on a 40 mph road you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red and someone was crossing. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red for someone crossing London Road. Speeding up to get through puts them at risk.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: a right signal says you are turning, and there is no road to the right here.'}},
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
              message:'The pedestrian was nearly across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look both ways along the crossing, then go: the pedestrian was across your half and the lights were green.'
        }
      ]
    }
  ]
},BEFORE));
