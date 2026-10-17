# Asset register

Machine-readable register: `content/assets/register.json` (a unit test fails if a shipped model is missing from it or comes from a pack that does not allow redistribution). Original packs, ZIPs and Blend/FBX/OBJ sources are **not** stored in this repository; conversion scripts in `tools/assets/` rebuild the shipped GLBs from an extracted pack.

## Packs received

| Pack | Author | Licence | Public redistribution | Storage | Received |
|---|---|---|---|---|---|
| LowPoly Cars (`Patreon.com.zip`) | Quaternius | CC0 1.0 (public domain), `License.txt` in the pack | Allowed | Converted GLBs in the repository; originals kept out | 2026-10-17 |

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
