# Sheffield (Middlewood Road) decision routes

Two "Decisions only" practice routes from the Sheffield (Middlewood Road) test centre, 508 Middlewood Road, S6 1TQ
(position 53.41667, -1.51075; the map has the centre on the plot between Middlewood Road and Winn Gardens, with its car
park off Winn Gardens). Built from OpenStreetMap data and published route information, November 2026 (pilot: see
`../PILOT_BUILD_BRIEF.md`). Practice routes, not confirmed test routes: the screen says "Based on the roads round this
test centre. Your test route may differ." How they were chosen and built: `HOW_WE_BUILT_IT.md`. The format:
`../ROUTE_FORMAT.md`. Evidence: `content/sources/pass2/sheffield-middlewood-road-evidence.json`.

**Start and finish.** Both routes start and finish in the test centre's car park (the service road off Winn Gardens,
OSM way 138662335, built into the scene by its id), and use the Winn Gardens / Middlewood Road junction that published
routes name for leaving and returning. *To confirm: that this car park road is the centre's own way in and out (the
address was taken from directory listings; gov.uk could not be read automatically).*

## Route 1: Langsett Avenue and Wadsley (scene `sheffield-middlewood-road-route-1`, 4.0 km)

Car park, right on to Winn Gardens, left on to Middlewood Road, right up Langsett Avenue, left on to Worrall Road,
Wadsley Lane (pulling up and moving off), right into Dixon Road, left at the lights on to Middlewood Road, over the
signal crossing by Lennox Road, through the Wadsley Lane and Catch Bar Lane lights, right into Winn Gardens and left into
the car park.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the car park, right on to Winn Gardens | Someone walking along the Winn Gardens footway from the left; then a silver car turning in from Middlewood Road, from the right | Look along the footway, give way; look right, signal right, give way; look right and left, go |
| 2 | Middlewood Road, right into Langsett Avenue (known junction, confirmed) | A blue car coming up Middlewood Road | Mirrors, signal right, position; wait; look into Langsett Avenue, go |
| 3 | Top of Langsett Avenue, left on to Worrall Road | A white car coming down Worrall Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 4 | Pull up on Wadsley Lane, past Braemore Road | | Choose well past Braemore Road, mirrors, signal; handbrake, neutral, cancel signal |
| 5 | Move off | A grey car coming along Wadsley Lane behind | Mirrors, wait; mirror and blind spot, go |
| 6 | Middlewood Road signal crossing by Lennox Road | Red; a pedestrian stepping out from the left | Interior mirror, slow down; wait at the line; on green, check the crossing both ways, go |
| 7 | Catch Bar Lane lights on Middlewood Road, ahead (known junction) | Red as you approach | Interior mirror, slow down; wait; on green, look across the junction, go |
| 8 | Middlewood Road, right into Winn Gardens, back to the centre (known junction) | A black car coming down Middlewood Road | Mirrors, signal right, position; wait; look into Winn Gardens, go |

No roundabout lies in this route's area (Wadsley and Hillsborough's west side): the second right turn across traffic
(challenge 8) stands in for it, and route 2 has two roundabouts. The Dixon Road lights (left on to Middlewood Road) and
the Wadsley Lane lights are driven through, not challenges.

## Route 2: Leppings Lane and Southey Green (scene `sheffield-middlewood-road-route-2`, 8.1 km)

