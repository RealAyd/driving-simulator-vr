# Test centre routes: the template's rules

> **DRAFT 2 for the owner's review. Not final.** Nothing here is built yet. Numbers marked *(proposed)* are starting
> points to agree, not decisions. Open questions are at the end. Changes from draft 1 are listed at the bottom.

These are the rules every test centre's routes follow, so that adding a centre is a data job, done the same way each
time, and every centre feels like its real test. They build on how Brentwood and Chelmsford were made
(`brentwood/HOW_WE_BUILT_IT.md`, `chelmsford/HOW_WE_BUILT_IT.md`) and on the decision route format (`ROUTE_FORMAT.md`).

They cover **Great Britain** (DVSA's centres). Northern Ireland's tests are run by the DVA, with their own centres and
details: a later version.

## 1. What a route is, and what it is not

- A route is a **test-style drive on the real roads round a real test centre**: it leaves from the centre, drives the
  kinds of road and junction a test there uses, and comes back.
- It is **not an official DVSA route**. DVSA does not publish routes, and we never present ours as theirs. The app says
  so where routes are chosen: *"Test-style routes on the roads round the centre. Not official DVSA routes."*
- It **must overlap the physical test area**: the roads tests from that centre are reported to use. Section 3 makes
  that measurable; a route that does not meet it is not published.

## 2. Evidence: what a route may be built from

Every road, junction and "hotspot" (a junction or feature known to catch candidates) on a route has a recorded source.
In order of weight:

| Rank | Source | Used for | Rules |
|---|---|---|---|
| A | The centre itself: DVSA's current address (gov.uk), its entrance on the map | Start and finish | Checked against gov.uk's centre list every month, automatically; a change stops that centre's routes until reviewed (Chelmsford moved to Cromar Way on 5 Oct 2026) |
| B | Public evidence of where tests go: local driving instructors' published route descriptions and videos, learner forums, local news | Which roads and hotspots belong to the test area | Used as **evidence of roads only**: never copied word for word, never reproduced as "the route". Each recorded with its link and date |
| C | The map (OpenStreetMap) | Road types, speed limits, one-way streets, turn rules, lights, crossings, roundabouts, lanes | The road network itself; where B and the map disagree, the map wins on what is physically there, B on where tests go |
| D | The owner, or an instructor the owner names | Corrections, hotspots | Recorded like B, as *confirmed* |

Rules for rank B:

- **Confirmed** needs two sources that are independent: different authors, not one repeating the other (sites that
  copy each other count once). One source makes a road *likely*.
- **Dated**: evidence from before a centre moved is not used for how routes leave and return, only for roads further
  out (Chelmsford's older descriptions all start from Hanbury Road).
- Each source's terms of use are respected. No paid or proprietary route lists, and nothing scraped from apps that
  sell routes.

## 3. The test area, and the overlap rule

1. **Test area** *(proposed)*: the roads within **15 minutes' normal driving** of the centre's entrance, plus every
   road confirmed or likely from evidence even if further out, and the roads that connect them. Built per centre and
   saved with it.
2. **Hotspots**: the junctions and features evidence names for that centre (for example "the Writtle Road lights",
   "the Army and Navy roundabout"), each with its position and sources. Where a centre has fewer than six from
   evidence, the map adds the area's hardest features (large and multi-lane roundabouts, signalled junctions, junctions
   with a restricted view), marked *from the map*.
3. **Overlap rule** *(proposed)*: a route is published only if
   - all of it is inside the test area;
   - at least **60%** of its length is on roads that are *confirmed* or *likely* from evidence (this is what shows it
     overlaps real tests, not the 15 minutes);
   - it passes at least **3 hotspots**;
   - and, across all of a centre's routes, at least **70%** of its hotspots are used (or, for a centre with more than
     twenty, at least fourteen).
4. **Map-only centres**: where there is no rank B or D evidence, the 60% rule cannot apply. The routes are built from
   the map alone, marked *map-only* in the centre's file, shown to learners as such only in the admin hub, and reviewed
   by a person before release. They are replaced when evidence arrives.

## 4. What every route contains

Based on what the real test contains (DVSA, *Driving test: what happens*). A full route *(proposed)*:

| Part | Rule | In the simulator |
|---|---|---|
| Length | 35 to 40 minutes of driving at legal speeds; about 12 to 20 km | Now |
| Start and finish | The centre's entrance, both ways (leaving and returning the way tests do: Chelmsford's lights at Cromar Way) | Now |
| Independent driving | About 20 minutes: following sat nav directions, or (about one attempt in five) road signs to a named place | When sat nav driving is built |
| Road types | Residential; urban 30 mph; at least one 40 mph road; a national speed limit country road and a dual carriageway **where the test area has them** | 30 and 40 mph now; faster roads when built |
| Junctions | Emerging left and right (T-junction and crossroads), turning right across oncoming traffic, at least one junction with a restricted view | Now |
| Roundabouts | At least two, including a mini-roundabout and a larger one; a multi-lane one where the area has it | Now |
| Controls | Traffic lights (at least one set); a zebra or signal crossing | Now |
| Where the area has them | A 20 mph or school area, a bus lane, a box junction, a one-way system, a level crossing | Per feature, as built |
| Hazards | Meeting oncoming traffic past parked cars | Now |
| Manoeuvre | One of: parallel park, bay park (in or out), or pull up on the right and reverse; a quiet legal place for each is marked on the route | Now |
| Stops | Pull up at the side and move off, at least twice, once from behind a parked car; a hill start where the area has a hill | Now; hill starts when areas have real ground heights |
| Controlled stop | A quiet road for it is marked on every route | Now |
| Never | Motorways (not on the car test), roads the map marks private, service roads and tracks, car parks except for the bay park, U-turns except as the manoeuvre | |

