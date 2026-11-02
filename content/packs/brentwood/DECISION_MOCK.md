# Decision mock tests

Under Mock Tests, **Decisions only**. The car drives itself, using assisted steering and its own speed control. The
learner judges observations, position, priority and decisions. Brentwood route 1 has all eight challenges
(`ROUTES.md`); routes 2 to 5 are planned.

## How a test runs

1. The car drives the route with the camera behind and above it. It keeps to the right lane for each turn, slows
   for bends, stops at give way lines and red lights, keeps back from road users ahead, and gives way at the
   mini-roundabouts and roundabouts it drives through between challenges.
   The streets are lived in: parked cars, people on the pavements and background traffic, busier than on a drive
   (30 road users, two of them buses and two cyclists, kept within about 180 m of the car, oncoming as well as
   following). Traffic coming out of side roads slows in good time and waits short of the main road.
   Each junction in hand is kept to its own road users from a little before the direction is given until the car is
   past it, so the decision is the one depicted. Background traffic takes another way round it, and the challenge's
   road users are paced to meet the car at the moment shown, even when traffic held it up on the way.
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
- Speed is the app's, not the learner's: no button changes it and nothing marks it. The paused screen says where the
  app slows the car.
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
- `actors`: the road users (cars, or `kind: 'pedestrian'` on foot), each on a path in scene metres. Each waits at the start of its path until a challenge
  starts it, and turns off once at its end. `waits: true` draws a car waiting at a junction (while its challenge is in hand); `yields: true` follows
  or stops for the learner's car; `parks: true` stays at the end of its path (turned into a car park). They keep back
  from background traffic ahead, and it waits for them. A road user set going waits until its starting spot is clear
  of background traffic.
- For each challenge:
  - the instruction and where it is given;
  - the road users started, and where;
  - for each stage, where the scene stops (on the move, or stopped at a line) and the road user to wait for first;
  - the camera framing, and what the learner is told is already done;
  - `quiet`: circles round the junction and the approaches its road users come along, kept clear of background
    traffic while the challenge is in hand (traffic heading in waits short of them);
  - `lights`: a stop line whose lights are held green while the challenge is in hand (the learner's, or a road
    user's), so the moment depicted never depends on the lights' timing;
  - the stages' buttons, rules, accepted orders and explanations.

Check a route with `tests/unit/decisionDrive.test.ts`. It drives the route headless, with and without background
traffic in several patterns, and checks:

- where each pause falls, and where the challenge's road users are then;
- that no background car is coming towards the car in a quiet circle at a pause;
- that nothing is hit, no red light is run and the car stays on the road;
- that no parked car stands on the car's way or a road user's path. Then use
`tests/browser/g40-decision-test.spec.ts`.

Road users' paths are planned on the scene's roads, as the car's own way is (`RoadNetwork.planThrough` and
`routeLanePath`, from a start pose to the points given), so they keep to their lanes and go round mini-roundabouts
properly.

## To confirm (route 1)

- Give way markings at each junction, and the view across the Queen's Road roundabout island.
- The Chatham Way car park exit is mapped as a plain service road and drawn as a fourth arm of the mini-roundabout.
- The High Street lights: the challenge holds Kings Road green; the real phases (and whether people cross Weald
  Road on that phase) are not mapped.
- Wilson's Corner lane markings between the two mini-roundabouts.
- Scripted road users cannot signal yet.
