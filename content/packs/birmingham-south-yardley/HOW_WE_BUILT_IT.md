# How the Birmingham (South Yardley) route was built

Batch 4, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Garretts Green
route (`../birmingham-garretts-green/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the
evidence pointed to roads and junctions; the route was chosen for what it teaches and for what the engine can drive as
depicted.

## 1. Find the centre as it is now

gov.uk's "Check which driving test centres you can move your test to" (read 17 November 2026) lists Birmingham (South
Yardley) as a current centre; the gov.uk centre finder could not be reached from this machine. OpenStreetMap has "DVSA
South Yardley Driving Test Centre" on Clay Lane, B26 1EA, 125 m north of the given position (houses on Clay Lane in the
same postcode): the same site. Its way in is a gated service road off the west side of Clay Lane (way 921257196),
private in the map: its access tag is dropped in our copy and it is added to the scene by its id. The route starts on
it facing Clay Lane and ends on its bend by the car park.

## 2. Read the evidence, then choose

`content/sources/pass2/birmingham-south-yardley-evidence.json`: 0 confirmed and 123 likely roads plus 16 likely
junctions, from fifteen turn-by-turn lists by one undated author (drivingtesttips.biz; intensivelessons.co.uk copies
them). The centre has not moved, so the lists' leaving and returning (left or right out on to Clay Lane, the two Clay
Lane mini-roundabouts, The Vineries mini-roundabout on the way home) fit the map. They were read for road and junction
names only; the route copies none of them, and no stretch follows a list's order beyond what the roads force.

The choice: a figure of eight through the test centre, taking the Gilbertstone Avenue lights, Clay Lane for the pull-up,
the Barn Lane / Richmond Road, Pierce Avenue / Richmond Road and Pierce Avenue / Lincoln Road North junctions, and The
Vineries mini-roundabout (98% on the evidence's roads). No large roundabout or pedestrian crossing the engine can depict
is in reach (`ROUTES.md`).

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2200 m, 6 x 6 tiles), the centre's fix applied, then
the scene from it, 2.1 km square round the loop's middle:

```
python3 -I tools/centres/fetch_osm.py sy.osm 52.45398 -1.81009 2200 6 --patches content/packs/birmingham-south-yardley/osm-patches.json
node tools/scenes/build_scene.mjs birmingham-south-yardley-route-1 "Birmingham (South Yardley)" 52.453261 -1.804857 1050 sy.osm 52.454991,-1.810002 52.454979,-1.809736 921257196
```

## 4. Plan the line, probe it, script the road users

As Garretts Green: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
mini-roundabouts, give way ends and parked cars by metres along it, and each road user's path planned on the scene's
roads, or a road's centreline offset into its lane (the cyclist), or a straight walk (the two pedestrians). What the
map and the plan changed:

- **Gilbertstone Avenue**: the planner first cut through Gotham Road and Steyning Road to the A45; a point just before
  the lights keeps it on Gilbertstone Avenue.
- **The Coventry Road / Clay Lane lights** are mapped on the A45 west of Clay Lane, so in the scene the left turn into
  Clay Lane passes no stop line: the lights challenge is at Gilbertstone Avenue, where the scene has a junction set.
- **The way back in**: the last point is on the way in's bend, more than 20 m from Clay Lane, so the plan takes it.
- **The cyclist** passing the car at the kerb on Clay Lane runs in its lane and out to 1.2 m right of the centreline
  round the car (pulled 0.5 m in), then back: 3.3 m clear.

Every road user a pause waits for is set going from close in, as the car comes to its stop or line; road users' paths
end soon after their moment.

## 5. Drive it headless

Not yet: the shared machine was running a long drive test. Checked without driving: the checker passes, the authoring
rules part of `decisionDrive.centre.test.ts` passes (the planned line clear of the parked cars, each road user's path
clear of them), every pause point is on the planned line (within 0.1 m), and the car's footprint along the line stays
on the carriageway.

## Still to do

The full drive test (main session); then played in the app and every paused picture checked (camera angles are first
choices), then staging and the owner's drive. Shared changes for the app (a button in `sim/index.html`, the voice clips
for new directions, the sources in `public/legal/credits.html`) are listed in the build report.
