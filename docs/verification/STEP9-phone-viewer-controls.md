# Step 9: phone viewer — controller-only scored driving, parked familiarisation, input check, pause menu, calibration

Branch `rebuild/3d-judgement-simulator`. Production `main` unchanged. **Not yet tried on an iPhone, in a headset or with a physical controller.** Everything below was checked in headless Chromium at the iPhone 14 Pro Max landscape size with a **simulated** motion sensor and a **simulated** game controller. No iPhone/controller/headset combination is verified; a headset's bundled remote is not assumed to work because it pairs over Bluetooth.

Normal touch-screen practice is unchanged and remains the default.

## 1. Two separate uses of the headset

| | Sit in the car (familiarisation) | Drive with a controller (scored) |
|---|---|---|
| Needs | nothing but the phone and holder | a Bluetooth game controller or keyboard that has **passed the controller check in this visit** and is still connected |
| Car | parked; cannot move | moves under your control |
| Menus | look at a button for 1.5 s (Start, Menu; Resume / Recentre / Exit on the menu) | physical buttons only |
| Scored / saved | no (results say "not scored and not saved") | yes, with the control mode recorded |

The exercise screen explains this **before** the phone goes into the headset, and the *Drive with a controller* button stays disabled (with the reason) until the check has passed and the same controller is connected.

**No gaze control can move the car or signal.** The earlier dashboard Go / Stop / Signal gaze buttons were removed. While driving there are no gaze items at all. In familiarisation the only gaze item is *Menu*, placed low on the centre of the dashboard (about 24° down and 29° left), away from every mirror, both shoulder checks, the speedometer and the road ahead.

## 2. Controller check

Exercise screen → *Check controller…* (do it with the phone in your hand):

- Rows for **Accelerate (hold), Brake (hold), Signal left, Signal right, Pause, Recentre**, each showing what it is bound to, a live "● received" light, and "✓ works" once demonstrated.
- **Set** binds whatever you press next: any controller button, a stick or trigger axis (either direction), or a keyboard key. Inputs already held when you press Set are ignored until released, so a resting stick is not captured by mistake.
- The standard layout (RT, LT, LB, RB, Menu, Y) is offered **only** if the controller reports the standard layout, or on request (*Use the standard layout*). Otherwise nothing is assumed.
- A raw readout shows the controller's name, the layout it reports, buttons held, axis values and the last keys, so you can see exactly what Safari receives.
- *Done* is enabled only when all six controls have been shown working on one device. Bindings are remembered per device; the check itself must be passed again each visit.
- The screen says plainly that headset remotes which pair as a mouse or as media keys cannot be read by a web page.

## 3. Predictable controls (scored driving)

- **Accelerate is held**: the car speeds up while you hold it and **coasts** when you let go (it does not hold a speed by itself). Assisted speed and acceleration are capped **per exercise** (`controllerDriving` in each scenario, our draft values): Moving off 12 mph, Zebra crossing 20 mph, Brentwood 18 mph; acceleration at most 1.5 m/s². The dashboard panel shows the state: ACCELERATE (held), Coasting, BRAKE or Stopped, with speed and signal.
- **Brake acts immediately**: the controller is read at the start of each frame, before the simulation steps, so the first step after a press brakes (measured: one step, 16.7 ms of simulated time). No dwell, no confirmation.
- **Start**: look straight ahead and press **Recentre**. Nothing moves (simulated time stopped, car held) until then.
- **Pause** (physical button) freezes the exercise and shows a menu straight ahead: *Resume: press Pause · Recentre: press Recentre · Exit: hold Brake for 2 seconds*. Looking around never resumes it.
- **Automatic pauses**, which also drop any held acceleration:
  - the checked controller disconnects (or a different one appears);
  - head-tracking readings stop or arrive without usable angles for more than 0.5 s;
  - the page is hidden (screen off, another app).
- **Nothing resumes by itself.** Resume needs Pause pressed again, only while the checked controller is connected and tracking is live. After any pause, an Accelerate still held does nothing until it is released and pressed again.
- A tap on the screen still pauses and leaves the viewer (the phone is out of the headset).

## 4. Calibration (parked)

Exercise screen → *Viewer* (Viewer 1–3, saved on the phone) → *Calibrate viewer…*:

