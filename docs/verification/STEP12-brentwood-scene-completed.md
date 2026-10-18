# Step 12: Brentwood paired mini-roundabouts: scene completed before any new exercise

Branch `rebuild/3d-judgement-simulator`; production `main` untouched. Label: **Brentwood area-inspired practice, unreviewed.** It is not an official test route or an exact reconstruction, and it is not endorsed by DVSA.

Checked in headless Chromium with software rendering at the iPhone 14 Pro Max landscape size. **Not yet checked on the iPhone** (see `PERFORMANCE.md`, section 3).

Review plan: `docs/brentwood/location-review.svg` (and `step12/00-location-review-plan.png`). OSM buildings are grey (shops darker); approximate buildings are orange and hatched; widened pavements, bus stops, signal crossings and the learner's start are also marked.

## 1. High Street behind the start

- **Extent:** the High Street now starts about 220 m behind the learner (OSM ways 671087285 from x −235, and 820165999), instead of 37 m. The interior and door mirrors show the street continuing, with buildings on both sides, past the haze distance.
- **Side roads:** Moores Place and Saint Thomas Road (both one-way in OSM) join the High Street behind the start. Their first 30 m are modelled, so the junction mouths exist. **Give-way markings at these mouths are not mapped and are not drawn.**
- **Second signal crossing:** OSM node 1763175237 (dot studs, flush kerb, signals on both approaches) is on the extension.
- **Centre markings:** OSM says the High Street west of that crossing has no lane markings, so the centre line starts at the crossing (`markings.centreFrom`).

## 2. Pavements reach the shop fronts

- **References:** OSM building outlines on these stretches stand 7–17 m from the centreline. OSM trees (9–12 m), bus stops (10–12 m) and cycle stands (4–6.5 m) stand in the space between the kerb and the buildings, so it is pavement, not road.
- **What is built:** wherever a mapped shop faces a modelled road, the pavement now runs from the kerb to that shop's front wall, less 0.3 m. It varies along the street: the location stores a `pavementProfile` per road, with widths left and right at 2.5 m stations. Short breaks between shop units (alleys, up to 15 m) are bridged. Elsewhere the pavement stays 2 m, with paved ground beyond.
- **Limits:** a widened pavement stops short of any other carriageway or junction.
- **Test:** a unit test checks that every shopfront wall meets the back of the pavement somewhere along it (within 1 m).
- **Not surveyed:** the kerb line stays at the modelled lane edge. Real lay-bys and parking bays (suggested by bus stops 10–12 m out) are not modelled.
- **Bus stops:** 5 are placed (4 on the High Street, plus Wilsons Corner). 2 High Street stops still fall beyond our pavement, where no shop wall sets its width, and are not placed.
- **Shopfronts:** these now appear only where OSM maps a shop, café, restaurant, bank, pharmacy or pub. Offices, surgeries, dentists and solicitors get ordinary windows. (Earlier, a GP surgery had a shopfront.)

## 3. Approximate buildings where OSM has no outline

- **Count and labelling:** 13 approximate buildings fill built-up frontages where OSM has no outline: 4 on the High Street near the second crossing, 8 on Shenfield Road and 1 on Ongar Road. Each is marked `source: "approximate"` and `heightSource: "estimated"`, with an id starting `approx-`.
- **Shape and height:** each is 9 m along the street and 6–10 m deep, standing 0.5 m behind the pavement. Three storeys beside shops, otherwise two.
- **No shopfronts:** what they contain is not known.
- **Where none are placed:** never on or within a margin of an OSM building, a road (modelled or not), a footway or service road, a car park, a park or grass area, a tree, a junction, the memorial or another approximate building.
- **Open land left open:** some land is left open where OSM shows open space. For example, the area north of the High Street between the shop rows (OSM trees, no buildings) **needs checking against a reference**; it may be the open ground around the chapel ruins.
- **Tests:** a unit test checks that every approximate footprint stands off every road and pavement, has an estimated height and has no shopfronts.

## 4. Signals: green only in this exercise

Both High Street signal crossings draw heads only because **this exercise** (`brentwood-guided-traversal`) sets their state, which is held at green. Pedestrian phases are not implemented.

The exercise briefing says: *"The High Street pedestrian crossing lights stay green for you in this exercise: pedestrian crossing phases are not simulated."* The zebra and Moving off exercises set no signals (unit-tested), so no heads are drawn there.

## 5. Checks

- **Unit tests (136):** these include:
  - the street extends at least 190 m behind the start;
  - the centre line starts at the second crossing;
  - shopfront walls meet the pavement;
  - approximate buildings are labelled and kept clear of roads and pavements;
  - signals are scoped to this exercise;
  - plus the earlier checks: no scenery on a carriageway, the route and lead car clear of colliders, lights on pavements.
- **G5:** the guided route drives from start to finish.
- **G14:** every driver view, plus the new review views.

Screenshots (`step12/`):
- driver views: forward, interior mirror, door mirrors, shoulders;
- the High Street behind the start at eye height;
- the High Street from above;
- approximate buildings at the second crossing;
- the junctions from above and at eye height;
- shopfronts and the memorial.

Scene cost (software rendering): 38,400 triangles, 429 colliders, 18.7 fps (p50 53 ms, p95 90 ms). Before this step it was 25,100 triangles at 22.0 fps.

## 6. Remaining uncertainties

- **Kerbs and lanes:** kerb lines, lay-bys, parking bays and lane markings are simplified or derived, not surveyed.
- **Side-road mouths:** give-way markings at the side-road mouths are not drawn. The side roads end 30 m in.
- **Approximate buildings:** placeholders. Their positions, sizes and uses are not from a survey.
- **Heights and roofs:** building heights are estimated, except one building with mapped storeys. All roofs are flat.
- **Memorial:** its size is estimated.
- **Bus stops:** two High Street stops are not placed.
- **Signals:** not simulated; held at green in this exercise only.
- **Test centre:** unverified (`docs/brentwood/PRACTICE-AREA-PROPOSAL.md`). All distances from it are provisional.
