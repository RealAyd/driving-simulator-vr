import type {Vec2} from '../../contracts';
import type {Fault} from '../assess';
import type {DecisionRoute} from '../route';
import {withTurnButtons} from '../turnButtons';
import {withBeforeAfter,type BeforeMerge} from '../beforeAfter';
import {CYCLIST,EMERGE_CAR,LEAVE_CAR,LIGHTS_CAR,ONCOMING_CAR,RING_CAR} from './westWickhamRoute1Paths';

/**
 * West Wickham (London), Glebe Way and Corkscrew Hill: eight challenges from the test centre on Glebe Way: out of Rose
 * Walk, right on to Glebe Way, pulling up and moving off on Glebe Way past Silver Lane, right (the third exit) at the
 * Glebe Way roundabout into Addington Road, over the signal crossing on Addington Road, up Corkscrew Hill and Wood
 * Lodge Lane, right into Stambourne Way, left out of Stambourne Way on to Wickham Court Road, and right at the Glebe Way
 * and High Street lights, back along Glebe Way to the test centre. Chosen from the map and the published evidence
 * (content/packs/west-wickham-london/ROUTES.md).
 * Scene west-wickham-london-route-1 (OpenStreetMap). A practice route, not a confirmed test route.
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
  // (At the line: the island and the trees on the roundabout's west side hide the car coming round until there.)
  'glebe-roundabout':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(450.9,75.4)},when:{actor:'ring-car',at:p(446.7,95.8)},frame:{yaw:60,pitch:40,shift:4},
    state:'At the give way line of the Glebe Way roundabout.'}},
  'addington-crossing':{first:'approach',second:'line',place:{pause:{kind:'moving',at:p(227.9,340.6)},lights:'red',when:{actor:'addington-pedestrian',at:p(200.5,369.4)},panel:'right',frame:{yaw:0,pitch:44,shift:4},
    state:'On Addington Road at 30 mph. The crossing\'s lights are red.'}},
  // (Where the car waits to turn: the oncoming car, not the map, sets when it gets there.)
  'stambourne-right':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(-141,234)},when:{actor:'oncoming-car',at:p(-170.8,241.6)},frame:{yaw:0,pitch:40,shift:-3},
    state:'Waiting on Wood Lodge Lane to turn right into Stambourne Way.'}},
  // (At the line: the houses and hedges on the corner hide Corkscrew Hill until there.)
  'stambourne-emerge':{first:'approach',second:'line',place:{pause:{kind:'stop',at:p(-305.9,-56.4)},when:{actor:'emerge-car',at:p(-287.8,-42.1)},frame:{yaw:60,pitch:40,shift:4},
    state:'At the end of Stambourne Way.'}},
  // (In the junction: the queue at these lights, not the map, sets when the car gets there.)
  'glebe-lights':{first:'approach',second:'centre',place:{pause:{kind:'stop',at:p(-457.6,-413.9)},when:{actor:'lights-car',at:p(-453.8,-441.7)},frame:{yaw:0,pitch:40,shift:-4},
    state:'Waiting in the junction to turn right on to Glebe Way. The lights are green.'}}
};

export const WEST_WICKHAM_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'west-wickham-london-1',
  title:'West Wickham: Glebe Way and Corkscrew Hill',
  scene:'west-wickham-london-route-1',
  briefing:'West Wickham, Glebe Way and Corkscrew Hill: decisions only\n\nThe car drives itself. At each challenge the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:-204.43,z:-267.03,headingDeg:30.56},
  // Rose Walk, Glebe Way east, the Glebe Way roundabout, Addington Road, Corkscrew Hill, Wood Lodge Lane, Stambourne
  // Way, Wickham Court Road, the Glebe Way lights, Glebe Way and the parade's service road to the test centre. (The
  // last two points are just off the service road, on the side away from Glebe Way: every point of it is within 20 m of
  // Glebe Way.)
  through:pts([[100,-162],[280,290],[71,273],[-80,212],[-235,168],[-382,-239],[-300,-393],[-255,-355],[-220,-340]]),
  // Pulled in to the kerb on Glebe Way past Silver Lane (no cars parked along it: room for the cyclist to pass). And
  // clear of the bollards on three splitter islands, each at least 0.6 m from the car's side: leaving the Glebe Way
  // roundabout into Addington Road (wide of the inside kerb first, then left of the bollard), entering the Corkscrew
  // Hill roundabout from Addington Road, and leaving it up Corkscrew Hill (out wide on the ring, then left past the
  // bollard, where the exit's kerb juts out just short of it).
  shifts:[{from:p(103.9,-161.5),to:p(133.1,-142.2),left:.6},
    {from:p(455.7,114.8),to:p(455.7,114.8),left:-1},{from:p(447.9,116.9),to:p(445.1,120.5),left:1.4},
    {from:p(165.8,399),to:p(159.4,405.6),left:1.5},
    {from:p(135.5,407.7),to:p(137,404.5),left:-1.7},{from:p(138.9,396.6),to:p(135.4,391.7),left:1.5}],
  actors:[
    {id:'leave-car',name:'white car',colour:'#e5e7eb',speed:9,path:pts(LEAVE_CAR)},
    // Behind the car along Glebe Way, out round it at the kerb, and on.
    {id:'cyclist',name:'cyclist',colour:'#15803d',speed:6.5,kind:'cyclist',path:pts(CYCLIST)},
    {id:'ring-car',name:'black car',colour:'#1f2328',speed:9,path:pts(RING_CAR)},
    // On the crossing over Addington Road, from the kerb on the car's left, across in front of it.
    {id:'addington-pedestrian',name:'pedestrian',colour:'#1d4ed8',speed:1.3,kind:'pedestrian',waits:true,path:pts([[201.6,370.5],[194.9,363.8]])},
    {id:'oncoming-car',name:'blue car',colour:'#2563eb',speed:9,path:pts(ONCOMING_CAR)},
    {id:'emerge-car',name:'grey car',colour:'#8a9099',speed:9,path:pts(EMERGE_CAR)},
    {id:'lights-car',name:'red car',colour:'#b91c1c',speed:9,path:pts(LIGHTS_CAR)}
  ],
  challenges:[
    {
      id:'leave-test-centre',
      turn:'right',
      title:'Leaving the test centre, emerging right',
      where:'Rose Walk by the test centre, right on to Glebe Way',
      instruction:'When you\'re ready, drive out of the test centre and turn right, please.',
      instructAt:p(-204.4,-267),
      // (Set going as the car nears the end of Rose Walk, so it comes up as the car stops at the line.)
      starts:[{actor:'leave-car',at:p(-184.2,-301.5),delay:0}],
      endAt:p(-140,-327.5),
      // The end of Rose Walk, Glebe Way to the right, where the white car comes from, and to the left.
      quiet:[{x:-162,z:-339,radius:16},{x:-125,z:-315,radius:28},{x:-195,z:-357,radius:22}],
      place:{
        line:{pause:{kind:'stop',at:p(-166.4,-335.4)},when:{actor:'leave-car',at:p(-142.4,-324.8)},frame:{yaw:60,pitch:32},
          state:'At the end of Rose Walk, at the edge of Glebe Way.'},
        clear:{pause:{kind:'stop',at:p(-166.4,-335.4)},when:{actor:'leave-car',at:p(-180.3,-349)},frame:{yaw:20,pitch:32},
          state:'Still at the end of Rose Walk.'}
      },
      stages:[
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-right','signal-left','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: the traffic in the near lane of Glebe Way, which you cross, comes from the right.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right so the drivers on Glebe Way know what you are doing.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the white car',
              message:'The white car coming along Glebe Way from the right was a few seconds away in the lane you were crossing. Wait for it to pass. The examiner had to stop the car.'}}
          ],
          accepted:[['look-right','signal-right','give-way'],['signal-right','look-right','give-way'],['look-right','look-left','signal-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Signal right and wait: the white car coming along Glebe Way from the right was close, in the lane you were crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the white car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: turning right, you join the far lane, and its traffic comes from the left.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:HORN},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The white car had gone by and Glebe Way was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the white car had gone by and Glebe Way was clear both ways.'
        }
      ]
    },
    {
      id:'glebe-pull-up',
      turn:'left',
      title:'Pulling up on the left',
      where:'Glebe Way, past Silver Lane',
      instruction:'Pull up on the left at a convenient place, please.',
      instructAt:p(41.2,-202.7),
      // (Set going as the car comes to its stop, from 50 m behind: started sooner, it would be past before the car stopped
      // whenever traffic held the car up on the way.)
      starts:[{actor:'cyclist',at:p(127.3,-146.1),delay:0}],
      endAt:p(133.1,-142.2),
      selfCancel:false,
      // The pull-up, and Glebe Way behind it, with the mouth of Silver Lane.
      quiet:[{x:133,z:-142,radius:34},{x:100,z:-164,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(103.9,-161.5)},frame:{yaw:-15,pitch:28},state:'On Glebe Way at 30 mph, past Silver Lane.'},
        stopped:{pause:{kind:'stop',at:p(133.1,-142.2)},frame:{yaw:20,pitch:30},state:'Stopped at the kerb.'}
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
              message:'Choose where to stop before you pull in: on the straight past Silver Lane, clear of the junction.'}},
            {kind:'distractor',id:'at-junction',action:'stop-at-junction',fault:{level:'serious',heading:'Normal stops',title:'Stopped at a junction',
              message:'Never stop opposite or within 10 metres of a junction: drivers turning out of Silver Lane could not see past you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are turning right: to pull in on the left, signal left.'}}
          ],
          accepted:[['mirror-interior','mirror-left','stop-past-junction','signal-left'],['stop-past-junction','mirror-interior','mirror-left','signal-left']],
          next:{then:'stopped'},
          explain:'Choose a place on the straight, clear of the junction; mirrors, then signal left.'
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
      id:'glebe-move-off',
      turn:'right',
      title:'Moving off',
      where:'Glebe Way, from the kerb',
      instruction:'Move off when you\'re ready, please.',
      instructAt:p(133.1,-142.2),
      // (Also here, for practising this challenge on its own.)
      starts:[{actor:'cyclist',at:p(127.3,-146.1),delay:0}],
      endAt:p(199.8,-98.1),
      quiet:[{x:133,z:-142,radius:50},{x:180,z:-112,radius:22}],
      place:{
        check:{pause:{kind:'stop',at:p(133.1,-142.2)},when:{actor:'cyclist',at:p(120.1,-149.4)},frame:{yaw:-155,pitch:26},
          state:'Stopped at the kerb, handbrake on.'},
        clear:{pause:{kind:'stop',at:p(133.1,-142.2)},when:{actor:'cyclist',at:p(153.9,-128.5)},frame:{yaw:-170,pitch:26},
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
              message:'The cyclist was just behind you on Glebe Way, coming past. Let them go by before you move off. The examiner had to stop the car.'}},
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
              message:'The cyclist had gone by along Glebe Way and nothing else was coming: this was the time to move off.'}}
          ],
          accepted:[['mirror-right','blind-spot-right','go'],['mirror-interior','mirror-right','blind-spot-right','go'],['mirror-right','blind-spot-right','signal-right','go']],
          next:{go:'done'},
          explain:'Right mirror and blind spot again, then move off: the cyclist had gone by.'
        }
      ]
    },
    {
      id:'glebe-roundabout',
      turn:'right',
      title:'Roundabout, right turn',
      where:'Glebe Way at the Glebe Way roundabout, third exit into Addington Road',
      instruction:'At the roundabout, turn right, the third exit, please.',
      instructAt:p(397.9,37.2),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'ring-car',at:p(423.3,61),delay:0}],
      endAt:p(445.5,120),
      // (And the Addington Road crossing, the short road on its far side and Addington Road on to the Corkscrew Hill
      // roundabout, kept quiet from here until the car is at the crossing: in traffic, cars stopped there for the red, and
      // one waiting to come out of the short road, were still there when the crossing's moment came.)
      quietUntil:p(203.8,364.3),
      // The roundabout's ring, Addington Road south-west, where the black car comes from and where the car leaves, and
      // Addington Road north-east, where the black car goes; then the crossing and beyond it.
      quiet:[{x:463,z:97,radius:24},{x:438,z:126,radius:18},{x:488,z:64,radius:16},{x:432,z:66,radius:14},
        {x:198,z:367,radius:22},{x:182,z:360,radius:14},{x:178,z:390,radius:18},{x:162,z:404,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(423.3,61)},frame:{yaw:0,pitch:22},state:'Approaching the Glebe Way roundabout at 30 mph.'},
        line:{pause:{kind:'stop',at:p(450.9,75.4)},when:{actor:'ring-car',at:p(446.7,95.8)},frame:{yaw:60,pitch:28},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:p(450.9,75.4)},when:{actor:'ring-car',at:p(477.4,76.6)},frame:{yaw:-10,pitch:28},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-right','mirror-left','signal-right','signal-left','speed-up'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Turning right at a roundabout, signal right on the approach, so everyone at it knows you are going round.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:WRONG_RIGHT},
            {kind:'distractor',id:'speed-up',action:'speed-up',fault:{level:'serious',heading:'Junctions - approach speed',title:'Sped up into the roundabout',
              message:'Approach a roundabout at a speed you can stop from at the line: traffic was coming round from the right.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Interior and right mirrors, then signal right: you are taking the third exit.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','creep','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking right',
              message:'Look right first: at a roundabout you give way to traffic coming round from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car coming round the roundabout from Addington Road, on your right, was close, crossing your way in. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the black car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the black car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car coming round from Addington Road, on your right, was close.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          neutral:['look-left'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the black car went by. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The black car had gone off towards Hawes Lane and nothing more was coming round: this was the time to go.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the black car had gone off up Addington Road towards Hawes Lane.'
        }
      ]
    },
    {
      id:'addington-crossing',
      title:'Pedestrian crossing',
      where:'Addington Road, the signal crossing short of the Corkscrew Hill roundabout',
      instruction:'Follow the road ahead, please.',
      instructAt:p(249.2,319.5),
      // (Set going as the car comes up to the crossing, so they step out as it comes, whatever traffic held it up.)
      starts:[{actor:'addington-pedestrian',at:p(249.2,319.5),delay:0}],
      lights:p(201.5,366.5),
      endAt:p(192.3,375.8),
      // The crossing and Addington Road just before it. (Not the service road along Addington Road whose mouth is just
      // past the crossing on the right, nor the road beyond: kept quiet from the roundabout until the car is here, but a
      // car the learner followed through the crossing, turning into the service road, was held out of it in front of
      // the car.)
      quiet:[{x:199,z:367,radius:8},{x:214,z:352,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(227.9,340.6)},lights:'red',frame:{yaw:0,pitch:24},state:'On Addington Road at 30 mph, the signal crossing ahead.'},
        line:{pause:{kind:'stop',at:p(203.8,364.3)},lights:'red',when:{actor:'addington-pedestrian',at:p(200.5,369.4)},panel:'right',frame:{yaw:0,pitch:30},
          state:'Stopped at the crossing.'},
        clear:{pause:{kind:'stop',at:p(203.8,364.3)},when:{actor:'addington-pedestrian',at:p(196.6,365.5)},frame:{yaw:0,pitch:30},
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
      id:'stambourne-right',
      turn:'right',
      title:'Right turn into a side road',
      where:'Wood Lodge Lane, right into Stambourne Way',
      instruction:'Take the next road on the right, please.',
      instructAt:p(-88,215.7),
      // (Set going as the direction is given: paced to come along as the car waits to turn.)
      starts:[{actor:'oncoming-car',at:p(-88,215.7),delay:0}],
      endAt:p(-168.6,229.5),
      // The fork, Wood Lodge Lane ahead, where the oncoming blue car comes from, and the mouth of Stambourne Way.
      quiet:[{x:-147,z:234,radius:16},{x:-185,z:248,radius:28},{x:-168,z:227,radius:12}],
      place:{
        approach:{pause:{kind:'moving',at:p(-116.4,225.5)},frame:{yaw:0,pitch:20},state:'On Wood Lodge Lane at 20 mph, Stambourne Way ahead on the right.'},
        centre:{pause:{kind:'stop',at:p(-141,234)},when:{actor:'oncoming-car',at:p(-170.8,241.6)},frame:{yaw:0,pitch:32},
          state:'Waiting to turn right into Stambourne Way.'},
        clear:{pause:{kind:'stop',at:p(-141,234)},when:{actor:'oncoming-car',at:p(-128.4,226.5)},frame:{yaw:-30,pitch:32},
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
              message:'The blue car coming along Wood Lodge Lane towards you was going ahead, and it has priority over you turning right. It was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait: the blue car coming the other way along Wood Lodge Lane was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Stambourne Way',
              message:'Before you turn, look into Stambourne Way (on your right) for anyone crossing its mouth or a car coming out between the parked cars.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The blue car had gone by and nothing more was coming along Wood Lodge Lane: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Stambourne Way is clear to turn into, then go: the blue car had gone by.'
        }
      ]
    },
    {
      id:'stambourne-emerge',
      turn:'left',
      title:'Emerging, left turn',
      where:'Stambourne Way, left on to Wickham Court Road at the top of Corkscrew Hill',
      instruction:'At the end of the road, turn left, please.',
      instructAt:p(-344.7,-28.9),
      // (Set going as the car comes up to the line, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'emerge-car',at:p(-326.7,-45.5),delay:0}],
      endAt:p(-310.3,-78.7),
      // (And the Wickham Crescent junction on Wickham Court Road, kept quiet from here until the car is at the Glebe Way
      // lights: in traffic, cars queued out of Wickham Crescent and one turning into it knotted there, the car held
      // behind them.)
      quietUntil:p(-452.2,-387.7),
      // The junction, Corkscrew Hill to the right, where the grey car comes from, and Wickham Court Road to the left;
      // then the Wickham Crescent junction.
      quiet:[{x:-301,z:-59,radius:16},{x:-268,z:-33,radius:26},{x:-313,z:-86,radius:18},{x:-392,z:-262,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:p(-326.7,-45.5)},frame:{yaw:0,pitch:22},state:'Approaching the end of Stambourne Way at 20 mph.'},
        line:{pause:{kind:'stop',at:p(-305.9,-56.4)},when:{actor:'emerge-car',at:p(-287.8,-42.1)},frame:{yaw:60,pitch:28},state:'At the end of Stambourne Way.'},
        clear:{pause:{kind:'stop',at:p(-305.9,-56.4)},when:{actor:'emerge-car',at:p(-309.7,-77.5)},frame:{yaw:-20,pitch:28},state:'Still at the end of Stambourne Way.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:MIRRORS_FIRST},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach, so the traffic on Wickham Court Road and Corkscrew Hill knows where you are going.'}},
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
              message:'Look right first: turning left, you join the lane of traffic coming up Corkscrew Hill from the right.'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the grey car',
              message:'The grey car coming up Corkscrew Hill from the right was close, in the lane you were joining. The examiner had to stop the car.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'serious',heading:'Junctions - observation',title:'Crept out into the grey car\'s way',
              message:'The view right was already clear: creeping forward only puts the front of the car into the grey car\'s way.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the grey car coming up Corkscrew Hill from the right was close, in the lane you were joining.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','give-way','go'],
          rules:[
            {kind:'required',id:'fresh-look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look right',
              message:'Your last look right was before the grey car went by. Look right again just before you go.'}},
            {kind:'required',id:'fresh-look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No look left',
              message:'Look left too before you go: something may be overtaking down Wickham Court Road in your way.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The grey car had gone by and the road was clear both ways: this was the time to go.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['look-right','look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right and left again, then go: the grey car had gone by up Wickham Court Road.'
        }
      ]
    },
    {
      id:'glebe-lights',
      turn:'right',
      title:'Traffic lights, right turn',
      where:'Wickham Court Road at the Glebe Way, High Street and Station Road lights, right on to Glebe Way',
      instruction:'At the traffic lights, turn right, please.',
      instructAt:p(-439.8,-360.3),
      // (Set going as the car comes to wait, so it is there whatever traffic held the car up on the way.)
      starts:[{actor:'lights-car',at:p(-452.2,-387.7),delay:0}],
      lights:p(-456.1,-410.6),lightsAll:true,
      endAt:p(-424.4,-416.8),
      // The junction, Station Road ahead, where the oncoming red car comes from, and Glebe Way to the right.
      quiet:[{x:-456,z:-418,radius:22},{x:-453,z:-452,radius:28},{x:-430,z:-417,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:p(-452.2,-387.7)},frame:{yaw:0,pitch:20},state:'Approaching the Glebe Way lights on green.'},
        centre:{pause:{kind:'stop',at:p(-457.6,-413.9)},when:{actor:'lights-car',at:p(-453.8,-441.7)},frame:{yaw:0,pitch:32},
          state:'Waiting in the junction to turn right. The lights are green.'},
        clear:{pause:{kind:'stop',at:p(-457.6,-413.9)},when:{actor:'lights-car',at:p(-451.2,-394.1)},frame:{yaw:40,pitch:32},
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
              message:'Green does not give you priority over oncoming traffic going ahead. The red car coming down Station Road the other way was a few seconds away. The examiner had to stop the car.'}},
            {kind:'distractor',id:'flash',action:'flash-lights',fault:{level:'minor',heading:'Response to signals - other road users',title:'Flashing headlights',
              message:'Flashing your headlights means only "I am here". Others may read it as an invitation, and nobody should act on it.'}}
          ],
          accepted:[['give-way'],['look-right','give-way'],['mirror-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Wait in the junction: the red car coming down Station Road the other way was going ahead, and it has priority over you turning right.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-right','give-way','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'check-turn',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'No check into Glebe Way',
              message:'Before you turn, look into Glebe Way (on your right): someone may be crossing it.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The red car had gone by and nothing more was coming the other way: this was the time to turn.'}}
          ],
          accepted:[['look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Check Glebe Way is clear to turn into, then go: the red car had gone by.'
        }
      ]
    }
  ]
},BEFORE));
