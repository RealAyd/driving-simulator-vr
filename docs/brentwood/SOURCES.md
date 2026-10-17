# Brentwood location: sources and licences

| Source | Used for | Licence / terms | Extracted into assets? |
|---|---|---|---|
| User-supplied Google Maps aerial screenshot (High St / Ongar Rd / Shenfield Rd / Ingrave Rd) | Reading relative road layout, building blocks, landmarks (by eye) | Google Maps/Earth terms; reference only | **No** |
| User-supplied Street View links and screenshots (3 panoramas, Aug 2024) | Camera positions (coordinates in the links), lane markings, signage, landmark appearance | Google Maps terms; reference only | **No** (coordinates read from the URLs only) |
| OpenStreetMap | Intended source for road geometry, lanes and junction positions | ODbL (attribution required) | Not yet: hosts blocked by the environment's network policy |

No geometry, texture or model has been copied from Google imagery. Positions marked "estimated" in `layout-draft.json` are approximations made by eye and must not be presented as surveyed.

## Update 2026-10-17: OpenStreetMap

OpenStreetMap became reachable after the environment's allowed domains were updated. The raw export is stored at `content/sources/brentwood-2026-10-17.osm` (OSM API 0.6, bbox 0.3020,51.6195,0.3090,51.6232). `tools/brentwood/osm_extract.py` converts it to `docs/brentwood/layout-osm.json`, and `render_overhead_osm.py` draws `overhead-osm.svg`. **Data © OpenStreetMap contributors, Open Database Licence 1.0** (https://www.openstreetmap.org/copyright); the credit must appear wherever the map data is shown, including in the simulator. Road widths are not in the data and are assumed from lane counts.

## Update 2026-10-17: drivable location (step 4)

`tools/brentwood/build_location.py` turns `layout-osm.json` into `content/locations/brentwood-paired-mini-roundabouts.json` and the guided exercise `content/scenarios/brentwood-guided-traversal.json`. The simulator shows "Map data © OpenStreetMap contributors (ODbL)" on screen while this location is in use.

| Simulator road | OpenStreetMap ways | Simplifications |
|---|---|---|
| `high-street` | 1307620631, 1307620632, 1307620630, 820166003 | 2 lanes × 3.2 m, two-way; corners rounded |
| `ingrave-in` / `ingrave-out` | 829734450 / 793487376 | one-way pair; 2 lanes in, 1 lane (3.5 m) out |
| `link-north` / `link-south` (Wilson's Corner) | 820166006 / 793487370 | 2 lanes towards rb2, 1 lane back |
| `shenfield-in` / `shenfield-out` / `shenfield-road` | 793487371 / 793487378 + 793487372 / 424647832 | one-way pair joining the two-way road |
| `ongar-in` / `ongar-out` / `ongar-road` | 1304276722 + 793487377 / 1304276721 / 725959965 | one-way pair joining the two-way road |
| Mini-roundabouts rb1, rb2 | nodes 7419454984, 7419456091 | 6 m clear radius, 2.6 m painted disc (disc size not in OSM: estimated) |
| Buildings (32) | OSM building outlines within about 110 m | walls only; height 9 m where levels are not tagged |
| Trees (22), William Hunter memorial | OSM nodes | simple shapes |
| Signal crossing, High Street | node 8906638846 | studs and stop lines only; the lights are **not simulated** yet |

Kerb lines at the junction corners, lane arrows, signs and real road widths are not in the data and are not modelled. The start point is the first Street View position (S0) moved onto the eastbound lane.
