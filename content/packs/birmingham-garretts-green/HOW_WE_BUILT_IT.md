# How the Birmingham (Garretts Green) route was built

Batch 2, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Isleworth route
(`../isleworth-fleming-way/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the evidence pointed
to roads and junctions; the route was chosen for what it teaches and for what the engine can drive as depicted.

## 1. Find the centre as it is now

gov.uk's "Check which driving test centres you can move your test to" (updated 15 October 2026) lists Birmingham
(Garretts Green) as a current centre; the gov.uk centre finder could not be reached from this machine. OpenStreetMap has
the DVSA Driving Test Centre building on Granby Avenue, B33 0SD, at the given position. Its way in is a gated service
road off the south-east end of Granby Avenue (way 849430648), private in the map: its access tag is dropped in our copy
and it is added to the scene by its id. The route starts on it facing Granby Avenue and ends on it by the car park.

## 2. Read the evidence, then choose

`content/sources/pass2/birmingham-garretts-green-evidence.json`: 0 confirmed and 95 likely roads plus 13 likely
junctions, from ten turn-by-turn lists by one undated author (drivingtesttips.biz; intensivelessons.co.uk copies them).
The centre has not moved, so the lists' leaving and returning (right out on to Granby Avenue, right or left on to
Garretts Green Lane, back by Granby Avenue) fit the map. They were read for road and junction names only; the route
copies none of them, and no stretch follows a list's order beyond what the roads force.

The choice: a loop north, east and south of the centre, taking the Meadway roundabout and the Mackadown Lane lights
(named in most lists), Mackadown Lane for the pull-up, the signal crossing on The Radleys, Kenmure Road's end for the
emerging left turn, and the Mickleton Avenue mini-roundabout on the way back (95% on the evidence's roads).

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2200 m, 6 x 6 tiles), the centre's fixes applied,
then the scene from it, 2.2 km square round the loop's middle:

```
python3 -I tools/centres/fetch_osm.py gg.osm 52.47262 -1.7713 2200 6 --patches content/packs/birmingham-garretts-green/osm-patches.json
node tools/scenes/build_scene.mjs birmingham-garretts-green-route-1 "Birmingham (Garretts Green)" 52.472395 -1.775355 1100 gg.osm 52.472889,-1.771669 52.472458,-1.772259 849430648
```

## 4. Plan the line, probe it, script the road users

As Isleworth: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts, side roads and parked cars by metres along it, and each road user's path planned on the scene's roads
(parked cars eased round), or a road's centreline offset into its lane. What the map and the plan changed:

- **Mackadown Lane under the low bridge** is two short unnamed ways the planner would not route through (it went round
  by Tile Cross Road and Bell Lane): named in `osm-patches.json`.
- **The unnamed road beside the way in** (19 m away) satisfied the last through point first, so the plan ended on it:
  the point is placed just off the way in, on the far side.
- **Granby Avenue's car from the right** (south-east bound) is eased round the car parked 35 m short of the way out; the
  car from the left starts at the end of Granby Avenue, 50 m from the way out, so it is set going 3 s after the car
  nears the line, to come after the white car.
- **The cyclist** passing the car at the kerb on Mackadown Lane runs in its lane and out to 1.2 m right of the
  centreline round the car (pulled 0.5 m in), then back.

Following the last batch's lessons, every road user a pause waits for is set going from close in, as the car comes to
its stop, and the first decision at the roundabout, the lights, Kenmure Road and the mini-roundabout is taken stopped
at the line or in the junction; road users' paths end soon after their moment; Kenmure Road, Admington Road and
Mickleton Avenue (narrow, cars parked along one side) are kept quiet from the crossing until the car is out on
Garretts Green Lane (`quietUntil`).

## 5. Drive it headless

One drive without traffic (`decisionDrive.ts`'s `drive`, 3 minutes): passed, every pause as depicted. Found and fixed
after it, checked against the planned line (bollard clearance and the car's footprint on the carriageway), not driven
again:

| Found | Fix |
|---|---|
| The car touched the bollard on the splitter island at the Meadway roundabout's way in from Garretts Green Lane, and at the Church Road roundabout's way in from The Radleys | Its line kept 0.8 m left on the way in (a `shift`): 1.87 and 1.86 m from the bollards, from 1.36 and 1.26 |
| Turning left from Granby Avenue into the test centre, a wheel went on the footway at the inside corner | Its line swings 0.8 m wider there (a `shift` to the right) |

The full drive test (main session), first run: as authored and without traffic passed; then fixed, not driven again:

| Found | Fix |
|---|---|
| Pattern 4: a car coming the other way up Mackadown Lane squeezed past the car (0.08 m) as it stood beside a parked car | Mackadown Lane from Meadway to the low bridge kept quiet (`quietUntil` on the Meadway roundabout challenge, which has no lights, so the Mackadown Lane lights are not held all that while) |
| Pattern 14: the car stood for good at the Meadway roundabout's line: traffic queued on the black car's start, so it never set off | Its path starts 100 m back along Meadway, off the queue at the way in, set going as the direction is given (paced to come round as the car stops); and the engine now retires traffic standing 8 s on a road user's start |
| Skip ahead: traffic waiting on the ring's east side stood in the challenge's quiet circles | The circles at the way in and the ring's north-east side trimmed to 12 m |

## Still to do

The full drive test; then played in the app and every paused picture checked (camera angles are first choices), then
staging and the owner's drive. Shared changes for the app (a button in `sim/index.html`, the voice clips for new
directions, the sources in `public/legal/credits.html`) are listed in the build report.
