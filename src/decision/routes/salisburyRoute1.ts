import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {DENISON_CAR,FOLLOW_CAR,KELSEY_CYCLIST,LONDON_CAR,MANOR_CAR} from './salisburyRoute1Paths';

/**
 * Salisbury route 1, St Mark's and Bishopdown: eight challenges from the test centre on Rougemont Close, left on to
 * Manor Road, by Fairview Road, Kelsey Road and Bourne Avenue to St Mark's Roundabout, St Mark's Avenue and Bishopdown
 * Road, Denison Rise, Barrington Road, right at the lights on to London Road, back round St Mark's Roundabout, and home
 * by Wain-a-long Road, Kelsey Road and Manor Road. Chosen from the map and the roads public information names (content/packs/salisbury/ROUTES.md). Scene
 * salisbury-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
  // (At the line: the houses on the corner hide Manor Road to the right until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-240.4,611.8)},when:{actor:'manor-car',at:p(-235.2,639.8)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the end of Rougemont Close.'}},
  'st-marks-roundabout':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-141,347.2)},when:{actor:'london-car',at:p(-162.5,321.5)},frame:{yaw:-40,pitch:44,shift:-4},
    state:'Approaching St Mark\'s Roundabout from Bourne Avenue.'}},
  'bishopdown-mini':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-191.5,-606.9)},when:{actor:'denison-car',at:p(-155.3,-606.3)},frame:{yaw:-30,pitch:44,shift:-4},
    state:'Approaching the mini-roundabout at Denison Rise.'}},
  'barrington-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(179.4,-400.5)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the London Road lights. They are red.'}},
  'london-road-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(-144.4,286.2)},lights:'red',when:{actor:'crossing-pedestrian',at:p(-157,308.2)},panel:'right',frame:{yaw:0,pitch:44,shift:5},
    state:'On London Road, the crossing at St Mark\'s Roundabout just ahead. The lights are red.'}},
  'kelsey-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(-222.3,729.1)},when:{actor:'kelsey-cyclist',at:p(-283.7,740.1)},frame:{yaw:0,pitch:44,shift:-4},
    state:'On Kelsey Road, Manor Road just ahead on the right.'}}
};

export const SALISBURY_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'salisbury-1',
  title:'Salisbury route 1',
  scene:'salisbury-route-1',
  briefing:'Salisbury route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-270.7,z:598.6,headingDeg:115},
  // Rougemont Close, Manor Road, Fairview Road, Kelsey Road, Bourne Avenue, St Mark's Roundabout, St Mark's Avenue,
  // Bishopdown Road, Denison Rise (pulling up and moving off), Barrington Road, London Road, St Mark's Roundabout,
  // Wain-a-long Road, round the Bourne Avenue mini-roundabout, Kelsey Road, Manor Road and back into Rougemont Close.
  // (St Mark's Roundabout is entered from Bourne Avenue: from Wain-a-long Road the turn into the entry is too tight for
  // the car round the island in the map.)
  through:pts([[-214,500],[-164.6,600],[-120,715],[40,730],[88,650],[-39.5,399],[-110,345],[-199.8,166],[-295.8,-410],[-161.8,-623],[-19.8,-550],[129.2,-538],[135,-460],[175,-405],[50,-100],[-100,200],
    [-153,400],[-54.5,566.3],[40,664],[0,726],[-100,714],[-200,727],[-242,690],[-262,601]]),
  // Wide of the corner from Fairview Road into Kelsey Road; clear of the island nose in the entry to St Mark's
  // Roundabout, and of the corner leaving it for St Mark's Avenue; pulled in to the kerb on Denison Rise, past Linkway
  // (the cars parked there are on the far side).
  shifts:[{from:p(-166.2,714.7),to:p(-162.3,717.9),left:-.6},{from:p(-157.8,353.5),to:p(-161.6,354.8),left:.8},{from:p(-209,306),to:p(-205.2,304),left:-1.2},{from:p(-80.7,-511),to:p(-67.1,-513.6),left:.35},
    // Wide of the island turning right out of Barrington Road on to London Road, of the lamp column in the narrow
    // one-way piece of Kelsey Road by Bourne Avenue, and of the corner from Manor Road into Rougemont Close.
    {from:p(205.1,-375.2),to:p(207.2,-367.7),left:.6},{from:p(15.1,729.1),to:p(11.2,730),left:-.35},{from:p(-231.8,620.6),to:p(-233.6,618.2),left:-.5}],
  actors:[
    // Along Kelsey Road and up Manor Road, past the end of Rougemont Close as the car comes out.
    {id:'manor-car',name:'white car',colour:'#e5e7eb',speed:10,path:pts(MANOR_CAR)},
    {id:'london-car',name:'blue car',colour:'#2563eb',speed:10,path:pts(LONDON_CAR)},
    {id:'denison-car',name:'yellow car',colour:'#ca8a04',speed:9,path:pts(DENISON_CAR)},
    // Along Bishopdown Road and into Denison Rise behind the car, coming up to it pulled up, and past it.
    {id:'follow-car',name:'grey car',colour:'#8a9099',speed:10,yields:true,path:pts(FOLLOW_CAR)},
    // Waiting at the London Road crossing on the left, then across in front of the car.
    {id:'crossing-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-155.4,309.1],[-163,305.2]])},
    // East along Kelsey Road, coming the other way as the car waits to turn into Manor Road.
    {id:'kelsey-cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(KELSEY_CYCLIST)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'Rougemont Close, left on to Manor Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-268,599.9),
      starts:[{actor:'manor-car',at:p(-270.7,598.6),delay:0}],
      endAt:p(-227.7,599),
      // (Kept quiet on along Bourne Avenue: with cars parked along one kerb there is no room to meet traffic in it.)
      quietUntil:p(-21.4,429.5),
      // The junction, Manor Road to the right, where the white car comes from, and Bourne Avenue.
      quiet:[{x:-232,z:617,radius:24},{x:-240,z:670,radius:40},{x:90,z:640,radius:55},{x:91,z:715,radius:22},{x:50,z:510,radius:45}],
      place:{
        approach:{pause:{kind:'moving',at:p(-257,604.6)},frame:{yaw:0,pitch:22},state:'Leaving the test centre along Rougemont Close.'},
        line:{pause:{kind:'stop',at:p(-240.4,611.8)},when:{actor:'manor-car',at:p(-235.2,639.8)},frame:{yaw:-75,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-240.4,611.8)},when:{actor:'manor-car',at:p(-227.8,599.5)},frame:{yaw:-40,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so anyone on Manor Road knows where you are going.'}},
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
              message:'Look right first: turning left, the traffic in the lane you join comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming up Manor Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming up Manor Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: a car may be coming down Manor Road, and people cross at the bus stop.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming up Manor Road: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: nothing more was coming.'
        }
      ]
    },
    {
      id:'st-marks-roundabout',
      turn:'right',
      title:'Roundabout, turning right',
      where:'Bourne Avenue at St Mark\'s Roundabout, fourth exit on to St Mark\'s Avenue',
      instruction:'At the roundabout, take the fourth exit, that\'s to the right.',
      instructAt:p(-43,396),
      starts:[{actor:'london-car',at:p(16.6,475.4),delay:0}],
      // (The London Road entry, held green for the blue car; the car's own way round meets the same set's lights.)
      lights:p(-216.4,319.6),
      endAt:p(-196.3,289.9),
      // (Kept quiet on along St Mark's Avenue: with cars parked along one kerb there is no room to meet traffic in it.)
      quietUntil:p(-263.3,-203.2),
      // The entry, the circulating carriageway to the right where the blue car comes round, the London Road entry, and St
      // Mark's Avenue.
      quiet:[{x:-166,z:354,radius:16},{x:-163,z:328,radius:22},{x:-150,z:288,radius:22},
        {x:-206,z:205,radius:42},{x:-213,z:130,radius:45},{x:-234,z:44,radius:52},{x:-257,z:-53,radius:52},{x:-261,z:-153,radius:52}],
      place:{
        approach:{pause:{kind:'moving',at:p(-109.7,345)},frame:{yaw:0,pitch:22},state:'On Bourne Avenue, St Mark\'s Roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(-161.5,354.7)},when:{actor:'london-car',at:p(-162.5,321.5)},frame:{yaw:-60,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-161.5,354.7)},when:{actor:'london-car',at:p(-185.9,371.4)},frame:{yaw:-40,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Going past the twelve o\'clock exit, signal right on the approach, and change to left once you pass the exit before yours.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for the fourth exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming round from London Road, on your right, was close and going past your entry. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming round from the right: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: nothing more was coming round.'
        }
      ]
    },
    {
      id:'bishopdown-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'Bishopdown Road, right at the mini-roundabout into Denison Rise',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(-233.9,-565.3),
      starts:[{actor:'denison-car',at:p(-297.8,-401.4),delay:0}],
      endAt:p(-153.5,-609.7),
      // The mini-roundabout, Denison Rise, where the yellow car comes from, and Bishopdown Road beyond, where it goes.
      quiet:[{x:-162,z:-623,radius:18},{x:-150,z:-592,radius:24},{x:-138,z:-636,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(-206,-593.2)},frame:{yaw:0,pitch:22},state:'On Bishopdown Road at 20 mph, the mini-roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(-174.4,-619)},when:{actor:'denison-car',at:p(-155.3,-606.3)},frame:{yaw:-40,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-174.4,-619)},when:{actor:'denison-car',at:p(-134.4,-638.4)},frame:{yaw:-20,pitch:30},state:'Still at the give way line.'}
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
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for Denison Rise.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the yellow car',
              message:'The yellow car coming out of Denison Rise, on your right, was going round the mini-roundabout across your way. Give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the yellow car from Denison Rise, on your right, was coming on to the mini-roundabout.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go','horn'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the yellow car went by. Look right again, into Denison Rise, just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The yellow car had gone along Bishopdown Road and nothing more was coming from the right: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the yellow car had gone by and nothing more was coming from the right.'
        }
      ]
    },
    {
      id:'denison-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Denison Rise, past Linkway',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-135.3,-552.6),
      starts:[{actor:'follow-car',at:p(-151.6,-605.1),delay:0}],
      endAt:p(-67.1,-513.6),
      selfCancel:false,
      quiet:[{x:-70,z:-514,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-112.9,-520.6)},frame:{yaw:15,pitch:28},state:'On Denison Rise at 20 mph, Linkway on the right.'},
        stopped:{pause:{kind:'stop',at:p(-67.1,-513.6)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Linkway, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop opposite or within 10 metres of a junction: drivers turning in and out of Linkway would have to swing round you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right, into Linkway: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Linkway; mirrors, then signal left.'
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
      id:'denison-move-off',
      turn:'right',
      title:'Moving off',
      where:'Denison Rise, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-67.1,-513.6),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'follow-car',at:p(-151.6,-605.1),delay:0}],
      endAt:p(-1.8,-543.3),
      // (Kept quiet on to Barrington Road, while the grey car drives on ahead along Denison Rise: with cars parked along
      // one kerb there is no room for it to meet traffic.)
      quietUntil:p(129.2,-538),
      quiet:[{x:-67,z:-514,radius:50},{x:30,z:-548,radius:45},{x:100,z:-548,radius:35}],
      place:{
        check:{pause:{kind:'stop',at:p(-67.1,-513.6)},when:{actor:'follow-car',at:p(-91.1,-510.8)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-67.1,-513.6)},when:{actor:'follow-car',at:p(-40.2,-527.4)},frame:{yaw:-170,pitch:26},
          state:'Still at the kerb.'}
      },
      stages:[
        {
          id:'check',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','signal-left','give-way','go'],
          neutral:['signal-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['mirror-interior','mirror-right','blind-spot-right'],any:true,fault:{level:'minor',heading:'Move off - safety',title:'Waited without looking',
              message:'Waiting was right, but check the mirrors first so you know what you are waiting for.'}},
            {kind:'unsafe',id:'pulled-into-car',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off in front of the grey car',
              message:'The grey car coming up Denison Rise was just behind you, about to pass. Let it go by before you move off. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the grey car behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','give-way'],['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors, then wait: the grey car was coming up behind to pass.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','give-way','go'],
          neutral:['mirror-interior','signal-right'],
          rules:[
            {kind:'required',id:'fresh-blind-spot',anyOf:['blind-spot-right'],when:'go',fault:{level:'serious',heading:'Move off - safety',title:'No blind spot check before moving off',
              message:'Look over your right shoulder just before you move off: a cyclist or motorcyclist can be there, out of the mirror\'s view.'}},
            {kind:'before',id:'mirror-first',action:'go',needs:['mirror-right'],fault:{level:'minor',heading:'Move off - safety',title:'No right mirror',
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
      id:'barrington-lights',
      turn:'right',
      title:'Traffic lights, emerging right',
      where:'Barrington Road, right at the lights on to London Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(136.2,-454.1),
      starts:[],
      lights:p(196.8,-384.5),
      endAt:p(190.8,-347.8),
      quiet:[{x:204,z:-376,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(170,-409)},lights:'red',frame:{yaw:0,pitch:22},state:'Approaching the lights at the end of Barrington Road.'},
        line:{pause:{kind:'stop',at:p(193.2,-387.9)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(193.2,-387.9)},lights:'red',frame:{yaw:-20,pitch:30},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach to the lights, so the traffic behind knows where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Slow down to stop at the line.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right, ready to stop at the red light.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','look-right','mirror-right'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red, with London Road traffic crossing in front. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['mirror-right'],
          rules:[
            {kind:'required',id:'check-junction',anyOf:['look-left','look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Green means go only if the way is clear. Look both ways along London Road for anyone late through the lights before you turn: it is a 40 mph road.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the junction was clear: this was the time to go.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','look-left','go'],['look-left','look-right','mirror-right','go']],
          next:{go:'done'},
          explain:'Look both ways along London Road, then turn right: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'london-road-crossing',
      turn:'left',
      title:'Pedestrian crossing at a roundabout',
      where:'London Road, the crossing at St Mark\'s Roundabout, then the first exit on to Wain-a-long Road',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(-85.5,191.4),
      starts:[{actor:'crossing-pedestrian',at:p(-114.1,244),delay:0}],
      lights:p(-159.2,307.1),
      endAt:p(-155.8,346.8),
      // The crossing, and the circulating carriageway beyond it.
      quiet:[{x:-159,z:308,radius:20},{x:-163,z:335,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-131,268)},lights:'red',frame:{yaw:0,pitch:22},state:'On London Road at 30 mph, the crossing ahead.'},
        line:{pause:{kind:'stop',at:p(-155,303.9)},lights:'red',when:{actor:'crossing-pedestrian',at:p(-157,308.2)},panel:'right',frame:{yaw:0,pitch:30},state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(-155,303.9)},lights:'red',when:{actor:'crossing-pedestrian',at:p(-162.7,305.3)},panel:'right',frame:{yaw:0,pitch:30},
          state:'At the crossing. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','slow-down','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Pedestrian crossings',title:'Did not slow for the crossing',
              message:'The lights were red and someone was stepping on to the crossing. Slow down in good time to stop at the line.'}},
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'Signal left on the approach for the first exit, so the traffic behind knows where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Sped up at a red light',
              message:'The lights were red for someone crossing. Speeding up to get through puts them at risk.'}}
          ],
          accepted:[['mirror-interior','slow-down','mirror-left','signal-left'],['mirror-interior','mirror-left','signal-left','slow-down'],['mirror-interior','mirror-left','slow-down','signal-left']],
          next:{then:'line'},
          explain:'Interior mirror, slow down; left mirror, then signal left for the first exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','give-way','go','horn'],
          neutral:['look-left','look-right'],
          rules:[
            {kind:'unsafe',id:'crossing',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove on to the crossing on red',
              message:'The lights were red and the pedestrian was crossing in front of you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['give-way'],['look-left','give-way'],['look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the lights were red and the pedestrian was crossing in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['mirror-left'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Pedestrian crossings',title:'No check before going',
              message:'Green means go only if the crossing is clear. Look both ways along it for anyone hurrying across late before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-left','look-right','mirror-left','go']],
          next:{go:'done'},
          explain:'Look both ways along the crossing, then go: the pedestrian was across and the lights were green.'
        }
      ]
    },
    {
      id:'kelsey-right',
      turn:'right',
      title:'Turning right into a side road',
      where:'Kelsey Road, right into Manor Road',
      instruction:'Take the next road on the right.',
      instructAt:p(-178.1,721.4),
      starts:[{actor:'kelsey-cyclist',at:p(67.2,690.5),delay:0}],
      endAt:p(-250.7,721.8),
      // The junction, and Kelsey Road ahead, where the cyclist comes from.
      quiet:[{x:-248,z:732,radius:22},{x:-285,z:740,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(-192.7,724.5)},frame:{yaw:0,pitch:20},state:'On Kelsey Road, Manor Road ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(-241.5,734.1)},when:{actor:'kelsey-cyclist',at:p(-264,737)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Manor Road.'},
        clear:{pause:{kind:'stop',at:p(-241.5,734.1)},when:{actor:'kelsey-cyclist',at:p(-219.8,727.5)},frame:{yaw:20,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming cyclist',
              message:'The cyclist coming along Kelsey Road was going ahead, and has priority over you turning right. Turning across a cyclist is one of the commonest causes of collisions. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the cyclist coming along Kelsey Road was going ahead, and has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Manor Road',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming along Kelsey Road: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Manor Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
