# Test centre routes: the template's rules

> **DRAFT 4 for the owner's review. Not final.** Nothing here is built yet. Items marked *(agreed)* were confirmed by
> the owner on 14 November 2026; *(proposed)* ones are still to agree. Changes from draft 3 are listed at the bottom.

These are the rules every test centre's routes follow, so that adding a centre is a data job, done the same way each
time. The model is **Brentwood**: a test route is a drive on the centre's real roads with **8 scenarios**, and a centre
starts with **2 routes** (`brentwood/HOW_WE_BUILT_IT.md`, `chelmsford/HOW_WE_BUILT_IT.md`, `ROUTE_FORMAT.md`).

They cover **Great Britain** (DVSA's centres). Northern Ireland's tests are run by the DVA: a later version.

## 1. What a route is, and what it is not

- A route is a **drive on the real roads round a real test centre**, leaving from the centre and coming back, with
  **8 scenarios** on the way. At each scenario the learner decides what to do (as Brentwood); between scenarios the
  drive moves on quickly.
- It is not an official DVSA route, and we never present it as one. A light note on the screen **before the test
  starts** says so *(agreed)*: **"Based on the roads round this test centre. Your test route may differ."**
- It **must overlap the physical test area**: the roads tests from that centre are reported to use. Section 3 makes
  that measurable; a route that does not meet it is not published.

## 2. Evidence: what a route may be built from

Every road and every scenario's place has a recorded source. In order of weight:

| Rank | Source | Used for | Rules |
|---|---|---|---|
| A | The centre itself: DVSA's current address (gov.uk), its entrance on the map | Start and finish | Checked against gov.uk's centre list every month, automatically; a change stops that centre's routes until reviewed (Chelmsford moved to Cromar Way on 5 Oct 2026) |
| B | Public information on where tests go: local driving instructors' published route descriptions and videos, learner forums, local news | Which roads and junctions belong to the test area | **Agreed by the owner.** Used as evidence of roads only: never copied word for word, never reproduced as "the route". Each recorded with its link and date |
| C | The map (OpenStreetMap) | Road types, speed limits, one-way streets, turn rules, lights, crossings, roundabouts, lanes | Where B and the map disagree, the map wins on what is physically there, B on where tests go |
| D | The owner, or an instructor the owner names | Corrections, known junctions | Recorded like B, as *confirmed* |

Rules for rank B:

- A road is **confirmed** when two separate sources name it (different authors; sites that copy each other count
  once), and **likely** when one does.
- Information from before a centre moved is not used for how routes leave and return, only for roads further out.
- Each source's terms of use are respected. No paid route lists, and nothing taken from apps that sell routes.

## 3. The test area, and the overlap rule

In plain terms: **a route stays on roads near the centre, and most of it is on roads that public information says
tests use.**

1. **Test area** *(agreed)*: the roads you can reach within **15 minutes' driving** of the centre, plus any road
   further out that public information names.
2. **Known junctions**: the junctions and features public information names for that centre (for example "the Writtle
   Road lights"), each saved with where it is and who named it.
3. **Overlap rule** *(agreed)*. A route is published only if:
   - it stays inside the test area;
   - **more than half of its length** is on roads that are confirmed or likely;
   - **at least 3 of its 8 scenarios** are at known junctions;
   - and the centre's two routes together use **most of the known junctions that suit a scenario**.
4. **A centre with no public information** is built from the map alone, marked *map-only* in its file, and reviewed
   by a person before release. It is rebuilt when information arrives.

## 4. The 8 scenarios on a route

As Brentwood and Chelmsford (`ROUTE_FORMAT.md` has the format and the rules every scenario keeps):

- **8 scenarios per route**, in the order the roads give them, spread along the route: no two within about 300 m,
  except a pair that belongs together (pull up, then move off).
- **The mix** across the eight *(agreed)*: traffic lights; a large roundabout and a mini-roundabout; emerging left
  and emerging right; a right turn across oncoming traffic; a pedestrian crossing; and the pull-up and move-off pair.
  Where the area lacks one (no mini-roundabout nearby), the nearest kind replaces it, and the file says so.
- **Each scenario is placed at a known junction where one exists**, so the junctions that catch candidates are the
  ones practised.
- **Each has a real hazard**, scripted and timed from the map (distances and speed limits), then checked in a headless
  drive: a late pedestrian, an oncoming car, a cyclist to pass, a car emerging.
- The first scenario is leaving the centre the way tests do; the last returns to it.

## 5. A centre's set of routes

- **2 routes per centre to start**, as Brentwood. More are added the same way later.
- The two routes leave the area in **different directions** where the roads allow, and **no scenario is repeated**:
  16 different scenarios per centre. They may share the stretch every route needs to leave and return.
- Between them the two routes cover the mix in section 4 twice over, with different hazards, so the second is not a
  repeat of the first.
- Each route is named by where it goes ("Route 2: Broomfield and North Avenue"), not numbered alone.
- The app's levels apply to every route the same way: **Easy** has light traffic; **Standard** normal traffic;
  **Test day** busy traffic and less time to decide.

## 6. Checks before a route is published

Automatic, on every build (the checks Brentwood and Chelmsford already run, plus the overlap rule):

1. **Legal on the map**: no wrong way down a one-way street, no banned turn, no private roads, service roads or
   tracks, no motorways.
2. **Drivable in the simulator**: the car's line is planned through the scene with no U-turns and no gaps, and a
   headless drive completes the route and every scenario.
3. **Every paused picture shows its hazard**, and every scripted road user is where the picture needs it.
4. **Traffic**: background traffic does not deadlock, and stays off each scenario's junction.
5. **Overlap rule** (section 3) and **the mix** (section 4) met, with the numbers recorded in the centre's file.
6. **The centre is where the file says**: the last monthly check against gov.uk passed.

Then a person checks each scenario's pictures, and **the owner signs off each centre** before it goes live.

## 7. What is saved for a centre (the template file)

One file per centre holds everything; the scenes, routes and scenarios are generated from it:

- the centre: name, current address, entrance position, the date it was last checked;
- the test area and the known junctions, each with its sources, dates and confidence;
- the two routes: the roads in order, and the 8 scenarios by kind, place and hazard, with the check results;
- who signed it off, and when.

Brentwood and Chelmsford are converted to this file first, to prove it can reproduce them.

## 8. The pilot, and keeping routes right

- **Pilot**: the **three centres with the most public information** are built first and measured against these rules
  (overlap, the mix, the checks, and the owner's drive). How that information is found, judged and recorded, and how
  the centres are shortlisted, is planned in `EVIDENCE_PLAN.md` (a draft; not run until the owner approves it). The
  rules are changed from what the pilot shows, then fixed.
- The centre's address is checked monthly. Everything else for a centre is reviewed **every 6 months** *(proposed)*:
  new road layouts on the map, and new public information.
- Learners can report "this road has changed" from the results screen; reports go to the admin hub.

## Later, not in this template

Full-length test drives of 35 to 40 minutes (with sat nav directions, a manoeuvre, faster roads and hill starts) are
not part of this template. If wanted, they would be a separate kind of route built on the same test area and evidence.

## Open questions for the owner

1. The plan for finding public information and shortlisting the pilot centres: `EVIDENCE_PLAN.md`.
2. The 6-month review in section 8.

## Changes from draft 3

- Agreed by the owner: the overlap numbers, the mix of 8 scenarios, the disclaimer wording, shown before the test
  starts.
- The survey of public information is not run yet: its plan is in `EVIDENCE_PLAN.md` for review.
