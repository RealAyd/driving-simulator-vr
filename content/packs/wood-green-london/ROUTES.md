# Wood Green (London) decision route

One "Decisions only" practice route from the Wood Green (London) test centre, beside Wood Green Crown Court, Woodhall
House, Lordship Lane, N22 5LF (DVSA's centre data as quoted in 2026; listed as current on gov.uk's "Check which driving
test centres you can move your test to", updated 15 October 2026; the gov.uk centre finder not reachable from the build
machine, *to recheck*). One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md` section 5). Built
from OpenStreetMap data and the published evidence in `content/sources/pass2/wood-green-london-evidence.json`,
November 2026. A practice route, not a confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The
format: `../ROUTE_FORMAT.md`.

**Start and finish.** The test centre's car park is on the north side of Lordship Lane (A109, 20 mph), reached by a
16 m way in beside the building. The route starts on the car park aisle, comes out of the way in and turns left, and
ends back in the car park, right in from Lordship Lane. *To confirm: where tests start and finish within the car park.*

**Evidence.** One author only. drivingtesttips.biz's eight free route lists (copied word for word by
intensivelessons.co.uk) name some 60 roads and 22 junctions, all likely; a local forum thread also names the way out on
to Lordship Lane (its bus stop) and the Great Cambridge roundabout, but not as test accounts. Nothing is confirmed.

## Lordship Lane and Tower Gardens (scene `wood-green-london-route-1`, 3.5 km)

Out of the test centre left on to Lordship Lane, east over the signal crossing by Gladstone Avenue and ahead through
the Boreham Road and The Roundway lights, pulling up and moving off past Walpole Road, left into Awlfield Avenue, ahead at
the Tower Gardens Road mini-roundabout, left round the small Risley Avenue roundabout on to Risley Avenue, ahead at the
Waltheof Avenue roundabout, left into Kevelioc Road, right out of it on to Lordship Lane, and west along Lordship Lane
back to the test centre, right into it.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: the way out, left on to Lordship Lane | A pedestrian walking along the footway from the bus stop, across the way out; then a white car along Lordship Lane from the right | Look left, signal left, give way; look right, give way; look right and left, go |
| 2 | Lordship Lane, the signal crossing by Gladstone Avenue | Lights red, a pedestrian crossing from the left | Interior mirror, slow down, wait at the line; on green check both ways, go |
| 3 | Pull up on Lordship Lane, past Walpole Road | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 4 | Move off | The cyclist coming past, on into Kevelioc Road | Mirror and blind spot, wait; again, go |
| 5 | Awlfield Avenue at the Tower Gardens Road mini-roundabout, ahead | A red car along Tower Gardens Road from the right, going ahead across | Interior mirror, no signal; look right, give way; look right again, go |
| 6 | Risley Avenue at the Waltheof Avenue roundabout, second exit (ahead) | A black car coming down Waltheof Avenue from the right, round across the way in | Interior mirror, no signal; look right, give way; look right again, go |
| 7 | Kevelioc Road, right on to Lordship Lane | A grey car along Lordship Lane's near lane from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 8 | Lordship Lane, right into the test centre | A blue car coming the other way along Lordship Lane | Mirrors, signal, position; wait; check the way in, turn |

**The mix** (rule 4), all on this route: traffic lights and a pedestrian crossing (2, a signal crossing), a roundabout
(6) and a mini-roundabout (5), emerging left (1) and right (7), a right turn across oncoming traffic (8), and the pull-up
and move-off pair (3, 4). The area has no large give way roundabout within reach: the Great Cambridge roundabout (A10 /
A406, 2.2 km north-east) is a signal-controlled gyratory over the A406. The nearest kind is the Waltheof Avenue
roundabout (an island about 10 m across), which the evidence names; the file says so here.

## Checker

`node tools/centres/check_route.mjs wood-green-london-1`: passes.

```
wood-green-london-1 (Wood Green: Lordship Lane and Tower Gardens): 3.5 km
  On confirmed or likely roads: 89%
  1. leave-test-centre            emerging-left              0 m  at Test centre way out on Lordship Lane
  2. boreham-crossing             lights+crossing          560 m (+560)
  3. lordship-pull-up             pull-up                 1000 m (+440)  at Lordship Lane / Turnant Road junction
  4. lordship-move-off            move-off                1080 m (+80)
  5. awlfield-mini                mini-roundabout         1585 m (+505)  at Awlfield Avenue / Tower Gardens Road mini-roundabout
  6. risley-roundabout            roundabout              2020 m (+435)  at Risley Avenue / Waltheof Avenue roundabout
  7. kevelioc-emerge              emerging-right          2345 m (+325)
  8. centre-right                 right-turn              3440 m (+1095)  at Test centre way out on Lordship Lane
  At known junctions: 5 of 8
