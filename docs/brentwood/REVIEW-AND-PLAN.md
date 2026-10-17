# Brentwood paired mini-roundabouts: repository review and plan

Date 2026-10-17 · branch `rebuild/3d-judgement-simulator` · baseline commit `12516a8` (G2).

## 1. What already works and will be kept

| Area | Files | Keep as is | Needs extending |
|---|---|---|---|
| Contracts (units, coordinates, events, findings) | `src/contracts/*` | Metres, m/s, -Z north, clockwise headings, event ids, `Finding` with incident ids and upgrades | Location schema v2 (junctions, lane graph), scenario schema v2 (routes, traffic flows) |
| Fixed 60 Hz clock, simulation decoupled from frame rate | `src/engine/clock.ts` | Yes | — |
| Babylon adapter and per-module imports (251 KB gzipped) | `src/engine/babylon*.ts` | Yes | Stereo camera import for phone VR |
| Learner car (one movement owner, braking/surface/collision events) | `src/vehicle/*` | Yes | Optional steering assistance (path following) |
| Input (blur/hidden-tab clearing) | `src/input/keyboard.ts` | Yes | Touch: swipe-to-look, mirror/shoulder buttons, pedals |
| Seat, head look, cockpit model | `src/cockpit/seat.ts`, `cockpitModel.ts` | Seat/head maths | Cockpit proportions and forward visibility (brief step 3) |
| Interior mirror (real render of the world) | `src/cockpit/mirror.ts` | Yes | Two door mirrors; a shared update budget |
| Observation (dwell, labelled source) | `src/cockpit/observation.ts` | Yes | Touch view selections as their own labelled source |
| Zones, triggers, end conditions | `src/scenarios/*` | Once-per-attempt triggers, end/collision/left-route/time limit | Zones on lane-graph paths instead of one road's distance |
| Assessment framework and draft rubric | `src/assessment/*` | Finding/incident/upgrade logic, evidence ids, final-step processing | New roundabout rules; observation and decision assessed separately |
| Results, attempts on the device | `src/ui/results.ts`, `src/storage/attempts.ts` | Yes | Per-exercise history |
| Tests and CI | `tests/*`, `.github/workflows/sim-ci.yml` | 58 unit + 7 browser tests, condition-based waits, CI annotations | Route connectivity, conflict, mirror-coverage tests |

## 2. Concrete blockers

1. **Location model is a single polyline road.** `LocationSchema` v1 cannot describe two mini-roundabouts, their arms or lane connections. Needed: schema v2 with junctions, arms, lanes and a lane graph (centreline paths per lane plus connectors through each junction with give-way points).
2. **Zones use distance along one road.** Exercises crossing two junctions need zones on route/lane-graph paths.
3. **Traffic only follows the learner's path.** Brief requires lane-aware traffic: lane following, gap acceptance at give-way lines, yielding to traffic from the right, queues between the roundabouts.
4. **Geometry source.** OpenStreetMap hosts (`api.openstreetmap.org`, `overpass-api.de`) are blocked by this environment's network policy, so the layout draft is read from the supplied screenshots and Street View coordinates. Google imagery is used as visual reference only; nothing is extracted into assets.
5. **No phone test build.** GitHub Pages serves production from `main`; a preview must be hosted elsewhere so it can be opened on the iPhone over HTTPS (required for motion sensors).
6. **Cockpit proportions** were tuned by eye at 1280×720 desktop; landscape iPhone (about 19.5:9) and touch controls have not been checked, and door mirrors are missing.
7. **Frame rate evidence is only from software rendering** (8–17 fps on SwiftShader). There is no real-device measurement yet; the next step needs your iPhone numbers before adding scenery.

## 3. Phone VR (iPhone in a viewer): what the evidence says so far

- iPhone Safari does not provide WebXR immersive VR, so the current `SeatedXr` (WebXR) path will not work on the iPhone.
- Babylon 9 (already used) includes `VRDeviceOrientationFreeCamera`: side-by-side stereo with lens-distortion correction (`VRCameraMetrics`) and head tracking from device orientation, including iOS's motion-permission prompt. This avoids an engine migration if it performs well enough.
- Unknowns to prove on your phone: frame rate with two eye views plus mirrors, motion-to-photon lag, distortion match to an unknown viewer, and input without touching the screen (a Bluetooth controller or keyboard, or gaze/dwell selection).
- Proposal: a small, separate feasibility page reusing the same world before any stack change. No migration is proposed at this point.

## 4. Plan (your work order)

1. ✅ Repository review (this document).
2. ✅ Draft overhead reconstruction for your location review: `docs/brentwood/overhead-draft.svg`, data in `layout-draft.json`. **Waiting for your review.**
3. Stabilise cockpit, mirrors (interior + both door mirrors, shoulder views), touch controls with swipe-to-look and mirror/shoulder buttons, optional steering assistance, and measure performance on your iPhone. A testable preview build will be provided for this step.
4. Location schema v2 + lane graph; drivable paired roundabouts with simple scenery.
5. Exercise 1 (guided quiet traversal) end to end, then 2 (busy, gap selection, fresh assessment before rb2) and 3 (queue between the roundabouts).
6. Consistent free, properly licensed asset collection; sources and licences recorded.
7. Phone-VR feasibility page in parallel, reusing the world.

## 5. Proposed first route (easy to change)

Start on High Street eastbound at your first Street View point (S0, left lane). rb1: first exit (ahead/left) onto the connecting section. rb2: second exit (ahead) onto Shenfield Road. Finish about 70 m along Shenfield Road. Routes will be lists of lane-graph connections in scenario files, so starts, exits and finishes can change without editing the location.
