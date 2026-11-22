# Bletchley decision route

One "Decisions only" practice route from the Bletchley test centre, Block 4, Government Buildings, Wilton Hostel, Wilton
Avenue, Bletchley, Milton Keynes MK3 6DH (DVSA's centre data as quoted on passrates.uk, captured May 2026, and
drivingtesttips.biz's centre page; gov.uk could not be opened from this machine: *to recheck on the gov.uk centre
finder*). A driving school's news post of 13 August 2026 describes new test programmes there into 2027, so the centre is
open and not moving. One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md` section 5). Built from
OpenStreetMap data and the published evidence in `content/sources/pass2/bletchley-evidence.json`, November 2026. A
practice route, not a confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format:
`../ROUTE_FORMAT.md`.

**Start and finish.** The centre's building is in OpenStreetMap ("Driving test centre", way 226765740) on the east side
of Wilton Avenue, just north of Church Green Road. Its car park is reached by a narrow service road (way 226765734) that
leaves Wilton Avenue 38 m north of Church Green Road and runs round the building's north and east sides to the car park
south of it. The route starts in the car park, at the end of the service road, drives out round the building and turns
left on to Wilton Avenue. It comes back up Wilton Avenue past the way in and finishes about 30 m beyond it: the route
planner always runs a route on 80 m past its last junction, and 80 m into the service road would pass the start point
again (a point passed twice is matched to the wrong end of the drive). *To confirm: where tests start and finish.*

**Evidence.** Wilton Avenue and the centre's way out are *confirmed* (every route list starts and ends on them, and a
driving school's own advice to its instructors names Wilton Avenue, the narrow way in and the mirror on its corner).
Everything else is *likely*: one route-list publisher (drivingtesttips.biz, 15 routes and two extended ones, with a
motorcycle list in the same format; intensivelessons.co.uk copies 13 of them word for word). Every list leaves left on
to Wilton Avenue and returns right into the centre, so they fit the current address.

## Whalley Drive and Sherwood Drive (scene `bletchley-route-1`, 4.4 km)

Out of the test centre left on to Wilton Avenue, right on to Church Green Road, ahead at the Rickley Lane
mini-roundabout, right into Whalley Drive, pulling up and moving off on Whalley Drive, right off Whalley Drive into
Sherwood Drive, south down Sherwood Drive over the signal crossing by Jemima Way and the one by Selwyn Grove, right at
the Sherwood Drive roundabout on to Buckingham Road, left into Cottingham Grove and round it, right out of it on to
Buckingham Road, left into Church Green Road and right into Wilton Avenue, past the test centre's way in.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, left on to Wilton Avenue | A silver car coming down Wilton Avenue from the right | Look right, signal left, give way; look right and left, go |
| 2 | Church Green Road at the Rickley Lane mini-roundabout, ahead into Rickley Lane | A red car coming down Rickley Lane, from the right, going round to Church Green Road west | Interior mirror, no signal; look right, give way; look right again, go |
| 3 | Pull up on Whalley Drive | A cyclist behind | Choose the straight clear of the side road, mirrors, signal; handbrake, neutral, cancel signal |
| 4 | Move off | The cyclist coming past, on up Whalley Drive | Mirror and blind spot, wait; again, go |
| 5 | Whalley Drive, right into Sherwood Drive | A grey car coming down Whalley Drive towards the car | Mirrors, signal right, position; wait in the road; look into Sherwood Drive, go |
| 6 | Sherwood Drive, the signal crossing by Jemima Way (traffic lights) | Red; a pedestrian crossing from the far side into the car's lane | Interior mirror, slow down, wait at the line; check both ways, go |
| 7 | Sherwood Drive roundabout, right (third exit) on to Buckingham Road | A black car coming round from Buckingham Road west, on its way east | Mirrors, signal right; look right, give way; look right again, go |
| 8 | Cottingham Grove, right on to Buckingham Road | A blue car coming along Buckingham Road from the right | Mirrors, signal right; look right, give way; look right and left, go |

**The mix** (rule 4): traffic lights (6), a roundabout (7), a mini-roundabout (2), emerging left (1) and right (8), a
right turn across oncoming traffic (5), a pedestrian crossing (6) and the pull-up and move-off pair (3, 4). The lights
and the crossing are one challenge, a signal-controlled crossing met on red, as Kettering's and Chesterfield's: there
are no junction lights within reach (the nearest are on Saxon Street and in central Bletchley, 1 km east). The
roundabout is the small one where Sherwood Drive, Buckingham Road and Water Eaton Road meet (a ring about 20 m across;
the route lists call it a mini or double mini-roundabout); the large Brunel and Princes Way roundabouts are 300 m and
600 m further east, off the loop.

**Known junctions** (rule 3): 5 of 8 by the checker, each at a junction the lists name: the centre's way out (1,
confirmed), the Church Green Road / Rickley Lane mini-roundabout (2), Whalley Drive / Sherwood Drive (5), the Sherwood
Drive roundabout (7), and the east end of Cottingham Grove on Buckingham Road (8). Not used: the Brunel and Princes Way
roundabouts and the central Bletchley mini-roundabouts (Princes Way / Queensway, Water Eaton Road / Brooklands Road),
all 1 km or more east, for a second route that way.

**Overlap** (rule 3): 97% of 4.4 km on confirmed or likely roads (Sherwood Drive 1.17 km, Whalley Drive 0.89,
Cottingham Grove 0.87, Buckingham Road 0.64, Church Green Road 0.40, Rickley Lane 0.20, Wilton Avenue 0.12). Not named:
the centre's own service road and the roundabout's ring.

## Checker

`node tools/centres/check_route.mjs bletchley-1`: passes (4.4 km, 97% on confirmed or likely roads, 5 of 8 at known
junctions, spacing met, the whole mix).

## Choices

- **Why this route.** The lists' nearest roads make a loop west and north of the centre: Church Green Road, Rickley
  Lane, Whalley Drive, Sherwood Drive and Buckingham Road. Driven anticlockwise it gives the mini-roundabout close to
  the start, the long quiet straight of Whalley Drive for the pull-up, a right turn across Whalley Drive into Sherwood
  Drive, Sherwood Drive's signal crossing and its roundabout. Cottingham Grove (in one list) adds the emerging right
  turn on to Buckingham Road. Some lists drive parts of this loop (Rickley Lane into Whalley Drive, then Sherwood Drive
  to the roundabout); the route copies none of them, and the order is the one the loop allows.
- **Leaving.** The first challenge is the centre's own way out on to Wilton Avenue, with the mirror on its corner (the
  driving school's page); the turn on to Church Green Road 40 m on is driven through, too close for a challenge of its
  own. The car starts at the far end of the car park so that the mini-roundabout, 350 m on, keeps the spacing rule.
- **The pull-up** is on Whalley Drive, a 30 mph road with no cars parked along it, 45 m past the last side road.
- **Left out.** Central Bletchley (Saxon Street, Princes Way, Queensway, Water Eaton Road), 1 km east: a loop there and
  back would double the length. Water Eaton Road's signal-controlled one-way stretch under the railway, single lane with
  traffic both ways, which the engine does not stage reliably.

## Found on the map

- **The centre's way in** is a service road (way 226765734), added to the scene by its id. It is unnamed; the route only
  starts on it, so no name was needed.
- **The signal crossing on Sherwood Drive by Jemima Way** sits 5 m from the end of its way, and the scene generator
  leaves out a crossing within 8 m of a way's end: the node is moved 4.5 m back along the road (`osm-patches.json`) so
  the crossing is drawn.
- **Sherwood Drive's other signal crossing**, 70 m before the roundabout, is driven over (it may hold the car at red on
  the way to challenge 7).
- **Cottingham Grove** has cars parked along it; the car's way passes them.

## Drives

`ROUTES=bletchley-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: all 6 pass (the authoring rules, the way
clear of parked cars, and the drives without traffic, with traffic patterns 4 and 14, and with Skip ahead, 4 skips).
Without traffic: a pass with no faults, every pause as depicted, nothing hit, nothing off the road, no red light run.
In traffic the closest background car came 1.07 m (pattern 4) and a bus 0.79 m (pattern 14), both passing on Whalley
Drive; the longest stand was 11.3 s, at the pull-up waiting for the cyclist.

The first run failed pattern 4 only: a background car met the car face to face in Cottingham Grove (narrow, cars
parked) and neither could pass. Cottingham Grove is now kept quiet from the Sherwood Drive roundabout until the car is
near its end (`quietUntil` on challenge 7: a challenge's quiet circles apply only from its direction on, so they could
not sit on challenge 8).

## Open items

- The address on gov.uk's centre finder; where tests start and finish in the car park.
- A second first-hand source (instructor video, learner account) for any road beyond Wilton Avenue.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
