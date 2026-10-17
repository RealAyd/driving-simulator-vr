# Step 7: phone-viewer mode (cardboard-style headset) for iPhone 14 Pro Max

Branch `rebuild/3d-judgement-simulator`. Production `main` unchanged. **Nothing here has been tried on an iPhone or in a headset yet.** Everything below was checked in headless Chromium with a simulated motion sensor and a simulated game controller, at the iPhone 14 Pro Max landscape size (932 × 430 CSS px, touch).

## Why not WebXR

iPhone Safari does not offer WebXR, so the existing "Enter VR headset" (WebXR) path cannot be used on the iPhone. Phone-viewer mode draws the stereo picture itself and reads the head direction from the phone's motion sensor (`deviceorientation`, the same permission as tilt steering).

## What it does

- **Entry** (exercise screen → *Phone viewer (headset, experimental)* → *Start in phone viewer*): asks for motion access from the tap (iOS shows the prompt only inside a tap) and keeps the screen awake (Screen Wake Lock, where supported). Tilt steering is switched to assisted steering, because the phone is on your head. Normal mobile mode is unchanged and remains the default.
- **Side-by-side stereo**: two eye cameras 63 mm apart, one per half of the screen. The mirrors are drawn once per frame and shared by both eyes (each mirror is a flat picture on its glass, as before).
- **Lens correction**: each eye's picture is pre-distorted (barrel) to cancel the lenses' pincushion distortion, and shifted towards the middle of the screen so its centre sits under its lens (lens separation 62 mm against the iPhone 14 Pro Max's 154 mm-wide screen). Three presets: *Typical phone headset* (VR-box style), *Google Cardboard style*, and *No lens correction* (stereo only, to check alignment). These are starting points, not measurements of a particular headset.
- **Head tracking**: the phone's orientation becomes the driver's head direction (yaw, pitch and roll), in either landscape orientation. The driver's head in the simulation follows it, so mirror and shoulder checks are made by actually turning your head; the observation evidence is recorded as "head direction" (not eye tracking).
- **Start and recentring**: after entering, the picture follows wherever you face for 3 seconds ("Put the phone in the headset…"); then a **Start** button appears straight ahead. Look at it for about a second to begin. Nothing moves (simulated time is stopped) until then. **Recentre** later with the dashboard button, a controller's Y button, or the C key.
- **Input without touching the screen**, three ways:
  1. **Gaze buttons** on the dashboard, left of the steering wheel (about 12–15° below straight ahead, so normal driving does not press them): look at one for 0.9 s (a bar fills; the reticle turns amber). *◀ Signal*, *Stop* (brake and hold), *Go* (move off and settle at 15 mph; look at Go again to coast), *Signal ▶*, *Recentre*.
  2. **Bluetooth game controller** (Gamepad API, standard layout): RT or A go (while held), LT or B brake, LB / D-pad left signal left, RB / D-pad right signal right, Y recentre, left stick steers (it overrides the assistance, like the Steer buttons), Menu pause.
  3. **Bluetooth keyboard** (the existing keys: W/S or arrows, [ ] signals, C recentre, P pause).
- **In-headset display**: a status panel on the dashboard (speed, signal, Go/Stop, the current task, input hints) and a reticle in the middle of the view. The touch HUD is hidden.
- **Leaving**: a tap anywhere on the screen pauses and leaves the viewer, showing the normal pause screen (the tap itself is not passed on to the Resume button). Finishing an exercise also leaves the viewer and shows the results.
- **Full screen**: iPhone Safari cannot make a web page full screen. Adding the page to the Home Screen and opening it from there removes Safari's bars (`manifest.webmanifest`, `display: fullscreen`, landscape).

Screenshots (`step7/`): `g10-00` exercise screen with the viewer option; `g10-01` waiting for Start (looking down at the phone); `g10-02` looking left and down; `g10-03` right-shoulder check by turning the head; `g10-04` gazing at Go (dwell bar); `g10-05` moving, mirrors visible in both eyes; `g10-06` tap pauses and leaves.

## Verified here (simulated sensor and controller)

Browser test `tests/browser/g10-phone-viewer.spec.ts` (3 tests) and unit tests `tests/unit/phoneViewer.test.ts` (6 tests):

- Normal mode: one camera, touch controls and view label as before.
- Viewer: two eye cameras; touch HUD hidden; lens correction leaves the eyes' outer corners black and their centres drawn; simulated time stays stopped until Start.
- Start by gaze, then head yaw and pitch follow the simulated head (right positive, down negative); turning the head to the right shoulder records a right-shoulder observation.
- Recentre by controller makes the current direction straight ahead.
- Gaze: Signal ▶ turns the right indicator on; Go moves the car off; Stop brings it to rest and holds.
- Controller: RT accelerates, LT brakes to a stop, LB signals left.
- Tap: pauses, leaves the viewer, and the normal screen and controls return.
- Motion access refused: an explanation, and the exercise does not start.
- Orientation maths (both landscape orientations and portrait, yaw/pitch after recentring, over-the-shoulder angles) and lens layout (lens-centre offset, edge-filling scale).
- All earlier browser tests still pass (normal mobile mode unchanged).

Frame rate, headless **software rendering** (not representative of the iPhone), Moving off, parked, looking ahead: normal mode 12.4–13.9 fps, phone viewer 9.2–10.0 fps. Two eye pictures plus the lens pass cost about a fifth more here; the mirrors are not drawn twice.

## Not tested: needs the iPhone (and a headset)

1. **Motion permission and readings in Safari** on the device, in Safari and from the Home Screen; whether readings keep arriving with the screen locked against rotation.
2. **Head-tracking quality**: drift (the compass heading of `deviceorientation` on iOS can drift or jump; Recentre is the remedy), lag, and roll.
3. **Lens presets against your headset**: whether straight lines look straight, the image is centred under each lens, and the field of view feels right. Expect to adjust: choose *No lens correction* to check alignment first.
4. **Legibility** of the gaze buttons and status panel through the lenses, and whether the 0.9 s dwell is comfortable.
5. **Frame rate** with stereo plus three mirrors (About shows frame times), and heat/battery over a session.
6. **Controller**: whether your Bluetooth controller is recognised by Safari's Gamepad API with the standard layout. Many cheap headset remotes act as a mouse or media keys instead, which Safari cannot read; those will not work.
7. **Screen wake lock** keeping the screen on (iOS 16.4 and later).
8. **The Dynamic Island** at one end of the screen covers part of one eye's outer edge; usually outside the lens's view, but unconfirmed.
9. **Comfort**: this is a seated, stationary exercise in a moving car view; stop if it causes discomfort.

## Before buying a headset

Choose one that holds a 6.7-inch phone (iPhone 14 Pro Max is 160.7 × 77.6 mm, plus any case), has **adjustable lens separation and focus**, and leaves the screen untouched (no capacitive button needed: input is by gaze, controller or keyboard). A Bluetooth controller that works with iPhone (for example Xbox or PlayStation controllers, which iOS supports) is the most reliable way to brake promptly; gaze buttons work without one but are slower.
