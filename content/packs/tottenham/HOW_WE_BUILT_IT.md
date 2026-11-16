# How the Tottenham route was built

Batch 2, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Isleworth route
(`../isleworth-fleming-way/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the evidence
pointed to roads and junctions; the route was chosen for what it teaches and for what the engine can drive as depicted.

## 1. Find the centre as it is now

The evidence file gives the Annex Building, Selby Centre, Selby Road, N17 8JL, from DVSA's bulletin opening it (9
January 2017) and DVSA's centre data as quoted on a pass-rate site in 2026; it ran 12,178 tests in 2024-25, so it is
open. gov.uk could not be opened from this machine: *to recheck on the gov.uk centre finder*. In OpenStreetMap Selby
Road is a 20 mph cul-de-sac north off White Hart Lane, ending at the Selby Centre's gate (a service road and car park
beyond). The route starts on Selby Road by the gate, facing south, and comes back up it.

## 2. Read the evidence, then choose

`content/sources/pass2/tottenham-evidence.json`: one confirmed junction (the Great Cambridge roundabout, A10 / A406,
named in two learners' own reviews) and three likely roads (Selby Road, the A10 and the A406, from one editorial page).
No free source lists turn-by-turn roads; the paid route packs were not used.

The choice: west and north by the A10, with a loop through the streets east of it, so that the eight challenges
cover the whole mix and are 300 m apart. The A10 (the evidence's road) is driven both ways, between White Hart Lane
and Wilbury Way northbound and from Weir Hall Avenue southbound.

What the map changed:

- **The Great Cambridge roundabout** is a signal-controlled four-lane gyratory on trunk roads, the A406 under it: in
  the scene one-way roads with lights, not a give way roundabout (as Morden's Rosehill). Left out; the route's
  roundabout is the Weir Hall Avenue one. So the route meets neither the share on the evidence's roads (37%) nor the
  known junctions (0 of 8): reasons in `ROUTES.md`.
- **Selby Road meets White Hart Lane at a fork on a bend**, straight on to the south: not a clear emerging turn. The
  route goes out by Oak Avenue and Weir Hall Road instead.
- **Weir Hall Avenue's last stretch to the A10** is unnamed in two pieces, one 23 m: named in `osm-patches.json` so
  the planner takes it.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2000 m, 6 x 6 tiles), the centre's fixes applied
(`patch_osm.py`), then the scene, 2.4 km square, centred north-west of the centre to take in the A10 to Wilbury Way:

```
python3 -I tools/centres/fetch_osm.py tottenham.osm 51.60746 -0.079 2000 6 --patches content/packs/tottenham/osm-patches.json
node tools/scenes/build_scene.mjs tottenham-route-1 "Tottenham" 51.611233 -0.083050 1200 tottenham.osm 51.607298,-0.078254 51.606921,-0.078248 705734392,705734393
```

## 4. Plan the line, probe it, script the road users

As Isleworth: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts and side roads by metres along it, and each road user's path planned on the scene's roads. The white car
on White Hart Lane is the road's centreline offset into its left lane (`tools/scenes/lane_path.py`). Each road user
the pause waits for is set going from close in, as the car comes to its stop, and each path ends soon after its moment.
Paths start clear of the cars parked on Weir Hall Road and Weir Hall Avenue. The pull-up is on Wilbury Way, which has
no cars parked along it. Background traffic is kept off Oak Avenue and Weir Hall Road (narrow, cars parked) while the
challenges round them are in hand (`quietUntil` on challenges 1, 5 and 7).

## 5. Drive it

One drive without traffic: every pause as depicted and a pass, but it touched the bollards on the splitter islands at
both Weir Hall Avenue roundabouts (lanes about 2.3 m wide beside them) and put a wheel over two corners. Fixes:

| Found | Fix |
|---|---|
| Stopped at the first roundabout's line, the car touched the bollard on the splitter island's nose | Its line kept 1 m to the left on the way in (a `shift`) |
| At the second roundabout, the bollards at the entry and the exit | Kept 0.7 m and 0.5 m to the left |
| Turning out of Oak Avenue into Weir Hall Road (a square corner in the scene), the car crossed the inside corner | Its line kept 1 m wide of the corner |
| Leaving the first roundabout west, the car crossed the inside kerb by about 0.2 m | Not shifted: a bollard 6 m on leaves no room; to check in the next drive (possibly the knock on the entry bollard) |

The drives with traffic (patterns 4 and 14) and with Skip ahead are still to run.

## Still to do

The drives above, then played in the app and every paused picture checked (camera angles are first choices), then
staging and the owner's drive. Shared changes for the app (a button in `sim/index.html`, a voice clip check for the
directions, the sources in `public/legal/credits.html`) are listed in the build report.