Car park, Winn Gardens, left on to Middlewood Road, Catch Bar Lane, left at the lights into Leppings Lane, the slip on
to Penistone Road North, Halifax Road, right into Southey Green Road, right at the Southey Green Road roundabout on to
Wordsworth Avenue (pulling up and moving off), right on to Herries Road, left at the Herries Road lights on to Penistone
Road North, right into Owlerton Green, ahead at the Bradfield Road roundabout, Bradfield Road, right on to Middlewood
Road at Hillsborough, and home up Middlewood Road, right into Winn Gardens and left into the car park.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving: end of Winn Gardens, left on to Middlewood Road (known junction) | A silver car coming down Middlewood Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 2 | Catch Bar Lane, left at the lights into Leppings Lane (known junction) | Red light; someone crossing the end of Leppings Lane as it turns green | Mirrors, signal left, stop; on green, look into Leppings Lane, give way; left mirror, go |
| 3 | Halifax Road, right into Southey Green Road | A blue car coming down Halifax Road | Mirrors, signal right, position; wait; look into Southey Green Road, go |
| 4 | Southey Green Road roundabout, turn right (third exit) on to Wordsworth Avenue (known junction) | A white car coming round from Wordsworth Avenue, on the right | Mirrors, signal right, position; look right, give way; look right again, go |
| 5 | Pull up on Wordsworth Avenue, past Avisford Road | | Choose well past Avisford Road, mirrors, signal; handbrake, neutral, cancel signal |
| 6 | Move off | A cyclist coming down Wordsworth Avenue behind | Mirror and blind spot, wait; again, go |
| 7 | Herries Road lights, left on to Penistone Road North (known junction) | Red as you approach | Mirrors, signal left, stop; on green, left mirror and look, go |
| 8 | Bradfield Road roundabout (small), ahead | A black car coming round from Hawksley Road, on the right | Interior mirror, slow down; look right, give way; look right again, go |

The small Bradfield Road roundabout at Owlerton (the map's ring is about 11 m across) stands in for a mini-roundabout:
there is none on these roads (the only one mapped nearby is inside a retail park off Saw Works Way).

## Overlap with the test area (ROUTE_TEMPLATE_RULES section 3)

| | Route 1 | Route 2 |
|---|---|---|
| Length | 4.0 km | 8.1 km |
| On confirmed or likely roads | 3.88 km, 96% (Middlewood Road 1.65, Langsett Avenue 0.71, Wadsley Lane 0.54, Worrall Road 0.46, Dixon Road 0.42, Winn Gardens 0.10) | 6.70 km, 83% (Middlewood Road 2.77, Penistone Road North 0.97, Herries Road 0.90, Wordsworth Avenue 0.59, Leppings Lane 0.48, Southey Green Road 0.41, Halifax Road 0.38, Catch Bar Lane 0.09, Winn Gardens 0.10) |
| Not named by any source | the car park road (0.08 km) | Penistone Road south of Herries Road (0.59), Bradfield Road (0.29), Owlerton Green (0.14), roundabout and link pieces |
| Challenges at known junctions | 3 of 8: Langsett Avenue right turn (confirmed), Catch Bar Lane lights, Winn Gardens / Middlewood Road | 4 of 8: Winn Gardens / Middlewood Road, the Catch Bar Lane / Leppings Lane lights, the Southey Green Road roundabout, the Herries Road / Penistone Road North junction |
| Leaves | West (Langsett Avenue, Wadsley) | South-east, then north-east (Leppings Lane, Parson Cross) |

Known junctions (evidence file): 8. Used by the two routes together: 5 (Langsett Avenue, Winn Gardens, Catch Bar Lane /
Leppings Lane, Herries Road / Penistone Road North, Southey Green Road roundabout). Not used: the Herries Road /
Moonshine Lane roundabout and the Wordsworth Avenue / Deerlands Avenue / Chaucer Road roundabouts (2.5 and 2 km east,
outside a scene that also holds the centre: a third route could take them), and the "Halifax Road / Penistone Road
North roundabout" (no roundabout there on the map). So 5 of the 7 that exist on the map, most of them.

The likely roads all come from one compiled list published on two sites (counted once); only Middlewood Road, Langsett
Avenue and their junction are confirmed (a local instructor's page as well).

## Open items

- The centre's own way in and out (see Start and finish), and its address against gov.uk.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Route 2 comes home the long way, by Owlerton and Hillsborough: the map's short links across Penistone Road North at
  Leppings Lane cannot be planned westbound by the route planner (unnamed links under 40 m are not taken), so a return
  by Herries Road and Leppings Lane is not possible without a change to the planner (`src/test/route.ts`).
- Not yet played in the app, screenshotted and checked by eye; not yet in `DECISION_ROUTES` or on the home screen.
