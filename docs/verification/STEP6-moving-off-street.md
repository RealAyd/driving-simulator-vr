# Step 6: the Moving off safely street, fully dressed

Branch `rebuild/3d-judgement-simulator`. Production `main` unchanged. The assessment rubric is still a draft, not reviewed by an instructor and not DVSA criteria. Everything below was captured from the **public preview configuration** (no private or licensed files present; the test fails if any are requested).

## What changed visibly

- **A complete low-rise British residential street** on both sides, built from four reusable house variants (project-owned geometry, `src/world/streetscape.ts` and `streetscapeMesh.ts`):
  - Victorian-style **terraces** of up to four houses (4.8 m frontages, small front gardens behind low walls, chimneys on the party walls, alleys with tall gates);
  - 1930s-style **semi-detached pairs**, with and without **ground-floor bay windows** (hipped roofs, doors on the outer sides, porch canopies);
  - **detached houses** with a front gable.
- Brick (red, brown, buff) or render (cream, white) walls; slate or clay roofs; door colours from a restrained palette. Styles and palettes repeat in a planned order per stretch of street, not at random; door colours, boundaries, bins and cars on drives vary from a fixed seed (the street is the same every time).
- **Front gardens** 3.5 m (terraces) to 7 m, a step down from the pavement, with paths to every door, **drives** between semis and detached houses, and boundaries of low brick walls with copings, hedges or fences. Side fences between gardens, close-boarded back-garden fences and gates, rear windows seen through the gaps, trees in some front gardens and more behind the houses (showing above the roofs), wheelie bins, street lights at the kerb edge alternating sides, and road gullies in both gutters.
- **Parked cars** use the CC0 Quaternius models at their real size: saloon (4.22 m), hatchback (3.31 m) and SUV (4.20 m), in everyday colours (none purple or yellow), each with a soft ground shadow. Eight at the kerb (east-side cars face south, with the traffic on that side) and fourteen on drives.
- **The street no longer ends in the mirrors**: the road now continues 210 m behind the start (it began only 120 m behind), the far end bends away between houses, and a light distance haze fades the far street into the sky.
- **Removed**: the trial supermarket, five-storey Downtown building and London terrace house from this street, and the always-green CADmando signal pole from Brentwood (signals are not simulated; a signal that never changes would mislead). See `docs/assets/ASSET-REGISTER.md`.

Screenshots (`step6/`, iPhone 14 Pro Max landscape viewport, 932 × 430, touch): `01-forward`, `02-interior-mirror`, `03-left-mirror`, `04-right-mirror`, `05-left-shoulder`, `06-right-shoulder` (each labelled by the on-screen "View:" label), `07`–`09` close-ups from a diagnostic camera at eye height on the pavement (labelled "Diagnostic camera (not a driver view)" on screen), `10-safe-gap-results`, `11-conflict-results`. Recording: `step6/moving-off-dressed-street.mp4` (33 s: the purple car and the cyclist pass while the learner selects each view).

## Assets used

| Asset | Source / licence | Use |
|---|---|---|
| House variants, boundaries, street lights, bins, gullies, trees | Project-owned geometry; textures (brick, roof tiles, windows, doors, hedge, fence boards, paving, grate) drawn at load time, no image files | Whole street |
| `quaternius-normal-car-1-parked.glb`, `-normal-car-2-parked.glb`, `-suv-parked.glb` | Quaternius LowPoly Cars, CC0 | Parked cars (about 750 triangles each, 13–15 KB) |
| `quaternius-normal-car-1.glb` | Quaternius LowPoly Cars, CC0 | Purple car (unchanged) |

Downtown City MegaKit modules (CC0) were reviewed and not used here: they are commercial high-street façades; kept for a high-street location. Its pavement tiles would duplicate the generated pavement. No private models are used anywhere.

## Remaining simplifications

- Houses are deliberately simple (flat walls, windows as textures, no window reveals or gutters); trees are low-poly.
- Gardens are the plain grass ground; no garden furniture, garages or dropped-kerb shaping at drives.
- No street signs, road markings beyond the centre line, or pedestrians on the pavements (pedestrians would need behaviour, not scenery).
- Parked cars are static; none has its lights or occupants.

## Collisions and visibility

