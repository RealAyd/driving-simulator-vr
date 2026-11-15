# Salisbury decision routes

Two "Decisions only" practice routes from the Salisbury test centre on Rougemont Close, SP1 1LY (the DVSA building is
mapped on the north side of the close, at its Manor Road end). Built from OpenStreetMap data and the public
information in `content/sources/pass2/salisbury-evidence.json`, November 2026. Practice routes, not confirmed test
routes. How they were chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** Rougemont Close is a short dead end off Manor Road, so both routes leave and come back that way.
The centre's own way out (a driveway on to Manor Road just north of the close) is mapped as a private driveway and not
built, so the drive starts on Rougemont Close outside the centre and finishes back on it. *To confirm: whether tests
leave by the close or by the driveway.*

## Route 1: St Mark's and Bishopdown (scene `salisbury-route-1`, 4.8 km)

Rougemont Close, left on to Manor Road, Fairview Road, Kelsey Road, Bourne Avenue, St Mark's Roundabout, St Mark's
Avenue, Bishopdown Road, right at the mini-roundabout into Denison Rise (pulling up and moving off), Barrington Road,
right at the lights on to London Road, St Mark's Roundabout, Wain-a-long Road, round the Bourne Avenue mini-roundabout,
Kelsey Road, right into Manor Road, left into Rougemont Close.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Rougemont Close, left on to Manor Road | A white car coming up Manor Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 2 | St Mark's Roundabout from Bourne Avenue, fourth exit (St Mark's Avenue) | A blue car coming round from London Road, past the entry | Mirrors, signal right; look right, give way; look right again, go |
| 3 | Bishopdown Road, right at the mini-roundabout into Denison Rise | A yellow car coming out of Denison Rise, going round across the car's way | Mirrors, signal right; look right, give way; look right again, go |
| 4 | Pull up on Denison Rise, past Linkway | | Choose past Linkway, mirrors, signal; handbrake, neutral, cancel signal |
| 5 | Move off | A grey car coming up Denison Rise behind, to pass | Mirrors, wait; right mirror and blind spot, go |
| 6 | Barrington Road lights, right on to London Road | Red as you approach | Mirrors, signal right, stop; on green, look both ways along London Road, go |
| 7 | London Road, the crossing at St Mark's Roundabout, then the first exit | Red, someone crossing from the left | Interior mirror, slow down, left mirror, signal left; wait; on green, look both ways, go |
| 8 | Kelsey Road, right into Manor Road | A cyclist coming along Kelsey Road | Mirrors, signal right, position; wait for the cyclist; look into Manor Road, go |

Found on the map: from Wain-a-long Road the entry to St Mark's Roundabout is a sharp left into a narrow slip with an
island nose in it, too tight for the car; from Bourne Avenue it is a gentle bend, so the route goes out by Fairview Road,
Kelsey Road and Bourne Avenue and comes back by Wain-a-long Road and Kelsey Road. (Back by Manor Road from the north,
the car's line would run within a metre of its line out, both squeezed to the middle by cars parked along each kerb,
and practising challenge 8 on its own started on the wrong one.) St Mark's Roundabout and the Barrington Road junction
are signal-controlled; the Bourne Avenue entry is a give way. The Denison Rise pull-up is opposite a gap in the cars
parked along the far kerb. Bourne Avenue, St Mark's Avenue and Denison Rise have cars parked along one kerb with no
room to meet traffic: challenges 1, 2 and 5 keep background traffic out of them while the car drives them
(`quietUntil`), as Chelmsford does in St John's Road.

## Route 2: the city and Castle Street (scene `salisbury-route-2`, 3.4 km)

Rougemont Close, right on to Manor Road, Kelsey Road (pulling up and moving off), Rampart Road, right at the Milford
Street lights, Milford Street, New Canal, High Street, Silver Street, Minster Street, Castle Street (the Chipper Lane
lights and the Mill Stream Approach mini-roundabout), Castle Roundabout, Churchill Way North, St Mark's Roundabout,
Wain-a-long Road, right into Manor Road, Rougemont Close.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Rougemont Close, right on to Manor Road | A white car coming down Manor Road from the left, in the lane you join | Mirrors, signal right; look both ways, give way; look right and left, go |
| 2 | Pull up on Kelsey Road, short of Elm Grove Road | | Choose clear of both junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 3 | Move off | A grey car coming along Kelsey Road behind, to pass | Mirrors, wait; right mirror and blind spot, go |
| 4 | Rampart Road at the Milford Street lights, right into Milford Street | Green; a blue car coming the other way up Rampart Road | Mirrors, signal right, position; wait in the junction; look into Milford Street, go |
| 5 | Castle Street at the Chipper Lane lights, ahead | Red, someone crossing Castle Street from the left | Interior mirror, slow down; wait; on green, look both ways, go |
| 6 | Castle Street at the Mill Stream Approach mini-roundabout, ahead | A black car coming down Castle Street, turning right across | Interior mirror, slow down; look right, give way; look right again, go |
| 7 | Castle Roundabout from Castle Street, third exit (Churchill Way North) | Red as you approach | Mirrors, signal right, stop; on green, look right round the roundabout, go |
| 8 | Wain-a-long Road, right into Manor Road | A green car coming up Wain-a-long Road | Mirrors, signal right, position; wait for it; look into Manor Road, go |

