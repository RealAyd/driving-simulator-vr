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
const BLACK=[[429.1,-515.7],[432.9,-517.3],[436.2,-518.6],[439.1,-519.9],[441.5,-520.9],[443.5,-521.7],[446.2,-522.9],[448.8,-524],[451.5,-525.1],[454.1,-526.2],[456.8,-527.4],[459.4,-528.5],[462.4,-529.2],[465.2,-529.9],[468,-530.5],[469.5,-530.8],[470.6,-531.5],[471.2,-532.3],[471.5,-533.4],[471.3,-534.7],[470.8,-536.3],[470.1,-539.2],[471.9,-542.8],[473.8,-545.2],[477,-546.6],[480.9,-549.4],[484.4,-551.8],[487.5,-554],[490.2,-555.8],[492.4,-557.3],[494.2,-558.5],[496.7,-560],[499.2,-561.5],[501.7,-563],[504.2,-564.5],[506.7,-565.9],[509.2,-567.4],[511.7,-568.9],[514.2,-570.4],[516.9,-571.3],[519.7,-572.3],[521.4,-573],[523.1,-573.9],[524.7,-575],[526.3,-576.1],[527.8,-577.4],[529.2,-578.8],[531.7,-580.4],[534.2,-582],[536.7,-583.6],[539.2,-585.2],[541.7,-586.8],[544.2,-588.4],[546.7,-590],[549.2,-591.6],[551.7,-593.2],[554.1,-594.8],[556.6,-596.4],[559.1,-598],[561.6,-599.6],[564.1,-601.2],[566.6,-602.8],[569.1,-604.4],[571.6,-606],[574.1,-607.6],[576.5,-609.2],[579,-610.9],[581.4,-612.5],[583.9,-614.2],[586.3,-615.9],[588.8,-617.5],[591.2,-619.2]];
const VAN=[[590.5,-325.7],[587.4,-329.2],[586.2,-330.8],[585,-332.5],[584,-334.3],[583,-336],[582,-337.9],[581.2,-339.7],[580.1,-342.5],[578.8,-345],[577.5,-347.6],[576.1,-350.1],[574.5,-352.6],[572.9,-355.1],[571.4,-357.6],[569.8,-360.1],[568.2,-362.6],[566.5,-365.1],[564.9,-367.5],[563.3,-370],[561.7,-372.5],[560.1,-375],[558.5,-377.5],[556.9,-380],[555.2,-382.5],[553.6,-384.9],[552,-387.4],[550.4,-389.9],[548.8,-392.4],[547.3,-395.1],[545.9,-397.7],[544.4,-400.3],[543,-402.9]];
const SILVER=[[-60.9,-413.4],[-58.9,-415.7],[-57.0,-418.0],[-55.0,-420.3],[-53.1,-422.6],[-51.2,-424.9],[-49.2,-427.2],[-47.3,-429.5],[-45.4,-431.7],[-43.4,-434.0],[-41.5,-436.3],[-39.6,-438.6],[-37.6,-440.9],[-35.8,-443.3],[-34.2,-445.8],[-32.6,-448.4],[-31.0,-450.9],[-29.2,-453.3],[-27.4,-455.7],[-25.6,-458.1],[-23.6,-460.3],[-21.3,-462.2],[-18.6,-463.5],[-15.6,-463.8],[-11.8,-463],[-9.1,-461.7],[-6.5,-460.4],[-3.8,-459.1],[-1.2,-457.9],[1.5,-456.7],[4.2,-455.5],[6.9,-454.2],[9.6,-453],[12.3,-451.8],[15,-450.6],[17.7,-449.2],[20.4,-447.9],[22.9,-446.6],[25.6,-445.6],[28.4,-444.5],[31.2,-443.5],[33.7,-442.9],[36.6,-442.5],[39.6,-442],[42.5,-441.6],[45.3,-441.4],[48.3,-441.1],[51.2,-440.8],[54.1,-440.8],[57,-440.7],[60,-440.7],[62.8,-441],[65.7,-441.3],[68.5,-441.6],[71.4,-442.3],[74.3,-442.9],[77.2,-443.5],[80.1,-444.1],[82.9,-444.8],[85.8,-445.4],[88.7,-446],[91.6,-446.6],[94.5,-447.3],[97.4,-447.9],[100.3,-448.6],[103.2,-449.2],[106.2,-449.8],[109.1,-450.3],[112,-450.8],[114.9,-451.3],[117.8,-451.9],[120.5,-452.6],[123.4,-453.4],[126.2,-454.2],[129,-455.1],[131.8,-456],[134.7,-456.8],[137.5,-457.7],[140.3,-458.6],[143.1,-459.5],[146,-460.4],[148.5,-461.3],[151.1,-462.6],[153.7,-464],[156.3,-465.4],[158.7,-466.7],[161,-468.5],[163.4,-470.3],[165.7,-472.1],[168,-473.9],[170.1,-475.6],[172.1,-477.8],[174.1,-480],[176.1,-482.2],[178.1,-484.4],[180.1,-486.5],[181.3,-487.6],[182,-488.7],[182.3,-489.8],[182.1,-490.9],[181.6,-492],[180.5,-493.1],[178.6,-495.2],[176.5,-498.1],[175.9,-500.8],[175.3,-503.6],[174.7,-506.4],[174.1,-509.1],[173.2,-511.8],[172.3,-514.5],[171.4,-517.2],[170.6,-519.9]];
// Out of Cathedral Place (on the car's right) across Ingrave Road, right into the car's lane, on through the Queen's
// Road mini-roundabout and away up Ingrave Road.
const CATHEDRAL=[[512.5,-433.6],[514.8,-435.0],[517.2,-436.4],[519.5,-437.8],[523.1,-438.7],[526.3,-437.9],[529.1,-435.2],[530.6,-432.6],[532.0,-430.0],[533.5,-427.5],[534.9,-424.9],[536.3,-422.3],[537.7,-419.7],[539.2,-417.1],[540.6,-414.6],[542.0,-412.0],[543.4,-409.4],[544.8,-406.8],[546.3,-404.2],[547.7,-401.6],[549.1,-399.1],[550.5,-396.5],[551.9,-394.0],[553.5,-391.5],[555.1,-389.1],[556.7,-386.6],[558.3,-384.1],[559.9,-381.7],[561.5,-379.2],[563.1,-376.7],[564.8,-374.2],[566.4,-371.8],[568.0,-369.3],[569.6,-366.8],[571.2,-364.3],[572.8,-361.9],[574.4,-359.4],[576.0,-356.9],[577.5,-354.4],[579.1,-351.9],[580.4,-349.1],[581.8,-346.5],[583.2,-343.8],[584.4,-341.1],[586.7,-339.6],[589.0,-337.9],[590.0,-335.2],[589.3,-332.5],[592.0,-329.3],[594.0,-327.1],[596.1,-324.9],[598.0,-322.5],[599.8,-320.1],[601.5,-317.6],[603.2,-315.2],[604.9,-312.7],[606.5,-310.3],[608.1,-307.7],[609.7,-305.2],[611.3,-302.6],[612.8,-300.1],[614.4,-297.6],[615.9,-295.1],[617.5,-292.6],[619.1,-290.2],[620.8,-287.7],[622.4,-285.2],[624.1,-282.9],[625.9,-280.6],[627.7,-278.3],[629.5,-275.9],[631.4,-273.6],[633.2,-271.5]];
// Out of St James's Road (on the car's right at the crossroads), left on to Kings Road northbound, behind the car.
const ST_JAMES=[[35.6,199.2],[38.2,199.2],[41.4,198.3],[42.6,194.5],[43.1,191.6],[43.5,188.7],[44.0,185.7],[44.5,182.8],[45.0,179.9],[45.4,177.0],[45.9,174.0],[46.3,171.1],[46.8,168.2],[47.2,165.3],[47.7,162.3],[48.1,159.4],[48.5,156.5],[49.0,153.5],[49.4,150.6],[49.9,147.7],[50.3,144.8],[50.8,141.8],[51.2,138.9],[51.7,136.0],[52.1,133.0],[52.5,130.1],[53.0,127.2],[53.4,124.2],[53.9,121.3]];
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
    // Finishing crossing Weald Road (the signal crossing just past the High Street lights), from the east kerb.
    {id:'weald-pedestrian',name:'pedestrian',colour:'#4b5563',speed:1.3,kind:'pedestrian',waits:true,path:pts([[-67.5,-323.8],[-75.1,-320.2],[-77.3,-324.7]])},
    {id:'red-car',name:'red car',colour:'#b91c1c',speed:8,path:pts(RED)},
    // Close behind the car from Western Road along William Hunter Way, then into the car park road at the
    // mini-roundabout (parked there).
    {id:'silver-car',name:'silver car',colour:'#b8bcc2',speed:14,yields:true,parks:true,path:pts(SILVER)},
    // At the zebra crossing on William Hunter Way, on the car's left, about to step out.
    {id:'zebra-pedestrian',name:'pedestrian',colour:'#7c2d12',speed:1.4,kind:'pedestrian',waits:true,path:pts([[146.6,-462.9],[150.2,-455.9],[154.7,-458.2]])},
    {id:'black-car',name:'black car',colour:'#1f2328',speed:7,path:pts(BLACK)},
    // Waiting opposite at the Ingrave Road and Queen's Road mini-roundabout; it gives way to the car.
    // Edging out of Cathedral Place, then pulling out across the car's way, right into its lane.
    {id:'cathedral-car',name:'white car',colour:'#e8e8e4',speed:7,waits:true,path:pts(CATHEDRAL)},
    // Waiting at the St James's Road give way line for the car to pass; then left on to Kings Road behind it.
    {id:'stjames-car',name:'yellow car',colour:'#d4a017',speed:8,yields:true,waits:true,path:pts(ST_JAMES)},
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
      // (And the mini-roundabout beyond it, where traffic coming towards the crossing would come from.)
      quiet:[{x:148,z:-460,radius:28},{x:185,z:-490,radius:24}],
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
      id:'cathedral-place',
      title:'Car emerging from the right',
      where:'Ingrave Road at Cathedral Place',
      instruction:'Follow the road ahead.',
      instructAt:{x:487.8,z:-512.4},
      starts:[{actor:'cathedral-car',at:{x:487.8,z:-512.4},delay:0}],
      endAt:{x:531.2,z:-431.4},
      // The junction, and Cathedral Place behind it.
      quiet:[{x:525,z:-440,radius:28},{x:495,z:-422,radius:20}],
      place:{
        approach:{pause:{kind:'moving',at:{x:500.5,z:-485.3}},when:{actor:'cathedral-car',at:{x:523.1,z:-438.7}},frame:{yaw:0,pitch:0,view:'driver',zoom:1.25},
          state:'Approaching Cathedral Place, on the right.'},
        clear:{pause:{kind:'stop',at:{x:518.2,z:-455.2}},when:{actor:'cathedral-car',at:{x:546.3,z:-404.2}},frame:{yaw:-10,pitch:24},
          state:'Stopped for the car pulling out of Cathedral Place.'}
      },
      stages:[
        {
          id:'approach',safe:'wait',go:'go',wait:'give-way',
          buttons:['mirror-interior','look-left','look-right','signal-left','signal-right','give-way','go','horn'],
          neutral:['look-left','look-right'],
          rules:[
            {kind:'before',id:'mirror-before-slowing',action:'give-way',needs:['mirror-interior'],fault:{level:'minor',heading:'Use of mirrors - change speed',title:'Slowed without checking behind',
              message:'Check the interior mirror before you slow down: you need to know what is behind you.'}},
            {kind:'unsafe',id:'drove-on',action:'go',fault:{level:'dangerous',heading:'Awareness and planning',title:'Drove on as a car pulled out',
              message:'The car from Cathedral Place, on your right, was already pulling out across your lane. Slow down and be ready to stop: the driver may not have seen you. The examiner had to stop the car.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'Going ahead on Ingrave Road, no signal is needed.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Misleading signal',
              message:'Going ahead, no signal is needed. A right signal suggests you are turning into Cathedral Place, so the driver there may pull out further.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Slow down first',
              message:'The horn may warn a driver who has not seen you, but slowing down and being ready to stop comes first.'}}
          ],
          accepted:[['mirror-interior','give-way'],['mirror-interior','look-right','give-way'],['look-right','mirror-interior','give-way']],
          next:{wait:'clear',go:'clear'},
          explain:'Mirror, then slow down and be ready to stop: the car from Cathedral Place, on your right, was pulling out across your lane.'
        },
        {
          id:'clear',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','look-right','look-left','give-way','go','horn'],
          neutral:['look-left','mirror-interior'],
          rules:[
            {kind:'required',id:'fresh-look',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Out-of-date look',
              message:'Your last look into Cathedral Place was before the car came out. Look right again before you go on: another may follow it out.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Missed a safe gap',
              message:'The car had pulled away ahead and Cathedral Place was clear: this was the time to go on.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'Use the horn only to warn others of your presence when they may not have seen you.'}}
          ],
          accepted:[['look-right','go'],['mirror-interior','look-right','go'],['look-right','look-left','go']],
          next:{go:'done'},
          explain:'Look right into Cathedral Place again, then go on, a safe gap behind the car ahead.'
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
    },
    {
      id:'st-james-crossroads',
      title:'Crossroads, ahead',
      where:'Kings Road at St James\'s Road and King Edward Road',
      instruction:'Follow the road ahead.',
      instructAt:{x:55.1,z:134.5},
      starts:[{actor:'stjames-car',at:{x:43.2,z:212},delay:.5}],
      endAt:{x:42,z:222},
      // The crossroads, and St James's Road on the right.
      quiet:[{x:43,z:201,radius:26},{x:15,z:200,radius:22}],
      place:{
        approach:{pause:{kind:'moving',at:{x:49.9,z:169.2}},frame:{yaw:-15,pitch:18},state:'Approaching the crossroads.'}
      },
      stages:[
        {
          id:'approach',safe:'go',go:'go',wait:'give-way',
          buttons:['mirror-interior','look-right','look-left','signal-left','signal-right','give-way','go','horn'],
          neutral:['mirror-interior'],
          rules:[
            {kind:'required',id:'look-right',anyOf:['look-right'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Did not check St James\'s Road',
              message:'At a crossroads look into each side road as you approach: the driver waiting in St James\'s Road, on your right, could pull out.'}},
            {kind:'required',id:'look-left',anyOf:['look-left'],when:'go',fault:{level:'minor',heading:'Junctions - observation',title:'Did not check King Edward Road',
              message:'Look into King Edward Road, on your left, too: traffic can come out of either side road.'}},
            {kind:'hesitation',id:'hesitation',fault:{level:'minor',heading:'Progress - undue hesitation',title:'Stopped with priority',
              message:'You had priority on Kings Road and the car in St James\'s Road was waiting at its give way line: keep going, watching it.'}},
            {kind:'distractor',id:'signal-left',action:'signal-left',fault:{level:'minor',heading:'Signals - correctly',title:'Signal not needed',
              message:'Going ahead over the crossroads, no signal is needed: a signal suggests you are turning into a side road.'}},
            {kind:'distractor',id:'signal-right',action:'signal-right',fault:{level:'serious',heading:'Signals - correctly',title:'Misleading signal',
              message:'A right signal tells the driver waiting in St James\'s Road that you are turning in there, so they may pull out in front of you.'}},
            {kind:'distractor',id:'horn',action:'horn',fault:{level:'feedback',heading:'Use of horn',title:'Horn not needed',
              message:'The driver in St James\'s Road was waiting for you. Use the horn only when someone may not have seen you.'}}
          ],
          accepted:[['look-right','look-left','go'],['look-left','look-right','go'],['mirror-interior','look-right','look-left','go']],
          next:{go:'done'},
          explain:'Look into both side roads, then keep going: you have priority on Kings Road, and the car in St James\'s Road was waiting for you.'
        }
      ]
    }
  ]
};
