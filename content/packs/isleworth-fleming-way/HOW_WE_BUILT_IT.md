# How the Isleworth (Fleming Way) routes were built

Batch 2, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Morden pilot
(`../morden-london/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the evidence pointed to
roads and junctions; the routes were chosen for what they teach and for what the engine can drive as depicted.

## 1. Find the centre as it is now

The evidence file gives Unit 8, The Wireless Factory, Fleming Way, TW7 6DB, from DVSA's own bulletin of the move
(Worton Hall closed 7 May 2018; Fleming Way opened 14 May 2018). gov.uk could not be opened from this machine: *to
recheck on the gov.uk centre finder*. In OpenStreetMap Fleming Way is a service road south off Worton Road (way
1379295298, joining Worton Road 280 m west of the Twickenham Road lights), with a branch west (5217117) past the units.
The service road is not a normal road in the map: it was added to both scenes by its id, as Morden's was. Both routes
start on it 35 m short of Worton Road, facing it, and come back into it.

## 2. Read the evidence, then choose

`content/sources/pass2/isleworth-fleming-way-evidence.json`: 0 confirmed and 59 likely roads plus 13 likely junctions,
all from one undated route-list author (drivingtesttips.biz; intensivelessons.co.uk copies it word for word). The lists
probably predate the 2018 move from Worton Hall, on the same road about 250 m west, so they were not used for how
routes leave and return: that rests on the map (Fleming Way meets only Worton Road). Further out they were read for
road and junction names only; neither route copies one, and no stretch follows a list's order beyond what the roads
force (Worton Road to the Twickenham Road lights is the only way east).

The choice: route 1 goes east and south (Twickenham Road, Mogden Lane, Whitton Dene, Hall Road), route 2 west and
north (Bridge Road, London Road, St John's Road). Between them they take five of the known junctions that suit a
scenario: the Worton Road / Twickenham Road lights (both routes, from different arms), the Mogden Lane roundabout, the
Hall Road / Whitton Dene mini-roundabout, the Worton Road / Bridge Road mini-roundabout and the London Road / Bridge
Road lights.

What the map changed:

- **Twickenham Road (A310) is mapped in short pieces**, many under 10 m. A crossing node within 8 m of a piece's end
  is not built, so the zebra by Lynton Close and the pelican south of Worton Road are missing from the scene; route 1's
  crossing went to route 2 (the London Road zebra by Thornbury Road). The same pieces carry the signals on the
  Twickenham Road arms of the Worton Road lights, so in the scene those lights stop Worton Road and Van Gogh Close only.
- **The Mogden Lane roundabout's Whitton Dene arm** began with a 6.5 m piece: the lane path had no points on it and cut
  straight across the island. Two nodes moved west along Whitton Dene in `osm-patches.json` (no change of shape).
- **Woodlands Road and Riverside Walk** (a way back to Worton Road from St John's Road) end in cycle paths, so route 2
  comes home by Twickenham Road and the Worton Road lights instead.
- **Twickenham Road / St John's Road** is a mini-roundabout (first choice for route 2's last challenge); it was given
  up for the right turn at the Worton Road lights, a known junction, so the route meets the rule of three.
- **Chertsey Road (A316)** and its roundabouts are dual carriageway trunk road: left out.

## 3. Build the scenes

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2000 m, 6 x 6 tiles), the centre's fixes applied
(`patch_osm.py`), then two scenes from it, 2.4 km square:

```
python3 -I tools/centres/fetch_osm.py isleworth.osm 51.46634 -0.33722 2000 6 --patches content/packs/isleworth-fleming-way/osm-patches.json
node tools/scenes/build_scene.mjs isleworth-fleming-way-route-1 "Isleworth (Fleming Way)" 51.46297 -0.33989 1200 isleworth.osm 51.466834,-0.336369 51.467202,-0.336456 1379295298
node tools/scenes/build_scene.mjs isleworth-fleming-way-route-2 "Isleworth (Fleming Way)" 51.47083 -0.34299 1200 isleworth.osm 51.466834,-0.336369 51.467202,-0.336456 1379295298
```

## 4. Plan the line, probe it, script the road users

As Morden: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts and side roads by metres along it, and each road user's path planned on the scene's roads. A planned path
runs only as far as the last junction it decides at, so the two that only go along Worton Road (route 1's blue car,
route 2's white car) are Worton Road's centreline offset into the left lane (`tools/scenes/lane_path.py`). No cars are
parked along either route in the scene, so each pull-up is chosen for its junctions: route 1 on the straight of Whitton
Dene past its bend (the cyclist then turns into Queensbridge Park), route 2 on St John's Road short of Nottingham Road
(the grey car turns into it).

## 5. Drive it headless

`CENTRE=isleworth-fleming-way npx vitest run tests/unit/decisionDrive.centre.test.ts`: both routes with the right
answers, without traffic, with 30 background road users in two patterns (4 and 14), and with Skip ahead (results in
`ROUTES.md`). Tuning on the way, each found with a single drive (`decisionDrive.ts`'s `drive`, about 2 minutes without
traffic, 15 with):

| Found | Fix |
|---|---|
| Route 1's line cut across the Mogden Lane roundabout's island | The short Whitton Dene piece lengthened (`osm-patches.json`) |
| Route 1's car touched the bollard on the Mogden Lane splitter island at the give way line | Its line kept 0.9 m left on the way in (a `shift`) |
| Route 2's car ran over the footway turning left into Fleming Way at the end | Its line kept 0.7 m out (a `shift`) |
| Both drives stopped more than 12 m short of the planned line's end (the runner stops 12 m short; the test allows 12) | The routes end on Fleming Way's branch past its bend, by the units |
| Road users meant to meet the car at the Mogden Lane lights, the Hall Road mini-roundabout, the Worton Road lights from Twickenham Road and the way into the test centre came too early or too late once traffic held the car up (pacing could not hold them: a road user is never slowed below 40% of its speed) | Set going from close in, as the car reaches the junction; at the Mogden Lane lights, the Hall Road mini-roundabout and the Worton Road lights the first decision is taken where the car waits (in the junction, at the line) |
| In traffic, the car crawled up to the London Road zebra behind cars stopping for the pedestrian | The pedestrian waits at the kerb until the car is close, and the first decision shows them waiting |
| In traffic, cars pulling out of Briar Close, Harlequin Close, Heath Road and Riverside Walk met the car or held it up for 50 s | Those side roads kept quiet while the challenges round them are in hand (`quietUntil` on the Mogden Lane lights and the Hall Road mini-roundabout) |
| A bus turning into St John's Road ahead of the car met the silver car | St John's Road's mouth added to that challenge's quiet circles, from further back |

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (buttons in `sim/index.html`, the voice clips for new directions, the sources in
`public/legal/credits.html`) are listed in the build report.
