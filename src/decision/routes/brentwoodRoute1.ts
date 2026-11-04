import type {DecisionRoute} from '../route';

/**
 * Brentwood route 1: eight challenges from the test centre round the town centre and back (content/packs/brentwood/
 * ROUTES.md, route 1). Scene brentwood-route-1 (OpenStreetMap, 31 October 2026). A practice route, not a confirmed
 * test route. The road users' paths are scene metres: the blue car's follows sample S2 (content/packs/brentwood); the
 * later ones are lane paths planned on the scene's roads (as the car's own way is), from a start to the points given.
 */
const BLUE_RING=[[131.1,-18.2],[124.9,-10.9],[118.8,-3.6],[112.6,3.7],[107.1,11.3],[101.8,19.3],[96.5,27.2],[91.2,35.2],[85.9,43.1],[80.5,51],
  [78.7,61.4],[78.1,63],[77.4,63.9],[76.3,65.5],[73.6,67.3],[70.3,67.9],[66.8,67.3],[63.8,65.3],[61.7,61.7],[61.5,57.1],[61,49.1],[57.6,29.6]];
// Up Kings Road (its left lane) and right into Primrose Hill (one-way, away from the route).
const UP_KINGS_ROAD=[[53.8,17.9],[52.9,13.4],[51.5,5.7],[47.8,-9],[49.6,-17.6],[52.4,-20.2],[55.9,-22.9],[61.8,-29.4],[67.9,-39],[82,-70],[96.9,-101.9]];
// The learner's lane along Kings Road from behind the start, through the roundabout's first exit.
const BEHIND=[[34.8,262],[36.3,240.5],[37.7,229],[39.3,217.6],[40.8,206.1],[42,198.4],[43.5,188.6],[45.4,176.9],[47.2,165.1],[49,153.3],
  [50.8,141.6],[52.6,129.8],[54.4,118],[56.2,106.3],[59.2,95.6],[60.9,88.2],[61.8,78.2],[63,67.7],[63,60.3],[62.9,54.7],[60,43.3],[58.1,33.3],[55.6,25.9]];
