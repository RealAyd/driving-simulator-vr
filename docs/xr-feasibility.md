# Early headset feasibility (G0)

## What exists

- `src/xr/xrSession.ts`: feature detection (`navigator.xr.isSessionSupported('immersive-vr')`) and a seated session using Babylon's WebXR default experience with teleportation, pointer selection and near interaction disabled.
- The XR camera is parented to the seat node, which moves with the vehicle each frame. The headset adds only physical head pose: no forced pitch, no camera shake.
- `C` / recentre calls `resetReferenceSpace()`. Ending the session pauses the drive.
- The start screen shows "Enter VR (experimental, seated)" only when the browser reports immersive VR support.

## What has been tested

| Check | Result |
|---|---|
| Code path type-checks and builds | Yes |
| A browser with no headset shows the reason and hides the VR button | Yes: headless Chromium has WebXR but no device, and shows "This device does not offer immersive VR" (screenshot `verification/G0/01-start.png`) |
| Entering VR on a real headset | **Not tested.** No headset is available in this environment. |
| Frame pacing, comfort, controller input in a headset | **Not tested.** Desktop emulation cannot establish these. |

## Test plan for a real headset (Quest 3 / Quest Browser suggested)

1. Serve the preview over HTTPS (WebXR requires a secure context), open it in Quest Browser.
2. Start screen: confirm the VR button appears and the status reads "Headset detected".
3. Enter VR seated. Check: eye height feels like a driver's seat; road ahead is level; wheel is in front of the right shoulder (right-hand drive).
4. Turn head left/right/over shoulder; confirm no lag between head and view and no drift.
5. Recentre (needs an in-headset control: not yet built; G3).
6. Exit with the system button; confirm the drive pauses. Re-enter; confirm it resumes.
7. Record headset model, browser version, refresh rate, and whether frames were dropped (Quest developer overlay or OVR Metrics Tool).

Known gaps before VR can be a release gate: in-headset controls (accelerate/brake/indicators via controllers), in-headset pause/recentre UI, comfort review.
