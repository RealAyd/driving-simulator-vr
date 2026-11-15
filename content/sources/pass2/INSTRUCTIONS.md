# Pass 2: one centre's evidence file

Do `content/packs/EVIDENCE_PLAN.md` section 3 properly for one centre (sections 2, 4, 7 and 8 apply). The legal
check is done (section 8): public pages may be read; only road and junction names are recorded, in our own words;
nothing is copied; paid routes are never used. Judgement comes first (section 7): sources inform, they never decide.

## Fetching pages

WebFetch cannot reach most sites from this machine: read pages with `curl -sL -m 30 -A "Mozilla/5.0" <url>` in Bash
(and strip the HTML), working in your own scratch folder. Do not save page text in the repo.

## Steps

1. **Address.** Confirm the centre's current address on gov.uk ("<name> driving test centre" on gov.uk, or
   find-driving-test-centre pages). Record it, the date checked, and whether it matches the position given to you. If
   the centre has closed or moved, say so and stop after step 1 (write the file with `status`).
2. **Sources.** Start from the centre's pass 1 entry (`content/sources/pass1/out/batch-*.json`, same name). Re-run a
   few searches if useful (at most 6). Open each usable free source (WebFetch) and pull out only the **road names and
   junctions/features** it says tests use. Skip paid pages, pages behind logins, and sites whose terms or robots
   forbid automated reading.
3. **Match to the map.** Check each name exists near the centre (within about 6 km) on OpenStreetMap with Nominatim
   (Overpass is not reachable from this machine): `curl -s -A "route-evidence-check" "https://nominatim.openstreetmap.org/search?q=<Road>&format=json&limit=3&viewbox=<lon-0.08>,<lat+0.05>,<lon+0.08>,<lat-0.05>&bounded=1"`,
   at most one request a second. Matched: record lat/lon (and OSM way/node id). Not found: put the name in `unmatched`.
4. **Judge.** Same author or copied text counts once. First-hand = instructor's own page, instructor video
   (title/description only), learner's own account. A source about an older address counts only for roads further
   out, never for leaving and returning. A road or junction named by two separate sources is **confirmed**, by one
   **likely**.
5. **Write** `content/sources/pass2/<slug>-evidence.json` (slug: lower-case, hyphens) in the format of
   EVIDENCE_PLAN section 4, plus:
   - `"status"`: `"ok"`, `"moved"` or `"closed"`;
   - `"centre_position"`: the lat/lon you used;
   - `"summary"`: counts of confirmed and likely roads and junctions, and whether two routes meeting the overlap
     rule (ROUTE_TEMPLATE_RULES section 3) look possible, in one or two sentences.

No learner usernames, no page text, no screenshots. Do not commit; do not edit other files. Keep any working files
in your own scratch folder `/tmp/claude-0/-home-user/ab85732d-aff5-5dcd-9d6c-2b677b1f9bb8/scratchpad/pass2-<slug>/`.
