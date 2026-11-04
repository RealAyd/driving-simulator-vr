# Brentwood decision mock tests: five practice routes

Draft for the owner's review (2 November 2026). Practice routes, not confirmed official test routes. Each starts and
ends on Warley Hill at the test centre (89 Warley Hill; the entrance is not mapped, so the drive starts on Warley Hill
outside it). Each route is a connected path through the OpenStreetMap road graph (downloaded 31 October 2026) that
keeps to one-way streets and the mapped turn restrictions (`tools/scenes` route check). Coverage follows the route
families in the supplied screenshots and the two reported tests; they never decide lanes, priority or signal timings.

The app drives between challenges. At each challenge it stops before the decision, plays the traffic briefly, pauses
everything and asks for the learner's observations and actions (`DECISION_MOCK.md`).

Key: **wait** (the depicted traffic means waiting is right), **go** (a clear, safe opportunity: waiting is hesitation),
**both** (wait, then a fresh decision after traffic passes). Status: **ready**, **check** (one detail to confirm),
**blocked** (needs facts the map does not have).

## Route 1: Station, Kings Road and the town centre (about 3.3 km)

Warley Hill north, Kings Road past the station, Queen's Road roundabout, Kings Road to the High Street, Weald Road,
Western Road, William Hunter Way, Wilson's Corner, Ingrave Road, back by Queen's Road and Kings Road.

| # | Where and movement | Traffic that makes the decision | Answer | Status |
|---|---|---|---|---|
| 1 | Queen's Road roundabout from Kings Road south, first exit | Car close behind; blue car already on the ring from Queen's Road | both | **built** |
| 2 | Kings Road at the High Street lights, ahead into Weald Road | Green (held); a pedestrian still finishing crossing Weald Road | both | **built**; check: signal phases |
| 3 | Weald Road / Western Road mini-roundabout, right into Western Road | Car arriving from the right on Western Road | both | **built** |
| 4 | William Hunter Way zebra crossing | Pedestrian at the kerb about to step out; car close behind | both | **built** |
| 5 | Wilson's Corner: two mini-roundabouts close together, on to Ingrave Road | Car coming out of the High Street, on the right at the second mini | both | **built**; check: lane markings between the two minis |
| 6 | Ingrave Road at Cathedral Place (on the right), ahead | Car edging out of Cathedral Place, then pulling out across the car's lane | both | **built** |
| 7 | Ingrave Road / Queen's Road mini-roundabout, right on to Queen's Road | Van waiting opposite (no left arm); right clear | go | **built** |
| 8 | Kings Road crossroads at St James's Road (right) and King Edward Road (left), ahead | Car waiting at the St James's Road give way line | go | **built** |

Every junction challenge starts with an approach decision (mirrors, signal): the app never does them for the learner.
The Kings Road / Chatham Way and William Hunter Way mini-roundabouts (the first plan's 2 and 6) are driven by the app:
the owner asked for crossroads and other junctions instead of more mini-roundabouts.

Then auto-driven: Queen's Road (Crown Street mini, zebra), Queen's Road roundabout to Kings Road south, Warley Hill.

## Route 2: West by Kavanaghs Road, London Road and Brook Street (about 5.7 km; reported test 1)

| # | Where and movement | Traffic that makes the decision | Answer | Status |
|---|---|---|---|---|
| 1 | Warley Hill, left into Crescent Road | Pedestrian crossing the mouth of Crescent Road | wait | ready |
| 2 | Crescent Road, meeting traffic past parked cars (narrow residential road) | Oncoming car; gap on your side | wait | check: parking side (authored) |
| 3 | End of Kavanaghs Road, left on to London Road | Car from the right 3 s away (sample S1), then a long gap | both | ready |
| 4 | London Road, pull up on the left (reported) | Choice: bus stop, driveway, opposite a junction, clear kerb | choose | check: restrictions not mapped |
| 5 | Moving off from that stop | Cyclist coming up behind | wait | ready |
| 6 | Brook Street at the Mascalls Lane lights, ahead | Amber as you approach, car close behind | stop | check: phases |
| 7 | Brook Street at the Wigley Bush Lane lights, right | Oncoming car on green, then a gap | both | check: filter arrow |
| 8 | London Road, right into Kavanaghs Road (reported test 2) | Oncoming car turning left into Kavanaghs Road | wait | ready |

Then auto-driven: Kavanaghs Road, Crescent Road, right on to Warley Hill. (The router's return from Wigley Bush Lane
by Spital Lane and South Weald is long; a shorter return by London Road is preferred if the turn back is confirmed.)

## Route 3: East by Queen's Road and Ingrave Road (about 4.3 km)

| # | Where and movement | Traffic that makes the decision | Answer | Status |
|---|---|---|---|---|
| 1 | Queen's Road roundabout from Kings Road south, second exit (Queen's Road) | Car on the ring passing your entry; car alongside | both | check: entry lanes and arrows |
| 2 | Crown Street / Queen's Road mini-roundabout, ahead | Car waiting in Crown Street (left); right clear | go | ready |
| 3 | Queen's Road uncontrolled crossing point by Eastfield Road | Pedestrian waiting (no priority, but about to cross) | wait | ready |
| 4 | Queen's Road signal crossing | Green for you; nobody waiting | go | check: phases |
| 5 | Ingrave Road / Queen's Road mini-roundabout, right towards Ingrave Road south-east | Car arriving from the right (Ingrave Road) | wait | ready |
| 6 | Ingrave Road, emerging traffic from the left | Car edging out of a side road | wait | ready |
| 7 | Ingrave Road mini-roundabout from the south-east, left on to Queen's Road | Car on the right signalling left (it may still go ahead) | wait | blocked: road users that signal |
| 8 | Queen's Road, left into Rose Valley | Pedestrian crossing Rose Valley | wait | ready |

