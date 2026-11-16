# Building a centre's decision route (batch 2 on)

One helper per centre, **one route per centre** (the owner's decision), carrying the whole mix (ROUTE_TEMPLATE_RULES section 4). As the pilots (Salisbury, Sheffield (Middlewood Road), Morden) were built, with the tools that
came out of them. Read first, in this order:

1. `content/packs/ROUTE_TEMPLATE_RULES.md` (the rules) and `EVIDENCE_PLAN.md` section 7 (**judgement comes first**:
   sources inform, never decide; never copy a route).
2. `tools/centres/README.md` (the steps, as commands).
3. A finished pilot for the method and the shape of the files: `content/packs/morden-london/` (ROUTES.md,
   HOW_WE_BUILT_IT.md, osm-patches.json), `src/decision/routes/mordenRoute1.ts` and `mordenRoute1Paths.ts`.
   `src/decision/route.ts` and `runner.ts` are read only.
4. Your centre's evidence: `content/sources/pass2/<slug>-evidence.json`.

## What to make (your files only)

- `content/packs/<slug>/osm-patches.json` (if the map needs fixes), the scenes `public/scenes/<slug>-route-N.json.gz`,
  the routes `src/decision/routes/<camel>RouteN.ts` and `<camel>RouteN.Paths.ts` (id `<slug>-1`),
  `content/packs/<slug>/ROUTES.md` and `HOW_WE_BUILT_IT.md`.
- To try your routes in the checker and the shared drive test, add them to `src/decision/routes/index.ts` (two
  imports and the list). That is the one shared file you may touch; nothing else outside your centre.
- Optional: `tests/unit/decisionDrive.<slug>.test.ts` for checks of your routes' own moments only.

## Done means

- `node tools/centres/check_route.mjs <slug>-1` passes, or each rule it reports is one the area cannot meet,
  explained in ROUTES.md.
- `npx vitest run tests/unit/decision.test.ts` passes (add your straight-ahead challenges, keyed `<route-id>:<id>`,
  to its lists if needed; that file may be edited for this only).
- `CENTRE=<slug> npx vitest run tests/unit/decisionDrive.centre.test.ts` passes. Drives take 10 to 40 minutes each on
  a shared machine: run one route at a time (`ROUTES=<slug>-1`), and only once the checker passes.

## Do not

- Edit other shared files (`runner.ts`, `route.ts`, `plan.ts`, `sim/index.html`, other centres' files). If the
  engine needs changing, stop and describe it in your report.
- Commit or push (the main session does).
- Keep scratch files in the repository: use `/tmp/claude-0/-home-user/ab85732d-aff5-5dcd-9d6c-2b677b1f9bb8/scratchpad/build-<slug>/`.

## Report

Per route: the 8 challenges, length, the checker's output, the drive results (each pattern, with skips), and anything
shared that needs changing.
