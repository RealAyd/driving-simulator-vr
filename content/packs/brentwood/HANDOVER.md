# Decision routes: handover (7 November 2026)

What a new session needs to carry on with the Brentwood decision mock test routes. The product rules are in
`AGENTS.md`; the routes are in `ROUTES.md`; how a test runs and is marked is in `DECISION_MOCK.md`.

## Repositories, branches, deploys

- Code: GitHub `RealAyd/driving-simulator-vr`, worktree `/home/user/assets-a`, branch `assets/batch-a`.
  Push with `git push -q origin assets/batch-a`. Squash local WIP commits onto the remote branch before pushing
  (`git fetch -q origin assets/batch-a && git reset -q --soft origin/assets/batch-a`), never force-push.
- Staging: GitHub Actions workflow `hostless-staging.yml` in `RealAyd/driving-practice-preview`, ref `main`, input
  `source_ref` = the full commit SHA. Check `https://staging.drivingpractice.live/build-info.json`, then run the smoke
  script against `https://staging.drivingpractice.live/`.
- Production (`vr.drivingpractice.live`) only when the owner says "deploy" for that deploy.
- Never print or commit secrets. `SPEECH_KEY` / `SPEECH_REGION` are in the environment for the voice tool.
- Commits end with the `Co-Authored-By` and `Claude-Session` trailers; no model names in commits.

## The owner's rules for routes (from their feedback)

- The app never checks mirrors or signals for the learner, and never says it has.
- The camera stays behind and above the car: no driver's-seat framings.
- Each paused picture must make the right answer evident: the traffic that decides it is in view and close enough
  to matter. No pause where nothing needs deciding.
- No long gaps between challenges: transit plays four times as fast between distant challenges.
- Buttons include plausible wrong choices; pressing every button must never pass.
- Cars go round mini-roundabout discs; every road user obeys lights; cars signal correctly.
- Only the eight designated challenges are scored; other junctions are driven by the app.

## How a route is made (the process)

1. **Check the owner's route against the map.** Survey the scene (roads by name, junctions where named roads meet,
   signal sets, crossings, mini-roundabouts) and the raw OSM where needed (`api.openstreetmap.org/api/0.6/map` for a
   small bbox; overpass.openstreetmap.fr refuses unlisted users). Report what does not match and ask the owner.
   For route 2, the map had no Mascalls Lane mini-roundabout, so challenges 6 and 7 were swapped (owner's choice).
2. **Build one scene for the routes** with `tools/scenes/build_scene.mjs`:
   `node tools/scenes/build_scene.mjs brentwood-routes "Brentwood" 51.6105 0.2912 1250 - 51.61049,0.29790 51.61035,0.29870 876629792,876629793`
   (the last argument adds the test centre's service-road way in, which the generator skips otherwise).
   Scene metres: x east, z south.
3. **Plan the learner's way** with `through` points (`decisionPath`, which uses `planThrough`, searched up to 12 km).
   Probe what lies along it (roads, stop lines, crossings, minis, kerb cars) by path distance.
4. **Generate each road user's lane path** on the scene's roads (from a start pose through points, with `roundMinis`
   for cars), and save it in `src/decision/routes/brentwoodRouteNPaths.ts`. Each road user drives on out of sight
   (into a side road) rather than stopping in view.
5. **Write the challenges** (`src/decision/routes/brentwoodRouteN.ts`): the instruction and where it is said, the
   road users started (and where), each stage's pause (on the move, or stopped at a point), the road user that sets
   the moment (`when`), the camera (`yaw` negative looks right; about -75 at a give way line, -155 to -170 to see
   behind for a move-off), `quiet` circles, `lights` (held green, or `lights:'red'` in a stage), the buttons, rules,
   accepted orders and explanations.
6. **Drive it headless** (`tests/unit/decisionDrive.test.ts`; quick runs via a scratch test that calls
   `drive(answers, only, traffic, seed, route)`): every pause where it should be, the deciding road user at its
   point, nothing hit, no red light run, the car on the road, back into the test centre at the end. Then with
   30 background road users (patterns 4 and 14).
7. **Play it in the real app** (build, `vite preview`, a Playwright script that answers each pause and screenshots
   it) and look at every pause picture. Reframe any where the deciding traffic is out of view.
8. **Record the voice** for new instructions: `node tools/voice/make_voice.mjs` (examiner and instructor clips).
9. Update `ROUTES.md`, `DECISION_MOCK.md`, the browser test `tests/browser/g40-decision-test.spec.ts`, then commit,
   push and stage.

## Owner's rules added on review (7 and 8 November)

- One decision before and one after per challenge, more only where two hazards meet (`beforeAfter.ts`).
- Holding back is always **Give way**. Every turn offers both signals and all three mirrors (`turnButtons.ts`).
- The challenge panel can be hidden while paused (‹), and brought back from the tab on the left.
- The sky dome follows the camera (it hid everything over 550 m from the place's middle).

## New engine pieces (this round)

- `route.parked`: vehicles a route parks (the Queen's Road van), drawn, solid, passed by car and traffic.
- `route.shifts`: the car's way moved left (pulling in to the kerb) or right (round a corner) between two points.
- `place.lights:'red'` per stage; `lightsAll` holds a whole set green; a held red lets queued traffic through first.
- `selfCancel:false`: the signal stays on after a pull-up (cancelling it is the learner's).
- `runner.rate`: four times as fast between distant challenges; real time 60 m before the next is in hand.
- The road is kept clear while the car pulls out of the test centre.
- A road user shared by two challenges starts once.
- Pacing: the awaited road user is no longer slowed once the car waits at its line (it crawled forever in heavy
  traffic before).
- Indicators: turning stretches within 6 m are one manoeuvre (a right turn round a mini disc signals right, not
  left; ahead signals nothing).
- New buttons: wait, slow down, speed up, flash headlights, position to the right, stop at / past the junction,
  handbrake, neutral, cancel signal, hazard lights.
- Staged drives' time limit is 2400 s (route 2 is 5.2 km).
- Driver's-seat framings removed.

## State at handover

- Route 1 (8 challenges) and Route 2 (8 challenges) built on `brentwood-routes`; old scene `brentwood-route-1`
  removed; both routes on the home screen.
- Passing: typecheck, all other unit tests (516), the 10 drive tests without traffic (both routes, the
  interventions and practice), Route 1 played in
  the app to a pass.
- Not yet green: the drive tests with background traffic.
  - Route 1, pattern 14: the car stood at Wilson's Corner waiting for the Ingrave Road car, which crawled (fixed in
    the pacing change above; re-run to confirm).
  - Route 1, pattern 4: a background car came towards the car in a quiet circle at King Edward Road (quiet circle
    added on Kings Road south; re-run).
  - Route 2: background traffic queued at the held-red Brook Street lights kept the car from its stop line (held red
    now lets queued traffic through first; re-run).
- Not yet done: replay Route 2 in the app after the reframing, browser test run, staging deploy, owner review.
- To confirm with the owner: the test centre's way in (OSM ways 876629792/876629793 on Warley Hill).
