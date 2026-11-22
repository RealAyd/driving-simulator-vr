import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EMERGE_CAR,LEAVE_CAR,ONCOMING_CAR,RING_CAR} from './prestonRoute1Paths';

/**
 * Preston, Pedders Lane and Blackpool Road: eight challenges from the test centre on Chain Caul Road, Preston: right out
 * of Hardy Close, the test centre's way out, on to Chain Caul Way, the first exit at the Navigation Way roundabout, right
 * from Pedders Lane into Egerton Road, left out of Egerton Road on to Tulketh Road, left at the Tulketh Road lights on
 * to Blackpool Road, ahead over the signal crossing on Blackpool Road, and pulling up and moving off on Larches Avenue;
 * back by Larches Lane, Whinfield Lane, Pedders Lane, the roundabout and Chain Caul Way. Chosen from the map and the
 * published evidence (content/packs/preston/ROUTES.md). Scene preston-route-1 (OpenStreetMap). A practice route, not a
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
 * the hazard is in view only at the line, or the moment is set by where the car waits. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the roundabout's island and the bend of Navigation Way hide the traffic coming round until there.)
  'navigation-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(10.5,347.8)},when:{actor:'ring-car',at:p(35.6,357.9)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Navigation Way roundabout.'}},
  // (In the road: the oncoming car, not the map, sets when the car gets there.)
  'egerton-turn':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(63.9,-26.3)},when:{actor:'oncoming-car',at:p(64.3,-59.2)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting on Pedders Lane to turn right into Egerton Road.'}},
  // (At the line: the houses on the corner hide Tulketh Road, round its bend, until there.)
  'egerton-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(722.4,-34)},when:{actor:'emerge-car',at:p(748,-29.8)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Egerton Road.'}},
  'tulketh-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(310.6,-462.8)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Blackpool Road lights. They are red.'}},
  'blackpool-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-267.5,-506.5)},lights:'red',when:{actor:'blackpool-pedestrian',at:p(-300.25,-504)},frame:{yaw:0,pitch:52,shift:-6},
    state:'Approaching the crossing on Blackpool Road. The lights are red.'}}
};

export const PRESTON_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'preston-1',
  title:'Preston: Pedders Lane and Blackpool Road',
  scene:'preston-route-1',
  briefing:'Preston, Pedders Lane and Blackpool Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-701.42,z:450.02,headingDeg:324.39},
  // Hardy Close, Chain Caul Way, Navigation Way and its roundabout, Pedders Way, the A583 lights, Pedders Lane, Egerton
  // Road, Tulketh Road, Blackpool Road west, Larches Avenue, Larches Lane, Whinfield Lane, Pedders Lane
  // south, the lights and the roundabout again, Navigation Way and Chain Caul Way back towards the test centre.
  through:pts([[-447,380],[-94,261],[-30,356],[30,270],[70,70],[370,-25],[650,-31],[715,-48],[519,-252],[372,-399],[30,-462],
    [-340,-498],[-570,-453],[-650,-230],[-662,-93],[-540,-8],[-428,124],[-170,85],[65,140],[30,280],[-30,356],[-94,261],[-447,380],[-610,356]]),
  // Pulled in to the kerb on Larches Avenue (no cars parked along this stretch: room for the cyclist to pass).
  shifts:[{from:p(-653.3,-176.5),to:p(-659,-117),left:.8},
    // (Wide round the tight corner into Larches Lane: the wheels clear its kerb.)
    {from:p(-662.4,-34),to:p(-649.4,-27.6),left:-.8}],
  actors:[
    {id:'leave-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(LEAVE_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:8,path:pts(RING_CAR)},
    {id:'oncoming-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(ONCOMING_CAR)},
    {id:'emerge-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(EMERGE_CAR)},
    // On the crossing on Blackpool Road, from the central reserve across the car's lane, on the red.
    {id:'blackpool-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-300.3,-505.6],[-300.1,-498.6],[-303,-498.3]])},
    // Down Larches Avenue from behind the car at the kerb, past it, and on towards Larches Lane.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'Hardy Close, the test centre\'s way out, right on to Chain Caul Way',
      instruction:'When you\'re ready, drive out of the test centre and turn right, please.',
      instructAt:p(-701.4,450),
      // (Set going as the car moves off, so it comes along Chain Caul Way as the car reaches the line.)
      starts:[{actor:'leave-car',at:p(-701.4,450),delay:0}],
      endAt:p(-680.3,379.6),
      // The way out, Chain Caul Way to the right, where the white car comes from, and to the left, where it goes.
      quiet:[{x:-723,z:415,radius:16},{x:-698,z:396,radius:20},{x:-662,z:373,radius:24},{x:-752,z:433,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(-721.9,421.5)},when:{actor:'leave-car',at:p(-703.9,400.4)},frame:{yaw:-60,pitch:32},
          state:'At the end of Hardy Close, at the edge of Chain Caul Way.'},
        clear:{pause:{kind:'stop',at:p(-721.9,421.5)},when:{actor:'leave-car',at:p(-751,433.4)},frame:{yaw:-20,pitch:32},
          state:'Still at the edge of Chain Caul Way.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic on Chain Caul Way coming from the right is in the lane you cross.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Chain Caul Way know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Chain Caul Way from the right was close, in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal right and wait: the white car coming from the right was close, in the lane you cross.'
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
              message:'The white car had gone by and Chain Caul Way was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Chain Caul Way was clear.'
        }
      ]
    },
    {
      id:'navigation-roundabout',
      turn:'left',
      title:'Roundabout, left turn',
      where:'Navigation Way at the Navigation Way roundabout, first exit on to Pedders Way',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(-44,356.7),
      // (Set going as the car comes to the end of Chain Caul Way, so it comes round whatever held the car up there.)
      starts:[{actor:'ring-car',at:p(-61.7,335),delay:0}],
      endAt:p(25.6,298.6),
      // The entry, the roundabout's south side, where the black car comes round from Mariners Way, Mariners Way, and
      // the exit on to Pedders Way.
      quiet:[{x:10,z:348,radius:14},{x:31,z:360,radius:14},{x:56,z:346,radius:18},{x:26,z:312,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(-11.9,352.1)},frame:{yaw:0,pitch:22},state:'Approaching the Navigation Way roundabout.'},
        line:{pause:{kind:'stop',at:p(10.5,347.8)},when:{actor:'ring-car',at:p(35.6,357.9)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(10.5,347.8)},when:{actor:'ring-car',at:p(25.6,301.5)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so everyone at the roundabout knows you are leaving at Pedders Way.'}},
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
              message:'The black car coming round the roundabout from Mariners Way, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Mariners Way, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone off up Pedders Way and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone off up Pedders Way.'
        }
      ]
    },
    {
      id:'egerton-turn',
      turn:'right',
      title:'Right turn across oncoming traffic',
      where:'Pedders Lane, right into Egerton Road',
      instruction:'Take the next road on the right, please.',
      instructAt:p(71.1,68.6),
      // (Set going as the car comes up Pedders Lane, so it is there whatever held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(71.1,68.6),delay:0}],
      endAt:p(94.5,-38.8),
      // The junction, Pedders Lane to the north, where the grey car comes from, and Egerton Road.
      quiet:[{x:64,z:-36,radius:20},{x:62,z:-75,radius:26},{x:92,z:-39,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(67.8,12.3)},frame:{yaw:0,pitch:20},state:'On Pedders Lane at 30 mph.'},
        centre:{pause:{kind:'stop',at:p(63.9,-26.3)},when:{actor:'oncoming-car',at:p(64.3,-59.2)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Egerton Road.'},
        clear:{pause:{kind:'stop',at:p(63.9,-26.3)},when:{actor:'oncoming-car',at:p(70.6,8.7)},frame:{yaw:40,pitch:32},
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
              message:'The grey car coming down Pedders Lane towards you was a few seconds away, and turning right you give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the grey car coming down Pedders Lane towards you has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Egerton Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing its mouth.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and nothing more was coming: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Egerton Road is clear to turn into, then go: the grey car had gone by.'
        }
      ]
    },
    {
      id:'egerton-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Egerton Road, left on to Tulketh Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(616.8,-22.9),
      // (Set going as the car comes along Egerton Road, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'emerge-car',at:p(616.8,-22.9),delay:0}],
      endAt:p(694.3,-68.9),
      // The junction, Tulketh Road to the right, where the blue car comes from, and to the left, where it goes.
      quiet:[{x:727,z:-38,radius:20},{x:752,z:-29,radius:24},{x:692,z:-72,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(688.5,-22.8)},frame:{yaw:0,pitch:22},state:'Approaching the end of Egerton Road at 30 mph.'},
        line:{pause:{kind:'stop',at:p(722.4,-34)},when:{actor:'emerge-car',at:p(748,-29.8)},frame:{yaw:-70,pitch:26},state:'At the end of Egerton Road.'},
        clear:{pause:{kind:'stop',at:p(722.4,-34)},when:{actor:'emerge-car',at:p(690.4,-73.2)},frame:{yaw:-30,pitch:26},state:'Still at the end of Egerton Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Tulketh Road knows where you are going.'}},
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
              message:'Look right first: turning left, you join the near lane of Tulketh Road, and its traffic comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming along Tulketh Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming along Tulketh Road from the right was close, in the lane you join.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be overtaking towards you, or crossing the end of Egerton Road on foot.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Tulketh Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Tulketh Road was clear.'
        }
      ]
    },
    {
      id:'tulketh-lights',
      turn:'left',
      title:'Traffic lights, left turn',
      where:'Tulketh Road at the Blackpool Road lights, left on to Blackpool Road',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(341.1,-430.3),
      starts:[],
      lights:p(283.4,-495.7),
      endAt:p(254.8,-488),
      // The junction, and Blackpool Road to the west, where the car goes.
      quiet:[{x:283,z:-494,radius:30},{x:252,z:-487,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(310.6,-462.8)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the lights at 30 mph.'},
        line:{pause:{kind:'stop',at:p(290.4,-484.5)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(290.4,-484.5)},lights:'red',frame:{yaw:-30,pitch:28},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','slow-down','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the lights, so the drivers behind know you are turning on to Blackpool Road.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic on Blackpool Road at risk.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left','slow-down'],['mirror-left','mirror-interior','signal-left','slow-down']],
          next:{then:'line'},
          explain:'Interior and left mirrors, signal left, then slow down: the lights were red.'
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
          buttons:['look-right','look-left','mirror-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior','look-left'],
          rules:[
            {kind:'required',id:'check-junction',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before going',
              message:'Green means go only if the way is clear. Look right along Blackpool Road for anyone late through the lights before you turn.'}},
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: a cyclist may have come up beside you while you waited.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the junction was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','mirror-left','go'],['mirror-left','look-right','go'],['look-right','look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Look right along Blackpool Road and check the left mirror, then go: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'blackpool-crossing',
      title:'Pedestrian crossing at the traffic lights',
      where:'Blackpool Road, the signal crossing by Broadway',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-214.2,-504.9),
      // (Set going as the car comes up to the crossing, so they are on it as the car arrives, whatever held it up.)
      starts:[{actor:'blackpool-pedestrian',at:p(-214.2,-504.9),delay:0}],
      lights:p(-297.1,-507),
      endAt:p(-318.8,-500.4),
      // The crossing and the approach to it.
      quiet:[{x:-300,z:-502,radius:22},{x:-272,z:-506,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-267.5,-506.5)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the crossing at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-292.4,-502.2)},lights:'red',when:{actor:'blackpool-pedestrian',at:p(-300.25,-504)},frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(-292.4,-502.2)},lights:'red',when:{actor:'blackpool-pedestrian',at:p(-300.1,-498.6)},frame:{yaw:0,pitch:30},
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
      id:'larches-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Larches Avenue, north of Larches Lane',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-651.9,-188.4),
      // (The cyclist is set going by the move-off, once the car is stopped: set going here, it would catch the car up
      // and pass it before it stopped, whenever traffic held the car up on Larches Avenue.)
      starts:[],
      endAt:p(-659,-117),
      selfCancel:false,
      // The pull-up, and the mouth of Larches Lane ahead.
      quiet:[{x:-659,z:-117,radius:34},{x:-664,z:-30,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-653.3,-176.5)},frame:{yaw:-15,pitch:28},state:'On Larches Avenue at 20 mph.'},
        stopped:{pause:{kind:'stop',at:p(-659,-117)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight, clear of the side roads and of the cars parked further down.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Larches Lane could not see past you.'}},
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
      id:'larches-move-off',
      turn:'right',
      title:'Moving off',
      where:'Larches Avenue, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-659,-117),
      // (Set going as the car stops at the kerb, 60 m behind it.)
      starts:[{actor:'cyclist',at:p(-659,-117),delay:0}],
      endAt:p(-660.9,-69),
      quiet:[{x:-659,z:-117,radius:40},{x:-664,z:-30,radius:18}],
      place:{
        check:{pause:{kind:'stop',at:p(-659,-117)},when:{actor:'cyclist',at:p(-659.4,-133)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-659,-117)},when:{actor:'cyclist',at:p(-660.5,-98)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on down Larches Avenue, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    }
  ]
},BEFORE));