Then auto-driven: Rose Valley, King Edward Road, right on to Kings Road, Warley Hill.

## Route 4: South by Warley Hill, Albert Street and The Drive (about 3.5 km)

| # | Where and movement | Traffic that makes the decision | Answer | Status |
|---|---|---|---|---|
| 1 | Moving off from the test centre on to Warley Hill | Car approaching from behind, pedestrian on the footway | wait | check: centre exit layout |
| 2 | Albert Street roundabout, ahead (south) | Car on the roundabout from the right | both | ready |
| 3 | Warley Hill / The Drive mini-roundabout, ahead | Car waiting in The Drive (left); right clear | go | ready |
| 4 | Warley Hill, left into Eagle Way | Cyclist on your left | wait | ready |
| 5 | Eagle Way, uncontrolled crossing point | Children waiting at the kerb | wait | ready |
| 6 | Eagle Way, right on to The Drive | View right restricted by a parked van | creep, then decide | check: parking (authored) |
| 7 | The Drive mini-roundabout, right on to Warley Hill | Car from the right going ahead | both | ready |
| 8 | Warley Hill northbound, right into Woodman Road | Oncoming car turning left into Woodman Road | wait | ready |

Then auto-driven: Albert Street roundabout, Warley Hill to the centre; pull up on the left.

## Route 5: North-west by Weald Road, Park Road and Ongar Road (about 4.5 km)

| # | Where and movement | Traffic that makes the decision | Answer | Status |
|---|---|---|---|---|
| 1 | Kings Road / Chatham Way mini-roundabout, ahead | Car arriving from Chatham Way on the right (same place as route 1, opposite answer) | wait | ready |
| 2 | Weald Road / Western Road mini-roundabout, ahead on Weald Road | Car waiting in Western Road; right clear | go | ready |
| 3 | Weald Road / Park Road mini-roundabout, right into Park Road | Car approaching from ahead going straight on | wait | ready |
| 4 | Park Road, left into Mayfield Gardens | Pedestrian with a dog crossing | wait | ready |
| 5 | Geary Drive mini-roundabout, right on to Ongar Road | Car from the right far away; gap is safe | go | ready |
| 6 | Ongar Road / North Road mini-roundabout, ahead | Car from North Road on the right | wait | ready |
| 7 | Ongar Road uncontrolled crossing point | Pedestrian half-way across | wait | ready |
| 8 | Wilson's Corner, left on to Ingrave Road | Pedestrians crossing at the signals on Ingrave Road | wait | check: phases |

Then auto-driven: Ingrave Road, Queen's Road mini, Queen's Road, the roundabout, Kings Road, Warley Hill.

## Balance

| Route | Mini-roundabouts | Roundabouts | Crossroads/T turns | Crossings | Lights | Stopping/meeting | Waits / goes |
|---|---|---|---|---|---|---|---|
| 1 | 4 | 1 | 0 | 1 | 1 | 0 | 5 / 3 (two both) |
| 2 | 0 | 0 | 3 | 0 | 2 | 3 | 6 / 1 (two both) |
| 3 | 2 | 1 | 2 | 2 | 1 | 0 | 6 / 2 |
| 4 | 2 | 1 | 3 | 1 | 0 | 1 | 6 / 1 (two both) |
| 5 | 4 | 0 | 1 | 1 | 1 | 0 | 6 / 2 |

The same junction appears twice only where the approach or the answer differs (Chatham Way: go on route 1, wait on route
5; the Queen's Road roundabout: first exit on route 1, second exit on route 3).

## To confirm

- Test centre entrance and exit (route 4 challenge 1; every route's start and finish).
- Signal phases where a challenge depends on them (routes 1, 2, 3, 5).
- Queen's Road roundabout entry lanes and arrows (route 3 challenge 1).
- Wilson's Corner lane markings.
- Route 2's turn back towards Brentwood after Wigley Bush Lane.
