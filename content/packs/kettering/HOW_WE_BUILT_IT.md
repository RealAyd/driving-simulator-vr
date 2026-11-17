# How the Kettering route was built

Batch 4, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Chesterfield and
Tottenham routes (`../chesterfield/HOW_WE_BUILT_IT.md`, `../tottenham/HOW_WE_BUILT_IT.md`). Judgement first
(`../EVIDENCE_PLAN.md` section 7): the evidence pointed to roads and junctions; the route was chosen for what it teaches
and for what the engine can drive as depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

The evidence file gives Orion Way, Kettering Business Park, NN15 6NL, from DVSA's centre data as quoted on a pass-rate
site (captured May 2026) and matched by three other pages; it ran 8,489 tests in 2024-25, so it is open. gov.uk could
not be opened from this machine: *to recheck on the gov.uk centre finder*. OpenStreetMap has the building itself
("Kettering Driving Test Centre", way 171272698) 2 m from the position we were given, at the south-west end of Orion
Way, with its car park reached by a service road (way 674957827) off Orion Way's bend. The service road was added to the
scene by its id. The route starts on it beside the building, facing Orion Way.

## 2. Read the evidence, then choose

`content/sources/pass2/kettering-evidence.json`: 0 confirmed and 93 likely roads plus 9 likely junctions, almost all
from one route-list publisher (drivingtesttips.biz, routes 1 to 12 and two extended routes; intensivelessons.co.uk
copies it), whose lists all start and end at an older centre on Station Road, by the railway station. So they were not
used for how the route leaves and returns; near the current site they name Orion Way, Pytchley Lane, Pytchley Road and
its roundabouts, and the Patrick Road estate. The route copies none of them; one stretch matches a list because the
estate allows only one loop (in by Patrick Road, round Northumberland Road, out by Sussex Road and Patrick Road).

The choice: out by Orion Way and the A509 roundabout to Pytchley Road, north over the signal crossing, the Patrick Road
estate, then back down Pytchley Road (94% of the length on the evidence's roads). The plan first had the pull-up on
Northumberland Road or Sussex Road; the spacing rule left no room for it there between the right turn into Patrick Road
and the two emerging turns, and both have cars parked opposite, so it moved to Pytchley Road on the way back.

What the map changed:

- **The way back ends on Orion Way**, 80 m short of the centre's way in: the planner runs a route on 80 m past its last
  junction, which on the service road would pass the start again.
- **No mini-roundabout in reach** (the nearest 1 km away or more): the route goes without one (`ROUTES.md`).
- **No junction lights in reach** but at Barton Road and Windmill Avenue (1.5 km north): the lights are the signal
  crossing on Pytchley Road's, met on red with someone on it.
- **The Orion Way roundabout** is 250 m from the way out and 120 m from the A509 roundabout: driven through.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2500 m, 6 x 6 tiles), then the scene from it, 1.6 km
square centred on the centre (no map fixes were needed):

```
python3 -I tools/centres/fetch_osm.py kettering.osm 52.37793 -0.72522 2500 6
node tools/scenes/build_scene.mjs kettering-route-1 "Kettering" 52.37793 -0.72522 800 kettering.osm 52.377822,-0.725102 52.377903,-0.724837 674957827
```

## 4. Plan the line, probe it, script the road users

As Chesterfield: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts and side roads by metres along it, and each road user's path planned on the scene's roads (eased round the
car pulled up, for the cyclist). The white car on Orion Way and the green car on Sussex Road go along one road only, so
each is the road's centreline offset into its left lane (`tools/scenes/lane_path.py`); the green car's is eased over
past a car parked on Sussex Road's last stretch. Each car the car waits for at a line was checked to pass at least 4 m
from the car's nose there. Every road user a pause waits for is set going from close in, as the car comes to its stop,
and each path ends soon after its moment. The estate (Patrick Road, Northumberland Road, Sussex Road) has only one way
out, so background traffic is kept quiet on Patrick Road until the car is round into Northumberland Road, and on Sussex
Road and Patrick Road until the car is back on Pytchley Road (`quietUntil`).

## 5. Drive it headless

`ROUTES=kettering-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: all 6 pass (results in `ROUTES.md`).
Tuning from the first run:

| Found | Fix |
|---|---|
| The drive never finished: at the Pytchley Road crossing the red light stopped the car 1.6 m short of the pause point, and the pedestrian is held at the kerb until the car has arrived (within 1.2 m), so each waited for the other | The crossing's stop moved to where the car stops for the red, (407.2, -81.8) |

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging
and the owner's drive. Shared changes for the app (a button in `sim/index.html`, the sources in
`public/legal/credits.html`) are listed in the build report; every direction used already has a voice clip on another
route.
