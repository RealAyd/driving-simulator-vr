import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BEACON_CAR,BEACON_CYCLIST,BOULEVARD_CAR,FOREST_CAR,LIGHTS_CAR,PARK_CYCLIST,PARK_RBT_CAR} from './loughboroughRoute1Paths';

/**
 * Loughborough route 1, the station, Park Road and Epinal Way: eight challenges from the test centre at the Ark Business
 * Centre, Gordon Road (by the station), right out of Gordon Road on to Station Boulevard, right at the station lights
 * into Nottingham Road, Queen's Road, Leicester Road and Southfield Road, left at the Park Road mini-roundabout,
 * pulling up and moving off on Park Road, right at the Park Road roundabout on to Epinal Way, ahead at the Beacon Road
 * roundabout, right at the Forest Road roundabout, and back by Forest Road, Woodgate, Leicester Road, Queen's Road and
 * Nottingham Road to Gordon Road. Chosen from the map and the published evidence (content/packs/loughborough/ROUTES.md). Scene
 * loughborough-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line; the station lights keep a third: the red light, then someone still crossing
 * on green, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'station-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(722.4,-915.6)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the station lights. They are red.'}},
  // (At the line: Beacon Road comes in from behind the right shoulder, out of view until there.)
  'park-road-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-92.2,411.4)},when:{actor:'beacon-car',at:p(-98.4,436.4)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}},
  // (At the line, as at the Beverley roundabout in Morden: what is coming round is in view only from there.)
  'park-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(83,1194.4)},when:{actor:'park-rbt-car',at:p(69.7,1192.2)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Park Road roundabout.'}},
  'beacon-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-279.3,945.1)},when:{actor:'beacon-cyclist',at:p(-280.8,927.3)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Beacon Road roundabout.'}},
  'forest-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-704.9,659.3)},when:{actor:'forest-car',at:p(-703.2,645.2)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Forest Road roundabout.'}}
};

export const LOUGHBOROUGH_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'loughborough-1',
  title:'Loughborough route 1',
  scene:'loughborough-route-1',
  briefing:'Loughborough route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:427.9,z:-1187.9,headingDeg:184},
  // The test centre's car park, Gordon Road, Station Boulevard, Nottingham Road, Queen's Road, Leicester Road,
  // Southfield Road, Park Road, Epinal Way, Forest Road, Woodgate, Leicester Road, King Street, Queen's Road, Nottingham
  // Road, Station Boulevard and back into Gordon Road.
  through:pts([[560.6,-1180.7],[700.7,-950.4],[683.3,-756.9],[689.5,-300.1],[377.1,132.1],[159.9,104.9],[-82,433.2],[101,802],
    [-110.1,1062.5],[-401.4,852.2],[-287.9,419.4],[110.9,60.1],[420,190],[484.5,204.9],[689.5,-300.1],[683.3,-756.9],[622.3,-1111.4],
    [495.6,-1194.6]]),
  // Pulled in to the kerb on Park Road, between Charnwood Road and Herrick Road (no cars parked along it).
  // And kept off the kerb's corner turning right out of Woodgate on to Leicester Road, on the way back.
  shifts:[{from:p(107.3,863.4),to:p(108.9,883.4),left:.35},{from:p(209.2,-74.8),to:p(213.8,-80.8),left:.6}],
  actors:[
    {id:'boulevard-car',name:'white car',colour:'#e5e7eb',speed:8,path:pts(BOULEVARD_CAR)},
    {id:'lights-car',name:'blue car',colour:'#2563eb',speed:8,path:pts(LIGHTS_CAR)},
    // Crossing Station Boulevard at the lights, right to left in front of the car, still crossing as they turn green.
    {id:'station-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[752.3,-885.6],[758.1,-893.6]])},
    {id:'beacon-car',name:'red car',colour:'#b91c1c',speed:8,path:pts(BEACON_CAR)},
    // Behind the car along Park Road, past it at the kerb, and right into Herrick Road.
    {id:'park-cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(PARK_CYCLIST)},
    {id:'park-rbt-car',name:'silver car',colour:'#c3c7cf',speed:8,path:pts(PARK_RBT_CAR)},
    {id:'beacon-cyclist',name:'cyclist',colour:'#ca8a04',speed:6,kind:'cyclist',path:pts(BEACON_CYCLIST)},
    {id:'forest-car',name:'black car',colour:'#1f2328',speed:8,path:pts(FOREST_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'Gordon Road, right on to Station Boulevard',
      instruction:'When you\'re ready, drive out to the end of Gordon Road and turn right, please.',
      instructAt:p(427.9,-1187.9),
      // (The blue car set going as the car comes to the line: it comes out of the lights just after the white car passes.)
      starts:[{actor:'boulevard-car',at:p(427.9,-1187.9),delay:0},{actor:'lights-car',at:p(495.5,-1196.1),delay:0}],
      endAt:p(534.8,-1205.1),
      // The end of Gordon Road, Station Boulevard to the right (the station), where the white car comes from, and to the
      // left (the Meadow Lane lights), where the blue car comes from.
      quiet:[{x:510,z:-1219,radius:22},{x:540,z:-1198,radius:30},{x:478,z:-1232,radius:28}],
      place:{
        line:{pause:{kind:'stop',at:p(502.3,-1208.3)},when:{actor:'boulevard-car',at:p(522,-1209.4)},frame:{yaw:-70,pitch:32},
          state:'At the end of Gordon Road, at the edge of Station Boulevard.'},
        left:{pause:{kind:'stop',at:p(502.3,-1208.3)},when:{actor:'lights-car',at:p(500.3,-1225.8)},frame:{yaw:60,pitch:32},
          state:'Still at the end of Gordon Road.'},
        clear:{pause:{kind:'stop',at:p(502.3,-1208.3)},when:{actor:'lights-car',at:p(538.4,-1201.9)},frame:{yaw:-30,pitch:32},
          state:'Still at the end of Gordon Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Station Boulevard, which you cross, comes from the right, from the station.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Station Boulevard know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning right: a left signal misleads everyone on Station Boulevard.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Station Boulevard from the right was a second or two away in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'left',go:'left'},
          explain:'Signal right and wait: the white car coming along Station Boulevard from the right was close, in the lane you were crossing.'
        },
        {
          id:'left',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-right','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left as well: turning right, you join the far lane, and its traffic comes from the left, out of the Meadow Lane lights.'}},
            {kind:'unsafe',id:'pulled-out-left',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The white car had passed, but the blue car coming out of the Meadow Lane lights from the left was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait again: the right was clear, but the blue car coming out of the lights from the left was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car came by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look left',
              message:'Look left again too: the lights may have let more traffic through towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Station Boulevard was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Station Boulevard was clear both ways.'
        }
      ]
    },
    {
      id:'station-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Station Boulevard at the station lights, right into Nottingham Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(693.3,-968),
      starts:[{actor:'station-pedestrian',at:p(693.3,-968),delay:0}],
      // (The station lights held green all round once they change: the crossings just round the corner are theirs.)
      lights:p(752.6,-891.6),lightsAll:true,
      endAt:p(738.9,-818.2),
      quiet:[{x:758,z:-884,radius:26},{x:742,z:-830,radius:22},{x:782,z:-900,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(722.4,-915.6)},lights:'red',frame:{yaw:0,pitch:22},state:'Approaching the station lights.'},
        line:{pause:{kind:'stop',at:p(748,-892.7)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        green:{pause:{kind:'stop',at:p(748,-892.7)},lights:'red',when:{actor:'station-pedestrian',at:p(755.8,-890.4)},frame:{yaw:0,pitch:36,shift:4},
          state:'At the stop line. The lights have turned green.'},
        clear:{pause:{kind:'stop',at:p(748,-892.7)},when:{actor:'station-pedestrian',at:p(757.7,-893)},frame:{yaw:0,pitch:36,shift:4},
          state:'Still at the stop line, on green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-left','signal-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the drivers behind know you are turning into Nottingham Road.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the people crossing and the traffic from Nottingham Road at risk.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','slow-down'],['mirror-right','mirror-interior','signal-right','slow-down']],
          next:{then:'line'},
          explain:'Interior and right mirrors, signal right, then slow down: the lights were red.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go'],
          neutral:['look-left','look-right','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-interior','give-way']],
          next:{wait:'green',go:'green'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'green',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left','look-right'],any:true,fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look along the crossing first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Moved off with someone still crossing',
              message:'Green means go only if the way is clear. The pedestrian was still on the crossing just past the stop line, walking across in front of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','give-way'],['look-right','look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait, even on green: the pedestrian was still crossing Station Boulevard in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Nottingham Road',
              message:'Look into Nottingham Road, the road you turn into, before you go: its crossing may have people on it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','go']],
          next:{go:'done'},
          explain:'Check into Nottingham Road, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'park-road-mini',
      turn:'left',
      title:'Mini-roundabout, left turn',
      where:'Royland Road at the Park Road mini-roundabout, left into Park Road',
      instruction:'At the mini-roundabout, turn left, please.',
      instructAt:p(-80.5,339.4),
      // (Set going well before: it has 135 m to come up Beacon Road.)
      starts:[{actor:'beacon-car',at:p(-20.6,235.9),delay:0}],
      endAt:p(-63.9,452.2),
      // The mini-roundabout, and Beacon Road to the right, where the red car comes from.
      quiet:[{x:-90,z:424,radius:24},{x:-125,z:485,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(-96.7,394)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout.'},
        line:{pause:{kind:'stop',at:p(-92.2,411.4)},when:{actor:'beacon-car',at:p(-98.4,436.4)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-92.2,411.4)},when:{actor:'beacon-car',at:p(-75.2,438.9)},frame:{yaw:0,pitch:28},state:'Still at the give way line.'}
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
          explain:'Interior and left mirrors, then signal left for Park Road.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right, and Beacon Road joins from behind your right shoulder.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming up Beacon Road from the right was at the mini-roundabout, turning into Park Road, the road you were turning into. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming up Beacon Road from the right was there first, going round into Park Road.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone on down Park Road and nothing more was coming up Beacon Road: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the red car had gone on ahead and nothing more was coming.'
        }
      ]
    },
    {
      id:'park-road-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Park Road, past Charnwood Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(103.6,818.6),
      starts:[{actor:'park-cyclist',at:p(101.5,783.7),delay:0}],
      endAt:p(108.9,883.4),
      selfCancel:false,
      quiet:[{x:109,z:883,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(106.1,848.5)},frame:{yaw:15,pitch:28},state:'On Park Road at 30 mph, Charnwood Road just behind on the right.'},
        stopped:{pause:{kind:'stop',at:p(108.9,883.4)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Charnwood Road, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped opposite a junction',
              message:'Never stop opposite or within 10 metres of a junction: drivers turning out of Charnwood Road would have to swing round you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Charnwood Road; mirrors, then signal left.'
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
      id:'park-road-move-off',
      turn:'right',
      title:'Moving off',
      where:'Park Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(108.9,883.4),
      // (Along Park Road behind the car as it comes to pull up.)
      starts:[{actor:'park-cyclist',at:p(101.5,783.7),delay:0}],
      endAt:p(113.2,933.2),
      quiet:[{x:109,z:883,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(108.9,883.4)},when:{actor:'park-cyclist',at:p(106.4,864.4)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(108.9,883.4)},when:{actor:'park-cyclist',at:p(112.1,920.5)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist coming along Park Road was just behind your right shoulder, about to pass. The examiner had to stop the car.'}},
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
              message:'The cyclist had gone by, on towards Herrick Road, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'park-roundabout',
      turn:'right',
      title:'Roundabout, turn right',
      where:'Park Road at the Park Road roundabout, right (third exit) on to Epinal Way',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(96.9,1161.8),
      // (Set going well before: it has 160 m to come along Epinal Way and round to the car's entry.)
      starts:[{actor:'park-rbt-car',at:p(122.1,1042.8),delay:0}],
      endAt:p(30.1,1191),
      // The entry, and the circulating carriageway to the right, where the silver car comes round from Epinal Way.
      quiet:[{x:78,z:1198,radius:22},{x:52,z:1190,radius:26},{x:62,z:1211,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(94.5,1166.2)},frame:{yaw:0,pitch:22},state:'Approaching the Park Road roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(83,1194.4)},when:{actor:'park-rbt-car',at:p(69.7,1192.2)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(83,1194.4)},when:{actor:'park-rbt-car',at:p(94,1218.8)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so the traffic round it knows you are not leaving at the first exits.'}},
            {kind:'required',id:'no-position',anyOf:['position-right'],fault:{level:'minor',heading:'Positioning - normal driving',title:'Not positioned for the right turn',
              message:'Approach in the right-hand part of the lane to turn right at the roundabout.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, signal right, and position for the right turn.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car coming round the roundabout from Epinal Way, on your right, was close and crossing your entry. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the silver car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the silver car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the silver car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The silver car had gone out into Ling Road and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the silver car had gone out into Ling Road.'
        }
      ]
    },
    {
      id:'beacon-roundabout',
      title:'Roundabout, ahead',
      where:'Epinal Way at the Beacon Road roundabout, second exit, ahead on Epinal Way',
      instruction:'At the roundabout, take the second exit, please.',
      instructAt:p(-206.6,992.6),
      // (Set going well before: on a bicycle it takes 20 s to come down Beacon Road and round.)
      starts:[{actor:'beacon-cyclist',at:p(-71.6,1095.9),delay:0}],
      endAt:p(-338.2,894.1),
      // The entry, and the north and east sides, where the cyclist comes round from Beacon Road.
      quiet:[{x:-282,z:942,radius:22},{x:-282,z:912,radius:26},{x:-296,z:925,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-239.1,969.3)},frame:{yaw:0,pitch:22},state:'Approaching the Beacon Road roundabout at 40 mph.'},
        line:{pause:{kind:'stop',at:p(-279.3,945.1)},when:{actor:'beacon-cyclist',at:p(-280.8,927.3)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-279.3,945.1)},when:{actor:'beacon-cyclist',at:p(-303.4,946.2)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'No mirror on the approach',
              message:'Check the interior mirror as you slow from 40 mph for the roundabout: you need to know how close the traffic behind is.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signalled left too early',
              message:'For the second exit, going ahead, give no signal on the approach: signal left only once you pass the exit before yours, Beacon Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round past Epinal Way: everyone waiting at the next entries would be misled.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: something was coming round from the right.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left']],
          next:{then:'line'},
          explain:'Interior mirror and no signal on the approach: you were going ahead, the second exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right, cyclists as well as cars.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the cyclist',
              message:'The cyclist coming round the roundabout from Beacon Road, on your right, was just about to cross your entry. A cyclist is easy to miss beside the cars. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the cyclist\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the cyclist\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the cyclist coming round from Beacon Road, on your right, was about to cross your entry.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the cyclist went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The cyclist had gone by, out into Beacon Road, and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the cyclist had gone out into Beacon Road.'
        }
      ]
    },
    {
      id:'forest-roundabout',
      turn:'right',
      title:'Roundabout, turn right',
      where:'Epinal Way at the Forest Road roundabout, right (third exit) on to Forest Road',
      instruction:'At the roundabout, turn right, the third exit, on to Forest Road, please.',
      instructAt:p(-622.1,707.4),
      // (Set going well before: it has 200 m to come down Forest Road and round to the car's entry.)
      starts:[{actor:'forest-car',at:p(-405.8,851.5),delay:0}],
      // (The roundabout's lights, on its crossings, held green: the decision is about who is coming round.)
      lights:p(-694.9,663.5),lightsAll:true,
      endAt:p(-680.6,619),
      // The entry, and the circulating carriageway to the right, where the black car comes round from Forest Road.
      quiet:[{x:-704,z:656,radius:22},{x:-700,z:640,radius:24},{x:-675,z:628,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-655.7,685.7)},frame:{yaw:0,pitch:22},state:'Approaching the Forest Road roundabout at 40 mph.'},
        line:{pause:{kind:'stop',at:p(-704.9,659.3)},when:{actor:'forest-car',at:p(-703.2,645.2)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-704.9,659.3)},when:{actor:'forest-car',at:p(-739.2,652.9)},frame:{yaw:-30,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so the traffic round it knows you are not leaving at the first exits.'}},
            {kind:'required',id:'no-position',anyOf:['position-right'],fault:{level:'minor',heading:'Positioning - normal driving',title:'Not positioned for the right turn',
              message:'Approach in the right-hand part of the lane to turn right at the roundabout.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, signal right, and position for the right turn.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round from Forest Road, on your right, had just joined the roundabout and was crossing your entry. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Forest Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone by and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone by.'
        }
      ]
    }
  ]
},BEFORE));
