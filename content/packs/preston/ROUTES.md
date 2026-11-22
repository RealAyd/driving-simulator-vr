# Preston decision route

One "Decisions only" practice route from the Preston test centre on Chain Caul Road, Preston PR2 2PD (DVSA's centre
data as quoted on passrates.uk, captured May 2026; gov.uk's centre finder could not be searched from this machine: *to
recheck on the gov.uk centre finder*). One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md`
section 5). Built from OpenStreetMap data and the published evidence in `content/sources/pass2/preston-evidence.json`,
November 2026. A practice route, not a confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The
format: `../ROUTE_FORMAT.md`.

**Start and finish.** The centre's building is in OpenStreetMap (way 252360143, "Driving Test Centre") on the Riversway
docks estate, between Chain Caul Road and Chain Caul Way. The only road mapped to it is Hardy Close, a named service
road (ways 61604649 and 61604644) from Chain Caul Way; both were added to the scene by their ids. The route starts on
Hardy Close beside the building, facing out, and turns right on to Chain Caul Way. It comes back along Chain Caul Way
and finishes on it about 40 m short of Hardy Close: the route planner always runs a route on 80 m past its last
junction, and 80 m into Hardy Close would pass the start point again. *To confirm: where tests start and finish.* The
route lists all leave by Chain Caul Road; nothing on the map joins the centre to Chain Caul Road, so the map wins on
the way out (Hardy Close), and Chain Caul Way is on every list.

**Evidence.** Every road and junction in the evidence file is *likely*: one route-list publisher (drivingtesttips.biz,
routes 1 to 10; intensivelessons.co.uk copies it word for word), whose lists start and end at the current site. Nothing
first-hand was found (searches returned nothing from this machine).

## Pedders Lane and Blackpool Road (scene `preston-route-1`, 5.2 km)

Out of Hardy Close right on to Chain Caul Way, left at its end on to Navigation Way, first exit at the Navigation Way
roundabout on to Pedders Way, ahead over the A583 (Riversway / Watery Lane) at the Pedders Way lights, north up Pedders
Lane, right into Egerton Road, left out of it on to Tulketh Road, left at the Blackpool Road lights, west along
Blackpool Road over the signal crossing by Broadway, left into Larches Avenue, pulling up and moving off short of Larches
Lane, then Larches Lane, Whinfield Lane, right on to Pedders Lane, back over the A583 lights, right at the roundabout on
to Navigation Way and Chain Caul Way towards the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, right out of Hardy Close on to Chain Caul Way | A white car coming along Chain Caul Way from the right | Look right, signal right, give way; look right and left, go |
| 2 | Navigation Way roundabout, first exit on to Pedders Way | A black car coming round from Mariners Way, from the right, on its way up Pedders Way | Mirrors, signal left; look right, give way; look right again, go |
| 3 | Pedders Lane, right into Egerton Road | A grey car coming down Pedders Lane towards the car | Mirrors, signal right, position; wait in the road; look into Egerton Road, go |
| 4 | Egerton Road, left on to Tulketh Road | A blue car coming round Tulketh Road's bend from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 5 | Tulketh Road at the Blackpool Road lights, left (traffic lights) | Red at the line | Mirrors, signal left, slow down, wait at the line; on green look right and check the left mirror, go |
| 6 | Blackpool Road, the signal crossing by Broadway | Red; a pedestrian crossing from the central reserve into the car's lane | Interior mirror, slow down, wait at the line; check both ways, go |
| 7 | Pull up on Larches Avenue, north of Larches Lane | Cars parked further down; the junction ahead | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 8 | Move off | A cyclist coming down Larches Avenue from behind, past the car | Mirror and blind spot, wait; again, go |

**The mix** (rule 4): traffic lights (5, and the crossing's at 6), a large roundabout (2), emerging left (4) and right
(1), a right turn across oncoming traffic (3), a pedestrian crossing (6) and the pull-up and move-off pair (7, 8).
**No mini-roundabout**: the area lacks one in reach. The only two mapped within 2 km are in the docks: one where a service road
meets Channel Way, 1.8 km east, the other inside a retail car park off Port Way. Neither is on a through road the lists
use, and the first would add about 3 km. The A583 lights at Pedders Way (named on most
lists) are driven, both ways: they are 150 m from the Navigation Way roundabout, too close for the spacing rule, and
the roundabout teaches more (traffic coming round from the right at the line).

**Known junctions** (rule 3): the checker counts 5 of 8: the roundabout (2; it names the Chain Caul Way / Navigation Way
junction, which the instruction point is near; the Navigation Way roundabout is also a known junction), Pedders Lane and
Egerton Road (3), Egerton Road and Tulketh Road (4), the Tulketh Road / Blackpool Road lights (5), and Larches Lane and
Larches Avenue (8, by nearness: the move-off ends 40 m short of it). By design: 4 of 8. Also on the route, driven:
the Pedders Way lights, the Pedders Lane / Blackpool Road lights, the Larches Avenue / Blackpool Road junction and the
Whinfield Lane / Pedders Lane junction. Not used: the Nelson Way roundabout and lights to the west, and the Port Way,
Strand Road and Water Lane junctions to the east (1 to 1.5 km), which a second route could take.

**Overlap** (rule 3): 96% of 5.2 km on likely roads (Blackpool Road 0.92 km, Chain Caul Way 0.86, Tulketh Road 0.63,
Whinfield Lane 0.62, Egerton Road 0.61, Larches Avenue 0.40, Pedders Lane 0.33, Pedders Way 0.25). Not named: Hardy
Close and the roundabout's ring.

## Checker

`node tools/centres/check_route.mjs preston-1`: passes (5.2 km, 96% on likely roads, 5 of 8 at known junctions as it
counts them, spacing met, mini-roundabout not on the route, as above).

## Choices

- **Why this route.** The way out is fixed by the map (Hardy Close on to Chain Caul Way, then the Navigation Way
  roundabout, as every list goes). From there the lists' nearest roads north of the A583: Pedders Lane, Egerton Road and
  Tulketh Road give a right turn across traffic, an emerging turn on a bend and a set of junction lights; Blackpool Road
  west has a signal crossing on its own; Larches Avenue is a quiet street for the pull-up, and Larches Lane and
  Whinfield Lane bring the car back to Pedders Lane without repeating a road.
- **The pull-up.** Larches Avenue has cars parked at its kerbs in the scene; the pull-up is on the one clear stretch,
  about 90 m north of Larches Lane, so the cyclist has room to pass (2.9 m from the car's middle).
- **Left out.** The A583 itself (Riversway and Watery Lane, a 40 mph dual carriageway, crossed twice at the lights) and
  Penwortham across the Ribble (lists 6 to 10, 2 km or more south).

## Found on the map

- **The centre's way in** is Hardy Close, a named service road, added to the scene by its ids; it keeps its own name.
- **Egerton Road ends on Tulketh Road's bend**, where Tulketh Road turns from east to north-west: the traffic the car
  gives way to comes round the bend from the right.
- **The Blackpool Road crossing** is on the westbound carriageway of a short dual stretch by Broadway; the pedestrian
  starts on the central reserve.
- No map fixes were needed (no `osm-patches.json`).

## Drives

`ROUTES=preston-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: all 6 pass (the authoring rules, the way
clear of parked cars, and the drives without traffic, with traffic patterns 4 and 14, and with Skip ahead), 13 minutes
on a shared machine. Without traffic: a pass with no faults, every pause as depicted, each road user within 2 m of its
point, nothing hit, nothing off the road, no red light run, the closest scripted road user over 2.2 m.

Fixed on the way (`HOW_WE_BUILT_IT.md` section 5): a wheel over the pavement at the tight corner from Larches Avenue
into Larches Lane (the line moved 0.8 m out there), and, with traffic, the cyclist past the car before the move-off's
first moment (it is now set going by the move-off, once the car is at the kerb). Tested on the engine as it was when
this worktree was made; to be driven again on the latest traffic engine after merging.

## Open items

- The address on gov.uk's centre finder; where tests start and finish (Hardy Close, or a way in from Chain Caul Road
  that the map does not have).
- A first-hand source (instructor video, learner account) for the current site.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
