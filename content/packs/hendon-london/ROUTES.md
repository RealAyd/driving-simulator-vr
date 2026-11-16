# Hendon (London) decision route

One "Decisions only" practice route (one route per centre, the owner's decision) from the Hendon test centre at
3 Aviation Drive, Beaufort Park, NW9 5TZ (the evidence file's address, checked 15 November 2026; the map's "DSA
Driving Test Centre" point is on Aviation Drive, off the Boulevard Drive / Caversham Road crossroads). Built from
OpenStreetMap data and the published evidence in `content/sources/pass2/hendon-london-evidence.json`, November 2026.
A practice route, not a confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format:
`../ROUTE_FORMAT.md`.

**Start and finish.** The route starts on Aviation Drive facing the crossroads and leaves down Caversham Road to
Aerodrome Road, as every route in the old DVSA list leaves ("left" or "right" on to Aerodrome Road). It comes back by
Heritage Avenue and Boulevard Drive and finishes on Aviation Drive by the centre. *To confirm: that Caversham Road is
the way tests leave today.*

## Route 1: Greyhound Hill, The Burroughs and Watford Way (scene `hendon-london-route-1`, 4.5 km)

Out of the centre, Caversham Road, left on to Aerodrome Road, ahead at the Watford Way lights into Greyhound Hill
(over its zebra), Church End, right on to The Burroughs (pulling up and moving off), Watford Way north (by Station
Road), left at the lights into Aerodrome Road, right at the Grahame Park Way roundabout, Grahame Park Way, right into
Heritage Avenue, Boulevard Drive and back up Aviation Drive.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: Caversham Road, left on to Aerodrome Road | A blue car coming along Aerodrome Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 2 | Aerodrome Road at the Watford Way lights, ahead into Greyhound Hill | Red light | Interior mirror, slow down, no signal, wait at the line; on green, look along both carriageways, go |
| 3 | Church End, right on to The Burroughs | A white van coming along Church Road from the left, going on down The Burroughs | Mirrors, signal right; look right and left, give way; look right, left and right, go |
| 4 | Pull up on The Burroughs, past Egerton Gardens | A cyclist behind | Choose past Egerton Gardens, mirrors, signal; handbrake, neutral, cancel signal |
| 5 | Move off | The cyclist coming past, turning into Burroughs Gardens | Mirror and blind spot, wait; again, go |
| 6 | Watford Way at the Aerodrome Road lights, left turn over the pedestrian crossing in Aerodrome Road's mouth | Green; a pedestrian on the crossing | Mirrors, signal left; give way to the pedestrian; left mirror, look, go |
| 7 | Grahame Park Way roundabout from Aerodrome Road, third exit (right) | A black car coming round from Grahame Park Way | Mirrors, signal right; look right, give way; look right again, go |
| 8 | Grahame Park Way, right into Heritage Avenue | A silver car coming the other way | Mirrors, signal right, position; wait for it; look into Heritage Avenue, go |

**The mix** (rule 4): lights (twice: ahead, and left with a pedestrian crossing), a large roundabout, emerging left
and right, a right turn across oncoming traffic, a pedestrian crossing, and the pull-up and move-off pair. **No
mini-roundabout**: none lies on these roads. The nearest (the Lanacre Avenue ones in Grahame Park, named in the
evidence, and Colindeep Lane's) are reached only by a second loop; with 8 challenges for 9 kinds, one kind has to go
or share a challenge, and the mini was the one left out (the Greyhound Hill zebra, driven over, is not a challenge:
the pedestrian crossing is at the Aerodrome Road lights instead).

**Known junctions**: the Aerodrome Road / Watford Way lights (2, 6) and the Grahame Park Way roundabout (7): 3 of 8.

**Overlap** (rule 3): 80% of 4.5 km on roads in the evidence file (Aerodrome Road 1.4 km, Watford Way 0.9 km, The
Burroughs 0.5 km, Greyhound Hill 0.4 km, Grahame Park Way, Church End). Not named anywhere: Caversham Road, Aviation
Drive, Boulevard Drive and Heritage Avenue (the centre's ways out and in).

## Checker output (`node tools/centres/check_route.mjs hendon-london-1`)

```
hendon-london-1 (Hendon route 1): 4.5 km
  On confirmed or likely roads: 80%
  1. leave-test-centre            emerging-left             20 m
  2. aerodrome-lights             lights                   420 m (+400)  at Aerodrome Road and Watford Way lights
  3. church-end-emerge            emerging-right          1200 m (+780)
  4. burroughs-pull-up            pull-up                 1520 m (+320)
  5. burroughs-move-off           move-off                1650 m (+130)
  6. aerodrome-left               lights+crossing         2650 m (+1000)  at Aerodrome Road and Watford Way lights
  7. gpw-roundabout               roundabout              3730 m (+1080)  at Aerodrome Road and Grahame Park Way roundabout
  8. heritage-right               right-turn              4040 m (+310)
  At known junctions: 3 of 8
  Mix: not on this route: mini-roundabout
```

## Found on the map

- **Five Ways Corner** (A1/A41) is a signal-controlled gyratory of one-way pieces: the engine does not see it as a
  roundabout. Left out, with the A1 beyond it.
- **Right from Aerodrome Road on to Watford Way southbound** is not a movement the junction offers (a slip from
  Greyhound Hill feeds that carriageway; the list never uses it): the route goes ahead into Greyhound Hill and comes
  back up Watford Way.
- **The Watford Way / The Burroughs / Station Road junction** is a set of slips the planner drives through by Station
  Road: driven, not used for a challenge.
- **The Aerodrome Road / Watford Way lights**: the link across the central reservation is a short unnamed way; it was
  named Aerodrome Road in the downloaded data (`osm-patches.json`) so the planner can go ahead into Greyhound Hill.
- **Lismore Boulevard's stub** off Aerodrome Road west of Heritage Avenue is 10 m long and leads only to a private road;
  background traffic turned into it and stood across its mouth. Dropped in the downloaded data.
- **Bristol Avenue's link on to Grahame Park Way** is mapped as one lane beside a contraflow bus lane; drawn 3.2 m wide,
  a car could not turn out of it without crossing the kerb. Given its two lanes in the downloaded data (found on the
  second route, since dropped; kept so the scene is the one the route was driven on).
- **The evidence file's junction positions** were the middle of a named road; the two the route uses were set to the
  junctions themselves.
- **Church End / The Burroughs**: whether Church End gives way to The Burroughs is taken from the map's layout (a side
  road on to a primary road); not surveyed.

## Open items

- Which way out tests use today (Caversham Road assumed), and whether Church End is still used.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture screenshotted and checked; then staging and the owner's drive.
- The sources to add to `public/legal/credits.html` (`#route-sources`): drivingtesttips.biz, intensivelessons.co.uk
  and the Mill Hill Driving Test blog.
