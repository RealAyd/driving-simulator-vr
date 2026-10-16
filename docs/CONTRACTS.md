# Shared contracts (owned by Agent A)

All agents build against `src/contracts/`. Propose changes to this file and the contracts in a pull request; do not change them silently.

## Units

| Quantity | Unit | Notes |
|---|---|---|
| Distance | metre | 1 world unit = 1 m |
| Speed | m/s | HUD converts with `mpsToMph` (1 mph = 0.44704 m/s) |
| Time | seconds of simulation time | from the fixed clock, never `Date.now()` |
| Angles | radians | content files may use `headingDeg` |

## Coordinates

Right-handed: **+X east/right, +Y up, -Z north/forward at heading 0**. Heading is **clockwise from north**.

- `forwardFromHeading(h) = (sin h, -cos h)`; `rightFromHeading(h) = (cos h, sin h)`.
- Vehicle-local and seat-local frames use the same axes relative to the vehicle (+X right, -Z forward).
- Babylon conversion lives only in `src/engine/babylonAdapter.ts` (scene is right-handed; `rotation.y = -heading`). `tests/unit/engine.test.ts` proves Babylon's transforms agree with `localToWorld`.
- Heights come from authored road data (`src/world/roadGeometry.ts#surfaceAt`), never from scene meshes, so the car cannot snap onto roofs.

## Simulation loop (per frame)

1. Read controls. 2. Update the learner vehicle. 3. Update traffic and pedestrians. 4. Check collisions and trigger zones. 5. Record events. 6. Evaluate assessment rules. 7. Render scene and mirrors.

Steps 1–6 run inside `FixedStepClock.advance` at 60 Hz (max 5 catch-up steps). Step 7 interpolates with `clock.alpha`.

## Mirrors

- A mirror is a camera in the same world rendering into a texture on the mirror glass (`src/cockpit/mirror.ts`). It is never a tinted gaze target.
- Mirror cameras exclude the learner car's own meshes and use a fixed projection matching the glass shape.
- Mirror resolution and update interval come from the quality profile. Reduce decorative detail before reducing mirror usefulness.

## Ownership rules

- The learner vehicle's movement is owned by `VehicleController`. Others read `pose` / `interpolatedPose`.
- Vehicle rotation is applied once, in `applyPose`. The driver camera is composed from the vehicle pose plus seat-relative head yaw/pitch.
- Every module implements `SimModule`: `fixedUpdate`, `reset`, `dispose`.
- Every event has a unique id and simulation timestamp (`EventLog`). Findings will cite event ids.
- Losing focus clears held controls; a hidden tab pauses.

## Folder ownership

See `MODULE_OWNERS` in `src/contracts/modules.ts`.

| Folder | Owner |
|---|---|
| `src/contracts`, `src/app`, `src/engine` | A Foundation and integration |
| `src/world`, `content/locations` | B Geography and assets |
| `src/vehicle`, `src/input` | C Vehicle and input |
| `src/cockpit`, `src/xr` | D Cockpit and XR |
| `src/actors`, `src/scenarios`, `content/scenarios` | E Actors and scenarios |
| `src/assessment`, `src/ui`, `src/storage` | F Assessment and interface |
| `tests/browser` | G QA |

## Content schemas

- `LocationSchema` (v1): roads (centreline polyline, lanes, pavement, kerb, markings), blocks (buildings, hedges, parked vehicles; `occludes` flag), spawn, fidelity, sources, review status. Unknown fields are rejected.
- `ScenarioSchema` (v1, draft): zones by distance along a road, triggers that fire once per attempt by default.

## Handoff checklist

Commit/branch, files changed, interfaces provided, dependencies added, tests run with actual results, known failures, screenshots or performance evidence, integration instructions. "Syntax passed" is not "the application works".
