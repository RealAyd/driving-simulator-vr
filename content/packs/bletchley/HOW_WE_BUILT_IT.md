# How the Bletchley route was built

Batch 5, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Kettering and
Wood Green routes (`../kettering/HOW_WE_BUILT_IT.md`, `../wood-green-london/HOW_WE_BUILT_IT.md`). Judgement first
(`../EVIDENCE_PLAN.md` section 7): the evidence pointed to roads and junctions; the route was chosen for what it teaches
and for what the engine can drive as depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

DVSA's centre data as quoted by passrates.uk (captured May 2026) gives Block 4, Government Buildings, Wilton Hostel,
Wilton Avenue, Bletchley MK3 6DH; drivingtesttips.biz's centre page gives the same. gov.uk could not be reached from
this machine: *to recheck on the gov.uk centre finder*. The postcode centroid is 20 m from the position we were given,
and OpenStreetMap has a building named "Driving test centre" (way 226765740) there, beside Wilton Avenue, with its car
park reached by a narrow service road (way 226765734). A driving school's news post (13 August 2026) on new test
programmes at the centre shows it open and staying.

## 2. Read the evidence, then choose

`content/sources/pass2/bletchley-evidence.json`: 1 confirmed road and 1 confirmed junction (Wilton Avenue and the way
out), 76 likely roads and 11 likely junctions, almost all from one route-list publisher (drivingtesttips.biz, copied by
intensivelessons.co.uk). Every list leaves and returns by Wilton Avenue, so they fit the current address.

The choice: the loop west and north of the centre (Church Green Road, Rickley Lane, Whalley Drive, Sherwood Drive,
Buckingham Road), driven anticlockwise, with Cottingham Grove added for an emerging right turn (97% on the evidence's
roads). Driven the other way the loop gives two emerging left turns and no right turns. What the map and the rules
changed:

- **Spacing at the start.** The Rickley Lane mini-roundabout is 260 m from the end of Wilton Avenue. Starting by the
  way out, its direction would come under 300 m after the first one; the car starts instead at the far end of the
  car park (the service road's stub south of the building), 90 m from Wilton Avenue, and the direction for the
  mini-roundabout is given 30 m before it.
- **Leaving.** Challenge 1 is the way out itself, left on to Wilton Avenue (the narrow way and the corner mirror the
  driving school describes); the right turn on to Church Green Road 40 m on is driven.
- **The finish** is on Wilton Avenue, 30 m past the way in (as Kettering: the planner's 80 m run-on would otherwise
  pass the start).
- **The emerging right turn** is at Cottingham Grove's east end, the one a list uses; the loop is entered at its west
  end from Buckingham Road.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2500 m, 6 x 6 tiles), the centre's fix applied (the
Jemima Way signal crossing, `osm-patches.json`), then the scene, 1.56 km square, centred 340 m north of the centre to
take in Whalley Drive:

```
python3 -I tools/centres/fetch_osm.py bl.osm 51.99382 -0.74268 2500 6 --patches content/packs/bletchley/osm-patches.json
node tools/scenes/build_scene.mjs bletchley-route-1 "Bletchley" 51.996874 -0.742315 780 bl.osm 51.993874,-0.742245 51.993982,-0.742231 226765734
```

## 4. Plan the line, probe it, script the road users

As Kettering: the car's way planned through points on the scene's roads (`decisionPath`), a probe listing stop lines,
crossings, roundabouts, side roads, street furniture and parked cars by metres along it, and each road user's path
planned on the scene's roads the same way, from a start pose through points. The cyclist on Whalley Drive runs in the
car's lane and 1.9 m out to the right round the car pulled in 0.5 m (2.4 m centre to centre). The stop at each give
way line is set clear of the road user passing in front: at the Sherwood Drive roundabout the black car comes round 11 m
from the centre, so the car stops 15.8 m out (the ring's outer edge is 13.2 m); at the mini-roundabout 9.5 m out. The
crossing's stop is where the car stops for the red (the runner holds it 3.15 m short of the stop point). Each road user
a pause waits for is set going early enough to be paced to its moment.

The planned line checked on its own (not driven): the car's middle on the carriageway all the way; one front corner
over the edge of the car park turning out of its stub; no street furniture within 0.6 m of the car's box.

## 5. Drive it headless

`ROUTES=bletchley-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`.

All 6 pass (results in `ROUTES.md`). Tuning from the first run:

| Found | Fix |
|---|---|
| Pattern 4: a background car met the car face to face in Cottingham Grove (narrow, cars parked both sides) and neither could get by | Cottingham Grove kept quiet all the way round: its circles on challenge 7, with `quietUntil` near the end of the Grove (on challenge 8 they did nothing, as quiet starts only at a challenge's direction) |

The other five passed first time: the stops set from the planned line (the crossing's where the car stops for the red,
the give way lines clear of the road user passing in front) needed no change.

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (a button in `sim/index.html` if wanted, the sources in
`public/legal/credits.html`) are listed in the build report; every direction used already has a voice clip on another
route.
