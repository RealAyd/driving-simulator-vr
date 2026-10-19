# Step 15: Kings Road zebra crossing, Brentwood (second Brentwood exercise)

Branch `rebuild/3d-judgement-simulator`. Production `main` and vr.drivingpractice.live unchanged. Label: **area-inspired, not an official test route; unreviewed.** Software rendering only; **not yet checked on the iPhone.** The scenery uses today's project-owned look (placeholders until better assets arrive; see section 6).

## 1. What the map data shows (OpenStreetMap, downloaded 2026-10-19)

- **The crossing:** node 1691283192, `crossing_ref=zebra`, flush kerb, tactile paving, no island. It is on Kings Road (B185, two lanes, 30 mph on both ways used), about 60 m north of the Queen's Road roundabout.
- **Side roads** right next to it: King's Chase joins about 13 m north on the west side, and Primrose Hill about 10 m south on the east side. Further north: White Lyons Road, Westbury Road, Hart Street and Chatham Way, with the High Street and Weald Road at the north end.
- **Bus stop "Queens Road Roundabout"** (node 474891874): NaPTAN bearing **S**, so it serves southbound traffic. It stands on the southbound (east) kerb about 37 m before the crossing, with no shelter, bench or bin mapped.
- **Buildings:** OSM maps only 32 here. The other 160 are Microsoft machine-detected outlines via Overture Maps (ODbL), marked `reference` with estimated heights; house-sized ones get pitched roofs (representative).
- **Not mapped:** zig-zag length, kerb lines, give-way line positions, parking restrictions, walls and hedges, street lights.
- **Outside the scene:** the signal crossing south of the roundabout, the stop beyond the roundabout and the Queen's Road zebra are not modelled, so none of them is misrepresented. The roundabout itself is drawn as surface only and is not drivable.

## 2. The exercise ("Kings Road zebra (Brentwood)")

| | |
|---|---|
| Route | Southbound on Kings Road from 160 m before the crossing; ends 12–45 m past it, before the roundabout. About 150 m of street behind the start for the mirrors. |
| Hazard (authored, at a mapped place) | A bus waits at the mapped stop, front at the flag, in the learner's lane, throughout the exercise. A passenger who has just got off walks along the pavement from beside the bus to the zebra (about 15 s), then crosses when the learner comes within 26 m (the same trigger as the existing zebra exercise). |
| Other road users (authored) | A following car (as in the zebra exercise). Background people on the pavements, kept more than 40 m from the crossing. |
| What the learner decides | Plan to pass the bus (it hides the pavement), keep a speed at which they can stop, check the mirror before slowing, and give way once the passenger is on the crossing. |
| Feedback | The existing draft zebra rubric (`crossing-restricted-view` 0.1-draft, unreviewed): speed past the obstruction, mirror before braking, stop position, giving way, collisions. Its wording now names what hides the view ("past the bus at the stop"); thresholds are unchanged and still our draft. |
| Briefing | Says the bus, the pedestrian and the following car are part of the exercise, not a record of real traffic. |
| Location label | "Kings Road · Brentwood · 30 mph" (limit from OSM maxspeed). |

**Estimated, not mapped:**
- the crossing's stripe width (3.0 m) and give-way offset (1.1 m);
- **zig-zags of 8 marks on each approach** (new; interrupted at the side-road mouths, with the centre line stopped there);
- lane widths (3.2 m) and 2 m pavements;
- street lights every 30 m;
- the street-name plates' positions.

## 3. How the view is hidden, and that it is seen in time (unit-tested)

Sightlines from the driver's eye to a person standing at the kerb where the passenger waits, with every collider plus the bus:

| Car position | Waiting passenger |
|---|---|
| In the lane behind or beside the bus (from about 86 m to 38 m before the give-way line) | Hidden |
| Level with the bus's front and closer (34 m before the line onwards) | Visible |
| Pulled out to pass the bus | Visible from about 75 m before the line |

- From 15 m before the line onwards they are always visible. Stopping from 20 mph takes about 12 m.
- Near the crossing, the static scenery adds no cover: the bus is the only thing hiding them.

