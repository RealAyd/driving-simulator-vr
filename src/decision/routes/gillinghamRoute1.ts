import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {BEECHINGS_CAR,COURTENEY_CAR,COURTENEY_VAN,FEATHERBY_VAN,ITO_CAR,SOVEREIGN_CAR} from './gillinghamRoute1Paths';

/**
 * Gillingham route 1, Sovereign Boulevard, Ito Way and Featherby Road: eight challenges from the test centre at Astra
 * Park, Courteney Road, right out of its way out on to Courteney Road, ahead at the Bowaters roundabout's lights on to
 * Sovereign Boulevard (the A2), its pedestrian lights by Eastcourt Lane, right at the Will Adams Roundabout on to Ito
 * Way, right from Beechings Way through the central reservation into Featherby Road, pulling up and moving off there,
 * and left on to Sovereign Boulevard, home by the Bowaters roundabout and Courteney Road. Chosen from the map and the
 * published evidence (content/packs/gillingham/ROUTES.md). Scene gillingham-route-1 (OpenStreetMap). A practice route,
 * not a confirmed test route.
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
 * the hazard is in view only at the line; leaving the test centre keeps a third: a van from the right, then a car from
 * the left, are two hazards at one place. */
const BEFORE:Record<string,BeforeMerge>={
  'bowater-roundabout':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(404,514.5)},lights:'red',frame:{yaw:0,pitch:44,shift:-4},
    state:'Approaching the Bowaters roundabout from Courteney Road. The lights are red.'}},
  'sovereign-lights':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(205.8,350.7)},lights:'red',when:{actor:'sovereign-pedestrian',at:p(171.9,344.6)},panel:'right',frame:{yaw:0,pitch:44,shift:5},
    state:'On Sovereign Boulevard, the pedestrian lights ahead. They are red.'}},
  // (At the line: the ring's island and the crossing's railings hide the traffic coming round until there.)
  'will-adams-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-380.5,186.4)},when:{actor:'ito-car',at:p(-386.6,178)},frame:{yaw:-60,pitch:44,shift:-4},
    state:'At the give way line of the Will Adams Roundabout.'}},
  'featherby-right':{first:'approach',second:'centre',place:{pause:{kind:'moving',at:p(71.8,-840.2)},when:{actor:'beechings-car',at:p(134.1,-803.6)},frame:{yaw:0,pitch:44,shift:-4},
    state:'On Beechings Way, the gap into Featherby Road just ahead on the right.'}},
  // (At the line: the bushes on the corner hide Sovereign Boulevard to the right until there.)
  'featherby-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-119.5,242.8)},when:{actor:'sovereign-car',at:p(-137.9,244.3)},frame:{yaw:-65,pitch:40,shift:-4},
    state:'At the end of Featherby Road.'}}
};

