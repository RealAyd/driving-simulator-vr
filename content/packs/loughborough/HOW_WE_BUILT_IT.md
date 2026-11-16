# How the Loughborough routes were built

A batch 2 centre, built by the steps in `../../../tools/centres/README.md` and the brief
(`../BATCH_BUILD_BRIEF.md`), with the Morden pilot (`../morden-london/`) as the model. Judgement first: the evidence
pointed to roads and junctions; the routes were chosen for what they teach and for what the engine can drive as
depicted.

## 1. Find the centre as it is now

The evidence file gives the Ark Business Centre, Gordon Road, LE11 1JP, by the station (three listings and DVSA open
data, checked 15 November 2026; gov.uk itself was not reachable). OpenStreetMap has a "Loughborough Driving Test
Centre" point (node 2555963576) beside the Ark Business Centre, on a small service loop (way 4337258) at the end of
Gordon Road. Gordon Road is a short unclassified road off Station Boulevard (the A6004 link from Meadow Lane to the
station, opened after the route lists were written). Both routes start on the service loop, facing its way out, and
finish on Gordon Road. The service loop is added to both scenes by its id.

## 2. Read the evidence, then choose

`content/sources/pass2/loughborough-evidence.json`: 1 confirmed place (the Barrow upon Soar one-way system, 5 km away)
and 131 likely ones, almost all from one route-list family written for the old centre on Pinfold Gate (s1, s2 count
once). It counts for roads further out, never for leaving and returning. Neither route copies a route list; the
sources were read for road and junction names only.

What the map and the evidence gave:

- **The known junctions are all roundabouts, and only three are within reach**: the Forest Road roundabout on Epinal
  Way (the evidence's "Epinal Way roundabouts"), the Beacon Road roundabout and the Park Road roundabout, 2.2 to 2.5 km
  south of the centre. Their positions in the evidence are the roads' positions, not the junctions'; the checker
  places them on the nearest roundabout in the scene. Route 1 goes south to use all three.
- **The others cannot be matched**: "Warwick Way roundabout" and "Derby Road roundabout" are recorded at points 300 m
  and more from any roundabout, so the checker cannot place them; "Forest Road roundabout" is recorded on Forest Road
  500 m from the Forest Road roundabout; Ling Road, Ashby Road, Barrow Road, Leicester Road, Farley Way and One Ash are
  outside a scene that holds the centre.
- **Leaving and returning are judgement only.** Station Boulevard and Gordon Road are in no source. The routes leave
  in opposite directions from the end of Gordon Road: route 1 right, towards the station; route 2 left, towards the
  Meadow Lane lights.
- **Bishop Meadow roundabout** (route 2's way to Bishop Meadow Road) has traffic lights on its ring: it is driven
  through, not used as a challenge; the mini-roundabout 250 m on is the challenge there.
- **Route 1's way back** first ran through Pinfold Gate and Aumberry Gap on to Jubilee Way (a hairpin the car cut on
  to the footway), then by Barrow Street and Jubilee Way to Baxter Gate (whose short link across Jubilee Way's central
  reservation the planned line cut through). It now comes back the way it went out, by Leicester Road, King Street and
  Queen's Road.
- **The one-way square at the North Road lights** (route 2 in and out) and the Woodgate corner (route 1's way back):
  the planned line ran within half a metre of the kerb, and the car went over it; the line is moved over there
  (`shifts`), measured with a margin check of each point's distance to the kerb either side.

## 3. Build the scenes

One OpenStreetMap download for both, in 25 tiles round 52.775, -1.205 (2.2 km half-size), then one scene per route.
No fixes to the map were needed (no `osm-patches.json`).

```
python3 -I tools/centres/fetch_osm.py <scratch>/wide.osm 52.775 -1.205 2200 5
node tools/scenes/build_scene.mjs loughborough-route-1 "Loughborough" 52.77001 -1.20749 1350 <scratch>/wide.osm 52.780682,-1.201156 52.780539,-1.201075 4337258
node tools/scenes/build_scene.mjs loughborough-route-2 "Loughborough" 52.780206 -1.216995 1250 <scratch>/wide.osm 52.780682,-1.201156 52.780539,-1.201075 4337258
```

Route 1's scene is 2.7 km square (half-size 1350, larger than the pilots' 2.4 to 2.5 km): it must hold the centre and
the three southern roundabouts.

## 4. Plan the line, probe it, script the road users

As Morden: the car's way planned through points on the scene's roads (decisionPath, parked cars eased round), a probe
listing stop lines, crossings, mini-roundabouts, junctions and parked cars along it by metres, and each road user's
path planned on the scene's roads, given room round the car where it passes it pulled up (the cyclist on Park Road,
the van on Belton Road). Pull-ups are where no car is parked and no junction is within 50 m on either side (Park Road
between Charnwood Road and Herrick Road; Belton Road between Bottleacre Lane and Stanford Hill). Every junction pause
where the hazard comes from the right is taken stopped at the line, so a road user that is late only makes the car
wait; the on-the-move decisions (the lights approaches, the zebra, the right turns) have their road user set going
well before, so pacing can hold it back but never needs to hurry it.

## 5. Drive it headless

`ROUTES=loughborough-N npx vitest run tests/unit/decisionDrive.centre.test.ts`. Tuning on the way:

| Found | Fix |
|---|---|
| Leaving (route 1), the blue car out of the lights went by before the white car from the right had passed: only the stage in hand's road user is paced | Set the blue car going as the car comes to the line |
| Route 1's way back cut the Aumberry Gap hairpin on to the footway | Back by Leicester Road, King Street and Queen's Road |
| Route 2 went over the kerb in the one-way square at the North Road lights | The line moved 0.4 to 0.6 m off the kerb there |
| Route 2's last challenge: held 45 s at red at the North Road lights, the blue car from the station had already passed | The blue car set going once the car is through the lights, from nearer |
| The cyclist on Park Road planned its way by Charnwood Road | A point on Park Road before Herrick Road |
| The first pull-up spot on Park Road was opposite Charnwood Road | Moved 70 m on |

## Still to do

Played in the app and every paused picture screenshotted and checked (camera angles are first choices), then staging
and the owner's drive. Shared changes needed before the routes go in the app: a button in `sim/index.html`, the voice
clips for new directions (`node tools/voice/make_voice.mjs`), the sources in `public/legal/credits.html`.
