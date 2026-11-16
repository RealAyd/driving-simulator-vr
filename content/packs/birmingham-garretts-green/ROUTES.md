# Birmingham (Garretts Green) decision route

One "Decisions only" practice route from the Garretts Green test centre on Granby Avenue, B33 0SD (gov.uk lists the
centre as current, updated 15 October 2026; OSM has the DVSA building at the given position). One route per centre,
carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md` section 5). Built from OpenStreetMap data and the published
evidence in `content/sources/pass2/birmingham-garretts-green-evidence.json`, November 2026. A practice route, not a
confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** The test centre's way in is a gated service road (OSM way 849430648) off the south-east end of
Granby Avenue, beside the DVSA car park. The route starts on it 60 m short of Granby Avenue, facing it, leaves right,
and comes back along Granby Avenue from the north-west (a left turn in), finishing on the same way in by the car park.
*To confirm: where tests start and finish within the site.*

**Evidence.** Every road and junction in the evidence file is *likely* (one author, drivingtesttips.biz; the second
site copies it word for word). The centre has not moved, so the lists count for leaving and returning too.

## Meadway and The Radleys (scene `birmingham-garretts-green-route-1`, 6.4 km)

Out of the test centre, right on to Granby Avenue, right at its end on to Garretts Green Lane, right (third exit) at
the Meadway roundabout, Meadway, right at the Mackadown Lane lights, Mackadown Lane under the low bridge (pulling up and
moving off), right on to The Radleys over its signal crossing, ahead at the Church Road roundabout on to Sheldon Heath
Road, right into Kenmure Road, left on to Admington Road, left on to Mickleton Avenue, right at the Garretts Green Lane
mini-roundabout, Garretts Green Lane, right into Granby Avenue, left into the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, right on to Granby Avenue | A white car coming along Granby Avenue from the right; then a blue car from the left, from the end of Granby Avenue | Look right, signal right, give way; look left, give way; look right and left, go |
| 2 | Meadway roundabout, right (third exit) on to Meadway | A black car coming round from Meadway, from the right, on its way to Lea Hall Road | Mirrors, signal right; look right, give way; look right again, go |
| 3 | Meadway at the Mackadown Lane lights, turn right | Green; a grey car coming along East Meadway opposite, going ahead | Mirrors, signal right, position; wait in the junction; look into Mackadown Lane, go |
| 4 | Pull up on Mackadown Lane, south of the low bridge | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 5 | Move off | The cyclist coming past | Mirror and blind spot, wait; again, go |
| 6 | The Radleys signal crossing by Lychgate Avenue | Red; a pedestrian stepping out from the left | Interior mirror, slow down; wait at the line; on green, check the crossing both ways, go |
| 7 | Kenmure Road, left on to Admington Road | A red car coming round the bend of Admington Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 8 | Garretts Green Lane mini-roundabout, right from Mickleton Avenue | A green car coming down Garretts Green Lane, from the right, going ahead round the mini-roundabout | Mirrors, signal right; look right, give way; look right again, go |

**The mix** (rule 4), all on this route: traffic lights (3, and the crossing's lights in 6), a large roundabout (2) and
a mini-roundabout (8), emerging right (1) and left (7), a right turn across oncoming traffic (3), a pedestrian crossing
(6) and the pull-up and move-off pair (4, 5). The turns between them (right out of Granby Avenue, right out of Mackadown
Lane on to The Radleys, the Church Road roundabout, the way back in) are driven without a challenge.

**Known junctions** (5 of 8): the test centre's way out on Granby Avenue (1), the Garretts Green Lane / Meadway / Lea
Hall Road roundabout (2), the Meadway / Kitts Green Road / East Meadway / Mackadown Lane lights (3), the Kenmure Road /
Admington Road junction (7) and the Garretts Green Lane / Mickleton Avenue mini-roundabout (8). The Church Road / The
Radleys / Sheldon Heath Road roundabout and the Granby Avenue / Garretts Green Lane junction are driven through.

**Overlap** (rule 3): 95% of 6.4 km on likely roads (Mackadown Lane 1.43 km, Granby Avenue 1.33, Garretts Green Lane
0.80, The Radleys 0.78, Meadway 0.62, Admington Road 0.28, Sheldon Heath Road 0.27, Kenmure Road 0.27, Mickleton
Avenue). Not named: the test centre's way in and the roundabouts' rings.

## Checker

`node tools/centres/check_route.mjs birmingham-garretts-green-1`: passes (6.4 km, 95% on likely roads, 5 of 8 at known
junctions, spacing met, nothing missing from the mix).

## Choices

- **Why this loop.** It takes the junctions the lists name most (the Meadway roundabout and the Mackadown Lane lights,
  which almost every listed route uses) and the one signal crossing on the way round (The Radleys), and it comes back
  by the Mickleton Avenue mini-roundabout, the only mini-roundabout on the lists' roads in reach. Mackadown Lane, the
  spine of the loop, has a long stretch south of the low bridge with no cars parked on the near side: the pull-up.
- **Emerging left.** Kenmure Road's end on to Admington Road (a listed turn) rather than Admington Road's end on to
  Mickleton Avenue: the latter is under 300 m from the mini-roundabout.
- **Left out.** The A45 Coventry Road lights (Hobs Moat Road, Sheaf Lane), Cooks Lane and the Chelmsley Wood roads, and
  the Sheldon Heath Road six-arm roundabout: further than one 6 km loop reaches with the junctions above, or (the
  six-arm roundabout) under 300 m from the Mickleton Avenue mini-roundabout on the way back.

## Found on the map

- **The test centre's way in is private** in OpenStreetMap, so the scene builder left it out: its access tag is dropped
  in our copy (`osm-patches.json`) and the way added to the scene by its id.
- **An unnamed road runs beside it**, 19 m away (OSM way 692706492, Bannerley Road to Granby Avenue): the route's last
  point is placed just off the way in, on the far side from it, so the plan takes the way in.
- **Mackadown Lane under the low bridge** is two short unnamed ways (11 m and 43 m) the planner will not route through:
  named Mackadown Lane in our copy (`osm-patches.json`).
- **Splitter-island bollards** at the Meadway roundabout's way in from Garretts Green Lane and the Church Road
  roundabout's way in from The Radleys stood close to the car's line: it keeps 0.8 m further left on the way in (a
  `shift`). Turning from Granby Avenue into the test centre, the car cut the inside corner on to the footway: it swings
  0.8 m wider (a `shift` to the right).

## Drives

One drive without traffic, on the first version (`decisionDrive.ts`'s `drive`, 3 minutes): the right answers to a
pass, all 17 pauses as depicted (each road user within 0.1 m of its point), no red light run, closest scripted road
user the cyclist passing the car pulled up, 3.22 m. It touched the two splitter bollards and put a wheel on the footway
turning into the test centre (fixed as above, checked against the planned line, not driven again). The full drive test
(`ROUTES=birmingham-garretts-green-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`, with traffic and Skip
ahead) is left to the main session.

## Open items

- The full drive test with traffic (patterns 4 and 14) and with Skip ahead.
- Where tests start and finish within the site; a first-hand source (instructor video, learner account) to confirm any
  road; the route lists' dates.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
