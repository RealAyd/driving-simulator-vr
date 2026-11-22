import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EMERGE_CAR,LEAVE_CAR,MINI_CAR,ONCOMING_CAR,RING_CAR} from './bletchleyRoute1Paths';

/**
 * Bletchley, Whalley Drive and Sherwood Drive: eight challenges from the test centre on Wilton Avenue: left out of the
 * test centre on to Wilton Avenue, ahead at the Church Green Road mini-roundabout into Rickley Lane, pulling up and
 * moving off on Whalley Drive, right off Whalley Drive into Sherwood Drive, ahead over the signal crossing on Sherwood
 * Drive by Jemima Way, right at the Sherwood Drive roundabout on to Buckingham Road, and right out of Cottingham Grove
 * on to Buckingham Road; back by Church Green Road to Wilton Avenue. Chosen from the map and the published evidence
 * (content/packs/bletchley/ROUTES.md). Scene bletchley-route-1 (OpenStreetMap). A practice route, not a confirmed test
 * route.
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
 * the hazard is in view only at the line, or the moment is set by where the car waits. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the hedges and the houses on the corner hide Rickley Lane until there.)
  'rickley-mini':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-234.9,247.9)},when:{actor:'mini-car',at:p(-251.2,237.6)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Church Green Road mini-roundabout.'}},
  // (In the road: the oncoming car, not the map, sets when the car gets there.)
  'sherwood-turn':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(37.3,-677.7)},when:{actor:'oncoming-car',at:p(48,-694.3)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting on Whalley Drive to turn right into Sherwood Drive.'}},
  'jemima-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(294.8,-6.4)},lights:'red',when:{actor:'jemima-pedestrian',at:p(296.6,20.5)},frame:{yaw:0,pitch:52,shift:-6},
    state:'Approaching the crossing on Sherwood Drive. The lights are red.'}},
  // (At the line: the island and the cars on it hide the traffic coming round until there.)
  'sherwood-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(274.6,380.8)},when:{actor:'ring-car',at:p(264.6,397.2)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the give way line of the Sherwood Drive roundabout.'}},
  // (At the line: the houses and the hedges on the corner hide Buckingham Road until there.)
  'cottingham-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(37.8,484)},when:{actor:'emerge-car',at:p(57.6,474.2)},frame:{yaw:-60,pitch:40,shift:-4},
    state:'At the end of Cottingham Grove.'}}
};

export const BLETCHLEY_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'bletchley-1',
  title:'Bletchley: Whalley Drive and Sherwood Drive',
  scene:'bletchley-route-1',
  briefing:'Bletchley, Whalley Drive and Sherwood Drive: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-8.4,z:338.5,headingDeg:196},
  // The test centre's car park and way out, Wilton Avenue, Church Green Road, the mini-roundabout, Rickley Lane,
  // Whalley Drive, Sherwood Drive, the Sherwood Drive roundabout, Buckingham Road west, Cottingham Grove round, then
  // Buckingham Road east, Church Green Road and Wilton Avenue back past the test centre's way in.
  through:pts([[-145,288],[-315,162],[-129,-411],[194,-571],[300,205],[125,454],[-220,511],[-281,660],[-146,739],[58,549],[61,472],
    [15,400],[-43,329],[-39,295]]),
  // Pulled in to the kerb on Whalley Drive (no cars parked along it: room for the cyclist to pass).
  shifts:[{from:p(-160.7,-343.1),to:p(-150.4,-365.9),left:.5}],
  actors:[
    {id:'leave-car',name:'silver car',colour:'#c0c4ca',speed:8,path:pts(LEAVE_CAR)},
    {id:'mini-car',name:'red car',colour:'#b91c1c',speed:8,path:pts(MINI_CAR)},
    // Behind the car up Whalley Drive, past it at the kerb, and on towards Sherwood Drive.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'oncoming-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(ONCOMING_CAR)},
    // On the crossing on Sherwood Drive, from the far (west) kerb across the car's lane, on the red.
    {id:'jemima-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[294.3,20.9],[303.7,19.1],[304.3,22]])},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:8,path:pts(RING_CAR)},
    {id:'emerge-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(EMERGE_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, left on to Wilton Avenue',
      instruction:'When you\'re ready, drive out of the test centre and turn left, please.',
      instructAt:p(-8.4,338.5),
      // (Set going as the car moves off, so it comes down Wilton Avenue as the car reaches the line.)
      starts:[{actor:'leave-car',at:p(-8.4,338.5),delay:0}],
      endAt:p(-40.6,325.5),
      // The way out, Wilton Avenue to the right, where the silver car comes from, and to the left down to Church Green
      // Road, where it goes.
      quiet:[{x:-37,z:311,radius:14},{x:-32,z:285,radius:18},{x:-47,z:342,radius:16},{x:-20,z:370,radius:18}],
      place:{
        line:{pause:{kind:'stop',at:p(-31.8,311.6)},when:{actor:'leave-car',at:p(-35.4,299.9)},frame:{yaw:-60,pitch:32},
          state:'At the end of the test centre\'s way out, at the edge of Wilton Avenue.'},
        clear:{pause:{kind:'stop',at:p(-31.8,311.6)},when:{actor:'leave-car',at:p(-46.6,340.7)},frame:{yaw:20,pitch:32},
          state:'Still at the edge of Wilton Avenue.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','signal-left','signal-right','give-way','go'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning left, you join the near lane of Wilton Avenue, and its traffic comes from the right. The mirror on the corner helps you see up it.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left so the drivers on Wilton Avenue know what you are doing.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car coming down Wilton Avenue from the right was close, in the lane you were joining. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-left','give-way'],['signal-left','look-right','give-way'],['look-right','look-left','signal-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal left and wait: the silver car coming down Wilton Avenue from the right was close, in the lane you join.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: someone may be walking across the way out, or coming up Wilton Avenue on your side.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The silver car had gone by and Wilton Avenue was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the silver car had gone by and Wilton Avenue was clear.'
        }
      ]
    },
    {
      id:'rickley-mini',
      title:'Mini-roundabout, ahead',
      where:'Church Green Road at the Rickley Lane mini-roundabout, ahead into Rickley Lane',
      instruction:'At the mini-roundabout, follow the road ahead, please.',
      instructAt:p(-206.7,255.6),
      // (Set going as the car comes along Church Green Road, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'mini-car',at:p(-141.5,292.2),delay:0}],
      endAt:p(-270.2,227),
      // The mini-roundabout, Rickley Lane to the right, where the red car comes from, Church Green Road to the left,
      // where it goes, and the car's own approach.
      quiet:[{x:-244,z:244,radius:14},{x:-268,z:218,radius:20},{x:-258,z:262,radius:14},{x:-222,z:252,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(-219.1,251.8)},frame:{yaw:0,pitch:22},state:'Approaching the mini-roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-234.9,247.9)},when:{actor:'mini-car',at:p(-251.2,237.6)},frame:{yaw:-60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-234.9,247.9)},when:{actor:'mini-car',at:p(-252,258.3)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
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
              message:'You are going ahead into Rickley Lane: a left signal says you are taking Church Green Road off to the left.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead into Rickley Lane: a right signal says you are going all the way round.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up to the mini-roundabout',
              message:'Slow down for a mini-roundabout: the red car was coming down Rickley Lane to it from the right.'}}
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
              message:'The red car coming down Rickley Lane, on your right, was at the mini-roundabout, going round across your way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming down Rickley Lane, on your right, was there first, going round in front of you.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car went round. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone off along Church Green Road and nothing more was coming: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go ahead: the red car had gone.'
        }
      ]
    },
    {
      id:'whalley-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Whalley Drive, north-east of Rickley Lane',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-164.8,-333.9),
      starts:[{actor:'cyclist',at:p(-164.8,-333.9),delay:0}],
      endAt:p(-150.4,-365.9),
      selfCancel:false,
      // The pull-up, and the mouth of the side road just behind.
      quiet:[{x:-150,z:-366,radius:34},{x:-168,z:-323,radius:14}],
      place:{
        approach:{pause:{kind:'moving',at:p(-158.6,-347.6)},frame:{yaw:-15,pitch:28},state:'On Whalley Drive at 30 mph.'},
        stopped:{pause:{kind:'stop',at:p(-150.4,-365.9)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight, well past the side road you have just passed.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning in and out of the side road could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place on the straight, clear of the side road; mirrors, then signal left.'
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
      id:'whalley-move-off',
      turn:'right',
      title:'Moving off',
      where:'Whalley Drive, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-150.4,-365.9),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(-164.8,-333.9),delay:0}],
      endAt:p(-134,-402.3),
      quiet:[{x:-150,z:-366,radius:40},{x:-168,z:-323,radius:16}],
      place:{
        check:{pause:{kind:'stop',at:p(-150.4,-365.9)},when:{actor:'cyclist',at:p(-153.8,-353.7)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-150.4,-365.9)},when:{actor:'cyclist',at:p(-138.1,-393.2)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist had gone by, on up Whalley Drive, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'sherwood-turn',
      turn:'right',
      title:'Right turn across oncoming traffic',
      where:'Whalley Drive, right into Sherwood Drive',
      instruction:'Take the next road on the right, please.',
      instructAt:p(4.7,-628.7),
      // (Set going before the direction is given, so it comes down Whalley Drive as the car comes up to wait, whatever
      // held the car up on the way.)
      starts:[{actor:'oncoming-car',at:p(-26.2,-586.9),delay:0}],
      endAt:p(70.4,-674.4),
      // The junction, Whalley Drive to the north, where the grey car comes from, Sherwood Drive, and the lane beside the
      // car, where the grey car goes.
      quiet:[{x:44,z:-686,radius:20},{x:58,z:-735,radius:24},{x:72,z:-674,radius:18},{x:20,z:-652,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(21.3,-651.2)},frame:{yaw:0,pitch:20},state:'On Whalley Drive at 30 mph.'},
        centre:{pause:{kind:'stop',at:p(37.3,-677.7)},when:{actor:'oncoming-car',at:p(48,-694.3)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Sherwood Drive.'},
        clear:{pause:{kind:'stop',at:p(37.3,-677.7)},when:{actor:'oncoming-car',at:p(33.9,-665.1)},frame:{yaw:40,pitch:32},
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
              message:'Move to just left of the middle of the road to turn right: anyone behind can pass on your left.'}},
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
              message:'The grey car coming down Whalley Drive towards you was a few seconds away, and turning right you give way to it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the grey car coming down Whalley Drive towards you has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Sherwood Drive',
              message:'Before you turn, look into the road you are turning into (on your right): someone may be crossing its mouth.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and nothing more was coming: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Sherwood Drive is clear to turn into, then go: the grey car had gone by.'
        }
      ]
    },
    {
      id:'jemima-crossing',
      title:'Pedestrian crossing at the traffic lights',
      where:'Sherwood Drive, the signal crossing by Jemima Way',
      instruction:'Follow the road ahead, please.',
      instructAt:p(287.7,-40.7),
      // (Set going as the car comes up to the crossing, so they are on it as the car arrives, whatever held it up.)
      starts:[{actor:'jemima-pedestrian',at:p(291.8,-21.1),delay:0}],
      lights:p(299,20),
      endAt:p(304.3,39.6),
      // The crossing, the approach to it with the mouth of Jemima Way, and Sherwood Drive just past it.
      quiet:[{x:299,z:20,radius:22},{x:293,z:-8,radius:16},{x:303,z:42,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(294.8,-6.4)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the crossing at 30 mph.'},
        line:{pause:{kind:'stop',at:p(299.7,15.6)},lights:'red',when:{actor:'jemima-pedestrian',at:p(296.6,20.5)},frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(299.7,15.6)},lights:'red',when:{actor:'jemima-pedestrian',at:p(303.7,19.1)},frame:{yaw:0,pitch:30},
          state:'Still at the crossing.'}
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
              message:'The lights were red with someone stepping on to the crossing. Speeding up to get through would put them at risk.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the crossing was at red, with someone crossing.'
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
      id:'sherwood-roundabout',
      turn:'right',
      title:'Roundabout, turn right',
      where:'Sherwood Drive at the Buckingham Road roundabout, right (third exit) on to Buckingham Road',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(292.2,263.8),
      // (Set going before the direction is given, from 130 m back along Buckingham Road: paced to come round as the car
      // stops at the line, whatever traffic, or the crossing's lights, held the car up on the way.)
      starts:[{actor:'ring-car',at:p(304.9,195.2),delay:0}],
      endAt:p(267.5,408.2),
      // (And Cottingham Grove, narrow with cars parked along it, kept quiet from Buckingham Road all the way round until
      // the car is near its end: in traffic, one coming the other way met the car face to face there.)
      quietUntil:p(51.7,537.4),
      // The entry, the roundabout, Buckingham Road to the right (west), where the black car comes from, the car's
      // approach, and Water Eaton Road; then Cottingham Grove all the way round.
      quiet:[{x:278,z:396,radius:18},{x:238,z:412,radius:22},{x:268,z:362,radius:12},{x:292,z:412,radius:12},
        {x:-283,z:560,radius:40},{x:-280,z:648,radius:40},{x:-262,z:715,radius:40},{x:-209,z:729,radius:40},{x:-145,z:737,radius:40},
        {x:-81,z:730,radius:40},{x:-16,z:737,radius:40},{x:49,z:737,radius:40},{x:110,z:738,radius:40},{x:159,z:700,radius:40},
        {x:123,z:646,radius:40},{x:86,z:592,radius:40},{x:52,z:537,radius:40}],
      place:{
        approach:{pause:{kind:'moving',at:p(266.4,359)},frame:{yaw:0,pitch:22},state:'Approaching the Sherwood Drive roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(274.6,380.8)},when:{actor:'ring-car',at:p(264.6,397.2)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(274.6,380.8)},when:{actor:'ring-car',at:p(289,386.5)},frame:{yaw:-40,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so the traffic round it knows you are not leaving at Buckingham Road east or Water Eaton Road.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right for the third exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round the roundabout from Buckingham Road, on your right, was close and crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Buckingham Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone on round towards Buckingham Road east and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go'],['look-right','mirror-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone on round.'
        }
      ]
    },
    {
      id:'cottingham-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Cottingham Grove, right on to Buckingham Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(55.7,546.6),
      // (Set going as the car comes round Cottingham Grove, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'emerge-car',at:p(117.4,637.5),delay:0}],
      endAt:p(55.8,471.3),
      // The junction, Buckingham Road to the right, where the blue car comes from (with the end of Church Green Road),
      // and to the left, where it goes.
      quiet:[{x:38,z:480,radius:16},{x:76,z:467,radius:20},{x:120,z:453,radius:20},{x:5,z:487,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(43.6,508.6)},frame:{yaw:0,pitch:22},state:'Approaching the end of Cottingham Grove at 20 mph.'},
        line:{pause:{kind:'stop',at:p(37.8,484)},when:{actor:'emerge-car',at:p(57.6,474.2)},frame:{yaw:-60,pitch:28},state:'At the end of Cottingham Grove.'},
        clear:{pause:{kind:'stop',at:p(37.8,484)},when:{actor:'emerge-car',at:p(16.3,484)},frame:{yaw:-20,pitch:28},state:'Still at the end of Cottingham Grove.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Buckingham Road knows where you are going.'}},
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
              message:'Look right first: the traffic in the near lane of Buckingham Road, which you cross, comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car coming along Buckingham Road from the right was close, in the lane you were crossing. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the blue car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the blue car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car coming along Buckingham Road from the right was close, in the lane you cross.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and Buckingham Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the blue car had gone by and Buckingham Road was clear.'
        }
      ]
    }
  ]
},BEFORE));
