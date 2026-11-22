# How the Preston route was built

Batch 5, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the batch 4 routes
(`../kettering/HOW_WE_BUILT_IT.md`, `../upton/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7):
the evidence pointed to roads and junctions; the route was chosen for what it teaches and for what the engine can drive
as depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

The evidence file gives Chain Caul Road, Preston PR2 2PD, from DVSA's centre data as quoted on a pass-rate site
(captured May 2026) and matched by two other pages; pass 1 records 11,380 tests, so it is open. gov.uk's centre finder
could not be searched from this machine: *to recheck on the gov.uk centre finder*. OpenStreetMap has the building
itself ("Driving Test Centre", way 252360143) 10 m from the position we were given, on the Riversway docks estate
between Chain Caul Road and Chain Caul Way. The only road mapped to its door is Hardy Close, a named service road (ways
61604649 and 61604644) off Chain Caul Way; nothing is mapped from Chain Caul Road. Both ways were added to the scene by
their ids, and the route starts on Hardy Close beside the building, facing Chain Caul Way. Hardy Close keeps its own
name (the owner's rule of 21 November: only an unnamed way in is named "Driving Test Centre").

## 2. Read the evidence, then choose

`content/sources/pass2/preston-evidence.json`: 0 confirmed and 78 likely roads plus 17 likely junctions, all from one
route-list publisher (drivingtesttips.biz, routes 1 to 10; intensivelessons.co.uk copies it). Every list leaves on
Chain Caul Road and comes back by Chain Caul Way, so they match the current site. The searches for first-hand sources
returned nothing from this machine. The route copies none of the lists: it takes their roads round the docks and
Ashton (Navigation Way and its roundabout, the Pedders Way lights on the A583, Pedders Lane, Egerton Road, Tulketh
Road, Blackpool Road and the Larches estate) in an order of our own.

The choice: right out of Hardy Close, east along Chain Caul Way, the first exit at the Navigation Way roundabout,
north over the A583 at the Pedders Way lights (driven), right into Egerton Road, left out of it on to Tulketh Road,
left at the Blackpool Road lights, west over the Broadway signal crossing, left into Larches Avenue to pull up, then
back by Larches Lane, Whinfield Lane, Pedders Lane, the lights, the roundabout and Chain Caul Way (5.2 km, 96% on the
evidence's roads).

What the map changed:

- **Egerton Road meets Tulketh Road on its bend**: the end of Egerton Road is at the apex, where Tulketh Road turns
  from east to north-west, so the traffic it gives way to comes round the bend from the right. A first plan turned out
  of Hastings Road, 160 m earlier, on to the straight; Egerton Road's own end is a junction the lists name, so it was
  kept.
- **The roundabout and the A583 lights are 150 m apart**, and the end of Chain Caul Way 80 m before the roundabout:
  only one of the three can be a challenge on the way out. The roundabout is; the lights and the end of Chain Caul Way
  are driven.
- **No mini-roundabout in reach**: the only two mapped are on private service roads in the docks.
- **The way back ends on Chain Caul Way**, about 40 m short of Hardy Close: the route planner runs a route on 80 m past
  its last junction, and 80 m into Hardy Close would pass the start again.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2200 m, 6 x 6 tiles), then the scene from it, 1.7 km
square centred 800 m north-east of the centre (no map fixes were needed):

```
python3 -I tools/centres/fetch_osm.py preston.osm 53.7625 -2.737 2200 6
node tools/scenes/build_scene.mjs preston-route-1 "Preston" 53.764602 -2.741636 850 preston.osm 53.760488,-2.752184 53.76073,-2.752478 61604649,61604644
```

## 4. Plan the line, probe it, script the road users

As Kettering: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts, give way ends and parked cars by metres along it, and each road user's path planned on the scene's roads.
The black car at the roundabout and the grey car on Pedders Lane are planned on the roads; the white car on Chain Caul
Way and the blue car on Tulketh Road (round its bend) go along one road only, so each is the road's centreline offset into its left lane
(`tools/scenes/lane_path.py`). The cyclist on Larches Avenue is the road's centreline offset, eased out round the car
at the kerb so it passes 2.9 m from the car's middle. Larches Avenue has cars parked along much of it in the scene: the
pull-up is on the one clear stretch north of Larches Lane, and the car is shifted 0.8 m to the kerb there.

## 5. Drive it headless

`ROUTES=preston-1 npx vitest run tests/unit/decisionDrive.centre.test.ts` (results in `ROUTES.md`). Tuning from the
runs:

| Found | Fix |
|---|---|
| A wheel over the pavement at the tight left corner from Larches Avenue into Larches Lane (offRoad, at (-661.1, -30.0)) | The line moved 0.8 m out (to the right) round the corner (`shifts`) |
| With traffic (pattern 4), the cyclist had passed the car before the move-off's first moment (33 m beyond its point): set going by the pull-up, it caught the car up while traffic held it on Larches Avenue | The cyclist is set going by the move-off, once the car is at the kerb, from 60 m behind it |

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (a button in `sim/index.html`, the sources in `public/legal/credits.html`) are listed
in the build report; every direction used already has a voice clip on another route.
