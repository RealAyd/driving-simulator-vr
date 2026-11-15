# How the Morden (London) routes were built

The first pilot centre built from the template rules (`../ROUTE_TEMPLATE_RULES.md`) and the evidence plan
(`../EVIDENCE_PLAN.md`), by the steps Brentwood and Chelmsford set (`../chelmsford/HOW_WE_BUILT_IT.md`). Judgement
first: the evidence pointed to roads and junctions; the routes were chosen for what they teach and for what the
engine can drive as depicted.

## 1. Find the centre as it is now

gov.uk gives 10 Tudor Drive, SM4 4PE (checked 15 November 2026). OpenStreetMap has a "Driving Test Centre" point at
that address, on a service road behind the Tudor Drive shops by the Tudor Drive / Epsom Road / Stonecot Hill / Sutton
Common Road lights. The service road is not a normal road in the map: it was added to both scenes by its id
(732142556), as Brentwood's way in was. Both routes start on it, facing Tudor Drive.

## 2. Read the evidence, then choose

`content/sources/pass2/morden-london-evidence.json`: 3 confirmed and 25 likely roads, almost all from one undated
route-list site (s1), a learner's 2024 post (s2) and a lesson-areas page (s3). The route lists were read for road and
junction names only; neither route copies one. Two short sequences coincide with a published list, because they are
the natural way through (route 2's Beverley roundabout, Grand Drive, right at the lights into Cannon Hill Lane); the
routes as a whole are our own.

What the map changed:

- **Rosehill Roundabout** (confirmed, and the learner's post is about it) is a signal-controlled gyratory. In the
  scene it is a set of one-way roads with lights, not a roundabout, and the Green Lane dual carriageway's crossings
  (Love Lane, Glastonbury Road) cross one carriageway mid-way with no junction. A drive there would pass traffic that
  does not know it is there. Left out; route 1 goes south instead (Glastonbury Road, Reigate Avenue).
- **The route back to the centre.** The planner matches a route's points within 20 m, and the service road runs
  within 20 m of Tudor Drive and the lights: a drive meant to end in it ended on Epsom Road instead. Route 1 comes
  back down Epsom Road and turns right into the service road's east end (a right turn across traffic out of the
  lights: a challenge in itself); route 2 finishes on Tudor Drive at the way out.
- **Triggers near the start.** Route 1's way back runs along the service road it starts on, so a point there can be
  matched to the end of the drive: its first challenge's direction and road user start on Tudor Drive, after the car
  has turned out.
- **Emerging, which way.** Glastonbury Road on to Reigate Avenue is a right turn and Elm Road West on to Epsom Road a
  left turn (checked by heading along the planned line), so route 1 has both.

Each route was chosen for variety in the eight and for the known junctions: route 1 the Tudor Drive lights (going
ahead, with a late pedestrian), the Forest Road mini-roundabout, Reigate Avenue (40 mph), a zebra, the A24, and the
turn into the centre across oncoming traffic; route 2 the right turn out of the centre (traffic both ways), the Tudor
Drive zebra, the Beverley roundabout, the Cannon Hill Lane lights, the Camborne Road mini-roundabout and Hillcross
Avenue.

## 3. Build the scenes

One scene per route, 2.4 km square: `morden-route-1` centred east of the centre (51.38748, -0.20066),
`morden-route-2` north-west (51.39089, -0.21858). The OpenStreetMap download was too large for one API call: 16
tiles, merged, then three fixes to the downloaded data (each documented in `ROUTES.md`): the Beverley roundabout's
island building untagged (the roundabout finder rejects a ring round a building), the Tudor Drive approach's signal
moved on to the approach (it had no stop line), and the B278's short unnamed ways north of Green Lane named Green Lane
(the planner will not route through short unnamed ways).

```
node tools/scenes/build_scene.mjs morden-route-1 "Morden" 51.38748 -0.20066 1200 morden.osm 51.38614,-0.21170 51.38610,-0.21200 732142556
node tools/scenes/build_scene.mjs morden-route-2 "Morden" 51.39089 -0.21858 1200 morden.osm 51.38614,-0.21170 51.38610,-0.21200 732142556
```

## 4. Plan the line, probe it, script the road users

As Brentwood and Chelmsford: the car's way planned through points on the scene's roads (decisionPath, parked cars
eased round), a probe listing stop lines, crossings, mini-roundabouts, give way ends and the parked cars along it by
metres, and each road user's path generated on the scene's roads, given room round the car where it passes it
pulled up. Two things to know:

- A planned road user's path runs only as far as the last junction it decides at: with every point on one road (the
  white van on Hillcross Avenue), the planner turns off at random. That path is the road's own centreline, offset
  into the left lane.
- The pull-ups are where no car is parked on either kerb for 30 m behind and 40 m ahead (Forest Road has none;
  Churston Drive between Thurleston Avenue and Templecombe Way).

## 5. Drive it headless

`tests/unit/decisionDrive.morden-london.test.ts`: both routes with the right answers, without traffic, with 30
background road users in two patterns (4 and 14), and with Skip ahead pressed whenever offered. Tuning on the way:

| Found | Fix |
|---|---|
| The car started off the road, touching a shop | Start on the service road's centreline |
| A zebra's pedestrian never reached the point the picture waits for | That point within 1.5 m of the kerb is where someone on foot may stand and wait: put it a step further on |
| The blue car on Reigate Avenue passed 1.9 m from the car at the line | Stop the car 1.5 m further back |
| The black car on Epsom Road was past its point when the car stopped at the line | Start it later |
| Route 2's "before" decisions came with the car already stopped (the road user late) | Start each road user nearer its point (paths cut), as the car comes |
| The car cut the service road's corner on to the footway | Start route 2 past the corner, at the end of the way out |
| With traffic, the black car at the Beverley roundabout came round early (the car held up behind traffic on the way) | The decision at the line, and the black car set going once the car is there |
| The ridge car, gone round into Morden Way, met a background car where its path ended | End its path just round the first bend |

## Still to do

Played in the app and every paused picture screenshotted and checked (camera angles are first choices), then
staging and the owner's drive. Shared changes needed before the routes go in the app are listed in the build
report: the routes added to `src/decision/routes/index.ts` and `sim/index.html`, the voice clips for new directions,
and the ahead-going challenge ids added to the shared rule test.
