# Birmingham (South Yardley) decision route

One "Decisions only" practice route from the South Yardley test centre on Clay Lane, B26 1EA (gov.uk lists the centre
as current, read 17 November 2026; OSM has the DVSA building 125 m north of the given position, on the same site).
One route per centre, carrying the whole mix where the area has it (`../ROUTE_TEMPLATE_RULES.md` section 5). Built from
OpenStreetMap data and the published evidence in `content/sources/pass2/birmingham-south-yardley-evidence.json`,
November 2026. A practice route, not a confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The
format: `../ROUTE_FORMAT.md`.

**Start and finish.** The test centre's way in is a gated service road (OSM way 921257196) off the west side of Clay
Lane, beside the DVSA car park. The route starts on it 18 m short of Clay Lane, facing it, leaves left, and comes back
up Clay Lane from the south (a left turn in), finishing on the same way in by the car park.
*To confirm: where tests start and finish within the site.*

**Evidence.** Every road and junction in the evidence file is *likely* (one author, drivingtesttips.biz, fifteen
lists; the second site copies it word for word). The centre has not moved, so the lists count for leaving and
returning too.

## Gilbertstone Avenue and Barn Lane (scene `birmingham-south-yardley-route-1`, 5.9 km)

Out of the test centre, left on to Clay Lane, right at the Gilbertstone Avenue mini-roundabout, Gilbertstone Avenue,
left at the Coventry Road lights, Coventry Road (A45), left into Clay Lane (pulling up and moving off), down Clay Lane
past the test centre, left at the Woodcock Lane North mini-roundabout, Clay Lane, ahead over the Bosworth Road
crossroads on to Barn Lane, right into Richmond Road, right into Pierce Avenue, right on to Lincoln Road North, left at
the crossroads on to Clay Lane and The Vineries, right at The Vineries mini-roundabout, Woodcock Lane North, ahead at
the Clay Lane mini-roundabout, left into the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, left on to Clay Lane | A white car coming up Clay Lane from the right | Look right, signal left, give way; look right and left, go |
| 2 | Gilbertstone Avenue at the Coventry Road lights, turn left | Red; a pedestrian stepping out across Gilbertstone Avenue from the left | Mirrors, signal left, slow down, wait at the line; on green, left mirror and a look left, go |
| 3 | Pull up on Clay Lane, south of Coventry Road | A cyclist behind | Choose the straight clear of the junction, mirrors, signal; handbrake, neutral, cancel signal |
| 4 | Move off | The cyclist coming past | Mirror and blind spot, wait; again, go |
| 5 | Barn Lane, right into Richmond Road | A grey car coming along Barn Lane the other way, going ahead | Mirrors, signal right, position; wait; look into Richmond Road, go |
| 6 | Richmond Road, right into Pierce Avenue | A pedestrian crossing the mouth of Pierce Avenue | Mirrors, signal right, position; look into Pierce Avenue, give way; look ahead and into it again, go |
| 7 | Pierce Avenue, right on to Lincoln Road North | A red car coming down Lincoln Road North from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 8 | The Vineries mini-roundabout, right into Woodcock Lane North | A green car coming down Woodcock Lane North, from the right, going ahead | Mirrors, signal right; look right, give way; look right again, go |

**The mix** (rule 4): traffic lights (2), a mini-roundabout (8), emerging left (1) and right (7), a right turn across
oncoming traffic (5, and 6 into a side road with someone crossing it), and the pull-up and move-off pair (3, 4).
**Not on this route, because the area cannot give them:**

- *A large roundabout.* The ones the lists name are Swan Island (the A45 / Yardley Road / Church Road gyratory, with an
  underpass and slip roads in several one-way pieces), the Acocks Green gyratory (Warwick Road / Shirley Road / Westley
  Road, the same) and the small Yardley Road / Stockfield Road roundabout 1 km west, reached only through Swan Island.
  None makes a roundabout decision the engine can depict as a roundabout, as Morden found with Rosehill. The two
  Clay Lane mini-roundabouts are driven through; The Vineries mini-roundabout is the challenge.
