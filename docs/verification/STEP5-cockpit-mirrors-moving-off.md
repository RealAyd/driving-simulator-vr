# Step 5: cockpit and mirror corrections, mobile controls, three exercises, Moving off safely

Branch `rebuild/3d-judgement-simulator`. Production `main` unchanged. Feedback rubrics are drafts, not reviewed by an instructor, not DVSA criteria.

## Cockpit and mirrors

- Right-hand-drive cabin built from one set of dimensions (`CABIN` in `src/cockpit/cockpitModel.ts`): eye at 0.37 m right of centre, 1.20 m up; dashboard and window line 0.96 m; A-pillars run from the dashboard corners to the roof header; roof rails, sills, B/C-pillars and doors connect.
- Interior mirror on the centre line, hanging from the windscreen below the header: from the driver's eye about 27° left and 9° up (upper centre-left of the windscreen, as from a right-hand seat). Measured on screen (932×430 forward view): x 165–328, y 111–164 px.
- Door mirrors at the front corner of each side window on arms to the door; frames on all three. Right mirror visible in the forward view (x 700–808, y 259–326 px). The left mirror is about 55° to the driver's left, so it needs a head turn; the Left mirror control turns the view to it (on screen, clear of controls, in every test).
- Door mirrors use the usual adjustment (inner edge just shows the car's own side) and render the car's own body. Coverage is real geometry, not tuned to hide objects:
  - right (flat, 18° wide): from 1° inward to 17° outward of straight back;
  - left (convex, 26° wide): from 4° inward to 22° outward.
- Shoulder views look about 110° to each side and show the areas beside and behind that the mirrors do not.
- Rendering cost: off-screen mirrors do not render; on phones mirrors render at 256 px every 2nd frame, and the mirror being looked at renders every frame so approaching traffic stays readable.

## Road users and the parking position

Parked 0.15 m from the kerb there is no room for a cyclist on the learner's left. The cyclist therefore rides about 0.8 m from the kerb behind the car, then moves out and passes on the right with about 0.85 m clearance, and returns to the kerb after the parked car ahead. Its line is directly behind the learner's car, so:

- far back (beyond about 19 m) it appears at the inner edge of the left mirror, next to the car's own side;
- closer, the car body hides it from the left mirror; the interior mirror shows it;
- as it moves out, the right mirror and then the right shoulder show it.

The purple car passes 0.4 m right of the centre line (about 0.85 m clear of the parked learner). Both road users stay on the carriageway and clear of the parked car ahead (unit tests).

## Automated checks (cloud, headless Chromium with software rendering; not the iPhone)

- Unit (93): moving-off assessment decisions (safe gap succeeds; early checks plus a signal do not excuse an unsafe move; alongside; refresh after waiting; waiting for one road user does not excuse another; far road user is not a reason to wait; one incident per road user with raised severity; draft labelling), road-user paths, assisted path clearance at full throttle.
- Browser (20 in CI, iPhone 14 Pro Max viewport 932×430 with touch):
  - mirrors: interior mirror near the upper centre; each mirror reached by its button and clear of controls;
  - purple car behind: interior mirror 2,039 px on the right half of the glass; right mirror 2,356 px;
  - purple car alongside: right mirror 11 px (a sliver of its rear); right shoulder 5,302 px;
  - cyclist: left mirror 16 px at the inner edge at about 33 m; interior mirror 614 px at about 12 m; right shoulder 1,973 px alongside;
  - safe areas applied directly (59 px sides, 21 px bottom): every control on screen and clear of every mirror;
  - moving off: conflict feedback with evidence; safe gap succeeds; car never starts on its own; pause freezes road users and timing; restart resets road users, views, signals and findings; Exit reported as exiting; Zebra crossing independent; introduction keeps the car parked;
  - tilt: enable, status, calibrate, steer, fallback; disabled with a reason when refused or on desktop.
- Frame times in these runs are software rendering only: about 31 fps with two mirrors rendering, 29 fps with the selected mirror every frame, 35–38 fps with mirrors off (diagnostic). The iPhone must be measured on the device (About panel shows the numbers).

## Screenshots and recording

`step5/00-mirror-locations-annotated.png`, the forward, mirror and shoulder views (`step5/1*`–`3*`), the menu, exercise screen, settings and About panel, and `step5/moving-off-road-users-passing.mp4` (24 s, both road users passing while views are selected).

## Limitations

- Real-device results pending: layout with the real camera cut-out and home indicator, frame rate with three mirrors, and the feel of the view buttons.
- Signal crossing lights (Brentwood) and junction kerbs are still not modelled; scenery remains simple until these corrections are reviewed.
- Road users follow fixed lines; they brake, wait and follow but never steer round the learner.
- View evidence records selected views (or head direction from swipes), not eye tracking or recognition.
- Phone-viewer VR is a separate feasibility task and is not part of this build.
