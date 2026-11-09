import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,INGRAVE,KINGS,QUEENS,TC_CAR,WEALD} from './brentwoodRoute1Paths';

/**
 * Brentwood route 1, town centre and residential return: eight challenges from the test centre on Warley Hill, up
 * Kings Road past the station, right at the High Street lights, Wilson's Corner, Queen's Road, Rose Valley and back
 * by King Edward Road (the owner's route, 6 November 2026; content/packs/brentwood/ROUTES.md). Scene brentwood-routes
 * (OpenStreetMap). A practice route, not a confirmed test route.
 */
const pts=(a:readonly (readonly number[])[]):Vec2[]=>a.map(([x,z])=>({x:x!,z:z!}));
const p=(x:number,z:number):Vec2=>({x,z});

// Faults used at more than one challenge.
const MIRRORS_FIRST:Fault={level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
  message:'Mirrors first, then signal: you need to know who your signal is for.'};
const HORN:Fault={level:'feedback',heading:'Use of horn',title:'Horn not needed',
  message:'Use the horn only to warn others of your presence when they may not have seen you.'};
const flash:Fault={level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
  message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'};

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts): the approach and the decision at
 * the line taken together, close in, where the junction and what is coming are both in view. */
const BEFORE:Record<string,BeforeMerge>={
  'station-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(572.6,-494.4)},lights:'red',when:{actor:'station-pedestrian',at:p(583.7,-519.7)},frame:{yaw:0,pitch:52,shift:-6},
    state:'Approaching the crossing. The lights are red.'}},
  'high-street-lights':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(466.7,-954.7)},when:{actor:'weald-car',at:p(447,-1006.1)},frame:{yaw:0,pitch:52,shift:-6},
    state:'Approaching the lights on green.'}},
  'wilsons-corner':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(972.9,-1186.3)},when:{actor:'ingrave-car',at:p(1002,-1181.1)},frame:{yaw:-35,pitch:50,shift:-5},
    state:'Approaching Wilson\'s Corner.'}},
  'king-edward-emerge':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(591.6,-459.3)},when:{actor:'kings-car',at:p(573.4,-478.4)},frame:{yaw:-45,pitch:50,shift:-5},
    state:'Approaching the end of King Edward Road.'}}
};

