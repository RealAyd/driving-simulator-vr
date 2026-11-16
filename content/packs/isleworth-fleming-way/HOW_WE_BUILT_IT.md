# How the Isleworth (Fleming Way) route was built

Batch 2, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Morden pilot
(`../morden-london/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the evidence pointed to
roads and junctions; the route was chosen for what it teaches and for what the engine can drive as depicted. Two routes
were built first; when the owner moved to one route per centre the stronger was kept and given the other's crossing and
emerging left turn (below).

## 1. Find the centre as it is now

The evidence file gives Unit 8, The Wireless Factory, Fleming Way, TW7 6DB, from DVSA's own bulletin of the move
(Worton Hall closed 7 May 2018; Fleming Way opened 14 May 2018). gov.uk could not be opened from this machine: *to
recheck on the gov.uk centre finder*. In OpenStreetMap Fleming Way is a service road south off Worton Road (way
1379295298, joining Worton Road 280 m west of the Twickenham Road lights), with a branch west (5217117) past the units.
The service road and its branch are not normal roads in the map: they were added to the scene by their ids, as Morden's
was. The route starts 35 m short of Worton Road, facing it, and ends on the branch by the units.

## 2. Read the evidence, then choose

`content/sources/pass2/isleworth-fleming-way-evidence.json`: 0 confirmed and 59 likely roads plus 13 likely junctions,
all from one undated route-list author (drivingtesttips.biz; intensivelessons.co.uk copies it word for word). The lists
probably predate the 2018 move from Worton Hall, on the same road about 250 m west, so they were not used for how the
route leaves and returns: that rests on the map (Fleming Way meets only Worton Road). Further out they were read for
road and junction names only; the route copies none, and no stretch follows a list's order beyond what the roads force
(Worton Road to the Twickenham Road lights is the only way east).

The choice: east and south, by Twickenham Road, Mogden Lane, Whitton Dene and Hall Road (93% of the first version on
the evidence's roads), taking three known junctions that suit a scenario: the Worton Road / Twickenham Road lights,
the Mogden Lane roundabout and the Hall Road / Whitton Dene mini-roundabout. A second route west and north (Bridge
Road, London Road, St John's Road) was built and driven too, then dropped for one route per centre; this one kept the
only large roundabout in reach and took over the second's two kinds it lacked: the crossing (the signal crossing on
Mogden Lane, met turning in at the lights, in place of an oncoming car there, which moved to the Twickenham Road lights)
and an emerging left turn (a loop by Eaton Road, Ellerdine Road and Tudor Road, out of Heath Road on to Worton Road, in
place of the right turn into the test centre as the eighth challenge).

What the map changed:

- **Twickenham Road (A310) is mapped in short pieces**, many under 10 m. A crossing node within 8 m of a piece's end
  is not built, so the zebra by Lynton Close and the pelican south of Worton Road are missing from the scene; the
  route's crossing is the one on Mogden Lane at the lights. The same pieces carry the signals on the Twickenham Road
  arms of the Worton Road lights, so in the scene those lights stop Worton Road and Van Gogh Close only.
- **The Mogden Lane roundabout's Whitton Dene arm** began with a 6.5 m piece: the lane path had no points on it and cut
  straight across the island. Two nodes moved west along Whitton Dene in `osm-patches.json` (no change of shape).
- **Chertsey Road (A316)** and its roundabouts are dual carriageway trunk road: left out.

## 3. Build the scenes

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2000 m, 6 x 6 tiles), the centre's fixes applied
(`patch_osm.py`), then the scene from it, 2.4 km square:

```
python3 -I tools/centres/fetch_osm.py isleworth.osm 51.46634 -0.33722 2000 6 --patches content/packs/isleworth-fleming-way/osm-patches.json
node tools/scenes/build_scene.mjs isleworth-fleming-way-route-1 "Isleworth (Fleming Way)" 51.46297 -0.33989 1200 isleworth.osm 51.466834,-0.336369 51.467202,-0.336456 1379295298,5217117
```

## 4. Plan the line, probe it, script the road users

As Morden: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts and side roads by metres along it, and each road user's path planned on the scene's roads. A planned path
runs only as far as the last junction it decides at, so the blue car, which only goes along Worton Road, is Worton
Road's centreline offset into the left lane (`tools/scenes/lane_path.py`). No cars are parked along the route in the
scene, so the pull-up is chosen for its junctions: on the straight of Whitton Dene past its bend (the cyclist then turns
into Queensbridge Park).

## 5. Drive it headless

`ROUTES=isleworth-fleming-way-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: the route with the right
answers, without traffic, with 30 background road users in two patterns (4 and 14), and with Skip ahead (results in
`ROUTES.md`). Tuning on the way, each found with a single drive (`decisionDrive.ts`'s `drive`, about 2 minutes without
traffic, 15 with):

| Found | Fix |
|---|---|
| The line cut across the Mogden Lane roundabout's island | The short Whitton Dene piece lengthened (`osm-patches.json`) |
| The car touched the bollard on the Mogden Lane splitter island at the give way line | Its line kept 0.9 m left on the way in (a `shift`) |
| The drive stopped more than 12 m short of the planned line's end (the runner stops 12 m short; the test allows 12) | The route ends on Fleming Way's branch past its bend, by the units |
| Road users meant to meet the car at the lights, the Hall Road mini-roundabout and the way into the test centre came too early or too late once traffic held the car up (pacing could not hold them: a road user is never slowed below 40% of its speed) | Set going from close in, as the car reaches the junction; at the Twickenham Road lights, the Hall Road mini-roundabout and Heath Road the first decision is taken where the car waits (in the junction, at the line) |
| In traffic, cars pulling out of Briar Close, Harlequin Close, Heath Road and Riverside Walk met the car or held it up for 50 s | Those side roads kept quiet while the challenges round them are in hand (`quietUntil` on the Mogden Lane lights and the Hall Road mini-roundabout) |
| In traffic, a car met the car face to face at the mouth of Eaton Road and stood there (8 minutes) | The loop by Eaton Road, Ellerdine Road and Tudor Road kept quiet while the car drives it |
| In traffic, the pedestrian on the Mogden Lane crossing was across before the car came (held up at the lights) | Set going as the car comes up to the lights |
| With Skip ahead, the green car at the Hall Road mini-roundabout came past its point while the car crept up to the line | It is paced as a car easing up to a junction (`waits`), so it can slow as much as the car needs |


## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (a button in `sim/index.html`, the voice clips for new directions, the sources in
`public/legal/credits.html`) are listed in the build report.