export const GILLINGHAM_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'gillingham-1',
  title:'Gillingham route 1',
  scene:'gillingham-route-1',
  briefing:'Gillingham route 1: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:354.62,z:823.13,headingDeg:278.66},
  // The test centre's way out, Courteney Road, the Tesco roundabout, the Bowaters roundabout, Sovereign Boulevard, the
  // Will Adams Roundabout, Ito Way, the Cornwallis Roundabout, Beechings Way, Featherby Road, Sovereign Boulevard, the
  // Bowaters roundabout, Courteney Road and back into the way out.
  through:pts([[332,757],[382,566],[45,310],[-392,-40],[70,-838],[49,-715],[-100,-221],[-106,52],[332,757],[365,824]]),
  // Pulled in to the kerb on Featherby Road, past Chilham Road (no cars parked for 30 m behind and 70 m ahead).
  // And kept out from the inside of the tight corners at the Tesco roundabout, on to it and off it (its lamp posts).
  shifts:[{from:p(-89.5,-295.2),to:p(-91.8,-268.4),left:.35},{from:p(354.9,643.4),to:p(361.2,633.8),left:-.4},{from:p(367.9,647.6),to:p(359.3,644.1),left:-1}],
  actors:[
    {id:'courteney-van',name:'white van',colour:'#f5f5f4',speed:9,path:pts(COURTENEY_VAN)},
    {id:'courteney-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(COURTENEY_CAR)},
    // Waiting at the pedestrian lights on the left, then across the westbound carriageway in front of the car.
    {id:'sovereign-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.3,kind:'pedestrian',waits:true,path:pts([[171.4,347.4],[172.9,338.9]])},
    {id:'ito-car',name:'black car',colour:'#1f2328',speed:10,path:pts(ITO_CAR)},
    {id:'beechings-car',name:'silver car',colour:'#c3c7cf',speed:13,path:pts(BEECHINGS_CAR)},
    // Behind the car along Featherby Road, to its pull-up, past it, and left into Elmfield.
    {id:'featherby-van',name:'white van',colour:'#e5e7eb',speed:9,yields:true,path:pts(FEATHERBY_VAN)},
    {id:'sovereign-car',name:'red car',colour:'#b91c1c',speed:13,path:pts(SOVEREIGN_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre',
      where:'The test centre\'s way out, right on to Courteney Road',
      instruction:'When you\'re ready, drive out of the test centre and turn right, please.',
      instructAt:p(354.6,823.1),
      starts:[{actor:'courteney-van',at:p(354.6,823.1),delay:0},{actor:'courteney-car',at:p(354.6,823.1),delay:0}],
      endAt:p(329.3,798.8),
      // The way out, Courteney Road to the right (north), where the white van comes from, and to the left.
      quiet:[{x:336,z:820,radius:14},{x:333,z:790,radius:24},{x:328,z:852,radius:26}],
      place:{
        line:{pause:{kind:'stop',at:p(337.5,820.6)},when:{actor:'courteney-van',at:p(332.2,798)},frame:{yaw:-70,pitch:32},
          state:'At the end of the way out, at the edge of Courteney Road.'},
        left:{pause:{kind:'stop',at:p(337.5,820.6)},when:{actor:'courteney-car',at:p(329.2,845)},frame:{yaw:60,pitch:32},
          state:'Still at the edge of Courteney Road.'},
        clear:{pause:{kind:'stop',at:p(337.5,820.6)},when:{actor:'courteney-car',at:p(330.1,790.1)},frame:{yaw:-30,pitch:32},
          state:'Still at the edge of Courteney Road.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Courteney Road, which you cross, comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Courteney Road know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning right: a left signal misleads everyone on Courteney Road.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white van',
              message:'The white van coming down Courteney Road from the right was a second or two away in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'left',go:'left'},
          explain:'Signal right and wait: the white van coming down Courteney Road from the right was close, in the lane you were crossing.'
        },
        {
          id:'left',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-right','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-left'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking left',
              message:'Look left as well: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'unsafe',id:'pulled-out-left',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The white van had passed, but the blue car coming up Courteney Road from the left was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN}
          ],
          accepted:[['look-left','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait again: the right was clear, but the blue car coming up Courteney Road from the left was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the blue car came by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look left',
              message:'Look left again too: more traffic may be coming up from Hoath Lane.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Courteney Road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: Courteney Road was clear both ways.'
        }
      ]
    },
    {
      id:'bowater-roundabout',
      title:'Roundabout with traffic lights',
      where:'Courteney Road at the Bowaters roundabout, second exit on to Sovereign Boulevard',
      instruction:'At the roundabout, take the second exit, please.',
      instructAt:p(385.7,553.1),
      starts:[],
      lights:p(402.4,484.7),
      endAt:p(296.2,423.1),
      // The entry, and the circulating carriageway to the right.
      quiet:[{x:404,z:486,radius:18},{x:392,z:464,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(395.9,527.1)},lights:'red',frame:{yaw:0,pitch:22},state:'On Courteney Road, the Bowaters roundabout ahead.'},
        line:{pause:{kind:'stop',at:p(406.4,487.9)},lights:'red',frame:{yaw:0,pitch:28},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(406.4,487.9)},lights:'red',frame:{yaw:-40,pitch:30},state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','signal-left','signal-right','speed-up'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signalled left too early',
              message:'For the second exit, going ahead on to Sovereign Boulevard, give no signal on the approach: signal left only once you pass the exit before yours, Hoath Way.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round past Sovereign Boulevard, to Twydall Lane or London Road: the traffic at the other entries would be misled.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red. Speeding up to get through puts the traffic coming round the roundabout at risk.'}}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down for the red light. No signal: the second exit is ahead.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go'],
          neutral:['look-left','look-right','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'red-light',action:'go',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Went through a red light',
              message:'The lights were red, with traffic going round the roundabout in front of you. The examiner had to stop the car.'}}
          ],
          accepted:[['give-way'],['mirror-interior','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait at the line: the lights were red.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'required',id:'look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look right before going',
              message:'Green means go only if the way is clear. Look right round the roundabout for anyone late through their red light from London Road before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The lights were green and the roundabout was clear: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right round the roundabout, then go: the lights were green and the way was clear.'
        }
      ]
    },
    {
      id:'sovereign-lights',
      title:'Traffic lights, pedestrian crossing',
      where:'Sovereign Boulevard (A2), the pedestrian lights by Eastcourt Lane',
      instruction:'Follow the road ahead, please.',
      instructAt:p(238.8,362.2),
      starts:[{actor:'sovereign-pedestrian',at:p(238.8,362.2),delay:0}],
      lights:p(176,343.3),
      endAt:p(147,338.8),
      quiet:[{x:174,z:344,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:p(229.7,358)},lights:'red',frame:{yaw:0,pitch:22},state:'On Sovereign Boulevard, the pedestrian lights ahead.'},
        line:{pause:{kind:'stop',at:p(181.3,346)},lights:'red',when:{actor:'sovereign-pedestrian',at:p(171.9,344.6)},panel:'right',frame:{yaw:0,pitch:30},state:'Stopped at the stop line.'},
        clear:{pause:{kind:'stop',at:p(181.3,346)},lights:'red',when:{actor:'sovereign-pedestrian',at:p(172.8,339.5)},panel:'right',frame:{yaw:0,pitch:30},
          state:'At the stop line. The lights have turned green.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','slow-down','speed-up','signal-right','horn'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed before the mirror',
              message:'Check the interior mirror before you slow down: on a 40 mph road you need to know how close the traffic behind is.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down','give-way'],fault:{level:'serious',heading:'Response to signals - traffic lights',title:'Did not slow for the red light',
              message:'The lights were red and someone was crossing. Slow down in good time to stop at the line.'}},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'dangerous',heading:'Response to signals - traffic lights',title:'Sped up at a red light',
              message:'The lights were red for someone crossing Sovereign Boulevard. Speeding up to get through puts them at risk.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for a turn you are not making',
              message:'You are going ahead along the dual carriageway: a right signal says you are moving out to the right-hand lane.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:PED_HORN}
          ],
          accepted:[['mirror-interior','slow-down'],['mirror-interior','mirror-left','slow-down']],
          next:{then:'line'},
          explain:'Interior mirror, then slow down: the lights were red and someone was stepping on to the crossing.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['look-left','look-right','mirror-interior'],
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
          buttons:['look-right','look-left','mirror-interior','give-way','go'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-right','look-left'],when:'go',fault:{level:'minor',heading:'Pedestrian crossings',title:'No check before going',
              message:'Green means go only if the crossing is clear. Look both ways along it for anyone hurrying across late before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited at a green light',
              message:'The pedestrian was on the central island and the lights were green: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look both ways along the crossing, then go: the pedestrian was on the central island and the lights were green.'
        }
      ]
    },
    {
      id:'will-adams-roundabout',
      turn:'right',
      title:'Roundabout, turn right',
      where:'Sovereign Boulevard at the Will Adams Roundabout, right (third exit) on to Ito Way',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(-324.1,204.5),
      starts:[{actor:'ito-car',at:p(-237.7,229.9),delay:0}],
      endAt:p(-409,144),
      // The entry, the circulating carriageway to the right, where the black car comes round, and Ito Way's way on.
      quiet:[{x:-383,z:187,radius:16},{x:-387,z:170,radius:16},{x:-393,z:140,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-346,194.5)},frame:{yaw:0,pitch:22},state:'Approaching the Will Adams Roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(-380.5,186.4)},when:{actor:'ito-car',at:p(-386.6,178)},frame:{yaw:-70,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-380.5,186.4)},when:{actor:'ito-car',at:p(-402,208)},frame:{yaw:-40,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','position-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so the traffic round it knows you are not leaving at Will Adams Way or the A2.'}},
            {kind:'required',id:'no-position',anyOf:['position-right'],fault:{level:'minor',heading:'Positioning - normal driving',title:'Not in the right-hand lane',
              message:'Approach in the right-hand lane to turn right at the roundabout: the left-hand lane is for Will Adams Way and the A2 ahead.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, signal right, and the right-hand lane for the third exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round the roundabout from Ito Way, on your right, was close and crossing your entry on its way to Will Adams Way. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Ito Way, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone out into Will Adams Way and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go'],['look-right','mirror-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone out into Will Adams Way.'
        }
      ]
    },
    {
      id:'featherby-right',
      turn:'right',
      title:'Right turn into a side road',
      where:'Beechings Way, right through the central reservation into Featherby Road',
      instruction:'Take the next road on the right, please.',
      instructAt:p(24.6,-867.7),
      starts:[{actor:'beechings-car',at:p(-18.3,-856.8),delay:0}],
      endAt:p(86.5,-781.3),
      // The gap and Featherby Road's end, and Beechings Way's westbound carriageway to the east, where the silver car comes from.
      quiet:[{x:101,z:-821,radius:14},{x:128,z:-806,radius:24}],
      place:{
        approach:{pause:{kind:'moving',at:p(62.6,-844.2)},frame:{yaw:0,pitch:20},state:'On Beechings Way, Featherby Road ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(100.1,-826.4)},when:{actor:'beechings-car',at:p(134.1,-803.6)},frame:{yaw:-20,pitch:32},
          state:'Waiting in the gap to turn right into Featherby Road.'},
        clear:{pause:{kind:'stop',at:p(100.1,-826.4)},when:{actor:'beechings-car',at:p(80.1,-825.3)},frame:{yaw:20,pitch:32},
          state:'Still waiting in the gap.'}
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
              message:'Keep to the right of your lane, ready to turn into the gap in the central reservation: traffic behind can pass on your left.'}},
            {kind:'before',id:'signal-before-position',action:'position-right',needs:['signal-right'],fault:{level:'minor',heading:'Signals - timed',title:'Moved over before signalling',
              message:'Mirrors, signal, then position: signal before you move over to the right.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right','position-right'],['mirror-right','mirror-interior','signal-right','position-right']],
          next:{then:'centre'},
          explain:'Interior and right mirrors, signal right, then position to the right of your lane.'
        },
        {
          id:'centre',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','flash-lights'],
          neutral:['look-right','look-left','mirror-right'],
          rules:[
            {kind:'unsafe',id:'turned-across',action:'go',fault:{level:'dangerous',heading:'Judgement - crossing',title:'Turned across the oncoming silver car',
              message:'The silver car coming along the other carriageway of Beechings Way was going ahead to the Cornwallis Roundabout, and it has priority over you crossing it. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-left','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the gap: the silver car coming along the other carriageway was going ahead, and it has priority over you crossing it.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['mirror-right'],
          rules:[
            {kind:'required',id:'check-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look along the carriageway',
              message:'Before you cross, look left along the carriageway you are crossing: the traffic on it comes from there.'}},
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Featherby Road',
              message:'Before you turn, look into Featherby Road for anyone crossing it or a car waiting to come out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing more was coming along Beechings Way: this was the time to go.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','look-left','go']],
          next:{go:'done'},
          explain:'Look left along the carriageway and into Featherby Road, then go: nothing more was coming.'
        }
      ]
    },
    {
      id:'featherby-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Featherby Road, past Chilham Road',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(-85.5,-319.8),
      starts:[{actor:'featherby-van',at:p(-85.5,-319.8),delay:0}],
      endAt:p(-91.8,-268.4),
      selfCancel:false,
      quiet:[{x:-92,z:-268,radius:34}],
      place:{
        approach:{pause:{kind:'moving',at:p(-89.1,-300.2)},frame:{yaw:15,pitch:28},state:'On Featherby Road at 20 mph, Chilham Road just behind on the left, a van behind.'},
        stopped:{pause:{kind:'stop',at:p(-91.8,-268.4)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','signal-left','signal-right','stop-at-junction','stop-past-junction'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:{level:'serious',heading:'Use of mirrors - signalling',title:'Signalled before checking behind',
              message:'The white van was behind. Check the mirrors before you signal and slow down, so you know how much warning it needs.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal to pull in',
              message:'Signal left before you pull in, so the van behind knows you are stopping.'}},
            {kind:'required',id:'place',anyOf:['stop-past-junction'],fault:{level:'serious',heading:'Normal stops',title:'No safe place chosen',
              message:'Choose where to stop before you pull in: well past Chilham Road, clear of the junction and of the parked cars.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop within 10 metres of a junction: drivers coming out of Chilham Road could not see past you, and those turning in would meet you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place well past Chilham Road; mirrors (the van was behind), then signal left.'
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
              message:'Cancel the signal once you have stopped: left on, the van behind may wait, thinking you are about to turn.'}},
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
      id:'featherby-move-off',
      turn:'right',
      title:'Moving off',
      where:'Featherby Road, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(-91.8,-268.4),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'featherby-van',at:p(-85.5,-319.8),delay:0}],
      endAt:p(-98.2,-220.9),
      quiet:[{x:-92,z:-268,radius:50}],
      place:{
        check:{pause:{kind:'stop',at:p(-91.8,-268.4)},when:{actor:'featherby-van',at:p(-93.1,-279)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(-91.8,-268.4)},when:{actor:'featherby-van',at:p(-79.2,-230.9)},frame:{yaw:-170,pitch:26},
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
            {kind:'unsafe',id:'pulled-into-van',action:'go',fault:{level:'dangerous',heading:'Move off - safety',title:'Moved off in front of the white van',
              message:'The white van was just behind you, coming past. Let it go by before you move off. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are moving off to the right, away from the kerb: a left signal misleads the van behind.'}}
          ],
          accepted:[['mirror-interior','mirror-right','give-way'],['mirror-interior','mirror-right','blind-spot-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirrors, then wait: the white van was coming past.'
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
              message:'The white van had gone by, turning into Elmfield, and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the white van had gone by.'
        }
      ]
    },
    {
      id:'featherby-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Featherby Road, left on to Sovereign Boulevard (A2)',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-103.4,170.6),
      starts:[{actor:'sovereign-car',at:p(-100.3,91),delay:0}],
      // (The Hotel Road pedestrian lights, just to the right, held green: the red car comes through them.)
      lights:p(-138.7,245.8),
      endAt:p(-99.3,259.1),
      // The junction, and Sovereign Boulevard to the right (west), where the red car comes from.
      quiet:[{x:-120,z:248,radius:16},{x:-150,z:240,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:p(-113.3,219.6)},frame:{yaw:0,pitch:22},state:'Approaching the end of Featherby Road at 15 mph.'},
        line:{pause:{kind:'stop',at:p(-119.5,242.8)},when:{actor:'sovereign-car',at:p(-137.9,244.3)},frame:{yaw:-70,pitch:26},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(-119.5,242.8)},when:{actor:'sovereign-car',at:p(-94.4,256.9)},frame:{yaw:-30,pitch:26},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Sovereign Boulevard knows where you are going.'}},
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
              message:'Look right first: that is where the traffic in the lane you join comes from, and it is a 40 mph dual carriageway.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car coming along Sovereign Boulevard from the right, through the pedestrian lights, was close and fast in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the red car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the red car\'s lane.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car coming along Sovereign Boulevard from the right was close, and at 40 mph it closes the gap fast.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the red car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone by and nothing more was coming through the lights: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the red car had gone by and Sovereign Boulevard was clear.'
        }
      ]
    }
  ]
},BEFORE));
