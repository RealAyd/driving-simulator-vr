# Upton decision route

One "Decisions only" practice route from the Upton (Wirral) test centre on Arrowe Park Road, Upton, CH49 0UF (DVSA's
centre data as quoted on passrates.uk, and drivingtesttips.biz's centre page, checked 17 November 2026; gov.uk's
centre finder could not be reached from this machine). One route per centre, carrying the whole mix
(`../ROUTE_TEMPLATE_RULES.md` section 5). Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/upton-evidence.json`, November 2026. A practice route, not a confirmed test route. How it was
chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** In OpenStreetMap the centre is a building ("Driving Test Centre", way 236784217) on the west
side of Arrowe Park Road (A551, 40 mph), reached by a 48 m service road (way 888517464) that runs west off Arrowe Park
Road beside it. The service road is not a normal road in the map: it was added to the scene by its id. The route
starts on it 44 m in, facing Arrowe Park Road, leaves left (as every listed route does), and comes back from Leeswood
Road, opposite, with a right turn on to Arrowe Park Road and a left turn into the service road, the drive ending at
its west end (the car stops 12 m short, east of the start). *To confirm: where tests start and finish at the centre.*

**Evidence.** Every road and junction in the evidence file is *likely*: the route lists (intensivelessons.co.uk and
drivingtesttips.biz, the same lists, counted once) reproduce DVSA's old published routes, which all leave left on to
Arrowe Park Road, so they fit the current site; one Wirral instructor's blog (2010 to 2011) names the Sainsbury's
roundabout and "a busy roundabout between Greasby and Upton" from pupils' Upton tests.

## The Greasby Road roundabout and Leeswood Road (scene `upton-route-1`, 3.0 km)

Out of the test centre, left on to Arrowe Park Road, second exit at the Upton roundabout on to the Upton Bypass, third
exit at the Greasby Road roundabout into Old Greasby Road, right at the Arrowe Park Road lights, back down Arrowe Park
Road, first exit at the Upton roundabout on to Upton Road, right at the Houghton Road lights, Houghton Road, third exit
at the small Leeswood Road roundabout, Leeswood Road (pulling up and moving off), right on to Arrowe Park Road and left
into the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, left on to Arrowe Park Road | A white car coming up Arrowe Park Road from the right | Look right, signal left, give way; look right and left, go |
| 2 | Greasby Road roundabout, third exit into Old Greasby Road (from the Upton Bypass) | A black car coming round from Old Greasby Road, from the right, on its way out to Greasby Road | Mirrors, signal right; look right, give way; look right again, go |
| 3 | Old Greasby Road at the Arrowe Park Road and Ford Road lights, right over the crossing on to Arrowe Park Road | Green; a pedestrian still on the crossing over Arrowe Park Road, in the car's lane | Mirrors, signal right; look, give way; check the crossing again, go |
| 4 | The Upton roundabout by Sainsbury's, first exit on to Upton Road (from Arrowe Park Road) | A silver car coming round from the Upton Bypass, from the right, past the Upton Road exit | Mirrors, signal left; look right, give way; look right again, go |
| 5 | Upton Road at the Houghton Road and Salacre Lane lights, right into Houghton Road | Green; a blue car coming along Upton Road the other way, going ahead | Mirrors, signal right, position; wait in the junction; look into Houghton Road, go |
| 6 | Pull up on Leeswood Road, between Kiln Road and Big Meadow Road | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 7 | Move off | The cyclist coming past, on into Northbrook Way | Mirror and blind spot, wait; again, go |
| 8 | Leeswood Road, right on to Arrowe Park Road | A grey car coming down Arrowe Park Road from the right | Mirrors, signal right; look right, give way; look right and left, go |

**The mix** (rule 4): traffic lights (3, 5), a large roundabout (2, 4), emerging left (1) and right (8), a right turn
across oncoming traffic (5, and 3 across the crossing), a pedestrian crossing (3) and the pull-up and move-off pair (6,
7). **No mini-roundabout**: OpenStreetMap has none within 1.4 km of the centre (the nearest, Carr Bridge Road / New Hey
Road, is 1.6 km east, beyond a route that leaves west). The nearest kind is the small Leeswood Road roundabout
(Houghton Road / New Hey Road / Leeswood Road, a ring about 15 m across), which the route drives through, third exit,
180 m after the Houghton Road lights: too close for both to be challenges (the spacing rule), and the lights carry the
right turn across oncoming traffic, which the route needs more.

**Known junctions** (5 of 8): the test centre's way out (1) and, at 25 m from it, the end of Leeswood Road (8); the
Greasby Road roundabout, the instructor's "roundabout between Greasby and Upton" (2); the Arrowe Park Road / Ford Road /
Moreton Road / Old Greasby Road lights, on the listed routes (3); the Upton roundabout by Sainsbury's, the instructor's
"Sainsbury's roundabout" (4). The Upton roundabout is also driven through at the start (second exit), 160 m from the
way out, too close to be a challenge there.

**Overlap** (rule 3): 2.1 km of 3.0 km (69%) on likely roads (Arrowe Park Road, the Upton Bypass, Upton Road, Old
Greasby Road). Not named in the evidence: Leeswood Road (0.44 km), Houghton Road (0.18 km), the service road and the
roundabouts' rings.

## Checker

`node tools/centres/check_route.mjs upton-1`: passes (3.0 km, 69% on likely roads, 5 of 8 at known junctions, spacing
met; not on the route: a mini-roundabout, above).

## Choices

- **Why this route.** Out the way the listed routes go (left, then the Upton roundabout on to the Upton Bypass, as
  their route 7), the two roundabouts the instructor names, the Arrowe Park Road lights the lists use, then back east
  along Upton Road for a right turn at lights and a quiet residential street (Leeswood Road) for the pull-up, ending
  with a right turn out on to the 40 mph Arrowe Park Road opposite the centre.
- **The Upton roundabout twice.** Passed at the start (south entry to the bypass, second exit) and as challenge 4 (north
  entry to Upton Road, first exit): the two use different quarters of the ring, so no point is shared.
- **The pull-up** is on the straight of Leeswood Road 25 m past Kiln Road (on the left) and 35 m short of Big Meadow
  Road (opposite), where the scene parks no car within 55 m behind or 85 m ahead; the cars parked along Leeswood Road
  are all on the far kerb.
- **Left out.** Ford Road and Salacre Lane (listed; a loop through them, considered first, could not keep the pull-up 300 m from
  the challenges either side), Greasby Road and Frankby Road further west (listed; a longer route beyond the scene), the A5027 north to
  Moreton.

## Found on the map

- **The test centre's service road** (way 888517464) is added to the scene by its id; it is only 48 m long, so the
  way back enters it from the east and ends at its west end, the car stopping 12 m short (9 m east of the start).
- **Houghton Road's entry to the Leeswood Road roundabout** is narrow: a car parked at the west kerb 20 m short of it
  (1.7 m from the planned line otherwise), then a splitter island with a bollard on its nose, the entry lane beside it
  about 2.5 m wide. The line is kept 0.65 m right past the parked car, then 0.8 m left past the bollard (in the first
  drives the car touched it).
- **The roundabout's Leeswood Road exit** swings north and then sharply west into a lane about 3 m wide between a
  splitter bollard and the kerb: in the first drives the car cut the inside corner on to the pavement. The line is
  kept 1.6 m right round the corner, then 1.4 m left past the bollard and 0.8 m right again along the lane (`shifts`).
- **The Upton roundabout's Arrowe Park Road entry** is a one-way curve joining the ring at its north-east, next to the
  Upton Road exit: the first exit is a short sweep, and the silver car coming round from the bypass crosses both.
- No map fixes were needed (no `osm-patches.json`).

## Drives

`ROUTES=upton-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`. The first run failed all four drives on the
Leeswood Road roundabout (the car on the pavement at its exit, then touching the splitter bollards at its Houghton Road
entry and Leeswood Road exit); fixed by the shifts above. After them all six pass (as authored, the plan clear of parked cars, the drive
without traffic, patterns 4 and 14, Skip ahead; 408 s): a pass with no faults, every pause as depicted, nothing hit,
nothing off the road. The closest scripted road user is the blue car passing the car waiting at the Houghton Road
lights (3.09 m); the longest stand is 12 s at the pull-up, waiting for the cyclist.

## Open items

- The Leeswood Road roundabout's exit lane is narrow: the line has about 1.4 m to the kerb and the bollard.
- Where tests start and finish at the centre; the address on gov.uk's centre finder.
- A second first-hand source to confirm any road; the instructor blog is from 2010 to 2011.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
