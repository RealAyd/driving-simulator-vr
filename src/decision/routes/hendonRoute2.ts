import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {AERO_EAST,AERO_WEST,BOOTH_CAR,LANACRE_CAR,MONTROSE_CAR,RING_AERO,RING_CAR} from './hendonRoute2Paths';

/**
 * Hendon route 2, Colindale, Booth Road and Lanacre Avenue: eight challenges from the test centre at 3 Aviation Drive,
 * Beaufort Park, down Caversham Road and right on to Aerodrome Road, left at the Grahame Park Way roundabout into
 * Colindale Avenue and right into Booth Road, pulling up and moving off, right on to Montrose Avenue, Lanacre Avenue
 * ahead over the Heywood Avenue mini-roundabout, down Bristol Avenue over its zebra crossing, left at the Grahame Park
 * Way roundabout on to Aerodrome Road, and home by Caversham Road. Chosen from the map and the published evidence
 * (content/packs/hendon-london/ROUTES.md). Scene hendon-london-route-2 (OpenStreetMap). A practice route, not a
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
 * the hazard is in view only at the line; leaving the test centre keeps a third: a car from the right, then one from
 * the left, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the roundabout's traffic is in view only from there.)
  'colindale-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(85.2,283.4)},when:{actor:'ring-car',at:p(94.2,265.1)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Grahame Park Way roundabout.'}},
  // (At the line: the houses on the corner hide Montrose Avenue to the right until there.)
  'booth-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-650.4,-230.2)},when:{actor:'montrose-car',at:p(-651.8,-251.7)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Booth Road.'}},
  'heywood-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-294.2,-280.9)},when:{actor:'lanacre-car',at:p(-280.5,-283.6)},frame:{yaw:10,pitch:40},
    state:'At the give way line of the mini-roundabout.'}},
  'bristol-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(192.2,-31.2)},when:{actor:'zebra-pedestrian',at:p(194.9,-8.3)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Bristol Avenue, the zebra crossing just ahead.'}},
  'aerodrome-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(103.2,246.8)},when:{actor:'ring-aero',at:p(80.2,231.4)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Grahame Park Way roundabout.'}}
};

export const HENDON_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'hendon-london-2',
  title:'Hendon route 2',
  scene:'hendon-london-route-2',
  briefing:'Hendon route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:568.52,z:288.94,headingDeg:181.78},
  // Aviation Drive, Caversham Road, Aerodrome Road, the Grahame Park Way roundabout, Colindale Avenue, Booth Road,
  // Montrose Avenue, Lanacre Avenue, Bristol Avenue, Grahame Park Way, the roundabout, Aerodrome Road, Caversham Road and
  // back up Aviation Drive.
  through:pts([[560,420],[350,385],[130,312],[-232.6,89.6],[-654.3,-232.4],[-643.4,-269.6],[-465.8,-409.4],[-117.2,-270.9],[163.1,-220.9],
    [187.7,167.1],[131.9,230.4],[300,362],[560,420],[567,272]]),
  // Pulled in to the kerb on Booth Road (no cars parked along it: room for the grey car to pass).
  // (And eased left round the corner from Bristol Avenue's one-way link on to Grahame Park Way: the planned line cut it.)
  shifts:[{from:p(-88.5,176.7),to:p(-106.8,153),left:.35},{from:p(180.9,212.7),to:p(162.8,224.5),left:1.2}],
  actors:[
    {id:'aero-east',name:'white car',colour:'#e5e7eb',speed:9,path:pts(AERO_EAST)},
    {id:'aero-west',name:'blue car',colour:'#2563eb',speed:9,path:pts(AERO_WEST)},
    {id:'ring-car',name:'silver car',colour:'#c3c7cf',speed:9,path:pts(RING_CAR)},
    // Behind the car along Booth Road, to its pull-up, past it, and on round the bend.
    {id:'booth-car',name:'grey car',colour:'#8a9099',speed:9,yields:true,path:pts(BOOTH_CAR)},
    {id:'montrose-car',name:'black car',colour:'#1f2328',speed:9,path:pts(MONTROSE_CAR)},
    {id:'lanacre-car',name:'red car',colour:'#b91c1c',speed:8,path:pts(LANACRE_CAR)},
    // Waiting at the Bristol Avenue zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[197.1,-8.3],[187.7,-8.3]])},
    {id:'ring-aero',name:'green car',colour:'#15803d',speed:9,path:pts(RING_AERO)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Emerging, right turn',
      where:'Out of the test centre, down Caversham Road and right on to Aerodrome Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(567.6,308.9),
      starts:[{actor:'aero-east',at:p(563.7,408.7),delay:0},{actor:'aero-west',at:p(562.7,473.6),delay:6}],
      endAt:p(509.9,472.5),
      // The junction, Aerodrome Road to the right (west), where the white car comes from, and to the left (east), where
      // the blue car comes from.
      quiet:[{x:559,z:496,radius:24},{x:500,z:465,radius:40},{x:610,z:525,radius:34}],
      place:{
        line:{pause:{kind:'stop',at:p(559.5,488.2)},when:{actor:'aero-east',at:p(538.7,485.9)},frame:{yaw:-70,pitch:32},
          state:'At the end of Caversham Road.'},
        left:{pause:{kind:'stop',at:p(559.5,488.2)},when:{actor:'aero-west',at:p(569.3,506.2)},frame:{yaw:60,pitch:32},
          state:'Still at the end of Caversham Road.'},
        clear:{pause:{kind:'stop',at:p(559.5,488.2)},when:{actor:'aero-west',at:p(489.1,460.1)},frame:{yaw:-30,pitch:32},
          state:'Still at the end of Caversham Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Aerodrome Road, which you cross, comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Aerodrome Road know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Aerodrome Road from the right was a second or two away in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'left',go:'left'},
          explain:'Signal right and wait: the white car coming along Aerodrome Road from the right was close, in the lane you were crossing.'
        },
        {
          id:'left',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-right','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left as well: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'unsafe',id:'pulled-out-left',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The white car had passed, but the blue car coming along Aerodrome Road from the left was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait again: the right was clear, but the blue car coming from the left was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car came by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look left',
              message:'Look left again too: more traffic may be coming along from Watford Way.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Aerodrome Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Aerodrome Road was clear both ways.'
        }
      ]
    },
    {
      id:'colindale-roundabout',
      turn:'left',
      title:'Roundabout, left (first exit)',
      where:'Aerodrome Road at the Grahame Park Way roundabout, first exit into Colindale Avenue',
      instruction:'At the roundabout, take the first exit, that\'s to the left.',
      instructAt:p(152.2,316.5),
      starts:[{actor:'ring-car',at:p(152.2,316.5),delay:0}],
      endAt:p(28.5,271.8),
      // The roundabout, and Grahame Park Way's way in, where the silver car comes from.
      quiet:[{x:78,z:252,radius:30},{x:140,z:228,radius:38}],
      place:{
        approach:{pause:{kind:'moving',at:p(117.8,300.6)},frame:{yaw:0,pitch:22},state:'Approaching the roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(85.2,283.4)},when:{actor:'ring-car',at:p(94.2,265.1)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(85.2,283.4)},when:{actor:'ring-car',at:p(31.1,270.2)},frame:{yaw:10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'Signal left on the approach for the first exit, so the traffic on the roundabout and behind you knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
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
              message:'Look right first: at a roundabout you give way to traffic coming round from the right, even when you are leaving at the first exit.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car coming round from Grahame Park Way, on your right, was close and passing your entry. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the silver car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the silver car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the silver car coming round from Grahame Park Way, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The silver car had gone off into Colindale Avenue and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the silver car had gone off and nothing more was coming round.'
        }
      ]
    },
    {
      id:'booth-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Booth Road, past Colindale Avenue',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-77.6,191.1),
      starts:[{actor:'booth-car',at:p(-77.6,191.1),delay:0}],
      endAt:p(-106.8,153),
      selfCancel:false,
      quiet:[{x:-107,z:153,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-93.3,170.4)},frame:{yaw:-15,pitch:28},state:'On Booth Road at 25 mph.'},
        stopped:{pause:{kind:'stop',at:p(-106.8,153)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','signal-left','signal-right','stop-at-junction','stop-past-junction'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal to pull in',
              message:'Signal left before you pull in, so the grey car behind knows you are stopping.'}},
            {kind:'required',id:'place',anyOf:['stop-past-junction'],fault:{level:'serious',heading:'Normal stops',title:'No safe place chosen',
              message:'Choose where to stop before you pull in: well along Booth Road, clear of the junction with Colindale Avenue and of the bend.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning in from Colindale Avenue would come round the corner on to you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well clear of the junction and the bend; mirrors, then signal left.'
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
      id:'booth-move-off',
      turn:'right',
      title:'Moving off',
      where:'Booth Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-106.8,153),
      // (Along Booth Road behind the car as it comes to pull up.)
      starts:[{actor:'booth-car',at:p(-77.6,191.1),delay:0}],
      endAt:p(-164.7,103.3),
      quiet:[{x:-107,z:153,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-106.8,153)},when:{actor:'booth-car',at:p(-95.5,164.5)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-106.8,153)},when:{actor:'booth-car',at:p(-130.9,120.2)},frame:{yaw:-170,pitch:26},
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
              message:'The grey car coming along Booth Road was just behind you, pulling out to pass. The examiner had to stop the car.'}},
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
      id:'booth-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Booth Road, right on to Montrose Avenue',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-572.6,-197.1),
      starts:[{actor:'montrose-car',at:p(-590.4,-202.4),delay:0}],
      endAt:p(-633.2,-289.8),
      // The junction, Montrose Avenue to the right (north), where the black car comes from, and to the south, where it goes.
      quiet:[{x:-658,z:-238,radius:24},{x:-640,z:-280,radius:36},{x:-685,z:-195,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-617.1,-211.9)},frame:{yaw:0,pitch:22},state:'Approaching the end of Booth Road at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-650.4,-230.2)},when:{actor:'montrose-car',at:p(-651.8,-251.7)},frame:{yaw:-70,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-650.4,-230.2)},when:{actor:'montrose-car',at:p(-681,-200)},frame:{yaw:-30,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Montrose Avenue knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Montrose Avenue comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming down Montrose Avenue from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming down Montrose Avenue from the right was close, in the lane you were crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Turning right, you join the far lane: look left for traffic coming up Montrose Avenue before you go.'}},
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Montrose Avenue was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right, left and right again, then go: Montrose Avenue was clear both ways.'
        }
      ]
    },
    {
      id:'heywood-mini',
      title:'Mini-roundabout, ahead',
      where:'Lanacre Avenue at the Heywood Avenue mini-roundabout, ahead',
      instruction:'At the mini-roundabout, follow the road ahead, please.',
      instructAt:p(-365.7,-303.2),
      starts:[{actor:'lanacre-car',at:p(-352.9,-295.5),delay:0}],
      endAt:p(-223.2,-277.5),
      // The mini-roundabout, and Heywood Avenue on the left, where the red car comes from.
      quiet:[{x:-282,z:-279,radius:24},{x:-280,z:-315,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-319.8,-284.4)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-294.2,-280.9)},when:{actor:'lanacre-car',at:p(-280.5,-283.6)},frame:{yaw:10,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-294.2,-280.9)},when:{actor:'lanacre-car',at:p(-311.7,-278.9)},frame:{yaw:0,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','slow-down'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead along Lanacre Avenue: a left signal says you are turning into Heywood Avenue.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead: a right signal says you are going round the mini-roundabout.'}}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror and slow down; no signal: you were going ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look left into Heywood Avenue: the red car coming out of it was already on the mini-roundabout.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Drove into the red car\'s way',
              message:'The red car out of Heywood Avenue was already on the mini-roundabout, going round in front of you. Give way to traffic on it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept on to the mini-roundabout',
              message:'Creeping forward puts the front of the car into the way of the red car going round.'}}
          ],
          accepted:[['look-left','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car out of Heywood Avenue was already on the mini-roundabout, going round in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look into Heywood Avenue',
              message:'Look left into Heywood Avenue again before you go: another car may be coming out behind the red one.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone off along Lanacre Avenue and nothing else was coming: this was the time to go.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','look-left','go'],['look-left','go']],
          next:{go:'done'},
          explain:'Look into Heywood Avenue and along Lanacre Avenue again, then go: the red car had gone.'
        }
      ]
    },
    {
      id:'bristol-zebra',
      title:'Zebra crossing',
      where:'Bristol Avenue, the zebra crossing past Lanacre Avenue',
      instruction:'Follow the road ahead, please.',
      instructAt:p(172.5,-59.1),
      starts:[{actor:'zebra-pedestrian',at:p(182.1,-50.3),delay:0}],
      endAt:p(192.6,63.6),
      quiet:[{x:192,z:-8,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(192.2,-31.2)},frame:{yaw:0,pitch:22},state:'On Bristol Avenue at 20 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(193.9,-19.3)},when:{actor:'zebra-pedestrian',at:p(192.4,-8.3)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(193.9,-19.3)},when:{actor:'zebra-pedestrian',at:p(188.3,-8.3)},frame:{yaw:0,pitch:30},
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
      id:'aerodrome-roundabout',
      turn:'left',
      title:'Roundabout, left (first exit)',
      where:'Grahame Park Way at the roundabout, first exit on to Aerodrome Road',
      instruction:'At the roundabout, take the first exit, that\'s to the left.',
      instructAt:p(162.8,224.5),
      starts:[{actor:'ring-aero',at:p(182.4,202.8),delay:0}],
      endAt:p(116.9,298.8),
      // The roundabout, and Colindale Avenue's way in, where the green car comes from.
      quiet:[{x:78,z:252,radius:34},{x:30,z:275,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(138.2,228.3)},frame:{yaw:0,pitch:22},state:'Approaching the roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(103.2,246.8)},when:{actor:'ring-aero',at:p(80.2,231.4)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(103.2,246.8)},when:{actor:'ring-aero',at:p(112.5,295.7)},frame:{yaw:30,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'Signal left on the approach for the first exit, so the traffic on the roundabout and behind you knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT}
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming round from Colindale Avenue, on your right, was close and passing your entry on its way to Aerodrome Road, the exit you were taking. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming round from Colindale Avenue, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone off along Aerodrome Road and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the green car had gone off along Aerodrome Road.'
        }
      ]
    }
  ]
},BEFORE));
