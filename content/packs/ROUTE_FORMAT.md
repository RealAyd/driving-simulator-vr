# Decision test route format

The format every decision test route uses: the "Decisions only" mock tests, where the car drives itself and the
learner decides at each challenge. A route is TypeScript data in `src/decision/routes/`, played on a map scene in
`public/scenes/`. This is the contract an agent building a new route works to. The worked example is Brentwood
(`content/packs/brentwood/HOW_WE_BUILT_IT.md`).

Source of truth: `src/decision/route.ts` (the route), `src/decision/assess.ts` (stages and marking),
`src/decision/beforeAfter.ts` and `src/decision/turnButtons.ts` (the shared rules). If this file and the code
disagree, the code wins: fix this file.

Coordinates are scene metres from the scene's centre: **x east, z south**. Headings are degrees clockwise from north.

## Files for one route

| File | What |
|---|---|
| `public/scenes/<scene>.json.gz` | The map scene, built by `tools/scenes/build_scene.mjs` (one scene can carry several routes). |
| `src/decision/routes/<centre>Route<N>.ts` | The route: start, way, road users, challenges. |
| `src/decision/routes/<centre>Route<N>Paths.ts` | The road users' lane paths, generated on the scene's roads (long point lists, kept apart). |
| `src/decision/routes/index.ts` | `DECISION_ROUTES`: add the route here. |
| `sim/index.html` | A `data-decision-route="<id>"` button under "Decisions only". |
| `public/voice/`, `public/voice/examiner/` | Recorded clips for each new instruction (`node tools/voice/make_voice.mjs`). |
| `content/packs/<centre>/ROUTES.md` | The route as a table for the owner (challenge, traffic, right answer). |

## The route (`DecisionRoute`)

```ts
export const CENTRE_ROUTE_1:DecisionRoute=withTurnButtons(withBeforeAfter({
  id:'centre-1',                 // used by the home screen button
  title:'Centre route 1',
  scene:'centre-routes',         // public/scenes/centre-routes.json.gz
  briefing:'...',                // shown before the start
  start:{x,z,headingDeg},        // the test centre's way out
  through:[{x,z},...],           // points the drive passes, in order; the way is planned on the scene's roads
  actors:[...],                  // the road users the challenges use
  challenges:[...],              // eight, in driving order
  parked:[...],                  // optional: vehicles the route parks (an obstruction to pass)
  shifts:[...]                   // optional: the car's line moved (pulling in to the kerb, round a tight corner)
},BEFORE));                      // which stages merge into the "before" decision (below)
```

- `through` ends inside the test centre's way in: the drive finishes there.
- `parked`: `{x,z,headingDeg,kind:'van'|'car',colour?}`. Drawn, solid; the car's line and background traffic pass it.
- `shifts`: `{from,to,left}`. `left` in metres (negative: right), eased over 14 m at each end.

## Road users (`RouteActor`)

```ts
{id:'kings-car',name:'grey car',colour:'#8a9099',speed:10,path:pts(KINGS),
 kind:'car'|'cyclist'|'pedestrian',  // default car
 yields:true,      // brakes for the learner's car (one following it)
 waits:true,       // shown standing at the start of its path while its challenge is in hand (a car at a give way line, someone at the kerb)
 parks:true,       // stays at the end of its path instead of turning off out of sight
 signals:[{from,to,side}]}  // indicators where its turns alone do not tell (round a big roundabout)
```

- Paths are **generated on the scene's roads**, never drawn by hand: a start pose and points to pass, planned like the
  car's own way, so they keep to their lane, go round mini-roundabout discs, and stop at red lights.
- Every road user drives on **out of sight** at the end (into a side road), unless `parks`.
- Cars signal by themselves for each turn on their path.

## Challenges (`ChallengeDef`)

```ts
{
  id:'kavanaghs-emerge',
  title:'Emerging, left turn',
  where:'Kavanaghs Road, left on to London Road',     // results screen
  turn:'left',                // left|right for any turn, pull-up, move-off or pull-out; omit for straight ahead
  instruction:'At the end of the road, turn left, please.',   // examiner, spoken and shown
  instructAt:{x,z},           // said as the car passes here
  starts:[{actor:'london-car',at:{x,z},delay:0}],             // road users set going as the car passes a point
  endAt:{x,z},                // challenge over (signal cancels) once the car passes here
  selfCancel:false,           // only after pulling up: cancelling the signal is the learner's job
  lights:{x,z},lightsAll:true,// optional: the stop line whose lights are held (green unless a stage says red)
  quiet:[{x,z,radius}],       // background traffic kept out: the junction and the approaches its road users use
  place:{<stageId>:StagePlace,...},   // how each stage looks
  stages:[Stage,...]                  // what each stage asks and how it is marked
}
```

