import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,GATE_CAR,MINI_CAR,RING_CAR,SANDON_CAR,SHELLEY_CAR} from './granthamRoute1Paths';

/**
 * Grantham (Somerby) route 1, Somerby Hill, Harrowby Road and Harrowby Lane: eight challenges from the test centre at
 * Spitalgate Airfield (the airfield site's way out on to Somerby Hill, the A52), right on to Somerby Hill, pulling up
 * and moving off on the hill, Bridge End Road and Harrowby Road, right at the Sandon Road lights into Beacon Lane, New
 * Beacon Road and right at the Harrowby Lane mini-roundabout into Uplands Drive, Tennyson Avenue and Shelley Avenue,
 * left on to Harrowby Lane, back by New Beacon Road, Beacon Lane and the lights down Harrowby Road over its zebra,
 * Somerby Hill to the Somerby Hill roundabout, all the way round it, and back to the test centre. Chosen from the map and
 * the published evidence (content/packs/grantham-somerby/ROUTES.md). Scene grantham-somerby-route-1 (OpenStreetMap).
 * A practice route, not a confirmed test route.
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
  // (At the line: the hedge along Somerby Hill hides the road to the right until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(67.9,1022.8)},when:{actor:'gate-car',at:p(18.1,1017.7)},frame:{yaw:-70,pitch:36,shift:-4},
    state:'At the end of the test centre\'s way out.'}},
  // (Decided in the junction, stopped: traffic could hold the car short of it.)
  'sandon-lights':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(-1363.3,-478)},when:{actor:'sandon-car',at:p(-1361.7,-519)},frame:{yaw:0,pitch:34,shift:-4},
    state:'Waiting in the junction to turn right. The lights are green.'}},
  // (At the line: the New Beacon Road signal crossing just before it can hold the car.)
  'harrowby-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-727.2,-1282.1)},when:{actor:'mini-car',at:p(-708.6,-1292.1)},frame:{yaw:-50,pitch:36,shift:-4},
    state:'At the give way line of the mini-roundabout.'}},
  // (At the line: the houses on the corner hide Harrowby Lane until there.)
  'shelley-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-449,-1335.7)},when:{actor:'shelley-car',at:p(-413.7,-1346.9)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Shelley Avenue.'}},
  'harrowby-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(-1246.8,163.4)},when:{actor:'zebra-pedestrian',at:p(-1242.6,193)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Harrowby Road, the zebra crossing just ahead.'}},
  // (At the line: the blue car is in view coming round only from there.)
  'somerby-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(1325.3,1292.4)},when:{actor:'ring-car',at:p(1322.1,1317.3)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Somerby Hill roundabout.'}}
};

export const GRANTHAM_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'grantham-somerby-1',
  title:'Grantham (Somerby) route 1',
  scene:'grantham-somerby-route-1',
  briefing:'Grantham (Somerby) route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:55.1,z:840,headingDeg:178},
  // The airfield site's road and way out, Somerby Hill, Bridge End Road, Harrowby Road, Beacon Lane, New Beacon Road, the
  // mini-roundabout, Uplands Drive, Tennyson Avenue, Shelley Avenue, Harrowby Lane, back by New Beacon Road, Beacon Lane
  // and Harrowby Road, Somerby Hill, round the Somerby Hill roundabout, and back in by the site's way in.
  through:pts([[65,985],[-400,835],[-813.5,637.3],[-1210,384],[-1235,300],[-1300,-50],[-1380,-400],[-1250,-490],[-1090,-550],[-1020,-838],[-974.6,-917],
    [-841,-1125],[-800,-1185],[-620,-1125],[-400,-1087],[-420,-1223],[-600,-1307],[-800,-1185],[-1020,-838],[-1090,-550],[-1250,-490],[-1380,-400],
    [-1300,-50],[-1250,120],[-1235,300],[-1190,387],[-813.5,637.3],[-400,835],[850,1190],[59,1000],[55,880]]),
  // Pulled in to the kerb on Somerby Hill, past Somerby Grove (no cars parked along it: room for the cyclist to pass).
  shifts:[{from:p(-805.4,642.5),to:p(-828.3,632.3),left:.35}],
  actors:[
    {id:'gate-car',name:'red car',colour:'#b91c1c',speed:14,path:pts(GATE_CAR)},
    // Behind the car down Somerby Hill, past it at the kerb, and left into Bridge End Grove.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'sandon-car',name:'silver car',colour:'#c3c7cf',speed:10,path:pts(SANDON_CAR)},
    {id:'mini-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(MINI_CAR.slice(102))},
    {id:'shelley-car',name:'black car',colour:'#1f2328',speed:10,path:pts(SHELLEY_CAR)},
    // Waiting at the Harrowby Road zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-1240.3,192.8],[-1249.5,193.8]])},
    {id:'ring-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(RING_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre, emerging right',
      where:'Out of the test centre, right on to Somerby Hill (A52, 50 mph)',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(55.1,840),
      starts:[{actor:'gate-car',at:p(55.1,840),delay:0}],
      endAt:p(-0.2,1017.8),
      // The way out's mouth, Somerby Hill to the right (west), where the red car comes from, and to the east, where it goes.
      quiet:[{x:65,z:1027,radius:28},{x:-60,z:1005,radius:45},{x:110,z:1036,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(57.3,899.8)},frame:{yaw:0,pitch:22},state:'Driving out of the test centre.'},
        line:{pause:{kind:'stop',at:p(67.9,1022.8)},when:{actor:'gate-car',at:p(18.1,1017.7)},frame:{yaw:-70,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(67.9,1022.8)},when:{actor:'gate-car',at:p(101.4,1034.5)},frame:{yaw:-10,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right as you come to the end of the way out, so the traffic on Somerby Hill knows where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Somerby Hill comes from the right, at up to 50 mph.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming up Somerby Hill from the right was close and fast, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming up Somerby Hill from the right was close, and on a 50 mph road it closes the gap fast.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming down Somerby Hill before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Somerby Hill was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Somerby Hill was clear both ways.'
        }
      ]
    },
    {
      id:'somerby-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Somerby Hill, past Somerby Grove',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-696.4,671.9),
      starts:[{actor:'cyclist',at:p(-807.2,642.1),delay:0}],
      endAt:p(-828.2,632.7),
      selfCancel:false,
      quiet:[{x:-828,z:633,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-807.2,642.1)},frame:{yaw:-15,pitch:28},state:'On Somerby Hill at 20 mph, past Somerby Grove.'},
        stopped:{pause:{kind:'stop',at:p(-828.2,632.7)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb, on the hill.'}
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
              message:'Choose where to stop before you pull in: past Somerby Grove, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Somerby Grove could not see past you, and those turning in would meet you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place past Somerby Grove; mirrors, then signal left.'
        },
        {
          id:'stopped',safe:'approach',
          buttons:['handbrake','neutral','signal-off','hazards','horn'],
          rules:[
            {kind:'required',id:'handbrake',anyOf:['handbrake'],fault:{level:'minor',heading:'Control - parking brake',title:'Handbrake not on',
              message:'Put the handbrake on when you stop: on a hill the car must not roll.'}},
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
      id:'somerby-move-off',
      turn:'right',
      title:'Moving off',
      where:'Somerby Hill, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-828.2,632.7),
      // (Down Somerby Hill behind the car as it comes to pull up.)
      starts:[{actor:'cyclist',at:p(-807.2,642.1),delay:0}],
      endAt:p(-885.9,602.8),
      // (Kept clear until the cyclist is well into Bridge End Grove: traffic coming out of it would meet the cyclist.)
      quietUntil:p(-926.8,579.5),
      quiet:[{x:-828,z:633,radius:50},{x:-898,z:622,radius:28}],
      place:{
        check:{pause:{kind:'stop',at:p(-828.2,632.7)},when:{actor:'cyclist',at:p(-816.8,635.9)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb on the hill, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-828.2,632.7)},when:{actor:'cyclist',at:p(-859.6,617)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist coming down Somerby Hill was just behind your right shoulder, about to pass, and quick downhill. The examiner had to stop the car.'}},
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
              message:'The cyclist had gone by, turning into Bridge End Grove, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'sandon-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Harrowby Road at the Sandon Road, Stonebridge Road and Beacon Lane lights, right into Beacon Lane',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-1384.8,-324.8),
      // (Set going once the car is in the junction, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'sandon-car',at:p(-1363.5,-475.1),delay:0}],
      lights:p(-1363.6,-473.7),lightsAll:true,
      endAt:p(-1307.7,-488.9),
      // The junction, and Sandon Road ahead, where the oncoming silver car comes from.
      // (And Beacon Lane and New Beacon Road, driven out and back, with cars parked along them and little room to meet
      // traffic at their junction: kept clear from here until the car is back on Beacon Lane nearly at the lights.)
      quietUntil:p(-1328.1,-484.4),
      quiet:[{x:-1362,z:-484,radius:30},{x:-1366,z:-540,radius:40},
        {x:-960,z:-930,radius:45},{x:-1030,z:-800,radius:45},{x:-1060,z:-680,radius:45},{x:-1090,z:-570,radius:40},
        {x:-1115,z:-504,radius:30},{x:-1180,z:-494,radius:40},{x:-1260,z:-490,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1377.1,-420.3)},frame:{yaw:0,pitch:20},state:'Approaching the lights on green.'},
        centre:{pause:{kind:'stop',at:p(-1363.3,-478)},when:{actor:'sandon-car',at:p(-1361.7,-519)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-1363.3,-478)},when:{actor:'sandon-car',at:p(-1362.4,-454.3)},frame:{yaw:30,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The silver car coming down Sandon Road was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the silver car coming down Sandon Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Beacon Lane',
              message:'Before you turn, look into the road you are turning into (on your right): its signal crossing may have people on it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Beacon Lane is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'harrowby-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'New Beacon Road at the Harrowby Lane mini-roundabout, right into Uplands Drive',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(-809.7,-1172.9),
      starts:[{actor:'mini-car',at:p(-809.7,-1172.9),delay:0}],
      endAt:p(-694.7,-1268.6),
      // (Uplands Drive, Tennyson Avenue and Shelley Avenue have cars parked both sides, with no room to meet traffic:
      // kept clear until the car is on Shelley Avenue.)
      quietUntil:p(-413.7,-1202),
      // The mini-roundabout, and Harrowby Lane to the east (where the white car comes from) and west (where it goes);
      // Uplands Drive, Tennyson Avenue and Shelley Avenue.
      // (And all of Harrowby Lane the white car comes along, from where it sets off: a background car standing in its
      // way would keep it, and so the car at the line, waiting for good.)
      quiet:[{x:-717,z:-1289,radius:24},{x:-650,z:-1300,radius:40},{x:-790,z:-1294,radius:30},
        {x:-380,z:-1347,radius:30},{x:-470,z:-1338,radius:40},{x:-560,z:-1320,radius:40},
        {x:-660,z:-1235,radius:45},{x:-628,z:-1145,radius:50},{x:-560,z:-1045,radius:45},{x:-470,z:-1065,radius:45},{x:-400,z:-1140,radius:45}],
      place:{
        approach:{pause:{kind:'moving',at:p(-786.6,-1205.6)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout.'},
        line:{pause:{kind:'stop',at:p(-727.2,-1282.1)},when:{actor:'mini-car',at:p(-708.6,-1292.1)},frame:{yaw:-50,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-727.2,-1282.1)},when:{actor:'mini-car',at:p(-747.9,-1295.9)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach to the mini-roundabout, so the traffic on it and behind you knows you are going round.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for Uplands Drive.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Harrowby Lane from the right was going over the mini-roundabout, across your way on to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming along Harrowby Lane from the right was going over the mini-roundabout in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went over. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone on along Harrowby Lane and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the white car had gone and nothing more was coming.'
        }
      ]
    },
    {
      id:'shelley-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Shelley Avenue, left on to Harrowby Lane',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-413.7,-1202),
      starts:[{actor:'shelley-car',at:p(-413.7,-1202),delay:0}],
      endAt:p(-514.5,-1325.3),
      // (New Beacon Road and Beacon Lane, driven back to the Sandon Road lights, have cars parked along them and little
      // room to meet traffic at their junction: kept clear until the car is nearly at the lights.)
      quietUntil:p(-1328.1,-484.4),
      // The junction, Harrowby Lane to the right (east), where the black car comes from, and the zebra to the west;
      // New Beacon Road and Beacon Lane on the way back.
      quiet:[{x:-449,z:-1343,radius:26},{x:-380,z:-1350,radius:45},{x:-500,z:-1333,radius:30},
        {x:-960,z:-930,radius:45},{x:-1030,z:-800,radius:45},{x:-1060,z:-680,radius:45},{x:-1090,z:-570,radius:40},
        {x:-1115,z:-504,radius:30},{x:-1180,z:-494,radius:40},{x:-1260,z:-490,radius:40},{x:-1318,z:-486,radius:25}],
      place:{
        approach:{pause:{kind:'moving',at:p(-442.8,-1297.3)},frame:{yaw:0,pitch:22},state:'Approaching the end of Shelley Avenue.'},
        line:{pause:{kind:'stop',at:p(-449,-1335.7)},when:{actor:'shelley-car',at:p(-413.7,-1346.9)},frame:{yaw:-70,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-449,-1335.7)},when:{actor:'shelley-car',at:p(-477.4,-1334.7)},frame:{yaw:-20,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Harrowby Lane knows where you are going.'}},
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
              message:'Look right first: that is where the traffic in the lane you join comes from.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming along Harrowby Lane from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming along Harrowby Lane from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: the zebra crossing just along Harrowby Lane may have someone on it, and traffic may be overtaking towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone by and Harrowby Lane was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the black car had gone by and Harrowby Lane was clear.'
        }
      ]
    },
    {
      id:'harrowby-zebra',
      title:'Zebra crossing',
      where:'Harrowby Road, the zebra crossing by Stuart Street',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-1269.4,62.4),
      // (Set going from close in, as the car comes to the zebra: on foot, someone set going early walks on past the moment
      // depicted if traffic holds the car up.)
      starts:[{actor:'zebra-pedestrian',at:p(-1249.6,139.6),delay:0}],
      endAt:p(-1239.2,229),
      // (The zebra and the approach the car comes along: not Harrowby Road beyond it, where traffic coming the other way
      // queues for the pedestrian.)
      quiet:[{x:-1246,z:180,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1246.8,163.4)},frame:{yaw:0,pitch:22},state:'On Harrowby Road at 25 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(-1244.2,185.3)},when:{actor:'zebra-pedestrian',at:p(-1242.6,193)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(-1244.2,185.3)},when:{actor:'zebra-pedestrian',at:p(-1248.7,193.7)},frame:{yaw:0,pitch:30},
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
    },
    {
      id:'somerby-roundabout',
      turn:'right',
      title:'Roundabout, all the way round',
      where:'Somerby Hill at the Somerby Hill roundabout, fifth exit, back on to Somerby Hill',
      instruction:'At the roundabout, take the fifth exit, back along Somerby Hill, please.',
      instructAt:p(1213,1265.2),
      // (Set going once the car is at the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(1321.3,1291.8),delay:0}],
      endAt:p(1308.8,1304.3),
      // The roundabout, the Grantham Southern Relief Road, where the blue car comes from, and High Dike north, where it
      // goes (both carriageways: traffic queuing in to the roundabout there would meet it).
      quiet:[{x:1356,z:1323,radius:50},{x:1290,z:1361,radius:35},{x:1230,z:1395,radius:40},{x:1395,z:1258,radius:35},
        {x:1415,z:1205,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(1262.1,1275)},frame:{yaw:0,pitch:22},state:'Approaching the Somerby Hill roundabout.'},
        line:{pause:{kind:'stop',at:p(1325.3,1292.4)},when:{actor:'ring-car',at:p(1322.1,1317.3)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(1325.3,1292.4)},when:{actor:'ring-car',at:p(1372.7,1278)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for going round',
              message:'Going all the way round, signal right on the approach so the traffic on the roundabout and behind you knows.'}},
            {kind:'required',id:'no-position',anyOf:['position-right'],fault:{level:'minor',heading:'Positioning - lane discipline',title:'Not in the right-hand lane',
              message:'For an exit past twelve o\'clock, approach in the right-hand lane.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, signal right, and the right-hand lane: you were going all the way round.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming round the roundabout from the relief road, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone out on to High Dike and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the blue car had gone out on to High Dike and nothing more was coming round.'
        }
      ]
    }
  ]
},BEFORE));
