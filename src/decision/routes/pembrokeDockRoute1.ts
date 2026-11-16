import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {COMMERCIAL_CAR,CYCLIST,LAWS_CAR,MARKET_CAR,RING_CAR,WHITES_CAR} from './pembrokeDockRoute1Paths';

/**
 * Pembroke Dock, Bush Street and London Road: eight challenges from the test centre in the Royal Dockyard on Admiralty
 * Way, ahead at the Admiralty Way mini-roundabout into Melville Terrace, Melville Street and Market Street, right out of
 * Market Street, Albion Road and the length of Bush Street (pulling up and moving off), on to Ferry Lane, left at the
 * London Road lights over the crossing, London Road through the Waterloo roundabout, the first exit at the Pier Road
 * roundabout into Water Street, right at the Dimond Street crossroads, Queen Street, left out on to Commercial Row, and
 * home by Meyrick Owen Way and Admiralty Way. Chosen from the map and the published evidence
 * (content/packs/pembroke-dock/ROUTES.md). Scene pembroke-dock-route-1 (OpenStreetMap). A practice route, not a
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

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first taken where the
 * hazard is in view: at the line where a corner or the island hides it until there, on the move at the lights. Leaving
 * the test centre keeps its approach as well: the mini-roundabout is the first thing the car comes to. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the buildings on the corner hide Market Place until there.)
  'market-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-729,44.8)},when:{actor:'market-car',at:p(-699.3,42.1)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Market Street.'}},
  'ferry-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(784.6,-28.4)},when:{actor:'ferry-pedestrian',at:p(776.4,-61.8)},frame:{yaw:-5,pitch:44,shift:-3},
    state:'Approaching the London Road lights on green.'}},
  // (At the line: the roundabout's island hides the car coming round until there.)
  'pier-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-3,-348.5)},when:{actor:'ring-car',at:p(-23.4,-370.9)},frame:{yaw:-55,pitch:40,shift:-4},
    state:'At the give way line of the Pier Road roundabout.'}},
  // (In the junction: Laws Street is in view only from there.)
  'dimond-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(-66.7,-90.6)},when:{actor:'laws-car',at:p(-76.3,-51.4)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting at the crossroads to turn right into Dimond Street.'}},
  // (At the line: the houses on the corner hide Commercial Row until there.)
  'queen-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-620.7,-115.8)},when:{actor:'commercial-car',at:p(-626.91,-142.33)},frame:{yaw:-70,pitch:40,shift:-4},
    state:'At the end of Queen Street.'}}
};

export const PEMBROKE_DOCK_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'pembroke-dock-1',
  title:'Pembroke Dock: Bush Street and London Road',
  scene:'pembroke-dock-route-1',
  briefing:'Pembroke Dock, Bush Street and London Road: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-924.14,z:-180.73,headingDeg:194.12},
  // Admiralty Way, Melville Terrace, Melville Street, Market Street, Market Place, Albion Square, Albion Road, Bush Street,
  // Ferry Lane, London Road (the Waterloo roundabout), the Pier Road roundabout, Water Street, Dimond Street, Queen
  // Street, Commercial Row, Market Place, Meyrick Owen Way and back up Admiralty Way.
  through:pts([[-955,-60],[-900,52],[-735,60],[-600,55],[-250,124],[200,192],[860,285],[850,120],[720,-100],[250,-215],[-40,-260],[-150,-87],[-450,-110],[-640,-60],[-850,-65],[-910,-240]]),
  // Kept off the near corner turning left out of Melville Terrace into Melville Street (a tight corner: the line touched
  // the pavement). And pulled in to the kerb on Bush Street (no cars parked along it: room for the cyclist to pass).
  shifts:[{from:p(-973.8,14.8),to:p(-971.3,30.4),left:-1},{from:p(255.9,198),to:p(295.4,204),left:.35}],
  actors:[
    {id:'whites-car',name:'red car',colour:'#b91c1c',speed:9,waits:true,path:pts(WHITES_CAR)},
    {id:'market-car',name:'white car',colour:'#e5e7eb',speed:9,waits:true,path:pts(MARKET_CAR)},
    // Behind the car along Bush Street, past it at the kerb, and left into St John's Road.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    // On the crossing at the mouth of Ferry Lane, from the left-hand kerb across the car's lane, late on the lights.
    {id:'ferry-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[773.4,-61.9],[783.6,-61.6]])},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    {id:'laws-car',name:'silver car',colour:'#a8adb4',speed:9,path:pts(LAWS_CAR)},
    {id:'commercial-car',name:'blue car',colour:'#2563eb',speed:9,waits:true,path:pts(COMMERCIAL_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      title:'Leaving the test centre, mini-roundabout',
      where:'Admiralty Way at the mini-roundabout, ahead into Melville Terrace',
      instruction:'When you\'re ready, drive on, and at the mini-roundabout go straight ahead, please.',
      instructAt:p(-924.14,-180.73),
      starts:[{actor:'whites-car',at:p(-931.5,-151.6),delay:0}],
      endAt:p(-953.4,-67.6),
      // (And Melville Terrace and Melville Street, narrow with cars parked, kept quiet until the car turns into Market
      // Street.)
      quietUntil:p(-737.2,73.6),
      // The mini-roundabout, Whites Farm Way to the right, where the red car comes from, Meyrick Owen Way, Melville
      // Terrace and Melville Street.
      quiet:[{x:-948,z:-92,radius:22},{x:-985,z:-100,radius:30},{x:-915,z:-84,radius:18},{x:-960,z:-20,radius:30},{x:-900,z:52,radius:40},{x:-810,z:74,radius:45}],
      place:{
        approach:{pause:{kind:'moving',at:p(-936.4,-132.2)},frame:{yaw:0,pitch:22},state:'On Admiralty Way, approaching the mini-roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-944.1,-103.3)},when:{actor:'whites-car',at:p(-971.6,-98.1)},frame:{yaw:-60,pitch:30},
          state:'At the give way line of the mini-roundabout.'},
        clear:{pause:{kind:'stop',at:p(-944.1,-103.3)},when:{actor:'whites-car',at:p(-929.7,-89.6)},frame:{yaw:-15,pitch:30},
          state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'No mirror on the approach',
              message:'Check the interior mirror as you slow for the mini-roundabout: you need to know what is behind.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A left signal says you are turning into Meyrick Owen Way. Going straight ahead, give no signal.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round into Whites Farm Way: the red car\'s driver would be misled.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: traffic from the right goes first.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left'],['mirror-interior','mirror-right']],
          next:{then:'line'},
          explain:'Interior mirror and no signal: you were going straight ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','creep','give-way','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming along Whites Farm Way, on your right, was close, going straight over the mini-roundabout across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming along Whites Farm Way, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went over. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone on along Meyrick Owen Way and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the red car had gone.'
        }
      ]
    },
    {
      id:'market-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Market Street, right on to Market Place',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(-739.5,83.3),
      // (Set going as the car turns into Market Street, so it is there whatever held the car up on the way.)
      starts:[{actor:'market-car',at:p(-739.5,83.3),delay:0}],
      endAt:p(-686.1,41.4),
      // The junction, Market Place to the right, where the white car comes from, and Meyrick Owen Way to the left.
      quiet:[{x:-728,z:36,radius:20},{x:-690,z:42,radius:26},{x:-765,z:20,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(-732.9,59.3)},frame:{yaw:0,pitch:22},state:'Approaching the end of Market Street at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-729,44.8)},when:{actor:'market-car',at:p(-699.3,42.1)},frame:{yaw:-70,pitch:26},state:'At the end of Market Street.'},
        clear:{pause:{kind:'stop',at:p(-729,44.8)},when:{actor:'market-car',at:p(-759.5,26.8)},frame:{yaw:-10,pitch:26},state:'Still at the end of Market Street.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Market Place knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane, which you cross, comes from the right, along Market Place.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Market Place from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming along Market Place from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: turning right, you join the far lane, and its traffic comes from the left, along Meyrick Owen Way.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and the road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and the road was clear both ways.'
        }
      ]
    },
    {
      id:'bush-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Bush Street, on the straight before St Peter\'s Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(216.4,191.8),
      starts:[{actor:'cyclist',at:p(216.4,191.8),delay:0}],
      endAt:p(295.4,204),
      selfCancel:false,
      // The pull-up, and the lane on the right on the way to it.
      quiet:[{x:295,z:204,radius:34},{x:185,z:189,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(255.9,198)},frame:{yaw:-15,pitch:28},state:'On Bush Street at 20 mph.'},
        stopped:{pause:{kind:'stop',at:p(295.4,204)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight, clear of the side roads.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of St Peter\'s Road or St John\'s Road could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place on the straight, clear of the side roads; mirrors, then signal left.'
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
      id:'bush-move-off',
      turn:'right',
      title:'Moving off',
      where:'Bush Street, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(295.4,204),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(216.4,191.8),delay:0}],
      endAt:p(374.3,217.5),
      quiet:[{x:295,z:204,radius:50},{x:390,z:222,radius:20}],
      place:{
        check:{pause:{kind:'stop',at:p(295.4,204)},when:{actor:'cyclist',at:p(280,203.6)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(295.4,204)},when:{actor:'cyclist',at:p(327.7,209.2)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on towards St John\'s Road, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'ferry-lights',
      turn:'left',
      title:'Pedestrian crossing at the lights, left turn',
      where:'Ferry Lane at the London Road lights, left on to London Road over the crossing',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(798.8,14.3),
      // (Set going as the car comes up to the lights, so they are on the crossing as it gets there, whatever held it up.)
      starts:[{actor:'ferry-pedestrian',at:p(792.5,-4.7),delay:0}],
      lights:p(778.8,-57.3),lightsAll:true,
      endAt:p(740.2,-89.5),
      // The junction, the crossing at the mouth of Ferry Lane, London Road to the left, and Eastern Avenue and London Road
      // across the junction.
      quiet:[{x:785,z:-70,radius:26},{x:778,z:-62,radius:12},{x:745,z:-90,radius:22},{x:818,z:-66,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:p(784.6,-28.4)},frame:{yaw:0,pitch:20},state:'Approaching the London Road lights on green.'},
        line:{pause:{kind:'stop',at:p(777.8,-51.3)},when:{actor:'ferry-pedestrian',at:p(776.4,-61.8)},frame:{yaw:0,pitch:32},
          state:'At the stop line. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(777.8,-51.3)},when:{actor:'ferry-pedestrian',at:p(783.6,-61.6)},frame:{yaw:-10,pitch:32},
          state:'Waiting at the stop line, short of the crossing. The lights are green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left in good time so the drivers behind and the people at the crossing know you are turning.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up for the green',
              message:'Green means go if it is safe: someone was still on the crossing in front of you, so you need a speed you can stop from.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-right','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look along the crossing and into London Road, the way you are turning, first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove at someone still crossing',
              message:'Someone was still on the crossing at the mouth of Ferry Lane, in your lane. Your green does not make them vanish: wait until they are clear. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-left','give-way'],['mirror-interior','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: someone was still on the crossing in front of you, in your lane.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-right','mirror-left'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check before turning',
              message:'Before you go, look again along the crossing and into London Road: is anyone else stepping out?'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited with the way clear',
              message:'The pedestrian had crossed, past your lane, and the lights were still green: this was the time to go.'}}
          ],
          accepted:[['look-left','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look along the crossing and into London Road again, then go: the pedestrian was past your lane.'
        }
      ]
    },
    {
      id:'pier-roundabout',
      turn:'left',
      title:'Roundabout, first exit',
      where:'London Road at the Pier Road roundabout, first exit into Water Street',
      instruction:'At the roundabout, take the first exit, please.',
      instructAt:p(70.6,-277.8),
      // (Set going as the car comes up to the line, so it comes round as the car gets there, whatever held it up.)
      starts:[{actor:'ring-car',at:p(12.9,-333),delay:0}],
      endAt:p(-28.3,-309.1),
      // The roundabout, Pier Road, where the black car comes from, Western Way, Water Street and Tremeyrick Street.
      quiet:[{x:-29,z:-357,radius:30},{x:-40,z:-400,radius:25},{x:-72,z:-362,radius:22},{x:-29,z:-305,radius:20},{x:20,z:-375,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(26.5,-318.3)},frame:{yaw:0,pitch:22},state:'Approaching the Pier Road roundabout at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-3,-348.5)},when:{actor:'ring-car',at:p(-23.4,-370.9)},frame:{yaw:-55,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-3,-348.5)},when:{actor:'ring-car',at:p(-25.7,-336.7)},frame:{yaw:-30,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'For the first exit, signal left on the approach, so the drivers waiting to come on know you are leaving there.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round past Water Street: everyone waiting at the other entries would be misled.'}},
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
              message:'The black car coming round the roundabout from Pier Road, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Pier Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone off down Water Street and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone off down Water Street.'
        }
      ]
    },
    {
      id:'dimond-right',
      turn:'right',
      title:'Crossroads, right turn',
      where:'Water Street at the Dimond Street crossroads, right into Dimond Street',
      instruction:'At the crossroads, turn right, please.',
      instructAt:p(-57,-141.7),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'laws-car',at:p(-65.3,-97.4),delay:0}],
      endAt:p(-115.7,-81.4),
      // (And Dimond Street and Queen Street, narrow with cars parked, kept quiet until the car is at the end of Queen
      // Street.)
      quietUntil:p(-604.8,-114.3),
      // The crossroads, Laws Street opposite, where the oncoming car comes from, Dimond Street both ways, and Queen
      // Street.
      quiet:[{x:-71,z:-77,radius:22},{x:-78,z:-40,radius:26},{x:-30,z:-70,radius:16},{x:-170,z:-87,radius:50},{x:-260,z:-97,radius:30},
        {x:-340,z:-104,radius:50},{x:-430,z:-110,radius:50},{x:-520,z:-104,radius:50}],
      place:{
        approach:{pause:{kind:'moving',at:p(-60.6,-122)},frame:{yaw:0,pitch:20},state:'Approaching the Dimond Street crossroads at 20 mph.'},
        centre:{pause:{kind:'stop',at:p(-66.7,-90.6)},when:{actor:'laws-car',at:p(-76.3,-51.4)},frame:{yaw:0,pitch:32},
          state:'Waiting at the crossroads to turn right.'},
        clear:{pause:{kind:'stop',at:p(-66.7,-90.6)},when:{actor:'laws-car',at:p(-67.3,-104.8)},frame:{yaw:30,pitch:32},
          state:'Still waiting at the crossroads.'}
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
              message:'The silver car coming up Laws Street opposite, going straight over the crossroads, was a few seconds away, and it has priority over you turning right. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the silver car coming up Laws Street opposite was going straight over, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Dimond Street',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming up Laws Street: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Dimond Street is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'queen-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Queen Street, left on to Commercial Row',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-565.4,-108),
      // (Set going with the direction, so it comes down Commercial Row as the car gets to the line.)
      starts:[{actor:'commercial-car',at:p(-565.4,-108),delay:0}],
      endAt:p(-634.2,-80),
      // The junction, Commercial Row to the right, where the blue car comes from, and to the left.
      quiet:[{x:-630,z:-117,radius:22},{x:-622,z:-160,radius:30},{x:-634,z:-85,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-594.9,-113.1)},frame:{yaw:0,pitch:22},state:'Approaching the end of Queen Street at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-620.7,-115.8)},when:{actor:'commercial-car',at:p(-626.91,-142.33)},frame:{yaw:-70,pitch:26},state:'At the end of Queen Street.'},
        clear:{pause:{kind:'stop',at:p(-620.7,-115.8)},when:{actor:'commercial-car',at:p(-632.34,-95.47)},frame:{yaw:-30,pitch:26},state:'Still at the end of Queen Street.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Commercial Row knows where you are going.'}},
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
              message:'Look right first: the traffic in the lane you join comes from the right, down Commercial Row.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming down Commercial Row from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming down Commercial Row from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be coming up Commercial Row or overtaking towards you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Commercial Row was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Commercial Row was clear.'
        }
      ]
    }
  ]
},BEFORE));
