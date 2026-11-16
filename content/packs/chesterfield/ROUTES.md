# Chesterfield decision route

One "Decisions only" practice route from the Chesterfield test centre at the Bus Garage, Approach Road, Stonegravels,
S41 7LT (gov.uk centre finder, checked 16 November 2026). One route per centre, carrying the whole mix
(`../ROUTE_TEMPLATE_RULES.md` section 5). Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/chesterfield-evidence.json`, November 2026. A practice route, not a confirmed test route. How it
was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** Approach Road is a service road west off Sheffield Road (B6057) past the bus depot. The route
starts on it 90 m in from Sheffield Road, facing it, leaves left, and comes back from the north (a right turn in),
finishing on Approach Road 13 m east of the start. *To confirm: where tests start and finish on Approach Road.*

**Evidence.** Every road and junction in the evidence file is *likely* (one publisher; a second site copies it word for
word, and the publisher's motorcycle site is counted with it). Its routes all leave and return by Sheffield Road at
Stonegravels, which fits the current site.

## Highfield Lane and Tapton View Road (scene `chesterfield-route-1`, 4.5 km)

Out of Approach Road, left on to Sheffield Road, ahead at the Hazlehurst Lane mini-roundabout, first exit at the
Sheffield Road roundabout into Peveril Road, ahead at the Peveril Road mini-roundabout on to Highfield Lane, over the
signal crossing, left at the Newbold Road mini-roundabout, Newbold Road, left into Tapton View Road (pulling up and
moving off), right on to Sheffield Road, ahead at the Hazlehurst Lane mini-roundabout, right into Approach Road.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, left on to Sheffield Road | A white car coming up Sheffield Road from the right | Look right, signal left, give way; look right and left, go |
| 2 | Sheffield Road roundabout, first exit into Peveril Road | A black car coming round from Lockoford Lane, from the right, on its way out north | Mirrors, signal left; look right, give way; look right again, go |
| 3 | Highfield Lane, the signal crossing (traffic lights) | Red; a pedestrian crossing from the far side into the car's lane | Interior mirror, slow down, wait at the line; check both ways, go |
| 4 | Highfield Lane at the Newbold Road mini-roundabout, left into Newbold Road | A green car coming down Newbold Road, from the right, going ahead | Mirrors, signal left; look right, give way; look right again, go |
| 5 | Pull up on Tapton View Road, past Gloucester Avenue | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 6 | Move off | The cyclist coming past, on to Highfield View Road | Mirror and blind spot, wait; again, go |
| 7 | Tapton View Road, right on to Sheffield Road | A blue car coming up Sheffield Road from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 8 | Sheffield Road, right into Approach Road (the test centre) | A grey car coming up Sheffield Road towards the car | Mirrors, signal right, position; wait in the road; look into Approach Road, go |

**The mix** (rule 4), all on this route: traffic lights (3), a large roundabout (2) and a mini-roundabout (4), emerging
left (1) and right (7), a right turn across oncoming traffic (8), a pedestrian crossing (3) and the pull-up and move-off
pair (5, 6). The lights and the crossing are one challenge, a signal-controlled crossing met on red, as Brentwood's
station crossing: the only signal junctions in reach are by the stadium (200 m past the roundabout, too close for both)
and on the A61 (trunk road), so the route's lights are the crossing's.

**Known junctions** (5 of 8): the way out of and into Approach Road (1, 8), the Sheffield Road / Peveril Road /
Lockoford Lane roundabout (2), the Highfield Lane / Newbold Road mini-roundabout (4) and Tapton View Road on to Sheffield
Road (7). The Hazlehurst Lane and Peveril Road mini-roundabouts are driven through (the first 130 m from the way out, the
second too close to the crossing for the spacing rule). Not used: the Lockoford Lane / A61 and Whittington Moor
roundabouts (A61 trunk road; Whittington Moor 1.8 km north) and the Holywell Cross mini-roundabout (in the town centre's
one-way and signal gyratory, beyond a 5 km route that leaves north).

**Overlap** (rule 3): 4.3 km of 4.5 km (96%) on likely roads (Sheffield Road 1.13 km, Tapton View Road 1.02, Highfield
Lane 0.90, Newbold Road 0.84, Peveril Road 0.39). Not named: Approach Road (an unnamed service road, 0.17 km) and the
roundabout's ring.

## Checker

`node tools/centres/check_route.mjs chesterfield-1`: passes (4.5 km, 96% on likely roads, 5 of 8 at known junctions,
spacing met, nothing missing from the mix).

## Choices

- **Why this route.** North out of the centre as every listed route goes, by the Sheffield Road roundabout and Peveril
  Road to Highfield Lane (a 30 mph road with a signal crossing and two mini-roundabouts), back by Newbold Road and Tapton
  View Road (no cars parked along it, so a clean pull-up with a cyclist passing), and out on to Sheffield Road with a
  right turn, then the right turn into the centre across the traffic coming up from the town.
- **A first version** went from Highfield Lane by Mansfeldt Road, Lucas Road and Gloucester Road (all listed). The
  scene parks cars along most of Gloucester Road's far kerb, which leaves a cyclist no room past a car pulled up, and
  that version's pull-up would have come within 300 m of the crossing; it was dropped for Newbold Road and Tapton View
  Road.
- **Left out.** The A61 and its roundabouts (trunk road), the town centre (one-way and signal gyratory).

## Found on the map

- **Approach Road** is an unnamed service road in OpenStreetMap (way 98830428), added to the scene by its id. The
  planner always runs the route's end to the same point on it, 80 m in from Sheffield Road; the drive stops 12 m short
  of that (11.7 m in the drive without traffic, the test allowing 12: a small margin on a straight).
- **The Sheffield Road roundabout** is mapped as a ring of one-way pieces with the dual carriageway north of it; it plans
  and drives as a roundabout (the scene finds its ring, radius about 19 m).
- No map fixes were needed (no `osm-patches.json`).

## Drives

One drive without traffic while building (`decisionDrive.ts`'s `drive`): passed with no faults, every pause as depicted
(16 pauses, each road user within 0.1 m of its point), nothing hit, nothing off the road, no red light run, the closest
scripted road user the cyclist passing the car pulled up (3.21 m), the drive stopping 11.7 m short of the planned end.
The full drives (with 30 background road users in patterns 4 and 14, and with Skip ahead) are run by the main session:
`ROUTES=chesterfield-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`.

## Open items

- Where tests start and finish on Approach Road.
- A first-hand source (instructor video, learner account) to confirm any road; and the route lists' dates.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
