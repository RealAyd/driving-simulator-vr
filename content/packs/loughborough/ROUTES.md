# Loughborough decision route

One "Decisions only" practice route from the Loughborough test centre at the Ark Business Centre, Gordon Road,
Loughborough LE11 1JP, by the station. The address is the evidence file's, checked 15 November 2026 from three
listings and DVSA open data; gov.uk was not reachable. The map's "Loughborough Driving Test Centre" point is on the
service loop at the end of Gordon Road. Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/loughborough-evidence.json`, November 2026. A practice route, not a confirmed test route. How
it was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** The route starts on the centre's service loop, facing its way out to Gordon Road, and finishes
on Gordon Road at the way in. Gordon Road meets Station Boulevard (the A6004 between the Meadow Lane lights and the
station) at a plain T junction; the route turns right out of it, towards the station. *To confirm: how examiners
leave and come back. The evidence predates the move to Gordon Road.*

## Route 1: the station, Park Road and Epinal Way (scene `loughborough-route-1`, 8.1 km)

Out of the centre, right on to Station Boulevard, right at the station lights into Nottingham Road, then Queen's Road,
King Street, Leicester Road, Southfield Road and Royland Road. Left at the Park Road mini-roundabout, along Park Road
(pulling up and moving off), right at the Park Road roundabout on to Epinal Way, ahead at the Beacon Road roundabout,
and right at the Forest Road roundabout. Back by Forest Road, Woodgate, Leicester Road, King Street, Queen's Road,
Nottingham Road and Station Boulevard to Gordon Road.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: end of Gordon Road, right on to Station Boulevard | A white car coming along Station Boulevard from the station, on the right; then a blue car out of the Meadow Lane lights, from the left | Look right, signal right, give way; look left, give way; look right and left, go |
| 2 | The station lights, right into Nottingham Road | Red; a pedestrian still crossing Station Boulevard in front of the car as it turns green | Mirrors, signal right, slow down, stop; on green, give way until they are across; look into Nottingham Road, go |
| 3 | Park Road mini-roundabout, left into Park Road | A red car coming up Beacon Road from the right, going round into Park Road | Mirrors, signal left; look right, give way; look right again, go |
| 4 | Pull up on Park Road, past Charnwood Road | | Choose well past Charnwood Road, mirrors, signal; handbrake, neutral, cancel signal |
| 5 | Move off | A cyclist coming along Park Road from behind, on to Herrick Road | Mirror and blind spot, wait; again, go |
| 6 | Park Road roundabout, right (third exit) on to Epinal Way | A silver car coming round from Epinal Way, on the right, going to Ling Road | Mirrors, signal right, position; look right, give way; look right again, go |
| 7 | Beacon Road roundabout, ahead (second exit) on Epinal Way, 40 mph | A cyclist coming round from Beacon Road, on the right | Interior mirror, no signal; look right, give way; look right again, go |
| 8 | Forest Road roundabout, right (third exit) on to Forest Road | A black car coming round from Forest Road, on the right | Mirrors, signal right, position; look right, give way; look right again, go |

**The mix.** Lights (with a right turn), a mini-roundabout, three large roundabouts, emerging right, and the pull-up
and move-off pair. **Not on this route:**
- emerging left;
- a right turn across oncoming traffic;
- a pedestrian crossing.

The centre has one route, so these are not covered elsewhere. Route 2 had them (see "One route" below). The three
large roundabouts in a row are deliberate: they are the only known junctions within reach (below). Each is a different
decision:
- right turn, with a car coming round;
- ahead at 40 mph, with a cyclist coming round;
- right turn, with a car just joining from the arm before.

**Overlap** (rule 3): 73% of 8.1 km is on roads the evidence names.
- Named (lengths in km): Epinal Way 0.9, Park Road 0.9, Queen's Road 0.85, Forest Road 0.8, Nottingham Road 0.6,
  Leicester Road 0.6, Southfield Road 0.4, Woodgate 0.35, King Street, and the roundabouts themselves.
- Not named:
  - Station Boulevard (0.9 km), built after the route lists were written;
  - Gordon Road;
  - the A6004 between Queen's Road and King Street (New King Street and Wharncliffe Road on the map, 0.8 km out and
    back);
  - Royland Road.

**3 of 8 challenges at known junctions**, as the checker places them: the Park Road roundabout (6), the Beacon Road
roundabout (7) and the Forest Road roundabout (8, the evidence's "Epinal Way roundabouts"). Every known junction in
the evidence is a roundabout, recorded at the position of a road rather than of the junction. Within a scene that also
holds the centre, only these three can be placed on a roundabout, and the route uses all three.

## Checker result

`node tools/centres/check_route.mjs loughborough-1` passes:

```
loughborough-1 (Loughborough route 1): 8.1 km
  On confirmed or likely roads: 73%
  1. leave-test-centre   emerging-right        0 m
  2. station-lights      lights+right-turn   440 m (+440)
  3. park-road-mini      mini-roundabout    2680 m (+2240)
  4. park-road-pull-up   pull-up            3235 m (+555)
  5. park-road-move-off  move-off           3300 m (+65)
  6. park-roundabout     roundabout         3605 m (+305)  at Park Road roundabout
  7. beacon-roundabout   roundabout         4050 m (+445)  at Beacon Road roundabout
  8. forest-roundabout   roundabout+lights  4560 m (+510)  at Epinal Way roundabouts
  At known junctions: 3 of 8
```

## Drive results

`ROUTES=loughborough-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: see `HOW_WE_BUILT_IT.md` section 5.

## Found on the map

- The centre's service loop (way 4337258) is a service road. It is added to the scene by its id.
- Station Boulevard (A6004) is newer than the route lists: none of them name it.
- No map fixes were needed (no `osm-patches.json`).

## Open items

- How examiners leave and come back to Gordon Road.
- The evidence file's roundabout positions: pick the junction nodes, so that "Warwick Way roundabout", "Derby Road
  roundabout" and "Forest Road roundabout" can be matched. Record Station Boulevard if a source written after the move
  names it.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture screenshotted and checked; then staging and the owner's drive.

## One route

The owner settled on one route per centre (ROUTE_TEMPLATE_RULES section 5). Route 1 is kept: it meets the
known-junction rule (3 of 8) where route 2 could not (0 of 8). Route 2 (Belton Road, Derby Road and Belton Road West)
is in the history (commit 5a0eaa1) if a second route is wanted later. Its headless drives were not yet passing: a
crossing island in the one-way square at the North Road lights, and an oncoming car's timing under traffic.