Chosen fresh for each attempt, as on a real test, so a route cannot be learned by heart: which manoeuvre; whether
there is a controlled stop (about one attempt in three); sat nav or signs.

A rule marked "when built" does not block a route: the route records what it would use, and gains it when the
simulator can do it.

## 5. Parts and the full test

A route is designed once, at full length, then offered two ways *(proposed)*:

- **In parts**: four parts of about 8 to 10 minutes, in order, each starting where the last ended with the car pulled
  up at the side of the road. Part 1 leaves the centre; the last part returns to it. Each part is marked on its own
  (its faults, and whether it was clean). Driving all four shows the route as *covered*; it is not a test pass.
- **Full test**: the four parts in a row, marked as one test with a pass or fail. Only a full test counts for the
  learner's best mock test and for the leaderboard.

Why: a phone drive of 40 minutes is long to hold and heavy to load; a part fits a short sitting, and lets a learner
repeat the stretch they find hard. The streets for one part are built at a time, so a route far larger than one phone
scene still loads.

Each part should be worth driving alone: at least one hotspot and three of the contents in section 4.

## 6. A centre's set of routes

- *(proposed)* **4 routes per centre** to start, each leaving the area in a different direction where the roads allow,
  so learners see the whole area. Busy centres can have up to 8.
- Routes share the area's best-known hotspots (that is realistic), but no two are more than **50%** the same roads,
  not counting the stretch every route must share to leave and return (a centre on a dead end, like Cromar Way).
- Each route is named by where it goes ("Route 2: Broomfield and the A130"), not numbered alone.
- The app's levels apply to every route the same way: **Easy** has light traffic and no scripted hazards; **Standard**
  has normal traffic; **Test day** has busy traffic and the hazards a test can bring (a late pedestrian, a bus pulling
  out, a cyclist to pass).

## 7. Checks before a route is published

Automatic, on every build:

1. **Legal on the map**: no wrong way down a one-way street, no banned turn, nothing from the "never" list.
2. **Drivable in the simulator**: the car's line is planned through the scene with no U-turns and no gaps, and a
   headless drive completes each part and the full route (the checks Brentwood and Chelmsford already run).
3. **Overlap rule** (section 3) and **contents rule** (section 4) met, with the numbers recorded in the centre's file.
4. **Traffic**: background traffic does not deadlock; every scripted road user is where the picture needs it.
5. **The centre is where the file says**: the last monthly check against gov.uk passed.

Then a person looks at the route on the map and at each challenge picture, and **the owner signs off each centre**
before it goes live.

## 8. Decision tests (the Brentwood-style layer)

A decision test is a **short version of a route**, not a second route: the same roads, driven quickly between
challenges (as Brentwood's fast transit), stopping at each challenge for the learner's decision. Rules in
`ROUTE_FORMAT.md`, with these choices made the same way everywhere:

- **8 challenges per route**, spread along it: no two within about 300 m, except a pair that belongs together (pull
  up, then move off).
- A **mix** across the eight: lights, a large and a small roundabout, emerging left and right, a right turn across
  traffic, a pedestrian crossing, and the pull-up and move-off pair (as Chelmsford).
- Each challenge is placed **at a hotspot where one exists**, so the hardest real junctions are the ones practised.
- The road users in each challenge are timed from the map (distances and speed limits), then checked in the headless
  drive.

## 9. What is saved for a centre (the template file)

One file per centre holds everything; the scenes, routes, parts and challenges are generated from it:

- the centre: name, current address, entrance position, the date it was last checked;
- the test area and the hotspots, each with its sources, dates and confidence;
- the routes: the roads in order, where each part ends, the independent driving stretch, the places marked for the
  manoeuvres, stops and controlled stop, and the check results;
- for decision tests, the challenges by type and position;
- who signed it off, and when.

Brentwood and Chelmsford are converted to this file first, to prove it can reproduce them.

## 10. The pilot, and keeping routes right

- **Pilot**: three centres are built to these rules and measured against them (overlap, contents, the checks, and the
  owner's drive) before any more. The rules are changed from what the pilot shows, then fixed.
- The centre's address is checked monthly (rank A). Everything else for a centre is reviewed **every 6 months**
  *(proposed)*: new road layouts on the map, and new evidence.
- Learners can report "this road has changed" from the results screen; reports go to the admin hub.

## Open questions for the owner

1. **Parts and a full test** (section 5): is this what you want, and four parts of 8 to 10 minutes?
2. The numbers: **15 minutes**, **60% on evidence roads**, **3 hotspots**, **70% of hotspots used**, **4 routes**.
3. Should rank B evidence (instructors' public descriptions and videos) be used at all, or the map and your own input
   only? Without it, every centre is *map-only* and the 60% rule never applies; with it, it is worth a short legal
   check on using public sources this way.
4. The note shown to learners ("Not official DVSA routes"): this wording, and where it goes.
5. Which three centres for the pilot, after Brentwood and Chelmsford?

## Changes from draft 1

- The overlap rule now measures roads from evidence (60%), not just distance from the centre; map-only centres have
  their own rule, and hotspots can come from the map.
- Routes are driven in parts or as a full test (new section 5).
- Each contents rule says whether the simulator can do it now.
- Distance corrected (12 to 20 km); the test area is 15 minutes, not 12.
- Added: country roads, hill starts, signs for independent driving, bus lanes and similar where the area has them;
  the manoeuvre, controlled stop and sat nav or signs are chosen per attempt.
- Evidence must be independent and dated; the centre's address is checked monthly, the rest every 6 months.
- Decision tests are a short version of a route; the 300 m rule allows the pull-up and move-off pair.
- Great Britain only; the app's levels; a three-centre pilot; the owner signs off each centre.
