# Brentwood location: sources and licences

| Source | Used for | Licence / terms | Extracted into assets? |
|---|---|---|---|
| User-supplied Google Maps aerial screenshot (High St / Ongar Rd / Shenfield Rd / Ingrave Rd) | Reading relative road layout, building blocks, landmarks (by eye) | Google Maps/Earth terms; reference only | **No** |
| User-supplied Street View links and screenshots (3 panoramas, Aug 2024) | Camera positions (coordinates in the links), lane markings, signage, landmark appearance | Google Maps terms; reference only | **No** (coordinates read from the URLs only) |
| OpenStreetMap | Intended source for road geometry, lanes and junction positions | ODbL (attribution required) | Not yet: hosts blocked by the environment's network policy |

No geometry, texture or model has been copied from Google imagery. Positions marked "estimated" in `layout-draft.json` are approximations made by eye and must not be presented as surveyed.

## Update 2026-10-17: OpenStreetMap

OpenStreetMap became reachable after the environment's allowed domains were updated. The raw export is stored at `content/sources/brentwood-2026-10-17.osm` (OSM API 0.6, bbox 0.3020,51.6195,0.3090,51.6232). `tools/brentwood/osm_extract.py` converts it to `docs/brentwood/layout-osm.json`, and `render_overhead_osm.py` draws `overhead-osm.svg`. **Data © OpenStreetMap contributors, Open Database Licence 1.0** (https://www.openstreetmap.org/copyright); the credit must appear wherever the map data is shown, including in the simulator. Road widths are not in the data and are assumed from lane counts.
