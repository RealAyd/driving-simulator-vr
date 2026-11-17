import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EMERGE_CAR,LEAVE_CAR,ONCOMING_CAR,RING_CAR,SUSSEX_CAR} from './ketteringRoute1Paths';

/**
 * Kettering, Pytchley Road and the Patrick Road estate: eight challenges from the test centre on Orion Way, Kettering
 * Business Park: right out of the test centre on to Orion Way, the first exit at the Pytchley Road roundabout (A509),
 * ahead over the signal crossing on Pytchley Road, right into Patrick Road, right out of Northumberland Road on to Sussex
 * Road, left out of Patrick Road on to Pytchley Road, and pulling up and moving off on Pytchley Road; back by the
 * roundabout and Orion Way. Chosen from the map and the published evidence (content/packs/kettering/ROUTES.md).
 * Scene kettering-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
  // (At the line: the roundabout's island and the cars on it hide the traffic coming round until there.)
  'pytchley-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(392.4,126.1)},when:{actor:'ring-car',at:p(397.8,149.8)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Pytchley Road roundabout.'}},
  'pytchley-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(405.4,-62.4)},lights:'red',when:{actor:'pytchley-pedestrian',at:p(412.6,-89.75)},frame:{yaw:0,pitch:52,shift:-6},
    state:'Approaching the crossing on Pytchley Road. The lights are red.'}},
  // (In the road: the oncoming car, not the map, sets when the car gets there.)
  'patrick-turn':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(470.4,-440.7)},when:{actor:'oncoming-car',at:p(479.7,-458.4)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting on Pytchley Road to turn right into Patrick Road.'}},
  // (At the line: the houses on the corner hide Sussex Road until there.)
  'sussex-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(696.2,-160.6)},when:{actor:'sussex-car',at:p(675.1,-165.9)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the end of Northumberland Road.'}},
  // (At the line: the hedges on the corner hide Pytchley Road until there.)
  'patrick-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(483.9,-448.9)},when:{actor:'emerge-car',at:p(482.6,-466.8)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Patrick Road.'}}
};

export const KETTERING_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'kettering-1',
  title:'Kettering: Pytchley Road and Patrick Road',
  scene:'kettering-route-1',
  briefing:'Kettering, Pytchley Road and Patrick Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:3.5,z:31,headingDeg:340},
  // The test centre's way out, Orion Way, the Orion Way roundabout, the Pytchley Road roundabout, Pytchley Road north,
  // Patrick Road, Northumberland Road, Sussex Road, Patrick Road, Pytchley Road south, the roundabout again, and Orion
  // Way back towards the test centre.
  through:pts([[26,3],[100,-33],[190,-25],[330,85],[412,0],[430,-200],[520,-436],[600,-525],[716,-400],[722,-230],[650,-180],
    [560,-280],[548,-400],[510,-440],[450,-330],[410,-50],[340,90],[200,-15],[100,-33]]),
  // Pulled in to the kerb on Pytchley Road (no cars parked along it: room for the cyclist to pass).
  shifts:[{from:p(433.9,-223.7),to:p(429.9,-197),left:.4}],
  actors:[
    {id:'leave-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(LEAVE_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    // On the crossing on Pytchley Road, from the far (east) kerb across the car's lane, on the red.
    {id:'pytchley-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[414.9,-89.8],[405.1,-89.4],[405,-92.6]])},
    {id:'oncoming-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(ONCOMING_CAR)},
    {id:'sussex-car',name:'green car',colour:'#15803d',speed:8,path:pts(SUSSEX_CAR)},
    {id:'emerge-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(EMERGE_CAR)},
    // Behind the car down Pytchley Road, past it at the kerb, and on towards Pytchley Lane.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, right on to Orion Way',
      instruction:'When you\'re ready, drive out of the test centre and turn right, please.',
      instructAt:p(3.5,31),
      // (Set going as the car moves off, so it comes round the bend as the car reaches the line.)
      starts:[{actor:'leave-car',at:p(3.5,31),delay:0}],
      endAt:p(45,16.7),
      // The way out, Orion Way round the bend to the right, where the white car comes from, and to the left, where it goes.
      quiet:[{x:24,z:6,radius:16},{x:45,z:17,radius:16},{x:80,z:-14,radius:26},{x:12,z:-22,radius:18}],
      place:{
        line:{pause:{kind:'stop',at:p(17.1,5.9)},when:{actor:'leave-car',at:p(31.8,16.09)},frame:{yaw:-60,pitch:32},
          state:'At the end of the test centre\'s way out, at the edge of Orion Way.'},
        clear:{pause:{kind:'stop',at:p(17.1,5.9)},when:{actor:'leave-car',at:p(11.99,-20.97)},frame:{yaw:-20,pitch:32},
          state:'Still at the edge of Orion Way.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: Orion Way bends away to the right, and its traffic comes round the bend in the lane you cross.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Orion Way know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming round the bend of Orion Way from the right was close, in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal right and wait: the white car coming round the bend from the right was close, in the lane you cross.'
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
              message:'The white car had gone by and Orion Way was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Orion Way was clear.'
        }
      ]
    },
    {
      id:'pytchley-roundabout',
      turn:'left',
      title:'Roundabout, left turn',
      where:'Orion Way at the Pytchley Road roundabout (A509), first exit on to Pytchley Road',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(292.7,60.5),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(346.7,95.7),delay:0}],
      endAt:p(414.1,89.9),
      // The entry, the roundabout's west side, where the black car comes round from Kettering Road, its south side, and
      // the exit on to Pytchley Road.
      quiet:[{x:394,z:127,radius:14},{x:400,z:150,radius:16},{x:425,z:167,radius:16},{x:409,z:108,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(367.8,116.9)},frame:{yaw:0,pitch:22},state:'Approaching the Pytchley Road roundabout at 40 mph.'},
        line:{pause:{kind:'stop',at:p(392.4,126.1)},when:{actor:'ring-car',at:p(397.8,149.8)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(392.4,126.1)},when:{actor:'ring-car',at:p(448.8,125)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so everyone at the roundabout knows you are leaving at Pytchley Road.'}},
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
              message:'The black car coming round the roundabout from Kettering Road, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Kettering Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Holdenby and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round.'
        }
      ]
    },
    {
      id:'pytchley-crossing',
      title:'Pedestrian crossing at the traffic lights',
      where:'Pytchley Road, the signal crossing south of Pytchley Lane',
      instruction:'Follow the road ahead, please.',
      instructAt:p(405.1,-44.5),
      // (Set going as the car comes up to the crossing, so they are on it as the car arrives, whatever held it up.)
      starts:[{actor:'pytchley-pedestrian',at:p(405.1,-46.5),delay:0}],
      lights:p(409.8,-90.05),
      endAt:p(410.9,-109.1),
      // The crossing, the approach to it, and the mouth of Pytchley Lane just past it, where its traffic joins.
      quiet:[{x:408,z:-89,radius:22},{x:406,z:-62,radius:18},{x:415,z:-125,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(405.4,-62.4)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the crossing at 30 mph.'},
        line:{pause:{kind:'stop',at:p(407.2,-81.8)},lights:'red',when:{actor:'pytchley-pedestrian',at:p(412.6,-89.75)},frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(407.2,-81.8)},lights:'red',when:{actor:'pytchley-pedestrian',at:p(405.1,-89.4)},frame:{yaw:0,pitch:30},
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
      id:'patrick-turn',
      turn:'right',
      title:'Right turn across oncoming traffic',
      where:'Pytchley Road, right into Patrick Road',
      instruction:'Take the next road on the right, please.',
      instructAt:p(453.9,-360.4),
      // (Set going as the car comes up to wait, so it is there whatever held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(455.5,-370.3),delay:0}],
      endAt:p(500.6,-444.6),
      // (And Patrick Road, and the corner where it meets Sussex Road and Northumberland Road, kept quiet until the car is
      // round it: the estate has no other way out.)
      quietUntil:p(564.6,-441.1),
      // The junction, Pytchley Road to the north, where the grey car comes from, Patrick Road, and its far end.
      quiet:[{x:472,z:-448,radius:20},{x:482,z:-478,radius:24},{x:510,z:-440,radius:24},{x:556,z:-424,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(463.3,-409.5)},frame:{yaw:0,pitch:20},state:'On Pytchley Road at 30 mph.'},
        centre:{pause:{kind:'stop',at:p(470.4,-440.7)},when:{actor:'oncoming-car',at:p(479.7,-458.4)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Patrick Road.'},
        clear:{pause:{kind:'stop',at:p(470.4,-440.7)},when:{actor:'oncoming-car',at:p(469.1,-420.2)},frame:{yaw:40,pitch:32},
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
              message:'The grey car coming down Pytchley Road towards you was a few seconds away, and turning right you give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the grey car coming down Pytchley Road towards you has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Patrick Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing its mouth.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and nothing more was coming: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Patrick Road is clear to turn into, then go: the grey car had gone by.'
        }
      ]
    },
    {
      id:'sussex-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Northumberland Road, right on to Sussex Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(716.9,-194.7),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'sussex-car',at:p(716.9,-194.7),delay:0}],
      endAt:p(654,-175.4),
      // (And Sussex Road back to Patrick Road, narrow with cars parked, kept quiet until the car is out of the estate.)
      quietUntil:p(481.9,-449.2),
      // The junction, Sussex Road to the right, where the green car comes from, and to the left, where it goes; Sussex
      // Road on to Patrick Road.
      quiet:[{x:694,z:-156,radius:20},{x:660,z:-174,radius:26},{x:718,z:-141,radius:16},{x:600,z:-212,radius:26},{x:556,z:-262,radius:26},
        {x:546,z:-330,radius:26},{x:550,z:-395,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(707.1,-177.4)},frame:{yaw:0,pitch:22},state:'Approaching the end of Northumberland Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(696.2,-160.6)},when:{actor:'sussex-car',at:p(675.1,-165.9)},frame:{yaw:-60,pitch:28},state:'At the end of Northumberland Road.'},
        clear:{pause:{kind:'stop',at:p(696.2,-160.6)},when:{actor:'sussex-car',at:p(714.7,-138.5)},frame:{yaw:-20,pitch:28},state:'Still at the end of Northumberland Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Sussex Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Sussex Road, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming along Sussex Road from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming along Sussex Road from the right was close, in the lane you cross.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone by and Sussex Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the green car had gone by and Sussex Road was clear.'
        }
      ]
    },
    {
      id:'patrick-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Patrick Road, left on to Pytchley Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(548.6,-422.7),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'emerge-car',at:p(528.1,-430.7),delay:0}],
      endAt:p(468.1,-415.6),
      // The junction, Pytchley Road to the right, where the blue car comes from, and to the left, where it goes.
      quiet:[{x:476,z:-450,radius:20},{x:484,z:-480,radius:26},{x:466,z:-415,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(505.4,-440.9)},frame:{yaw:0,pitch:22},state:'Approaching the end of Patrick Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(483.9,-448.9)},when:{actor:'emerge-car',at:p(482.6,-466.8)},frame:{yaw:-70,pitch:26},state:'At the end of Patrick Road.'},
        clear:{pause:{kind:'stop',at:p(483.9,-448.9)},when:{actor:'emerge-car',at:p(469.1,-420.2)},frame:{yaw:-30,pitch:26},state:'Still at the end of Patrick Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Pytchley Road knows where you are going.'}},
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
              message:'Look right first: turning left, you join the near lane of Pytchley Road, and its traffic comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming down Pytchley Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming down Pytchley Road from the right was close, in the lane you join.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be overtaking towards you, or crossing the end of Patrick Road on foot.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Pytchley Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Pytchley Road was clear.'
        }
      ]
    },
    {
      id:'pytchley-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Pytchley Road, south of Patrick Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(433.9,-223.7),
      starts:[{actor:'cyclist',at:p(433.9,-223.7),delay:0}],
      endAt:p(429.9,-197),
      selfCancel:false,
      // The pull-up, and the mouth of Pytchley Lane ahead.
      quiet:[{x:430,z:-197,radius:34},{x:416,z:-135,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(432.8,-216.8)},frame:{yaw:-15,pitch:28},state:'On Pytchley Road at 30 mph.'},
        stopped:{pause:{kind:'stop',at:p(429.9,-197)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight, clear of Patrick Road behind and Pytchley Lane ahead.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Pytchley Lane could not see past you.'}},
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
      id:'pytchley-move-off',
      turn:'right',
      title:'Moving off',
      where:'Pytchley Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(429.9,-197),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(433.9,-223.7),delay:0}],
      endAt:p(423.2,-154.5),
      quiet:[{x:430,z:-197,radius:40},{x:416,z:-135,radius:18}],
      place:{
        check:{pause:{kind:'stop',at:p(429.9,-197)},when:{actor:'cyclist',at:p(429,-210.4)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(429.9,-197)},when:{actor:'cyclist',at:p(424.6,-162.1)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on down Pytchley Road, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    }
  ]
},BEFORE));
