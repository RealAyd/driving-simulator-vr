# Step 8: cockpit proportions, mirror refinement, left-mirror coverage, optional route guidance

Branch `rebuild/3d-judgement-simulator`. Production `main` unchanged. Screenshots from headless Chromium at the iPhone 14 Pro Max landscape size (932 × 430), public configuration. Not yet seen on the iPhone.

## Performance first

Frame rates in these screenshots (7–18 fps) are **software rendering in a cloud container**, not the iPhone. The next step is to measure the live build on the phone (About shows frame times). If the phone is similarly slow, detail stops and optimisation starts. What changed for cost in this step:

| Same view, same test (G9) | before | after |
|---|---|---|
| Draw calls per frame (all passes incl. mirrors) | 175 | 82 |
| Triangles | 63,405 | 63,846 |
| Software frame rate, mirrors on (2 runs) | 14.6 / 14.3 fps | 13.5 / 14.1 fps |

The cockpit's static parts are now merged into one mesh per material (dozens of boxes became a handful of meshes). Software rendering is limited by pixels and vertices rather than draw calls, so its frame rate barely moves; on a phone GPU, draw calls usually matter more. Only the device can tell.

## Cockpit

- **Pillars**: the A-pillars were boxes seen corner-on (about 13 cm apparent width). They are now slim tapered struts turned to face the driver: 7.5 cm at the base, 6 cm at the top, 5 cm deep. B- and C-pillars likewise; the C-pillar follows the rear window's slope.
- **Dashboard**: a moulded profile (top falling to the windscreen, rounded lip, fascia facing the driver) instead of a slab, with a centre screen, vents and a trim band.
- **Instruments**: a binnacle above the wheel hub with a working speedometer (0–70 mph) and green indicator tell-tales, redrawn only when they change. Also readable in the phone viewer.
- **Roof and doors**: slimmer roof header and rails, sun visors folded against the roof either side of the interior mirror, armrests, centre console. Steering-wheel rim and hub slimmer.
- `01-forward.png`, `05-left-shoulder.png`, `06-right-shoulder.png`, `07-instruments-and-dashboard-diagnostic-camera.png`.

## Mirrors

- **Shape**: rounded glass with a 6 mm black rim and a rounded shell behind it, instead of a rectangle in a thick box frame. Door-mirror shells are body-coloured.
- **Interior mirror**: on a slim 14 mm stem from a mounting point on the windscreen glass just below the header (the windscreen surface at that height), framed by the folded sun visors. Glass size unchanged (25 × 7 cm, a typical size).
- **Door mirrors**: carried by a black sail in the front corner of the side window on a short arm, rather than a long arm from the door.
- The reflected views (mirror positions, fields of view and adjustment) are unchanged, so earlier coverage measurements still apply.
- `02-interior-mirror.png`, `03-right-mirror.png`, `04-left-mirror.png`.

## Left mirror: is it useful, and is it plausible?

Measured, not argued (test G11). The yellow cyclist rides along the kerb from 80 m behind, directly behind the parked learner's car, then pulls out to pass. All three mirrors render every frame, and the cyclist's pixels are counted **in each mirror's own image** every 0.25 s; the screen holds the left-mirror view and was recorded (`step8/left-mirror-cyclist-approach.mp4`; data in `left-mirror-cyclist-coverage.json`).

| Cyclist behind the car (m) | Lateral, from the learner's centre line (m) | Interior mirror (px) | Left mirror (px) | Where in the left mirror (0 = driver's left of the glass, 1 = inner edge) | Right mirror (px) |
|---|---|---|---|---|---|
| 77 | −0.25 | 9 | 14 | 0.87 | 30 |
| 62 | −0.25 | 19 | 19 | 0.87 | – |
| 45 | −0.25 | 41 | 26 | 0.88 | – |
| 34 | −0.25 | 65 | 64 | 0.90 | – |
| 26 | −0.25 | 95 | 88 | 0.91 | – |
| 18 | −0.25 | 196 | 166 | 0.94 | – |
| 14.5 | −0.25 | 291 | 105 | 0.94 | – |
| 10.7 | −0.25 | 472 | **0** | – | – |
| 7 | +0.31 (pulling out) | 827 | 0 | – | – |
| 3.6 | +1.31 | 795 | 0 | – | 3,234 |
| alongside | +2.05 | 0 | 0 | – | – (right shoulder shows it) |

(– means 0 or 1 pixel, which is noise from the threshold.)

What this shows:

- The **left mirror shows the cyclist** at its inner edge, next to the car's own side, from about 75 m back until about 13 m behind, growing as it approaches.
- From about 11 m it **disappears from the left mirror behind the learner's own car**: the cyclist is directly behind the car, and the car's body blocks the line of sight from the left door mirror. The **interior mirror** shows it all the way in.
- As it pulls out to pass, the **right mirror** and then the **right shoulder** show it.

This is what real geometry gives for a car parked 0.15 m from the kerb with a cyclist behind it: nothing can be beside you on the left, so the left mirror shows mostly the kerb, pavement and gardens, with following traffic at its inner edge. The left mirror would show more when a cyclist can come up the inside (moving traffic, a gap at the kerb) or when you are leaving a space with room on the left. That is a different scenario, not something to fake here. The mirror's adjustment is the usual one (inner edge just shows the car's side).

## Route guidance optional

- The turquoise chevrons (and lane arrows) on the road are now **off by default**. An option on the exercise screen, *Show the pull-out path*, turns them on for learning the controls. It is shown only for exercises that have a path (Moving off safely).
- The results say when guidance was shown ("Route guidance was shown on the road (the pull-out path).") and the attempt record stores it (`session.started` event, `guidance`).
- `08-guidance-off-default.png`, `09-guidance-on.png`. Test G12.

## Tests

- Unit 111 passed. Browser: all passed (1 diagnostic skipped), including the new G11 (left-mirror coverage) and G12 (guidance).
- G3 now counts the purple car "alongside" in the right mirror's own image: with rounded glass, the on-screen rectangle's corners show the real car through the window beside the mirror, which is not what the mirror shows. The mirror's own image shows 0 pixels alongside (behind: 1,191 on screen).