### How a stage looks (`StagePlace`)

```ts
{
  pause:{kind:'moving',at:{x,z}} | {kind:'stop',at:{x,z}},  // on the move as the car passes a point, or stopped there
  when:{actor:'london-car',at:{x,z}},   // the pause waits until this road user reaches this point
  lights:'red',                         // its lights red in this stage
  panel:'right',                        // buttons on the right, when the hazard is on the left
  frame:{yaw,pitch,shift},              // camera behind the car: yaw negative turns to the right; pitch raises it; shift moves the view sideways (m)
  state:'Approaching the end of Kavanaghs Road.'   // one line under the instruction
}
```

### What a stage asks (`Stage`, `assess.ts`)

```ts
{
  id:'approach',
  buttons:['mirror-interior','mirror-left','signal-left','look-right','creep','give-way','go'],
  go:'go', wait:'give-way',        // the two decisions; holding back is always Give way
  safe:'wait'|'go'|'approach',     // what the picture shows: waiting is right, going is right, or no decision yet
  rules:[...],                     // see below
  neutral:['look-left'],           // harmless here: no fault, no credit
  accepted:[['mirror-interior','mirror-left','signal-left','look-right','give-way']],  // every safe order (each must mark fault-free)
  next:{wait:'clear',go:'clear'},  // the stage after waiting / going / an approach ('done' ends the challenge)
  explain:'...'                    // the right decision and why (results screen)
}
```

Rules (any safe order the rules allow passes, not one model answer):

| Kind | Meaning |
|---|---|
| `before` | `action` needs `needs` first (mirrors before signal). Marked when the action is taken; a check afterwards does not undo it. `any:true`: one of them is enough. |
| `required` | One of `anyOf` must be in the stage, `when:'go'` or `'wait'` (or always). Judged at Done. |
| `unsafe` | Going puts the depicted road users at risk: dangerous, the examiner holds the car, and the decision comes again once it is clear. |
| `distractor` | A plausible wrong action, with its own level (a wrong-way signal is serious). |
| `hesitation` | Waiting when the stage shows a clear, safe chance (`safe:'go'` only). Time spent thinking while paused never counts. |

Fault levels: `minor`, `serious`, `dangerous`, `feedback` (a note only), each with the DL25 heading. Pass: no serious or
dangerous fault and at most 15 minor (the app's assessment, not a DVSA result).

## Rules every route keeps (enforced by tests in `tests/unit/decision.test.ts`)

1. **One decision before, one after.** The "before" decision is taken on the move, close in (about 15 to 25 m before
   the line), where the junction and the hazard are both in view: mirrors, signal, position, looks and Give way or Go
   in one order. The "after" decision is at the line once the traffic has passed. A third only where two different
   hazards meet at one place (leaving the test centre: a pedestrian, then a car; lights red, then a car blocking the
   turn on green). Write the approach and the line as two stages and merge them with `withBeforeAfter`:
   ```ts
   const BEFORE:Record<string,BeforeMerge>={
     'kavanaghs-emerge':{first:'approach',second:'line',place:{pause:{kind:'moving',at},when:{actor,at},frame,state}}
   };
   ```
2. **Turns show both signals and all three mirrors** at every stage (`turn` set; `withTurnButtons` adds any missing,
   the wrong-way signal as a serious fault, the rest harmless).
3. **Holding back is always "Give way"** (never "Wait").
4. **The interior mirror is offered** wherever the car slows or gives way.
5. **Pressing every button never passes**: each challenge has a serious or dangerous fault somewhere.
6. **The app never checks mirrors or signals for the learner**, and never says it has.
7. **Each paused picture makes the answer evident**: the hazard is in view, close enough to matter, and not under the
   panel (`panel:'right'` when it is on the left). Checked by eye on screenshots before shipping.
8. **No long gaps**: the drive plays four times as fast between challenges far apart, and says "Driving to the next
   challenge."
9. **Background traffic never decides a challenge**: `quiet` circles keep it out while the challenge is in hand.

## Checks before a route ships

1. `npx tsc --noEmit -p .` and `npx vitest run` (the rules above, every accepted order fault-free).
2. `tests/unit/decisionDrive.test.ts` for the route: driven headless with the right answers, with and without 30
   background road users in two patterns. Each pause where it should be, its road user at its point, nothing hit,
   no red light run, the car on the road throughout, back inside the test centre at the end.
3. Played in the app (`npm run build`, `vite preview`, a Playwright script answering each pause) with a screenshot of
   every pause, looked at one by one.
4. Staging (`hostless-staging.yml`), then the owner tries it. Production only when the owner says "deploy".