- **Eye spacing** (virtual eye separation, stereo depth), initially **63 mm**, 50–78 mm.
- **Image alignment** (lens centre separation: moves each eye's image sideways under its lens) and **vertical alignment**.
- **Lens profile** (provisional presets) and **lens correction strength**; **field of view**.
- **Reset** (defaults for the chosen profile), **Recentre**, **Done**.
- Alignment targets: a cross far ahead (should look single and centred in each lens) and a small cross near.
- Adjust by gaze (− / + beside each row; 0.7 s) or with a checked controller (Signal left/right change the value, Accelerate/Brake move between rows, Recentre recentres, Pause finishes).
- The exercise screen and the panel say that the presets are provisional and that only looking through your own holder shows whether a setting is right.

**Tracking diagnostics, kept separate:**

- **Offset**: degrees from straight ahead now. Recentre sets it to 0.
- **Drift**: hold your head still; the panel shows the change in degrees per minute. Recentre does **not** cure drift; it only resets where straight ahead is.
- **Lag**: readings per second and the age of the newest reading are shown. The real delay from moving your head to the picture moving cannot be measured in a browser test; judge it by turning quickly on the device. Recentre does nothing for lag.

## 5. Assessment integrity

- Observation evidence in the viewer is **head direction** (motion sensors), never described as eye tracking; results say so.
- Pausing stops simulated time: traffic positions and observation ages do not change while paused (checked in G10).
- Every attempt records `conditions`: control mode (touch, keyboard, phone-viewer-controller, phone-viewer-familiarisation, webxr), steering, guidance, head-direction evidence and the checked controller. `session.started` also records the control mode and whether the attempt is scored.
- Familiarisation is not assessed and not saved.

## 6. Tests (simulated inputs)

Browser `tests/browser/g10-phone-viewer.spec.ts` (6 tests), unit `tests/unit/viewerControls.test.ts` (7) and `phoneViewer.test.ts` (6). They cover:

- **Immediate braking**: brake applied in the first simulation step after the press (16.7 ms simulated); the car stops.
- **Held accelerate**: speed rises and never exceeds 12 mph in Moving off; released, throttle 0 and the car coasts.
- **Explicit resume**: paused by Pause; time, traffic and positions frozen for several seconds while looking around (including at the speedometer and mirrors); only Pause resumes.
- **Disconnect to pause**: pause with acceleration dropped; reconnecting does not resume; a held Accelerate does nothing after resume until pressed again.
- **Stale tracking and hidden page**: both pause.
- **Accidental gaze activation**: in familiarisation, looking for 1.8 s each at forward, the interior mirror, both door mirrors, both shoulders, the speedometer and the road ahead-left presses nothing; while driving there are no gaze items.
- **Both landscape orientations** (screen angle 90 and 270): head right gives positive yaw and head down negative pitch in both.
- **Controller check** with a non-standard layout (all six remapped), raw readout, Done only after all six work; control mode recorded with the controller's name.
- **Calibration**: 63 mm default, gaze adjustment, saved across reload, per-viewer slots, Reset; drift measured from a simulated 0.5°/s creep (about 30°/min); reading rate and age reported.
- Normal mobile mode unchanged; all earlier browser tests pass.

Screenshots (`step9/`): familiarisation left-shoulder view and gaze menu, controller check, driving started, pause menu, disconnected pause, calibration.

## 7. Still needs your iPhone and controller

1. Whether Safari on your iPhone sees your controller at all, its name, and which buttons/axes it reports (the check screen shows this).
2. Whether brake and accelerate feel immediate with the real Bluetooth delay (the simulated test excludes Bluetooth latency).
3. Whether the controller disconnect is detected when the controller sleeps or goes out of range.
4. Motion permission, tracking rate, drift and lag on the device, in Safari and from the Home Screen.
5. Calibration through your actual holder: eye spacing, alignment, lens profile and strength.
6. Legibility of the menu and panel text through the lenses.
7. Frame rate with stereo plus mirrors (About).

## First handheld test (no headset)

1. On the iPhone, open the preview, choose *Moving off safely*.
2. Pair your controller with the iPhone (Settings › Bluetooth), then tap *Check controller…*. Note the controller name and layout shown. Press each control; use *Set* for any that do not light up. Tap *Done*.
3. Tap *Sit in the car*, allow motion access, hold the phone in landscape in front of your face, and look around: check that turning right turns the view right and looking down looks down. Look at *Start*, then the low *Menu* button. Tap the screen to leave.
4. Tap *Drive with a controller*, hold the phone up, press Recentre, then hold Accelerate briefly, let go, press Brake. Press Pause, then Pause again. Switch the controller off: it should pause. Note anything that does not match this document.

## First headset test

1. Do the handheld test first. Calibrate before driving: *Calibrate viewer…*, put the phone in the holder, look at the far cross. Choose *No lens correction* first, set image alignment until the cross looks single, then try the lens profiles and strength. Press *Done*.
2. *Sit in the car* in the headset: look at each mirror and over each shoulder for a few seconds; nothing should be pressed. Use *Menu → Exit* by looking.
3. Only then *Drive with a controller*: Recentre to start, pull away gently, brake, signal, pause and resume. Stop if you feel any discomfort.
