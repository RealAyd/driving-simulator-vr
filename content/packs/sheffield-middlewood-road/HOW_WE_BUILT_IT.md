# How the Sheffield (Middlewood Road) routes were built

A pilot centre (`../PILOT_BUILD_BRIEF.md`), built by the steps Brentwood and Chelmsford set
(`../brentwood/HOW_WE_BUILT_IT.md`, `../chelmsford/HOW_WE_BUILT_IT.md`) and the template's rules
(`../ROUTE_TEMPLATE_RULES.md`): the routes are chosen from the map and published information, judgement first
(`../EVIDENCE_PLAN.md` section 7). The routes are in `ROUTES.md`.

## 1. Find the centre as it is now

The evidence file gives 508 Middlewood Road, S6 1TQ, from directory listings (gov.uk could not be read automatically).
OpenStreetMap has a "Sheffield DVLA Driving Test Centre (Middlewood)" point and a building with that postcode on the plot
between Middlewood Road and Winn Gardens, with a dead-end car park road (way 138662335) off Winn Gardens, 45 m from
Middlewood Road. Both routes start and finish in that car park and use the Winn Gardens / Middlewood Road junction that
published routes name for leaving and returning. The car park road was built into the scenes by its map id, as
Brentwood's way in was. *To confirm with the owner.*

## 2. What the evidence gives, and how it was weighed

One instructor's page (Middlewood Road, Langsett Avenue and the right turn between them: confirmed) and one compiled
list of nine routes published on two sites (counted once: 31 likely roads, 7 likely junctions). The list's junction
positions are approximate, so each was looked up on the map:

- **Middlewood Road / Langsett Avenue right turn** (confirmed): a plain T junction 270 m from Winn Gardens, the right turn
  from Middlewood Road towards Hillsborough into Langsett Avenue, which climbs to Worrall Road. Used in route 1.
- **Winn Gardens / Middlewood Road**: no lights; Middlewood Drive's lights are 90 m south. Route 2 leaves by it, route
  1 comes back by it.
- **Middlewood Road / Catch Bar Lane / Leppings Lane lights**: on the map Leppings Lane meets Middlewood Road twice,
  at the lights with Wadsley Lane and Parkside Road and again by Catch Bar Lane, with lights at each (150 m apart), and
  meets Catch Bar Lane at a third set. Route 1 goes ahead through the first as its lights challenge.
- **"Leppings Lane / Penistone Road North / Herries Road roundabout"**: on the map a large light-controlled junction,
  not a roundabout. Route 2 turns left there from Herries Road.
- **Southey Green Road roundabouts**: the Southey Green Road / Wordsworth Avenue roundabout. Route 2.
- **Herries Road / Moonshine Lane roundabout** and **Wordsworth Avenue / Deerlands Avenue / Chaucer Road
  roundabouts**: 2 to 2.5 km east. A scene (2.4 to 2.5 km square) holding the centre cannot also hold them with the rest
  of a route; left for a third route.
- **"Halifax Road / Penistone Road North roundabout"**: none on the map.

Middlewood Road towards Hillsborough has no mini-roundabout; the only one mapped in the area is inside a retail park.
There is no roundabout at all in route 1's area (Wadsley).

## 3. Choose the routes

Route 1 goes west: the confirmed Langsett Avenue right turn, up to Worrall Road, Wadsley Lane (quiet, no parked cars:
the pull-up), Dixon Road and back up Middlewood Road over a signal crossing and through the Leppings Lane lights, then
right into Winn Gardens. 96% of it is on roads the sources name. Trial drives with traffic showed two things: a
background car coming down Langsett Avenue could meet the car between the parked cars and stand face to face with it
for a minute, so background traffic is kept off Langsett Avenue while the car drives up it (as Chelmsford's St John's
Road); and the Leppings Lane lights (a 70 s cycle) could hold the car for nearly a minute, so they are the route's lights
challenge (held for the car), rather than the Catch Bar Lane lights 150 m on (a short cycle). The right turn back into
Winn Gardens is decided in position, stopped: traffic on Middlewood Road could hold the car short of the turn, and a
pause on the move then came with the black car already gone by.

Route 2 goes east: Middlewood Road, Catch Bar Lane, Parkside Road on to Penistone Road, Halifax Road, Southey Green Road
and its roundabout, Wordsworth Avenue (no side roads and no parked cars for 440 m: the pull-up), right on to Herries
Road, the Herries Road lights, and home round by Owlerton and Hillsborough. What the map and the planner changed:

- The published lists go between Leppings Lane and Penistone Road North. In the map the links across Penistone Road
  North there are short unnamed pieces (11 to 32 m); the route planner takes no unnamed road under 40 m, so westbound
  the way cannot be planned at all, and northbound it turns from Leppings Lane straight on to Penistone Road North,
  cutting across the corner's footway and a sign post. So the route joins Penistone Road from Parkside Road (named
  links) and comes home round Owlerton and Hillsborough, the only other way back across Penistone Road.
- Bickerton Road, Claywheels Lane and Beeley Wood Lane were tried for the way back: Bickerton Road cannot be turned into
  across the central reservation, and Beeley Wood Lane does not reach Middlewood Road North on the map.
- Coming home by Owlerton, the drive passes five sets of lights on Penistone Road with long cycles (one stood the car
  for a minute in a trial drive). So the last challenge is the Herries Road lights, before them: on the way back to the
  centre the runner holds the lights green, as for every route. The small Bradfield Road roundabout at Owlerton (about
  11 m across) is driven but not judged, and the eight are the mix without a mini-roundabout (none on these roads that
  the planner can drive: the Southey Green Road / Southey Hill pair is mapped as short unnamed links).
- Two corners where the planned line cut across a footway (into Southey Green Road, and back into the car park) are
  eased wide with a short `shifts` entry.

## 4. Build the scenes

`node tools/scenes/build_scene.mjs sheffield-middlewood-road-route-1 "Sheffield (Middlewood Road)" 53.41308 -1.5115 1200 <osm> 53.418556,-1.512529 53.418341,-1.512272 138662335`

`node tools/scenes/build_scene.mjs sheffield-middlewood-road-route-2 "Sheffield (Middlewood Road)" 53.41164 -1.49982 1250 <osm> 53.418556,-1.512529 53.418341,-1.512272 138662335`

Each map download was too large for one OpenStreetMap API call, so it was fetched in nine tiles and merged (as
Chelmsford's). Route 2's scene is 2.5 km square (half-size 1250, as Brentwood's) so that it holds both the centre and the
Southey Green Road roundabout.

## 5. Plan the line, probe it, script the road users

As Chelmsford: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings and
roundabouts by metres along it, and each road user's path generated on the scene's roads from a start and points to pass
(the car and the cyclist passing a pulled-up car given room round it). Every road user turns off into a side road out of
sight, or runs on well away.

## 6. Drive it headless

`tests/unit/decisionDrive.sheffield-middlewood-road.test.ts` drives both routes with the right answers, without traffic,
with 30 background road users in two patterns (seeds 4 and 14), and with Skip ahead pressed whenever offered; and checks
the authoring rules `tests/unit/decision.test.ts` checks for routes in `DECISION_ROUTES`. Results are in the report of
this build.

## Still to do

Add the routes to `DECISION_ROUTES` and the home screen (shared files), record the voice clips, play them in the app and
look at every paused picture, then staging and the owner's drive. Open items are in `ROUTES.md`.
