import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {ALAN_MOSS_CAR,BELTON_VAN,BRW_CAR,LEAVE_CAR} from './loughboroughRoute2Paths';

/**
 * Loughborough route 2, Belton Road, Derby Road and Belton Road West: eight challenges from the test centre at the Ark
 * Business Centre, Gordon Road (by the station), left out of Gordon Road on to Station Boulevard, left at the North Road
 * lights into Meadow Lane, right at the Belton Road lights, pulling up and moving off on Belton Road, right at the Derby
 * Road lights, round the Bishop Meadow roundabout into Bishop Meadow Road, right at its mini-roundabout on to Belton
 * Road West, back along Belton Road over its zebra crossing, Meadow Lane, and right from Station Boulevard into Gordon
 * Road. Chosen from the map and the published evidence (content/packs/loughborough/ROUTES.md). Scene
 * loughborough-route-2 (OpenStreetMap). A practice route, not a confirmed test route.
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
const FLASH:Fault={level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
  message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'};

/** One decision before and one after at each challenge (the owner's rule, beforeAfter.ts), the first on the move unless
 * the hazard is in view only at the line; the Belton Road lights keep a third: the red light, then someone still
 * crossing Belton Road on green, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'belton-road-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(1025.1,32.9)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'On Meadow Lane, approaching the Belton Road lights. They are red.'}},
  'derby-road-lights':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(32.2,286.9)},when:{actor:'alan-moss-car',at:p(-41.9,365.2)},frame:{yaw:0,pitch:44,shift:-4},
    state:'On Belton Road, approaching the Derby Road lights on green.'}},
  // (At the line: the houses on the corner hide Belton Road West to the right until there.)
  'bishop-meadow-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-581.3,-426.9)},when:{actor:'brw-car',at:p(-570.6,-435.4)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the mini-roundabout.'}},
  'belton-zebra':{first:'approach',second:'zebra',place:{pause:{kind:'moving',at:p(825.2,104.4)},when:{actor:'zebra-pedestrian',at:p(849.8,81.1)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Belton Road, the zebra crossing just ahead.'}},
  'gordon-road-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(1092.4,-105.5)},when:{actor:'return-car',at:p(1190,-52.5)},frame:{yaw:0,pitch:40,shift:-4},
    state:'On Station Boulevard, Gordon Road just ahead on the right.'}}
};

export const LOUGHBOROUGH_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'loughborough-2',
  title:'Loughborough route 2',
  scene:'loughborough-route-2',
  briefing:'Loughborough route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:1067.8,z:-52.9,headingDeg:184},
  // The test centre's car park, Gordon Road, Station Boulevard, Meadow Lane, Belton Road, Derby Road, the Bishop Meadow
  // roundabout, Bishop Meadow Road, Belton Road West, Belton Road, Meadow Lane, Station Boulevard and back into Gordon
  // Road.
  through:pts([[1114.1,-98.7],[1025.1,-0.2],[596.8,136.2],[-322.7,-26.5],[-596.3,-176.6],[-623,-321.8],[-259.4,-338.7],[170.7,31.9],
    [696.7,149.4],[1025.1,-0.2],[1114.1,-98.7],[1135.5,-59.6]]),
  // Pulled in to the kerb on Belton Road, past Bottleacre Lane and short of Stanford Hill (no cars parked along it).
  shifts:[{from:p(765.9,146.2),to:p(746.5,150.9),left:.35}],
  actors:[
    {id:'leave-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(LEAVE_CAR)},
    // Crossing Belton Road at the lights, from the far side into the lane the car turns into, still crossing on green.
    {id:'belton-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[1007.6,70.7],[1006.4,81.7]])},
    // Behind the car along Belton Road, past it at the kerb, and right into Stanford Hill.
    {id:'belton-van',name:'white van',colour:'#f5f5f4',speed:9,yields:true,path:pts(BELTON_VAN)},
    {id:'alan-moss-car',name:'silver car',colour:'#c3c7cf',speed:10,path:pts(ALAN_MOSS_CAR)},
    {id:'brw-car',name:'green car',colour:'#15803d',speed:8,path:pts(BRW_CAR)},
    // Waiting at the Belton Road zebra on the left, then across in front of the car.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[848.1,79.1],[855.3,87.5]])},
    {id:'return-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(LEAVE_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'Gordon Road, left on to Station Boulevard',
      instruction:'When you\'re ready, drive out to the end of Gordon Road and turn left, please.',
      instructAt:p(1067.8,-52.9),
      starts:[{actor:'leave-car',at:p(1067.8,-52.9),delay:0}],
      endAt:p(1090.5,-102.3),
      // The end of Gordon Road, and Station Boulevard to the right (the station), where the white car comes from.
      quiet:[{x:1150,z:-84,radius:22},{x:1175,z:-62,radius:32},{x:1115,z:-98,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(1143.6,-73)},when:{actor:'leave-car',at:p(1161.9,-74.4)},frame:{yaw:-70,pitch:32},
          state:'At the end of Gordon Road, at the edge of Station Boulevard.'},
        clear:{pause:{kind:'stop',at:p(1143.6,-73)},when:{actor:'leave-car',at:p(1125.4,-93.2)},frame:{yaw:-40,pitch:32},
          state:'Still at the end of Gordon Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','signal-left','signal-right','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning left, you join the near lane of Station Boulevard, and its traffic comes from the right, from the station.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the drivers on Station Boulevard know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning left: a right signal misleads everyone on Station Boulevard.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Station Boulevard from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s lane.'}}
          ],
          accepted:[['look-right','signal-left','give-way'],['signal-left','look-right','give-way'],['look-right','look-left','signal-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal left and wait: the white car coming along Station Boulevard from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be crossing the end of Gordon Road, or overtaking towards you out of the lights.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had passed and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had passed and Station Boulevard was clear.'
        }
      ]
    },
    {
      id:'belton-road-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Meadow Lane at the Belton Road lights, right into Belton Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(1029.8,-26.9),
      starts:[{actor:'belton-pedestrian',at:p(1029.8,-26.9),delay:0}],
      lights:p(1022.5,68.5),lightsAll:true,
      endAt:p(985.6,74.6),
      quiet:[{x:1018,z:76,radius:24},{x:1000,z:76,radius:20},{x:1030,z:110,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(1025.1,32.9)},lights:'red',frame:{yaw:0,pitch:22},state:'Approaching the Belton Road lights.'},
        line:{pause:{kind:'stop',at:p(1023,62.3)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        green:{pause:{kind:'stop',at:p(1023,62.3)},lights:'red',when:{actor:'belton-pedestrian',at:p(1006.9,77.3)},frame:{yaw:-35,pitch:36,shift:-4},
          state:'At the stop line. The lights have turned green.'},
        clear:{pause:{kind:'stop',at:p(1023,62.3)},when:{actor:'belton-pedestrian',at:p(1006.5,80.4)},frame:{yaw:-35,pitch:36,shift:-4},
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
              message:'Signal right on the approach, so the drivers behind and coming the other way know you are turning into Belton Road.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the people crossing and the traffic from Belton Road and Ratcliffe Road at risk.'}},
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
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look into Belton Road, on your right, first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Turned into someone still crossing',
              message:'Green means go only if the way is clear. The pedestrian was still on the crossing at the start of Belton Road, walking into the lane you were turning into. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait, even on green: the pedestrian was still crossing Belton Road, in the lane you were turning into.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Belton Road',
              message:'Look into Belton Road again just before you turn: someone else may have stepped on to the crossing.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','go']],
          next:{go:'done'},
          explain:'Look into Belton Road again, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'belton-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Belton Road, past Bottleacre Lane',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(805.4,125.2),
      starts:[{actor:'belton-van',at:p(906,67),delay:0}],
      endAt:p(746.5,150.9),
      selfCancel:false,
      quiet:[{x:746,z:151,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(779.8,140.8)},frame:{yaw:15,pitch:28},state:'On Belton Road at 30 mph, a van behind.'},
        stopped:{pause:{kind:'stop',at:p(746.5,150.9)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','signal-left','signal-right','stop-at-junction','stop-past-junction'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal to pull in',
              message:'Signal left before you pull in, so the van behind knows you are stopping.'}},
            {kind:'required',id:'place',anyOf:['stop-past-junction'],fault:{level:'serious',heading:'Normal stops',title:'No safe place chosen',
              message:'Choose where to stop before you pull in: clear of Stanford Hill ahead, not opposite or close to it.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped opposite a junction',
              message:'Never stop opposite or within 10 metres of a junction: drivers turning in and out of Stanford Hill would have to swing round you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well clear of Stanford Hill; mirrors, then signal left.'
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
      id:'belton-move-off',
      turn:'right',
      title:'Moving off',
      where:'Belton Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(746.5,150.9),
      // (Behind the car along Belton Road as it comes to pull up.)
      starts:[{actor:'belton-van',at:p(906,67),delay:0}],
      endAt:p(652.1,145.1),
      quiet:[{x:746,z:151,radius:50},{x:688,z:140,radius:20}],
      place:{
        check:{pause:{kind:'stop',at:p(746.5,150.9)},when:{actor:'belton-van',at:p(768,144.9)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(746.5,150.9)},when:{actor:'belton-van',at:p(696.9,151.2)},frame:{yaw:-10,pitch:26},
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
            {kind:'unsafe',id:'pulled-into-van',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off into the van',
              message:'The white van that was behind you was coming past, close on your right. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the driver behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','blind-spot-right','give-way'],['blind-spot-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors and your right blind spot, then wait: the van was coming past.'
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
              message:'The van had gone by, turning into Stanford Hill, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the van had gone by.'
        }
      ]
    },
    {
      id:'derby-road-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Belton Road at the Derby Road lights, right on to Derby Road',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(58.5,256.7),
      starts:[{actor:'alan-moss-car',at:p(91.3,219),delay:0}],
      lights:p(-0.5,322.9),lightsAll:true,
      endAt:p(-55.8,289.2),
      // The junction, and Alan Moss Road ahead, where the oncoming silver car comes from.
      quiet:[{x:-12,z:333,radius:26},{x:-40,z:362,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(32.2,286.9)},frame:{yaw:0,pitch:20},state:'Approaching the Derby Road lights on green.'},
        centre:{pause:{kind:'stop',at:p(-7,330.9)},when:{actor:'alan-moss-car',at:p(-22.7,343.4)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-7,330.9)},when:{actor:'alan-moss-car',at:p(10.6,305.7)},frame:{yaw:-40,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The silver car coming out of Alan Moss Road was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:FLASH}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the silver car coming out of Alan Moss Road was going ahead into Belton Road, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Derby Road',
              message:'Before you turn, look into Derby Road (on your right): its crossing may have people on it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Derby Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'bishop-meadow-mini',
      turn:'right',
      title:'Mini-roundabout, right turn',
      where:'Bishop Meadow Road at its mini-roundabout, right on to Belton Road West',
      instruction:'At the mini-roundabout, turn right, please.',
      instructAt:p(-614,-345.3),
      // (Set going well before: it has 125 m to come along Belton Road West.)
      starts:[{actor:'brw-car',at:p(-659.6,-269.9),delay:0}],
      endAt:p(-536.4,-429.9),
      // The mini-roundabout, Belton Road West to the right, where the green car comes from, and Bishop Meadow Road north.
      quiet:[{x:-575,z:-438,radius:22},{x:-525,z:-426,radius:34},{x:-565,z:-470,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-596.6,-392.2)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout.'},
        line:{pause:{kind:'stop',at:p(-581.3,-426.9)},when:{actor:'brw-car',at:p(-570.6,-435.4)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-581.3,-426.9)},when:{actor:'brw-car',at:p(-568.2,-463.8)},frame:{yaw:0,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach to the mini-roundabout, so the traffic on it and behind you knows where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right'],['mirror-interior','mirror-right','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for Belton Road West.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a mini-roundabout you give way to traffic coming from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the green car',
              message:'The green car coming along Belton Road West from the right was at the mini-roundabout, turning across your way into Bishop Meadow Road. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the green car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the green car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the green car coming from Belton Road West, on your right, was there first, turning across in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the green car went across. Look right again just before you go.'}},
            {kind:'required',id:'look-ahead',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check ahead and left',
              message:'Turning right, check ahead and left as well: traffic coming down Bishop Meadow Road has the mini-roundabout before you.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car had gone into Bishop Meadow Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and ahead again, then go: the green car had gone.'
        }
      ]
    },
    {
      id:'belton-zebra',
      title:'Zebra crossing',
      where:'Belton Road, the zebra crossing by Bottleacre Lane',
      instruction:'Follow the road ahead, please.',
      instructAt:p(712.7,149.2),
      starts:[{actor:'zebra-pedestrian',at:p(712.7,149.2),delay:0}],
      endAt:p(887.2,64.3),
      quiet:[{x:851,z:84,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(825.2,104.4)},frame:{yaw:0,pitch:22},state:'On Belton Road at 30 mph, the zebra crossing ahead.'},
        zebra:{pause:{kind:'stop',at:p(844.7,87.2)},when:{actor:'zebra-pedestrian',at:p(851.1,82.5)},frame:{yaw:0,pitch:30},
          state:'Stopped at the zebra crossing.'},
        clear:{pause:{kind:'stop',at:p(844.7,87.2)},when:{actor:'zebra-pedestrian',at:p(854,85.9)},frame:{yaw:0,pitch:30},
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
              message:'The pedestrian was across your half and on to the far side: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look both ways along the crossing, then go: the pedestrian was past your half.'
        }
      ]
    },
    {
      id:'gordon-road-right',
      turn:'right',
      title:'Right turn into Gordon Road, back to the test centre',
      where:'Station Boulevard, right into Gordon Road',
      instruction:'Turn right into Gordon Road, back to the test centre, please.',
      instructAt:p(1037,-106.3),
      starts:[{actor:'return-car',at:p(1024,-8.8),delay:0}],
      endAt:p(1131,-50.9),
      // Gordon Road, and Station Boulevard ahead, where the oncoming blue car comes from.
      quiet:[{x:1150,z:-84,radius:20},{x:1175,z:-62,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(1092.4,-105.5)},frame:{yaw:0,pitch:20},state:'On Station Boulevard at 30 mph, Gordon Road ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(1136.4,-92.6)},when:{actor:'return-car',at:p(1159.4,-76)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Gordon Road.'},
        clear:{pause:{kind:'stop',at:p(1136.4,-92.6)},when:{actor:'return-car',at:p(1111.5,-97.6)},frame:{yaw:30,pitch:32},
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
              message:'The blue car coming along Station Boulevard from the station was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:FLASH}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the blue car coming the other way was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Gordon Road',
              message:'Before you turn, look into Gordon Road (on your right) for anyone walking across it or a car coming out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Gordon Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    }
  ]
},BEFORE));
