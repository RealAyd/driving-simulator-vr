# How the Upton route was built

Batch 4, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the batch 3 routes
(`../tottenham/HOW_WE_BUILT_IT.md`, `../chesterfield/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md`
section 7): the evidence pointed to roads and junctions; the route was chosen for what it teaches and for what the
engine can drive as depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

The evidence file gives Arrowe Park Road, Upton, CH49 0UF, from DVSA's centre data as quoted on passrates.uk (10,893
tests in 2024-25, so open) and drivingtesttips.biz's centre page; gov.uk's centre finder could not be reached from this
machine: *to recheck on the gov.uk centre finder*. The postcode lies 55 m from the position we were given. In
OpenStreetMap a building named "Driving Test Centre" stands on the west side of Arrowe Park Road (A551), with a 48 m
service road (way 888517464) running west off Arrowe Park Road beside it, opposite Leeswood Road. The service road was
added to the scene by its id. The route starts on it, facing Arrowe Park Road, and ends at its west end.

## 2. Read the evidence, then choose

`content/sources/pass2/upton-evidence.json`: 0 confirmed and 21 likely places. Two route-list sites carry the same old
DVSA routes (counted once); they all leave left on to Arrowe Park Road, which fits the current site. A Wirral
instructor's blog (2010 to 2011) names the Sainsbury's roundabout and a busy roundabout between Greasby and Upton from
pupils' Upton tests: taken to be the Upton roundabout (Sainsbury's store and petrol station on its south-west arm) and
the Greasby Road roundabout on the Upton Bypass. The lists were read for road and junction names only; the route
copies none of them. The first stretch coincides with a listed route because the roads force it (left out, the Upton
roundabout on to the Upton Bypass, the Greasby Road roundabout into Old Greasby Road).

The choice: west by the Upton Bypass to the Greasby Road roundabout, back by Old Greasby Road and the Arrowe Park Road
lights, east along Upton Road, and round by Houghton Road and Leeswood Road to the centre (69% of the length on the
evidence's roads, 5 of 8 challenges at known junctions).

What the map changed:

- **The Upton roundabout is 160 m from the way out**, and the way in is 170 m beyond it the other way: it cannot be a
  challenge at the start or the end (the 300 m spacing). It is challenge 4, from the north, between the lights and
  Upton Road; at the start it is driven through on its other side.
- **No mini-roundabout** within 1.4 km. The small Leeswood Road roundabout (a ring about 15 m across) is 180 m past the
  Houghton Road lights: driven through.
- **The pull-up** has to be 300 m from the lights before it and from the end of Leeswood Road after it: the straight
  between Kiln Road and Big Meadow Road is the one place, with no car parked near on either kerb.
- **Ending opposite the centre.** Leeswood Road meets Arrowe Park Road 25 m south of the centre's way out: a right turn
  out (the eighth challenge), then a left turn in, planned and driven as one.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2000 m, 6 x 6 tiles), then the scene from it, 2 km
square, centred north-east of the centre to take in the Greasby Road roundabout and the Houghton Road lights (no map
fixes were needed):

```
python3 -I tools/centres/fetch_osm.py upton.osm 53.37939 -3.09857 2000 6
node tools/scenes/build_scene.mjs upton-route-1 "Upton" 53.381636 -3.096311 1000 upton.osm 53.379246,-3.098615 53.379255,-3.098118 888517464
```

## 4. Plan the line, probe it, script the road users

As Tottenham and Chesterfield: the car's way planned through points on the scene's roads, a probe listing stop lines,
crossings, roundabouts and parked cars by metres along it, and each road user's path planned on the scene's roads. The
blue car on Upton Road, which only goes along it, is Upton Road's centreline offset into its left lane
(`tools/scenes/lane_path.py`). Every road user a pause waits for is set going from close in, as the car comes to its
stop, and each path starts about 45 m short of its moment. The line is pulled 0.5 m in to the kerb for the stop on Leeswood
Road, where the cyclist passes 3 m off the car's middle.

## 5. Drive it headless

`ROUTES=upton-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: the authoring rules, and the route driven
with the right answers, with traffic (patterns 4 and 14) and with Skip ahead. Tuning, each step checked with a single
drive without traffic (`decisionDrive.ts`'s `drive`, under a minute):

| Found | Fix |
|---|---|
| All four drives: the car on the pavement leaving the small Leeswood Road roundabout west (its exit swings north, then sharply west into a lane about 3 m wide) | The line kept 1.6 m right round the corner, 1.4 m left past the splitter bollard, 0.8 m right again along the lane (`shifts`, chosen by measuring the planned line's room to the kerb corner, the bollard and both kerbs) |
| The car touched the splitter bollard at the roundabout's Houghton Road entry (the entry lane about 2.5 m wide, a car parked at the kerb 20 m before it) | The line kept 0.65 m right past the parked car, then 0.8 m left past the bollard |


## Still to do

After the tuning all six checks pass. Still to do: played in the app and every paused picture checked (camera angles are first choices),
then staging and the owner's drive. Shared changes for the app (a button in `sim/index.html`, the voice clip check for
the directions, the sources in `public/legal/credits.html`) are listed in the build report.
