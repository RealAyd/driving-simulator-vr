# British shopfront catalogue — Brentwood integration

**Status:** code integrated on `rebuild/3d-judgement-simulator`, not browser verified in this session.

## Asset definitions and reuse
`src/assets/ukShopfronts.ts` exports `shopfrontVariant(buildingId, unitIndex, unitWidth)`. Stable IDs are `uk-shopfront-compact`, `uk-shopfront-glazed`, `uk-shopfront-traditional`. Building location, name, footprint, height, facade material and provenance remain in the location data; generic shopfront styles never invent a business name.

The procedure uses metres: Babylon scene horizontal X/Z and vertical Y; street-facing front outward from the building wall. Door recesses are towards the interior, bounded by the mapped facade. Geometry is generated with existing static material batches and the existing scene root, which owns disposal. There are no additional image downloads, GLBs or third-party textures.

## Applying to another location
1. Record legal map/field evidence in the new location's source register, together with confidence and date.
2. Add buildings and names to the location file; use a mapped `shop` building type only where justified.
3. `layoutTownscape` determines street-facing walls, `townBuilding` uses the shared variants, and `layoutSignage` labels only named shops.
4. Load the new location with the existing scene loader. Never reuse Brentwood placements as if they were surveyed for another centre.
5. Verify forward driver-height views, mirrors and shoulders, then check scenario collisions and unit/browser tests.

## Remaining acceptance work
- Verify the exact High Street start and end extents from route geometry and complete unmodelled real-world details.
- Independently verify shop occupancy, regulatory marking placement, shelters and bus route data against dated references.
- Add the broader asset gallery, full object catalogue, motorbike/delivery and pushchair variants only as needed.
- Run `npm run typecheck && npm test && npm run build && npm run test:browser` in a working checkout.
- Capture new driver-view screenshots and actual iPhone landscape/viewer frame times.

Previous baseline evidence: `docs/verification/STEP14-street-life.md`. Existing image and video artefacts are historical; none proves this commit works.
