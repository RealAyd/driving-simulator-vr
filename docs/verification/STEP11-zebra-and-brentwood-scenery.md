# Step 11: zebra crossing street and Brentwood mini-roundabouts dressed to the Moving off standard

Branch `rebuild/3d-judgement-simulator`. Production `main` and vr.drivingpractice.live unchanged. Checked in headless Chromium with **software rendering** at the iPhone 14 Pro Max landscape size; **not yet checked on an iPhone or in a headset.**

Each exercise was finished and verified separately: the zebra street first (layout tests, view screenshots, its drive tests), then Brentwood.

## Zebra crossing

**What changed**

- The street is now the same project-owned streetscape as Moving off:
  - terraces, semis and detached houses, front and back gardens, walls, hedges and fences;
  - paths and drives, cars on drives, street lights, gullies, trees and bins.
- Parked cars use the CC0 LowPoly Cars models, with collision boxes the size of each model.
- The road now continues 290 m behind the start, so the mirrors and shoulder views show a street rather than the road's end. It also runs further on round the bend, which is smoothed.
- Distances along the road moved by +290 m with it. The crossing, the zones and the pedestrian are at exactly the same places on the ground (unit-tested).

**What did not change (the lesson)**

- **The van is in the same place and the same size** (2.0 × 5.3 × 2.3 m at x −2.4, z −95). It is now drawn as a white panel van: project-owned geometry that fills exactly its collision box. No free van model with a clear licence was found.
- **It is still the only thing hiding the waiting pedestrian.** A unit test traces sight lines from the driver's eye, along the approach and while moving out, to six points on the waiting pedestrian. Visibility with every new collider is identical to visibility with the van alone, and the van hides the pedestrian for most of the approach.
- **No street light on the crossing or its approaches.** Lights are kept 7 m clear of the crossing's edges, where the beacons stand. Nothing stands in the pedestrian's path.
- **Parked cars do not change the exercise:**
  - none on the learner's side ahead, apart from the van;
  - none on the opposite kerb from 50 to 140 m ahead, where the learner moves out to pass the van;
  - none on the learner's side within the following car's start (it drives up the lane from 35 m back).

  One car I first placed on the opposite kerb 24 m ahead was removed after the fast-attempt drive test collided with it.
- Controls, scoring and zones are unchanged. Drive tests G2 (careful attempt completes; fast attempt flagged) pass.

**Fixed along the way (all scenes)**

- **Road vanishing behind the grass:** the grass ground plane was one 2 km square of two triangles. In software rendering, from some viewpoints, it drew over the road (the road vanished). It is now subdivided. This affected every location, including Moving off.
- **Lamp column collisions are real:** a lamp column now has a collider. The G1 kerb test therefore picks a stretch of pavement with no column, using a new diagnostic, `staticObstacleAt`.
- **Mirror orientation test:** this now reads the interior mirror's own image. It uses strict paint colours, so brick and clay roofs do not count. The red car parked behind on the left appears to the left of the blue car behind on the right, and gets smaller as the car drives away.

Screenshots (`step11/zebra-*`): forward, interior mirror, left and right mirrors, left and right shoulders. There are also diagnostic-camera views (not driver views): eye height 60 m before the crossing with the pedestrian hidden, moved out to pass the van, the van from the pavement, and the crossing from above.

## Brentwood paired mini-roundabouts

**What changed**

- **Buildings:**
  - Every OpenStreetMap building outline (32 within the area) is drawn with brick, render, stone or concrete walls, windows on each storey, and a flat roof behind a parapet. Before, these were bare extruded walls.
  - Shopfronts (glazing, doors, stall risers, pilasters, a fascia and cornice; no names, logos or signs) appear only on buildings where OSM maps a business. That is 23 buildings, either tagged as a shop, café or bank or with a mapped business inside. Shopfronts go only on walls facing a road.
  - Car-park decks have open levels; the church has tall windows.
- **Heights:** storeys come from OSM where mapped (one building), otherwise estimated from the building's use. Each building records `heightSource: estimated` or `map-levels`.
- **Collisions** follow each building outline (walls 0.3 m thick, just inside it). The old plain walls had no collision at all.
- **Ground and areas:** the ground is paved (town centre). OSM grass, park and car-park areas are drawn.
- **Trees, lights and gullies:** OSM trees are drawn in the streetscape style, each with a trunk collider. Street lights stand at the back of the kerb every 30 m and gullies sit in the gutter. **The lights are representative: none are mapped in OSM here.**
- **Bus stop:** the mapped Wilsons Corner stop has a pole and flag. Six High Street stops are mapped 10–19 m from our simplified kerb line, probably in a lay-by we do not model, so they are not placed. That is listed as an uncertainty.
- **William Hunter memorial:** now drawn as a stone obelisk on a plinth, within its existing collision box.
- **Signal crossing:** the real High Street signal crossing now has **signal heads drawn from the exercise's own signal state** (new scenario field `signals`). This exercise simulates no pedestrian phase, so they show green throughout and the learner never sees a light that disagrees with what happens. The poles are solid.
- Generated by `tools/brentwood/osm_extract.py` and `build_location.py`. The extraction now also records building type and businesses. Roads, junctions, route, zones and traffic are unchanged; the generated scenario differs only by the `signals` entry.

**Checks**

- **Unit tests:**
  - no building wall, tree, light or bus stop on a carriageway or mini-roundabout;
  - the guided route (assisted steering) and the lead car's path touch no collider;
  - shopfronts only on business buildings facing a road;
  - lights on a pavement, clear of the junctions.
- **G5:** the guided route still drives start to finish.
- **G14:** every driver view, with review views from the diagnostic camera.

Screenshots (`step11/brentwood-*`): forward (signals green), interior mirror, door mirrors, shoulders, overhead of the area and of the junctions, eye-height views approaching each mini-roundabout, the memorial, and High Street shopfronts.

**Gaps and uncertainties (Brentwood)**

- **Sparse map data:** OSM maps few buildings here, so there are wide paved spaces between them, clearly visible from above. Real building outlines would need another source, for example Ordnance Survey OpenMap Local (Open Government Licence). That needs your approval and network access to os.uk.
- **Pavements:** modelled pavements are 2 m. The real High Street pavements and forecourts are wider; shop fronts stand 10–12 m behind our kerb.
- **Roofs** are flat everywhere, and building heights are mostly estimates.
- **Road behind the start:** the High Street ends about 37 m behind the start, which is visible in the interior mirror.
- **Lane markings and kerb lines** are simplified; give-way positions follow the junction radius, not a survey.

## Performance (software rendering in this container: not an iPhone)

Forward view with mirrors, stationary, 932 × 430, SwiftShader:

| Scene | Houses/buildings | Triangles | Vertices | Meshes | Colliders | Average fps | p50 / p95 frame |
|---|---|---|---|---|---|---|---|
| Zebra street | 74 houses, 20 parked cars | 83,600 | 151,400 | 94 | 1,364 | 12.8 | 73.5 / 134.6 ms |
| Brentwood | 32 buildings | 25,100 | 36,100 | 55 | 249 | 22.0 | 43.7 / 78.6 ms |
| Moving off (step 8, for comparison) | 70+ houses | about 63,000 | | | | 12–14 | |

Downloads (public preview, uncompressed): about 2.19 MB total, of which models 155 KB (the CC0 parked cars). No private or licensed files are requested. Only one exercise area is loaded at a time; the world is rebuilt when the exercise's location changes.

These numbers only compare scenes. Phone frame rates need the iPhone (About shows fps; please note it in the zebra and Brentwood exercises, and in the viewer).
