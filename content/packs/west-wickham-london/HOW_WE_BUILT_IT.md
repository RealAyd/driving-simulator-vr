# How the West Wickham (London) route was built

Batch 5, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the batch 4 routes
(`../upton/HOW_WE_BUILT_IT.md`, `../wood-green-london/HOW_WE_BUILT_IT.md`, `../kettering/HOW_WE_BUILT_IT.md`). Judgement
first (`../EVIDENCE_PLAN.md` section 7): the evidence pointed to roads and junctions; the route was chosen for what it
teaches and for what the engine can drive as depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

The evidence file gives 56 Glebe Way, West Wickham BR4 0RL, from DVSA's centre data as quoted on passrates.uk (captured
May 2026) and matched by drivingtesttips.biz's centre page and Drive Johnsons' centre list (pass rates to 2023-24, so it
is open). gov.uk's centre finder results could not be read from this machine: *to recheck on the gov.uk centre finder*.
OpenStreetMap has "The Driving Test Centre" (node 9979821624) at the position we were given, a unit in the parade on the
south side of Glebe Way, between the parade's service road and Rose Walk. The route starts on Rose Walk, where the
listed routes start and where the centre's extra parking is.

## 2. Read the evidence, then choose

`content/sources/pass2/west-wickham-london-evidence.json`: 10 confirmed and 19 likely places. The route lists
(intensivelessons.co.uk and drivingtesttips.biz, the same eight routes, counted once) all leave by Rose Walk, so they fit
the current site; a driving school's lessons page (Bill Plant) confirms the Glebe Way roundabout, the Kent Gate Way
roundabouts, Corkscrew Hill, the High Street and Wickham Court Road. The lists were read for road and junction names
only; the route copies none of them (no listed route goes Glebe Way, Addington Road, Corkscrew Hill and Stambourne Way).

The choice: east by Glebe Way to the Glebe Way roundabout, down Addington Road over the crossing to the Corkscrew Hill
roundabout, up Corkscrew Hill, round by Wood Lodge Lane and Stambourne Way, and back by the Wickham Court Road lights and
Glebe Way (81% of the length on the evidence's roads, 3 of 8 challenges at known junctions).

What the map changed:

- **Spacing at both ends.** The Glebe Way lights are 300 m from Rose Walk along Glebe Way and 290 m up Wickham Court
  Road from Rose Walk's south end, so a route leaving down Rose Walk (as the lists do) could not have both its first
  challenge and the lights. Leaving north on to Glebe Way puts the lights last, 380 m after the emerging left turn.
- **The return.** From the lights, the plan turns into the parade's service road (a smoother line than Rose Walk) and
  runs on 80 m along it to the centre: the way back ends in front of the test centre, with no challenge of its own
  after the lights.
- **The crossing and the Corkscrew Hill roundabout** are 60 m apart: the crossing is the challenge, the roundabout
  driven through.
- **No mini-roundabout** within reach of this loop (`ROUTES.md`).

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2500 m, 6 x 6 tiles), then the scene from it, 1.24 km
square, centred south-east of the centre to take in the Glebe Way roundabout and Corkscrew Hill (no map fixes were
needed):

```
python3 -I tools/centres/fetch_osm.py ww.osm 51.37504 -0.01093 2500 6
node tools/scenes/build_scene.mjs west-wickham-london-route-1 "West Wickham (London)" 51.37199 -0.00805 620 ww.osm 51.374366,-0.01093 51.375049,-0.010383
```

## 4. Plan the line, probe it, script the road users

As Upton and Wood Green: the car's way planned through points on the scene's roads, a probe listing stop lines,
crossings, roundabouts, parked cars and bus stops by metres along it, and each road user's path planned on the scene's
roads the same way, from a start pose through points, then trimmed. The cyclist at the pull-up is the car's own lane,
eased 1.9 m out round it (2.5 m centre to centre with the car pulled 0.6 m in). Each give way stop was put where the
car's nose is 1 m short of the road it joins (or of the roundabout's ring); the crossing's stop where the red light
stops the car (3.15 m short of the stop line); the waits to turn right in the junction, in the car's lane, 3 m from the
oncoming car's line. Every road user a pause waits for is set going from close in, as the car comes to its stop.

## 5. Drive it headless

Each step was checked with single drives (`decisionDrive.ts`'s `drive`, under half a minute without traffic, about
three minutes with), with a copy that also records the closest the car's box comes to each bollard and post, then
`ROUTES=west-wickham-london-1 npx vitest run tests/unit/decisionDrive.centre.test.ts` (results in `ROUTES.md`).

| Found | Fix |
|---|---|
| The car touched the splitter bollards leaving the Glebe Way roundabout into Addington Road and entering the Corkscrew Hill roundabout | The line kept left past each (`shifts`); at the first, kept left alone the car cut the exit's inside kerb, so it is kept 1 m wide first, then 1.4 m left |
| Leaving the Corkscrew Hill roundabout up Corkscrew Hill, the car came within 0.1 m of the splitter bollard; kept left, its middle went over the kerb that juts out just short of it | Kept 1.7 m out on the ring, then 1.5 m left past the bollard: 0.74 m from it, on the carriageway (chosen from a grid of drives) |
| With traffic (pattern 14), the cyclist was past the car before it had pulled up | The cyclist set going only as the car comes to its stop, from 50 m behind |
| With traffic, cars stopped at the crossing's red light on the far side, and one at the mouth of the service road just past it, were in the picture | The crossing, the service road's mouth and the road on to the roundabout kept quiet from the Glebe Way roundabout until the car is at the crossing; the crossing's own quiet circles kept to the crossing itself (a car the learner followed, turning into the service road, was otherwise held in front of the car for 45 s) |
| With traffic, cars knotted at the Wickham Crescent junction on Wickham Court Road, holding the car | Kept quiet from Stambourne Way until the car is at the Glebe Way lights |

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (a button in `sim/index.html`, the sources in `public/legal/credits.html`) are listed
in the build report; every direction used already has a voice clip on another route.
