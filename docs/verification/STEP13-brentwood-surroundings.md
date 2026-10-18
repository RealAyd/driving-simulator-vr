# Step 13: Brentwood surroundings filled from references, with provenance

Branch `rebuild/3d-judgement-simulator`. Production `main` untouched. Label: **Brentwood area-inspired practice, unreviewed.** Software rendering only; **not yet checked on the iPhone.**

The aim is a recognisable Brentwood setting, not a replica. Gaps in OpenStreetMap are filled from a second licensed source and from evidence in the map data. Each element records whether it is mapped, reference-estimated or representative.

Review plan: `docs/brentwood/location-review.svg` (also `step13/00-location-review-plan.png`). It is coloured by provenance, as listed in its legend.

## 1. References used

| Reference | Licence | What it gives | Where |
|---|---|---|---|
| OpenStreetMap, API 0.6 map call, bbox 0.2960,51.6175,0.3120,51.6250, downloaded 2026-10-18 (replaces the smaller 2026-10-17 extract) | ODbL 1.0 | Roads and side roads; building outlines and building types; businesses and addresses mapped as points; footways, service roads and parking aisles; car parks, parks and grass; trees; bus stops; signal crossings | `content/sources/brentwood-2026-10-18.osm`, `tools/brentwood/osm_extract.py` |
| Overture Maps buildings, release 2026-09-23.1: only the **Microsoft ML Buildings** outlines that have no OSM equivalent | ODbL 1.0 (© OpenStreetMap contributors, Overture Maps Foundation, Microsoft) | Machine-detected building outlines with machine-estimated heights, where OSM has no outline | `content/sources/overture-buildings-brentwood-2026-09-23.1.json`, `tools/brentwood/overture_extract.py` |

- **Unreachable sources:** Ordnance Survey, GOV.UK and Geofabrik could not be reached from this environment. They were not needed.
- **Street imagery:** not used. No imagery was extracted.
- **Tooling:** the two scripts need `pip install shapely pyarrow`.

## 2. What is in the scene, and how it is known

| Element | Count | Provenance | Notes |
|---|---|---|---|
| Driven roads, junctions, side-road mouths | 14 roads, 2 mini-roundabouts | **mapped** (OSM centrelines) | Geometry is unchanged from step 12, apart from the High Street now running about 350 m behind the start (way 671087285 in full; three signal crossings). The western end (`high-street-49218144`, 30 m) is the street's continuation. |
| Buildings with OSM outlines | 188 (90 near, 98 background) | **mapped** outline and type | Storeys from OSM where mapped (39 buildings), otherwise estimated from use. |
| Buildings with Microsoft outlines | 79 (20 near, 59 background) | **reference-estimated** (`source: reference`, `heightSource: reference-estimated`) | Kept only where they do not overlap an OSM building, a car park or park, a road or pavement, or another street (2 dropped). Heights from the Microsoft estimate. |
| Approximate buildings | 20 | **representative**, each with its evidence | 18 stand where OSM maps businesses or addresses as points with no outline, for example The Dairyman (16–18 High Street), cafés at 3–5 Moores Place, the St Thomas Road parade and 36–63 High Street. Each is a street-aligned block 12 m deep covering the points, trimmed clear of roads, paths and buildings; mapped shops make it a shop with shopfronts. The other 2 close gaps of under 21 m in a built-up frontage. |
| Background ring (75–170 m from the driven roads) | 157 buildings | as above | Drawn in low detail (walls and roof, no windows) so views do not end at the dressed streets. |
| Roof styles | 89 pitched, 198 flat | **representative** | OSM maps no roof shapes here. House-sized buildings (under 220 m², under 10.5 m, four-sided) get a gable roof; others a flat roof and parapet. |
| Other streets (not driven) | 218 surface pieces | **mapped** centrelines, assumed widths | Drawn as tarmac so the street network reads as connected. Not drivable. |
| Footways and service roads | 686 pieces | **mapped** | Drawn as paths and access drives. |
| Car parks | 5 OSM areas, plus areas around 46 parking aisles | **mapped** / **reference-supported** | Where OSM maps aisles but not the car park itself, the aisle with a row of bays each side. |
| Gardens | 53 pieces | **representative** | Grass around house-sized buildings outside the commercial core, clear of roads, paths and car parks. Plot boundaries are not mapped. |
| Landscaped open land | 8 patches | **representative** | Open land that no reference explains, of 200 m² or more, beside the junctions or with mapped trees, drawn as grass. The other 25 unexplained patches stay paving (forecourts, yards). **All 33 are listed with coordinates and map links in `docs/brentwood/open-areas.json` for checking against imagery.** |
| Pavements up to shop fronts | 8 roads | **derived** from map data | Unchanged rule, recomputed after the approximate shops were added. Pavements never pass under a non-shop building, and shops recessed behind a neighbour keep a small forecourt (up to 2 m). |
| Trees, bus stops, memorial | 24 trees, 6 bus stops, 1 memorial | **mapped** positions | Memorial size estimated; its setting (15 m) kept open. |
| Street lights | every 30 m | **representative** | Not mapped here. |

