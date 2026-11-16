# How the Grantham (Somerby) route was built

A batch 2 centre (`../BATCH_BUILD_BRIEF.md`), one route, built by the steps in `tools/centres/README.md` and the
pilots' method (`../morden-london/HOW_WE_BUILT_IT.md`), to the template's rules (`../ROUTE_TEMPLATE_RULES.md`):
judgement first (`../EVIDENCE_PLAN.md` section 7). The route is in `ROUTES.md`.

## 1. Find the centre as it is now

The evidence first gave 52.90194, -0.58734: the NG31 7TX postcode point, at the A52 / B6403 junction at Cold Harbour.
A first build used a site mapped "Vehicle testing Station" 200 m south of it. The owner corrected that (16 November
2026): the centre is on Spitalgate Airfield, near Somerby Hill. On the map the airfield is the former Prince William of
Gloucester Barracks, north of Somerby Hill; every mapped way into it joins Somerby Hill (none joins the B1174, which is
1.5 km west). The route uses the old main gate, a one-way pair (183635670 in, 183635688 out), and the site road behind
it (183635698), built into the scene by id; it starts and ends on that road. The evidence file's `centre_position` and
`owner_check` record this. *To confirm with the owner.*

## 2. Read the evidence, then choose

`content/sources/pass2/grantham-somerby-evidence.json`: 2 confirmed roads (A52 Somerby Hill, the A1), 53 likely roads
and 7 junctions, almost all from one route list for the old Cecil Street centre in the town (s1, repeated by s2), and
an instructor's page on the new centre (s3: the A52, the A1, hill starts). The old-centre list counts for roads further
out, never for leaving and returning; its roads were read for names only and the route copies none of its routes.

From the airfield, Somerby Hill runs west down into the town's east side (the hill s3 names) and east to the Somerby
Hill roundabout. The route takes the whole mix from the roads the evidence names, in one loop:

- **Somerby Hill**: leaving the centre (a right turn on to a 50 mph road), and the pull-up and move-off on the hill.
- **Harrowby Road**: its one set of lights, at Sandon Road, the route list's "Harrowby Road lights", turning right
  across oncoming traffic into Beacon Lane; and its zebra on the way back.
- **New Beacon Road and Harrowby Lane**: the New Beacon Road mini-roundabout, the only roundabout on Harrowby Lane, so
  the route list's "Harrowby Lane roundabout", turning right; round by Uplands Drive, Tennyson Avenue and Shelley
  Avenue, the shortest loop back to Harrowby Lane, emerging left on to it.
- **The Somerby Hill roundabout**: the only large roundabout in reach. Nothing beyond it leads back to the town or the
  airfield, so the route goes all the way round it and back up Somerby Hill. This is the end of the route: the first
  build found the planner will not plan a turn back there in the middle of a 12 km route (its search stops at 12 km).
- Pairs too close to be two challenges: the Harrowby Lane zebra and the mini-roundabout (230 m), Harrowby Road's zebra
  and the Bridge End Road junction (190 m), the Somerby Hill crossing and the hill (150 m).
- The town-centre places (Wharf Road and Barrowby Road roundabouts, Belton Lane and Watergate lights) and the A1 are
  out of reach (`ROUTES.md`).

## 3. Build the scene

The map download (one area 4.1 km square round 52.907105, -0.605211, half-size 2050, in 25 tiles), then the scene, 3.1
km square (half-size 1550, so that it holds the airfield, the town's east side, the mini-roundabout and the Somerby
Hill roundabout):

```
python3 -I tools/centres/fetch_osm.py <scratch>/grantham.osm 52.907105 -0.605211 2050 5
node tools/scenes/build_scene.mjs grantham-somerby-route-1 "Grantham (Somerby)" 52.907779 -0.612656 1550 <scratch>/grantham.osm 52.900143,-0.611852 52.899604,-0.611837 183635698,183635688,183635670
```

No map fixes were needed. (The first build's two, for the B6403 at Harrowby Lane and the vehicle testing site's way
in, went with it.)

## 4. Plan the line, probe it, script the road users

As the pilots: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts and parked cars by metres along it, give way lines worked out from where the car's front comes within a
metre of the main road's edge, and each road user's path planned on the scene's roads from a start through points (the
car pulled up at the kerb given room as a parked car). The red car's path up Somerby Hill is the car's own lane there
(planned on its own, it stopped short at the airfield's way in). Things to know:

- Uplands Drive is one way in the map that loops back on itself: the planner cannot turn from its end into its own
  middle, so the route goes round its south side to Tennyson Avenue.
- The planner searches 12 km at most: a route near that length that cannot be planned may just be too long.
- Planning points must be on the road (within 20 m), and a point near two parallel lanes cannot tell them apart: a
  turn back is made by the roads after it, not by a point on the way back.
- A road user waiting for a moment is safe to start early (it is held short of its point until the car is there); a
  late one is not.

## 5. Drive it headless

`ROUTES=grantham-somerby-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: the route with the right answers,
without traffic, with 30 background road users in two patterns (4 and 14), and with Skip ahead pressed whenever offered.
Tuning on the way (the first build's two routes included, where it applies):

| Found | Fix |
|---|---|
| A road user passing the car pulled up drove through it | Its path re-planned round the car where it really stops |
| A road user at a mini-roundabout, held by a signal crossing just before its point, came late, so an "on the move" decision came with the car stopped | Decisions at junctions with a signal crossing just before them taken at the line, stopped |
| A road user turned into a close ahead of the car on a narrow estate road and met background traffic there: all stood for good | Road users keep off the car's way on narrow roads; the estate roads kept clear of traffic while the car is on them |
| The oncoming car at the Sandon Road lights passed 2.2 m from the car waiting in the junction | The car waits 3 m further back |

## Still to do

Add the route to the home screen (`sim/index.html`) and the sources to `public/legal/credits.html` (shared files, not
touched), record the voice clips (`node tools/voice/make_voice.mjs`), play it in the app and look at every paused
picture, then staging and the owner's drive. Open items are in `ROUTES.md`.
