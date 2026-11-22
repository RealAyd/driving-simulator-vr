# How the Northampton route was built

Batch 5, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the batch 4 routes
(`../kettering/HOW_WE_BUILT_IT.md`, `../upton/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7):
the evidence pointed to roads and junctions; the route was chosen for what it teaches and for what the engine can drive
as depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

The evidence file gives the Gladstone Business Centre, Gladstone Road, Northampton NN5 7QA, from DVSA's centre data as
quoted on passrates.uk (captured May 2026; 12,825 tests in 2024-25, so open), matched by drivingtesttips.biz's centre
page and driveJohnson's Northampton page. gov.uk's centre finder could not be reached from this machine: *to recheck on
the gov.uk centre finder*. The position we were given is on Gladstone Road at NN5 7QA. In OpenStreetMap the business
centre (node 4570862590, addressed to Heathfield Way) is among units reached by a service road (way 8384691) off
Heathfield Way, 25 m from where Heathfield Way meets Gladstone Road; every free route list starts "DTC left, Heathfield
Way, end of road", which fits it. The service road was added to the scene by its id. The route starts on it beside the
units, facing out. Pass 1's other addresses (St James Mill Road; Crown Way, Moulton Park) are not borne out.

## 2. Read the evidence, then choose

`content/sources/pass2/northampton-evidence.json`: Gladstone Road and the Mill Lane roundabout confirmed (the route
lists, and a local instructor's tip on driveJohnson's page about leaving the centre: right on to Gladstone Road, then
the roundabout towards Kingsthorpe); about 80 likely roads and 11 likely junctions from one route-list publisher
(drivingtesttips.biz, routes 1 to 10; intensivelessons.co.uk carries the same text, counted once). Unlike Kettering's,
these lists start and end at the current centre. They were read for road and junction names only; the route copies
none of them. One stretch (Warren Road, Dallington Road, Merthyr Road) coincides with a list because those streets join
only that way.

The choice: right out on to Gladstone Road as the tip describes, the Mill Lane roundabout's first exit, Mill Lane with
its signal crossing to the Harlestone Road roundabout, Harlestone Road, Warren Road, Dallington Road and Merthyr Road
(the pull-up), and back by Gladstone Road with a right turn into Heathfield Way (95% of 3.1 km on the evidence's roads,
5 of 8 challenges at known junctions).

What the map changed:

- **The way back ends on Heathfield Way**, about 30 m past the centre's way in: the planner runs a route on 80 m past
  its last junction. The start is set 45 m into the way in, away from the stretch of Heathfield Way driven at the end,
  so no point is matched to the wrong end of the drive. The way in has no name on the map, but the planner never turns
  into it, so it keeps none (the owner's rule names a way in "Driving Test Centre" only where the planner needs it).
- **No mini-roundabout in reach** (the nearest is inside the Brookside Meadows estate, 650 m west, named by no source):
  the Harlestone Road roundabout, a small one the lists use, takes its place (`ROUTES.md`).
- **No junction lights in reach** on the loop: the lights are the signal crossing on Mill Lane by Glebeland Road, met on
  red with someone on it, as Kettering's.
- **The Mill Lane roundabout** is mapped as a one-way loop without the roundabout tag: the engine finds it as a ring all
  the same. A toucan crossing just past its Mill Lane exit is held green during challenge 2 (`lights`).

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2500 m, 6 x 6 tiles), then the scene from it, 1.3 km
square centred 210 m west and 375 m south of the centre's position, so the Harlestone Road roundabout and Warren Road
are inside (no map fixes were needed):

```
python3 -I tools/centres/fetch_osm.py northampton.osm 52.25327 -0.91594 2500 6
node tools/scenes/build_scene.mjs northampton-route-1 "Northampton" 52.24990 -0.91902 650 northampton.osm 52.251824,-0.912418 52.251698,-0.912902 8384691
```

## 4. Plan the line, probe it, script the road users

As Kettering: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts, side roads and parked cars by metres along it, and each road user's path planned on the scene's roads
(a planned path ends 80 m into the road of its last point, so each was planned through a point beyond, then cut), the
cyclist's eased round the car pulled up. Each give way stop is 3 m short of where the way meets the road it joins (the
car's half-length and a margin); the crossing's stop is where the car stops for the red. Every road user a pause waits
for is set going from close in, as the car comes, with enough path to be paced to its point.

## 5. Drive it headless

`ROUTES=northampton-1 npx vitest run tests/unit/decisionDrive.centre.test.ts` (results in `ROUTES.md`). Tuning from the
first runs:

| Found | Fix |
|---|---|
| Turning left out of the way in on to Heathfield Way, the car cut the corner on to the footway | The way moved 0.8 m right along the way in (`shifts`) |
| Into the Merthyr Road roundabout, the car's box caught the bollard on the splitter island's nose (0.6 m from its line) | The way moved 1.45 m left past the bollard, then 0.6 m right round the kerb on the corner into the ring |
| Off that roundabout on to Gladstone Road, the car cut the kerb on the left, and moved right it caught the next splitter's bollard | The way moved 0.8 m in towards the island on the ring's west side, so the car swings into the exit from inside |
| With traffic (pattern 14), a car waiting to come out of Warren Road stood nose to nose with the car turning in; with pattern 4, a car coming down Warren Road crept past the car within 0.2 m (the road is narrow, with cars parked along the car's side) | Warren Road kept clear of background traffic from the Harlestone Road roundabout until the car is out of it at Dallington Road (`quietUntil` and `quiet` on challenge 4, `quiet` on challenge 5), as the batch 4 estates were |

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (a button in `sim/index.html`, the sources in `public/legal/credits.html`, a voice
clip for the new first direction) are listed in the build report.
