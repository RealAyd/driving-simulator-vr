# Brentwood brief, step 3: cockpit, mirrors, controls and performance

Branch `rebuild/3d-judgement-simulator`, 2026-10-17.

## Your iPhone result (iPhone test build 1)

iPhone 14 Pro Max, Safari, landscape, inside the claude.ai preview page: **60 fps** reported by the HUD while driving the zebra-crossing exercise (phone quality profile). The earlier 8–17 fps figures were software rendering in the cloud container and did not reflect real hardware. Screenshots from that test showed the briefing box covering the interior mirror, a heavy windscreen header and A-pillars, and no door mirrors.

## What changed

- **Field of view**: fixed 95° horizontal (was a fixed vertical angle), so the 19.5:9 iPhone screen no longer stretches the cockpit.
- **Cockpit**: slim A-pillars angled from the dashboard corners to the roof; B- and C-pillars; doors and rear panel stop at the window line so side and rear windows are open for shoulder checks.
- **Mirrors**: interior plus **both door mirrors**, each a camera in the same world (driver's side flat 18°, passenger side convex 26°). Door-mirror housings are fixed to the back of the glass. A mirror renders only while its glass is on screen.
- **Views**: hold-to-look buttons (left shoulder, left mirror, rear mirror, right mirror, right shoulder) and keys Q/1/2/3/E. Holding a mirror narrows the view to 50° so the small glass is readable on a phone. Swipe or mouse look still works and is never pulled back.
- **Observation labels**: each glance records how it was made: `touch view button`, `keyboard view key`, `swipe-controlled view`, `mouse-controlled view` or `head direction` (VR). Never "eye tracking". Practice notes add "Looking at a mirror shows where you pointed the view, not what you noticed."
- **Assisted steering** (on by default on phones, a switch on the start screen): pure-pursuit path following of the exercise's lane path. Your own steering always overrides it, and results state when it was on.
- **Mirror and blind-spot check** practice: you stay parked while a magenta car overtakes on the right and a yellow cyclist filters up the left. The results list the views you used and whether you checked over the correct shoulder while each passed through your blind spot.
- **Phone layout**: briefing folds away after 7 s (Task button brings it back); status label hidden; compact speed box; view buttons between the indicator buttons; keyboard help hidden on phones; overlays scroll.
- Touch screens always get the phone profile (the iPhone in landscape is 932 px wide, above the old 900 px cutoff).

## Blind-spot geometry (and a correction)

The driver's door mirror covers 3–21° outward from straight back. An overtaking car 3.1 m to the side leaves the mirror when its centre is level with the learner's, and is seen directly once it is about 2 m ahead. The blind-spot zone used in the practice notes is therefore **from 2.2 m ahead to 0.4 m behind** the learner's centre, 1.2–4.5 m to the side. My first estimate (1.5 m ahead to 3.5 m behind) was wrong: the car was still visible in the door mirror for most of it. The shoulder view aims about 110° to the side and back, not 132°.

## Evidence (automated, cloud container: HeadlessChrome 141, SwiftShader, 932×430 touch viewport)

`tests/browser/g3-mirrors.spec.ts`, counting coloured pixels in real screenshots:

| Check | Pixels of the identifiable vehicle |
|---|---|
| Interior mirror, magenta car about 14 m behind | 705–728 |
| Right door mirror, car coming alongside | 3,677 |
| Right door mirror, car beside the driver (blind spot) | **0** |
| Right shoulder view, same frozen instant | over 2,000 (test threshold) |
| Left door mirror, yellow cyclist behind | 174–177 |

Screenshots: `verification/step3/g3-01` … `g3-06`. Glances in that run were all recorded as `touch view button`, and the results reported the right-shoulder check during the blind-spot moment.

Totals: 66 unit tests and 8 browser tests pass (G0, G1, G2 and step 3).

## Issues found and fixed during this step

1. Door-mirror glass was mounted on the front of its housing, so the driver saw the housing's back.
2. The passenger mirror, turned steeply towards the driver, swung part of its glass behind the housing.
3. The shoulder view aimed too far back and the blind-spot zone was wrong (see above).
4. Other cars had dark roofs, so a car alongside was invisible above the window line; roofs are now body colour.
5. The start screen did not fit a landscape phone.

## Not yet established

- Frame rate on your iPhone **with three mirrors** and the new cockpit: please measure test build 2.
- Whether the hold-to-look buttons and assisted steering feel right with thumbs.
- Phone VR (stereo viewer) is still only a feasibility note.
