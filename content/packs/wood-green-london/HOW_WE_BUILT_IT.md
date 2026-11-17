# How the Wood Green (London) route was built

Batch 4, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Tottenham and
Garretts Green routes (`../tottenham/HOW_WE_BUILT_IT.md`, `../birmingham-garretts-green/HOW_WE_BUILT_IT.md`). Judgement
first (`../EVIDENCE_PLAN.md` section 7): the evidence pointed to roads and junctions; the route was chosen for what it
teaches and for what the engine can drive as depicted.

## 1. Find the centre as it is now

gov.uk's "Check which driving test centres you can move your test to" (updated 15 October 2026) lists Wood Green
(London) as current; the centre finder could not be reached. DVSA's centre data (as quoted by passrates.uk) gives Wood
Green Crown Court, Woodhall House, Lordship Lane, N22 5LF. OpenStreetMap has the "Wood Green Driving Test Centre"
building on the north side of Lordship Lane at the given position, with a short way in (way 1285784813, permissive) to
a car park aisle (way 1285784815) beside it. One guide page's Coburg Road address is not used.

## 2. Read the evidence, then choose

`content/sources/pass2/wood-green-london-evidence.json`: 0 confirmed, 60 likely roads and 22 likely junctions, from
eight turn-by-turn lists by one author (drivingtesttips.biz; intensivelessons.co.uk copies them), plus a local forum
thread. Every list leaves and returns by Lordship Lane, so they fit the current address. They were read for names only.

The choice: east along Lordship Lane and a loop through Tower Gardens, back along Lordship Lane (89% on the evidence's
roads), so that the eight challenges cover the whole mix 300 m apart. See `ROUTES.md` for what was left out and why.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2000 m, 6 x 6 tiles), the centre's fixes applied,
then the scene, 1.9 km square, centred east of the centre to take in Tower Gardens:

```
python3 -I tools/centres/fetch_osm.py wg.osm 51.59859 -0.1044 2000 6 --patches content/packs/wood-green-london/osm-patches.json
node tools/scenes/build_scene.mjs wood-green-london-route-1 "Wood Green (London)" 51.59886 -0.09356 950 wg.osm 51.598660,-0.104085 51.598554,-0.103993 1285784813,1285784815
```

## 4. Plan the line, probe it, script the road users

As Tottenham: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts, mini-roundabouts and parked cars by metres along it, and each road user's path planned on the scene's
roads (parked cars eased round) the same way, from a start pose through points. What the map and the plan changed:

- **The way in and aisle** are unnamed and under 40 m, so the planner would not turn into them: named in
  `osm-patches.json`. The car park lies within 20 m of Lordship Lane everywhere, so the last two through points sit
  just off the way in and the aisle, away from Lordship Lane.
- **The Tower Gardens Road crossroads with Turnant Road and Teynton Terrace** is a T where Turnant Road runs straight on
  into Teynton Terrace: a right turn there would be into a side road, not emerging. The emerging right turn is taken at
  Kevelioc Road's end on Lordship Lane instead.
- **The cyclist** passing the car at the kerb on Lordship Lane runs in its lane and 1.6 m out to the right round the car
  (pulled 0.5 m in), about 1.1 m clear of it.
- **The pedestrian at the way out** walks the footway 4.5 m from Lordship Lane's centre line; the car stops with its
  front about 1.4 m short of that line.

Every road user a pause waits for is set going from close in, as the car comes to its stop; at the mini-roundabout,
the roundabout, Kevelioc Road and the turn into the test centre the first decision is taken where the car waits.
Awlfield Avenue, Risley Avenue and Kevelioc Road (narrow, cars parked) are kept quiet from the mini-roundabout until the
car is at the end of Kevelioc Road (`quietUntil` on challenges 5 and 6).

## 5. Check it

The planned line checked on its own (not driven): the car's corners on the carriageway all the way but one rear corner
over the footway at the mouth of the way in as it turns in; street furniture: a post on the splitter island leaving the
Waltheof Avenue roundabout west came 0.15 m from the car's side, so the line is kept 0.5 m left there (`shifts`).

No drive was run here (the machine was busy); the full drive test is the next step.

## Still to do

The drives; then played in the app and every paused picture checked (camera angles are first choices), then staging
and the owner's drive. Shared changes for the app (a button in `sim/index.html`, voice clips for the new directions,
the sources in `public/legal/credits.html`) are listed in the build report.
