# Pembroke Dock decision route

One "Decisions only" practice route from the Pembroke Dock test centre, The Captain Superintendent's Building, Royal
Dockyard, SA72 6TD (Driving Test Tips centre page; DVSA data shows the centre testing in 2025-26; gov.uk not reachable
from the build machine, *to recheck*). One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md`
section 5). Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/pembroke-dock-evidence.json`, November 2026. A practice route, not a confirmed test route. How it
was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`. In Wales: road signs and markings as in
England for this app.

**Start and finish.** The SA72 6TD point is on Admiralty Way inside the old Royal Dockyard, 90 m north of the Admiralty
Way mini-roundabout. The route starts on Admiralty Way there, facing the mini-roundabout, and comes back up Admiralty
Way, finishing about 60 m north of where it started. *To confirm: the centre's building and where tests start and finish
within the dockyard.*

**Evidence.** Every road and junction in the evidence file is *likely* (one author; the second site copies it). The
lists' routes all start and finish on Pier Road, 0.9 km east, so they probably describe an earlier site: how the route
leaves and returns rests on the map.

## Bush Street and London Road (scene `pembroke-dock-route-1`, 4.9 km)

Down Admiralty Way, ahead at the mini-roundabout into Melville Terrace, Melville Street, left at the Market Street
mini-roundabout, right out of Market Street, Albion Square, Albion Road, ahead at the Laws Street mini-roundabout along
Bush Street (pulling up and moving off), left on to Ferry Lane, left at the London Road lights over the crossing, London
Road through the Waterloo roundabout, first exit at the Pier Road roundabout into Water Street, right at the Dimond
Street crossroads, Dimond Street, Queen Street, left out on to Commercial Row, Market Place, Meyrick Owen Way, right at
the mini-roundabout and up Admiralty Way.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: Admiralty Way mini-roundabout, ahead into Melville Terrace | A red car coming along Whites Farm Way from the right, going straight over | Interior mirror, no signal; look right, give way; look right again, go |
| 2 | Emerging right out of Market Street | A white car coming along Market Place from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 3 | Pull up on Bush Street, on the straight before St Peter's Road | A cyclist behind | Choose the straight clear of the side roads, mirrors, signal; handbrake, neutral, cancel signal |
| 4 | Move off | The cyclist coming past, then left into St John's Road | Mirror and blind spot, wait; again, go |
| 5 | Ferry Lane at the London Road lights, left over the crossing | Green; a pedestrian still on the crossing in front, in the car's lane | Mirrors, signal left; look along the crossing, give way; look again, go |
| 6 | Pier Road roundabout, first exit into Water Street | A black car coming round from Pier Road, from the right, to Water Street | Mirrors, signal left; look right, give way; look right again, go |
| 7 | Dimond Street crossroads, right turn into Dimond Street | A silver car coming up Laws Street opposite, going straight over | Mirrors, signal right, position; wait; look into Dimond Street, go |
| 8 | Emerging left out of Queen Street on to Commercial Row | A blue car coming down Commercial Row from the right | Mirrors, signal left; look right, give way; look right and left, go |

**The mix** (rule 4), all on this route: traffic lights (5), a large roundabout (6) and a mini-roundabout (1), emerging
right (2) and left (8), a right turn across oncoming traffic (7), a pedestrian crossing (5, the signal crossing at the
mouth of Ferry Lane at the lights), and the pull-up and move-off pair (3, 4). The Pier Road roundabout is small (about
35 m across) but a full roundabout with four arms; the Waterloo roundabout, larger, is 150 m from the London Road lights,
too close for both to be challenges, and is driven through.

**Known junctions** (6 of 8, by the checker): the Admiralty Way mini-roundabout (1), the Market Street end of the road
(2; the checker matches it to the Market Street mini-roundabout just before), the London Road / Ferry Lane lights (5),
the Pier Road roundabout (6), the Water Street / Dimond Street crossroads (7) and the Queen Street end of the road at
Commercial Row (8).

**Overlap** (rule 3): 81% of 4.9 km on likely roads (Bush Street 1.03 km, London Road 0.81, Ferry Lane 0.37, Queen Street
0.37, Water Street 0.26, Admiralty Way 0.25, and Melville Street, Market Street, Albion Square, Dimond Street, Commercial
Row). Not named: Albion Road (0.42 km), Meyrick Owen Way (0.27 km, probably newer than the lists), Market Place and the
roundabouts' rings.

## Checker

`node tools/centres/check_route.mjs pembroke-dock-1`: passes (4.9 km, 81% on likely roads, 6 of 8 at known junctions,
spacing met, nothing missing from the mix).

## Choices

- **Why this way round.** Bush Street can be entered from Ferry Lane only northbound (the right turn in from Ferry Lane
  southbound doubles back past the planner's sharpest turn), so the loop runs Bush Street, Ferry Lane, London Road west.
  That makes the London Road lights a left turn: the lights carry the crossing, and the right turn across oncoming
  traffic is at the Dimond Street crossroads (a turn the lists make too).
- **Left out.** Pembroke town (Main Street, Northgate Street, the Bush Hill lights; 2.5 to 4 km away: a route there runs
  past 7 km); the Pembroke Ferry roundabouts and the Cleddau Bridge approach (A477 trunk road); the London Road and
  Western Way pelicans (driven through).

## Found on the map

Fixes in `osm-patches.json`:

- **The Pier Road roundabout** has a small structure mapped on its island, so it was not found as a roundabout (a loop of
  one-way roads the planner would not drive): the building tag dropped.
- **The Waterloo roundabout's London Road entry from the east** is a short unnamed piece (32 m), which the planner will
  not turn on to: named London Road.
- **Water Street at the Pier Road roundabout** began with a 9.6 m piece the lane path could not use: the car's line cut
  the corner on to the pavement. One node moved 8.5 m south along the road.

## Drives

Without traffic (before the Melville Street corner `shift`): passed, no faults, 17 pauses as depicted, nothing hit, no red light run, closest scripted road user the cyclist at 3.14 m; the car's side touched the pavement at the Melville Terrace corner, since kept 1 m right (`HOW_WE_BUILT_IT.md` section 5). The drives with traffic (patterns 4 and 14) and with Skip ahead are
run by the main session (`ROUTES=pembroke-dock-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`).

## Open items

- The address on gov.uk, the centre's building and where tests start and finish within the dockyard.
- A first-hand source (instructor video, learner account) to confirm any road; and the route lists' dates.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
