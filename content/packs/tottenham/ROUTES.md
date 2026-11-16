# Tottenham decision route

One "Decisions only" practice route from the Tottenham test centre at the Annex Building, Selby Centre, Selby Road,
N17 8JL (DVSA's opening bulletin of 2 December 2016, and DVSA's centre data as quoted in 2026; gov.uk not reachable
from the build machine, *to recheck*). One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md`
section 5). Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/tottenham-evidence.json`, November 2026. A practice route, not a confirmed test route. How it
was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** Selby Road is a short cul-de-sac north off White Hart Lane, ending at the Selby Centre's gate.
The route starts on it by the gate, facing south, and comes back up it, finishing about 70 m short of the gate (the
planner will not end a route on the stretch it starts on). *To confirm: where tests start and finish within the Selby
Centre.*

**Evidence.** Thin. The only junction named first-hand is the Great Cambridge roundabout (A10 / A406, confirmed by two
learners' own accounts); the only roads named are Selby Road, the A10 Great Cambridge Road and the A406 North
Circular (likely, from one editorial page). No free source gives the residential streets, so they rest on the map.

## The A10 and Wilbury Way (scene `tottenham-route-1`, 3.7 km)

Down Selby Road, right into Oak Avenue, right out of Weir Hall Road on to White Hart Lane, right at the lights on to
the A10 Great Cambridge Road (northbound), right at the Wilbury Way lights over the crossing into Wilbury Way (pulling
up and moving off), right into Weir Hall Road, ahead at the Amersham Avenue mini-roundabout, right at the Weir Hall
Avenue roundabout, ahead at the next roundabout, left out of Weir Hall Avenue on to the A10 (southbound), left at the
lights on to White Hart Lane, left at the Creighton Road mini-roundabout, and up Selby Road.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: Selby Road, right into Oak Avenue | A blue car coming up Selby Road towards the centre | Mirrors, signal right, position; wait; look into Oak Avenue, go |
| 2 | Weir Hall Road, right on to White Hart Lane | A white car coming along White Hart Lane from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 3 | The A10 at the Wilbury Way lights, right over the crossing into Wilbury Way | Green; a pedestrian still on the crossing over the mouth of Wilbury Way, in the car's lane | Mirrors, signal right; look into Wilbury Way, give way; look again, go |
| 4 | Pull up on Wilbury Way, between Pentyre Avenue and Plowman Close | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 5 | Move off | The cyclist coming past, on into Plowman Close | Mirror and blind spot, wait; again, go |
| 6 | Weir Hall Avenue roundabout, right (third exit) on to Weir Hall Avenue | A black car coming round from Weir Hall Road south, from the right | Mirrors, signal right; look right, give way; look right again, go |
| 7 | Weir Hall Avenue, left on to the A10 | A grey car coming down the A10's nearside lane from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 8 | Creighton Road mini-roundabout, left towards Selby Road | A green car coming along Creighton Road from the right, turning right round the mini-roundabout | Mirrors, signal left; look right, give way; look right again, go |

**The mix** (rule 4), all on this route: traffic lights (3), a roundabout (6; the nearest kind to a large one that the
engine drives as depicted, see below) and a mini-roundabout (8), emerging right (2) and left (7), a right turn across
oncoming traffic (1), a pedestrian crossing (3, the signal crossing at the Wilbury Way lights), and the pull-up and
move-off pair (4, 5). The right turn on to the A10 at the White Hart Lane lights (a dual carriageway crossed at the
lights) is driven without a challenge: it is under 300 m from challenge 2.

## Checker

`node tools/centres/check_route.mjs tottenham-1`: 3.7 km; 8 challenges, spacing met, nothing missing from the mix;
**two rules NOT MET, both ones the area cannot meet with a good route:**

- **On confirmed or likely roads: 37%** (rule 3 asks for more than half). The A10 Great Cambridge Road 1.2 km and
  Selby Road 0.17 km are the evidence's roads on the route; the rest (White Hart Lane 0.87 km, Weir Hall Road, Wilbury
  Way, Weir Hall Avenue, Oak Avenue) are named by no source. The evidence names only three roads, two of them trunk
  dual carriageways. Over half could be reached only by driving the A10 up and back (a weaker test, with the eight
  challenges squeezed into what is left) or by going round the Great Cambridge roundabout (below).
- **At known junctions: 0 of 8** (rule 3 asks for 3). The only known junction is the Great Cambridge roundabout, and
  it is left out (below). The owner's exception (`../ROUTE_TEMPLATE_RULES.md` section 3) covers this rule.

## Choices

- **The Great Cambridge roundabout left out.** It is the one place the evidence confirms, 1.1 km north of the centre.
  On the map it is a signal-controlled four-lane gyratory on trunk roads, with the A406 passing under it and slip
  roads and signals on the ring: in the scene a set of one-way roads with lights, as Morden's Rosehill roundabout was,
  not a give way roundabout. A challenge there would not drive as depicted. Not tried in a drive.
- **The A10 kept.** It is the evidence's road within reach, and teaches the most: a right turn across a dual
  carriageway at the White Hart Lane lights, the right-turn lane and the crossing at the Wilbury Way lights, and
  joining its nearside lane from Weir Hall Avenue.
- **The way out by Oak Avenue.** Selby Road meets White Hart Lane at a fork on a bend, where the way south is
  straight on; going out by Oak Avenue and Weir Hall Road gives a right turn across oncoming traffic on a quiet road
  first, then a proper emerging right turn on to White Hart Lane.
- **Left out.** The A406 (trunk, three lanes each way, 40 mph); the Bull Lane and Plowman Close mini-roundabouts and
  the zebras on Wilbury Way and Bull Lane (too close to the challenges round them for the 300 m spacing).

## Found on the map

- **Weir Hall Avenue's last stretch to the A10 is unnamed**, in two pieces, one 23 m long: the planner will not turn
  on to a short unnamed road. Named Weir Hall Avenue in `osm-patches.json`.
- **The turn from Oak Avenue into Weir Hall Road has a square corner** in the scene: the car's line is kept 1 m wide
  of it.
- **The Weir Hall Avenue roundabouts' arms have splitter islands with bollards on their noses**, leaving lanes about
  2.3 m wide beside them; the first drive touched three. The car's line is kept 0.5 to 1 m to the left past each.

## Drives

One drive without traffic (as authored, before the shifts above): 16 of 16 pauses as depicted, each road user at its
point, passed with no faults, no red light run, the closest scripted road user the oncoming car at challenge 1, 2.9 m.
It touched the splitter bollards at the two roundabouts and cut two corners (the Oak Avenue turn; leaving the first
roundabout west), and finished 11.4 m short of the line's end. The shifts above answer the bollards and the Oak Avenue
corner; the drives with traffic, and a drive without traffic after the shifts, are still to run
(`ROUTES=tottenham-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`).

## Open items

- The address on gov.uk, and where tests start and finish within the Selby Centre.
- A first-hand source (instructor video, learner account) naming the residential roads round the centre.
- Whether the Great Cambridge roundabout can be driven as depicted, should the owner want the confirmed junction in.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
