# ADR 0001: One constructed world in Babylon.js

Status: Accepted for the G0 foundation (2026-10-16). Revisit if G1 performance on the target headset or phone is inadequate.

## Context

The legacy prototype (`/index.html`, A-Frame) placed a cockpit over a separate Google background (3D Tiles or Street View). The background could not be collided with, could not be reflected in mirrors, could not hide hazards consistently and, for Street View, was not visible in VR. Visual quality at eye level was limited by Google's aerial photogrammetry.

## Decision

- Build one constructed 3D world. Road, cockpit, other vehicles, pedestrians, obstacles and mirrors share one coordinate system and one renderer.
- TypeScript + Vite + Babylon.js. Blender for model preparation, GLB at runtime.
- Locations and scenarios are versioned JSON validated with Zod.
- Vehicle movement is a simple kinematic controller with a single owner (`src/vehicle`).
- Simulation and assessment run on a fixed 60 Hz clock; rendering interpolates and never changes scoring state.
- The new simulator lives beside the legacy page: its entry is `sim/index.html`, built to `dist-sim/`. The production site is not changed by this work.
- Google imagery is not used as the simulator's background or collision surface, and is not extracted into our assets. Street View may remain a separate familiarisation feature.

## Consequences

- Realism comes from authored geometry and reusable assets, not photographs. Locations are labelled honestly: representative, geographically inspired, or reviewed.
- Babylon is imported per module through `src/engine/babylon.ts` (G1: about 251 KB gzipped for the main bundle); WebXR is loaded on demand.
- WebXR comes from Babylon's default experience; the headset only adds physical head pose to a seat-mounted camera.
