# Test centre routes: the template's rules

> **DRAFT for the owner's review. Not final.** Nothing here is built yet. Numbers marked *(proposed)* are starting
> points to agree, not decisions. Open questions are at the end.

These are the rules every test centre's routes follow, so that adding a centre is a data job, done the same way each
time, and every centre feels like its real test. They build on how Brentwood and Chelmsford were made
(`brentwood/HOW_WE_BUILT_IT.md`, `chelmsford/HOW_WE_BUILT_IT.md`) and on the decision route format (`ROUTE_FORMAT.md`).

## 1. What a route is, and what it is not

- A route is a **test-style drive on the real roads round a real test centre**: it leaves from the centre, drives the
  kinds of road and junction a test there uses, and comes back.
- It is **not an official DVSA route**. DVSA does not publish routes, and we never present ours as theirs. The app says
  so where routes are chosen: *"Test-style routes on the roads round the centre. Not official DVSA routes."*
- It **must overlap the physical test area**: the roads examiners at that centre really use. Section 3 makes that
  measurable; a route that does not meet it is not published.

## 2. Evidence: what a route may be built from

Every road, junction and "hotspot" (a junction or feature known to catch candidates) on a route has a recorded source.
In order of weight:

| Rank | Source | Used for | Rules |
|---|---|---|---|
| A | The centre itself: DVSA's current address and opening (gov.uk), its entrance on the map | Start and finish | Checked for every centre at build and again before each release: centres move (Chelmsford moved to Cromar Way on 5 Oct 2026) |
| B | Public evidence of where tests go: local driving instructors' published route descriptions and videos, learner forums, local news | Which roads and hotspots belong to the test area | Used as **evidence of roads only**: never copied word for word, never reproduced as "the route". Each one recorded with its link and date. Two independent sources make a road *confirmed*; one makes it *likely* |
| C | The map (OpenStreetMap) | Road types, speed limits, one-way streets, turn rules, lights, crossings, roundabouts, lanes | The road network itself; checked against B where they disagree (the map wins on what is physically there, B on where tests go) |
| D | The owner, or an instructor the owner names | Corrections, hotspots | Recorded like B, as *confirmed* |

No paid or proprietary route lists, and nothing scraped from apps that sell routes.

## 3. The test area, and the overlap rule

1. **Test area** *(proposed)*: the roads within **12 minutes' normal driving** of the centre's entrance, plus every road
   confirmed or likely from evidence (rank B or D) even if further out, plus the roads joining them. Built per centre
   and saved with it.
2. **Hotspots**: the junctions and features evidence names for that centre (for example "the Writtle Road lights",
   "the Army and Navy roundabout"). Each has a position and its sources.
3. **Overlap rule** *(proposed)*: a route is published only if
   - at least **90%** of its length is on test area roads;
   - it passes at least **3 hotspots**;
   - and, across all of a centre's routes, at least **70%** of its hotspots are used.
4. When there is no rank B evidence for a centre (a quiet one), the test area is the 12-minute area alone, the routes
   are marked *map-only*, and they are reviewed before release.

## 4. What every route contains

Based on what the real test contains (DVSA, *Driving test: what happens*). Each route *(proposed)*:

| Part | Rule |
|---|---|
| Length | 30 to 40 minutes of driving at legal speeds; about 8 to 14 km |
| Start and finish | The centre's entrance, both ways (leaving and returning the way examiners do: Chelmsford's lights at Cromar Way) |
| Independent driving | One stretch of about 20 minutes following directions to a named place (sat nav style); the rest by the examiner's turns |
| Road types | Residential; urban 30 mph; at least one 40 mph road; a 50 to 70 mph road or dual carriageway **where the test area has one** |
| Junctions | Emerging left and right (T-junction and crossroads), turning right across oncoming traffic, at least one junction with a restricted view |
| Roundabouts | At least two, including a mini-roundabout and a larger one; a multi-lane one where the area has it |
| Controls | Traffic lights (at least one set); a zebra or signal crossing |
| Hazards | Meeting oncoming traffic past parked cars; a 20 mph or school area where the area has one |
| Manoeuvre | One of: parallel park, bay park (in or out), or pull up on the right and reverse, in a quiet legal place |
| Stops | Pull up at the side and move off (at least twice, once behind a parked car); a controlled stop on about one route in three, on a quiet road |
| Not included | Motorways (not used on the car test), private and unadopted roads, car parks except for the bay park, roads closed to learners, U-turns except as the manoeuvre |

## 5. A centre's set of routes

- *(proposed)* **4 routes per centre** to start, each leaving the centre in a different direction where the roads allow,
  so learners see the whole area. Busy centres can have up to 8.
- Routes share the area's best-known hotspots (that is realistic) but no two are more than **50%** the same roads.
- Each route is named by where it goes ("Route 2: Broomfield and the A130"), not numbered alone.

## 6. Checks before a route is published

Automatic, on every build:

1. **Legal on the map**: no wrong way down a one-way street, no banned turn, no road learners cannot use.
2. **Drivable in the simulator**: the car's line is planned through the scene with no U-turns and no gaps, and a
   headless drive completes it (the checks Brentwood and Chelmsford already run).
3. **Overlap rule** (section 3) and **contents rule** (section 4) met, with the numbers recorded.
4. **Traffic**: background traffic does not deadlock; every scripted road user is where the picture needs it.
5. **The centre is still there**: its address and entrance match rank A evidence from the last 30 days.

Then a person looks at the route on the map and at each challenge picture before it goes live; *map-only* centres
always.

## 7. Decision tests (the Brentwood-style layer)

For centres that get decision mock tests, each route adds challenges by the rules in `ROUTE_FORMAT.md`, with these
choices made the same way everywhere:

- **8 challenges per route**, spread along it, no two within about 300 m.
- A **mix** across the eight: lights, a large and a small roundabout, emerging left and right, a right turn across
  traffic, a pedestrian crossing, and the pull-up and move-off pair (as Chelmsford).
- Each challenge is placed **at a hotspot where one exists**, so the hardest real junctions are the ones practised.
- The road users in each challenge are timed from the map (distances and speed limits), not by hand.

## 8. What is saved for a centre (the template file)

One file per centre holds everything; the scene, routes and challenges are generated from it:

- the centre: name, current address, entrance position, the date it was last checked;
- the test area and the hotspots, each with its sources and confidence;
- the routes: the roads in order, the independent driving stretch, the manoeuvre and stops, and the check results;
- for decision tests, the challenges by type and position.

Brentwood and Chelmsford are converted to this file first, to prove it can reproduce them.

## 9. Keeping routes right

- Each centre is re-checked **every 6 months** *(proposed)* and whenever DVSA announces a move or closure: centre
  address, new road layouts on the map, and new evidence.
- Learners can report "this road has changed" from the results screen; reports go to the admin hub.

## Open questions for the owner

1. The **12-minute** test area, the **90% / 3 hotspots / 70%** overlap numbers, and **4 routes per centre**: right
   starting points?
2. Should rank B evidence (instructors' public descriptions and videos) be used at all, or the map and your own input
   only? Using it makes routes much closer to real tests; it needs care to record and never copy.
3. Independent driving: always the sat nav style, or sometimes following road signs (as DVSA does on about one test in
   five)?
4. The note shown to learners ("Not official DVSA routes"): this wording, and where it goes.
5. Which centres first, after Brentwood and Chelmsford?
