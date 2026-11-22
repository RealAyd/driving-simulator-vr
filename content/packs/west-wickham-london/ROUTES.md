# West Wickham (London) decision route

One "Decisions only" practice route from the West Wickham (London) test centre at 56 Glebe Way, West Wickham BR4 0RL
(DVSA's centre data as quoted on passrates.uk, matched by drivingtesttips.biz's centre page and Drive Johnsons' centre
list, checked 21 November 2026; gov.uk's centre finder results could not be read from this machine). One route per
centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md` section 5). Built from OpenStreetMap data and the published
evidence in `content/sources/pass2/west-wickham-london-evidence.json`, November 2026. A practice route, not a confirmed
test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** In OpenStreetMap the centre is a unit in the shopping parade on the south side of Glebe Way (A232,
30 mph), "The Driving Test Centre" (node 9979821624), between the parade's own service road (named Glebe Way, in front
of the shops) and Rose Walk, the side road at the parade's east end. drivingtesttips.biz says its parking is limited,
with more on Rose Walk, and every listed route starts "DTC, Rose Walk". The route starts on Rose Walk 85 m short of Glebe
Way, facing it, turns right on to Glebe Way, and comes back along Glebe Way from the west, left into the parade's
service road; the drive ends in front of the centre. *To confirm: where tests start and finish at the centre.*

**Evidence.** Two route-list sites carry the same old DVSA routes (intensivelessons.co.uk, eight routes, and
drivingtesttips.biz, counted once); every one leaves by Rose Walk, so they fit the current site. A separate driving
school's West Wickham lessons page (Bill Plant) names the Glebe Way roundabout, the Kent Gate Way roundabouts, Corkscrew
Hill's steep bends, the Coney Hill Road junction, the busy High Street and the A232 roundabouts and junctions by
Wickham Court Road: with the lists, these are *confirmed*. One learner's own account (2019) names a one-way system by
Langley Park School for Girls, about 1.4 km north.

## Glebe Way and Corkscrew Hill (scene `west-wickham-london-route-1`, 2.9 km)

Out along Rose Walk, right on to Glebe Way, east past Silver Lane (pulling up and moving off), the third exit at the
Glebe Way roundabout into Addington Road, over the signal crossing, the third exit at the Corkscrew Hill roundabout (at
the end of Kent Gate Way) and up Corkscrew Hill, left into Wood Lodge Lane, right into Stambourne Way, left out of
Stambourne Way on to Wickham Court Road, right at the Glebe Way lights, and back along Glebe Way, left into the parade's
service road to the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: Rose Walk, right on to Glebe Way | A white car coming along Glebe Way from the right | Look right, signal right, give way; look right and left, go |
| 2 | Pull up on Glebe Way, past Silver Lane | A cyclist behind | Choose the straight clear of the junction, mirrors, signal; handbrake, neutral, cancel signal |
| 3 | Move off | The cyclist coming past | Mirror and blind spot, wait; again, go |
| 4 | Glebe Way roundabout, third exit into Addington Road (from Glebe Way) | A black car coming round from Addington Road, from the right, on its way to Addington Road north | Mirrors, signal right; look right, give way; look right again, go |
| 5 | The signal crossing on Addington Road, ahead | Red; a pedestrian stepping out from the left | Mirror, slow down, wait at the line; check both ways, go on green |
| 6 | Wood Lodge Lane, right into Stambourne Way | A blue car coming along Wood Lodge Lane the other way | Mirrors, signal right, position; wait; look into Stambourne Way, go |
| 7 | Stambourne Way, left on to Wickham Court Road at the top of Corkscrew Hill | A grey car coming up Corkscrew Hill from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 8 | Wickham Court Road at the Glebe Way, High Street and Station Road lights, right on to Glebe Way | Green; a red car coming down Station Road the other way, going ahead | Mirrors, signal right, position; wait in the junction; look into Glebe Way, go |

**The mix** (rule 4): traffic lights (8, and the crossing's in 5), a large roundabout (4), emerging left (7) and right
(1), a right turn across oncoming traffic (6, and 8 at the lights), a pedestrian crossing (5) and the pull-up and
move-off pair (2, 3). **No mini-roundabout**: the nearest in OpenStreetMap are Red Lodge Road / The Avenue (700 m north
of the Glebe Way lights) and Wickham Way / Red Lodge Road (1.4 km north), on a northern loop this route does not take;
a route reaching them would lose the Glebe Way roundabout and Corkscrew Hill, which the second source names. The
nearest kind on the route, the small Corkscrew Hill roundabout, is 60 m past the Addington Road crossing: too close for
both to be challenges, so it is driven through (third exit).

**Known junctions** (3 of 8): the Glebe Way roundabout (4), the Addington Road crossing by the Corkscrew Hill roundabout,
at the end of Kent Gate Way (5), and the Glebe Way, High Street, Station Road and Wickham Court Road lights (8). The way
out by Rose Walk (1) is on every listed route, as a road rather than a junction in the evidence.

**Overlap** (rule 3): 2.3 km of 2.9 km (81%) on confirmed or likely roads (Glebe Way, Addington Road, Wickham Court Road,
Corkscrew Hill, Wood Lodge Lane, Rose Walk). Not named in the evidence: Stambourne Way (0.41 km) and the roundabouts'
rings.

## Checker

`node tools/centres/check_route.mjs west-wickham-london-1`: passes (2.9 km, 81% on confirmed or likely roads, 3 of 8 at
known junctions, spacing met; not on the route: a mini-roundabout, above).

## Choices

- **Why this route.** Out the way the listed routes go (Rose Walk), east along the centre's own road to the roundabout
  both sources name, down Addington Road to the crossing and the Kent Gate Way end, then up Corkscrew Hill (its bends,
  named by the second source) and a residential loop for the emerging left turn, back to the Wickham Court Road lights
  that every listed route uses, and home along Glebe Way.
- **Leaving.** The listed routes go down Rose Walk to Wickham Court Road; this route turns the other way, out on to Glebe
  Way at Rose Walk's north end, so that the right turn on to the busy A232 is the first decision and the Glebe Way
  lights can come at the end.
- **The pull-up** is on Glebe Way 170 m past Silver Lane and 200 m short of the next side turning, where the scene parks
  no car and there is no bus stop.
- **Stambourne Way** forks off Wood Lodge Lane to the right at a shallow angle (about 50 degrees): the right turn there
  still crosses the lane of Wood Lodge Lane's oncoming traffic, which the blue car is in.
- **Left out.** The northern roads of the lists (Station Road, Red Lodge Road and its mini-roundabouts, Hayes), Coney
  Hill Road's junction with Croydon Road (named by the second source; reached only by a longer loop east), the High
  Street crossings west of the lights, and the learner's one-way system by Langley Park School for Girls (1.4 km north).

## Found on the map

- **The parade's service road** in front of the centre is named Glebe Way on the map and lies within 20 m of Glebe Way
  all along: the last two through points sit just off it, on the shops' side, so the plan takes it.
- **Splitter islands.** The bollards on three splitter islands came within reach of the car: leaving the Glebe Way
  roundabout into Addington Road (the exit turns left tightly, so the car cut the inside kerb when kept left), entering
  the Corkscrew Hill roundabout from Addington Road, and leaving it up Corkscrew Hill (the exit's kerb juts out just
  short of the bollard, leaving a lane about 2.9 m wide). The line is kept wide then left at the first, left at the
  second, and out wide on the ring then left at the third (`shifts`): each bollard is 0.6 m or more from the car's side
  in every drive.
- **A service road along Addington Road** has its mouth just past the crossing on the right; traffic is kept off it,
  the crossing and the road on to the Corkscrew Hill roundabout from the Glebe Way roundabout until the car is at the
  crossing.
- **The Wickham Crescent junction** on Wickham Court Road knotted in traffic (cars queued out of Wickham Crescent, one
  turning into it): kept quiet from Stambourne Way until the car is at the Glebe Way lights.
- No map fixes were needed (no `osm-patches.json`).

## Drives

`ROUTES=west-wickham-london-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: all six pass (as authored, the
plan clear of parked cars, the drive without traffic, patterns 4 and 14, Skip ahead; 333 s), after the tuning in
`HOW_WE_BUILT_IT.md` section 5: a pass with no faults, every pause as depicted, nothing hit, nothing off the road, no
red light run. The closest scripted road user is the cyclist passing the car pulled up (2.5 m centre to centre); the
closest bollards to the car's side are 0.61 to 0.75 m (the three splitter islands). The longest stand is 25 s with
traffic (pattern 4), queued on Addington Road where the one-way Croydon Road link joins it; 13 s without, at the
pull-up, waiting for the cyclist.

## Open items

- The Corkscrew Hill roundabout's exit is narrow between the kerb and the splitter bollard (about 0.7 m each side of
  the car).
- Where tests start and finish at the centre (Rose Walk or the parade's service road); the address on gov.uk's centre
  finder.
- A first-hand source for the test roads (the learner's account names only the Langley Park one-way system).
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked (camera angles are first choices); then staging and the owner's
  drive.
