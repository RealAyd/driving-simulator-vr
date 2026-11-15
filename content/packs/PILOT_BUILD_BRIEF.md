# Pilot build: one centre, two decision routes

For each pilot centre (Salisbury, Sheffield (Middlewood Road), Morden (London)), build two "Decisions only" routes the
way Chelmsford was built. Read first, in this order:

1. `content/packs/ROUTE_TEMPLATE_RULES.md` (the rules, with the owner's agreed items) and `EVIDENCE_PLAN.md` section 7
   (**judgement comes first**: sources inform, never decide).
2. `content/packs/brentwood/HOW_WE_BUILT_IT.md` and `content/packs/chelmsford/HOW_WE_BUILT_IT.md`, `chelmsford/ROUTES.md`
   (the method), `content/packs/ROUTE_FORMAT.md` (the format).
3. `src/decision/routes/chelmsfordRoute1.ts` and `chelmsfordRoute1Paths.ts` (a finished route to copy the shape of),
   `src/decision/route.ts`, `src/decision/runner.ts` (read only).
4. Your centre's evidence: `content/sources/pass2/<slug>-evidence.json` and `content/sources/pass2/SUMMARY.md`.

## What to make (your files only)

- Scenes: `node tools/scenes/build_scene.mjs <slug>-route-1 "<label>" <lat> <lon> 1200 [osm file]` (and route-2). For
  an area too big for one OSM API call, fetch tiles with curl from `https://api.openstreetmap.org/api/0.6/map?bbox=`
  and merge, as Chelmsford did. Output: `public/scenes/<slug>-route-N.json.gz`.
- Routes: `src/decision/routes/<camel>Route1.ts`, `<camel>Route1Paths.ts`, and the same for route 2. Ids
  `<slug>-1`, `<slug>-2`. 8 challenges each, the agreed mix (ROUTE_TEMPLATE_RULES section 4), at least 3 of 8 at
  known junctions from the evidence file, more than half the length on confirmed/likely roads, routes leave in
  different directions, no scenario repeated.
- Docs: `content/packs/<slug>/ROUTES.md` and `HOW_WE_BUILT_IT.md` (as Chelmsford's), including the overlap numbers.
- A test file of your own: `tests/unit/decisionDrive.<slug>.test.ts`, driving both routes headless with
  `tests/unit/decisionDrive.ts` (`drive(answers,null,traffic,seed,route,skip)`): pass with the right answers, every
  pause as depicted, nothing hit, back at the start; with traffic (seeds 4 and 14); and with Skip ahead. Run it with
  `npx vitest run tests/unit/decisionDrive.<slug>.test.ts`.

## Do not

- Edit shared files: `src/decision/routes/index.ts`, `runner.ts`, `route.ts`, `sim/index.html`, `tests/unit/decisionDrive.test.ts`,
  or anything outside your centre's files. If a shared change is needed (a runner fix, a new mechanic), stop and
  describe it in your report; the main session makes it.
- Commit or push (the main session commits).
- Copy any route from a source. Sources name roads; you choose the route.

## Report (when done or blocked)

Per route: the 8 challenges, length, the overlap numbers, test results (each seed, with skips), and anything shared
that needs changing.