- *A pedestrian crossing.* The only crossings on the lists' roads near the centre are the A45's signal crossings: the
  one at Gilbertstone Avenue is 59 m past the lights (under the 300 m spacing), and the others are on the eastbound
  carriageway, away from the loop. The pedestrians at challenges 2 and 6 (crossing the road the car turns from, at the
  lights, and the side road it turns into) teach the same priority.

**Known junctions** (6 of 8): the test centre's way out on Clay Lane (1), the Gilbertstone Avenue / Coventry Road
lights (2), the Barn Lane / Richmond Road / Wagon Lane junction (5), the Pierce Avenue / Richmond Road junction (6), the
Pierce Avenue / Lincoln Road North junction (7) and the Clay Lane / The Vineries mini-roundabout (8). Driven through:
both Clay Lane mini-roundabouts, the Coventry Road / Clay Lane junction and the Bosworth Road crossroads (all named).

**Overlap** (rule 3): 98% of 5.9 km on likely roads (Clay Lane 1.77 km, Gilbertstone Avenue 0.83, Coventry Road 0.65,
Barn Lane 0.58, Pierce Avenue 0.55, Richmond Road 0.46, Woodcock Lane North 0.38, Lincoln Road North 0.34, The
Vineries). Not named: the test centre's way in.

## Checker

`node tools/centres/check_route.mjs birmingham-south-yardley-1`: passes (5.9 km, 98% on likely roads, 6 of 8 at
known junctions, spacing met; not in the mix: roundabout, crossing, as above).

## Choices

- **Why this loop.** A figure of eight through the test centre: north by the roads the lists leave by (Gilbertstone
  Avenue, the A45, back down Clay Lane, the way the lists come home), then south by the lists' commonest roads (Barn
  Lane, Richmond Road, Pierce Avenue, Lincoln Road North) and home the way most lists end (The Vineries mini-roundabout
  right, Woodcock Lane North, ahead at the Clay Lane mini-roundabout, left in).
- **The lights.** The Gilbertstone Avenue lights are the only signal junction the car meets on the loop as a junction
  in the scene: at the Coventry Road / Clay Lane junction the map's lights stand on the A45 west of the turn, so turning
  left into Clay Lane is driven without them.
- **The pull-up.** Clay Lane south of Coventry Road: 680 m of 30 mph road with no side roads and no cars parked in the
  scene.
- **Left out.** The A45 east of Gilbertstone Avenue and the Wagon Lane / New Coventry Road junction (one-way pieces and
  slip roads), the Olton roads (Kineton Green Road, St Margarets Road, Warwick Road) and the Lyndon Road
  mini-roundabouts: further than one 6 km loop reaches with the junctions above.

## Found on the map

- **The test centre's way in is private** in OpenStreetMap, so the scene builder left it out: its access tag is dropped
  in our copy (`osm-patches.json`) and the way added to the scene by its id. The route's last point is on its bend, more
  than 20 m from Clay Lane, so the plan takes it.
- **Gilbertstone Avenue**: without a point near the lights, the planner cut through Gotham Road and Steyning Road to the
  A45; a point is placed on Gilbertstone Avenue just before the lights.
- **The 20 mph sign's post at the start of Clay Lane**, on the kerb just north of the Woodcock Lane North
  mini-roundabout: going ahead over the mini-roundabout on the way back, the line swung out wide to pass the island and
  the car, running a little wider still, hit the post (the first full drive test, as authored and with traffic). The
  line is kept 1 m further in from the mini-roundabout's far side to Clay Lane (a `shift` to the right): the car's box
  along the planned line now clears every fixed object.
- **Cars parked at the kerb near the Gilbertstone Avenue lights** (the scene places them 10 m from the A45's
  carriageway): the car's line is eased round them, close to the middle of the road at the stop line.

## Drives

`ROUTES=birmingham-south-yardley-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: first run, Skip ahead
passed; as authored and with traffic (patterns 4 and 14) the car hit the 20 mph sign's post at the start of Clay Lane
(fixed as above). Second run, after the fix: all 6 pass (the authoring rules, the planned way clear of parked cars, as
authored, patterns 4 and 14, Skip ahead), 868 s.

## Open items

- Where tests start and finish within the site; a first-hand source (instructor video, learner account) to confirm any
  road; the route lists' dates.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
