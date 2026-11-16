import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BRIDGE_CAR,CYCLIST,HILL_CAR,RED_CAR,RING_CAR} from './granthamRoute2Paths';

/**
 * Grantham (Somerby) route 2, Somerby Hill and Harrowby Road: eight challenges from the test centre at Spitalgate
 * Airfield (its way in off High Dike, the A52), right on to High Dike, right at the Somerby Hill roundabout, pulling up
 * and moving off on Somerby Hill, right from Bridge End Road into Harrowby Road, ahead at the Sandon Road lights, right
 * from Sandon Road on to Hill Avenue, New Beacon Road and Beacon Lane, back down Harrowby Road over its zebra crossing,
 * and home by Somerby Hill, the roundabout and High Dike. Chosen from the map and the published evidence
 * (content/packs/grantham-somerby/ROUTES.md). Scene grantham-somerby-route-2 (OpenStreetMap). A practice route, not a
 * confirmed test route.
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
 * the hazard is in view only at the line. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the hedge along High Dike hides the road to the right until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(1413.9,370.3)},when:{actor:'red-car',at:p(1404.3,411.5)},frame:{yaw:-70,pitch:36,shift:-4},
    state:'At the end of the test centre\'s way out.'}},
  // (At the line: the blue car is in view coming round only from there.)
  'somerby-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(1234.7,835.8)},when:{actor:'ring-car',at:p(1184.6,845.8)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Somerby Hill roundabout.'}},
  // (Decided in position, stopped: traffic on Bridge End Road could hold the car short of the turn.)
  'harrowby-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(-1366.9,-67.2)},when:{actor:'bridge-car',at:p(-1405.9,-61.4)},frame:{yaw:0,pitch:34,shift:-4},
    state:'Waiting to turn right into Harrowby Road.'}},
  'sandon-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-1522,-883.2)},lights:'red',frame:{yaw:0,pitch:40,shift:-4},
    state:'Approaching the Sandon Road lights. They are red.'}},
  // (At the line: the houses on the corner hide Hill Avenue to the right until there.)
  'hill-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-1491.8,-1529.3)},when:{actor:'hill-car',at:p(-1452.5,-1525.6)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Sandon Road.'}},
  'harrowby-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(-1396.8,-286.1)},when:{actor:'zebra-pedestrian',at:p(-1392.6,-257)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Harrowby Road, the zebra crossing just ahead.'}}
};

export const GRANTHAM_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'grantham-somerby-2',
  title:'Grantham (Somerby) route 2',
  scene:'grantham-somerby-route-2',
  briefing:'Grantham (Somerby) route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:1392,z:360.6,headingDeg:114},
  // The test centre's way out, High Dike (A52), the Somerby Hill roundabout, Somerby Hill, Bridge End Road, Harrowby Road,
  // Sandon Road, Hill Avenue, New Beacon Road, Beacon Lane, back down Harrowby Road, Somerby Hill, the roundabout, High
  // Dike and into the test centre.
  through:pts([[1379.5,480],[1088,822],[700,740],[-550,385],[-963.5,187.3],[-1360,-66],[-1385,-150],[-1450,-500],[-1530,-850],[-1520,-1050],
    [-1513,-1450],[-1300,-1460],[-1170,-1288],[-1240,-1000],[-1400,-940],[-1530,-800],[-1400,-330],[-1385,-150],[-1340,-63],[-963.5,187.3],
    [-550,385],[700,740],[1304,676],[1379.5,480],[1395,363]]),
  // Pulled in to the kerb on Somerby Hill, past Somerby Grove (no cars parked along it: room for the cyclist to pass).
  shifts:[{from:p(-955.4,192.5),to:p(-978.3,182.3),left:.35}],
  actors:[
    {id:'red-car',name:'red car',colour:'#b91c1c',speed:16,path:pts(RED_CAR)},
    {id:'ring-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(RING_CAR)},
    // Behind the car down Somerby Hill, past it at the kerb, and left into Bridge End Grove.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'bridge-car',name:'white van',colour:'#f3f4f6',speed:11,path:pts(BRIDGE_CAR)},
    {id:'hill-car',name:'black car',colour:'#1f2328',speed:10,path:pts(HILL_CAR)},
    // Waiting at the Harrowby Road zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-1390.3,-257.2],[-1399.5,-256.2]])}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre, emerging right',
      where:'Out of the test centre, right on to High Dike (A52)',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(1392,360.6),
      starts:[{actor:'red-car',at:p(1392,360.6),delay:0}],
      endAt:p(1404.7,420.6),
      // The way out's mouth, High Dike to the right (south), where the red car comes from, and to the north, where it goes.
      quiet:[{x:1420,z:375,radius:28},{x:1395,z:450,radius:45},{x:1440,z:330,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(1401.2,364.4)},frame:{yaw:0,pitch:22},state:'Driving out of the test centre.'},
        line:{pause:{kind:'stop',at:p(1413.9,370.3)},when:{actor:'red-car',at:p(1404.3,411.5)},frame:{yaw:-70,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(1413.9,370.3)},when:{actor:'red-car',at:p(1434.8,332.2)},frame:{yaw:-10,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right as you come to the end of the way out, so the traffic on High Dike knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of High Dike comes from the right, at up to 60 mph.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming up High Dike from the right was close and fast, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming up High Dike from the right was close, and on a 60 mph road it closes the gap fast.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming down High Dike before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'High Dike was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: High Dike was clear both ways.'
        }
      ]
    },
    {
      id:'somerby-roundabout',
      turn:'right',
      title:'Roundabout, turning right',
      where:'High Dike at the Somerby Hill roundabout, last exit on to Somerby Hill (A52)',
      instruction:'At the roundabout, take the fourth exit, please.',
      instructAt:p(1288.8,718.9),
      // (Set going once the car is at the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(1235.9,832),delay:0}],
      endAt:p(1160.8,856.3),
      // The roundabout, and Somerby Hill, where the blue car comes from.
      quiet:[{x:1205,z:872,radius:48},{x:1130,z:830,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(1257.3,792.2)},frame:{yaw:0,pitch:22},state:'Approaching the Somerby Hill roundabout.'},
        line:{pause:{kind:'stop',at:p(1234.7,835.8)},when:{actor:'ring-car',at:p(1184.6,845.8)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(1234.7,835.8)},when:{actor:'ring-car',at:p(1225.3,903.3)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach so the traffic on it and behind you knows where you are going.'}},
            {kind:'required',id:'no-position',anyOf:['position-right'],fault:{level:'minor',heading:'Positioning - lane discipline',title:'Not in the right-hand lane',
              message:'For the last exit, approach in the right-hand lane.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, signal right, and the right-hand lane for the last exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming round the roundabout from Somerby Hill, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
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
          explain:'Look right again, then go: the blue car had gone out past you and nothing more was coming round.'
        }
      ]
    },
    {
      id:'somerby-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Somerby Hill, past Somerby Grove',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-859.3,219.1),
      starts:[{actor:'cyclist',at:p(-955.6,192.8),delay:0}],
      endAt:p(-978.4,182.6),
      selfCancel:false,
      quiet:[{x:-978,z:183,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-955.6,192.8)},frame:{yaw:-15,pitch:28},state:'On Somerby Hill at 20 mph, past Somerby Grove.'},
        stopped:{pause:{kind:'stop',at:p(-978.4,182.6)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb, on the hill.'}
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
      instructAt:p(-978.4,182.6),
      // (Down Somerby Hill behind the car as it comes to pull up.)
      starts:[{actor:'cyclist',at:p(-955.6,192.8),delay:0}],
      endAt:p(-1036.1,152.8),
      quiet:[{x:-978,z:183,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-978.4,182.6)},when:{actor:'cyclist',at:p(-966.8,185.9)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb on the hill, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-978.4,182.6)},when:{actor:'cyclist',at:p(-1009.6,167)},frame:{yaw:-170,pitch:26},
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
      id:'harrowby-right',
      turn:'right',
      title:'Right turn into a side road',
      where:'Bridge End Road, right into Harrowby Road',
      instruction:'Take the next road on the right, please.',
      instructAt:p(-1254.2,-34.5),
      starts:[{actor:'bridge-car',at:p(-1254.2,-34.5),delay:0}],
      endAt:p(-1383.9,-129.3),
      // The junction, and Bridge End Road ahead, where the oncoming white van comes from.
      quiet:[{x:-1379,z:-69,radius:22},{x:-1420,z:-50,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1300.7,-52.1)},frame:{yaw:0,pitch:20},state:'On Bridge End Road, Harrowby Road ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(-1366.9,-67.2)},when:{actor:'bridge-car',at:p(-1405.9,-61.4)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Harrowby Road.'},
        clear:{pause:{kind:'stop',at:p(-1366.9,-67.2)},when:{actor:'bridge-car',at:p(-1348.5,-66.9)},frame:{yaw:-30,pitch:32},
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
              message:'The white van coming along Bridge End Road was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the white van coming the other way was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Harrowby Road',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing its mouth or a car coming out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Harrowby Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'sandon-lights',
      title:'Traffic lights, ahead',
      where:'Harrowby Road at the Sandon Road, Stonebridge Road and Beacon Lane lights, ahead into Sandon Road',
      instruction:'At the traffic lights, follow the road ahead, please.',
      instructAt:p(-1538.4,-787.5),
      starts:[],
      lights:p(-1513.6,-923.6),
      endAt:p(-1515.4,-981.9),
      // The junction, and Stonebridge Road and Beacon Lane either side.
      quiet:[{x:-1512,z:-934,radius:32},{x:-1560,z:-930,radius:26},{x:-1470,z:-937,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1522,-883.2)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the lights.'},
        line:{pause:{kind:'stop',at:p(-1513.6,-919.9)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-1513.6,-919.9)},lights:'red',frame:{yaw:0,pitch:28},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-left','signal-right','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic coming out of Stonebridge Road and Beacon Lane, and anyone on the crossings, at risk.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Sandon Road: a left signal says you are turning into Stonebridge Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Sandon Road: a right signal says you are turning into Beacon Lane.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the lights were red. No signal: you were going ahead.'
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
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-junction',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before going',
              message:'Green means go only if the way is clear. Look across the junction for anyone late through the lights from Stonebridge Road or Beacon Lane, or still on the crossings, before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the junction was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look across the junction both ways, then go: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'hill-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Sandon Road, right on to Hill Avenue',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-1536.2,-1378.8),
      starts:[{actor:'hill-car',at:p(-1536.2,-1378.8),delay:0}],
      endAt:p(-1406.1,-1514.1),
      // The crossroads, Hill Avenue to the right (east), where the black car comes from, and Gorse Rise, where it turns.
      quiet:[{x:-1486,z:-1537,radius:26},{x:-1420,z:-1517,radius:45},{x:-1470,z:-1580,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1508.3,-1474.8)},frame:{yaw:0,pitch:22},state:'Approaching the end of Sandon Road.'},
        line:{pause:{kind:'stop',at:p(-1491.8,-1529.3)},when:{actor:'hill-car',at:p(-1452.5,-1525.6)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-1491.8,-1529.3)},when:{actor:'hill-car',at:p(-1477.7,-1561.9)},frame:{yaw:-10,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Hill Avenue knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Hill Avenue comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming along Hill Avenue from the right was close, turning across the crossroads into Gorse Rise. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming along Hill Avenue from the right was close, turning into Gorse Rise.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming along it before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car turned. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Hill Avenue was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Hill Avenue was clear both ways.'
        }
      ]
    },
    {
      id:'harrowby-zebra',
      title:'Zebra crossing',
      where:'Harrowby Road, the zebra crossing by Stuart Street',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-1424.8,-402.2),
      starts:[{actor:'zebra-pedestrian',at:p(-1408.3,-355),delay:0}],
      endAt:p(-1387.7,-206.7),
      quiet:[{x:-1395,z:-257,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1408.3,-355)},frame:{yaw:0,pitch:22},state:'On Harrowby Road at 25 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(-1394.2,-264.3)},when:{actor:'zebra-pedestrian',at:p(-1392.6,-257)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(-1394.2,-264.3)},when:{actor:'zebra-pedestrian',at:p(-1398.7,-256.3)},frame:{yaw:0,pitch:30},
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
    }
  ]
},BEFORE));
