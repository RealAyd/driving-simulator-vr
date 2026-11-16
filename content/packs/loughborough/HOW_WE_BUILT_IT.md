# How the Loughborough route was built

Loughborough is a batch 2 centre. It was built by the steps in `../../../tools/centres/README.md` and the brief
(`../BATCH_BUILD_BRIEF.md`), with the Morden pilot (`../morden-london/`) as the model. Judgement came first: the
evidence pointed to roads and junctions, and the route was chosen for what it teaches and for what the engine can drive
as depicted. Two routes were built; the owner then settled on one route per centre, and route 1 was kept (`ROUTES.md`,
"One route").

## 1. Find the centre as it is now

The evidence file gives the Ark Business Centre, Gordon Road, LE11 1JP, by the station. That comes from three listings
and DVSA open data, checked 15 November 2026; gov.uk itself was not reachable. OpenStreetMap has a "Loughborough
Driving Test Centre" point (node 2555963576) beside the Ark Business Centre, on a small service loop (way 4337258) at
the end of Gordon Road. Gordon Road is a short unclassified road off Station Boulevard, the A6004 link from Meadow Lane
to the station, opened after the route lists were written. The route starts on the service loop, facing its way out,
and finishes on Gordon Road. The service loop is added to the scene by its id.

## 2. Read the evidence, then choose

The evidence file (`content/sources/pass2/loughborough-evidence.json`) holds 1 confirmed place and 131 likely ones.
- The confirmed place is the Barrow upon Soar one-way system, 5 km away.
- Almost all the likely places come from one family of route lists written for the old centre on Pinfold Gate. The two
  sites that publish them (s1, s2) count as one source.
- These lists count as evidence for roads further out, never for leaving and returning.
- The route copies no route list: the sources were read for road and junction names only.

What the map and the evidence gave:

- **The known junctions are all roundabouts, and only three are within reach.** They are the Forest Road roundabout
  on Epinal Way (the evidence's "Epinal Way roundabouts"), the Beacon Road roundabout and the Park Road roundabout,
  2.2 to 2.5 km south of the centre. The evidence records the roads' positions, not the junctions'; the checker places
  each on the nearest roundabout in the scene. The route goes south to use all three.
- **The others cannot be matched.**
  - "Warwick Way roundabout" and "Derby Road roundabout" are recorded 300 m or more from any roundabout.
  - "Forest Road roundabout" is recorded on Forest Road, 500 m from the Forest Road roundabout.
  - Ling Road, Ashby Road, Barrow Road, Leicester Road, Farley Way and One Ash are outside any scene that also holds
    the centre.
- **Leaving and returning are judgement only.** Station Boulevard and Gordon Road are in no source. The route turns
  right out of Gordon Road, towards the station.
- **The way back.**
  - First version: through Pinfold Gate and Aumberry Gap on to Jubilee Way. The car cut that hairpin on to the
    footway.
  - Second version: by Barrow Street and Jubilee Way to Baxter Gate. The planned line cut through Baxter Gate's short
    link across Jubilee Way's central reservation.
  - Now: back the way it went out, by Leicester Road, King Street and Queen's Road. The line is moved 0.6 m off the
    kerb where it turns right out of Woodgate.

## 3. Build the scene

One OpenStreetMap download was made, in 25 tiles round 52.775, -1.205 (2.2 km half-size), and the scene was built
from it. No fixes to the map were needed (no `osm-patches.json`).

```
python3 -I tools/centres/fetch_osm.py <scratch>/wide.osm 52.775 -1.205 2200 5
node tools/scenes/build_scene.mjs loughborough-route-1 "Loughborough" 52.77001 -1.20749 1350 <scratch>/wide.osm 52.780682,-1.201156 52.780539,-1.201075 4337258
```

The scene is 2.7 km square (half-size 1350), larger than the pilots' 2.4 to 2.5 km: it must hold the centre and the
three southern roundabouts.

## 4. Plan the line, probe it, script the road users

The method is Morden's:
- The car's way is planned through points on the scene's roads (decisionPath), with parked cars eased round.
- A probe lists the stop lines, crossings, mini-roundabouts, junctions and parked cars along the way, by metres.
- Each road user's path is planned on the scene's roads. The cyclist on Park Road is given room round the car where
  it passes it pulled up.
- The pull-up is on Park Road between Charnwood Road and Herrick Road: no car is parked there, and no junction is
  within 50 m on either side.
- A margin check measures each planned point's distance to the kerb on either side. A line within half a metre of
  the kerb is moved over (`shifts`).

Two choices keep the paused pictures right however long the car takes to get there:
- **Stopped at the line where the hazard comes from the right.** Every such junction decision is taken with the car
  stopped at the line, so a road user that is late only makes the car wait.
- **Started early, at speed 8 m/s.** Road users are set going well before they are needed, and pacing holds them back.
  Pacing slows a road user to no less than 0.4 of its speed while it holds it 4 m short of its mark. At 9 m/s that
  floor is too fast to stop within those 4 m, so the road user slid past its mark. At 8 m/s it stops in time.

## 5. Drive it headless

`ROUTES=loughborough-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`. Tuning on the way:

| Found | Fix |
|---|---|
| Leaving, the blue car out of the lights had gone by before its moment: only the road user of the stage in hand is paced | Set going as the car comes to the line |
| Still past its mark, by about 17 m: at 9 m/s, slowed to its least, a paced road user cannot stop within the 4 m it is held short | The cars a pause waits for at 8 m/s, not 9 |
| The way back cut the Aumberry Gap hairpin on to the footway | Back by Leicester Road, King Street and Queen's Road |
| With traffic (pattern 4) the car stood for good behind the red car on Park Road, by Burton Street, where that car was turning off | The red car's path ends short of Burton Street |
| The cyclist on Park Road planned its way by Charnwood Road | A point on Park Road before Herrick Road |
| The first pull-up spot on Park Road was opposite Charnwood Road | Moved 70 m on |

Results: see the build report.

## Still to do

- Play the route in the app, and screenshot and check every paused picture (the camera angles are first choices).
- Then staging and the owner's drive.
- Shared changes needed before the route goes in the app:
  - a button in `sim/index.html`;
  - the voice clips for the new directions (`node tools/voice/make_voice.mjs`);
  - the sources listed in `public/legal/credits.html`.
