import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EMERGE_CAR,GLADSTONE_CAR,HARLESTONE_CAR,RING_CAR} from './northamptonRoute1Paths';

/**
 * Northampton, Mill Lane and Harlestone Road: eight challenges from the test centre at the Gladstone Business Centre,
 * Heathfield Way: right out of Heathfield Way on to Gladstone Road, the first exit at the Mill Lane roundabout, the
 * signal crossing on Mill Lane, the first exit at the Harlestone Road roundabout, left out of Warren Road on to
 * Dallington Road, pulling up and moving off on Merthyr Road, and right from Gladstone Road into Heathfield Way, back
 * towards the test centre. Chosen from the map and the published evidence (content/packs/northampton/ROUTES.md).
 * Scene northampton-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line, or the moment is set by where the car waits. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the roundabout's island and its planting hide the traffic coming round until there.)
  'mill-lane-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(151.7,-496.8)},when:{actor:'ring-car',at:p(150.7,-508.91)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Mill Lane roundabout.'}},
  'mill-lane-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-50.1,-313.2)},lights:'red',when:{actor:'mill-lane-pedestrian',at:p(-85.3,-297.2)},frame:{yaw:0,pitch:52,shift:-6},
    state:'Approaching the crossing on Mill Lane. The lights are red.'}},
  // (At the line: the roundabout is small, and the cars coming round it are in view only there.)
  'harlestone-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-370.3,214.3)},when:{actor:'harlestone-car',at:p(-380.53,217.31)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the give way line of the Harlestone Road roundabout.'}},
  // (At the line: the houses and hedges on the corner hide Dallington Road until there.)
  'warren-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(145.3,339.6)},when:{actor:'emerge-car',at:p(152.65,352.81)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Warren Road.'}},
  // (In the road: the oncoming car, not the map, sets when the car gets there.)
  'heathfield-turn':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(362.3,-234.8)},when:{actor:'oncoming-car',at:p(355.48,-255.8)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting on Gladstone Road to turn right into Heathfield Way.'}}
};

export const NORTHAMPTON_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'northampton-1',
  title:'Northampton: Mill Lane and Harlestone Road',
  scene:'northampton-route-1',
  briefing:'Northampton, Mill Lane and Harlestone Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:450.5,z:-212.8,headingDeg:246},
  // The test centre's way in, Heathfield Way, Gladstone Road north, the Mill Lane roundabout, Mill Lane south-west, the
  // Harlestone Road roundabout, Harlestone Road, Warren Road, Dallington Road, Merthyr Road, the Merthyr Road
  // roundabout, Gladstone Road north again, and Heathfield Way towards the test centre.
  through:pts([[400,-200],[340,-280],[150,-500],[100,-470],[-84,-296],[-370,195],[-300,330],[-99,569],[150,339],[97,252],[300,10],[417,-86],[380,-200],[359,-246],[410,-271]]),
  shifts:[
    // Out of the test centre's way in, kept off its left-hand corner on to Heathfield Way.
    {from:p(398.6,-223.5),to:p(384.4,-249.9),left:-.8},
    // Pulled in to the kerb on Merthyr Road (its cars are parked on the other side: room for the cyclist to pass).
    {from:p(229,86.2),to:p(250.8,58.8),left:.4},
    // Into the Merthyr Road roundabout, kept clear of the bollard on the nose of the splitter island.
    {from:p(404.6,-78.9),to:p(411.3,-83.3),left:1.45},
    // (And straight back in to the left, round the kerb on the corner into the roundabout.)
    {from:p(414.1,-90.4),to:p(413.6,-96.3),left:-.6},
    // Off the roundabout on to Gladstone Road, kept off the kerb on the left.
    {from:p(414.6,-98),to:p(418,-105.1),left:-.8}],
  actors:[
    {id:'leave-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(GLADSTONE_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    // On the crossing on Mill Lane, from the far (north-west) kerb across the car's lane, on the red.
    {id:'mill-lane-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-86.2,-299.3],[-84.1,-294.2],[-83.1,-291.8],[-85.9,-290.6]])},
    {id:'harlestone-car',name:'silver car',colour:'#c0c4c8',speed:9,path:pts(HARLESTONE_CAR)},
    {id:'emerge-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(EMERGE_CAR)},
    // Behind the car along Merthyr Road, past it at the kerb, and on towards the Merthyr Road loop.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'oncoming-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(GLADSTONE_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'The test centre\'s way out to Heathfield Way, right at its end on to Gladstone Road',
      instruction:'Drive out of the car park, and at the end of the road turn right, please.',
      instructAt:p(450.5,-212.8),
      // (Set going as the car moves off, so it comes down Gladstone Road as the car reaches the line.)
      starts:[{actor:'leave-car',at:p(450.5,-212.8),delay:0}],
      endAt:p(341.3,-276.8),
      // The end of Heathfield Way, Gladstone Road to the right (north), where the white car comes from, and to the left,
      // where it goes.
      quiet:[{x:359,z:-247,radius:16},{x:338,z:-285,radius:24},{x:376,z:-214,radius:18}],
      place:{
        line:{pause:{kind:'stop',at:p(363.5,-247.4)},when:{actor:'leave-car',at:p(353.36,-259.6)},frame:{yaw:-60,pitch:32},
          state:'At the end of Heathfield Way, at the edge of Gladstone Road.'},
        clear:{pause:{kind:'stop',at:p(363.5,-247.4)},when:{actor:'leave-car',at:p(369.31,-227.35)},frame:{yaw:-20,pitch:32},
          state:'Still at the end of Heathfield Way.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic coming down Gladstone Road from the right is in the near lane, the one you cross.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Gladstone Road know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming down Gladstone Road from the right was close, in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal right and wait: the white car coming down Gladstone Road from the right was close, in the lane you cross.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and Gladstone Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Gladstone Road was clear.'
        }
      ]
    },
    {
      id:'mill-lane-roundabout',
      turn:'left',
      title:'Roundabout, left turn',
      where:'Gladstone Road at the Mill Lane roundabout, first exit on to Mill Lane',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(223.7,-431.5),
      // (Set going as the car comes up Gladstone Road, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(223.7,-431.5),delay:0}],
      endAt:p(101,-470.4),
      // (The signal crossing on Mill Lane just past the exit is held green while the challenge is in hand.)
      lights:p(113,-482.1),
      // The entry, the roundabout's east side, where the black car comes round from Mill Lane, its west side, and the
      // exit on to Mill Lane.
      quiet:[{x:152,z:-497,radius:14},{x:156,z:-528,radius:18},{x:110,z:-512,radius:14},{x:115,z:-484,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(182,-474.7)},frame:{yaw:0,pitch:22},state:'Approaching the Mill Lane roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(151.7,-496.8)},when:{actor:'ring-car',at:p(150.7,-508.91)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(151.7,-496.8)},when:{actor:'ring-car',at:p(115.87,-500.7)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so everyone at the roundabout knows you are leaving at Mill Lane.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
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
              message:'The black car coming round the roundabout from Mill Lane, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Mill Lane, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Park Drive and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round.'
        }
      ]
    },
    {
      id:'mill-lane-crossing',
      title:'Pedestrian crossing at the traffic lights',
      where:'Mill Lane, the signal crossing by Glebeland Road',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-17.8,-336.6),
      // (Set going as the car comes up to the crossing, so they are on it as the car arrives, whatever held it up.)
      starts:[{actor:'mill-lane-pedestrian',at:p(-19.3,-335.3),delay:0}],
      lights:p(-79.5,-298.2),
      endAt:p(-103.5,-285.9),
      // The crossing, the approach to it, and the mouth of Glebeland Road just past it, where its traffic joins.
      quiet:[{x:-84,z:-295,radius:22},{x:-55,z:-312,radius:18},{x:-102,z:-288,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-50.1,-313.2)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the crossing at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-74.8,-298.9)},lights:'red',when:{actor:'mill-lane-pedestrian',at:p(-85.3,-297.2)},frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(-74.8,-298.9)},lights:'red',when:{actor:'mill-lane-pedestrian',at:p(-83.1,-291.8)},frame:{yaw:0,pitch:30},
          state:'Still at the crossing.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'before',id:'mirror-before-stopping',action:'give-way',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Stopped before the mirror',
              message:'Check the interior mirror before you slow down to stop: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The crossing\'s lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red with someone stepping on to the crossing. Speeding up to get through would put them at risk.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the crossing was at red, with someone crossing.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-right','look-left','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red and the pedestrian was crossing in front of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-right','give-way'],['look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red and the pedestrian was crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Pedestrian crossings',title:'No check before going',
              message:'Green means go only if the way is clear. Check the crossing both ways for anyone late across before you move off.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the crossing was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the crossing both ways, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'harlestone-roundabout',
      turn:'left',
      title:'Roundabout, left turn',
      where:'Mill Lane at the Harlestone Road roundabout, first exit on to Harlestone Road',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(-353.7,154.2),
      // (Set going a little before, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'harlestone-car',at:p(-353.2,104.3),delay:0}],
      endAt:p(-364.6,247.1),
      // (And Warren Road, narrow with cars parked along the car's side, kept clear until the next challenge takes it
      // over: a car coming out, or coming down it, meets the car head on with no room to pass.)
      quietUntil:p(-3.8,490.2),
      // The entry, the roundabout's north side, where the silver car comes round from Harlestone Road, Harlestone Road
      // into it from the north-west, and the exit on to Harlestone Road.
      quiet:[{x:-370,z:214,radius:12},{x:-388,z:213,radius:16},{x:-420,z:198,radius:22},{x:-362,z:248,radius:14},
        {x:-88,z:560,radius:18},{x:-58,z:534,radius:24},{x:-27,z:510,radius:24},{x:-4,z:490,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-363.2,187.6)},frame:{yaw:0,pitch:22},state:'Approaching the Harlestone Road roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-370.3,214.3)},when:{actor:'harlestone-car',at:p(-380.53,217.31)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-370.3,214.3)},when:{actor:'harlestone-car',at:p(-359.58,251.48)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so everyone at the roundabout knows you are leaving on to Harlestone Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car coming round the roundabout from Harlestone Road, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the silver car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the silver car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the silver car coming round from Harlestone Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The silver car had gone off along Harlestone Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the silver car had gone off along Harlestone Road.'
        }
      ]
    },
    {
      id:'warren-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Warren Road, left on to Dallington Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(96.2,392.3),
      // (Set going a little before, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'emerge-car',at:p(49.8,444.4),delay:0}],
      endAt:p(141.2,314.2),
      // The junction, Dallington Road to the right, where the blue car comes from, and to the left, where it goes.
      // (And Warren Road behind, narrow with cars parked along the car's side: no traffic coming down it to meet.)
      quiet:[{x:147,z:340,radius:18},{x:162,z:375,radius:24},{x:132,z:300,radius:20},{x:20,z:471,radius:24},{x:49,z:445,radius:24},{x:77,z:416,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(126.7,359.3)},frame:{yaw:0,pitch:22},state:'Approaching the end of Warren Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(145.3,339.6)},when:{actor:'emerge-car',at:p(152.65,352.81)},frame:{yaw:-70,pitch:26},state:'At the end of Warren Road.'},
        clear:{pause:{kind:'stop',at:p(145.3,339.6)},when:{actor:'emerge-car',at:p(141.54,315.44)},frame:{yaw:-30,pitch:26},state:'Still at the end of Warren Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Dallington Road knows where you are going.'}},
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
              message:'Look right first: turning left, you join the near lane of Dallington Road, and its traffic comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming up Dallington Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming up Dallington Road from the right was close, in the lane you join.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be overtaking towards you, or crossing the end of Warren Road on foot.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Dallington Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Dallington Road was clear.'
        }
      ]
    },
    {
      id:'merthyr-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Merthyr Road, between Aberdare Road and the Merthyr Road loop',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(229,86.2),
      starts:[{actor:'cyclist',at:p(229,86.2),delay:0}],
      endAt:p(250.8,58.8),
      selfCancel:false,
      // The pull-up, and the mouth of the Merthyr Road loop ahead.
      quiet:[{x:250,z:59,radius:34},{x:272,z:34,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(235.3,78.5)},frame:{yaw:-15,pitch:28},state:'On Merthyr Road at 30 mph.'},
        stopped:{pause:{kind:'stop',at:p(250.8,58.8)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight, clear of Aberdare Road behind and the Merthyr Road loop ahead.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of the Merthyr Road loop could not see past you.'}},
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
      id:'merthyr-move-off',
      turn:'right',
      title:'Moving off',
      where:'Merthyr Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(250.8,58.8),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(229,86.2),delay:0}],
      endAt:p(275.5,27.5),
      quiet:[{x:250,z:59,radius:40},{x:272,z:34,radius:18}],
      place:{
        check:{pause:{kind:'stop',at:p(250.8,58.8)},when:{actor:'cyclist',at:p(244.05,69.98)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(250.8,58.8)},when:{actor:'cyclist',at:p(272.37,31.52)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on along Merthyr Road, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'heathfield-turn',
      turn:'right',
      title:'Right turn across oncoming traffic',
      where:'Gladstone Road, right into Heathfield Way',
      instruction:'Take the next road on the right, please.',
      instructAt:p(396.9,-164.8),
      // (Set going as the car comes up to wait, so it is there whatever held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(396.9,-164.8),delay:0}],
      endAt:p(375.8,-256.7),
      // The junction, Gladstone Road to the north, where the grey car comes from, and Heathfield Way.
      quiet:[{x:361,z:-240,radius:20},{x:345,z:-272,radius:24},{x:380,z:-258,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(380.9,-196)},frame:{yaw:0,pitch:20},state:'On Gladstone Road at 30 mph.'},
        centre:{pause:{kind:'stop',at:p(362.3,-234.8)},when:{actor:'oncoming-car',at:p(355.48,-255.8)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Heathfield Way.'},
        clear:{pause:{kind:'stop',at:p(362.3,-234.8)},when:{actor:'oncoming-car',at:p(373.89,-218.06)},frame:{yaw:40,pitch:32},
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
              message:'Move to just left of the middle of the road to turn right: anyone behind can pass on your left.'}},
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
              message:'The grey car coming down Gladstone Road towards you was a few seconds away, and turning right you give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the grey car coming down Gladstone Road towards you has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Heathfield Way',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing its mouth.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and nothing more was coming: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Heathfield Way is clear to turn into, then go: the grey car had gone by.'
        }
      ]
    }
  ]
},BEFORE));
