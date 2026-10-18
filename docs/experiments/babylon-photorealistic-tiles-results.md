# Google Photorealistic 3D Tiles in the Babylon simulator: results (2026-10-18)

Branch `experiment/babylon-photorealistic-tiles`, started from `rebuild/3d-judgement-simulator`
at `3c0d9bdf9adaed580dfc627ecc4392b560ed5db1` (the rebuild branch had not moved since, so
nothing newer needed bringing in). Evidence: `docs/experiments/tiles-evidence/`.

**What was tested:** live Google tiles (Map Tiles API, existing browser key, supplied at build
time only), rendered inside our own Babylon scene, from our driver's eye, with our cockpit,
mirrors, road users, controls and assessment. Headless desktop Chromium with **software WebGL
(SwiftShader)**. **Not tested:** iPhone, headset, phone stereo viewer on a device, a real GPU.

## How it is built

| Part | Where |
| --- | --- |
| Tiles renderer | `3d-tiles-renderer@0.5.3`, Babylon build (`3d-tiles-renderer/babylonjs`) with `GoogleCloudAuthPlugin`. Supports Babylon ≥ 8; we use 9.31. No Three.js code is bundled (only Google's Draco decoder files, copied from its npm package, `public/vendor/draco/`). |
| Adapter | `src/experiments/tiles/photorealTiles.ts`: places the tiles, chooses detail for the driver **and mirror** cameras, meters requests/bytes (key redacted), measures the tile surface. Loaded on demand: the constructed mode's bundle does not contain it. |
| Scene component | `src/experiments/tiles/tilesExperiment.ts`: `?scenery=constructed|tiles|hybrid` (also a menu option), hides the drawn scenery the tiles replace, shows attribution, calibrates height. |
| App changes | `src/app/main.ts`: 64-bit matrices when tiles are requested, three calls (apply, update, dispose), diagnostics, About line. `sim/index.html`: menu option and credits. Nothing else in the simulation changed. |
| Comparison | `tools/experiments/tiles-compare.mjs` (screenshots, timings, network, draw calls, short drive). |

Modes: **constructed** (unchanged, the default and the fallback); **tiles** (Google scenery instead
of our buildings, trees, parked cars, signs, verge and background people); **hybrid** (tiles plus our
road surface, kerbs, pavements and markings). In every mode the car drives on our road geometry and
collides with our colliders; scenario road users, the zebra/route zones and assessment are unchanged.

## Coordinates

* Scene: metres, X east, Y up, Z south, origin 51.6213112 N, 0.3055506 E (OSM, `docs/brentwood/layout-osm.json`).
* Tiles: ECEF metres. Placed by one parent node holding the WGS84 tangent frame at the origin
  (`ecefToSceneMatrix`, unit-tested), so road coordinates are reused as they are.
* The OSM extraction used a constant 111 320 m/degree, which differs from true metres by 0.2 % (x)
  and 0.05 % (z): 0.7 m at the west end of High Street. A scale on the parent node corrects it
  (`sceneScale`), so the tiles land in the extraction's frame and no road data changes.
* **Precision:** ECEF translations are ~6.4 × 10⁶ m; with Babylon's default 32-bit matrices that is
  ~0.5 m of jitter. The engine is created with `useHighPrecisionMatrix` (only when tiles are requested),
  so world matrices are composed in 64 bits and the GPU receives local-sized numbers. No jitter was seen.
* **Vertical reference:** scene y = 0 is a relative height, not a datum. Tiles were first placed at an
  *estimate* of 145.5 m above the WGS84 ellipsoid (≈100 m above Ordnance Datum from contours + ≈45.5 m
  geoid separation, OSGM15). The adapter then **measures**: it casts rays down onto the loaded tiles at
  road points and moves the tiles so the median tile surface sits at y = 0, repeating until the change is
  under 3 cm. Result, two independent runs: **152.505 m** above the ellipsoid (≈107 m AOD), 7.0 m above
  the estimate.
* **Caution:** a measurement taken on coarse tiles is wrong (154.6 m was measured in a run where fine tiles
  had not loaded). It must be taken when street-level detail has loaded.
* **Residual mismatch** (tile surface minus our flat road, after calibration, at the start and the two
  junctions): −0.18 to +0.29 m. Our Brentwood roads are flat; the real ones are not, and the
  photogrammetry surface is uneven.
* **Horizontally:** from a raised view, our carriageway lies on Google's within roughly a lane width
  around Wilson's Corner (`raised-junctions-hybrid.png`). This was not measured more precisely.

## Driver's-eye comparison (same position, heading, 95° horizontal FOV, same views)

`driver-forward-*.png`, `driver-right-mirror-*.png`, `driver-interior-mirror-*.png`,
`drive-strip.jpg` (top constructed, bottom tiles, same route), `drive-*.mp4`.

| What the learner needs | Constructed | Google tiles |
| --- | --- | --- |
| Road and kerb clarity | Clear tarmac, kerbs, pavements | Smeared grey surface; kerbs not readable |
| Junction and roundabout shape | Authored (simplified), readable | Real shape visible from above; at eye level the mini-roundabout markings are not readable |
| Lane markings, give-way lines | Drawn, sharp | Not legible at eye level |
| Building fronts | Generic but tidy | Real Wilson's Corner buildings recognisable at 30–80 m, warped and melted up close |
| Trees | Simple | **At the start position, captured tree canopies come down to the ground as solid blobs on both sides of the car, blocking the view of the street.** |
| Parked vehicles, people | Ours, matched to colliders | Captured ones, frozen and smeared. Our colliders for our (now hidden) parked cars remain: invisible obstacles where the imagery may show none, or the reverse |
| Signs | Ours | Mostly illegible |
| Our road users (passing car, bus, pedestrian) | Visible | Visible and sharp: clearly "pasted on" against the blurred scene |
| Cockpit alignment | — | Correct: tiles share the scene and camera; no drift or lag as in the old A-Frame/Maps attempt |
| Mirrors | Usable | Usable geometry once mirror cameras also select detail (implemented); content is as smeared as the forward view; big cost (below) |
| Tile changes while driving | — | Detail refines over 1–3 s when moving into new ground; visible popping |
| Hybrid (our road over tiles) | — | Google's surface is up to 0.3 m above ours in places, so our road disappears under it in patches; our pavements do not follow Google's kerbs. Convincing hybrid would need per-junction reconstruction or a depth offset per area |

From the raised diagnostic view (not a driver view) the tiles look far better than the constructed
scene. From the driver's seat, where the exercises are judged, they do not.

## Performance (headless desktop, software WebGL, 1280×720, desktop profile)

Software-rendering numbers are useful **only as ratios** between modes. They are not phone figures.

| | Constructed | Tiles | Hybrid |
| --- | --- | --- | --- |
| Page ready | 1.3 s | 1.2 s | 1.1 s |
| First tile content | — | 1.3 s | 1.4 s |
| Settled (detail loaded, height measured) | — | 34 s | 41 s |
| Stationary fps, mirrors on (p95 frame) | 3.5 (384 ms) | 1.3 (895 ms) | 1.2 (944 ms) |
| Stationary fps, mirrors off | 5.6 | 1.5 | 1.4 |
| Draw calls per frame, mirrors on / off | 251 / 66 | 943 / 210 | 955 / 214 |
| Triangles in enabled meshes | 67 k | 640 k (621 k tiles) | 651 k |
| Short drive (10 s, ~40 m), fps / worst frame | 4.0 / 754 ms | 1.1 / 1.7 s | 1.1 / 1.9 s |
| JS heap at end | 62 MB | 279 MB | 258 MB |
| Tile requests / download, to settle (incl. mirror and raised views) | — | 1 050 / 94 MB | 1 061 / 94 MB |
| … plus the 10 s drive | — | +367 / +34 MB | +375 / +35 MB |

* Mirrors multiply tile draw calls by about 4.5. With mirrors choosing tile detail, more tiles load.
* Detail target: 16 px (desktop) and 24 px (phone profile, untested). The tile cache needs to be large
  (3 000 desktop / 1 500 phone). At 700 the cache filled, finer tiles were refused, the street stayed
  coarse and evicted tiles were downloaded again (~200 MB per session).
* GPU memory is not measurable here. A tiles session on an iPhone would need ~100 MB of downloads and
  several hundred MB of memory; Safari kills tabs that exceed its memory budget.
* **Stereo phone viewer:** not measured. The viewer renders two eye cameras, so the tiles' draw cost
  roughly doubles again (tile choice follows the driver camera, which both eyes share). Attribution is
  drawn in each eye (`#tiles-credit-stereo`).

## Configuration, usage and cost

* Key: `VITE_GOOGLE_MAPS_BROWSER_KEY` at build time only; no key in any committed file. Locally and in
  the preview workflow it is read from the legacy page on `main` (or a repository secret), masked in logs.
  It is visible in the built JavaScript, as any browser key is.
* **Finding:** the existing key is accepted with **no referrer** (and with any referrer tested). It
  appears not to be restricted to your sites. Nothing was changed. Consider adding HTTP-referrer
  restrictions (keep `vr.drivingpractice.live`, add the preview host) and an API restriction.
* Usage by this experiment: about 10 page loads in all (3 bare `root.json` probes, 7 browser sessions),
  so ≈10 root tileset requests and ≈9 500 tile requests (~0.85 GB in all, most from the first runs
  before the cache fix).
* Google bills Photorealistic 3D Tiles by root tileset request (session); tile requests inside a session
  are not billed separately. **Current prices and free allowance could not be read from this
  environment** (developers.google.com is blocked here): check the Cloud Console billing report.
  The cost model is per learner session, every session, because the tiles cannot be cached or bundled.
  Downloads (~100 MB per session) are a cost to the learner on mobile data.

## Policy and licensing (from Google's Map Tiles API policies and renderer guide)

* Required, implemented: Google logo plus the aggregated, sorted `asset.copyright` credits of the tiles in
  view, visible and unaltered, in normal and stereo views. The logo is loaded from Google's own host at run
  time (`maps.gstatic.com`), not copied. **Open:** confirm this logo asset and its placement meet Google's
  attribution guidelines.
* Not permitted, respected: prefetching, caching or storing tile content beyond HTTP cache headers;
  offline use; non-visualisation uses (analysis, extracting geodata). The tiles are scenery only. No road,
  kerb or footprint data is taken from them, and the height calibration only moves our scene to meet
  them. **Open:** whether that measurement counts as "machine interpretation" under the terms. It is
  needed for alignment, but ask before relying on it.
* **Open questions for Google or a lawyer before any product use:**
  1. Is a driving-judgement training simulation, with our own vehicles and pedestrians placed into the
     scene, a permitted use of Photorealistic 3D Tiles (Map Tiles API Service Specific Terms)?
  2. Is hiding parts of the tiles (or drawing our road over them) an alteration of the content?
  3. Screenshots and videos for marketing need the attribution; are there further rules?
  4. Captured cars and people are frozen into the scene and can contradict an exercise ("the road is
     clear" while a smeared car sits in the lane).

## Recommendation: keep the constructed environment; use tiles only for location previews

* **Street-level clarity:** worse than the constructed scene for everything a learner judges (markings,
  kerbs, give-way lines, gaps). Trees at the Brentwood start block the view entirely.
* **Educational control:** captured vehicles and people cannot be removed and conflict with scripted road
  users. Our pedestrians and cars look pasted on.
* **Mobile performance:** about 3× slower than the constructed scene in this software renderer, about 4×
  the draw calls with mirrors, about 10× the triangles, about 100 MB downloaded per session. It is
  unlikely to hold frame rate on an iPhone with mirrors, and stereo doubles the cost. This must be
  confirmed on the device.
* **Implementation effort:** the integration itself is small and reusable (two modules, three calls in the
  app). Making a convincing hybrid at street level would need per-junction reconstruction (masking,
  re-surfacing, captured-object removal), which defeats the point.
* **Running cost:** per learner session, every session, plus the learner's mobile data.

Where tiles are worth having: a raised or aerial **"see the place" preview** of the real junction
before an exercise (the raised view is genuinely useful and recognisable), using the same adapter and
coordinates. *Surrounding scenery only* (tiles beyond about 60 m) is a possible second step, but it
keeps the full download and memory cost and still shows warped buildings; it should only be tried after
an iPhone measurement.

## Checks run

* `npm run typecheck`, `npm test` (vitest, 18 files and 170 tests including the new coordinate tests,
  plus the migration tests): pass.
* Browser tests on the constructed mode (`g0`, `g3`, `g5`, `g10`, `g14`, SwiftShader): 12 of 13 pass.
  `g0 … recover focus` fails on a console 404. **The same failure happens on the untouched base commit
  `3c0d9bd` in this environment** (licensed models in `public/assets/licensed/` are not in a fresh clone),
  so it is not caused by this experiment. Constructed mode makes no Google requests (the logo image is
  only requested when tiles are in use).

## Reproduce

```
VITE_GOOGLE_MAPS_BROWSER_KEY=… npm run build
npm run preview
PW_CHROMIUM=/path/to/chromium node tools/experiments/tiles-compare.mjs docs/experiments/tiles-evidence constructed,tiles,hybrid --drive
```
Each tile-mode page load makes one billable root request. `?tilesHeight=152.5` skips calibration and
`?tilesError=24` changes the detail target. `window.__drivingPractice.tiles()` reports the state.
