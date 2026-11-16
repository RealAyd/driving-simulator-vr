# How the Chesterfield route was built

Batch 2, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Isleworth (Fleming
Way) route (`../isleworth-fleming-way/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the
evidence pointed to roads and junctions; the route was chosen for what it teaches and for what the engine can drive as
depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

gov.uk's centre finder (searched by postcode S41 7LT, 16 November 2026) gives the Bus Garage, Approach Road,
Stonegravels, Chesterfield S41 7LT; its map pin is about 30 m from the position we were given. In OpenStreetMap
Approach Road is an unnamed service road (way 98830428) running west off Sheffield Road (B6057) past the Stagecoach
depot, with a point for the centre on it (mislabelled "DVLA Test Centre"). The service road is not a normal road in the
map: it was added to the scene by its id, as Isleworth's and Morden's were. The route starts on it 90 m in from
Sheffield Road, facing it, and finishes 13 m east of the start, so the way back never passes the start point (a point
passed twice is matched to the wrong end of the drive; Morden found the same).

## 2. Read the evidence, then choose

`content/sources/pass2/chesterfield-evidence.json`: 0 confirmed and 112 likely roads plus 10 likely junctions, all from
one route-list publisher (drivingtesttips.biz, routes 1 to 14, 11 to 14 added 2019; intensivelessons.co.uk copies it word
for word; motorcycletesttips.uk, in the same format, counted with it). Every listed route leaves and returns by
Sheffield Road at Stonegravels, which fits the current site. The lists were read for road and junction names only; the
route copies none of them. Two short stretches coincide with listed routes because the roads force them: left out of
the centre and north up Sheffield Road to the roundabout, then Peveril Road to Highfield Lane.

The choice: north and west, by Sheffield Road, Peveril Road, Highfield Lane, Newbold Road and Tapton View Road, back
down Sheffield Road (96% of the length on the evidence's roads). Its eight take the whole mix: the way out (emerging
left), the Sheffield Road roundabout (first exit), the signal crossing on Highfield Lane (the traffic lights and the
crossing in one), the Highfield Lane / Newbold Road mini-roundabout, the pull-up and move-off on Tapton View Road, out of
Tapton View Road on to Sheffield Road (emerging right) and the right turn into Approach Road across Sheffield Road.

What the map changed:

- **No signal junction in reach of a loop.** The signals near the centre are pedestrian crossings (two on Sheffield
  Road, one on Highfield Lane), the Ernie Moss Way junctions by the stadium and the signal-controlled A61 / Lockoford
  Lane roundabout (trunk road). The stadium junction is 200 m past the roundabout, too close for both to be challenges,
  and the A61 is left out as trunk road. The Highfield Lane crossing gives the lights: met on red with someone on it.
- **The first version's pull-up** was on Gloucester Road (the evidence's route by Mansfeldt Road and Lucas Road). The
  scene parks cars along most of Gloucester Road's far kerb, leaving no room for a cyclist to pass a car at the kerb,
  so the route goes on along Highfield Lane to Newbold Road and Tapton View Road, which have none.
- **Hazlehurst Lane and Peveril Road mini-roundabouts** are driven through: the first is 130 m from the way out, the
  second 300 m short of the Highfield Lane crossing (the spacing rule); the Newbold Road one takes the mini-roundabout.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2000 m, 6 x 6 tiles), then the scene from it, 2 km
square round the route (no map fixes were needed):

```
python3 -I tools/centres/fetch_osm.py chesterfield.osm 53.24456 -1.42578 2000 6
node tools/scenes/build_scene.mjs chesterfield-route-1 "Chesterfield" 53.24860 -1.43358 1000 chesterfield.osm 53.24449,-1.42758 53.24451,-1.42668 98830428
```

## 4. Plan the line, probe it, script the road users

As Isleworth: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts and side roads by metres along it, and each road user's path planned on the scene's roads. The blue car on
Sheffield Road at Tapton View Road is Sheffield Road's centreline offset into its left lane (a planned path turned off
into Tapton View Road). Every road user a pause waits for is set going from close in, as the car comes to its stop
(the decision at the line is taken stopped there), and each path ends soon after its moment. The pull-up is on the
straight of Tapton View Road between Gloucester Avenue and Highfield View Road, where no car is parked; the cyclist then
turns left into Highfield View Road.

## 5. Drive it headless

`ROUTES=chesterfield-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: the authoring rules ("as authored")
pass; one drive without traffic was made while building (`decisionDrive.ts`'s `drive`), results in `ROUTES.md`. The
drives with traffic (patterns 4 and 14) and with Skip ahead are run by the main session. Tuning from its first run:

| Found | Fix |
|---|---|
| Pattern 4: a car waiting to come out of Tapton View Road was 0.18 m from the car turning in | The mouth of Tapton View Road kept quiet from the Newbold Road mini-roundabout until the car has turned in (`quietUntil`) |
| Pattern 14: a car waiting at Peveril Road's own entry to the roundabout sat in the roundabout's quiet circle | The circle moved east and trimmed to the ring, clear of that entry (the car waiting there is no part of the decision) |

## Still to do

The drives with traffic and with Skip ahead; played in the app and every paused picture checked (camera angles are
first choices), then staging and the owner's drive. Shared changes for the app (a button in `sim/index.html`, the
sources in `public/legal/credits.html`) are listed in the build report; every direction used already has a voice clip
on another route.
