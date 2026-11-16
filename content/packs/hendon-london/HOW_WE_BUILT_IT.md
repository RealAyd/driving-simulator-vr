# How the Hendon (London) route was built

Built from the template rules (`../ROUTE_TEMPLATE_RULES.md`) and the evidence plan (`../EVIDENCE_PLAN.md`) by the
steps in `tools/centres/README.md`, with Morden as the model. Judgement first: the evidence pointed to roads and
junctions; the route was chosen for what it teaches and for what the engine can drive as depicted.

## 1. Find the centre as it is now

The evidence file gives 3 Aviation Drive, Beaufort Park, NW9 5TZ (checked 15 November 2026). OpenStreetMap has a
"DSA Driving Test Centre" point on Aviation Drive, a short residential road off the crossroads of Boulevard Drive,
Beaufort Square and Caversham Road; Caversham Road runs down to Aerodrome Road. The route starts on Aviation Drive
facing that crossroads and finishes back on it.

## 2. Read the evidence, then choose

`content/sources/pass2/hendon-london-evidence.json`: 2 confirmed roads (Watford Way, the A1) and 1 confirmed junction
(Apex Corner), and 69 likely roads and 10 likely junctions, almost all from one old list of DVSA routes (s1, about
2010, copied by s2). The list was read for road and junction names only. Its routes all leave "left" or "right" on to
Aerodrome Road (Caversham Road today); this route does too. Beyond that it follows no listed route: its order
(Greyhound Hill, Church End, The Burroughs, back up Watford Way, round by Grahame Park Way and Heritage Avenue) is our
own.

Two routes were built first (the second west and north, by Colindale Avenue, Booth Road, Lanacre Avenue and Bristol
Avenue); on the owner's decision of one route per centre, the eastern one was kept, as it carries more of the mix
(lights, emerging both ways, a pedestrian crossing) and two of the known junctions, and the right turn into Heritage
Avenue was added to it in place of the Greyhound Hill zebra (the pedestrian crossing now comes at the Aerodrome Road
lights).

Judged against the map:

- **The list's far roads** (Apex Corner, Edgware, Mill Hill, Kingsbury, Temple Fortune, Hendon Central) are 2 to 3 km
  out: left out, as the evidence file advises. The route keeps to the core round the centre: Aerodrome Road, the
  Watford Way lights and the Grahame Park Way roundabout.
- **Five Ways Corner** (A1/A41) is a signal-controlled gyratory of one-way pieces, not a roundabout to the engine (as
  Rosehill at Morden): left out.
- **Right from Aerodrome Road on to Watford Way southbound** is not a movement the junction offers (a slip from
  Greyhound Hill feeds that carriageway, and the list never uses it), so the route goes ahead into Greyhound Hill and
  comes back up Watford Way instead.
- **The Watford Way / The Burroughs / Station Road junction** is a tangle of slips the planner drives through by
  Station Road; it is driven, not used for a challenge.
- **No mini-roundabout**: none on these roads; the Lanacre Avenue ones (named in the evidence) need a second loop
  through Grahame Park. With 8 challenges for 9 kinds, the mini was the one left out.
- **Known junctions.** The evidence file placed its junctions at the middle of a named road ("exact junction node to
  be set when the route is built"): the Aerodrome Road / Watford Way lights and the Grahame Park Way roundabout were
  set to the junctions themselves, so the checker places them where they are.

## 3. Build the scene

`hendon-london-route-1`, 2.4 km square, centred south-east of the centre (51.59195, -0.23218). The map data comes in 9
tiles (`fetch_osm.py`) with three fixes (`osm-patches.json`):

- the 24 m link across Watford Way's central reservation between Aerodrome Road and Greyhound Hill is unnamed, and
  the planner will not route through short unnamed ways: named Aerodrome Road;
- Lismore Boulevard's 10 m stub off Aerodrome Road leads only to a private road (left out of the scene), so background
  cars turned into it and stood parked across its mouth, in the car's lane: the stub dropped;
- Bristol Avenue's 12 m one-way link down on to Grahame Park Way, mapped as one lane beside a contraflow bus lane, was
  drawn 3.2 m wide, too narrow to turn out of (found on the dropped second route): given its two lanes. Kept, so the
  scene is the one the route was driven on.

```
python3 -I tools/centres/fetch_osm.py <scratch>/r1.osm 51.59195 -0.23218 1200 3 --patches content/packs/hendon-london/osm-patches.json
node tools/scenes/build_scene.mjs hendon-london-route-1 "Hendon" 51.59195 -0.23218 1200 <scratch>/r1.osm 51.59612,-0.23991 51.59577,-0.23992
```

## 4. Plan the line, probe it, script the road users

As Morden: the car's way planned through points on the scene's roads (decisionPath), a probe listing stop lines,
crossings, junction discs, give way ends and parked cars along it by metres, and each road user's path generated on
the scene's roads. Things to know:

- The oncoming silver car on Grahame Park Way could not be planned on west past Heritage Avenue (the planner turned
  it in): past there its path is the road's own centreline, offset into the westbound lane.
- The pull-up is where no car is parked within reach: The Burroughs past Egerton Gardens.
- On the Watford Way approach to the Aerodrome Road lights the car's left-turn lane is 3.7 m from the mapped stop
  line's lane point: it is not stopped by those lights, which are held green for it.

## 5. Drive it headless

`ROUTES=hendon-london-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: the route with the right answers,
without traffic, with 30 background road users (patterns 4 and 14), and with Skip ahead. Tuning on the way:

| Found | Fix |
|---|---|
| With traffic, the cyclist on The Burroughs ran into the back of the car still coming to pull up (held up by traffic) | The cyclist brakes for the car (`yields`) |
| The blue car leaving the centre, turning right into Rowan Drive, was clipped by a bus coming the other way, and met a background car where its path ended | It turns left into Canberra Close instead, its path ending just inside |
| With traffic, the car stood 45 to 90 s on Aerodrome Road west of Heritage Avenue behind a background car parked across the mouth of Lismore Boulevard's dead-end stub | The stub dropped (map fix) |
| With traffic, a bus coming down The Burroughs swung wide on the bend into the white van coming up it (Church End) | The van comes along Church Road from the left instead, the way the bus goes |
| (Skip ahead) a background cyclist crossed the white van's path at Church Road's junction east of Church End, where the van started | The van starts past that junction |
| With traffic, a car on Watford Way's southbound carriageway went through the Aerodrome Road junction on the same green while the car turned left | That carriageway left out of the challenge's quiet circles: it is not the car's hazard |
| With traffic, the car touched the bollard on the Heritage Avenue roundabout's splitter island (its line 0.9 m from it) | The line kept 0.4 m further left down Heritage Avenue |
| The roundabout instruction was given 125 m out: traffic kept off the roundabout from 150 m before that | Said 45 m out, as Beverley at Morden |
| The oncoming silver car (Heritage Avenue) reached its point with the car already stopped to wait | Set going earlier |

## Still to do

Played in the app and every paused picture screenshotted and checked (camera angles are first choices), then
staging and the owner's drive.
