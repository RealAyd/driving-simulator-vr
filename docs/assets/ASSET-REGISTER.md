# Asset register

Machine-readable register: `content/assets/register.json` (a unit test fails if a shipped model is missing from it or comes from a pack that does not allow redistribution). Original packs, ZIPs and Blend/FBX/OBJ sources are **not** stored in this repository; conversion scripts in `tools/assets/` rebuild the shipped GLBs from an extracted pack.

## Packs received

| Pack | Author | Licence | Public redistribution | Storage | Received |
|---|---|---|---|---|---|
| LowPoly Cars (`Patreon.com.zip`) | Quaternius | CC0 1.0 (public domain), `License.txt` in the pack | Allowed | Converted GLBs in the repository; originals kept out | 2026-10-17 |
| London Street Starter (`london-street-starter.zip`, free sample) | Assets for three.js (Adapt Progress Evolve Ltd), models by JSTOV | Assets for three.js Model Licence v2, `LICENCE.txt` in the pack | **Not allowed** as files (shipping inside a finished app or website is allowed) | **Private** | 2026-10-17 |
| Street pack #145 (`street_pack.fbx`, `street_pack.blend`) | CADmando (file metadata) | **Unknown**: no licence supplied; some textures are web-sourced images (TfL map, sign photos) | Unknown, so treated as not allowed | **Private** | 2026-10-17 |
| Supermarket (`model_for_supermarket.glb`) | Unknown (three.js GLTFExporter export) | **Unknown**: no licence or receipt supplied | Unknown, so treated as not allowed | **Private** | 2026-10-17 |

**Private** means the optimised GLB is built locally into `public/assets/licensed/` (git-ignored) by `tools/assets/build-licensed.sh`. It is never committed to this public repository and never deployed to the public staging site. The simulator loads it only if present; otherwise the simple shapes are shown and the About panel says "no licensed scenery in this build".

## LowPoly Cars (Quaternius, CC0): suitability

Seven cars, each in Blend, FBX and OBJ. About 1,500 vertices and 6 flat-colour materials each, no textures: suitable for the iPhone as they are.

| Model | Size (W × H × L, m) | Suitable for UK practice | Notes |
|---|---|---|---|
| NormalCar1 | 1.81 × 1.18 × 4.22 | **Yes, integrated** | Matches the 1.8 × 4.3 m collision box; body paint recoloured per road user |
| NormalCar2 | 1.64 × 1.15 × 3.31 | Yes | Small hatchback; good for parked cars |
| SUV | 2.11 × 1.53 × 4.21 | Yes | Taller: blocks views more (useful for restricted-view scenes) |
| SportsCar, SportsCar2 | about 1.8 × 1.2 × 3.95 | Yes, sparingly | Variety |
| Taxi | 1.81 × 1.31 × 4.22 | Not as is | North-American yellow cab livery; would need recolouring and the roof sign removed |
| Cop | 1.78 × 1.24 × 3.73 | Not as is | Non-UK police livery; misleading in a UK judgement exercise |

The pack contains cars only: no buildings, traffic lights or street furniture.

## Shipped models

| File | Source | Modifications | Size |
|---|---|---|---|
| `public/assets/models/vehicles/quaternius-normal-car-1.glb` | NormalCar1.obj/.mtl | obj2gltf 3.2.0; glTF-Transform 4.5.1 weld, dedup, join, prune, quantize; at load: StandardMaterial of the same colours, body recoloured, turned 180°, scaled to the collision length | 113 KB, 2,954 triangles, 6 materials |

## Integration

- Used for every other road user's car (moving-off purple car, zebra following car, Brentwood lead car). Parked cars and the learner's own car are unchanged.
- Visuals only: collision boxes, mirror rendering and assessment are unchanged. If the model cannot load, the previous simple car shape is used and the About panel says so.
- The glTF loader is loaded on demand (about 37 KB gzipped extra), so the first screen is not slowed.

## London Street Starter (licensed, private): suitability

| Model | Suitable | Notes |
|---|---|---|
| Terrace house (london-residential-benchmark), low detail | **Yes, integrated (private)** | 4,846 triangles, 21 materials, 8 textures, 257 KB after optimisation. Medium/high levels are too heavy for several copies on the phone |
| Restaurant shopfront | Yes | High-street scenes |
| Railing, gate, planter, A-board, café table and chair | Yes, small props | Pavement clutter for restricted-view exercises |

The pack has no vehicles or traffic lights.

## Street pack #145 (licence unknown, private): suitability

| Object | Triangles | Suitable | Notes |
|---|---|---|---|
| Traffic Lights | 3,736 | **Yes, integrated (private)** | 0.25 × 2.39 × 0.28 m signal pole; red, amber and green lenses with green lit as modelled. Signals are not simulated, so the lamps never change |
| Postbox | 4,200 | Yes | |
| Bus Stop | 14,000 | With simplification | Its texture includes a TfL route map image (rights unclear) |
| Crosswalk | 8,500 | Check | |
| Clearway, junction and street signs | small | Only with replacement artwork | Sign faces are web-sourced images; UK sign artwork should come from the Department for Transport's TSRGD files (Crown copyright, Open Government Licence) |
| Telegraph poles, drain, wheelie bin | small | Yes | |
| Bin | 11,000 | Too heavy for a bin | Needs decimation |
| Phone box | 61,000 | No | Far too heavy for the iPhone |

## Supermarket (licence unknown, private)

2,304 triangles, 12 materials after optimisation, 92 KB, 20.7 × 5.15 × 18.4 m. **Integrated (private)** on the east side of the Moving off safely street, shopfront facing the road.

## Private models in use

| File (git-ignored) | Placement | Replaces |
|---|---|---|
| `public/assets/licensed/a3js-london-terrace-house-low.glb` | Moving off safely, west side, facing the road | simple block `house-w-1` (collision kept) |
| `public/assets/licensed/supermarket.glb` | Moving off safely, east side, facing the road | simple block `house-e-1` (collision kept) |
| `public/assets/licensed/cadmando-traffic-lights.glb` | Brentwood, learner's near-side pavement before the High Street signal crossing, lamps facing the approach | nothing (added) |

Placements are in each location's `models` list. Collision boxes, mirror rendering, controls and scoring do not depend on the models. Screenshots (local build with the private models): `docs/verification/assets/`.
