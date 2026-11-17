# Kettering decision route

One "Decisions only" practice route from the Kettering test centre on Orion Way, Kettering Business Park, NN15 6NL
(DVSA's centre data as quoted on passrates.uk, captured May 2026; gov.uk could not be opened from this machine: *to
recheck on the gov.uk centre finder*). One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md`
section 5). Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/kettering-evidence.json`, November 2026. A practice route, not a confirmed test route. How it
was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** The centre's building is in OpenStreetMap (way 171272698) at the south-west end of Orion Way,
with its car park and way in on a service road (way 674957827) that meets Orion Way on its bend. The route starts on
that service road beside the building, facing out, and turns right on to Orion Way. It comes back along Orion Way and
finishes on it about 80 m short of the way in: the route planner always runs a route on 80 m past its last junction,
and 80 m into the service road would pass the start point again (a point passed twice is matched to the wrong end of
the drive). *To confirm: where tests start and finish.*

**Evidence.** Every road and junction in the evidence file is *likely*. Almost all of it is one route-list publisher
(drivingtesttips.biz; intensivelessons.co.uk copies it word for word), whose lists start and end at an older centre on
Station Road, about 1.9 km north. By the rules those lists are not used for how a route leaves and returns, only for
roads further out; here the way out (the service road and Orion Way) is the only one the map allows anyway. Near the
current site the lists name Orion Way, Pytchley Lane, Pytchley Road (A509), the Orion Way and A509 roundabouts, and
the Patrick Road, Northumberland Road and Sussex Road estate.

## Pytchley Road and Patrick Road (scene `kettering-route-1`, 3.4 km)

Out of the test centre right on to Orion Way, ahead at the Orion Way roundabout, first exit at the Pytchley Road
roundabout (A509) on to Pytchley Road, over the signal crossing, right into Patrick Road, left round Northumberland
Road, right out of it on to Sussex Road, back to Patrick Road, left on to Pytchley Road, pulling up and moving off short
of Pytchley Lane, then back over the crossing, right at the Pytchley Road roundabout on to Orion Way, ahead at the Orion
Way roundabout and along Orion Way towards the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, right on to Orion Way | A white car coming round Orion Way's bend from the right | Look right, signal right, give way; look right and left, go |
| 2 | Pytchley Road roundabout (A509), first exit on to Pytchley Road | A black car coming round from Kettering Road, from the right, on its way to Holdenby | Mirrors, signal left; look right, give way; look right again, go |
| 3 | Pytchley Road, the signal crossing south of Pytchley Lane (traffic lights) | Red; a pedestrian crossing from the far side into the car's lane | Interior mirror, slow down, wait at the line; check both ways, go |
| 4 | Pytchley Road, right into Patrick Road | A grey car coming down Pytchley Road towards the car | Mirrors, signal right, position; wait in the road; look into Patrick Road, go |
| 5 | Northumberland Road, right on to Sussex Road | A green car coming along Sussex Road from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 6 | Patrick Road, left on to Pytchley Road | A blue car coming down Pytchley Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 7 | Pull up on Pytchley Road, south of Patrick Road | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 8 | Move off | The cyclist coming past, on down Pytchley Road | Mirror and blind spot, wait; again, go |

**The mix** (rule 4): traffic lights (3), a large roundabout (2), emerging left (6) and right (1, 5), a right turn
across oncoming traffic (4), a pedestrian crossing (3) and the pull-up and move-off pair (7, 8). The lights and the
crossing are one challenge, a signal-controlled crossing met on red, as Chesterfield's: the only junction lights in reach
are at Barton Road and Windmill Avenue, 1.5 km north. **No mini-roundabout**: the area lacks one in reach. The nearest
are at the north end of Pytchley Road (Barton Road and London Road, 1.3 km north, named by the lists), in the
Highfield Road estate (Barron Close, reached only by Bryant Road, 1 km north) and in the Pegasus Court retail park
across the A509; each would add 2 km or more to a 3.4 km route. The Orion Way roundabout is a small roundabout (a
ring, not a mini), driven through: it is 250 m from the way out and 120 m from the A509 roundabout, too close for the
spacing rule.

**Known junctions** (rule 3): the checker counts 6 of 8, but two of those are by nearness only (the crossing and the
move-off are 40 m and 60 m from where Pytchley Lane joins). At known junctions by design: the A509 roundabout (2; the
checker names the Orion Way roundabout, which the instruction point is near), Patrick Road and Pytchley Road (4, 6) and
Northumberland Road and Sussex Road (5): 4 of 8. All are from lists made for the old centre, as roads further out.
Not used: the Barton Road mini-roundabout and the Barton Road / Windmill Avenue lights (1.3 to 1.5 km north), the
Bryant Road junction (beyond Patrick Road, leading only into an estate with one way out).

**Overlap** (rule 3): 94% of 3.4 km on likely roads (Pytchley Road 1.16 km, Orion Way 0.86, Northumberland Road 0.62,
Sussex Road 0.33, Patrick Road 0.17). Not named: the centre's service road and the A509 roundabout's ring.

## Checker

`node tools/centres/check_route.mjs kettering-1`: passes (3.4 km, 94% on likely roads, 6 of 8 at known junctions as it
counts them, spacing met, mini-roundabout not on the route, as above).

## Choices

- **Why this route.** The way out is fixed by the map (the service road on to Orion Way, then Orion Way to the
  roundabouts). From there the lists' nearest roads: Pytchley Road north with its signal crossing, and the Patrick
  Road estate as one list drives it (in by Patrick Road, round Northumberland Road, back by Sussex Road), which gives a
  right turn across Pytchley Road and two emerging turns. The pull-up is on Pytchley Road on the way back: no cars are
  parked along it, so the cyclist has room to pass, and it is the one stretch where the pair fits the spacing rule
  between Patrick Road and the way home.
- **Left out.** The A14 (trunk road, dual carriageway); the town centre roads the lists use (1.5 to 2.5 km north,
  around the old centre).

## Found on the map

- **The centre's way in** is a service road (way 674957827), added to the scene by its id.
- **Pytchley Lane** joins Pytchley Road northbound only, by a one-way arm with a give way.
- **The signal crossing at Patrick Road** (north of it, on Pytchley Road) has its signals but no crossing built in the
  scene; the route turns into Patrick Road before it.
- **Sussex Road's last stretch** past Northumberland Road has a car parked in the scene: the green car's path is eased
  round it.
- No map fixes were needed (no `osm-patches.json`).

## Drives

Not driven yet: the drives (without traffic, with traffic patterns 4 and 14, and with Skip ahead) are to be run by the
main session: `ROUTES=kettering-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`. The authoring rules ("as
authored") pass. Each paused moment's car position and road user point were set from the planned line and the road
users' planned paths (distances checked), not from a drive, so the first drive may need tuning as the other centres
did (stop points, `shifts` at splitter islands, `quietUntil` for the estate).

## Open items

- The address on gov.uk's centre finder; where tests start and finish.
- A first-hand source (instructor video, learner account) for the current site; the date of the move to Orion Way.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
