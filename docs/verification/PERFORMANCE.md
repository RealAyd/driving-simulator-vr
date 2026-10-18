# Performance report

Two kinds of evidence are kept apart:

1. **Software-rendering measurements in this build environment and CI** (SwiftShader, no GPU). They compare scenes and catch regressions. They say nothing about how the iPhone will run.
2. **The real-iPhone acceptance check** (section 3), which has **not been done yet**.

The browser test G1 "rendering smoke test" only checks that frames keep rendering while driving. It is not a performance test and does not judge frame rates.

## 1. Scene cost (software rendering, 932 × 430, forward view with mirrors, stationary)

Measured 2026-10-18 in this container. Sources: G13 (zebra), G14 (Brentwood), the step 8 measurement (Moving off) and, for step 14, `PERF_PROBE=1 npx playwright test perf-probe` (all three exercises, same conditions before and after).

| Scene | Triangles | Vertices | Meshes | Colliders | Average fps | p50 / p95 frame |
|---|---|---|---|---|---|---|
| Moving off (step 8) | about 63,000 | | | | 12–14 | |
| Zebra crossing street | 50,100 | | 88 | 869 | 16.0 | about 60 / 100 ms |
| Brentwood mini-roundabouts (60 buildings, 13 of them approximate; street extended behind) | 38,400 | 59,200 | 67 | 429 | 18.7 | 53 / 90 ms |
| Brentwood, step 13 (287 buildings, 157 of them background in low detail; ground areas) | 65,400 | 115,000 | 110 | 2,063 | 19.7–22.5 | 51 / 64–73 ms |
| Step 14 before → after (two runs each; people are instances and not in the triangle count), Moving off | 67,060 → 67,156 | | | | 18.0–18.9 → 18.7–20.4 | |
| Step 14, zebra | 50,070 → 49,658 | | 88 | | 19.2–20.1 → 20.3–22.0 | |
| Step 14, Brentwood (signs, 38 shop names, about 36 people, 2 buses) | 65,372 → 67,278 | | 118 | | 17.5–17.8 → 14.7–17.0 (interior mirror 14.3–14.7 → 13.0–14.3) | |
| Phone viewer, Moving off (step 9) | | | | | about 9.9 | |

- **Downloads** (public preview, uncompressed): about 2.4 MB per visit, of which models are 155 KB (CC0 parked cars). The main script is 1.05 MB (gzip 275 KB), including the Brentwood location data (0.45 MB). No private or licensed files are requested.
- **One area at a time:** only one exercise area is loaded at once. The world is rebuilt when the exercise's location changes.
- **CI runners:** in CI, the dressed streets have rendered at about 1 fps on some runs, so browser tests wait on simulated time and allow long timeouts.

To repeat these measurements: `PERF_PROBE=1 npx playwright test perf-probe` (add `PERF_PROBE=detail` to see the cost of each layer: fog, parked cars, scenery, mirrors). The scene tests G13 and G14 also print a `SCENE` line.

## 2. What has been done to keep cost down

- Scenery is drawn with three shared materials and vertex colours, in 200 m sections, with back faces culled.
- Parked cars are baked into one mesh per section.
- The zebra street's houses run only as far as the views show.
- Low-poly beacons and heads.
- Mirrors render only when visible, and the one being looked at refreshes every frame.

## 3. Outstanding: real-iPhone acceptance check (iPhone 14 Pro Max)

**Not yet done.** No claim is made about phone or headset performance until it is.

Proposed procedure (please confirm or change the targets; they are our draft, not a standard):

1. Open the preview in Safari (and once from the Home Screen). For each exercise (Moving off, Zebra crossing, Brentwood), start it and open **About**. Note the fps shown while:
   - parked, looking forward;
   - looking at each mirror;
   - driving.
2. Repeat Moving off in the phone viewer (stereo) with the headset.
3. Note any stutter when turning the head, any heat, and the battery drop over 10 minutes.

Draft targets for acceptance:
- **Normal mode:** a steady 30 fps or better, with no visible stutter when switching views.
- **Phone viewer:** 30 fps or better with no judder when turning the head. If it is lower, scenery detail is reduced before anything else is added.

| Check | Result |
|---|---|
| Moving off, normal mode | not yet measured |
| Zebra crossing, normal mode | not yet measured |
| Brentwood, normal mode | not yet measured |
| Moving off, phone viewer | not yet measured |