- **Colliders come from the same layout as the geometry**: every house (including bays), boundary wall, hedge, fence, lamp column and car on a drive has a simple box matching what is drawn (1,302 boxes). The old placeholder house blocks and their boxes were removed. Kerbside parked cars' collision boxes are exactly their models' sizes (unit test).
- **Unit tests** (`tests/unit/streetscape.test.ts`): houses, gardens and furniture stay off the carriageway; houses stand behind their gardens; no houses or cars intersect; no drive crosses the kerb where a car is parked, including the learner's own spot; each row of houses runs to the end of its stretch (no unexplained gaps); the **assisted moving-off path at full throttle touches nothing**; the **purple car and cyclist keep more than 0.2 m from every parked car and all scenery** along their routes.
- **Road users stay as visible as before**: mirror pixel counts in this build and the previous build, same test (G3):

  | | previous build | dressed street |
  |---|---|---|
  | purple car behind (≈18 m): interior mirror | 1,090 px | 1,085 px |
  | purple car behind: right mirror | 1,190 px | 1,191 px |
  | purple car alongside: right shoulder | 15,285 px | 16,849 px |
  | cyclist ≈33 m behind: left mirror (inner edge) | 16 px | 15 px |
  | cyclist ≈12 m behind: interior mirror | 637 px | 654 px |
  | cyclist alongside: right shoulder | 1,973 px | 2,271 px |

  Nothing new stands between the driver and either road user's route: hedges and walls are behind the pavement, the parked cars behind the learner are on the far side of the purple car's line, and no car is parked on the left between the cyclist's start and the learner.
- The exercise's timing, routes, variants and assessment are unchanged (only the "moved off" zone's distance along the road moved, by exactly the 210 m the road was extended behind).

## Tests

- Unit: 105 passed (`npx vitest run`), including the new street tests above and the existing moving-off decision tests.
- Browser (headless Chromium, software rendering): 21 passed, 1 skipped (a diagnostic frame-time probe that runs only on request). Includes Moving off (conflict feedback with evidence; waiting and moving off when clear succeeds; pause, restart, exit), all mirror and shoulder views, tilt and touch controls, Zebra crossing and Brentwood unchanged.
- Two browser tests were made robust to a slow machine without changing what they check: view checks now hold each view for 0.7 s of simulated time (the assessment measures dwell in simulated time) and finish with the right blind spot just before moving off (the rubric's 4 s freshness window for that check is the strictest), and tilt steering is polled until it builds up. Under four parallel workers they had failed for timing reasons only.

## Cost (measured here, not on the iPhone)

Public configuration, phone quality profile, headless Chromium with **software rendering** on a 4-core cloud machine:

| | previous build | dressed street |
|---|---|---|
| Triangles in the scene | — | 63,405 (street 41.8k in 200 m sections, parked cars 16.8k, road, cockpit and the rest 4.8k) |
| Draw calls per frame (all passes incl. mirrors) | — | 66 |
| Frame rate, forward view, mirrors on | 17.7 fps | 12.2–13.1 fps |
| Frame rate, mirrors off (diagnostic) | 22.4 fps | 19.1–21.2 fps |
| Downloaded for the exercise | — | 2.15 MB uncompressed, of which models 155 KB; scripts 204 KB gzipped for the main bundle (+10 KB) |

Optimisations made: all street geometry uses three materials with vertex colours and is merged into 200 m sections (one draw call per material per section, sections out of view skipped); back faces culled; parked cars use simplified models and are baked into one mesh per section with one material; no lawn overlay (gardens are the ground); long straight pavements and kerbs use fewer pieces; textures are generated (no texture downloads). Mirrors still render the full street behind and are the largest extra cost; their resolution and refresh are unchanged (phones: 256 px, every second frame; the mirror being looked at every frame), so approaching road users stay visible and up to date.

**Software rendering is not representative of the iPhone 14 Pro Max**, whose GPU handles this geometry far more easily but whose cost per draw call and per mirror pass is unknown until measured. The About panel shows frame times on the device.

## Needs the iPhone check

1. Frame rate in About with all three mirrors (Moving off), and whether it stays smooth when looking at a mirror.
2. Whether the purple car and cyclist are as easy to see in each mirror as before.
3. How the street looks at the phone's resolution (texture shimmer on brick and roofs at a distance, the haze).
4. Load time of the exercise on mobile data.