// Challenges 3 to 8: the road users' lanes (planned on the scene's roads: tools in DECISION_MOCK.md).
const RED=[[-43.1,-429.4],[-45,-427.2],[-47,-424.9],[-48.9,-422.7],[-50.8,-420.4],[-52.7,-418.1],[-54.6,-415.9],[-56.5,-413.6],[-58.4,-411.4],[-60.3,-409.1],[-62.2,-406.8],[-64.1,-404.6],[-66,-402.3],[-67.9,-400.1],[-69.8,-397.8],[-71.7,-395.6],[-73.6,-393.3],[-75.5,-391],[-77.4,-388.8],[-79.2,-386.4],[-81,-384.1],[-82.9,-381.8],[-84.7,-379.5],[-86.5,-377.2],[-88.3,-374.8],[-90.1,-372.5],[-91.9,-370.2],[-93.5,-368.7],[-95.2,-367.7],[-96.9,-367.1],[-98.8,-367],[-100.7,-367.2],[-102.8,-367.9],[-105.4,-369.3],[-108,-370.7],[-110.6,-372.2],[-113.2,-373.6],[-115.8,-375],[-118.4,-376.4],[-121,-377.8],[-123.6,-379.3],[-126.2,-380.7],[-128.8,-382.1],[-131.4,-383.5],[-134,-385],[-136.6,-386.4],[-139.1,-387.9],[-141.7,-389.3],[-144.3,-390.8],[-146.9,-392.2],[-149.5,-393.7],[-152.1,-395.2],[-154.6,-396.8],[-157.1,-398.4],[-159.6,-400],[-162.1,-401.6],[-164.6,-403.2],[-167.1,-404.8]];
const GREEN=[[276.3,-515.7],[273.6,-514.5],[270.6,-513.5],[267.8,-512.7],[264.9,-512],[262,-511.2],[259.2,-510.4],[256.3,-509.6],[253.5,-508.9],[250.6,-508.1],[247.8,-507.3],[244.9,-506.6],[242,-505.8],[239.2,-505],[236.3,-504.2],[233.4,-503.5],[230.6,-502.7],[227.7,-502],[224.8,-501.3],[222,-500.6],[219.1,-499.8],[216.2,-499.1],[213.4,-498.3],[210.6,-497.5],[207.8,-496.7],[204.9,-495.8],[202,-495],[199.2,-494.2],[196.3,-493.5],[193.5,-492.7],[191.3,-491.4],[189.7,-490.4],[188.1,-489.4],[186.6,-488.2],[185.2,-487],[183.8,-485.7],[182.5,-484.4],[180.4,-482.2],[178.4,-480],[176.4,-477.9],[174.4,-475.7],[172.5,-473.5],[170,-471.4],[167.7,-469.6],[165.3,-467.8],[163,-465.9],[160.6,-464.1],[157.8,-462.5],[155.2,-461.2],[152.6,-459.8],[149.9,-458.4],[146.9,-457.3],[144.1,-456.4],[141.2,-455.5],[138.4,-454.6],[135.6,-453.8],[132.7,-452.9],[129.9,-452],[127.1,-451.1],[124.2,-450.3],[121.3,-449.5],[118.3,-448.8]];
const BLACK=[[429.1,-515.7],[432.9,-517.3],[436.2,-518.6],[439.1,-519.9],[441.5,-520.9],[443.5,-521.7],[446.2,-522.9],[448.8,-524],[451.5,-525.1],[454.1,-526.2],[456.8,-527.4],[459.4,-528.5],[462.4,-529.2],[465.2,-529.9],[468,-530.5],[469.5,-530.8],[470.6,-531.5],[471.2,-532.3],[471.5,-533.4],[471.3,-534.7],[470.8,-536.3],[470.1,-539.2],[471.9,-542.8],[473.8,-545.2],[477,-546.6],[480.9,-549.4],[484.4,-551.8],[487.5,-554],[490.2,-555.8],[492.4,-557.3],[494.2,-558.5],[496.7,-560],[499.2,-561.5],[501.7,-563],[504.2,-564.5],[506.7,-565.9],[509.2,-567.4],[511.7,-568.9],[514.2,-570.4],[516.9,-571.3],[519.7,-572.3],[521.4,-573],[523.1,-573.9],[524.7,-575],[526.3,-576.1],[527.8,-577.4],[529.2,-578.8],[531.7,-580.4],[534.2,-582],[536.7,-583.6],[539.2,-585.2],[541.7,-586.8],[544.2,-588.4],[546.7,-590],[549.2,-591.6],[551.7,-593.2],[554.1,-594.8],[556.6,-596.4],[559.1,-598],[561.6,-599.6],[564.1,-601.2],[566.6,-602.8],[569.1,-604.4],[571.6,-606],[574.1,-607.6],[576.5,-609.2],[579,-610.9],[581.4,-612.5],[583.9,-614.2],[586.3,-615.9],[588.8,-617.5],[591.2,-619.2]];
const VAN=[[590.5,-325.7],[587.4,-329.2],[586.2,-330.8],[585,-332.5],[584,-334.3],[583,-336],[582,-337.9],[581.2,-339.7],[580.1,-342.5],[578.8,-345],[577.5,-347.6],[576.1,-350.1],[574.5,-352.6],[572.9,-355.1],[571.4,-357.6],[569.8,-360.1],[568.2,-362.6],[566.5,-365.1],[564.9,-367.5],[563.3,-370],[561.7,-372.5],[560.1,-375],[558.5,-377.5],[556.9,-380],[555.2,-382.5],[553.6,-384.9],[552,-387.4],[550.4,-389.9],[548.8,-392.4],[547.3,-395.1],[545.9,-397.7],[544.4,-400.3],[543,-402.9]];
const SILVER=[[-60.9,-413.4],[-58.9,-415.7],[-57.0,-418.0],[-55.0,-420.3],[-53.1,-422.6],[-51.2,-424.9],[-49.2,-427.2],[-47.3,-429.5],[-45.4,-431.7],[-43.4,-434.0],[-41.5,-436.3],[-39.6,-438.6],[-37.6,-440.9],[-35.8,-443.3],[-34.2,-445.8],[-32.6,-448.4],[-31.0,-450.9],[-29.2,-453.3],[-27.4,-455.7],[-25.6,-458.1],[-23.6,-460.3],[-21.3,-462.2],[-18.6,-463.5],[-15.6,-463.8],[-11.8,-463],[-9.1,-461.7],[-6.5,-460.4],[-3.8,-459.1],[-1.2,-457.9],[1.5,-456.7],[4.2,-455.5],[6.9,-454.2],[9.6,-453],[12.3,-451.8],[15,-450.6],[17.7,-449.2],[20.4,-447.9],[22.9,-446.6],[25.6,-445.6],[28.4,-444.5],[31.2,-443.5],[33.7,-442.9],[36.6,-442.5],[39.6,-442],[42.5,-441.6],[45.3,-441.4],[48.3,-441.1],[51.2,-440.8],[54.1,-440.8],[57,-440.7],[60,-440.7],[62.8,-441],[65.7,-441.3],[68.5,-441.6],[71.4,-442.3],[74.3,-442.9],[77.2,-443.5],[80.1,-444.1],[82.9,-444.8],[85.8,-445.4],[88.7,-446],[91.6,-446.6],[94.5,-447.3],[97.4,-447.9],[100.3,-448.6],[103.2,-449.2],[106.2,-449.8],[109.1,-450.3],[112,-450.8],[114.9,-451.3],[117.8,-451.9],[120.5,-452.6],[123.4,-453.4],[126.2,-454.2],[129,-455.1],[131.8,-456],[134.7,-456.8],[137.5,-457.7],[140.3,-458.6],[143.1,-459.5],[146,-460.4],[148.5,-461.3],[151.1,-462.6],[153.7,-464],[156.3,-465.4],[158.7,-466.7],[161,-468.5],[163.4,-470.3],[165.7,-472.1],[168,-473.9],[170.1,-475.6],[172.1,-477.8],[174.1,-480],[176.1,-482.2],[178.1,-484.4],[180.1,-486.5],[181.3,-487.6],[182,-488.7],[182.3,-489.8],[182.1,-490.9],[181.6,-492],[180.5,-493.1],[178.6,-495.2],[176.5,-498.1],[175.9,-500.8],[175.3,-503.6],[174.7,-506.4],[174.1,-509.1],[173.2,-511.8],[172.3,-514.5],[171.4,-517.2],[170.6,-519.9]];
const pts=(a:number[][])=>a.map(([x,z])=>({x:x!,z:z!}));

