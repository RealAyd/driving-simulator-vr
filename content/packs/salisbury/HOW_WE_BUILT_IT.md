# How the Salisbury routes were built

The first pilot centre (`../PILOT_BUILD_BRIEF.md`), built the way Chelmsford was (`../chelmsford/HOW_WE_BUILT_IT.md`):
routes chosen from the map and the public information, judgement first (`../EVIDENCE_PLAN.md` section 7).

## 1. Find the centre as it is now

The evidence file gives Rougemont Close, SP1 1LY (the centre moved there in 2014; the Southampton Road and Churchfields
Road addresses in older pages were not used). In OpenStreetMap the DVSA building is on the north side of Rougemont
Close at its Manor Road end, with a private driveway from its car park on to Manor Road. The driveway was not built (a
private way, and nothing says tests use it): both routes start and finish on Rougemont Close, which tests are reported
to use.

## 2. Read the evidence, then choose

Two independent sources: one instructor's page and one route list (copied on two sites, counted once). 11 roads and
junctions confirmed, 21 likely. Their roads point two ways out of the centre: north by Wain-a-long Road and St Mark's
Roundabout (London Road, Denison Rise), and west into the city (Churchill Way, Castle Street, Castle Roundabout, Salt Lane,
Scots Lane). The routes were chosen for the decisions they teach, with the evidence deciding which area each covers:

- **Route 1** goes north: the confirmed St Mark's Roundabout and London Road, the likely Denison Rise mini-roundabout.
- **Route 2** goes into the city and up Castle Street (likely, with its mini-roundabout) to the confirmed Castle
  Roundabout, home by Churchill Way North.

What the map changed:

- **The Wain-a-long Road entry to St Mark's Roundabout is too tight for the car.** The slip turns 100 degrees in a few
  metres with an island nose in it; the car touched the nose or ran over the island on every line tried. From Bourne
  Avenue the same entry is a gentle bend, so route 1 leaves by Manor Road, Fairview Road (one-way south), Kelsey Road
  and Bourne Avenue. That also made the two routes leave in different directions.
- **The city centre is one-way.** From the Milford Street lights, Castle Street is reached by New Canal, High Street,
  Silver Street and Minster Street. Salt Lane and Scots Lane (named by the route list, one-way towards Castle Street)
  were not used: reaching them from the Milford Street lights is a longer loop for the same Castle Street junctions.
- **Castle Roundabout's and St Mark's Roundabout's entries from the main roads are signal-controlled**: Castle Roundabout
  became route 2's "roundabout with lights"; route 1's roundabout challenge is the Bourne Avenue give way entry.
- **The Castle Street zebra is 30 m before the Mill Stream Approach mini-roundabout**, too close for two challenges:
  the mini-roundabout (named by the route list) is the challenge, and route 2's crossing is at the Chipper Lane lights.
- **"London Road (A30) roundabout"** in the evidence points at a stretch of London Road with no roundabout; the Barrington
  Road lights at its end are route 1's lights challenge.
- **No emerging left turn fits route 2**: its way out of Rougemont Close is to the right, and its other turns out of
  side roads are at lights. A second right turn across oncoming traffic takes its place; route 1 has the emerging left
  turn.

## 3. Build the scenes

One OpenStreetMap download round the centre (`centreBbox(51.07219, -1.78728, 1800)`, too big for one API call:
fetched in nine tiles and merged), then two scenes from it:

    node tools/scenes/build_scene.mjs salisbury-route-1 "Salisbury" 51.07758 -1.78371 1200 <merged.osm> 51.071858,-1.787709 51.072028,-1.786994
    node tools/scenes/build_scene.mjs salisbury-route-2 "Salisbury" 51.070573 -1.790138 1200 <merged.osm> 51.071858,-1.787709 51.072028,-1.786994

Then one fix to each scene file: **a repeated point dropped** from road `residential-760027220-1` (an unnamed road at the
mini-roundabout off Belle Vue Road, where the generator splits OSM way 760027220 at the mini-roundabout node and repeats
the node). The route
planner reads that road's first segment as zero length and stops with an error ("Road ... has no non-zero segments")
whenever its search reaches that part of the city. Rebuilding the scenes needs the same fix (consecutive identical
points removed from every road's centreline) until the generator is fixed.

## 4. Plan the line, probe it, script the road users

As Chelmsford: the car's way planned through points on the scene's roads, a probe listing roads, stop lines, crossings
and roundabouts by metres along it, each road user's path generated on the scene's roads (the car or cyclist passing a
pulled-up or waiting car given room round it). Parked cars along each stretch were listed before choosing a pull-up:
Denison Rise and Kelsey Road both have cars along the far kerb, and each pull-up is opposite a gap.

## 5. Drive it headless

`tests/unit/decisionDrive.salisbury.test.ts` drives both routes with the right answers, without traffic, with 30
background road users in two patterns (4 and 14), and with Skip ahead pressed whenever offered. Tuning that followed:

| Found | Fix |
|---|---|
| The car stopped at a red light two metres short of the pause point, so the light stayed red for good | Put the pause where the car stops at red: about 5.5 m short of the stop line's lane point |
| Tight corners in the map (Fairview Road into Kelsey Road, out of St Mark's Roundabout into St Mark's Avenue, out of Barrington Road, Manor Road into Rougemont Close, round St Thomas's Square and into Minster Street, a lamp column in a 2.5 m one-way piece of Kelsey Road): the car's middle crossed a kerb corner, or a corner of it touched a bollard, lamp or island nose | A small `shift` of the car's line at each, found by driving the challenge on its own with several values |
| Route 1 first came back down Manor Road and turned right into Rougemont Close. Manor Road has cars parked along both kerbs, so the line in and the line out ran within a metre of each other: an oncoming cyclist passed the waiting car too close, and practising that challenge on its own started on the line out (the steering follows the part of a route driven first where two run that close) and drove off the road | Route 1 comes back by Kelsey Road instead, and its last challenge is the right turn from Kelsey Road into Manor Road |
| Face to face with background traffic on Bourne Avenue and St Mark's Avenue (cars parked along one kerb, no room to pass), the two cars stood touching until one was taken off; on Denison Rise a background car met the grey car driving on after the move-off | Kept quiet while the car (and the grey car) drive them (`quietUntil` on challenges 1, 2 and 5, as Chelmsford's St John's Road) |
| Background traffic touched route 2's grey car as it turned from Manor Road into Kelsey Road behind the car | That junction kept quiet during the pull-up and move-off |
| Route 2's car stood over a minute at St Mark's Roundabout's lights in traffic on the way back | Those lights held green while the last challenge is in hand |
| The car behind for the Denison Rise move-off caught up while the car was still slowing to pull in, and stood behind it | Set it going later, so it comes up behind once the car has stopped |
| The green car for route 2's last challenge got to its point while the car was held at St Mark's Roundabout's red lights, and drove on, so the moment was gone | Set it going after the roundabout, from closer in |
| Three of the new directions had no recorded clip | Worded as directions already recorded ("At the roundabout, take the third exit, that's to the right.", "Take the next road on the right.") |

## Still to do

Played in the app and every paused picture screenshotted and checked, then staging and the owner's drive. Open items
are in `ROUTES.md`.
