# How the Gillingham routes were built

From the template rules (`../ROUTE_TEMPLATE_RULES.md`) and the evidence plan (`../EVIDENCE_PLAN.md`), by the steps in
`tools/centres/README.md`, as the Morden pilot (`../morden-london/HOW_WE_BUILT_IT.md`). Judgement first: the evidence
pointed to roads; the routes were chosen for what they teach and for what the engine can drive as depicted.

## 1. Find the centre as it is now

Unit 1, Astra Park, Courteney Road, ME8 0EZ (the owner confirmed the postcode on 15 November 2026; gov.uk could not be
reached). OpenStreetMap has no "test centre" point, but a building with postcode ME8 0EZ sits at the evidence file's
position, with a motorcycle training area (`amenity=driver_training`) beside it, and a service road (way 31241841)
from Courteney Road along its north side. That way was added to both scenes by its id; both routes start on it,
facing Courteney Road.

## 2. Read the evidence, then choose

`content/sources/pass2/gillingham-evidence.json`: 6 confirmed and 30 likely roads. The route lists (s1 to s3, one
author and a copy) are from before the centre moved from Campus Way, so they count once and never for how routes leave
and return: Courteney Road and the Bowaters roundabout rest on the map and the two current area pages (s4, s5). Road
names were taken from the lists; neither route follows one.

What the map and the engine changed:

- **The roads round the centre.** Courteney Road is the only way out: north to the roundabout by Tesco and the Bowaters
  roundabout (signal-controlled, five arms), or south to Hoath Lane. Everything the evidence names near the centre is
  beyond Bowaters, so both routes go through it, and come back the same way.
- **Two directions from Bowaters.** West: Sovereign Boulevard (the A2), Ito Way (the A289) and Featherby Road, all on
  the lists. North and east: Twydall Lane, Beechings Way, Pump Lane and London Road, all on the lists. Each route takes
  one, so they leave in different directions.
- **Left out on judgement:** Hoath Way (confirmed), a 50 mph dual carriageway with no junction to decide at between
  Bowaters and Hoath Lane; the Hempstead Valley roundabouts (confirmed) 2.7 km south and Gillingham town (Canterbury
  Street, the Nelson Road junction, confirmed) 3 km north-west, each too far to share a scene with the centre and still
  give eight challenges near it.
- **Featherby Road from the north.** From the A2 westbound it is a right turn across the eastbound carriageway with no
  gap; from Beechings Way it is a right turn through the central reservation (a real right turn across oncoming
  traffic), and at its south end a left turn on to the A2 at 40 mph (emerging left). Route 1 takes it that way.
- **Emerging, which way.** Pump Lane on to London Road is a right turn and Featherby Road on to Sovereign Boulevard a
  left turn (checked by heading along the planned line).

## 3. Build the scenes

One scene per route: `gillingham-route-1` 2.4 km square, north-west of the centre (51.372446, 0.574838);
`gillingham-route-2` 2.3 km square, north-east (51.370200, 0.585913). The OpenStreetMap download: 16 tiles, merged,
then three fixes (`osm-patches.json`, explained in `ROUTES.md`): the Beechings Way central reservation gap's east
end moved 5 m west, and Courteney Road (two ways) read as a main road.

```
python3 -I tools/centres/fetch_osm.py gillingham.osm 51.37110 0.57872 1600 4 --patches content/packs/gillingham/osm-patches.json
node tools/scenes/build_scene.mjs gillingham-route-1 "Gillingham" 51.372446 0.574838 1200 gillingham.osm 51.365064,0.579944 51.365088,0.579513 31241841
node tools/scenes/build_scene.mjs gillingham-route-2 "Gillingham" 51.370200 0.585913 1150 gillingham.osm 51.365064,0.579944 51.365088,0.579513 31241841
```

## 4. Plan the line, probe it, script the road users

As Morden: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
mini-roundabouts, give way ends and the parked cars along it by metres, and each road user's path generated on the
scene's roads. Where the planner turned a road user off before the point it had to reach (into the test centre's way
out, into Featherby Road), its path is the road's centreline offset into the left lane instead. The pull-ups are where no car is parked
on either kerb for 30 m behind and 40 m ahead (Featherby Road between Chilham Road and Elmfield; Pump Lane, with none
parked).

## 5. Drive it headless

`CENTRE=gillingham npx vitest run tests/unit/decisionDrive.centre.test.ts`: both routes with the right answers,
without traffic, with 30 background road users in two patterns (4 and 14), and with Skip ahead. Tuning on the way:

| Found | Fix |
|---|---|
| A road user's planned path turned into the test centre's way out, or into Featherby Road | The road's centreline, offset into the lane |
| The silver car on Beechings Way was past its point when the car came to the moving pause (the car slowed round the Cornwallis Roundabout) | Started later (as the car leaves the roundabout), and faster |
| Waiting to turn into Featherby Road, the car stood on the central reservation | The gap's way moved in the map data (step 3) |
| Off the carriageway, and touching a lamp post or the splitter island's bollard, at the roundabout by Tesco | Courteney Road read as a main road (step 3: 6.4 m, not 6), and the car's way set between the bollard and the kerbs (`shifts`) |
| With traffic, a car queued at the Will Adams Roundabout kept the car short of its line while the black car went by | The black car set going once the car is at the line, its path cut to start near |
| With traffic, a car waiting to come out of The Chase on to Featherby Road and the car each waited for the other | The ends of The Chase and Hanway kept clear while the emerge on to the A2 is in hand |
| With traffic, the car easing round a car parked on Courteney Road on the way back met a car coming the other way | Courteney Road read as a main road (step 3): no kerb parking |

Results are in the build report.

## Still to do

Played in the app and every paused picture screenshotted and checked (camera angles are first choices), then staging
and the owner's drive. Shared changes before the routes go in the app: a button for each in `sim/index.html`, and the
sources (s1 to s6) listed in `public/legal/credits.html`. Every direction is one the pilots already use, so no new voice
clips are needed.
