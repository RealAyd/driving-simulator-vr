# Asset Batch A: integration (2026-10-19)

Pack: `Driving_Practice_Batch_A_Complete_6.zip` (v0.1.0), supplied by the project owner. Provenance and
licence notes: `content/assets/register.json` (packs `driving-practice-batch-a` and
`driving-practice-batch-a-buses`). The pack itself is not stored in the repository;
`tools/assets/build-batch-a.sh <extracted folder>` rebuilds the shipped files.

## In use

`src/world/streetModels.ts` puts the models where the scenes already place these objects. Positions,
colliders, zones and scoring are unchanged, and the drawn shapes remain wherever a model does not load.

| Model | Where | Replaces |
| --- | --- | --- |
| Belisha beacon | Both sides of every zebra (practice street, Kings Road) | Drawn pole and globe |
| Bus shelter (modern) | Mapped shelters on the Brentwood route (5) | Drawn shelter. Fitted to the planned footprint the collider uses (about 0.75 × along the kerb, 0.65–0.9 × across) |
| Vehicle signal, green | Signals the Brentwood exercise holds at green (3 crossings, 6 heads) | Drawn head, lenses and pole. Simplified from 4,092 to 1,226 triangles |

Cost, phone profile, main view without mirrors (headless software rendering, same view as the unchanged
rebuild `1984134`): draw calls 66 → 58 (Brentwood), 73 → 71 (Kings Road), 75 → 73 (practice zebra); triangles
+7.7k, +2.1k, +2.1k. Downloads: +53 KB in all.

## Not used yet, and why

* Bus flag and timetable: the drawn flag carries the mapped stop name and stop letter; the model's
  "BUS / STOP" plates do not.
* Signal red, amber, red-and-amber and off variants, pedestrian and toucan heads: need a signal
  controller (exercises currently hold signals at green). They are meant to be switched by visibility.
* Speed camera, generic station entrance, speed-table and zebra road-section markings: the pack README
  says each needs site verification; markings are drawn from the map data.
* Bench, litter bin, bollard, railings, boundary wall, telephone kiosk, timetable display: no mapped
  positions yet. Placing them needs map data or a survey of the selected streets.
* Buses: rights unconfirmed, the populated versions are about 18.8 MB each (about 266,000 vertices), and
  bright red London-style buses do not match Brentwood's operators. The drawn bus stays.
