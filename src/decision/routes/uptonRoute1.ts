import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EMERGE_CAR,LEAVE_CAR,ONCOMING_CAR,RING_G_CAR,RING_S_CAR} from './uptonRoute1Paths';

/**
 * Upton (Wirral), the Greasby Road roundabout and Leeswood Road: eight challenges from the test centre on Arrowe Park
 * Road: left out of the test centre on to Arrowe Park Road, the third exit at the Greasby Road roundabout into Old
 * Greasby Road, right over the crossing at the Arrowe Park Road and Ford Road lights, the first exit at the Upton
 * roundabout by Sainsbury's on to Upton Road, right at the Houghton Road lights, pulling up and moving off on Leeswood
 * Road, and right out of Leeswood Road on to Arrowe Park Road, back to the test centre. Chosen from the map and the
 * published evidence (content/packs/upton/ROUTES.md).
 * Scene upton-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
  // (At the line: the roundabout's island and the bend of the Upton Bypass hide the car coming round until there.)
  'greasby-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-585.9,-188.2)},when:{actor:'ring-g-car',at:p(-581.2,-207.9)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Greasby Road roundabout.'}},
  'ford-road-lights':{first:'approach',second:'turn',place:{pause:{kind:'moving',at:p(-201,-380.4)},when:{actor:'ford-pedestrian',at:p(-178.4,-367.5)},frame:{yaw:-25,pitch:44,shift:-4},
    state:'Approaching the Arrowe Park Road lights on green.'}},
  // (At the line: the Arrowe Park Road entry curves in to the roundabout, which comes into view only there.)
  'upton-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-146.4,56.6)},when:{actor:'ring-s-car',at:p(-163.4,65.8)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Upton roundabout.'}},
  // (In the junction: the queue at these lights, not the map, sets when the car gets there.)
  'houghton-lights':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(328.6,38.7)},when:{actor:'oncoming-car',at:p(362,23.3)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting in the junction to turn right into Houghton Road. The lights are green.'}},
  // (At the line: the houses and hedges on the corner hide Arrowe Park Road until there.)
  'leeswood-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-100.5,289.5)},when:{actor:'emerge-car',at:p(-115.2,268.3)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Leeswood Road.'}}
};

export const UPTON_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'upton-1',
  title:'Upton: the Greasby Road roundabout and Leeswood Road',
  scene:'upton-route-1',
  briefing:'Upton, the Greasby Road roundabout and Leeswood Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-161,z:264.6,headingDeg:94},
  // Arrowe Park Road, the Upton roundabout, the Upton Bypass, the Greasby Road roundabout, Old Greasby Road, Arrowe
  // Park Road south, the Upton roundabout again, Upton Road, Houghton Road, Leeswood Road, and back into the test
  // centre's way in.
  through:pts([[-429.3,13.4],[-371.1,-334.1],[-164.1,-127.8],[163.4,78.2],[348.9,127.1],[115.2,249.8],[-160,266]]),
  // Wide of the car parked at the kerb on Houghton Road just short of the Leeswood Road roundabout, and pulled in to
  // the kerb on Leeswood Road (room for the cyclist to pass).
  shifts:[{from:p(354.4,187.6),to:p(356.1,204.5),left:-.6},{from:p(269.3,239.6),to:p(239.3,241.8),left:.5}],
  actors:[
    {id:'leave-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(LEAVE_CAR)},
    {id:'ring-g-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_G_CAR)},
    // On the crossing over Arrowe Park Road south of the lights, from the near kerb, late on the lights.
    {id:'ford-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-175.6,-367.6],[-185.6,-367.4]])},
    {id:'ring-s-car',name:'silver car',colour:'#c0c4c8',speed:9,path:pts(RING_S_CAR)},
    {id:'oncoming-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(ONCOMING_CAR)},
    // Behind the car along Leeswood Road, past it at the kerb, and left into Northbrook Way.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'emerge-car',name:'grey car',colour:'#8a9099',speed:11,path:pts(EMERGE_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, left on to Arrowe Park Road',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(-158.7,263.3),
      // (Set going as the car comes to the line, so it is there as the car stops.)
      starts:[{actor:'leave-car',at:p(-145.9,265.4),delay:0}],
      endAt:p(-124.7,246.3),
      // The way out, Arrowe Park Road to the right, where the white car comes from, and to the left.
      quiet:[{x:-121,z:263,radius:22},{x:-113,z:295,radius:30},{x:-127,z:236,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(-126,266.2)},when:{actor:'leave-car',at:p(-114.6,282)},frame:{yaw:-70,pitch:32},
          state:'At the end of the test centre\'s way out, at the edge of Arrowe Park Road.'},
        clear:{pause:{kind:'stop',at:p(-126,266.2)},when:{actor:'leave-car',at:p(-128,232.9)},frame:{yaw:-20,pitch:32},
          state:'Still at the edge of Arrowe Park Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','signal-left','signal-right','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning left, you join the near lane of Arrowe Park Road, and its traffic comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the drivers on Arrowe Park Road know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming up Arrowe Park Road from the right was a few seconds away in the lane you were joining. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-left','give-way'],['signal-left','look-right','give-way'],['look-right','look-left','signal-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal left and wait: the white car coming up Arrowe Park Road from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be overtaking towards you, or walking across the way out.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and Arrowe Park Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Arrowe Park Road was clear.'
        }
      ]
    },
    {
      id:'greasby-roundabout',
      turn:'right',
      title:'Roundabout, right turn',
      where:'Upton Bypass at the Greasby Road roundabout, third exit into Old Greasby Road',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(-529,-106.6),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-g-car',at:p(-565.1,-172),delay:0}],
      endAt:p(-578.9,-254.3),
      // The roundabout's ring, Old Greasby Road, where the black car comes from and where the car leaves, and Greasby
      // Road west, where the black car goes.
      quiet:[{x:-605,z:-216,radius:30},{x:-575,z:-180,radius:14},{x:-565,z:-255,radius:20},{x:-655,z:-216,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-565.1,-172)},frame:{yaw:0,pitch:22},state:'Approaching the Greasby Road roundabout.'},
        line:{pause:{kind:'stop',at:p(-585.9,-188.2)},when:{actor:'ring-g-car',at:p(-581.2,-207.9)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-585.9,-188.2)},when:{actor:'ring-g-car',at:p(-613.1,-192.5)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so everyone at it knows you are going round.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right: you are taking the third exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round the roundabout from Old Greasby Road, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Old Greasby Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Greasby Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round towards Greasby Road.'
        }
      ]
    },
    {
      id:'ford-road-lights',
      turn:'right',
      title:'Pedestrian crossing at the lights, right turn',
      where:'Old Greasby Road at the Arrowe Park Road and Ford Road lights, right over the crossing on to Arrowe Park Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-298.8,-355.4),
      // (Set going as the car comes up to the lights, so they are on the crossing as it turns, whatever traffic held it up.)
      starts:[{actor:'ford-pedestrian',at:p(-224.4,-375.4),delay:0}],
      lights:p(-191.2,-381.8),lightsAll:true,
      endAt:p(-177.5,-346.3),
      // The junction, the crossing over Arrowe Park Road south of it, and Arrowe Park Road just along it.
      quiet:[{x:-183,z:-378,radius:24},{x:-180,z:-367,radius:12},{x:-178,z:-345,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-224.4,-375.4)},frame:{yaw:0,pitch:20},state:'Approaching the Arrowe Park Road lights on green.'},
        turn:{pause:{kind:'stop',at:p(-180,-377.1)},when:{actor:'ford-pedestrian',at:p(-178.4,-367.5)},frame:{yaw:-20,pitch:32},
          state:'Turning right on to Arrowe Park Road. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-180,-377.1)},when:{actor:'ford-pedestrian',at:p(-183,-367.5)},frame:{yaw:-10,pitch:32},
          state:'Waiting short of the crossing on Arrowe Park Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right in good time so the drivers behind and the people at the crossing know you are turning.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into a turn',
              message:'Green means go if it is safe: turning, you need a speed you can stop from for anyone still on the crossing in the road you turn into.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'turn'},
          explain:'Interior and right mirrors, then signal right.'
        },
        {
          id:'turn',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look into Arrowe Park Road, the way you are turning, first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove at someone still crossing',
              message:'Someone was still on the crossing over Arrowe Park Road, in your lane. Your green does not make them vanish: wait until they are clear. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-right','give-way'],['mirror-interior','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: someone was still on the crossing over Arrowe Park Road, in your lane.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Before you go, look again along the crossing: is anyone else stepping out?'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited with the way clear',
              message:'The pedestrian was past your lane, nearly at the far kerb: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the crossing again, then go: the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'upton-roundabout',
      turn:'left',
      title:'Roundabout, left turn',
      where:'Arrowe Park Road at the Upton roundabout by Sainsbury\'s, first exit on to Upton Road',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(-157.1,-42.1),
      // (Set going as the car comes to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-s-car',at:p(-157.2,37.9),delay:0}],
      endAt:p(-110.7,82.3),
      // The roundabout's north side and its Upton Road exit, the Upton Bypass entry, where the silver car comes from, and
      // Arrowe Park Road south, where it leaves.
      quiet:[{x:-152,z:70,radius:20},{x:-188,z:80,radius:18},{x:-132,z:92,radius:16},{x:-120,z:78,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(-157.2,37.9)},frame:{yaw:0,pitch:22},state:'Approaching the Upton roundabout.'},
        line:{pause:{kind:'stop',at:p(-146.4,56.6)},when:{actor:'ring-s-car',at:p(-163.4,65.8)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-146.4,56.6)},when:{actor:'ring-s-car',at:p(-131.9,89.4)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so everyone at the roundabout knows you are leaving at Upton Road.'}},
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
              message:'The silver car coming round the roundabout from the Upton Bypass, on your right, was close, crossing your way in and out. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the silver car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the silver car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the silver car coming round from the Upton Bypass, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The silver car had gone on round towards Arrowe Park Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the silver car had gone on round.'
        }
      ]
    },
    {
      id:'houghton-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Upton Road at the Houghton Road and Salacre Lane lights, right into Houghton Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(228.5,70.8),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(295.8,52.1),delay:0}],
      lights:p(328.2,38.4),lightsAll:true,
      endAt:p(341.4,60.9),
      // The junction, Upton Road to the east, where the oncoming car comes from, the mouth of Salacre Lane opposite
      // Houghton Road, and Houghton Road.
      quiet:[{x:336,z:36,radius:22},{x:378,z:12,radius:28},{x:344,z:14,radius:12},{x:342,z:62,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(295.8,52.1)},frame:{yaw:0,pitch:20},state:'Approaching the Houghton Road lights on green.'},
        centre:{pause:{kind:'stop',at:p(328.6,38.7)},when:{actor:'oncoming-car',at:p(362,23.3)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(328.6,38.7)},when:{actor:'oncoming-car',at:p(314.2,48.1)},frame:{yaw:40,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The blue car coming along Upton Road the other way was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the blue car coming along Upton Road the other way was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Houghton Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Houghton Road is clear to turn into, then go: the blue car had gone by.'
        }
      ]
    },
    {
      id:'leeswood-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Leeswood Road, between Kiln Road and Big Meadow Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(309.2,236.9),
      starts:[{actor:'cyclist',at:p(309.2,236.9),delay:0}],
      endAt:p(239.5,242.3),
      selfCancel:false,
      // The pull-up, and Kiln Road on the way to it.
      quiet:[{x:240,z:242,radius:34},{x:262,z:252,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(259.4,240.8)},frame:{yaw:-15,pitch:28},state:'On Leeswood Road at 30 mph.'},
        stopped:{pause:{kind:'stop',at:p(239.5,242.3)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past Kiln Road, clear of Big Meadow Road opposite.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Kiln Road could not see past you.'}},
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
      id:'leeswood-move-off',
      turn:'right',
      title:'Moving off',
      where:'Leeswood Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(239.5,242.3),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(309.2,236.9),delay:0}],
      endAt:p(189.6,245.6),
      quiet:[{x:240,z:242,radius:50},{x:172,z:252,radius:16}],
      place:{
        check:{pause:{kind:'stop',at:p(239.5,242.3)},when:{actor:'cyclist',at:p(251.4,238.6)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(239.5,242.3)},when:{actor:'cyclist',at:p(209.8,244.2)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on towards Northbrook Way, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'leeswood-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Leeswood Road, right on to Arrowe Park Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-62.9,284),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'emerge-car',at:p(-81.7,286.4),delay:0}],
      endAt:p(-116.8,275.1),
      // The junction, Arrowe Park Road to the right (north), where the grey car comes from, and to the left.
      quiet:[{x:-112,z:288,radius:20},{x:-121,z:255,radius:24},{x:-104,z:316,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-81.7,286.4)},frame:{yaw:0,pitch:22},state:'Approaching the end of Leeswood Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-100.5,289.5)},when:{actor:'emerge-car',at:p(-115.2,268.3)},frame:{yaw:-60,pitch:28},state:'At the end of Leeswood Road.'},
        clear:{pause:{kind:'stop',at:p(-100.5,289.5)},when:{actor:'emerge-car',at:p(-102,311.1)},frame:{yaw:-20,pitch:28},state:'Still at the end of Leeswood Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Arrowe Park Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Arrowe Park Road, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the grey car',
              message:'The grey car coming down Arrowe Park Road from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the grey car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the grey car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the grey car coming down Arrowe Park Road from the right was close, in the lane you cross.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the grey car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: turning right, you join the far lane of Arrowe Park Road, and its traffic comes from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and Arrowe Park Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the grey car had gone by and Arrowe Park Road was clear.'
        }
      ]
    }
  ]
},BEFORE));