Found on the map: the city centre is a one-way system, so the route reaches Castle Street from Milford Street by New
Canal, High Street, Silver Street and Minster Street. Castle Roundabout's entries
are signal-controlled. The Castle Street zebra (by Mill Stream Approach) is 30 m before the mini-roundabout: the car
crosses it with no one on it, and the crossing in this route is at the Chipper Lane lights. Kelsey Road has cars
parked along its north kerb: the pull-up is where none are opposite.

## The rules (ROUTE_TEMPLATE_RULES.md)

**Overlap** (sections 3 and 6.5), measured on the car's planned line, each metre counted to the nearest mapped road:

| | Length | On confirmed roads | On likely roads | Share | Scenarios at known junctions |
|---|---|---|---|---|---|
| Route 1 | 4810 m | 2121 m | 1218 m | 69% | 4 of 8: Rougemont Close (1), St Mark's Roundabout (2, 7), the Denison Rise mini-roundabout (3) |
| Route 2 | 3407 m | 1145 m | 1174 m | 68% | 4 of 8: Rougemont Close (1), the Castle Street mini-roundabout (6), Castle Roundabout (7), Wain-a-long Road at Manor Road (8) |

Confirmed roads used: Rougemont Close, Wain-a-long Road, St Mark's Roundabout, St Mark's Avenue, London Road, Castle
Roundabout, Churchill Way. Likely: Manor Road, Kelsey Road, Denison Rise, Castle Street. Not named by any source:
Fairview Road, Bourne Avenue, Bishopdown Road, Barrington Road (route 1); Rampart Road, Milford Street, New Canal, High
Street, Silver Street, Minster Street (route 2).

**Known junctions used by the two routes together: the centre's exit and 4 of the 16 roundabouts and
mini-roundabouts the evidence names** (St Mark's Roundabout, Castle Roundabout, the Castle Street and Denison Rise
mini-roundabouts). Not met as "most". The rest are
the Devizes Road, Wilton Road, The Avenue, Exeter Street and New Harnham Road roundabouts and the Mill Road, St Francis
Road, Churchfields Road, Riverside Road and Milford Hill mini-roundabouts (outside these scenes or off these loops), the
London Road roundabout (the evidence's map points to London Road between Glenmore Road and Barrington Road, where the map
has no roundabout: the nearest junction, the Barrington Road lights, is route 1's challenge 6) and the "Wain-a-Long
Road roundabout" (the way the evidence links is Wain-a-long Road itself; route 2's challenge 8 is on it). A third route
west (Devizes Road, Wilton Road, Churchfields Road) would take most of the rest.

**The mix** (section 4): route 1 has all of it (lights twice: 6 and 7). Route 2 has no emerging left turn (its way out of
Rougemont Close is to the right, and its other turns out of side roads are at lights): a second right turn across
oncoming traffic (8) takes its place; route 1 has the emerging left turn. Spacing: route 1's mini-roundabout (3) is
180 m before its pull-up (4), and route 2's way out (1) is 210 m before its pull-up (2): both short of "about 300 m".

**Leaving in different directions**: route 1 goes north and east (Fairview Road, Bourne Avenue), route 2 south and west
(Kelsey Road west, Rampart Road). Both come back from the north through St Mark's Roundabout and down Wain-a-long Road,
the way back from that side; route 1's challenges there are the London Road crossing and the turn off Kelsey Road,
route 2's the turn off Wain-a-long Road into Manor Road.

**Checks** (`tests/unit/decisionDrive.salisbury.test.ts`, 59 tests): the shared authoring rules for every challenge;
both routes driven headless with the right answers to a pass, every pause as depicted, nothing hit, no red light run,
on the road throughout and back on Rougemont Close; the same with 30 background road users in patterns 4 and 14
(longest stand 26 s and 25 s on route 1, 42 s and 38 s on route 2, at the city lights by Minster Street); and with Skip
ahead pressed whenever offered (route 1: 4 skips, 587 s driven; route 2: 3 skips, 389 s).

## Open items

- The centre's own way in and out (the driveway on to Manor Road is not built).
- Signal phases, give way markings and the exact crossing positions are taken from the map, not surveyed. The Castle
  Street crossing at the Chipper Lane lights is placed at the stop line, where the map has its node.
- Played in the app and every paused picture checked by eye: not done yet.
- The app's home screen buttons and route list (`src/decision/routes/index.ts`, `sim/index.html`) are shared files,
  left to the main session.
