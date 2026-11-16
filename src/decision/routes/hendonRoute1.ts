import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {AERO_CAR,BURROUGHS_VAN,CYCLIST,GPW_CAR,GPW_ONCOMING} from './hendonRoute1Paths';

/**
 * Hendon route 1, Greyhound Hill, The Burroughs and Watford Way: eight challenges from the test centre at 3 Aviation
 * Drive, Beaufort Park, down Caversham Road and left on to Aerodrome Road, ahead at the Watford Way lights into
 * Greyhound Hill, Church End, right on to The Burroughs, pulling up and moving off, Watford Way back north, left at
 * the lights into Aerodrome Road over its pedestrian crossing, right at the Grahame Park Way roundabout, right into
 * Heritage Avenue, and home by Boulevard Drive. Chosen from the map and the published evidence
 * (content/packs/hendon-london/ROUTES.md). Scene hendon-london-route-1 (OpenStreetMap). A practice route, not a
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
 * the hazard is in view only at the line. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the flats on the corner hide Aerodrome Road to the right until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-541.5,-262.1)},when:{actor:'aero-car',at:p(-553.5,-259.5)},frame:{yaw:-65,pitch:40,shift:-4},
    state:'At the end of Caversham Road.'}},
  'aerodrome-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-188.3,-132.3)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Watford Way lights. They are red.'}},
  // (At the line: the buildings on the corner hide Church Road to the left until there.)
  'church-end-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(375.3,209.3)},when:{actor:'burroughs-van',at:p(404.9,223.2)},frame:{yaw:60,pitch:40,shift:4},
    state:'At the end of Church End.'}},
  'aerodrome-left':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(-153.7,-74)},when:{actor:'aerodrome-pedestrian',at:p(-158.1,-120.4)},frame:{yaw:10,pitch:40,shift:4},
    state:'Approaching the Aerodrome Road lights on green, in the left lane.'}},
  // (At the line, as the Beverley roundabout at Morden: the car coming round is in view only from there.)
  'gpw-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-1014.9,-466.2)},when:{actor:'gpw-car',at:p(-1003,-492.5)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Grahame Park Way roundabout.'}},
  'heritage-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(-762.3,-537.7)},when:{actor:'gpw-oncoming',at:p(-707.9,-544)},frame:{yaw:0,pitch:40,shift:-4},
    state:'On Grahame Park Way, Heritage Avenue just ahead on the right.'}}
};

export const HENDON_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'hendon-london-1',
  title:'Hendon route 1',
  scene:'hendon-london-route-1',
  briefing:'Hendon route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-532.4,z:-461.4,headingDeg:181.8},
  // Aviation Drive, Caversham Road, Aerodrome Road, Greyhound Hill, Church End, The Burroughs, Watford Way, Aerodrome
  // Road, the Grahame Park Way roundabout, Grahame Park Way, Heritage Avenue, Boulevard Drive and back up Aviation Drive.
  through:pts([[-540,-330],[-300,-165],[100,20],[350,150],[250,410],[-199,145],[-300,-165],[-650,-310],[-970,-445],[-850,-540],
    [-740,-536],[-721,-500],[-620,-440],[-531,-473]]),
  // Pulled in to the kerb on The Burroughs, past Egerton Gardens (no cars parked along it: room for the cyclist to pass).
  // And kept a little left coming down Heritage Avenue to its roundabout, clear of the bollard on the splitter island.
  shifts:[{from:p(211.9,467.1),to:p(194.2,491.4),left:.35},{from:p(-718.6,-474.3),to:p(-720,-462.9),left:.4}],
  actors:[
    {id:'aero-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(AERO_CAR)},
    {id:'burroughs-van',name:'white van',colour:'#f5f5f4',speed:10,path:pts(BURROUGHS_VAN)},
    // Behind the car along The Burroughs, past it at the kerb, and right into Burroughs Gardens.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',yields:true,path:pts(CYCLIST)},
    // Crossing the mouth of Aerodrome Road, from the far side, as the car comes to turn in.
    {id:'aerodrome-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-157.1,-123.1],[-160.3,-114.3]])},
    {id:'gpw-car',name:'black car',colour:'#1f2328',speed:9,path:pts(GPW_CAR)},
    {id:'gpw-oncoming',name:'silver car',colour:'#c3c7cf',speed:9,path:pts(GPW_ONCOMING)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Emerging, left turn',
      where:'Out of the test centre, down Caversham Road and left on to Aerodrome Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-533.3,-441.4),
      starts:[{actor:'aero-car',at:p(-537.2,-341.6),delay:0}],
      endAt:p(-497.8,-229.9),
      // The junction, Aerodrome Road to the right (west), where the blue car comes from, and on to the east, where it goes.
      quiet:[{x:-541,z:-255,radius:24},{x:-600,z:-285,radius:40},{x:-490,z:-226,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-538.3,-291.7)},frame:{yaw:0,pitch:22},state:'Approaching the end of Caversham Road at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-541.5,-262.1)},when:{actor:'aero-car',at:p(-553.5,-259.5)},frame:{yaw:-65,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-541.5,-262.1)},when:{actor:'aero-car',at:p(-490.3,-226.5)},frame:{yaw:-30,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Aerodrome Road knows where you are going.'}},
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming along Aerodrome Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming along Aerodrome Road from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking on your side of Aerodrome Road, coming towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Aerodrome Road was clear.'
        }
      ]
    },
    {
      id:'aerodrome-lights',
      title:'Traffic lights, ahead',
      where:'Aerodrome Road at the Watford Way lights, ahead into Greyhound Hill',
      instruction:'At the traffic lights, follow the road ahead, please.',
      instructAt:p(-345.6,-181.9),
      starts:[],
      lights:p(-162.4,-122),
      endAt:p(-95.6,-70.6),
      // The junction (both carriageways of Watford Way), and the start of Greyhound Hill beyond it.
      quiet:[{x:-140,z:-100,radius:36},{x:-195,z:-135,radius:22},{x:-100,z:-72,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-188.3,-132.3)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the lights at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-166,-123.5)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-166,-123.5)},lights:'red',frame:{yaw:0,pitch:28},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-left','signal-right'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic on Watford Way, a 50 mph dual carriageway, at risk.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Greyhound Hill: a left signal says you are turning on to Watford Way.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Greyhound Hill: a right signal says you are turning on to Watford Way.'}}
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
              message:'Green means go only if the way is clear. Watford Way is two carriageways: look along both for anyone late through the lights before you cross.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the junction was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look along both carriageways of Watford Way, then go: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'church-end-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Church End, right on to The Burroughs',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(356.4,119.5),
      starts:[{actor:'burroughs-van',at:p(364.4,148.3),delay:0}],
      endAt:p(321.6,234.7),
      // The junction, Church Road to the left (east), where the white van comes from, and The Burroughs, where it goes.
      quiet:[{x:374,z:222,radius:22},{x:318,z:245,radius:36},{x:430,z:220,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(370.3,177.7)},frame:{yaw:0,pitch:22},state:'Approaching the end of Church End at 15 mph.'},
        line:{pause:{kind:'stop',at:p(375.3,209.3)},when:{actor:'burroughs-van',at:p(404.9,223.2)},frame:{yaw:60,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(375.3,209.3)},when:{actor:'burroughs-van',at:p(311.1,244.4)},frame:{yaw:-30,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on The Burroughs and Church Road knows where you are going.'}},
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
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left too: turning right, you join the far lane, and its traffic comes along Church Road from the left.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white van',
              message:'The right was clear, but the white van coming along Church Road from the left was close, going on down The Burroughs in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white van\'s way',
              message:'The view was already clear: creeping forward only puts the front of the car into the near lane, in the way of anything coming up The Burroughs, while you wait for the van.'}}
          ],
          accepted:[['look-right','look-left','give-way'],['look-left','look-right','give-way'],['look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the right was clear, but the white van coming along Church Road from the left was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left along Church Road for traffic coming towards it before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before you waited for the white van. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The Burroughs and Church Road were clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: the road was clear both ways.'
        }
      ]
    },
    {
      id:'burroughs-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'The Burroughs, past Egerton Gardens',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(260.4,380.2),
      starts:[{actor:'cyclist',at:p(260.4,380.2),delay:0}],
      endAt:p(194.2,491.4),
      selfCancel:false,
      quiet:[{x:194,z:491,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(223.7,451)},frame:{yaw:-15,pitch:28},state:'On The Burroughs at 20 mph, Egerton Gardens just on the left.'},
        stopped:{pause:{kind:'stop',at:p(194.2,491.4)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Egerton Gardens, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Egerton Gardens could not see past you, and those turning in would meet you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Egerton Gardens; mirrors, then signal left.'
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
      id:'burroughs-move-off',
      turn:'right',
      title:'Moving off',
      where:'The Burroughs, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(194.2,491.4),
      // (Along The Burroughs behind the car as it comes to pull up.)
      starts:[{actor:'cyclist',at:p(260.4,380.2),delay:0}],
      endAt:p(163.1,542.3),
      quiet:[{x:194,z:491,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(194.2,491.4)},when:{actor:'cyclist',at:p(200.3,479.3)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(194.2,491.4)},when:{actor:'cyclist',at:p(176.2,516.3)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist coming along The Burroughs was just behind your right shoulder, about to pass. The examiner had to stop the car.'}},
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
      id:'aerodrome-left',
      turn:'left',
      title:'Traffic lights and pedestrian crossing, left turn',
      where:'Watford Way at the Aerodrome Road lights, left into Aerodrome Road over its pedestrian crossing',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(-185.2,62.3),
      starts:[{actor:'aerodrome-pedestrian',at:p(-161.5,-45),delay:0}],
      lights:p(-147.6,-87.4),
      endAt:p(-208.9,-135.7),
      // The car's side of the junction (Watford Way's northbound carriageway and the mouth of Aerodrome Road the
      // pedestrian crosses); not the southbound carriageway, whose traffic goes on through on the same green.
      quiet:[{x:-158,z:-113,radius:16},{x:-150,z:-92,radius:9},{x:-178,z:-125,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(-163.7,-35.3)},frame:{yaw:0,pitch:22},state:'On Watford Way, the Aerodrome Road lights ahead on green.'},
        centre:{pause:{kind:'moving',at:p(-153.7,-74)},when:{actor:'aerodrome-pedestrian',at:p(-158.1,-120.4)},frame:{yaw:10,pitch:30},
          state:'Approaching the lights on green, in the left lane.'},
        clear:{pause:{kind:'stop',at:p(-150.5,-115.1)},when:{actor:'aerodrome-pedestrian',at:p(-160.3,-114.3)},frame:{yaw:0,pitch:30},
          state:'Waiting in the mouth of Aerodrome Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','slow-down'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left in good time on a fast road, so the traffic behind you knows you are slowing to turn.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left'],['mirror-interior','mirror-left','signal-left','slow-down']],
          next:{then:'centre'},
          explain:'Interior and left mirrors, then signal left, in good time on a 50 mph road.'
        },
        {
          id:'centre',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go','horn'],
          neutral:['look-right','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look into the road you are turning into first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Turned in with someone crossing',
              message:'The pedestrian crossing the mouth of Aerodrome Road was walking into your lane. People crossing a road you turn into have priority, on green too. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-left','give-way'],['mirror-left','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way, even on green: the pedestrian crossing the mouth of Aerodrome Road was walking into your lane.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go'],
          neutral:['look-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into the road',
              message:'Look into Aerodrome Road again before you go: someone else may have stepped out behind the pedestrian.'}},
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror',
              message:'Check the left mirror before you turn in: a cyclist can come up on your left while you wait.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe chance to go',
              message:'The pedestrian was across and the lights were still green: this was the time to go.'}}
          ],
          accepted:[['mirror-left','look-left','go'],['look-left','mirror-left','go'],['look-right','mirror-left','look-left','go']],
          next:{go:'done'},
          explain:'Left mirror, look into Aerodrome Road again, then go: the pedestrian was across.'
        }
      ]
    },
    {
      id:'gpw-roundabout',
      turn:'right',
      title:'Roundabout, right (third exit)',
      where:'Aerodrome Road at the Grahame Park Way roundabout, third exit on to Grahame Park Way',
      instruction:'At the roundabout, take the third exit, that\'s to the right.',
      // (Said close in, as Beverley at Morden: the roundabout is kept clear of traffic from 150 m before this point, and
      // traffic queuing to enter it ahead of the car would hold the car back.)
      instructAt:p(-974.2,-445.1),
      starts:[{actor:'gpw-car',at:p(-974.2,-445.1),delay:0}],
      endAt:p(-1008.6,-527.3),
      // The roundabout, and Grahame Park Way's way in, where the black car comes from.
      quiet:[{x:-1022,z:-498,radius:30},{x:-965,z:-515,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-1001.2,-458)},frame:{yaw:0,pitch:22},state:'Approaching the roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-1014.9,-466.2)},when:{actor:'gpw-car',at:p(-1003,-492.5)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-1014.9,-466.2)},when:{actor:'gpw-car',at:p(-1075.6,-475.6)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the third exit',
              message:'Taking an exit past twelve o\'clock, signal right on the approach so the traffic on the roundabout knows you are going round.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right'],['mirror-interior','mirror-right','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right: you were going round to the third exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round from Grahame Park Way, on your right, was close and passing your entry. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Grahame Park Way, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone off into Colindale Avenue and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone off into Colindale Avenue.'
        }
      ]
    },
    {
      id:'heritage-right',
      turn:'right',
      title:'Right turn',
      where:'Grahame Park Way, right into Heritage Avenue',
      instruction:'Take the next road on the right, please.',
      instructAt:p(-840.3,-536.6),
      // (Set going late, so it comes down Grahame Park Way as the car comes to wait, not before.)
      starts:[{actor:'gpw-oncoming',at:p(-780.3,-536.6),delay:1}],
      endAt:p(-718.9,-469.1),
      // The junction, Grahame Park Way ahead, where the oncoming silver car comes from, and the mouth of Heritage Avenue.
      quiet:[{x:-722,z:-540,radius:20},{x:-690,z:-553,radius:26},{x:-718,z:-522,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(-800,-536.4)},frame:{yaw:0,pitch:20},state:'On Grahame Park Way at 30 mph, Heritage Avenue ahead on the right.'},
        centre:{pause:{kind:'moving',at:p(-762.3,-537.7)},when:{actor:'gpw-oncoming',at:p(-707.9,-544)},frame:{yaw:0,pitch:32},
          state:'Coming to turn right into Heritage Avenue.'},
        clear:{pause:{kind:'stop',at:p(-736.5,-540.6)},when:{actor:'gpw-oncoming',at:p(-766.3,-534.4)},frame:{yaw:-30,pitch:32},
          state:'Waiting to turn right.'}
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
              message:'The silver car coming down Grahame Park Way was going on past Heritage Avenue, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the silver car coming the other way was going on past Heritage Avenue, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Heritage Avenue',
              message:'Before you turn, look into Heritage Avenue (on your right) for anyone crossing its mouth or a car coming out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Heritage Avenue is clear, then turn: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
