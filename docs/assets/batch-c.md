# Asset Batch C (British modular street scenery v0.1): integration (2026-10-19)

Pack: `Driving_Practice_Batch_C_Complete.zip`, supplied by the project owner. Register entry:
`driving-practice-batch-c`. `tools/assets/build-batch-c.sh <extracted folder>` rebuilds the shipped file.

## In use

| Model | Where | Replaces |
| --- | --- | --- |
| Street tree (`uk_street_tree_lod1`, simplified 2,056 → 358 triangles, 5.6 KB) | Every tree the scenes already place: the 24 mapped trees in Brentwood and the front/back garden trees on the practice streets | The drawn trunk and crown. Each is scaled to that tree's height and crown radius and turned by its position; trunk colliders unchanged |

All trees are instances of one mesh (`src/world/streetModels.ts`, `placeTrees`), so they cost one draw call
in total. Phone profile, main view without mirrors, against Batches A and B: draw calls +1 per scene;
triangles +7k (Brentwood), +10k (practice zebra), +16k (moving off, about 50 garden trees).

## Shop windows (2026-10-20)

Every shopfront's glazing now shows a lit window display, in the style of the pack's shop-shelves tile. Before,
it was a flat dark panel. Each display is drawn in code on the scenery detail sheet (`src/world/sceneryTextures.ts`),
so no image file is added.

Each mapped business shows what it is, chosen from its OpenStreetMap name (`shopDisplay` in
`src/assets/ukShopfronts.ts`):

| Display | Businesses |
| --- | --- |
| Pub bar | Pubs, e.g. Victoria Arms, The Swan |
| Café or takeaway counter with tables | Food, e.g. KFC, Greggs, Nando's, Nest Crêperie |
| Office | Banks, betting shops and agents, e.g. Lloyds, HSBC, Betfred, letting agents |
| Clothes rails | Charity and clothes shops, e.g. Sue Ryder, Cancer Research UK |
| Goods on shelves | Every other shop |

Unnamed units get shelves, or occasionally a clothes rail, chosen the same way every time.

Building outlines, colliders and sightlines are unchanged. Screenshots: `batch-c/windows-kfc-halifax.png`
and `batch-c/windows-boots.png`.

## Not used, and why

* **Buildings (12):** fixed-size generic modules; every building in the scenes is generated from its mapped
  footprint (Brentwood: OpenStreetMap/Overture outlines with the British shopfront variants; practice streets:
  terraces fitted to the plots). A fixed façade cannot be placed on those without changing the layout.
  Each also embeds the same 768 px texture (about 500 KB per file). The Boots- and Tesco Express-style
  fronts carry brand-like signs. Possible later use: façade or shopfront detail mapped onto the generated
  buildings, or a representative street that is not tied to a mapped place.
* **Road and pavement pieces (9):** the scenes build carriageways, kerbs, markings, junctions and crossings
  from the map data; the pack README itself says the mini-roundabout piece must not stand in for the
  surveyed Brentwood junctions.
* **Lamppost:** the same form (column, arm, lantern) as the drawn lamp column; a model would add draw calls
  without a visible gain.
* **Postbox, planter, hanging sign:** no mapped positions yet (OpenStreetMap has post boxes; adding them
  needs a map data update).
* **Traffic cone, roadworks barrier:** no roadworks exercise yet.
