# Northampton decision route

One "Decisions only" practice route from the Northampton test centre at the Gladstone Business Centre, Gladstone Road,
Northampton NN5 7QA (DVSA's centre data as quoted on passrates.uk, captured May 2026; gov.uk could not be opened from
this machine: *to recheck on the gov.uk centre finder*). One route per centre, carrying the whole mix
(`../ROUTE_TEMPLATE_RULES.md` section 5). Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/northampton-evidence.json`, November 2026. A practice route, not a confirmed test route. How it
was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** OpenStreetMap has the Gladstone Business Centre (node 4570862590, addressed to Heathfield Way,
NN5 7QA) among the units reached by a service road (way 8384691) that leaves Heathfield Way 25 m from its end at
Gladstone Road. Every free route list starts "DTC left, Heathfield Way, end of road", which fits it. The route starts on
that service road beside the units, facing out, turns left on to Heathfield Way and right at its end on to Gladstone
Road. It comes back up Gladstone Road, turns right into Heathfield Way and finishes on it just past the way in: the
route planner runs a route on 80 m past its last junction, so the car is brought to a stop on Heathfield Way, about 30 m
beyond the mouth of the way in. *To confirm: where tests start and finish.* The way in has no name on the map, but the
planner never has to turn into it (the route starts on it), so no map fix was needed.

**Evidence.** Gladstone Road and the Mill Lane roundabout are *confirmed* (the route lists and a local instructor's
tip on driveJohnson's page); everything else is *likely*, from one route-list publisher (drivingtesttips.biz, routes 1
to 10; intensivelessons.co.uk carries the same text, counted once). The lists start and end at the current centre on
Heathfield Way, so they inform the way out and back as well as the roads further out.

## Mill Lane and Harlestone Road (scene `northampton-route-1`, 3.1 km)

Out of the test centre left on to Heathfield Way and right at its end on to Gladstone Road, the first exit at the Mill
Lane roundabout, down Mill Lane over the signal crossing by Glebeland Road, the first exit at the Harlestone Road
roundabout, along Harlestone Road (A428), left into Warren Road, left at its end on to Dallington Road, right into
Merthyr Road, pulling up and moving off, the first exit at the Merthyr Road roundabout on to Gladstone Road, and right
into Heathfield Way towards the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: Heathfield Way, right at its end on to Gladstone Road | A white car coming down Gladstone Road from the right | Look right, signal right, give way; look right and left, go |
| 2 | Mill Lane roundabout, first exit on to Mill Lane | A black car coming round from Mill Lane, from the right, on its way to Park Drive | Mirrors, signal left; look right, give way; look right again, go |
| 3 | Mill Lane, the signal crossing by Glebeland Road (traffic lights) | Red; a pedestrian crossing from the far side into the car's lane | Interior mirror, slow down, wait at the line; check both ways, go |
| 4 | Harlestone Road roundabout, first exit on to Harlestone Road | A silver car coming round from Harlestone Road (north-west), from the right | Mirrors, signal left; look right, give way; look right again, go |
| 5 | Warren Road, left at its end on to Dallington Road | A blue car coming up Dallington Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 6 | Pull up on Merthyr Road, between Aberdare Road and the Merthyr Road loop | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 7 | Move off | The cyclist coming past, on along Merthyr Road | Mirror and blind spot, wait; again, go |
| 8 | Gladstone Road, right into Heathfield Way | A grey car coming down Gladstone Road towards the car | Mirrors, signal right, position; wait in the road; look into Heathfield Way, go |

**The mix** (rule 4): traffic lights (3), a large roundabout (2), emerging left (5) and right (1), a right turn across
oncoming traffic (8), a pedestrian crossing (3) and the pull-up and move-off pair (6, 7). The lights and the crossing
are one challenge, a signal-controlled crossing met on red, as Kettering's and Chesterfield's: the junction lights the
lists name are on Spencer Bridge Road (1.2 km south) and on Bants Lane at Chiltern Avenue (only on the Bants Lane arm,
1.2 km west). **No mini-roundabout**: the area lacks one in reach. The nearest is in the Brookside Meadows estate
(Woodside Way, 650 m west of the centre, reached only through the estate and named by no source); the ones the lists
use are in Duston (Main Road and Berrywood Road, 2.4 km west). Each would add 2 km or more to a 3.1 km route. In its
place the route has a second, smaller roundabout: the Harlestone Road roundabout (4), named by the lists. The Merthyr
Road roundabout on Gladstone Road is driven through (it comes 230 m after the move-off and 170 m before the last
challenge).

**Known junctions** (rule 3): 5 of 8, the checker's count and by design: the end of Heathfield Way (1), the Mill Lane
roundabout (2, confirmed: the instructor's tip is about it), the Harlestone Road roundabout (4), Warren Road and
Dallington Road (5) and Heathfield Way again (8). Not used: the Spencer Bridge Road lights and the town centre, Duston,
Sixfields and Far Cotton (1.2 to 2.5 km out); the Mill Lane roundabout's right turn towards Kingsthorpe, the subject of
the instructor's tip, leads 1 km away from the rest of the test area (the route takes the first exit there, as the
lists do).

**Overlap** (rule 3): 95% of 3.1 km on the evidence's roads (Mill Lane 0.96 km, Gladstone Road 0.48, Merthyr Road 0.47,
Harlestone Road 0.43, Warren Road 0.34, Heathfield Way 0.10, Dallington Road 0.10). Not named: the centre's way in and
the roundabouts' rings.

## Checker

`node tools/centres/check_route.mjs northampton-1`: passes (3.1 km, 95% on confirmed or likely roads, 5 of 8 at known
junctions, spacing met; mini-roundabout not on the route, as above).

## Choices

- **Why this route.** The way out is fixed by the map and the lists (Heathfield Way, then Gladstone Road), and turning
  right there is the way the instructor's tip describes. From there the lists' nearest loop: Mill Lane to the
  Harlestone Road roundabout, Harlestone Road, Warren Road, Dallington Road and Merthyr Road back to Gladstone Road,
  which gives two roundabouts, a signal crossing, two emerging turns, a quiet residential road for the pull-up and a
  right turn across Gladstone Road to finish. The route copies no list: one stretch (Warren Road, Dallington Road,
  Merthyr Road) follows a list because those streets join only that way.
- **The pull-up** is on Merthyr Road, where its parked cars are all on the other side: the kerb is clear for 60 m
  behind and 30 m ahead of the stop, and the cyclist has room to pass.
- **Left out.** The A45 and the A428 beyond the Harlestone Road roundabout's north-west arm (fast roads, far ends of
  the lists); the town centre.

## Found on the map

- **The centre's way in** is a service road (way 8384691), added to the scene by its id.
- **The Mill Lane roundabout** is mapped as a one-way loop without the roundabout tag; the engine finds it as a ring
  all the same (no fix needed). A toucan crossing with lights stands on the Mill Lane arm just past the exit: held
  green while challenge 2 is in hand.
- **The Merthyr Road roundabout** is small and its splitter islands' bollards stand close to the lanes: the car's way
  is moved over in three places (`shifts`) to keep its box clear of the bollards and its wheels off the kerbs.
- No map fixes were needed (no `osm-patches.json`).

## Drives

`ROUTES=northampton-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: all 6 pass (the authoring rules, the way
clear of parked cars, and the drives without traffic, with traffic patterns 4 and 14, and with Skip ahead). Without
traffic: a pass with no faults, every pause as depicted (16 pauses, each road user within 0.15 m of its point, the
pedestrian at the crossing's first moment 0.3 m, on the move), nothing hit, nothing off the road, no red light run, the
closest scripted road user the cyclist passing the car pulled up (3.02 m).

Two places are tight in the scene and worth watching on a newer engine: the bollard on the splitter island's nose where
Merthyr Road enters its roundabout, and the one where Gladstone Road leaves it (the lanes beside them are about 2.9 m
wide). The car's way is moved over at both (`shifts`); it passes each with under 0.6 m to spare, the most the lane allows,
and touches neither. Warren Road, narrow with cars parked along the car's side, is kept clear of background traffic
while the car drives it (`quiet`, `quietUntil`).

## Open items

- The address on gov.uk's centre finder; where tests start and finish.
- A second first-hand source (instructor video, learner account) for the roads beyond Gladstone Road.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
