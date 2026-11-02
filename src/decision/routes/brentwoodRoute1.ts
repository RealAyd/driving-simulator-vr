import type {DecisionRoute} from '../route';

/**
 * Brentwood route 1, the pilot: two linked challenges on Kings Road (content/packs/brentwood/ROUTES.md, route 1,
 * challenges 1 and 2). Scene brentwood-route-1 (OpenStreetMap, 31 October 2026). A practice route, not a confirmed
 * test route. The road users' paths are scene metres; the blue car's follows sample S2 (content/packs/brentwood).
 */
const BLUE_RING=[[131.1,-18.2],[124.9,-10.9],[118.8,-3.6],[112.6,3.7],[107.1,11.3],[101.8,19.3],[96.5,27.2],[91.2,35.2],[85.9,43.1],[80.5,51],
  [78.7,61.4],[78.1,63],[77.4,63.9],[76.3,65.5],[73.6,67.3],[70.3,67.9],[66.8,67.3],[63.8,65.3],[61.7,61.7],[61.5,57.1],[61,49.1],[57.6,29.6]];
// Up Kings Road (its left lane) and right into Primrose Hill (one-way, away from the route).
const UP_KINGS_ROAD=[[53.8,17.9],[52.9,13.4],[51.5,5.7],[47.8,-9],[49.6,-17.6],[52.4,-20.2],[55.9,-22.9],[61.8,-29.4],[67.9,-39],[82,-70],[96.9,-101.9]];
// The learner's lane along Kings Road from behind the start, through the roundabout's first exit.
const BEHIND=[[34.8,262],[36.3,240.5],[37.7,229],[39.3,217.6],[40.8,206.1],[42,198.4],[43.5,188.6],[45.4,176.9],[47.2,165.1],[49,153.3],
  [50.8,141.6],[52.6,129.8],[54.4,118],[56.2,106.3],[59.2,95.6],[60.9,88.2],[61.8,78.2],[63,67.7],[63,60.3],[62.9,54.7],[60,43.3],[58.1,33.3],[55.6,25.9]];
const pts=(a:number[][])=>a.map(([x,z])=>({x:x!,z:z!}));