## 4. Checks

- **Unit tests** (`tests/unit/kingsRoad.test.ts`, 8 new; plus Kings Road added to the shared street-life checks):
  - labels, licences and the "not real traffic" briefing;
  - the crossing at the mapped node; 30 mph from map data; the side roads exist;
  - the stop on the southbound kerb, no shelter;
  - the bus at the flag, in lane, clear of kerb and scenery, never moving during the exercise;
  - the assisted path passes the bus and reaches the end without touching anything, on the carriageway throughout;
  - the passenger's walk stays on the pavement, clear of every post, reaching the kerb in 10–20 s and only then crossing;
  - the sightlines above; zone order;
  - the following car's start is clear;
  - background people stay on pavements, more than 40 m from the crossing.
- **Browser tests** (`tests/browser/g16-kings-road.spec.ts`, phone layout with steering assistance):
  - **careful attempt:** passes the bus at about 12 mph, checks the mirror, stops before the line while the passenger crosses, completes with no serious findings, "Gave way to the pedestrian";
  - **fast attempt** at 30 mph: a serious approach-speed finding that names the bus.
- Full suite results: see section 7.

## 5. Cost (software rendering; this container is about half as fast as yesterday's, so compare scenes, not days)

| Scene (same run) | Triangles | Forward view | Interior mirror |
|---|---|---|---|
| Kings Road zebra | 36,400 | 13.7 fps | 13.2 fps |
| Brentwood mini-roundabouts | 67,300 | 8.7 fps | 8.7 fps |
| Zebra crossing (representative) | 49,700 | 10.8 fps | 10.5 fps |
| Moving off | 70,100 | 9.9 fps | 9.5 fps |

- The main script grows to 1,227 KB (gzip 322 KB): the Kings Road location adds about 0.19 MB of map data.
- No new files are downloaded.
- The iPhone check is still outstanding.

## 6. Assets later

Everything drawn here goes through the shared scenery, people, sign and vehicle code, so better assets will replace the looks in every exercise at once without changing roads, colliders or scoring. Each replacement is re-checked with the sightline, mirror and collision tests above, its licence recorded, and its cost measured.

## 7. Remaining uncertainties and next steps

- **Not checked on the ground or in imagery:** zig-zag length, kerb lines, parking, walls and hedges, give-way positions, and the bus stop's exact pole position. They are drawn by rule.
- **The test centre's entrance is still unverified,** so distances from it remain provisional.
- **Drafts until instructor review:** the rubric thresholds, and the decision to use a waiting bus as the hazard.
- **Next:** Woodman Road onto Warley Hill (needs a T-junction and priority traffic). The four-exit roundabout waits for the research agent's verified location.

## 8. Test results (this container, 2026-10-19)

- **Typecheck and build:** pass.
- **Unit tests:** 176 pass, 18 files.
  - Two existing Brentwood checks now have an explicit 60 s limit: this slower container took up to 16 s for them while browser tests ran. What they check is unchanged.
- **Browser tests:** 35 tests.
  - The full run had 33 pass and 2 fail, both because of the tests rather than the app:
    - G0 listed the exercise menu without Kings Road; its expected list now includes it.
    - G15 read the bus state before the first simulation step on the slow machine; it now waits for the state.
  - G0, G15 and G16 were then rerun: all 6 of their tests pass.

## 9. Screenshots (`step15/`)

| File | Shows |
|---|---|
| `01-forward-start.png`, `02-interior-mirror-start.png` | Driver's seat at the start |
| `03-placed-behind-the-bus.png`, `04-placed-passing-the-bus.png` | Driver's seat, car placed by a diagnostic: behind the bus, and moved out to pass it |
| `05-diagnostic-passenger-walking.png` | Diagnostic camera: the passenger walking to the crossing |
| `06-diagnostic-overhead-crossing.png`, `07-diagnostic-overhead-area.png` | Overhead review: zig-zags and side-road mouths; the whole area |
| `08-driving-passing-the-bus.png`, `09-driving-giving-way.png` | From the G16 careful drive: passing the bus; stopped at the line while the passenger crosses |
