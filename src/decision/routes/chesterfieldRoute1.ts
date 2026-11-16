import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EMERGE_CAR,LEAVE_CAR,NEWBOLD_CAR,ONCOMING_CAR,RING_CAR} from './chesterfieldRoute1Paths';

/**
 * Chesterfield, Highfield Lane and Tapton View Road: eight challenges from the test centre at the bus garage on Approach
 * Road, Stonegravels: left out of Approach Road on to Sheffield Road, the first exit at the Sheffield Road roundabout
 * into Peveril Road, ahead over the signal crossing on Highfield Lane, left at the Newbold Road mini-roundabout, pulling
 * up and moving off on Tapton View Road, right out of Tapton View Road on to Sheffield Road, and right into the test
 * centre. Chosen from the map and the published evidence (content/packs/chesterfield/ROUTES.md).
 * Scene chesterfield-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
  // (At the line: the buildings on the corner hide Lockoford Lane until there.)
  'sheffield-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(333.6,-203.8)},when:{actor:'ring-car',at:p(351.1,-216.4)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Sheffield Road roundabout.'}},
  'highfield-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-220.3,-339.4)},lights:'red',when:{actor:'highfield-pedestrian',at:p(-259.86,-328.19)},frame:{yaw:0,pitch:52,shift:-6},
    state:'Approaching the crossing on Highfield Lane. The lights are red.'}},
  // (At the line: the corner hides Newbold Road until there.)
  'newbold-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-844.6,-278.1)},when:{actor:'newbold-car',at:p(-867.6,-287)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}},
  // (At the line: the houses on the corner hide Sheffield Road until there.)
  'tapton-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(436.8,45.3)},when:{actor:'emerge-car',at:p(449.9,65.7)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Tapton View Road.'}},
  // (In the road: the queue on Sheffield Road, not the map, sets when the car gets there.)
  'approach-turn':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(501.1,453.9)},when:{actor:'oncoming-car',at:p(486.5,492.9)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting in the road to turn right into Approach Road.'}}
};

export const CHESTERFIELD_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'chesterfield-1',
  title:'Chesterfield: Highfield Lane and Tapton View Road',
  scene:'chesterfield-route-1',
  briefing:'Chesterfield, Highfield Lane and Tapton View Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:405,z:456.4,headingDeg:86},
  // Approach Road, Sheffield Road, the Sheffield Road roundabout, Peveril Road, Highfield Lane, Newbold Road, Tapton View
  // Road, Sheffield Road and back into Approach Road.
  through:pts([[400,-69],[170,-310],[-130,-380],[-380,-295],[-780,-262],[-778,15],[-513,347],[-395,352],[150,100],[500,240],[445,455]]),
  // Pulled in to the kerb on Tapton View Road (no cars parked along it: room for the cyclist to pass).
  shifts:[{from:p(-98.6,136.3),to:p(-69,131.3),left:.4}],
  actors:[
    {id:'leave-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(LEAVE_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    // On the crossing on Highfield Lane, from the far (north) kerb across the car's lane, on the red.
    {id:'highfield-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-260.4,-329.7],[-257.6,-321.9],[-260.4,-320.9]])},
    {id:'newbold-car',name:'green car',colour:'#15803d',speed:9,path:pts(NEWBOLD_CAR)},
    // Behind the car along Tapton View Road, past it at the kerb, and left into Highfield View Road.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'emerge-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(EMERGE_CAR)},
    {id:'oncoming-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(ONCOMING_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'Approach Road, left on to Sheffield Road',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(405,456.4),
      // (Set going as the car comes to the line, so it is there as the car stops.)
      starts:[{actor:'leave-car',at:p(471.7,455.7),delay:0}],
      endAt:p(502,438.7),
      // The way out, Sheffield Road to the right, where the white car comes from, and to the left.
      quiet:[{x:495,z:461,radius:22},{x:480,z:510,radius:30},{x:505,z:425,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(490.9,459.2)},when:{actor:'leave-car',at:p(488.3,487.3)},frame:{yaw:-70,pitch:32},
          state:'At the end of Approach Road, at the edge of Sheffield Road.'},
        clear:{pause:{kind:'stop',at:p(490.9,459.2)},when:{actor:'leave-car',at:p(504,429.9)},frame:{yaw:-20,pitch:32},
          state:'Still at the edge of Sheffield Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','signal-left','signal-right','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning left, you join the near lane of Sheffield Road, and its traffic comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the drivers on Sheffield Road know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming up Sheffield Road from the right was a few seconds away in the lane you were joining. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-left','give-way'],['signal-left','look-right','give-way'],['look-right','look-left','signal-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal left and wait: the white car coming up Sheffield Road from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be overtaking towards you, or coming out of Old Sycamore Place.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and Sheffield Road was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Sheffield Road was clear.'
        }
      ]
    },
    {
      id:'sheffield-roundabout',
      turn:'left',
      title:'Roundabout, left turn',
      where:'Sheffield Road at the Sheffield Road roundabout, first exit into Peveril Road',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(357.7,-146.1),
      // (Set going as the car comes to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(337.4,-189.5),delay:0}],
      endAt:p(298.9,-226.5),
      // The roundabout's ring (clear of Peveril Road's own entry, where a car waiting its turn is no part of this),
      // Lockoford Lane, where the black car comes from, and Sheffield Road north, where it leaves.
      quiet:[{x:348,z:-226,radius:16},{x:378,z:-235,radius:22},{x:340,z:-262,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(343,-177.8)},frame:{yaw:0,pitch:22},state:'Approaching the Sheffield Road roundabout.'},
        line:{pause:{kind:'stop',at:p(333.6,-203.8)},when:{actor:'ring-car',at:p(351.1,-216.4)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(333.6,-203.8)},when:{actor:'ring-car',at:p(333.8,-247.5)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so everyone at the roundabout knows you are leaving at Peveril Road.'}},
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
              message:'The black car coming round the roundabout from Lockoford Lane, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Lockoford Lane, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Sheffield Road north and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round.'
        }
      ]
    },
    {
      id:'highfield-crossing',
      title:'Pedestrian crossing at the traffic lights',
      where:'Highfield Lane, the signal crossing west of Peveril Road',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-198.2,-351.1),
      // (Set going as the car comes up to the crossing, so they are on it as the car arrives, whatever held it up.)
      starts:[{actor:'highfield-pedestrian',at:p(-202.6,-348.7),delay:0}],
      lights:p(-254.9,-325.5),
      endAt:p(-281,-316.2),
      // The crossing, the approach to it, and the short branch of Highfield Lane just past it.
      quiet:[{x:-257,z:-325,radius:26},{x:-230,z:-336,radius:20},{x:-271,z:-321,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(-211.4,-344)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the crossing at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-250.4,-327.1)},lights:'red',when:{actor:'highfield-pedestrian',at:p(-259.86,-328.19)},frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(-250.4,-327.1)},lights:'red',when:{actor:'highfield-pedestrian',at:p(-257.6,-321.9)},frame:{yaw:0,pitch:30},
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
      id:'newbold-mini',
      turn:'left',
      title:'Mini-roundabout, left turn',
      where:'Highfield Lane at the Newbold Road mini-roundabout, left into Newbold Road',
      instruction:'At the mini-roundabout, turn left, please.',
      instructAt:p(-784.9,-267.7),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'newbold-car',at:p(-827.7,-279.7),delay:0}],
      endAt:p(-850.5,-239.4),
      // (And the mouth of Tapton View Road kept quiet until the car has turned into it: in traffic, a car waiting there
      // to come out was 0.2 m from the car turning in.)
      quietUntil:p(-415.4,395.1),
      // The mini-roundabout, Newbold Road to the right, where the green car comes from, and Newbold Road to the left,
      // where it goes; the mouth of Tapton View Road.
      quiet:[{x:-858,z:-275,radius:22},{x:-885,z:-305,radius:28},{x:-850,z:-240,radius:22},{x:-428,z:418,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-813.2,-277.7)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-844.6,-278.1)},when:{actor:'newbold-car',at:p(-867.6,-287)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-844.6,-278.1)},when:{actor:'newbold-car',at:p(-851.1,-241.2)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so everyone at the mini-roundabout knows you are turning into Newbold Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the green car was coming down Newbold Road, on your right.'}}
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
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming down Newbold Road, on your right, was at the mini-roundabout, going ahead across your way into the road you were turning into. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming down Newbold Road, on your right, was there first, going ahead in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went across. Look right again, up Newbold Road, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone on down Newbold Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the green car had gone.'
        }
      ]
    },
    {
      id:'tapton-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Tapton View Road, past Gloucester Avenue',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-147.9,144.8),
      starts:[{actor:'cyclist',at:p(-147.9,144.8),delay:0}],
      endAt:p(-69,131.3),
      selfCancel:false,
      // The pull-up, and Gloucester Avenue on the way to it.
      quiet:[{x:-69,z:131,radius:34},{x:-164,z:149,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(-108.4,138.2)},frame:{yaw:-15,pitch:28},state:'On Tapton View Road at 30 mph.'},
        stopped:{pause:{kind:'stop',at:p(-69,131.3)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past Gloucester Avenue, clear of the junctions.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Gloucester Avenue could not see past you.'}},
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
      id:'tapton-move-off',
      turn:'right',
      title:'Moving off',
      where:'Tapton View Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-69,131.3),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(-147.9,144.8),delay:0}],
      endAt:p(0.3,122.5),
      quiet:[{x:-69,z:131,radius:50},{x:58,z:112,radius:18}],
      place:{
        check:{pause:{kind:'stop',at:p(-69,131.3)},when:{actor:'cyclist',at:p(-84.1,135.8)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-69,131.3)},when:{actor:'cyclist',at:p(-40.3,126.4)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on towards Highfield View Road, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'tapton-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Tapton View Road, right on to Sheffield Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(362.9,66.6),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'emerge-car',at:p(420.5,49.9),delay:0}],
      endAt:p(455,72),
      // The junction, Sheffield Road to the right, where the blue car comes from, with Rugby Drive and Stonegravels Lane
      // on its way, and Sheffield Road to the left.
      quiet:[{x:446,z:46,radius:22},{x:462,z:100,radius:30},{x:471,z:140,radius:12},{x:478,z:169,radius:12},{x:432,z:10,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(406,53.8)},frame:{yaw:0,pitch:22},state:'Approaching the end of Tapton View Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(436.8,45.3)},when:{actor:'emerge-car',at:p(449.9,65.7)},frame:{yaw:-70,pitch:26},state:'At the end of Tapton View Road.'},
        clear:{pause:{kind:'stop',at:p(436.8,45.3)},when:{actor:'emerge-car',at:p(432.6,9.2)},frame:{yaw:-10,pitch:26},state:'Still at the end of Tapton View Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Sheffield Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Sheffield Road, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming up Sheffield Road from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming up Sheffield Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: turning right, you join the far lane, and its traffic comes from the left, down Sheffield Road.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Sheffield Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Sheffield Road was clear.'
        }
      ]
    },
    {
      id:'approach-turn',
      turn:'right',
      title:'Right turn into the test centre',
      where:'Sheffield Road, right into Approach Road',
      instruction:'Turn right into the test centre, please.',
      instructAt:p(522.7,353.2),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(506.9,431.6),delay:0}],
      endAt:p(483.7,460.3),
      // The mouth of Approach Road, Sheffield Road to the south, where the grey car comes from, and Old Sycamore Place
      // opposite.
      quiet:[{x:497,z:458,radius:22},{x:478,z:520,radius:34},{x:505,z:431,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(511.1,412.1)},frame:{yaw:0,pitch:20},state:'On Sheffield Road at 30 mph, nearing Approach Road.'},
        centre:{pause:{kind:'stop',at:p(501.1,453.9)},when:{actor:'oncoming-car',at:p(486.5,492.9)},frame:{yaw:0,pitch:32},
          state:'Waiting in the road to turn right.'},
        clear:{pause:{kind:'stop',at:p(501.1,453.9)},when:{actor:'oncoming-car',at:p(502.7,435.7)},frame:{yaw:30,pitch:32},
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
              message:'The grey car coming up Sheffield Road towards you had priority and was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the grey car coming up Sheffield Road towards you has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Approach Road',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be walking across it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Approach Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
