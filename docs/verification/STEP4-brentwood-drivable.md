# Step 4: drivable Brentwood paired mini-roundabouts and guided exercise 1

Branch `rebuild/3d-judgement-simulator`. Area-inspired, not an official test route. Layout unreviewed.

## What was built

- Location format v2 (optional additions, v1 files unchanged): mini-roundabout junctions (clear radius, painted disc, entry roads with give-way lines), one-way roads, building outlines (walls only), trees, and signal crossings (markings only).
- World builder: roads are resampled; pavements and kerbs are left out across junctions, other carriageways and the gap between paired one-way roads; lane lines follow curves; static meshes are merged per material (fewer draw calls on phones).
- Road surface uses the true distance to a road, so space beyond a road's end is no longer counted as road.
- `tools/brentwood/build_location.py` generates the location and the guided exercise from the OpenStreetMap extract (sources in `docs/brentwood/SOURCES.md`).
- Exercise "Brentwood mini-roundabouts: guided route": starts at the first Street View point on High Street, left at mini-roundabout 1 into Wilson's Corner, ahead at mini-roundabout 2 into Shenfield Road. A blue car ahead shows the way; hints appear on each approach. Results give practice notes per roundabout (entry speed, left signal, look right). Not scored.
- Wrong-way detection follows the exercise route; exercises can use different locations (the world is rebuilt).
- OpenStreetMap credit shown on screen while the location is in use.
- Results: things to improve are now marked → in amber instead of a green tick.

## Automated checks (cloud, headless Chromium with software rendering)

- Unit (83): location labels and credit; junction spacing (19.1 m, as OSM); start at S0 on High Street; the route can be driven on assisted steering from the start to the finish without leaving the carriageway and clear of both painted discs; zone and hint order.
- Browser G5 (phone-sized landscape): start, briefing, OSM credit, overhead screenshots, full drive with left signal and braking to about 8 mph at each roundabout, completed with no collision, notes include both roundabouts and the improvement marker; then back to the menu and into another exercise at the other location.
- All earlier browser tests still pass. Frame rates in these runs are software rendering only and say nothing about the iPhone.

## Screenshots

`step4/overhead-area.png`, `step4/overhead-junctions.png`, `step4/overhead-link.png` (north up, diagnostic camera), `step4/driver-s0.png`, `step4/phone-g5-*.png`.

## Limitations

- Traffic is a single lead car; no traffic from the right yet (exercise 2), no queue (exercise 3).
- Signals on High Street are not simulated; the crossing is markings only.
- Junction corners have no kerbs or pavement; road widths and lane counts are simplified; disc size estimated.
- Buildings are plain walls from OSM outlines with assumed heights; no textures yet (assets step).
- "Looked right" is judged from head direction (swipe or R shoulder), not eye tracking.

## Device result: tilt steering (user test, 2026-10-17)

- **Verified on the user's iPhone 14 Pro Max in Safari**, opened directly from the standalone staging site
  https://realayd.github.io/driving-practice-preview/ (built from `rebuild/3d-judgement-simulator`, tilt commit `b32f37d`).
- Motion access granted from the Enable tilt button; the Brentwood guided route was completed steering by tilt
  (results: "You steered by tilting the phone", 32 s, completed). Reported by the user as "Tilt working".
- Not yet reported: steering direction feel, best sensitivity, jitter, Centre behaviour. Tilt inside the claude.ai
  viewer remains unavailable (the embedding frame blocks motion sensors).
