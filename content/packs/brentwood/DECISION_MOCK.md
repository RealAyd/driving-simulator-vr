# Decision mock tests

Under Mock Tests, **Decisions only**. The car drives itself, using assisted steering and its own speed control. The
learner judges observations, position, priority and decisions. Pilot: Brentwood route 1, challenges 1 and 2
(`ROUTES.md`).

## How a test runs

1. The car drives the route with the camera behind and above it. It slows for bends, stops at give way lines and keeps
   back from road users ahead.
2. The examiner gives each direction in good time, spoken and shown at the top.
3. At each decision the traffic that matters is seen moving, then the whole scene stops (car, traffic, people,
   lights). The camera frames the junction.
4. The buttons for this situation, plausible wrong ones included. The order chosen shows as numbered steps (Undo takes
   the last back). Looking left or right turns the driver's head that way; a mirror button shows that mirror.
   Choosing to give way or go ends the choice.
5. **Done** asks "Finished your observations?". **No** keeps the scene paused. **Yes** submits the order for marking
   (it does not say whether it was right) and shows **Continue**.
6. **Continue** plays on. After giving way, the traffic passes and the scene stops again for a fresh decision. After
   going, the car drives on to the next challenge.

Going where it was unsafe is not driven: the examiner takes control and holds the car. This is recorded (dangerous,
as an intervention), and the decision comes again once the traffic has passed. Where the app did part of the
preparation (mirrors and slowing on the way to a mini-roundabout), the paused screen says so.

## Marking (`src/decision/assess.ts`)

- Rules, not one model answer: any safe order the rules allow passes (each challenge lists accepted orders, and the
  tests check each one is fault-free).
- `before`: a fault is recorded at the moment the action is taken. A check made afterwards does not undo it.
- `required`: omissions, judged when submitted (an out-of-date look after waiting, a missing signal).
- `unsafe`: the depicted traffic is put at risk (an intervention).
- `distractor`: graded by what the picture shows. A right signal at a mini-roundabout with a car waiting to come out
  is serious; a left one is minor.
- `hesitation`: only in a stage showing a clear, safe opportunity, and only from the decision chosen. Time spent
  reading or thinking while paused never counts.
- Anything no rule names is an unnecessary action (feedback only).
- Tests check that pressing every button never passes a challenge.

The test result is the app's assessment, not a DVSA result: no serious or dangerous fault and at most 15 minor ones.
The results screen shows each challenge, each decision in the order made, the faults with their marking sheet
heading, and the right decision there. **Practise this challenge** runs that challenge again on its own, with the
marking shown after each decision.

## Adding a challenge

A route is data (`src/decision/routes/`), played on a scene built from the map (`tools/scenes/build_scene.mjs`):

- `through`: the points the drive passes. The way is planned on the scene's roads, keeping to one-way streets
  (`RoadNetwork.planThrough`).
- `actors`: the road users, each on a path in scene metres. Each waits at the start of its path until a challenge
  starts it. `waits: true` draws a car waiting at a junction; `yields: true` follows or stops for the learner's car.
- For each challenge:
  - the instruction and where it is given;
  - the road users started, and where;
  - for each stage, where the scene stops (on the move, or stopped at a line) and the road user to wait for first;
  - the camera framing, and what the learner is told is already done;
  - the stages' buttons, rules, accepted orders and explanations.

Check a route with `tests/unit/decisionDrive.test.ts`. It drives the route headless and checks where each pause
falls, where the traffic is, that nothing is hit and that the car stays on the road. Then use
`tests/browser/g40-decision-test.spec.ts`.

## To confirm (pilot)

- Give way markings at both junctions.
- The view across the Queen's Road roundabout island.
- The Chatham Way car park exit is mapped as a plain service road and drawn as a fourth arm of the mini-roundabout.
- Scripted road users cannot signal yet.