```

Of the five, the pull-up counts only because its direction is given near the Turnant Road junction: four challenges are
placed at known junctions (1, 5, 6, 8). Kevelioc Road (219 m) is the only road on the route no source names, besides the
way in.

## Choices

- **Lordship Lane** carries most of the route both ways: every listed route leaves and returns by it, and it gives the
  signal crossing, two sets of junction lights, bus stops and the pull-up on a main road.
- **Tower Gardens** (Awlfield Avenue, Risley Avenue) is the estate the lists use east of The Roundway, with the mini-
  roundabout and the small roundabouts they name. The loop is driven the other way round from the list that uses it
  (in by Awlfield Avenue, out by Kevelioc Road), and no stretch follows a list's order beyond what the roads force.
- **Kevelioc Road** gives the emerging right turn on to Lordship Lane, a clean T with no lights near it. The other ways
  back (Turnant Road, at the split of the dual section by The Roundway lights; Waltheof Avenue, too short past its
  mini-roundabout for the 300 m spacing) were weaker.
- **Left out.** Perth Road, Paisley, Eldon and Granville Roads (the lists' usual way home; Eldon and Granville are a
  one-way pair too short for the spacing from Lordship Lane), the Wolves Lane area (1.4 km north; its "roundabout" is a
  crossroads on today's map), the A10, the A406 and the Great Cambridge roundabout (trunk roads, a signal gyratory, and
  Tottenham's route already has the A10). The zebra on Lordship Lane by Perth Road and the Perth Road pelican are driven
  without a challenge (too close to the way out and the way in).
- **Tottenham next door.** None of its roads (White Hart Lane, Weir Hall Road, Wilbury Way, the A10) is used.

## Found on the map

- **The way in and the car park aisle are unnamed and short** (16 m and 14 m): the planner will not turn into a short
  unnamed road, so the route could not come back in. Both named "Driving Test Centre" in `osm-patches.json` (our copy
  only). A street name plate reading "Driving Test Centre" now stands at the mouth in the scene.
- **Every point of the car park is within 20 m of Lordship Lane**, so the last through points are placed off the way in
  and the aisle on the side away from Lordship Lane.
- **The Waltheof Avenue roundabout's west exit** passes a post on the splitter island's nose about 0.15 m from the car's
  side on the planned line: the line is kept 0.5 m left there (about 0.65 m clear).
- **Where the way in turns into the car park aisle** a kerbed corner of footway sits on the inside of the bend: the
  drives put a wheel over it as the car turned in, so the line is kept 1.6 m wide of it.
- **The cyclist at the pull-up** came 2.07 m from the car centre to centre (the drive test asks over 2.2): the car pulls
  in 0.6 m (from 0.5) and the cyclist goes 1.9 m out round it (from 1.6), 2.4 m.

## Drives

Not driven yet (the build machine was busy). To run:
`ROUTES=wood-green-london-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`. The authoring rules part
(`-t "as authored"`) passes.

## Open items

- The address on the gov.uk centre finder, and where tests start and finish in the car park.
- A first-hand source (instructor video, learner account) to confirm any road or junction.
- The drives (as authored, traffic patterns 4 and 14, Skip ahead); then played in the app and every paused picture
  checked; then staging and the owner's drive.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