export const BRENTWOOD_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'brentwood-1',
  title:'Brentwood route 1',
  scene:'brentwood-routes',
  briefing:'Brentwood route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:493.9,z:12.1,headingDeg:98},
  // Warley Hill, Kings Road past the station, the High Street lights (right), Wilson's Corner, Ingrave Road, Queen's
  // Road, Rose Valley, King Edward Road, Kings Road and back down Warley Hill into the test centre.
  through:pts([[556,-367],[578,-520],[458,-979],[611,-1037],[1000,-1195],[1051,-1103],[1111,-999],[956,-918],[758,-679],[799,-539],
    [738,-443],[587,-460],[556,-367],[520,10],[473,16]]),
  // On Queen's Road, in the car's lane: what it waits behind for the oncoming car.
  parked:[{x:862.8,z:-849.2,headingDeg:237.4,kind:'van',colour:'#f1f1ee'}],
  // Pulled in to the kerb on Rose Valley; and a little out from the left kerb at the end of King Edward Road, to turn
  // left without the car's middle cutting the corner (the road narrows where it meets Kings Road).
  shifts:[{from:p(772.2,-635.8),to:p(778.5,-614.8),left:.35},{from:p(581,-459.9),to:p(575.1,-460.5),left:-.6}],
  actors:[
    // Along the footway past the test centre's way out, from the left.
    {id:'tc-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',path:pts([[514.6,2],[514.6,40]])},
    {id:'tc-car',name:'silver car',colour:'#b8bcc2',speed:11,path:pts(TC_CAR)},
    // Waiting at the station crossing, east kerb, then across in front of the car.
    {id:'station-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[585.7,-519.4],[570.7,-521.6],[570.4,-532]])},
    {id:'weald-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(WEALD)},
    {id:'ingrave-car',name:'red car',colour:'#b91c1c',speed:8,path:pts(INGRAVE)},
    {id:'queens-car',name:'black car',colour:'#1f2328',speed:10,path:pts(QUEENS)},
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'kings-car',name:'grey car',colour:'#8a9099',speed:10,path:pts(KINGS)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, left on to Warley Hill',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(493.9,12.1),
      starts:[{actor:'tc-pedestrian',at:p(493.9,12.1),delay:0},{actor:'tc-car',at:p(506.8,14),delay:0}],
      endAt:p(517.8,8.1),
      // The way out, and Warley Hill to the right (south), where the silver car comes from.
      quiet:[{x:516,z:15,radius:26},{x:510,z:70,radius:34}],
      place:{
        footway:{pause:{kind:'stop',at:p(503.8,13.5)},when:{actor:'tc-pedestrian',at:p(514.6,12)},frame:{yaw:30,pitch:30},
          state:'Stopped short of the footway at the end of the way out.'},
        line:{pause:{kind:'stop',at:p(512.7,14.9)},when:{actor:'tc-car',at:p(514.8,40.4)},frame:{yaw:-75,pitch:32},
          state:'At the edge of Warley Hill.'},
        clear:{pause:{kind:'stop',at:p(512.7,14.9)},when:{actor:'tc-car',at:p(518.9,-16.1)},frame:{yaw:-60,pitch:32},
          state:'Still at the edge of Warley Hill.'}
      },
      stages:[
        {
          id:'footway',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior','look-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left','look-right'],any:true,fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Waiting was right, but look along the footway first so you know who you are waiting for.'}},
            {kind:'unsafe',id:'across-footway',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove across the footway in front of a pedestrian',
              message:'People on the footway have priority across a way out. The pedestrian was about to walk across in front of you: wait for them. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'serious',heading:'Use of horn',title:'Horn at a pedestrian',
              message:'Sounding the horn to hurry someone on the footway is aggressive and can startle them. Wait for them to pass.'}}
          ],
          accepted:[['look-left','give-way'],['look-left','look-right','give-way'],['look-right','look-left','give-way']],
          next:{wait:'line',go:'line'},
          explain:'Wait: the pedestrian walking along the footway from the left has priority across the way out.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','signal-left','signal-right','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: that is where the traffic you join comes from.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the drivers on Warley Hill know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning left: a right signal misleads everyone on Warley Hill.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car was a second or two away in the lane you were joining. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-left','give-way'],['signal-left','look-right','give-way'],['look-right','look-left','signal-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal left and wait: the silver car was close, coming up Warley Hill from the right in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be pulling out or stopped just up the road.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Warley Hill was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Warley Hill was clear.'
        }
      ]
    },
    {
      id:'station-crossing',
      title:'Pedestrian crossing',
      where:'Kings Road, the signal crossing by the station',
      instruction:'Follow the road ahead, please.',
      instructAt:p(560.5,-408.6),
      starts:[{actor:'station-pedestrian',at:p(560.5,-408.6),delay:0}],
      lights:p(576.1,-518),
      endAt:p(581.4,-552.5),
      quiet:[{x:578,z:-520,radius:30},{x:572,z:-470,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(570.7,-482.9)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the crossing at 25 mph.'},
        line:{pause:{kind:'stop',at:p(575.5,-513.5)},lights:'red',when:{actor:'station-pedestrian',at:p(578.2,-520.5)},frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(575.5,-513.5)},lights:'red',when:{actor:'station-pedestrian',at:p(570.6,-524)},frame:{yaw:0,pitch:30},
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
              message:'The lights were red with someone waiting to cross. Speeding up to get through would put them at risk.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the crossing was at red, with someone waiting to cross.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-right','look-left','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red and the pedestrian was crossing in front of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'serious',heading:'Use of horn',title:'Horn at a pedestrian',
              message:'Never sound the horn at someone crossing: it can startle them in the road.'}}
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
      id:'high-street-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Kings Road at the High Street lights, right into the High Street',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(483.5,-910.9),
      starts:[{actor:'weald-car',at:p(483.5,-910.9),delay:0}],
      lights:p(463.6,-965.1),
      endAt:p(479.5,-990.4),
      // The junction, and Weald Road, where the oncoming blue car comes from.
      // (And the Chatham Way mini-roundabout the blue car goes on through.)
      quiet:[{x:458,z:-979,radius:28},{x:440,z:-1018,radius:22},{x:488,z:-909,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(477.8,-924)},frame:{yaw:0,pitch:20},state:'Approaching the lights on green.'},
        centre:{pause:{kind:'stop',at:p(459.5,-974.7)},when:{actor:'weald-car',at:p(447,-1006.1)},frame:{yaw:10,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(459.5,-974.7)},when:{actor:'weald-car',at:p(476.5,-935.8)},frame:{yaw:10,pitch:32},
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
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A left signal at the lights tells everyone you are turning left into the High Street the other way.'}}
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
              message:'Green does not give you priority over oncoming traffic going ahead. The blue car was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:flash}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the blue car coming down Weald Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-right','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into the High Street',
              message:'Before you turn, look into the road you are turning into (on your left as you wait) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-left','go'],['look-right','look-left','go']],
          next:{go:'done'},
          explain:'Check the High Street is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'wilsons-corner',
      turn:'right',
      title:'Mini-roundabouts, right turn',
      where:'Wilson\'s Corner, right on to Ingrave Road',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(914.7,-1160.8),
      starts:[{actor:'ingrave-car',at:p(876,-1141.9),delay:0}],
      // (The crossings by Wilson's Corner: no one using them.)
      lights:p(969.4,-1187.4),lightsAll:true,
      endAt:p(1029.1,-1146.4),
      // Both mini-roundabouts and Ingrave Road, where the red car comes from.
      quiet:[{x:1004,z:-1204,radius:26},{x:1030,z:-1135,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(955.2,-1180.3)},frame:{yaw:0,pitch:20},state:'Approaching Wilson\'s Corner at 20 mph.'},
        line:{pause:{kind:'stop',at:p(991,-1194.3)},when:{actor:'ingrave-car',at:p(1002,-1181.1)},frame:{yaw:-30,pitch:34},
          state:'At the give way line of the first mini-roundabout.'},
        clear:{pause:{kind:'stop',at:p(991,-1194.3)},when:{actor:'ingrave-car',at:p(1011.2,-1216.8)},frame:{yaw:-10,pitch:36},
          state:'Still at the give way line.'}
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
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A left signal says you are turning left at the first exit: the cars waiting at Wilson\'s Corner would pull out expecting it.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for Ingrave Road.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming out of Ingrave Road, on your right, was about to cross your path. Give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car from Ingrave Road, on your right, was coming on to the mini-roundabout.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone round to the second mini-roundabout and nothing more was coming from the right: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the red car had gone by and nothing more was coming from the right.'
        }
      ]
    },
    {
      id:'queens-road-meeting',
      turn:'right',
      title:'Meeting traffic',
      where:'Queen\'s Road, a van parked on your side',
      instruction:'Follow the road ahead, please.',
      instructAt:p(980.4,-926.8),
      starts:[{actor:'queens-car',at:p(980.4,-926.8),delay:0}],
      endAt:p(825.6,-827.7),
      quiet:[{x:862,z:-850,radius:40},{x:800,z:-814,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(906.2,-877.8)},when:{actor:'queens-car',at:p(845.3,-843.2)},frame:{yaw:0,pitch:30},
          state:'Approaching the parked van at 25 mph.'},
        held:{pause:{kind:'stop',at:p(885.6,-863.5)},when:{actor:'queens-car',at:p(891.3,-871)},frame:{yaw:0,pitch:26},
          state:'Stopped behind the parked van.'}
      },
      stages:[
        {
          id:'approach',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','signal-right','flash-lights','give-way','go'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-waiting',action:'give-way',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down to wait.'}},
            {kind:'unsafe',id:'squeezed-past',action:'go',fault:{level:'dangerous',heading:'Judgement - meeting',title:'Tried to pass the van into the black car',
              message:'The van is on your side, so the black car coming towards you has priority. There was not room for both of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'A right signal behind a parked van can look like you are turning right. It is not needed to wait or to pass.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'serious',heading:'Response to signals - other road users',title:'Flashed headlights at the oncoming car',
              message:'Flashing your headlights means only "I am here". The black car\'s driver could take it as an invitation and come on while you pull out round the van.'}}
          ],
          accepted:[['mirror-interior','give-way'],['mirror-interior','mirror-right','give-way']],
          next:{wait:'held',go:'held'},
          explain:'Interior mirror, then hold back behind the van: it is on your side, so the black car coming towards you goes first.'
        },
        {
          id:'held',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','signal-right','give-way','go'],
          neutral:['mirror-interior','signal-right'],
          rules:[
            {kind:'required',id:'mirror-before-passing',anyOf:['mirror-right'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No right mirror before pulling out',
              message:'Check the right mirror before you move out round the van: a cyclist or motorcyclist may be coming past.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe chance to pass',
              message:'The black car had gone by and the road ahead was clear: this was the time to pass the van.'}}
          ],
          accepted:[['mirror-right','go'],['mirror-interior','mirror-right','go']],
          next:{go:'done'},
          explain:'Right mirror, then pass the van, giving it plenty of room: the black car had gone by.'
        }
      ]
    },
    {
      id:'rose-valley-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Rose Valley, past The Close',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(753.1,-758.5),
      starts:[],
      endAt:p(777.9,-616.7),
      selfCancel:false,
      quiet:[{x:770,z:-650,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(757,-693.8)},frame:{yaw:20,pitch:28},state:'On Rose Valley at 20 mph, The Close just ahead on the left.'},
        stopped:{pause:{kind:'stop',at:p(777.9,-616.7)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','signal-left','signal-right','stop-at-junction','stop-past-junction'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal to pull in',
              message:'Signal left before you pull in, after the mirrors, so the traffic behind knows.'}},
            {kind:'required',id:'place',anyOf:['stop-past-junction'],fault:{level:'serious',heading:'Normal stops',title:'No safe place chosen',
              message:'Choose where to stop before you pull in: past The Close, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of The Close could not see past you, and those turning in would have to swing out.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right or pulling out: to pull in on the left, signal left.'}},
            {kind:'before',id:'signal-junction',action:'signal-left',needs:['stop-past-junction','stop-at-junction'],any:true,fault:{level:'minor',heading:'Signals - timed',title:'Signal could be misread',
              message:'With The Close just ahead on the left, a left signal given now looks like a turn into it. Choose your place first, then signal once past the junction.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place past The Close, clear of the junction; then mirrors and signal left once past it, so the signal is not read as a turn.'
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
              message:'Cancel the signal once you have stopped: left on, it says you are about to pull out or turn.'}},
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
      id:'rose-valley-move-off',
      turn:'right',
      title:'Moving off',
      where:'Rose Valley, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(777.9,-616.7),
      // (Out of The Close as the car passes it, coming to pull up.)
      starts:[{actor:'cyclist',at:p(760.8,-674.2),delay:0}],
      endAt:p(790.7,-573.6),
      quiet:[{x:778,z:-617,radius:40}],
      place:{
        check:{pause:{kind:'stop',at:p(777.9,-616.7)},when:{actor:'cyclist',at:p(770.8,-638.6)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(777.9,-616.7)},when:{actor:'cyclist',at:p(782.3,-601)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist was coming past, just behind your right shoulder. The examiner had to stop the car.'}},
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
              message:'The cyclist had gone by and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'king-edward-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'King Edward Road, left on to Kings Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(635,-454.8),
      starts:[{actor:'kings-car',at:p(672.8,-433.5),delay:0}],
      // (The station crossing the grey car comes through: no one using it.)
      lights:p(580,-523),lightsAll:true,
      endAt:p(568.3,-444.6),
      quiet:[{x:572,z:-462,radius:24},{x:578,z:-505,radius:26},{x:564,z:-428,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(596,-459.2)},frame:{yaw:0,pitch:22},state:'Approaching the end of King Edward Road at 15 mph.'},
        line:{pause:{kind:'stop',at:p(575.1,-460.5)},when:{actor:'kings-car',at:p(573.4,-478.4)},frame:{yaw:-75,pitch:34},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(575.1,-460.5)},when:{actor:'kings-car',at:p(567.8,-440.7)},frame:{yaw:-60,pitch:34},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach so the traffic on Kings Road knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal tells the drivers on Kings Road you are turning right, across their way.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left, keeping to the left side of King Edward Road.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: that is where the traffic in the lane you join comes from.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the grey car',
              message:'The grey car coming down Kings Road from the right was too close to pull out in front of. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the grey car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the grey car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the grey car coming down Kings Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the grey car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: something may be overtaking a parked car on your side of Kings Road, coming towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Kings Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go, keeping to the left: Kings Road was clear.'
        }
      ]
    }
  ]
},BEFORE));
