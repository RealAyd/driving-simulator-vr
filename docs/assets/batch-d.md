# Asset Batch D (detail upgrade v0.2): integration (2026-10-20)

Pack: `Driving_Practice_Batch_D_Detail_Upgrade_Complete.zip`, supplied by the project owner. Register entry:
`driving-practice-batch-d` in `content/assets/register.json`. No file from the pack is stored in this repository.

**Decision (project owner, 2026-10-20): show the brands.** Brand names and colours are trademarks of their
owners. The About panel states that no affiliation with or endorsement by any business is claimed.

## In use: brand signs on mapped businesses

The sign styles from the pack's textures (brand lettering on brand colours; the pack notes they are approximate
interpretations, not traced logos) are reproduced in code (`src/world/brandSigns.ts`). Each is drawn only on the
shopfront fascia of a building whose OpenStreetMap name is exactly that business, and runs along that fascia
(up to 6 m):

| Business | Where | Screenshot (diagnostic camera at eye height on the pavement) |
|---|---|---|
| KFC | High Street, near the start of the mini-roundabouts exercise | `batch-d/kfc-high-street.png` |
| Tesco Express | High Street, west | `batch-d/tesco-express-high-street.png` |
| McDonald's | High Street, west end | `batch-d/mcdonalds-high-street.png` |
| Sainsbury's | Not shown: the mapped store stands behind its car park with no wall facing a road | |

Every other mapped business keeps plain lettering.

## Not used, and why

- **The 11 building GLBs** (Esso, Lidl, Aldi, Asda, Sainsbury's, Tesco Extra, Tesco Express, KFC, McDonald's, the
  Underground entrance) are fixed-size standalone stores. Our scenes draw every building from its mapped outline,
  and replacing an outline with a stock model would misplace walls and change sightlines. In Brentwood, KFC,
  McDonald's and Tesco Express are units in High Street parades, not standalone buildings, and Esso, Lidl, Aldi,
  Asda and Tesco Extra are not mapped in the current areas. These models can be placed where a future location
  has a matching standalone store.
- **The Underground station entrance** ("Embankment"): there is no Underground in Brentwood.
- **The taxi and the e-bike:** kept for later. A taxi could join the moving traffic once its collision size is
  checked.