export const BRENTWOOD_ROUTE_1:DecisionRoute={
  id:'brentwood-1',
  title:'Brentwood route 1',
  scene:'brentwood-route-1',
  briefing:'Brentwood route 1: decisions only\n\nThe car drives itself. At each junction the scene stops: choose your observations and actions, in order, then confirm. Faults are marked as you go; the result and coaching come at the end.\n\nPractice route built from OpenStreetMap data; not a confirmed test route. The app\'s assessment, not a DVSA result.',
  start:{x:36.3,z:240.5,headingDeg:7.5},
  // Kings Road, the High Street lights, Weald Road, Western Road, William Hunter Way, Wilson's Corner, Ingrave Road,
  // Queen's Road, the roundabout and back down Kings Road.
  through:pts([[54.9,20.1],[-38.1,-243.9],[-73.1,-329.9],[-97.1,-366.9],[-18.1,-463.9],[147.9,-459.9],[184.9,-489.9],[434.9,-608.9],
    [482.9,-547.9],[473.9,-530.9],[584.9,-334.9],[227.9,-123.9],[69.9,100.1],[27.9,235.1]]),
  actors:[
    // Signals left for the first exit, as the car does; the blue car (from Queen's Road, past twelve o'clock) right
    // on the way to the ring and round it, then left from passing Kings Road south to its exit.
    {id:'grey-car',name:'grey car',colour:'#8a9099',speed:12,yields:true,path:pts([...BEHIND,...UP_KINGS_ROAD.slice(3)]),
      signals:[{from:{x:54.4,z:118},to:{x:58.1,z:33.3},side:'left'}]},
    {id:'blue-car',name:'blue car',colour:'#2563eb',speed:7,path:pts([...BLUE_RING,...UP_KINGS_ROAD]),
      signals:[{from:{x:131.1,z:-18.2},to:{x:63.8,z:65.3},side:'right'},{from:{x:63.8,z:65.3},to:{x:57.6,z:29.6},side:'left'}]},
    {id:'carpark-car',name:'white car',colour:'#e8e8e4',speed:6,yields:true,waits:true,path:pts([[-49.1,-243.9],[-44.5,-244.5],[-41.8,-243.3],[-39.6,-241.4],[-37.2,-239.3],
      [-35.7,-237.4],[-35,-232.3],[-30.8,-217.8],[-27.8,-209.4],[-24.1,-200],[-2,-143.1],[12.2,-109.2],[16.7,-98.1]])},
    // Finishing crossing Weald Road (the signal crossing just past the High Street lights), from the east kerb.
    {id:'weald-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-67.5,-323.8],[-75.1,-320.2],[-77.3,-324.7]])},
    {id:'red-car',name:'red car',colour:'#b91c1c',speed:8,path:pts(RED)},
    // Close behind the car from Western Road along William Hunter Way, then into the car park road at the
    // mini-roundabout (parked there).
    {id:'silver-car',name:'silver car',colour:'#b8bcc2',speed:14,yields:true,parks:true,path:pts(SILVER)},
    // At the zebra crossing on William Hunter Way, on the car's left, about to step out.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.4,kind:'pedestrian',waits:true,path:pts([[146.6,-462.9],[150.2,-455.9],[154.7,-458.2]])},
    {id:'green-car',name:'green car',colour:'#166534',speed:7,yields:true,path:pts(GREEN)},
    {id:'black-car',name:'black car',colour:'#1f2328',speed:7,path:pts(BLACK)},
    // Waiting opposite at the Ingrave Road and Queen's Road mini-roundabout; it gives way to the car.
    {id:'white-van',name:'white van',colour:'#f1f1ee',speed:5,yields:true,waits:true,path:pts(VAN)}
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
      // The roundabout and the ring to its right, where the blue car comes from.
      quiet:[{x:70,z:59,radius:34},{x:110,z:0,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:{x:56.3,z:105.4}},frame:{yaw:0,pitch:18},state:'Approaching the roundabout at about 20 mph. The app slows the car for you.'},
        line:{pause:{kind:'stop',at:{x:62.4,z:72.4}},when:{actor:'blue-car',at:{x:78.1,z:63}},frame:{yaw:-30,pitch:34},state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:{x:62.4,z:72.4}},when:{actor:'blue-car',at:{x:53.8,z:17.9}},frame:{yaw:-30,pitch:34},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right','lane-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:{level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
              message:'Mirrors first, then signal: you need to know who your signal is for.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the first exit',
              message:'Signal left on the approach for the first exit and keep it on as you leave.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going past twelve o\'clock. The grey car behind could come up on your left, expecting you to go right, as you turn off at the first exit.'}},
            {kind:'distractor',id:'lane-right',action:'lane-right',fault:{level:'serious',heading:'Positioning - lane discipline',title:'Wrong lane for the first exit',
              message:'For the first exit keep to the left lane. Moving right, then cutting back across to the first exit, puts the grey car behind at risk.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Mirrors first (the grey car was close behind), then signal left for the first exit.'
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
      starts:[{actor:'carpark-car',at:{x:-43.2,z:-250.1},delay:.8}],
      // (Just past it: the High Street lights are 60 m on.)
      endAt:{x:-43.2,z:-250.1},
      // The mini-roundabout and the car park exit, and the road ahead beyond it (shown clear); and the corner where
      // the grey and blue cars turn off into Primrose Hill, behind (they turn across the oncoming lane).
      quiet:[{x:-38,z:-244,radius:30},{x:-58,z:-290,radius:28},{x:51,z:-17,radius:16}],
      place:{
        approach:{pause:{kind:'moving',at:{x:-24.6,z:-192.2}},frame:{yaw:0,pitch:18},state:'Approaching the mini-roundabout.'},
        line:{pause:{kind:'stop',at:{x:-38.4,z:-234.6}},frame:{yaw:-8,pitch:38,shift:-7},state:'At the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'no-mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed without checking behind',
              message:'Check the interior mirror before you slow down for the mini-roundabout: you need to know what is behind you.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'Going ahead, no signal is needed. A left signal suggests you are turning into the car park.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Misleading signal',
              message:'Going ahead, you need no signal. A right signal tells the driver waiting at the car park exit that you are going round past it, so they may pull out into your path.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left'],['mirror-interior','mirror-right']],
          next:{then:'line'},
          explain:'Interior mirror before slowing down. Going ahead, no signal.'
        },
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
    },
    {
      id:'high-street-lights',
      title:'Traffic lights, ahead',
      where:'Kings Road at the High Street lights, ahead into Weald Road',
      instruction:'At the traffic lights, follow the road ahead.',
      instructAt:{x:-44.2,z:-251.8},
      starts:[{actor:'weald-pedestrian',at:{x:-38.4,z:-232.9},delay:0}],
      lights:{x:-61.5,z:-300.5},
      endAt:{x:-74.6,z:-325.6},
      quiet:[{x:-68,z:-312,radius:30}],
      place:{
        approach:{pause:{kind:'moving',at:{x:-56.2,z:-280.3}},when:{actor:'weald-pedestrian',at:{x:-72.6,z:-321.4}},frame:{yaw:0,pitch:0,view:'driver',zoom:1.25},
          state:'Approaching the lights on green.'},
        clear:{pause:{kind:'stop',at:{x:-61.6,z:-297.5}},when:{actor:'weald-pedestrian',at:{x:-76.2,z:-322.5}},frame:{yaw:25,pitch:24,shift:-6},
          state:'Stopped at the line for the pedestrian crossing Weald Road.'}
      },
      stages:[
        {
          id:'approach',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','signal-left','go','give-way','horn'],
          neutral:['look-left','look-right','mirror-interior'],
          rules:[
            {kind:'unsafe',id:'drove-at-pedestrian',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Drove on with a pedestrian crossing',
              message:'A pedestrian was still crossing Weald Road, in your path. A green light means go only if the way is clear: give way to people still crossing (Highway Code rule 176). The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'Going ahead, no signal is needed. A left signal says you are turning into the High Street.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Never use the horn to hurry a pedestrian who is crossing.'}}
          ],
          accepted:[['give-way'],['look-left','give-way'],['mirror-interior','give-way'],['look-right','look-left','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the light was green, but a pedestrian was still crossing Weald Road ahead of you. Wait at the line until they are clear.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['look-right','mirror-interior'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Moved off without checking the crossing',
              message:'The pedestrian was walking off to your left. Look left to check the crossing is clear before you move off.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The pedestrian had reached the pavement and the light was still green: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-left','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Go: the pedestrian had reached the pavement, the crossing was clear and the light was still green.'
        }
      ]
    },
    {
      id:'western-road-mini',
      title:'Mini-roundabout, right turn',
      where:'Weald Road and Western Road mini-roundabout',
      instruction:'At the mini-roundabout, turn right.',
      instructAt:{x:-75.6,z:-327.4},
      starts:[{actor:'red-car',at:{x:-66,z:-308.6},delay:0}],
      endAt:{x:-86.3,z:-382.6},
      // The mini-roundabout and Western Road, where the red car comes from.
      quiet:[{x:-97,z:-366,radius:30},{x:-60,z:-415,radius:25}],
      place:{
        approach:{pause:{kind:'moving',at:{x:-81.4,z:-339}},frame:{yaw:0,pitch:18},state:'Approaching the mini-roundabout.'},
        line:{pause:{kind:'stop',at:{x:-93,z:-357.8}},when:{actor:'red-car',at:{x:-86.5,z:-377.2}},frame:{yaw:-40,pitch:34},
          state:'At the give way line.'},
        clear:{pause:{kind:'stop',at:{x:-93,z:-357.8}},when:{actor:'red-car',at:{x:-121,z:-377.8}},frame:{yaw:-40,pitch:34},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:{level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
              message:'Mirrors first, then signal: you need to know who your signal is for.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach so others know where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A left signal says you are turning left, the opposite of where you are going: the red car and anyone waiting would be misled.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Mirrors (interior, then right), then signal right for the right turn.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-left','give-way','go','horn'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Waiting was right, but look right first so you know what you are waiting for. (A look afterwards does not undo it.)'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the red car',
              message:'The red car was coming from Western Road, on your right, a second from the mini-roundabout. Give way to traffic from your right. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A left signal tells the red car\'s driver you are turning left, away from Western Road, when you are turning right into it.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the red car was coming from Western Road, on your right, and would have reached the mini-roundabout as you pulled out.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','give-way','go','horn'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look',
              message:'Your last look right was before the red car passed. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Western Road was clear once the red car had gone by: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go'],['look-right','mirror-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go: Western Road was clear.'
        }
      ]
    },
    {
      id:'william-hunter-way-zebra',
      title:'Zebra crossing',
      where:'William Hunter Way zebra crossing',
      instruction:'Follow the road ahead.',
      instructAt:{x:12.8,z:-451.6},
      starts:[{actor:'silver-car',at:{x:-41.5,z:-436.3},delay:0},{actor:'zebra-pedestrian',at:{x:117.7,z:-451.9},delay:.4}],
      endAt:{x:150.8,z:-463.2},
      quiet:[{x:148,z:-460,radius:28}],
      place:{
        approach:{pause:{kind:'moving',at:{x:114.8,z:-451.3}},frame:{yaw:0,pitch:0,view:'driver',zoom:1.6},state:'Approaching the zebra crossing at about 20 mph.'},
        clear:{pause:{kind:'stop',at:{x:141.7,z:-459}},when:{actor:'zebra-pedestrian',at:{x:150,z:-456.4}},frame:{yaw:0,pitch:30},state:'Stopped at the zebra crossing.'}
      },
      stages:[
        {
          id:'approach',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','look-left','look-right','signal-left','go','give-way','horn'],
          neutral:['look-left','look-right'],
          rules:[
            {kind:'before',id:'mirror-before-stopping',action:'give-way',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Stopped without checking behind',
              message:'The silver car was close behind. Check the interior mirror before you decide to stop, so you know who is behind you. (A check afterwards does not undo it.)'}},
            {kind:'unsafe',id:'zebra-go',action:'go',fault:{level:'dangerous',heading:'Pedestrian crossings',title:'Did not stop for the pedestrian',
              message:'The pedestrian at the kerb was about to step on to the crossing, and did. Be ready to stop for people waiting at a zebra, and you must give way once they step on (Highway Code rule 195). The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'No signal is needed to stop at a crossing. A left signal says you are pulling in or turning, and could mislead the pedestrian.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Never use the horn to hurry a pedestrian at a crossing.'}}
          ],
          accepted:[['mirror-interior','give-way'],['mirror-interior','look-left','give-way'],['look-left','mirror-interior','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Check the mirror (the silver car was close behind), then stop: the pedestrian at the kerb was about to step on to the crossing.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-left','look-right','mirror-interior','give-way','go','horn'],
          neutral:['look-right','mirror-interior'],
          rules:[
            {kind:'required',id:'check-crossing',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Pedestrian crossings',title:'Moved off without checking the crossing',
              message:'Check the crossing is clear both ways before you move off: someone else may be about to step out from the left, where the pedestrian came from.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Waited too long',
              message:'The pedestrian had reached the far pavement and nobody else was waiting: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-left','look-right','go'],['look-right','look-left','go'],['look-left','go']],
          next:{go:'done'},
          explain:'Go once the pedestrian has reached the far pavement and nobody else is about to step out.'
        }
      ]
    },
    {
      id:'william-hunter-way-mini',
      title:'Mini-roundabout, ahead (judging a gap)',
      where:'William Hunter Way mini-roundabout',
      instruction:'At the mini-roundabout, follow the road ahead.',
      instructAt:{x:152.2,z:-463.9},
      starts:[{actor:'green-car',at:{x:148.3,z:-461.2},delay:0}],
      endAt:{x:195.9,z:-496.6},
      // The mini-roundabout and the stretch of William Hunter Way the green car comes along.
      quiet:[{x:185,z:-490,radius:30},{x:240,z:-505,radius:30},{x:275,z:-516,radius:18}],
      place:{
        approach:{pause:{kind:'moving',at:{x:164,z:-470.1}},frame:{yaw:0,pitch:18},state:'Approaching the mini-roundabout.'},
        line:{pause:{kind:'stop',at:{x:177.8,z:-484}},when:{actor:'green-car',at:{x:233.4,z:-503.5}},frame:{yaw:-30,pitch:20},
          state:'At the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left','mirror-right'],
          rules:[
            {kind:'required',id:'no-mirror',anyOf:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed without checking behind',
              message:'Check the interior mirror before you slow down for the mini-roundabout: you need to know what is behind you.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'Going ahead, no signal is needed. A left signal suggests you are turning off.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Misleading signal',
              message:'Going ahead, you need no signal. A right signal tells the green car coming from the right that you are going round past it.'}}
          ],
          accepted:[['mirror-interior'],['mirror-interior','mirror-left'],['mirror-interior','mirror-right']],
          next:{then:'line'},
          explain:'Interior mirror before slowing down. Going ahead, no signal.'
        },
        {
          id:'line',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-interior','signal-right','give-way','creep','go'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'before',id:'look-right-first',action:'go',needs:['look-right'],fault:{level:'serious',heading:'Junctions - observation',title:'Went without looking right',
              message:'The green car was coming along William Hunter Way on your right, and traffic from the right has priority. Look right before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The green car was about 50 m away at under 20 mph: you had time to go ahead well before it reached the mini-roundabout. Waiting held it up.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Misleading signal',
              message:'Going ahead, you need no signal. A right signal says you are going round past the green car\'s road, so its driver cannot tell when you will cross its path and may come on to the mini-roundabout as you go.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'feedback',heading:'Junctions - approach',title:'No need to creep',
              message:'Your view to the right is clear. Edging on to a mini-roundabout can confuse the driver coming.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Go: the green car on your right was far enough away. You could go ahead well before it reached the mini-roundabout.'
        }
      ]
    },
    {
      id:'wilsons-corner',
      title:'Double mini-roundabout',
      where:'Wilson\'s Corner, on to Ingrave Road',
      instruction:'At the mini-roundabouts, go ahead, then turn left on to Ingrave Road.',
      instructAt:{x:454.9,z:-591.4},
      // (Set off once the car is nearly at the second mini-roundabout: held up on the way by traffic through the first,
      // the car would otherwise find it gone by.)
      starts:[{actor:'black-car',at:{x:479.9,z:-549.6},delay:0}],
      // (The High Street lights the black car comes through are held green for it.)
      lights:{x:444,z:-521.2},
      endAt:{x:482.2,z:-522.9},
      // Both mini-roundabouts, and the High Street, where the black car comes from.
      quiet:[{x:478,z:-540,radius:32},{x:440,z:-519,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:{x:469.7,z:-569.1}},frame:{yaw:0,pitch:18},state:'Past the first mini-roundabout, approaching the second.'},
        line:{pause:{kind:'stop',at:{x:479.6,z:-538.6}},when:{actor:'black-car',at:{x:462.4,z:-529.2}},frame:{yaw:-35,pitch:34},
          state:'At the second mini-roundabout.'},
        clear:{pause:{kind:'stop',at:{x:479.6,z:-538.6}},when:{actor:'black-car',at:{x:492.4,z:-557.3}},frame:{yaw:-35,pitch:34},state:'Still at the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-right'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-left',needs:['mirror-interior','mirror-left'],fault:{level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
              message:'Mirrors first, then signal: you need to know who your signal is for.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-left'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the left turn',
              message:'Signal left on the approach so others know where you are going.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A right signal says you are going round past Ingrave Road: the black car would expect you to carry on round.'}}
          ],
          accepted:[['mirror-interior','mirror-left','signal-left'],['mirror-left','mirror-interior','signal-left']],
          next:{then:'line'},
          explain:'Mirrors (interior, then left), then signal left for Ingrave Road.'
        },
        {
          id:'line',safe:'wait',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','signal-right','give-way','go','horn'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'before',id:'look-before-waiting',action:'give-way',needs:['look-right'],fault:{level:'minor',heading:'Junctions - observation',title:'Waited without looking',
              message:'Waiting was right, but look right first so you know what you are waiting for. (A look afterwards does not undo it.)'}},
            {kind:'unsafe',id:'pulled-out',action:'go',fault:{level:'dangerous',heading:'Junctions - observation',title:'Pulled out in front of the black car',
              message:'The black car was coming out of the High Street, on your right, on to the second mini-roundabout. Give way to traffic from your right at each mini-roundabout. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'You are turning left on to Ingrave Road. A right signal says you are going round, past the High Street.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-right','give-way'],['look-right','look-left','give-way'],['look-left','look-right','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Give way: the black car was coming out of the High Street, on your right. At two mini-roundabouts together, treat each one separately and give way to the right at each.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-left','give-way','go','horn'],
          neutral:['look-left','mirror-left'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look',
              message:'Your last look right was before the black car went. Look right again just before you go.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The High Street was clear once the black car had gone: this was the time to go.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-right','go'],['look-right','mirror-left','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Look right again, then go left on to Ingrave Road: the High Street was clear.'
        }
      ]
    },
    {
      id:'queens-road-mini',
      title:'Mini-roundabout, right turn (vehicle opposite)',
      where:'Ingrave Road and Queen\'s Road mini-roundabout',
      instruction:'At the mini-roundabout, turn right.',
      instructAt:{x:539,z:-417.3},
      starts:[{actor:'white-van',at:{x:582.1,z:-330.8},delay:1.2}],
      endAt:{x:572.6,z:-323.5},
      // The mini-roundabout and Queen's Road, on the right.
      quiet:[{x:585,z:-335,radius:30},{x:555,z:-310,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:{x:559.3,z:-382.7}},frame:{yaw:0,pitch:18},state:'Approaching the mini-roundabout.'},
        line:{pause:{kind:'stop',at:{x:583.1,z:-344.2}},frame:{yaw:-25,pitch:34},state:'At the give way line.'}
      },
      stages:[
        {
          id:'approach',safe:'approach',
          buttons:['mirror-interior','mirror-left','mirror-right','signal-left','signal-right'],
          neutral:['mirror-left'],
          rules:[
            {kind:'before',id:'mirrors-before-signal',action:'signal-right',needs:['mirror-interior','mirror-right'],fault:{level:'minor',heading:'Use of mirrors - signalling',title:'Signalled before the mirrors',
              message:'Mirrors first, then signal: you need to know who your signal is for.'}},
            {kind:'required',id:'no-signal',anyOf:['signal-right'],fault:{level:'minor',heading:'Signals - necessary',title:'No signal for the right turn',
              message:'Signal right on the approach so others know where you are going.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A left signal says you are turning left: the white van waiting opposite could pull out across your path.'}}
          ],
          accepted:[['mirror-interior','mirror-right','signal-right'],['mirror-right','mirror-interior','signal-right']],
          next:{then:'line'},
          explain:'Mirrors (interior, then right), then signal right for the right turn.'
        },
        {
          id:'line',safe:'go',go:'go',wait:'give-way',
          buttons:['look-right','look-left','mirror-right','signal-left','give-way','creep','go'],
          neutral:['look-left','mirror-right'],
          rules:[
            {kind:'before',id:'look-right-first',action:'go',needs:['look-right'],fault:{level:'serious',heading:'Junctions - observation',title:'Went without looking right',
              message:'Traffic from Queen\'s Road, on your right, has priority. Look right before you go.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'serious',heading:'Signals - correctly',title:'Signal for the wrong way',
              message:'A left signal tells the van\'s driver you are turning away from it, so it may pull out across your path as you turn right.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'Queen\'s Road was clear, and the van opposite was waiting for you: it gives way to traffic from its right, which is you.'}},
            {kind:'distractor',id:'creep',action:'creep',fault:{level:'feedback',heading:'Junctions - approach',title:'No need to creep',
              message:'Your view of Queen\'s Road is clear. Edging out can confuse the van\'s driver.'}}
          ],
          accepted:[['look-right','go'],['look-right','look-left','go'],['mirror-right','look-right','go'],['look-left','look-right','go']],
          next:{go:'done'},
          explain:'Signal right and go: Queen\'s Road on your right was clear, and the van opposite gives way to traffic from its right, which is you.'
        }
      ]
    }
  ]
};
