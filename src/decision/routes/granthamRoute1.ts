import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {B6403_CAR,BLACK_CAR,CYCLIST,DIKE_CAR,GREY_CAR,SILVER_CAR,WHITE_CAR} from './granthamRoute1Paths';

/**
 * Grantham (Somerby) route 1, High Dike and Harrowby Lane: eight challenges from the test centre at Spitalgate
 * Airfield (its way in off High Dike, the A52), left on to High Dike, left into Harrowby Lane behind a cyclist,
 * pulling up and moving off on Harrowby Lane, left at the New Beacon Road mini-roundabout into Uplands Drive, Tennyson
 * Avenue and Keats Avenue, right on to Harrowby Lane, right on to High Dike (B6403), and right into the test centre.
 * Chosen from the map and the published evidence (content/packs/grantham-somerby/ROUTES.md). Scene
 * grantham-somerby-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first on the move unless
 * the hazard is in view only at the line. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the hedge along High Dike hides the road to the right until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(763.9,1070.3)},when:{actor:'dike-car',at:p(754.2,1111.5)},frame:{yaw:-70,pitch:36,shift:-4},
    state:'At the end of the test centre\'s way out.'}},
  'harrowby-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-1488.8,-1045.4)},when:{actor:'white-car',at:p(-1530.7,-1027.8)},frame:{yaw:-30,pitch:32},
    state:'Approaching the mini-roundabout.'}},
  // (At the line: the houses on the corner hide Harrowby Lane until there.)
  'keats-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-973,-1100.1)},when:{actor:'black-car',at:p(-938.5,-1113.8)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Keats Avenue.'}},
  // (At the line: the hedges hide High Dike until there.)
  'b6403-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(1487.4,-785.5)},when:{actor:'b6403-car',at:p(1478.6,-737)},frame:{yaw:-75,pitch:36,shift:-4},
    state:'At the end of Harrowby Lane.'}},
  // (Decided in position, stopped: traffic on High Dike could hold the car short of the turn.)
  'centre-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(775.9,1065)},when:{actor:'silver-car',at:p(757.8,1102.2)},frame:{yaw:0,pitch:34,shift:-4},
    state:'Waiting to turn right into the test centre.'}}
};

export const GRANTHAM_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'grantham-somerby-1',
  title:'Grantham (Somerby) route 1',
  scene:'grantham-somerby-route-1',
  briefing:'Grantham (Somerby) route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:742,z:1060.6,headingDeg:114},
  // The test centre's way out, High Dike (A52) and High Dike (B6403), Harrowby Lane, the mini-roundabout, Uplands Drive,
  // Tennyson Avenue, Keats Avenue, Harrowby Lane back to High Dike (B6403), High Dike (A52) and into the test centre.
  through:pts([[843,895],[888,805],[1192,0],[1300,-725],[0,-516],[-470,-900],[-860,-1124],[-1286,-1084],[-1495,-1015],[-1420,-875],[-1200,-837],
    [-1000,-870],[-955,-1010],[-860,-1124],[-650,-1088],[-400,-770],[0,-516],[1300,-725],[1192,0],[893,806],[845,895],[745,1063]]),
  // Pulled in to the kerb on Harrowby Lane, past Tennyson Avenue (no cars parked along it: room for the grey car to pass).
  shifts:[{from:p(-830.4,-1119.7),to:p(-870.2,-1122.8),left:.35}],
  actors:[
    {id:'dike-car',name:'red car',colour:'#b91c1c',speed:16,path:pts(DIKE_CAR)},
    // Ahead of the car up High Dike, going on past Harrowby Lane.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    // Behind the car along Harrowby Lane, past it at the kerb, and left into Keats Avenue.
    {id:'grey-car',name:'grey car',colour:'#6b7280',speed:11,path:pts(GREY_CAR)},
    // Seen waiting just past the New Beacon Road signal crossing, then round the mini-roundabout and out along Harrowby Lane.
    {id:'white-car',name:'white car',colour:'#e5e7eb',speed:8,waits:true,path:pts(WHITE_CAR)},
    {id:'black-car',name:'black car',colour:'#1f2328',speed:11,path:pts(BLACK_CAR)},
    {id:'b6403-car',name:'blue car',colour:'#2563eb',speed:18,path:pts(B6403_CAR)},
    {id:'silver-car',name:'silver car',colour:'#c3c7cf',speed:16,path:pts(SILVER_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre, emerging left',
      where:'Out of the test centre, left on to High Dike (A52)',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(742,1060.6),
      starts:[{actor:'dike-car',at:p(742,1060.6),delay:0}],
      endAt:p(787.5,1025),
      // The way out's mouth, High Dike to the right (south), where the red car comes from, and ahead, where it goes.
      quiet:[{x:770,z:1075,radius:28},{x:740,z:1150,radius:45},{x:790,z:1020,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(751.2,1064.4)},frame:{yaw:0,pitch:22},state:'Driving out of the test centre.'},
        line:{pause:{kind:'stop',at:p(763.9,1070.3)},when:{actor:'dike-car',at:p(754.2,1111.5)},frame:{yaw:-70,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(763.9,1070.3)},when:{actor:'dike-car',at:p(784.7,1032.1)},frame:{yaw:-20,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left as you come to the end of the way out, so the traffic on High Dike knows where you are going.'}},
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
              message:'Look right first: that is where the traffic in the lane you join comes from, at up to 60 mph.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming up High Dike from the right was close, at speed, in the lane you were joining. The examiner had to stop the car.'}},
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
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking on your side of High Dike, coming towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone by and High Dike was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the red car had gone by and High Dike was clear.'
        }
      ]
    },
    {
      id:'harrowby-lane-left',
      turn:'left',
      title:'Left turn behind a cyclist',
      where:'High Dike (B6403), left into Harrowby Lane',
      instruction:'Take the next road on the left, please.',
      instructAt:p(1441.5,-639.2),
      starts:[{actor:'cyclist',at:p(1299.9,-265.1),delay:0}],
      endAt:p(1448.5,-771.2),
      quiet:[{x:1495,z:-783,radius:30},{x:1520,z:-845,radius:40},{x:1470,z:-715,radius:35}],
      place:{
        approach:{pause:{kind:'moving',at:p(1462.8,-695.3)},when:{actor:'cyclist',at:p(1471.6,-718.7)},frame:{yaw:0,pitch:26},
          state:'On High Dike, the turning into Harrowby Lane ahead on the left. A cyclist is just ahead.'},
        turn:{pause:{kind:'moving',at:p(1489.4,-765.5)},when:{actor:'cyclist',at:p(1499.2,-791.2)},frame:{yaw:10,pitch:28},
          state:'Behind the cyclist, at the turning.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','slow-down','speed-up','horn'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left in good time, so the traffic behind you and the cyclist know you are turning.'}},
            {kind:'required',id:'hold-back',anyOf:['slow-down'],fault:{level:'serious',heading:'Clearance',title:'Did not hold back behind the cyclist',
              message:'Slow down and stay behind the cyclist: there is no room to pass them safely before your turn.'}},
            {kind:'distractor',id:'overtake',action:'speed-up',fault:{level:'dangerous',heading:'Clearance',title:'Overtook the cyclist just before turning left',
              message:'Overtaking a cyclist and then turning left across them is how cyclists are hit at junctions. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left','slow-down'],['mirror-left','mirror-interior','signal-left','slow-down'],
            ['mirror-interior','mirror-left','slow-down','signal-left']],
          next:{then:'turn'},
          explain:'Interior and left mirrors, signal left, and slow down behind the cyclist: there was no room to pass before the turn.'
        },
        {
          id:'turn',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-left','look-left','give-way','go'],
          neutral:['mirror-interior','look-left'],
          rules:[
            {kind:'required',id:'left-mirror',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: another cyclist may be coming up on your inside.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited with the turning clear',
              message:'The cyclist had gone on past the turning and nothing was in it: this was the time to turn.'}}
          ],
          accepted:[['mirror-left','go'],['mirror-interior','mirror-left','go'],['mirror-left','look-left','go']],
          next:{go:'done'},
          explain:'Left mirror, then turn: the cyclist had gone on past Harrowby Lane.'
        }
      ]
    },
    {
      id:'harrowby-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Harrowby Lane, past Tennyson Avenue',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-771.4,-1109.1),
      starts:[],
      endAt:p(-870.3,-1122.4),
      selfCancel:false,
      quiet:[{x:-870,z:-1123,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-845.3,-1121.3)},frame:{yaw:-15,pitch:28},state:'On Harrowby Lane at 20 mph, Tennyson Avenue just behind on the left.'},
        stopped:{pause:{kind:'stop',at:p(-870.3,-1122.4)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Tennyson Avenue, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Tennyson Avenue could not see past you, and those turning in would meet you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Tennyson Avenue; mirrors, then signal left.'
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
      id:'harrowby-move-off',
      turn:'right',
      title:'Moving off',
      where:'Harrowby Lane, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-870.3,-1122.4),
      // (Set going as the car comes to pull up: along Harrowby Lane behind it.)
      starts:[{actor:'grey-car',at:p(-845.3,-1121.3),delay:0}],
      endAt:p(-939.4,-1113.6),
      quiet:[{x:-870,z:-1123,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-870.3,-1122.4)},when:{actor:'grey-car',at:p(-855.4,-1123.7)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-870.3,-1122.4)},when:{actor:'grey-car',at:p(-909.8,-1119.7)},frame:{yaw:-170,pitch:26},
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
            {kind:'unsafe',id:'pulled-into-car',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off into the grey car',
              message:'The grey car coming along Harrowby Lane was just behind you, about to pass. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the driver behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','blind-spot-right','give-way'],['blind-spot-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors and your right blind spot, then wait: the grey car was coming past.'
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
              message:'The grey car had gone by and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the grey car had gone by.'
        }
      ]
    },
    {
      id:'harrowby-mini',
      turn:'left',
      title:'Mini-roundabout, left turn',
      where:'Harrowby Lane at the New Beacon Road mini-roundabout, left into Uplands Drive',
      instruction:'At the mini-roundabout, turn left, please.',
      instructAt:p(-1323.8,-1072.8),
      starts:[{actor:'white-car',at:p(-1226.4,-1095.1),delay:0}],
      endAt:p(-1462.9,-982.3),
      // The mini-roundabout, New Beacon Road (the white car's way in) and Harrowby Lane to the west.
      quiet:[{x:-1516,z:-1039,radius:24},{x:-1565,z:-980,radius:40},{x:-1585,z:-1045,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1470,-1046)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 25 mph.'},
        line:{pause:{kind:'stop',at:p(-1504.7,-1043.5)},when:{actor:'white-car',at:p(-1530.7,-1027.8)},frame:{yaw:-40,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-1504.7,-1043.5)},when:{actor:'white-car',at:p(-1487.6,-1048.5)},frame:{yaw:30,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the mini-roundabout, so the traffic on it and behind you knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left for Uplands Drive.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car from New Beacon Road was coming round the mini-roundabout from your right, across your way on to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car from New Beacon Road was coming round the mini-roundabout from the right. Until it has gone past your exit, you cannot tell where it is going.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car came round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone out along Harrowby Lane and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the white car had gone out along Harrowby Lane and nothing more was coming.'
        }
      ]
    },
    {
      id:'keats-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Keats Avenue, right on to Harrowby Lane',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-961.3,-1032.2),
      starts:[{actor:'black-car',at:p(-944.3,-938.8),delay:0}],
      endAt:p(-916.2,-1121.9),
      // The junction, Harrowby Lane to the right (east), where the black car comes from, and to the west, where it goes.
      quiet:[{x:-973,z:-1108,radius:26},{x:-900,z:-1122,radius:45},{x:-1050,z:-1093,radius:35}],
      place:{
        approach:{pause:{kind:'moving',at:p(-966,-1070)},frame:{yaw:0,pitch:22},state:'Approaching the end of Keats Avenue at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-973,-1100.1)},when:{actor:'black-car',at:p(-938.5,-1113.8)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-973,-1100.1)},when:{actor:'black-car',at:p(-1002.2,-1100.9)},frame:{yaw:-30,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Harrowby Lane knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Harrowby Lane comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming along Harrowby Lane from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming along Harrowby Lane from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming along it before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Harrowby Lane was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Harrowby Lane was clear both ways.'
        }
      ]
    },
    {
      id:'b6403-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Harrowby Lane, right on to High Dike (B6403, 60 mph)',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(1405.5,-760.3),
      starts:[{actor:'b6403-car',at:p(1356.6,-750.7),delay:0}],
      endAt:p(1475.9,-721.1),
      // The junction, High Dike to the right (south), where the blue car comes from, and to the north, where it goes.
      quiet:[{x:1497,z:-783,radius:30},{x:1470,z:-710,radius:50},{x:1520,z:-850,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(1450,-776)},frame:{yaw:0,pitch:22},state:'Approaching the end of Harrowby Lane.'},
        line:{pause:{kind:'stop',at:p(1487.4,-785.5)},when:{actor:'b6403-car',at:p(1478.6,-737)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(1487.4,-785.5)},when:{actor:'b6403-car',at:p(1511.1,-820.9)},frame:{yaw:-30,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on High Dike knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of High Dike comes from the right, at up to 60 mph.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming up High Dike from the right was close and fast, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming up High Dike from the right was close, and at 60 mph it covers the gap in seconds.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming down High Dike before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car passed. Look right again just before you go.'}},
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
      id:'centre-right',
      turn:'right',
      title:'Right turn into the test centre',
      where:'High Dike (A52), right into the test centre',
      instruction:'Turn right into the test centre, please.',
      instructAt:p(824.8,939.2),
      starts:[{actor:'silver-car',at:p(832.8,920.8),delay:0}],
      endAt:p(747.5,1065.8),
      // The way in, and High Dike ahead, where the oncoming silver car comes from, and behind, where it goes.
      quiet:[{x:770,z:1075,radius:22},{x:735,z:1160,radius:45},{x:790,z:1030,radius:25}],
      place:{
        approach:{pause:{kind:'moving',at:p(806.6,985.7)},frame:{yaw:0,pitch:20},state:'On High Dike, the test centre\'s way in ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(775.9,1065)},when:{actor:'silver-car',at:p(757.8,1102.2)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into the test centre.'},
        clear:{pause:{kind:'stop',at:p(775.9,1065)},when:{actor:'silver-car',at:p(779.3,1046.1)},frame:{yaw:-30,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming silver car',
              message:'The silver car coming up High Dike from the Somerby Hill roundabout was going ahead, and it has priority over you turning right. On a 60 mph road it was only seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the silver car coming the other way was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into the way in',
              message:'Before you turn, look into the way in (on your right) for anyone walking across it or a car coming out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming up High Dike: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the way in is clear, then turn: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
