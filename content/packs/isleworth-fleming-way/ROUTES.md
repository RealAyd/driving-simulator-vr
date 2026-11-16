# Isleworth (Fleming Way) decision route

One "Decisions only" practice route from the Isleworth test centre at Unit 8, The Wireless Factory, Fleming Way, TW7
6DB (DVSA's move bulletin of 16 April 2018; gov.uk not reachable from the build machine, *to recheck*). One route per
centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md` section 5). Built from OpenStreetMap data and the published
evidence in `content/sources/pass2/isleworth-fleming-way-evidence.json`, November 2026. A practice route, not a
confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** Fleming Way is a service road south off Worton Road, 280 m west of the Twickenham Road lights;
its branch west runs past the units. The route starts on it 35 m short of Worton Road, facing it, leaves right, and
comes back from the west (a right turn in), finishing on the branch by the units. *To confirm: where tests start and
finish within Fleming Way.*

**Evidence.** Every road and junction in the evidence file is *likely* (one author; the second site copies it), and the
lists probably predate the 2018 move from Worton Hall, so how the route leaves and returns rests on the map.

## Twickenham Road and Whitton Dene (scene `isleworth-fleming-way-route-1`, 4.8 km)

Out of Fleming Way, right on to Worton Road, right at the Twickenham Road lights, Twickenham Road, right at the Mogden
Lane lights over the crossing into Mogden Lane, ahead at the Mogden Lane roundabout on to Whitton Dene (pulling up and
moving off), right at the Hall Road mini-roundabout, Hall Road, left into Eaton Road, Ellerdine Road and Tudor Road,
right into Heath Road, left on to Worton Road, through the Bridge Road and Ruskin Road mini-roundabouts, right into
Fleming Way.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, right on to Worton Road | A white car coming along Worton Road from the right; then a blue car from the left, out of the Ruskin Road mini-roundabout | Look right, signal right, give way; look left, give way; look right and left, go |
| 2 | Worton Road at the Twickenham Road lights, turn right | Green; a grey car coming out of Van Gogh Close opposite, going ahead | Mirrors, signal right, position; wait in the junction; look into Twickenham Road, go |
| 3 | Twickenham Road at the Mogden Lane lights, right over the crossing into Mogden Lane | Green; a pedestrian still on the crossing just round the corner, in the car's lane | Mirrors, signal right, position; look into Mogden Lane, give way; look again, go |
| 4 | Mogden Lane roundabout, second exit (ahead) on to Whitton Dene | A black car coming round from Whitton Dene, from the right, on its way to Rugby Road | Interior mirror, no signal; look right, give way; look right again, go |
| 5 | Pull up on Whitton Dene, on the straight past the bend | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 6 | Move off | The cyclist coming past, turning into Queensbridge Park | Mirror and blind spot, wait; again, go |
| 7 | Hall Road mini-roundabout, right into Hall Road | A green car coming down Hall Road, from the right, turning right round the mini-roundabout | Mirrors, signal right; look right, give way; look right again, go |
| 8 | Heath Road, left on to Worton Road | A white car coming up Hall Road from the right | Mirrors, signal left; look right, give way; look right and left, go |

**The mix** (rule 4), all on this route: traffic lights (2, 3), a large roundabout (4) and a mini-roundabout (7),
emerging right (1) and left (8), a right turn across oncoming traffic (2), a pedestrian crossing (3, the signal
crossing on Mogden Lane at the lights), and the pull-up and move-off pair (5, 6). The way back into the test centre
(a right turn across Worton Road) is driven without a challenge: the route already has its eight.

**Known junctions** (3 of 8): the Worton Road / Twickenham Road lights (2), the Mogden Lane roundabout (the evidence's
"Whitton Dene / Rugby Road roundabout", 4) and the Hall Road / Whitton Dene mini-roundabout (7). The Worton Road /
Bridge Road mini-roundabout is driven through on the way home.

**Overlap** (rule 3): 4.15 km of 4.8 km (86%) on likely roads (Worton Road 1.31 km, Twickenham Road 0.81, Whitton Dene
0.72, Mogden Lane 0.58, Hall Road 0.58, Heath Road 0.15). Not named: Eaton Road, Ellerdine Road and Tudor Road (the way
round to Heath Road, 0.4 km), Fleming Way and the roundabout's ring.

## Checker

`node tools/centres/check_route.mjs isleworth-fleming-way-1`: passes (4.8 km, 86% on likely roads, 3 of 8 at known
junctions, spacing met, nothing missing from the mix).

## Choices

- **Why this route.** A first version had two routes (east and south; west and north by Bridge Road, London Road and
  St John's Road). When the owner moved to one route per centre, the east and south one was kept: 93% on the
  evidence's roads against 72%, the only large roundabout in reach, and it passed every drive. It took over the
  crossing and the emerging left turn the other route had, by turning into Mogden Lane over its signal crossing and by
  a short loop (Eaton Road, Tudor Road, Heath Road) that comes out of a side road on to Worton Road.
- **Left out.** The A316 Chertsey Road and its roundabouts (dual carriageway trunk road); the A4 lights and the Spring
  Grove Road mini-roundabouts (further out than a 5 km route reaches).

## Found on the map

- **Twickenham Road is mapped in many short pieces** (several under 10 m). The scene builder drops a crossing within
  8 m of a piece's end, so the Lynton Close zebra and the pelican south of Worton Road are not built, and the signals on
  Twickenham Road's arms at the Worton Road lights are not either: in the scene those lights stop only Worton Road and
  Van Gogh Close.
- **Whitton Dene at the Mogden Lane roundabout** began with a 6.5 m piece the lane path could not use: the car's line
  cut across the island. Two nodes were moved west along the road in `osm-patches.json`.
- **The Mogden Lane roundabout's entry from Mogden Lane** has a bollard on its splitter island's nose close to the
  car's line: the route keeps 0.9 m further left on the way in (a `shift`).

## Drives

`ROUTES=isleworth-fleming-way-1 npx vitest run tests/unit/decisionDrive.centre.test.ts` (on the engine with the
lights-cycle and pacing fixes): 6 of 6 pass in 28 minutes: the authoring rules; the planned line clear of parked cars;
the right answers to a pass, every pause as depicted (17 pauses), nothing hit, nothing off the road, no red light run,
back on Fleming Way; with 30 background road users in patterns 4 and 14 (closest traffic about 0.8 to 1.0 m, longest
stand about 25 s, nothing met, every junction in hand quiet); and with Skip ahead (4 skips). The closest scripted road
user is the cyclist passing the car pulled up, 3.15 m.

## Open items

- The address on gov.uk, and where tests start and finish within Fleming Way.
- A first-hand source (instructor video, learner account) to confirm any road; and the route lists' dates.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
