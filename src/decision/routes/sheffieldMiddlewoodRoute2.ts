import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,HALIFAX_CAR,HERRIES_CAR,MWR_CAR,RBT_CAR} from './sheffieldMiddlewoodRoute2Paths';

/**
 * Sheffield (Middlewood Road) route 2, Parkside and Southey Green: eight challenges from the test centre at 508
 * Middlewood Road (its car park off Winn Gardens), left out of Winn Gardens on to Middlewood Road, Catch Bar Lane and
 * Parkside Road, left at the lights on to Penistone Road, Penistone Road North and Halifax Road, right into Southey
 * Green Road, right at its roundabout down Wordsworth Avenue (pulling up and moving off), right on to Herries Road, left
 * at the Herries Road lights on to Penistone Road North, and home by Owlerton, Hillsborough and Middlewood Road. Chosen
 * from the map and published route information (content/packs/sheffield-middlewood-road/ROUTES.md): the map's short
 * links across Penistone Road North at Leppings Lane cannot be planned (and the turn from Leppings Lane on to it cuts
 * the corner), so the drive joins it from Parkside Road and comes home round by Owlerton and Hillsborough. Scene
 * sheffield-middlewood-road-route-2 (OpenStreetMap). A practice route, not a confirmed test route.
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
 * the hazard is in view only at the line; the Parkside Road lights keep a third: the red light, then someone still on
 * the crossing on green, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  // (At the line: the houses on the corner hide Middlewood Road until there.)
  'leave-test-centre':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-860.8,-719.8)},when:{actor:'mwr-car',at:p(-878.2,-732.5)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the end of Winn Gardens.'}},
  'parkside-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(88.3,251.4)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Penistone Road lights on Parkside Road. They are red.'}},
  'southey-green-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(371.8,-991)},when:{actor:'halifax-car',at:p(437.1,-1022.7)},frame:{yaw:0,pitch:44,shift:-4},
    state:'On Halifax Road, Southey Green Road just ahead on the right.'}},
  'southey-green-roundabout':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(771.7,-905.4)},when:{actor:'rbt-car',at:p(809.5,-883.9)},frame:{yaw:-50,pitch:30},
    state:'Approaching the Southey Green Road roundabout.'}},
  // (At the line: the houses on the corner hide Herries Road until there.)
  'wordsworth-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(707.4,-301)},when:{actor:'herries-car',at:p(688.3,-286)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the end of Wordsworth Avenue.'}},
  'herries-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(5.8,-333.7)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Herries Road lights. They are red.'}},
};

export const SHEFFIELD_MIDDLEWOOD_ROUTE_2:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'sheffield-middlewood-road-2',
  title:'Sheffield (Middlewood Road) route 2',
  scene:'sheffield-middlewood-road-route-2',
  briefing:'Sheffield (Middlewood Road) route 2: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nBased on the roads round this test centre. Your test route may differ. Built from OpenStreetMap data; the app\'s assessment, not a DVSA result.',
  start:{x:-846.8,z:-776.9,headingDeg:144.8},
  // The test centre's car park, Winn Gardens, Middlewood Road, Catch Bar Lane, Parkside Road, Penistone Road (North),
  // Halifax Road, Southey Green Road, Wordsworth Avenue (pulling up and moving off), Herries Road, Penistone Road North,
  // Owlerton Green, Bradfield Road, Middlewood Road, Winn Gardens and back into the car park.
  through:pts([[-792,-607],[-546,-252],[-274,22],[-155,110],[-5,210],[-47,-585],[350,-962],[626,-933],[797,-661],[562,-179],[19,-326],[43,-79],
    [175,806],[5,908],[-191,911],[-273,340],[-571,-283],[-822,-652],[-844,-772.8]]),
  // Pulled in to the kerb on Wordsworth Avenue (no cars parked, and no side roads, along this stretch).
  // (And a little wide of the corners turning right into Southey Green Road and on to Middlewood Road at Hillsborough,
  // as drivers do, not over their footways.)
  shifts:[{from:p(789.9,-604.9),to:p(787.6,-590.1),left:.35},{from:p(392,-1000),to:p(428,-991),left:.9},{from:p(-76,993),to:p(-108,993),left:1.2}],
  actors:[
    {id:'mwr-car',name:'silver car',colour:'#b8bcc2',speed:11,path:pts(MWR_CAR)},
    // On the crossing over the slip to Penistone Road, left to right, as the lights turn green.
    {id:'parkside-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[123.4,246.6],[129.6,250.9]])},
    {id:'halifax-car',name:'blue car',colour:'#2563eb',speed:12,path:pts(HALIFAX_CAR)},
    {id:'rbt-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(RBT_CAR)},
    // Down Wordsworth Avenue behind the car, past it at the kerb, and left on to Herries Road.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'herries-car',name:'black car',colour:'#1f2328',speed:11,path:pts(HERRIES_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'left',
      title:'Leaving the test centre',
      where:'Winn Gardens, left on to Middlewood Road',
      instruction:'Drive out of the car park, and at the end of the road turn left, please.',
      instructAt:p(-846.8,-776.9),
      starts:[{actor:'mwr-car',at:p(-828.4,-743.1),delay:0}],
      endAt:p(-846.2,-688.1),
      // The junction, and Middlewood Road to the right, where the silver car comes from.
      quiet:[{x:-864,z:-716,radius:26},{x:-895,z:-748,radius:36}],
      place:{
        approach:{pause:{kind:'moving',at:p(-844.4,-731.3)},frame:{yaw:0,pitch:22},state:'Approaching the end of Winn Gardens at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-860.8,-719.8)},when:{actor:'mwr-car',at:p(-878.2,-732.5)},frame:{yaw:-70,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-860.8,-719.8)},when:{actor:'mwr-car',at:p(-850.7,-694.4)},frame:{yaw:-55,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Middlewood Road knows where you are going.'}},
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
              message:'Look right first: turning left, you join the traffic coming down Middlewood Road from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the silver car',
              message:'The silver car coming down Middlewood Road from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the silver car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the silver car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the silver car coming down Middlewood Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the silver car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking on your side of Middlewood Road, or queuing back from the Middlewood Drive lights.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming down Middlewood Road: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: nothing more was coming down Middlewood Road.'
        }
      ]
    },
    {
      id:'parkside-lights',
      turn:'left',
      title:'Traffic lights, turn left',
      where:'Parkside Road, left at the lights on to Penistone Road',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(6.9,213),
      starts:[{actor:'parkside-pedestrian',at:p(6.9,213),delay:0}],
      lights:p(123.3,252.7),
      endAt:p(119.5,205.4),
      quiet:[{x:125,z:240,radius:30},{x:122,z:215,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(60.9,239.1)},lights:'red',frame:{yaw:0,pitch:22},state:'On Parkside Road, the Penistone Road lights ahead.'},
        line:{pause:{kind:'stop',at:p(118.6,256.3)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        green:{pause:{kind:'stop',at:p(118.6,256.3)},lights:'red',when:{actor:'parkside-pedestrian',at:p(126,248.4)},panel:'right',frame:{yaw:0,pitch:30},
          state:'At the stop line. The lights have turned green.'},
        clear:{pause:{kind:'stop',at:p(118.6,256.3)},when:{actor:'parkside-pedestrian',at:p(129,250.5)},panel:'right',frame:{yaw:-15,pitch:30},
          state:'Still at the stop line, on green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the lights, so the traffic behind and anyone crossing know where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Slow down to stop at the line.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left, ready to stop at the red light.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go'],
          neutral:['look-left','look-right','mirror-left'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-left','give-way']],
          next:{wait:'green',go:'green'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'green',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go','horn'],
          neutral:['look-right','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left','look-right'],any:true,fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Look along the crossing first, so you know who you are waiting for.'}},
            {kind:'unsafe',id:'pedestrian',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Moved off with someone still crossing',
              message:'Green means go only if the way is clear. The pedestrian was still on the crossing just ahead of you, in the way you were turning. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait, even on green: the pedestrian was still on the crossing just ahead, in the way you were turning.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go'],
          neutral:['look-right'],
          rules:[
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: a cyclist may have come up beside you while you waited.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was across and the lights were green: this was the time to go.'}}
          ],
          accepted:[['mirror-left','go'],['look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Left mirror, then go: the lights were green and the pedestrian was across.'
        }
      ]
    },
    {
      id:'southey-green-right',
      turn:'right',
      title:'Right turn into a side road',
      where:'Halifax Road, right into Southey Green Road',
      instruction:'Take the next road on the right, please.',
      instructAt:p(327.2,-968.3),
      starts:[{actor:'halifax-car',at:p(327.2,-968.3),delay:0}],
      endAt:p(437.2,-987.8),
      // The junction, Halifax Road ahead, where the blue car comes from, and the mouth of Southey Green Road.
      quiet:[{x:405,z:-1003,radius:30},{x:445,z:-1030,radius:40},{x:430,z:-992,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(360,-985)},frame:{yaw:0,pitch:20},state:'On Halifax Road at 40 mph, Southey Green Road ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(400.5,-1004.9)},when:{actor:'halifax-car',at:p(437.1,-1022.7)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Southey Green Road.'},
        clear:{pause:{kind:'stop',at:p(400.5,-1004.9)},when:{actor:'halifax-car',at:p(379.5,-983.8)},frame:{yaw:25,pitch:32},
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
              message:'Move over towards the gap in the middle of the road to turn right: traffic behind can pass on your left.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move towards the middle of the road.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'centre'},
          explain:'Interior and right mirrors, signal right, then position for the gap in the middle of the road.'
        },
        {
          id:'centre',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','flash-lights'],
          neutral:['look-right','look-left','mirror-right'],
          rules:[
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming blue car',
              message:'The blue car coming down Halifax Road was going ahead at speed, and it has priority over you turning right. It was a couple of seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the blue car coming down Halifax Road was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Southey Green Road',
              message:'Before you turn, look into the road you are turning into (on your right) for anyone crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming down Halifax Road: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Southey Green Road is clear to turn into, then go: nothing more was coming the other way.'
        }
      ]
    },
    {
      id:'southey-green-roundabout',
      turn:'right',
      title:'Roundabout, turn right',
      where:'Southey Green Road at its roundabout, right (third exit) on to Wordsworth Avenue',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(702.9,-918.2),
      starts:[{actor:'rbt-car',at:p(702.9,-918.2),delay:0}],
      endAt:p(824.2,-842.4),
      // The entry, and the circulating carriageway to the right, where the white car comes round.
      quiet:[{x:812,z:-900,radius:30},{x:810,z:-860,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(740,-911)},frame:{yaw:0,pitch:22},state:'Approaching the Southey Green Road roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(797.2,-901.9)},when:{actor:'rbt-car',at:p(809.5,-883.9)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(797.2,-901.9)},when:{actor:'rbt-car',at:p(829.1,-912.2)},frame:{yaw:-40,pitch:28},state:'Still at the give way line.'}
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
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming round the roundabout from Wordsworth Avenue, on your right, was close and crossing your entry. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the white car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the white car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the white car coming round from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming round from the right: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: nothing more was coming round.'
        }
      ]
    },
    {
      id:'wordsworth-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Wordsworth Avenue, past Avisford Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(800.9,-679.1),
      starts:[{actor:'cyclist',at:p(800.9,-679.1),delay:0}],
      endAt:p(787.6,-590.1),
      selfCancel:false,
      quiet:[{x:788,z:-595,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(795.2,-639.5)},frame:{yaw:15,pitch:28},state:'On Wordsworth Avenue at 30 mph, Avisford Road behind you.'},
        stopped:{pause:{kind:'stop',at:p(787.6,-590.1)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: well past Avisford Road, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers turning in and out of Avisford Road would come round the corner on to you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Avisford Road; mirrors, then signal left.'
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
      id:'wordsworth-move-off',
      turn:'right',
      title:'Moving off',
      where:'Wordsworth Avenue, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(787.6,-590.1),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(800.9,-679.1),delay:0}],
      endAt:p(778.8,-530.7),
      quiet:[{x:788,z:-590,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(787.6,-590.1)},when:{actor:'cyclist',at:p(788.9,-611.6)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(787.6,-590.1)},when:{actor:'cyclist',at:p(784.1,-565.2)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist coming down Wordsworth Avenue was just behind your right shoulder, about to pass. The examiner had to stop the car.'}},
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
              message:'Look over your right shoulder just before you move off: another cyclist can be there, out of the mirror\'s view.'}},
            {kind:'before',id:'mirror-before-blind-spot',action:'go',needs:['mirror-right'],fault:{level:'minor',heading:'Move off - safety',title:'No right mirror',
              message:'Check the right mirror as well as your blind spot before moving off.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe chance to move off',
              message:'The cyclist had gone by and nothing else was coming: this was the time to move off, giving them room.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'wordsworth-emerge',
      turn:'right',
      title:'Emerging, right turn',
      where:'Wordsworth Avenue, right on to Herries Road',
      instruction:'At the end of the road, turn right, please.',
      instructAt:p(722.3,-360.1),
      starts:[{actor:'herries-car',at:p(722.3,-360.1),delay:0}],
      endAt:p(668.5,-271.3),
      // The junction, Herries Road to the right, where the black car comes from, and to the left.
      quiet:[{x:707,z:-294,radius:26},{x:675,z:-275,radius:34},{x:735,z:-300,radius:26}],
      place:{
        approach:{pause:{kind:'moving',at:p(706.2,-323.8)},frame:{yaw:0,pitch:22},state:'Approaching the end of Wordsworth Avenue at 20 mph.'},
        line:{pause:{kind:'stop',at:p(707.4,-301)},when:{actor:'herries-car',at:p(688.3,-286)},frame:{yaw:-70,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(707.4,-301)},when:{actor:'herries-car',at:p(733.1,-299)},frame:{yaw:-40,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach, so the traffic on Herries Road knows where you are going.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move towards the middle of the road.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right and keep just left of the middle of Wordsworth Avenue.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: turning right, you cross the near half of Herries Road, where the traffic comes from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming along Herries Road from the right was close, in the half of the road you had to cross. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming along Herries Road from the right was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car passed. Look right again just before you go.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: turning right, you join the far half of Herries Road, where the traffic comes from the left.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Herries Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Herries Road was clear both ways.'
        }
      ]
    },
    {
      id:'herries-lights',
      turn:'left',
      title:'Traffic lights, turn left',
      where:'Herries Road, left at the lights on to Penistone Road North',
      instruction:'At the traffic lights, turn left, please.',
      instructAt:p(41.7,-306.6),
      starts:[],
      lights:p(-24.6,-353.1),
      lightsAll:true,
      endAt:p(-30.2,-314.3),
      quiet:[{x:-30,z:-345,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(5.8,-333.7)},lights:'red',frame:{yaw:0,pitch:24},state:'Approaching the lights at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-21.6,-352.1)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(-21.6,-352.1)},lights:'red',frame:{yaw:15,pitch:28},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','speed-up'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach to the lights, so the traffic behind and anyone crossing know where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:WRONG_LEFT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic on Penistone Road North, and anyone crossing, at risk.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Interior and left mirrors, then signal left, ready to stop at the red light.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go'],
          neutral:['look-left','look-right','mirror-left'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-left','give-way','go'],
          neutral:['look-right'],
          rules:[
            {kind:'required',id:'mirror-left',anyOf:['mirror-left'],when:'go',fault:{level:'minor',heading:'Use of mirrors - change direction',title:'No left mirror before turning',
              message:'Check the left mirror just before you turn: a cyclist may have come up beside you while you waited.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look into the road',
              message:'Look left into Penistone Road North before you go, for anyone late across or a queue on the far side of the junction.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the way was clear: this was the time to go.'}}
          ],
          accepted:[['mirror-left','look-left','go'],['look-left','mirror-left','go']],
          next:{go:'done'},
          explain:'Left mirror and a look into Penistone Road North, then go: the lights were green and the way was clear.'
        }
      ]
    }
  ]
},BEFORE));