## 3. Hazard visibility

New buildings could hide approaching traffic at the mini-roundabouts. A unit test traces sightlines from the learner's lane over the last 35 m of the High Street approach (rb1) and the Wilson's Corner approach (rb2). It traces them to traffic on Ingrave Road and Shenfield Road (from the right), over their last 45 m.

**No reference or approximate building hides any sightline that the mapped buildings leave clear.** More than 50 sightlines are checked for each approach.

Placement rules also keep new buildings away from the junction areas (radius plus 6 m), from every road and pavement, and from the memorial's setting.

## 4. Mirror views and behind the learner

The High Street now runs about 350 m behind the start, past the haze distance, with both kerbs built up (OSM, Microsoft and approximate parade blocks) and the background ring beyond. See `step13/02-interior-mirror.png` and `08-high-street-behind-start-eye-height.png`.

## 5. Checks

- **Unit tests:** 138 pass. New or changed tests cover:
  - approximate buildings all carry evidence and estimated heights, and stand off every road and pavement;
  - shopfronts on approximate buildings only where a mapped business is the evidence;
  - Microsoft outlines are labelled `reference` and are never on a carriageway;
  - the sightline test at both mini-roundabouts;
  - all three High Street signal crossings are held green by this exercise only.
- **Browser tests:** G5 (guided route) and G14 (all views) pass. The full suite is run before commit.

Screenshots in `step13/`:
- driver views: forward, interior mirror, door mirrors, shoulders;
- the rb1 approach at eye height;
- the High Street behind the start at eye height;
- overhead views of the area, the junctions and the High Street west;
- the west crossing, the shopfronts, the memorial and the link to rb2.

## 6. Cost (software rendering, not an iPhone)

| | Step 12 | Step 13 |
|---|---|---|
| Buildings | 60 | 287 (157 in low detail) |
| Triangles | 38,400 | 65,400 |
| Colliders | 429 | 2,063 |
| Average fps / p95 frame (forward view with mirrors) | 18.7 / 90 ms | 19.7–22.5 / 64–73 ms |
| Location data | 0.1 MB | 0.45 MB (bundled; gzip about 0.1 MB) |
| Page download (uncompressed) | 2.2 MB | 2.4 MB |

The phone check in `PERFORMANCE.md` section 3 is still outstanding.

## 7. Remaining uncertainties

- **Microsoft outlines:** machine-detected, and their heights are estimates. Some may be outbuildings or out of date.
- **Approximate buildings:** positions, sizes and heights are estimates around the mapped points; uses come from those points.
- **Open land:** 33 patches are open in every reference. Each is drawn as landscaping or paving by rule and needs checking against imagery (`open-areas.json`).
- **Roofs:** styles and colours are representative.
- **Other streets:** widths are assumed and they are not drivable; side-road mouths still have no give-way markings drawn.
- **Unchanged from step 12:** kerb lines, lay-bys and lane markings are simplified, and the test centre remains unverified.
