# Photorealistic Babylon experiment — initial audit (2026-10-18)

## Provenance and isolation
Source branch `rebuild/3d-judgement-simulator`, SHA `3c0d9bdf9adaed580dfc627ecc4392b560ed5db1`.
Experiment branch `experiment/babylon-photorealistic-tiles`. The root `index.html` is legacy; current app starts at `sim/index.html` -> `sim/main.ts` -> `src/app/main.ts`. Build `npm run build` outputs `dist-sim`.

## Modules to reuse
- `src/engine/babylonAdapter.ts`: already **right-handed**, X east, Y up, Z south. A compass heading is negative Y rotation.
- `src/app/main.ts`: one Babylon Scene and FreeCamera; 95° **horizontal** FOV, near .05m, far 3000m. Preserve this camera instead of using a separate maps canvas.
- `src/cockpit/cockpitModel.ts`, `mirror.ts`, `seat.ts`: reuse driver eye and reflectors.
- `src/vehicle/vehicleController.ts`, `src/world/roadGeometry.ts`, `src/world/collisions.ts`: own motion and collision geometry independently of imagery.
- `src/world/buildWorld.ts`, `streetscapeMesh.ts`, `signageMesh.ts`, `peopleMesh.ts`: constructed comparator; must not alter existing scoring actors.
- `content/locations/brentwood-paired-mini-roundabouts.json`: OSM-derived centreline, two junctions rb1 (7.87,7.89), rb2 (16.83,-9.01), spawn (-29.26,19.4), heading 64.4°. Exercise described as geographically inspired; do not treat as survey-grade.
- `docs/brentwood/layout-osm.json`: confirmed OSM origin 51.6213112, 0.3055506; existing converter uses approximate flat-earth x east / z south mapping.

> **Superseded by results:** live tiles were integrated and measured; see
> `babylon-photorealistic-tiles-results.md`. The audit below is kept as written.

## No live tile results yet (at the time of this audit)
The experimental `src/experiments/tiles/geospatial.ts` provides a reversible WGS84 ECEF -> local basis, with **explicit ellipsoid reference height**. No reference altitude has been surveyed. The 0m in authored roads is relative, not a WGS84 altitude.

## Renderer viability
NASA-AMMOS 3DTilesRendererJS supports `3d-tiles-renderer/babylonjs` and a `TilesRenderer(url, scene)`, `tiles.update()`, `tiles.dispose()` lifecycle. It requires a right-handed scene (already satisfied). Limitations: region bounds support, caching, camera-based selection. A real adapter needs a verified geospatial transform from tile ECEF into the existing local scene, plus proper camera selection, asset loading, dynamic credit aggregation, mirror camera testing, and teardown. A tileset's unadjusted ECEF cannot just be parented into the metre-scale world.

## Restrictions / open gates
- Do not use/copy legacy keys; require approved, hostname-restricted Map Tiles API browser credentials and authorised billing/quotas before any live requests.
- Google Maps logo and every visible tile's changing `asset.copyright` data must be aggregated and displayed; overlays must be clearly identified as independently authored. Must work in normal and stereo views.
- Do not cache/prefetch/extract Google mesh/roads; respect permitted HTTP caching only. No extraction of collision or road datasets.
- Assess visibility of duplicate street surfaces, baked-in pedestrians/cars, junction markings, missing kerbs; tiles are visual-only.
- Separate desktop/automated numbers from real iPhone measurements. A 60fps screenshot is not a benchmark.
- No iPhone URL, matching screenshots, live tile requests, or measured performance are available from this scaffold. Do not imply otherwise.

## Decision gate
Do not enable tile mode in Driving Practice until a live Babylon same-camera overlay passes street-eye alignment, required credits, road safety clarity, and real iPhone performance. Starting recommendation: retain constructed mode as authoritative; consider tiles only as *optional scenery* if the controlled evidence supports it.

References:
https://github.com/NASA-AMMOS/3DTilesRendererJS
https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/src/babylonjs/renderer/README.md
https://developers.google.com/maps/documentation/tile/policies
