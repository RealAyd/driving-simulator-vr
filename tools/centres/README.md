# Building a centre's decision routes

The steps the pilot centres (Salisbury, Sheffield (Middlewood Road), Morden) took, as commands. The rules are in
`content/packs/ROUTE_TEMPLATE_RULES.md`; the method in `content/packs/*/HOW_WE_BUILT_IT.md`.

1. **Map data.** Tiles merged into one file, with the centre's map fixes applied:

   ```sh
   python3 -I tools/centres/fetch_osm.py <scratch>/<slug>.osm <lat> <lon> <half> 3 --patches content/packs/<slug>/osm-patches.json
   ```

   A fix is needed where the map is right but the engine reads it wrongly (a building on a roundabout's island, a
   signal at a way end). Record each in `content/packs/<slug>/osm-patches.json` with its reason (`patch_osm.py` lists
   the kinds), never by hand-editing the download, so the scene can be rebuilt the same.

2. **Scene.** `node tools/scenes/build_scene.mjs <slug>-route-N "<label>" <lat> <lon> <half> <scratch>/<slug>.osm [start lat,lon] [facing lat,lon] [service way ids]`.
   The scene records the point it is built round, for step 4.

3. **Routes.** `src/decision/routes/<camel>RouteN.ts` and `…Paths.ts`, as `chelmsfordRoute1.ts`; listed in
   `src/decision/routes/index.ts`, with a button in `sim/index.html` and the directions recorded
   (`node tools/voice/make_voice.mjs`).

4. **Rules.** `node tools/centres/check_route.mjs <slug>-1`: length, the share on confirmed and likely roads,
   each challenge's kind and the known junction it is at, spacing, and the mix, against
   `content/sources/pass2/<slug>-evidence.json`. Exits 1 when a rule is not met; a rule the area cannot meet is
   explained in `ROUTES.md`.

5. **Drives.** `CENTRE=<slug> npx vitest run tests/unit/decisionDrive.centre.test.ts`: the authoring rules, and each
   route driven with the right answers, with traffic (patterns 4 and 14) and with Skip ahead. A route's own moments
   (the cyclist close behind as the car moves off) can be checked in a test file of the centre's own.

6. **Docs and credits.** `content/packs/<slug>/ROUTES.md` and `HOW_WE_BUILT_IT.md`, with step 4's numbers; the
   sources used listed in `public/legal/credits.html` (`#route-sources`).
