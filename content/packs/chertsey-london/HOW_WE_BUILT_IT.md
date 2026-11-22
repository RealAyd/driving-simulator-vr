# How the Chertsey (London) route was built

Batch 5, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the batch 4 routes
(`../wood-green-london/HOW_WE_BUILT_IT.md`, `../kettering/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md`
section 7): the evidence pointed to roads and junctions; the route was chosen for what it teaches and for what the
engine can drive as depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

gov.uk's "Check which driving test centres you can move your test to" (updated 15 October 2026) lists Chertsey
(London) as current; the centre finder could not be reached. DVSA's centre data (as quoted by passrates.uk, captured
May 2026) gives Unit 4, The Forum, Hanworth Lane, KT16 9JX. OpenStreetMap has the Hanworth Lane Business Park at the
given position, with a KT16 9JX building 29 m from it, but no unit names. Every free route list starts and ends by The
Knoll and the A320 roundabout beside the park, so they fit the current address.

## 2. Read the evidence, then choose

`content/sources/pass2/chertsey-london-evidence.json`: 0 confirmed, 111 likely roads and 14 likely junctions, all from
one author (drivingtesttips.biz's 14 routes and extended routes; intensivelessons.co.uk copies them). They were read for
names only. The choice: a loop through the town north of the centre (88% on the evidence's roads by name), so that the
eight challenges cover the whole mix 300 m apart. See `ROUTES.md` for what was left out and why.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2500 m, 6 x 6 tiles), the centre's fix applied, then
the scene, 1.5 km square, centred 460 m north-east of the centre to take in the town:

```
python3 -I tools/centres/fetch_osm.py ch.osm 51.38465 -0.50943 2500 6 --patches content/packs/chertsey-london/osm-patches.json
node tools/scenes/build_scene.mjs chertsey-london-route-1 "Chertsey (London)" 51.387794 -0.505112 750 ch.osm 51.383949,-0.509977 51.383662,-0.510265 162180659,162180630
```

## 4. Plan the line, probe it, script the road users

As Wood Green: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts, mini-roundabouts, parked cars and street furniture by metres along it, and each road user's path planned
on the scene's roads the same way, from a start pose through points (the white car's run on along Hanworth Lane is its
centreline offset into the near lane, `tools/scenes/lane_path.py`, as the planner stops a path just past its last
junction). The cyclist's path is the car's own way, eased 1.9 m out to the right round the pull-up. What the map and the
plan changed:

- **The way in** is unnamed and 61 m, so the planner would not turn into it: named in `osm-patches.json`.
- **Bell Bridge Road's crossing lights** have no crossing drawn (the crossing node is at a way's end), and are 90 m
  from The Knoll roundabout and 300 m from the Pyrcroft Road roundabout: driven through. The crossing is Heriot Road's.
- **The Curfew Bell Road mini-roundabout** was chosen over the Heriot Road and London Street ones: its arm on the right
  (Guildford Street) has traffic crossing the car's way; at the Heriot Road one nothing comes from the right.
- **The blue car at the slip** comes down Bell Bridge Road through its crossing lights, held green for it while the
  challenge is in hand (`lights`, `lightsAll`), so a red cannot hold it short of its moment.
- **The pull-up** was put 28 m short of Fairway, so that its direction comes 300 m after the Pound Road turn's and the
  car still has room to slow from the moving pause.

Every road user a pause waits for is set going as the direction is given and paced by the runner to meet the car.

## 5. Check it

The planned line checked on its own (not driven): street furniture: a signal post on the kerb at the Pyrcroft Road
lights came 0.5 m from the car's side, so the line is kept 0.4 m right there (`shifts`). A post on the splitter island
leaving the Eastworth Road roundabout for Victory Road came about 0.2 m from the car's side on the planned line; kept
0.5 m and then 0.2 m left, the driven car (running inside the bend) went on to the footway on the left. Left as
planned it drove clean without traffic, but the shared drive test with traffic (patterns 4 and 14) put it on the
footway there both times. The way back was moved off that roundabout to Queen Street (Eastworth Road, left into Queen
Street, right on to Station Road).

Headless drives, before the shared drive test (`/tmp` script on `tests/unit/decisionDrive.ts`): with the right answers
every pause came as depicted, the car stopped where the pauses are (each within 0.3 m), the cyclist 2.5 m from the car
centre to centre, nothing hit, no red run.

The shared drive test, tuning from each run:

| Found | Fix |
|---|---|
| With traffic (patterns 4 and 14), the car went on to the footway on the left leaving the Eastworth Road roundabout for Victory Road | Back by Queen Street instead |
| Pattern 14: a car coming out of the London Street mini-roundabout met the car face to face where Heriot Road's one-way pair joins; and a car on Station Road and the car, at the end of Queen Street, waited for each other for a minute | Kept quiet: Heriot Road on to the mini-roundabout (`quietUntil` on the Heriot Road crossing), and the end of Queen Street (`quietUntil` on the move-off) |
| Pattern 4: a car coming round the tight Station Road / Guildford Road corner held the car there 100 s; patterns 14 and Skip ahead: a car on Bridge Road still coming to the Pound Road turn when it came | The corner added to the move-off's quiet stretch; Bridge Road kept quiet from the Heriot Road crossing until the car waits at the turn |
| Pattern 14: the car following the grey car had come out of Willow Walk, whose mouth on Bridge Road was not kept quiet | Willow Walk's mouth added |

Then all 6 pass.

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (a button in `sim/index.html`, the sources in `public/legal/credits.html`) are listed
in the build report; every direction used already has a voice clip on another route.
