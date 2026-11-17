import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EXIT_CAR,KEVELIOC_CAR,ONCOMING_CAR,RING_CAR,TGR_CAR} from './woodGreenRoute1Paths';

/**
 * Wood Green (London), Lordship Lane and Tower Gardens: eight challenges from the test centre beside Woodall House on
 * Lordship Lane, left out of the test centre on to Lordship Lane, over the signal crossing by Gladstone Avenue, pulling
 * up and moving off on Lordship Lane past Walpole Road, left into Awlfield Avenue and ahead at the Tower Gardens Road
 * mini-roundabout, round by Risley Avenue and ahead at the Waltheof Avenue roundabout, right out of Kevelioc Road on to
 * Lordship Lane, and back along Lordship Lane, right into the test centre. Chosen from the map and the published
 * evidence (content/packs/wood-green-london/ROUTES.md).
 * Scene wood-green-london-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line, or the moment is set by where the car waits; leaving the test centre keeps a
 * third: a pedestrian on the footway, then a car from the right, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'boreham-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-183.2,51.9)},lights:'red',when:{actor:'boreham-pedestrian',at:p(-152.8,66.6)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Lordship Lane at 20 mph. The crossing\'s lights are red.'}},
  // (At the line: the road users the decisions wait for are set going as the car comes to its stop, so traffic on the
  // way cannot make them early; the first decision is taken where the car waits.)
  'awlfield-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(754.4,53.6)},when:{actor:'tgr-car',at:p(773.2,41)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}},
  'risley-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(449.3,-103.1)},when:{actor:'ring-car',at:p(442.6,-118.9)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Waltheof Avenue roundabout.'}},
  // (At the line: the houses on the corner hide Lordship Lane until there.)
  'kevelioc-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(329.85,99.8)},when:{actor:'kevelioc-car',at:p(311,105.1)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the end of Kevelioc Road.'}},
  // (Where the car waits to turn: the oncoming car, not the map, sets when it gets there.)
  'centre-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(-713.6,32.3)},when:{actor:'oncoming-car',at:p(-753.3,47.1)},frame:{yaw:0,pitch:40,shift:-3},
    state:'Waiting on Lordship Lane to turn right into the test centre.'}}
};

export const WOOD_GREEN_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'wood-green-london-1',
  title:'Wood Green: Lordship Lane and Tower Gardens',
  scene:'wood-green-london-route-1',
  briefing:'Wood Green, Lordship Lane and Tower Gardens: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-741.6,z:24.5,headingDeg:65},
  // The test centre's car park and way in, Lordship Lane east, Awlfield Avenue, Risley Avenue, Kevelioc Road, Lordship
  // Lane west and back into the test centre. (The last two points are off the way in and the car park aisle, on the side
  // away from Lordship Lane, so the plan takes the way in: every point of the car park is within 20 m of Lordship Lane.)
  through:pts([[-150,71],[500,110],[755,60],[758,-40],[600,-100],[380,-108],[331,-30],[329,80],[0,93],[-400,-75],[-733,14],[-753,30]]),
  // Pulled in to the kerb on Lordship Lane past Walpole Road (no cars parked along it: room for the cyclist to pass).
  // And kept left leaving the Waltheof Avenue roundabout west, clear of the post on the splitter island's nose.
  shifts:[{from:p(234.3,98.4),to:p(264.1,101.1),left:.6},{from:p(436,-104),to:p(425,-105),left:.5}],
  actors:[
    // Along the footway from the bus stop just east of the way out, across its mouth in front of the car.
    {id:'exit-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-716.96,26.98],[-729.64,32.92]])},
    {id:'exit-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(EXIT_CAR)},
    // On the crossing on Lordship Lane, from the kerb on the car's left, across in front of it.
    {id:'boreham-pedestrian',name:'pedestrian',colour:'#1d4ed8',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-152.2,65.4],[-154.4,70.2]])},
    // Behind the car along Lordship Lane, out round it at the kerb, and left into Kevelioc Road.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    // (Paced to come up to the mini-roundabout as the car stops at the line, as a driver easing up to it would.)
    {id:'tgr-car',name:'red car',colour:'#b91c1c',speed:9,waits:true,path:pts(TGR_CAR)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:8,path:pts(RING_CAR)},
    {id:'kevelioc-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(KEVELIOC_CAR)},
    {id:'oncoming-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(ONCOMING_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre, emerging left',
      where:'The test centre\'s way out, left on to Lordship Lane',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(-741.6,24.5),
      // (Both set going as the car turns into the way out: the pedestrian comes to its mouth as the car stops, the white
      // car comes after.)
      starts:[{actor:'exit-pedestrian',at:p(-730.2,21.4),delay:0},{actor:'exit-car',at:p(-730.2,21.4),delay:0}],
      endAt:p(-699.6,21.7),
      // The way out and the footway across it, Lordship Lane to the right, where the white car comes from, and to the left.
      quiet:[{x:-722,z:30,radius:16},{x:-760,z:50,radius:30},{x:-795,z:67,radius:24},{x:-695,z:18,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(-723.3,26)},when:{actor:'exit-pedestrian',at:p(-721.9,29.3)},panel:'right',frame:{yaw:40,pitch:32},
          state:'At the end of the test centre\'s way out, short of the footway on Lordship Lane.'},
        right:{pause:{kind:'stop',at:p(-723.3,26)},when:{actor:'exit-car',at:p(-750.6,45.8)},frame:{yaw:-70,pitch:32},
          state:'Still at the way out.'},
        clear:{pause:{kind:'stop',at:p(-723.3,26)},when:{actor:'exit-car',at:p(-701.8,22.8)},frame:{yaw:-30,pitch:32},
          state:'Still at the way out.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','signal-left','signal-right','give-way','go'],
          neutral:['look-right','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left first: the person walking along the footway from the bus stop was about to cross the way out in front of you.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the people on the footway and the drivers on Lordship Lane know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Drove across the footway in front of the pedestrian',
              message:'Someone was walking across the mouth of the way out, just in front of the car. People on the footway come first: wait for them to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-left','signal-left','give-way'],['signal-left','look-left','give-way'],['look-left','look-right','signal-left','give-way']],
          next:{wait:'right',go:'right'},
          explain:'Signal left and wait: someone was walking across the way out along the footway, from the bus stop on your left.'
        },
        {
          id:'right',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right as well: turning left, you join the near lane of Lordship Lane, and its traffic comes from the right.'}},
            {kind:'unsafe',id:'pulled-out-right',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The pedestrian had passed, but the white car coming along Lordship Lane from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','give-way'],['look-left','look-right','give-way'],['look-right','look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait again: the footway was clear, but the white car coming along Lordship Lane from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car came by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look left',
              message:'Look left again too: someone else may be walking to or from the bus stop across the way out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The footway and Lordship Lane were clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had passed and the footway was clear.'
        }
      ]
    },
    {
      id:'boreham-crossing',
      title:'Pedestrian crossing',
      where:'Lordship Lane, the signal crossing by Gladstone Avenue',
      instruction:'Follow the road ahead, please.',
      instructAt:p(-239.3,19),
      // (Set going as the car comes up to the crossing, so they step out as it comes, whatever traffic held it up.)
      starts:[{actor:'boreham-pedestrian',at:p(-204.8,39.3),delay:0}],
      lights:p(-160,66.6),
      endAt:p(-133.3,74.2),
      // The crossing, Lordship Lane just before it, and on towards the Boreham Road lights.
      quiet:[{x:-155,z:69,radius:22},{x:-180,z:54,radius:14},{x:-130,z:76,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(-183.2,51.9)},lights:'red',frame:{yaw:0,pitch:24},state:'On Lordship Lane at 20 mph, the signal crossing ahead.'},
        line:{pause:{kind:'stop',at:p(-164.9,62.2)},lights:'red',when:{actor:'boreham-pedestrian',at:p(-152.8,66.6)},panel:'right',frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(-164.9,62.2)},when:{actor:'boreham-pedestrian',at:p(-154.2,69.8)},frame:{yaw:0,pitch:30},
          state:'Still at the crossing. The lights have turned green.'}
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
              message:'The lights were red with someone stepping out to cross. Speeding up to get through would put them at risk.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the crossing was at red, with someone stepping out to cross.'
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
          explain:'Check the crossing both ways, then go: the lights were green and the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'lordship-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Lordship Lane, past Walpole Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(184.4,94.4),
      starts:[{actor:'cyclist',at:p(184.4,94.4),delay:0}],
      endAt:p(264.1,100.6),
      selfCancel:false,
      // The pull-up, and Lordship Lane behind it, with the mouth of Walpole Road.
      quiet:[{x:264,z:101,radius:34},{x:205,z:96,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(234.3,98.4)},frame:{yaw:-15,pitch:28},state:'On Lordship Lane at 20 mph, past Walpole Road.'},
        stopped:{pause:{kind:'stop',at:p(264.1,100.5)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past Walpole Road, clear of the junctions and the bus stops.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop opposite or within 10 metres of a junction: drivers turning out of Walpole Road or Kevelioc Road could not see past you.'}},
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
      id:'lordship-move-off',
      turn:'right',
      title:'Moving off',
      where:'Lordship Lane, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(264.1,100.6),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(184.4,94.4),delay:0}],
      endAt:p(343.9,106.9),
      quiet:[{x:264,z:101,radius:50},{x:330,z:106,radius:20}],
      place:{
        check:{pause:{kind:'stop',at:p(264.1,100.6)},when:{actor:'cyclist',at:p(248.6,101.2)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(264.1,100.6)},when:{actor:'cyclist',at:p(284.5,104.1)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist was just behind you on Lordship Lane, coming past. Let them go by before you move off. The examiner had to stop the car.'}},
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
              message:'The cyclist had gone by along Lordship Lane and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'awlfield-mini',
      title:'Mini-roundabout, ahead',
      where:'Awlfield Avenue at the Tower Gardens Road mini-roundabout, ahead',
      instruction:'At the mini-roundabout, follow the road ahead, please.',
      instructAt:p(753.1,86.5),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'tgr-car',at:p(753.5,76.5),delay:0}],
      endAt:p(757.3,14.8),
      // (And Awlfield Avenue on to Risley Avenue, narrow with cars parked along it, kept quiet until the car is at the
      // Waltheof Avenue roundabout: one coming the other way would meet it face to face.)
      quietUntil:p(472.3,-104.1),
      // The mini-roundabout, Tower Gardens Road to the right, where the red car comes from, and to the left, where it
      // goes; then Awlfield Avenue and Risley Avenue.
      quiet:[{x:756,z:42,radius:16},{x:785,z:38,radius:22},{x:725,z:46,radius:14},
        {x:757,z:-20,radius:30},{x:760,z:-70,radius:24},{x:700,z:-96,radius:35},{x:625,z:-98,radius:40},{x:545,z:-101,radius:40},{x:485,z:-103,radius:25}],
      place:{
        approach:{pause:{kind:'moving',at:p(753.6,71.5)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(754.4,53.6)},when:{actor:'tgr-car',at:p(773.2,41)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(754.4,53.6)},when:{actor:'tgr-car',at:p(731.9,45.4)},frame:{yaw:20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'No mirror on the approach',
              message:'Check the interior mirror as you slow for the mini-roundabout: you need to know how close the traffic behind is.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead along Awlfield Avenue: a left signal says you are turning into Tower Gardens Road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead along Awlfield Avenue: a right signal says you are turning into Tower Gardens Road towards Cumberton Road.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the red car was coming along Tower Gardens Road to it from the right.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left']],
          next:{then:'line'},
          explain:'Interior mirror and no signal: you were going ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming along Tower Gardens Road, on your right, was at the mini-roundabout, going ahead across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming along Tower Gardens Road, on your right, was there first, going across in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went across. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone on along Tower Gardens Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go ahead: the red car had gone.'
        }
      ]
    },
    {
      id:'risley-roundabout',
      title:'Roundabout, ahead',
      where:'Risley Avenue at the Waltheof Avenue roundabout, second exit on along Risley Avenue',
      instruction:'At the roundabout, take the second exit, please.',
      instructAt:p(502.1,-101.9),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(472.3,-104.1),delay:0}],
      endAt:p(423.9,-104.9),
      // (And Risley Avenue on and Kevelioc Road, narrow with cars parked along them, kept quiet until the car is at the
      // end of Kevelioc Road.)
      quietUntil:p(329.85,99.8),
      // The roundabout's entry, Waltheof Avenue to the right, where the black car comes from, and south, where it goes,
      // Risley Avenue on to the west; then Kevelioc Road.
      quiet:[{x:440,z:-105,radius:14},{x:443,z:-138,radius:20},{x:440,z:-75,radius:18},{x:410,z:-106,radius:20},
        {x:360,z:-106,radius:24},{x:335,z:-65,radius:30},{x:332,z:-10,radius:30},{x:330,z:45,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(472.3,-104.1)},frame:{yaw:0,pitch:22},state:'Approaching the Waltheof Avenue roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(449.3,-103.1)},when:{actor:'ring-car',at:p(442.6,-118.9)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(449.3,-103.1)},when:{actor:'ring-car',at:p(441.1,-87.2)},frame:{yaw:-20,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'No mirror on the approach',
              message:'Check the interior mirror as you slow for the roundabout: you need to know how close the traffic behind is.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signalled left too early',
              message:'For the second exit, going ahead, give no signal on the approach: signal left only once you pass the exit before yours.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round to Waltheof Avenue north: anyone waiting there would be misled.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: a car was coming to it down Waltheof Avenue, on your right.'}}
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
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming down Waltheof Avenue, on your right, was at the roundabout, going round across your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming down Waltheof Avenue, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on down Waltheof Avenue and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on down Waltheof Avenue.'
        }
      ]
    },
    {
      id:'kevelioc-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Kevelioc Road, right on to Lordship Lane',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(330.7,52),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'kevelioc-car',at:p(329,76.9),delay:0}],
      endAt:p(299.3,107.6),
      // The junction, Lordship Lane to the right, where the grey car comes from, and to the left.
      quiet:[{x:329,z:107,radius:22},{x:290,z:104,radius:30},{x:365,z:108,radius:28}],
      place:{
        approach:{pause:{kind:'moving',at:p(329.5,81.9)},frame:{yaw:0,pitch:22},state:'Approaching the end of Kevelioc Road at 20 mph.'},
        line:{pause:{kind:'stop',at:p(329.85,99.8)},when:{actor:'kevelioc-car',at:p(311,105.1)},frame:{yaw:-60,pitch:28},state:'At the end of Kevelioc Road.'},
        clear:{pause:{kind:'stop',at:p(329.85,99.8)},when:{actor:'kevelioc-car',at:p(361.9,107.3)},frame:{yaw:-20,pitch:28},state:'Still at the end of Kevelioc Road.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Lordship Lane knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Lordship Lane, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the grey car',
              message:'The grey car coming along Lordship Lane from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the grey car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the grey car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the grey car coming along Lordship Lane from the right was close, in the lane you were crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the grey car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and Lordship Lane was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the grey car had gone by and Lordship Lane was clear both ways.'
        }
      ]
    },
    {
      id:'centre-right',
      turn:'right',
      title:'Right turn into the test centre',
      where:'Lordship Lane, right into the test centre',
      instruction:'Turn right into the test centre, please.',
      instructAt:p(-649.2,0.1),
      // (Set going as the direction is given: paced to come along as the car waits to turn.)
      starts:[{actor:'oncoming-car',at:p(-649.2,0.1),delay:0}],
      endAt:p(-727.6,25.5),
      // The way in, the junction, and Lordship Lane ahead, where the oncoming blue car comes from.
      quiet:[{x:-724,z:28,radius:14},{x:-716,z:32,radius:16},{x:-752,z:47,radius:26},{x:-795,z:67,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-684.7,18.5)},frame:{yaw:0,pitch:20},state:'On Lordship Lane at 20 mph, the test centre\'s way in ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(-713.6,32.3)},when:{actor:'oncoming-car',at:p(-753.3,47.1)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into the test centre.'},
        clear:{pause:{kind:'stop',at:p(-713.6,32.3)},when:{actor:'oncoming-car',at:p(-704.5,24.1)},frame:{yaw:-30,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming blue car',
              message:'The blue car coming along Lordship Lane towards you was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the blue car coming the other way along Lordship Lane was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into the way in',
              message:'Before you turn, look into the way in (on your right) for anyone walking across it or a car coming out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming along Lordship Lane: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check the way in is clear, then turn: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