export const BRENTWOOD_ROUTE_1:DecisionRoute={
  id:'brentwood-1',
  title:'Brentwood route 1 (pilot)',
  scene:'brentwood-route-1',
  briefing:'Brentwood route 1: decisions only\n\nThe car drives itself. At each junction the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:36.3,z:240.5,headingDeg:7.5},
  through:pts([[55,20],[-38,-244],[-50,-275]]),
  actors:[
    {id:'grey-car',name:'grey car',colour:'#8a9099',speed:12,yields:true,path:pts([...BEHIND,...UP_KINGS_ROAD.slice(3)])},
    {id:'blue-car',name:'blue car',colour:'#2563eb',speed:7,path:pts([...BLUE_RING,...UP_KINGS_ROAD])},
    {id:'carpark-car',name:'white car',colour:'#e8e8e4',speed:6,yields:true,path:pts([[-47.6,-244.1],[-44.5,-244.5],[-41.8,-243.3],[-39.6,-241.4],[-37.2,-239.3],
      [-35.7,-237.4],[-35,-232.3],[-30.8,-217.8],[-27.8,-209.4],[-24.1,-200],[-2,-143.1],[12.2,-109.2],[16.7,-98.1]])}
  ],
  challenges:[
    {
      id:'queens-road-roundabout',
      title:'Roundabout, first exit',
      where:'Queen\'s Road roundabout, from Kings Road',
      instruction:'At the roundabout, take the first exit.',
      instructAt:{x:45.4,z:176.9},
      starts:[{actor:'grey-car',at:{x:36.3,z:240.5},delay:0},{actor:'blue-car',at:{x:47.2,z:165.1},delay:0}],
      endAt:{x:55.6,z:25.9},
      place:{
        approach:{pause:{kind:'moving',at:{x:56.3,z:105.4}},frame:{yaw:0,pitch:18},state:'Approaching the roundabout at about 20 mph.'},
        line:{pause:{kind:'stop',at:{x:62.4,z:72.4}},when:{actor:'blue-car',at:{x:78.1,z:63}},frame:{yaw:-38,pitch:30},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:{x:62.4,z:72.4}},when:{actor:'blue-car',at:{x:53.8,z:17.9}},frame:{yaw:-38,pitch:30},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','slow-down','lane-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'slow-down',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed without checking behind',
              message:'The grey car was close behind. Check the interior mirror before you slow down. (Recorded when you slowed: a mirror check afterwards does not undo it.)'}},
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:{level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
              message:'Mirrors first, then signal: you need to know who your signal is for.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'Signal left on the approach for the first exit and keep it on as you leave.'}},
            {kind:'required',id:'no-slowing',anyOf:['slow-down'],fault:{level:'minor',heading:'Junctions - approach speed',title:'No plan to slow down',
              message:'Slow down in good time for the roundabout. (The app slowed the car to the line for you.)'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going past twelve o\'clock. The grey car behind could come up on your left, expecting you to go right, as you turn off at the first exit.'}},
            {kind:'distractor',id:'lane-right',action:'lane-right',fault:{level:'serious',heading:'Positioning - lane discipline',title:'Wrong lane for the first exit',
              message:'For the first exit keep to the left lane. Moving right, then cutting back across to the first exit, puts the grey car behind at risk.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left','slow-down'],['mirror-left','mirror-interior','signal-left','slow-down'],['mirror-interior','mirror-left','slow-down','signal-left']],
          next:{then:'line'},
          explain:'Mirrors first (the grey car was close behind), then signal left for the first exit, and slow down in good time.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','give-way','go','horn'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Waiting was right, but look right first so you know what you are waiting for. (A look afterwards does not undo it.)'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the blue car',
              message:'The blue car was already on the roundabout, a second or two from your path. Give way to traffic coming from your right. The examiner had to stop the car.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the blue car was already on the roundabout, coming round from your right, and would have reached your path as you came out.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go','horn'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look',
              message:'Your last look right was before the blue car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Nothing was coming round from the right: this was the time to go. (Waiting for the blue car was right; this was the moment after it.)'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: the roundabout was clear. Keep the left signal on as you leave.'
        }
      ]
    },
    {
      id:'chatham-way-mini',
      title:'Mini-roundabout, ahead',
      where:'Kings Road and Chatham Way mini-roundabout',
      instruction:'At the mini-roundabout, follow the road ahead.',
      instructAt:{x:0.2,z:-128.9},
      starts:[{actor:'carpark-car',at:{x:-46.7,z:-256.2},delay:.8}],
      endAt:{x:-51.5,z:-267},
      place:{
        line:{pause:{kind:'stop',at:{x:-38.4,z:-234.6}},frame:{yaw:-12,pitch:34},state:'At the give way line. The app has checked the mirrors and slowed down.'}
      },
      stages:[
        {
          id:'line',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','signal-left','signal-right','give-way','creep','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-right-first',action:'go',needs:['look-right'],fault:{level:'serious',heading:'Junctions - observation',title:'Went without looking right',
              message:'Traffic from Chatham Way, on your right, has priority. Look right before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Chatham Way was clear, the road ahead was clear and the white car at the car park exit was waiting for you: it gives way to traffic from its right, which is you.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Misleading signal',
              message:'Going ahead, you need no signal. A right signal tells the driver waiting at the car park exit that you are going round past it, so they may pull out into your path.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'Going ahead, no signal is needed. A left signal suggests you are turning into the car park.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'feedback',heading:'Junctions - approach',title:'No need to creep',
              message:'Your view of Chatham Way is clear. Edging on to a mini-roundabout can confuse the driver waiting.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go'],['mirror-interior','look-right','look-left','go']],
          next:{go:'done'},
          explain:'Go: Chatham Way, on your right, was clear and so was the road ahead. The white car at the car park exit, on your left, has to give way to you.'
        }
      ]
    }
  ]
};
