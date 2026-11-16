# How the Grantham (Somerby) routes were built

A batch 2 centre (`../BATCH_BUILD_BRIEF.md`), built by the steps in `tools/centres/README.md` and the pilots' method
(`../morden-london/HOW_WE_BUILT_IT.md`), to the template's rules (`../ROUTE_TEMPLATE_RULES.md`): judgement first
(`../EVIDENCE_PLAN.md` section 7). The routes are in `ROUTES.md`.

## 1. Find the centre as it is now

The evidence gives Spitalgate Airfield, Blue Harbour, NG31 7TX at 52.90194, -0.58734 (gov.uk could not be read
automatically). That point is the A52 / B6403 junction at Cold Harbour, east of Grantham. OpenStreetMap has no test
centre there; 200 m south, on the west side of the A52 (High Dike), is a site mapped "Vehicle testing Station" (the
former goods vehicle testing station the 2014 move went to), with a 35 m way in (way 1390010340) and a one-way loop
round its yard (1390010339, 183638562). All three were built into both scenes by id; both routes start and end on the
way in. *To confirm with the owner.*

## 2. Read the evidence, then choose

`content/sources/pass2/grantham-somerby-evidence.json`: 2 confirmed roads (A52 Somerby Hill, the A1), 53 likely roads and
7 junctions, almost all from one route list for the old Cecil Street centre in the town (s1, repeated by s2), plus an
instructor's page on the new centre (s3: the A52, the A1, hill starts). Per the rules, the old-centre list counts for
roads further out, never for leaving and returning. Its roads were read for names only; neither route copies one of
its routes.

What the map showed:

- The centre is out of town on 60 mph roads. Every named road is 2.5 to 5 km west. Two ways lead there: south to the
  Somerby Hill roundabout and over Somerby Hill (the A52) into the town's east side; or north up the B6403 and west
  along Harrowby Lane into the Harrowby estates. Each route takes one, so they leave in different directions.
- **Harrowby Lane** has the only mini-roundabout in reach (New Beacon Road), which the route list's "Harrowby Lane
  roundabout" must mean (it is the only roundabout on Harrowby Lane), and a zebra 230 m before it: one or the other.
  The mini-roundabout was kept (route 2 has a zebra).
- **Harrowby Road** has one set of lights, at Sandon Road, Stonebridge Road and Beacon Lane: the route list's "Harrowby
  Road lights". Route 2 goes ahead through them, round by Hill Avenue (likely) and New Beacon Road (likely), and back.
  Harrowby Road's zebra and the Somerby Hill crossing are each about 200 m from a junction route 2 uses, so only one
  of each pair is a challenge.
- **Somerby Hill**: the hill s3 names for hill starts. Route 2 pulls up and moves off on it, near the Hillside Drive /
  Bridge End Grove crossroads (the ground is flat in the simulator).
- **Rural junctions**: the routes use the 60 mph ones a candidate from this centre meets every time: out of the
  centre on to the A52 (left on route 1, right on route 2), Harrowby Lane on to the B6403, and the right turn back
  into the centre across the A52.
- The town-centre places (Wharf Road and Barrowby Road roundabouts, Belton Lane and Watergate lights) and the A1 are
  out of reach of a scene that holds the centre: not used (`ROUTES.md`).

## 3. Build the scenes

The map download for both scenes (one area 4.1 km square round 52.907105, -0.605211, half-size 2050, in 25 tiles), with
the centre's map fixes:

```
python3 -I tools/centres/fetch_osm.py <scratch>/grantham.osm 52.907105 -0.605211 2050 5 --patches content/packs/grantham-somerby/osm-patches.json
node tools/scenes/build_scene.mjs grantham-somerby-route-1 "Grantham (Somerby)" 52.910025 -0.600744 1650 <scratch>/grantham.osm 52.900485,-0.589693 52.900377,-0.589261 1390010340,1390010339,183638562
node tools/scenes/build_scene.mjs grantham-somerby-route-2 "Grantham (Somerby)" 52.903737 -0.610424 1650 <scratch>/grantham.osm 52.900485,-0.589693 52.900377,-0.589261 1390010340,1390010339,183638562
```

Each scene is 3.3 km square (half-size 1650, larger than the pilots' 2.4 to 2.5 km) so that it holds the centre and
the town's east side; the eastern half is fields, so the scenes are smaller files than the pilots' (about 280 kB).
Route 1's is centred north-west of the centre, route 2's west. Two map fixes (`osm-patches.json`, each with its reason):
the B6403's first node past Harrowby Lane moved 150 m on along its line (the junction was 8 m from the way's end in
the scene, too close to be found), and the centre's unnamed 35 m way in named "Driving Test Centre" (the planner will
not turn into an unnamed road under 40 m, so route 1 could not come back in).

## 4. Plan the line, probe it, script the road users

As the pilots: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts and parked cars by metres along it, give way lines worked out from where the car's front comes within a
metre of the main road's edge, and each road user's path planned on the scene's roads from a start through points
(the car pulled up at the kerb given room as a parked car). Things to know:

- Uplands Drive is one way in the map that loops back on itself: the planner cannot turn from its end into its own
  middle, so the route goes round its south side to Tennyson Avenue.
- On the B6403 north of Harrowby Lane (150 m to the scene's edge), the planner will not plan a road user's path on to
  the stub: the cyclist's and the blue car's paths are the road's left lane there.
- Planning points must be on the road (within 20 m): two first guesses on Somerby Hill and New Beacon Road were 30 to
  50 m off it and the way could not be planned.
- A road user waiting for a moment is safe to start early: the runner holds a car 4 m short of its point until the car
  is there. A late one is not (a moving pause then comes with the car stopped at the line).

## 5. Drive it headless

`CENTRE=grantham-somerby npx vitest run tests/unit/decisionDrive.centre.test.ts`: both routes with the right answers,
without traffic, with 30 background road users in two patterns (4 and 14), and with Skip ahead pressed whenever
offered. Tuning on the way:

| Found | Fix |
|---|---|
| The way could not be planned from the B6403 into Harrowby Lane, nor back into the centre | The two map fixes in section 3 |
| The grey car (route 1) drove through the car pulled up on Harrowby Lane | Its path re-planned round the car where it really stops (the first was planned round a point 2 m into the kerb) |
| The white car at the mini-roundabout came late, held at the New Beacon Road signal crossing just before its point, so the "on the move" decision came with the car stopped at the line | It waits, seen, just past the crossing, and edges out to meet the car |
| Ending in the yard (round the loop) took the car's corner over the footway | The route ends on the way in, as first planned |

## Still to do

Add the routes to the home screen (`sim/index.html`) and the sources to `public/legal/credits.html` (shared files, not
touched), record the voice clips (`node tools/voice/make_voice.mjs`), play them in the app and look at every paused
picture, then staging and the owner's drive. Open items are in `ROUTES.md`.
