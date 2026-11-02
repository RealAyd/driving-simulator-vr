# What the samples need from the scenario engine

The samples keep the existing driving-practice scenario screen, scoring (`FAULT_POINTS`), feedback modal, review and
retry (`frontend/src/game/engine.ts`, `frontend/app/scenario.tsx`). That engine judges a set of taps: which mirrors
were checked, the signal, whether the learner gave way, then the goal action. It cannot express order ("mirror before
signal"), stages (the scene moving on after "Give way"), looks (right and left at a junction) or a fault recorded at
the moment it happens. The samples need a small, backwards-compatible addition: existing variants work unchanged.

## Additions to a variant (all optional)

- `stages`: an ordered list. Each has its images (`main`, plus the image a look or mirror button shows), what each
  observation reveals (as `mirrors` does now), and which actions move to the next stage (`advance_on`, for example
  `give_way` or `brake`).
- New action ids (labels and icons on the backend's `ACTIONS` list): `look_right`, `look_left`, `creep_forward`,
  `sound_horn`, `enter_roundabout`, `right_lane`, `left_lane`, `cancel_signal`.
- `rules`: checked when an action happens, never later:
  - `before`: an action needs others first (for example `signal_left` needs both mirrors). A miss is recorded at that
    moment as the fault given. A later mirror check does not erase it.
  - `fresh`: a commit action needs an observation made since the stage began (a look right after waiting).
  - `unsafe`: a commit action in a stage where the depicted traffic would be put at risk, with its level (serious or
    dangerous).
  - `hesitation`: waiting in a stage that shows a sustained safe opportunity. The existing 5 s idle timer only arms in
    such stages.
  - `distractor`: an action with its own outcome (a fault level, or feedback only, with no fault).
- `accepted`: example sequences, for authoring checks and for the review screen. Scoring works from the rules, so any
  safe order the rules allow passes, not only the listed ones.

## Scoring

The existing points and pass rule are kept (correct +25, observation +5, minor −3, serious −10, dangerous −25; a
scenario passes with no serious or dangerous fault and up to 3 minors). Each recorded fault keeps its DL25 heading
for the review screen.
