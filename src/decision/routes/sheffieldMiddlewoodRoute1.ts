import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {HOME_CAR,LANGSETT_CAR,TC_CAR,WADSLEY_CAR,WORRALL_CAR} from './sheffieldMiddlewoodRoute1Paths';

/**
 * Sheffield (Middlewood Road) route 1, Langsett Avenue and Wadsley: eight challenges from the test centre at 508
 * Middlewood Road (its car park off Winn Gardens), right out of the car park, left on to Middlewood Road, right up
 * Langsett Avenue (the right turn local instructors name), left on to Worrall Road, along Wadsley Lane (pulling up and
 * moving off), Dixon Road, and back up Middlewood Road over the signal crossing and through the Catch Bar Lane lights,
 * right into Winn Gardens. Chosen from the map and published route information
 * (content/packs/sheffield-middlewood-road/ROUTES.md). Scene sheffield-middlewood-road-route-1 (OpenStreetMap). A
 * practice route, not a confirmed test route.
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
 * the hazard is in view only at the line; leaving the car park keeps a third: someone on the footway, then a car along
 * Winn Gardens, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'langsett-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(41.3,-364.9)},when:{actor:'langsett-car',at:p(75.2,-309.2)},frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching Langsett Avenue on Middlewood Road.'}},
  // (At the line: the houses on the corner hide Worrall Road until there.)
  'worrall-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-562.8,-23.5)},when:{actor:'worrall-car',at:p(-580.8,-38.3)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the top of Langsett Avenue.'}},
  'middlewood-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(498.7,526)},lights:'red',when:{actor:'crossing-pedestrian',at:p(499.6,490.8)},panel:'right',frame:{yaw:0,pitch:44,shift:5},
    state:'On Middlewood Road, the signal crossing ahead. The lights are red.'}},
  'catch-bar-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(459.6,188.7)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Catch Bar Lane lights. They are red.'}},
  'winn-gardens-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(-77.1,-530)},when:{actor:'home-car',at:p(-111,-581.4)},frame:{yaw:0,pitch:44,shift:-4},
    state:'On Middlewood Road, Winn Gardens just ahead on the right.'}}
};

export const SHEFFIELD_MIDDLEWOOD_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'sheffield-middlewood-road-1',
  title:'Sheffield (Middlewood Road) route 1',
  scene:'sheffield-middlewood-road-route-1',
  briefing:'Sheffield (Middlewood Road) route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nBased on the roads round this test centre. Your test route may differ. Built from OpenStreetMap data; the app\'s assessment, not a DVSA result.',
  start:{x:-71.8,z:-616.6,headingDeg:144.8},
  // The test centre's car park, Winn Gardens, Middlewood Road, Langsett Avenue, Worrall Road, Wadsley Lane (pulling up
  // and moving off), Dixon Road, Middlewood Road over the crossing and through the Catch Bar Lane lights, Winn Gardens
  // and back into the car park.
  through:pts([[-17,-447],[-70,-317],[-444,-104],[-522,74],[-46,266],[251,332],[439,651],[502,500],[469,220],[-47,-492],[-69,-612.5]]),
  // Pulled in to the kerb on Wadsley Lane, past Braemore Road (no cars parked along this stretch).
  shifts:[{from:p(-4.7,270.5),to:p(8.3,271.5),left:.35}],
  actors:[
    // Along the Winn Gardens footway from the left, across the car park's way out.
    {id:'tc-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-46.9,-593.5],[-59.1,-584.9]])},
    {id:'tc-car',name:'silver car',colour:'#b8bcc2',speed:10,path:pts(TC_CAR)},
    {id:'langsett-car',name:'blue car',colour:'#2563eb',speed:11,path:pts(LANGSETT_CAR)},
    {id:'worrall-car',name:'white car',colour:'#e5e7eb',speed:11,path:pts(WORRALL_CAR)},
    // Behind the car along Wadsley Lane, to its pull-up, and past it.
    {id:'wadsley-car',name:'grey car',colour:'#8a9099',speed:10,yields:true,path:pts(WADSLEY_CAR)},
    // Waiting at the Middlewood Road crossing on the left, then across in front of the car.
    {id:'crossing-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[497.6,490.8],[507.4,491.2]])},
    {id:'home-car',name:'black car',colour:'#1f2328',speed:11,path:pts(HOME_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'The test centre\'s car park, right on to Winn Gardens',
      instruction:'When you\'re ready, drive out of the car park and turn right, please.',
      instructAt:p(-71.8,-616.6),
      starts:[{actor:'tc-pedestrian',at:p(-71.8,-616.6),delay:0},{actor:'tc-car',at:p(-71.8,-616.6),delay:2}],
      endAt:p(-65.3,-573.8),
      // The way out, Winn Gardens both ways, and Middlewood Road where the silver car turns in.
      quiet:[{x:-52,z:-588,radius:26},{x:-82,z:-566,radius:24},{x:-120,z:-595,radius:30}],
      place:{
        footway:{pause:{kind:'stop',at:p(-56.1,-594.3)},when:{actor:'tc-pedestrian',at:p(-51.7,-590.3)},panel:'right',frame:{yaw:25,pitch:30},
          state:'Stopped short of the footway at the car park\'s way out.'},
        line:{pause:{kind:'stop',at:p(-53.6,-590.9)},when:{actor:'tc-car',at:p(-64.2,-577.8)},frame:{yaw:-70,pitch:32},
          state:'At the edge of Winn Gardens.'},
        clear:{pause:{kind:'stop',at:p(-53.6,-590.9)},when:{actor:'tc-car',at:p(-33.1,-599.6)},frame:{yaw:-40,pitch:32},
          state:'Still at the edge of Winn Gardens.'}
      },
      stages:[
        {
          id:'footway',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior','look-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left','look-right'],any:true,fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Waiting was right, but look along the footway first so you know who you are waiting for.'}},
            {kind:'unsafe',id:'across-footway',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Drove across the footway in front of a pedestrian',
              message:'People on the footway have priority across a way out. The pedestrian was about to walk across in front of you: wait for them. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'serious',heading:'Use of horn',title:'Horn at a pedestrian',
              message:'Sounding the horn to hurry someone on the footway is aggressive and can startle them. Wait for them to pass.'}}
          ],
          accepted:[['look-left','give-way'],['look-left','look-right','give-way'],['look-right','look-left','give-way']],
          next:{wait:'line',go:'line'},
          explain:'Wait: the pedestrian walking along the footway from the left has priority across the way out.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','creep','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near half of Winn Gardens comes from the right, from Middlewood Road.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Winn Gardens know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car turning in from Middlewood Road was a second or two away, in the half of the road you had to cross. Wait for it to pass. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the silver car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the silver car\'s way.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal right and wait: the silver car turning in from Middlewood Road was close, in the half of the road you had to cross.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: turning right, you join the far half of the road, where the traffic comes from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Winn Gardens was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Winn Gardens was clear both ways.'
        }
      ]
    },
    {
      id:'langsett-right',
      turn:'right',
      title:'Right turn into a side road',
      where:'Middlewood Road, right into Langsett Avenue',
      instruction:'Take the next road on the right, please.',
      instructAt:p(-3.2,-429),
      starts:[{actor:'langsett-car',at:p(-3.2,-429),delay:0}],
      endAt:p(44.2,-334.5),
      // The junction, Middlewood Road ahead, where the blue car comes from, and the mouth of Langsett Avenue.
      quiet:[{x:52,z:-345,radius:28},{x:85,z:-295,radius:40},{x:25,z:-332,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(32,-378)},frame:{yaw:0,pitch:20},state:'On Middlewood Road at 30 mph, Langsett Avenue ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(52.8,-348.6)},when:{actor:'langsett-car',at:p(75.2,-309.2)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Langsett Avenue.'},
        clear:{pause:{kind:'stop',at:p(52.8,-348.6)},when:{actor:'langsett-car',at:p(29.8,-375.1)},frame:{yaw:25,pitch:32},
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
              message:'The blue car coming up Middlewood Road was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the blue car coming up Middlewood Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Langsett Avenue',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming up Middlewood Road: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Langsett Avenue is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'worrall-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Langsett Avenue, left on to Worrall Road',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-477,-71.9),
      starts:[{actor:'worrall-car',at:p(-485.2,-66.1),delay:0}],
      endAt:p(-557.3,-2.3),
      // The junction, Worrall Road to the right, where the white car comes from, and Prescott Road, where it turns off.
      quiet:[{x:-565,z:-22,radius:26},{x:-600,z:-65,radius:40},{x:-545,z:20,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(-546,-32.3)},frame:{yaw:0,pitch:22},state:'Approaching the top of Langsett Avenue at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-562.8,-23.5)},when:{actor:'worrall-car',at:p(-580.8,-38.3)},frame:{yaw:-70,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-562.8,-23.5)},when:{actor:'worrall-car',at:p(-555.8,1.3)},frame:{yaw:-55,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Worrall Road knows where you are going.'}},
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
              message:'Look right first: turning left, you join the traffic coming down Worrall Road from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming down Worrall Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming down Worrall Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: Well Lane is opposite, and something may be overtaking a parked car on your side of Worrall Road.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming down Worrall Road: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: nothing more was coming down Worrall Road.'
        }
      ]
    },
    {
      id:'wadsley-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Wadsley Lane, past Braemore Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-86,262.3),
      starts:[{actor:'wadsley-car',at:p(-216.2,303.4),delay:0}],
      endAt:p(8.3,271.5),
      selfCancel:false,
      quiet:[{x:0,z:271,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-41.3,265.5)},frame:{yaw:-15,pitch:28},state:'On Wadsley Lane at 30 mph, Braemore Road just behind on the right.'},
        stopped:{pause:{kind:'stop',at:p(8.3,271.5)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Braemore Road, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning out of Braemore Road would have to pull round you, on to the wrong side of Wadsley Lane.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Braemore Road; mirrors, then signal left.'
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
      id:'wadsley-move-off',
      turn:'right',
      title:'Moving off',
      where:'Wadsley Lane, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(8.3,271.5),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'wadsley-car',at:p(-216.2,303.4),delay:0}],
      endAt:p(53,276.5),
      quiet:[{x:8,z:271,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(8.3,271.5)},when:{actor:'wadsley-car',at:p(-18.2,271.1)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(8.3,271.5)},when:{actor:'wadsley-car',at:p(44.3,275.2)},frame:{yaw:-170,pitch:26},
          state:'Still at the kerb.'}
      },
      stages:[
        {
          id:'check',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','mirror-right','blind-spot-right','signal-right','signal-left','give-way','go'],
          neutral:['signal-right','blind-spot-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['mirror-interior','mirror-right'],any:true,fault:{level:'minor',heading:'Move off - safety',title:'Waited without looking',
              message:'Waiting was right, but check your mirrors first so you know what you are waiting for.'}},
            {kind:'unsafe',id:'pulled-into-car',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off into the grey car',
              message:'The grey car coming along Wadsley Lane behind you was about to pass. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the driver behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','give-way'],['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors, then wait: the grey car behind was coming past.'
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
          explain:'Right mirror and blind spot, then move off: the grey car had gone by.'
        }
      ]
    },
    {
      id:'middlewood-crossing',
      title:'Pedestrian crossing',
      where:'Middlewood Road, the signal crossing by Lennox Road',
      instruction:'Follow the road ahead, please.',
      instructAt:p(491.4,589.5),
      starts:[{actor:'crossing-pedestrian',at:p(491.4,589.5),delay:0}],
      lights:p(500.4,495.3),
      endAt:p(501.3,460),
      quiet:[{x:502,z:492,radius:30},{x:500,z:530,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(497.8,538)},lights:'red',frame:{yaw:0,pitch:24},state:'On Middlewood Road at 30 mph, the signal crossing ahead.'},
        line:{pause:{kind:'stop',at:p(500.3,498.4)},lights:'red',when:{actor:'crossing-pedestrian',at:p(500.6,490.8)},panel:'right',frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(500.3,498.4)},when:{actor:'crossing-pedestrian',at:p(506.3,491.2)},frame:{yaw:0,pitch:30},
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
          explain:'Check the crossing both ways, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'catch-bar-lights',
      title:'Traffic lights, ahead',
      where:'Middlewood Road at the Catch Bar Lane lights, ahead',
      instruction:'At the traffic lights, follow the road ahead, please.',
      instructAt:p(471,242.4),
      starts:[],
      lights:p(444.2,155.5),
      endAt:p(426.9,133.2),
      quiet:[{x:440,z:150,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(459.6,188.7)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the lights at 30 mph.'},
        line:{pause:{kind:'stop',at:p(446.1,158)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(446.1,158)},lights:'red',frame:{yaw:0,pitch:28},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-right','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic coming out of Catch Bar Lane, and anyone crossing, at risk.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are following the road ahead: a right signal says you are turning into Catch Bar Lane.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the lights were red.'
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
              message:'Green means go only if the way is clear. Look across the junction for anyone late through the lights from Catch Bar Lane, or still crossing, before you go.'}},
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
      id:'winn-gardens-right',
      turn:'right',
      title:'Right turn, back to the test centre',
      where:'Middlewood Road, right into Winn Gardens',
      instruction:'Take the next road on the right, please.',
      instructAt:p(-42.4,-481),
      starts:[{actor:'home-car',at:p(-42.4,-481),delay:0}],
      endAt:p(-80.7,-564.6),
      // The junction, Middlewood Road ahead, where the black car comes from, and the mouth of Winn Gardens.
      quiet:[{x:-90,z:-550,radius:26},{x:-120,z:-590,radius:36},{x:-75,z:-566,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(-62.6,-509.6)},frame:{yaw:0,pitch:20},state:'On Middlewood Road at 30 mph, Winn Gardens ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(-89.3,-547.1)},when:{actor:'home-car',at:p(-111,-581.4)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Winn Gardens.'},
        clear:{pause:{kind:'stop',at:p(-89.3,-547.1)},when:{actor:'home-car',at:p(-66.5,-521.1)},frame:{yaw:25,pitch:32},
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
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming black car',
              message:'The black car coming down Middlewood Road was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the black car coming down Middlewood Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Winn Gardens',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming down Middlewood Road: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Winn Gardens is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
