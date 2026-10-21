# Controls and views (2026-10-20)

What a learner can use on the phone screen, in the phone headset viewer and on a computer.

## Steering (exercise screen, "Steering")

| Option | How it works | Where |
| --- | --- | --- |
| Assisted | Keeps the car on the lane path. You control speed, signals and observations. | Default on phones |
| Tilt the phone | Turn the phone in landscape like a steering wheel. The Steer buttons stay on screen as a fallback. | Phones with a motion sensor, standalone link only |
| **On-screen wheel** (new) | Drag round the wheel at the bottom left with a thumb. It goes past half a turn, up to 270° (full lock). Let go and it returns to the centre. Steer keys still override it. | Phone screen |
| Steer buttons or keys | ◀ ▶ buttons, or A/D or the arrow keys. A tap gives a small correction; holding builds up to full lock. | Default on computers |

In the phone headset viewer, steering is assisted, or done with the controller's stick.

**The driver's hands** hold the wheel at ten to two. They turn with it up to about 70°, then stay there as the wheel is
fed through them (pull-push). Both the wheel and the hands follow the car's actual steering, whichever option is used.

The hands have knuckles and fingers wrapped round the rim, a thumb along the inside and bare forearms. Since
2026-10-21 the wheel is 38 cm across and sits nearer the driver, and the speedometer shows through it.

**Forward glance:** in the forward view the camera looks about 7° below level, as a seated driver does, so the wheel
and hands are in view. It affects the camera only: the head direction (and so observations) is unchanged, and mirror
and shoulder views aim exactly as before.

## Views

Driver's views. Each one counts as an observation:

| View | Button | Key |
| --- | --- | --- |
| Forward | Forward | C |
| Interior mirror | Interior mirror | |
| Left / right door mirror | Left mirror / Right mirror | |
| Left / right shoulder (blind spot) | Left shoulder / Right shoulder | |
| Looking around | Swipe on the screen (phone) or move the mouse (computer) | |

In the phone headset viewer, or in a WebXR headset, you look around by turning your head.

**Behind the car** (the round camera button on the left edge; it turns green while on, and pressing it again returns
to the driver's seat): a camera behind and above the car, with the car drawn as a
model. It helps you get a feel for where the car is on the road.
- It is **not a driver's view**: the label says so in amber, and nothing you see from there counts as an observation.
- Any view button takes you back to the driver's seat.
- The results say how long you used it.
- It is not available in the headset viewer.

No overhead or map view is offered to learners. The overhead camera in the code is a diagnostic used only for
review screenshots.

## Checks

- Unit tests: `tests/unit/touchWheel.test.ts` checks how the on-screen wheel turns, its full lock and its return to
  the centre.
- Browser test: `tests/browser/g17-wheel-hands-behind.spec.ts` checks the following:
  - dragging the on-screen wheel steers the car right, and the hands follow;
  - letting go recentres the wheel;
  - the behind view moves the camera out, shows the car model and is labelled;
  - a view button returns to the seat;
  - the results report the behind view and the on-screen wheel.
- Screenshots: `docs/verification/step17/`. The 2026-10-21 cockpit is in `cockpit-bigger-wheel.png`,
  `cockpit-steering-right.png` and `camera-button-behind.png`.
