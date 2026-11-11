# How the Chelmsford routes were built

The second centre, built by the steps Brentwood set (`../brentwood/HOW_WE_BUILT_IT.md`), with one change the owner
made on 11 November 2026: **the routes are chosen from the best evidence available, not sent by the owner**. Brentwood
is the guide; each new centre is built, or improved on, from the map and published information.

## 1. Find the centre as it is now

Published route lists for Chelmsford start from the old Hanbury Road centre. Car tests moved to Unit 12, Cromar Way on
5 October 2026, so the old departure and return directions were not reused. In OpenStreetMap, Cromar Way is a dead
end in the Waterhouse Business Centre off Waterhouse Lane, with traffic lights and two signal crossings at the end:
every route leaves and returns that way. Units 12 to 13 are mapped; no gate for them is, so none was invented (the drive
starts and finishes on Cromar Way).

## 2. Choose the challenges from the map

A candidate set of 16 decisions (another agent's review package) was checked against the map before anything was
built. What the map changed:

- **Moulsham Street north of St John's Road is one-way southbound.** The candidate drove up it to Hamlet Road; the
  route instead turns right into St John's Road at the crossroads and comes back down Moulsham Street from Hamlet Road
  (which also gives an emerge on to a one-way street, and the zebra crossing at St John's Road).
- **The Cromar Way exit is at traffic lights**, not a give way: both first challenges are light-controlled turns.
- **Rainsford Road westbound is reached from Rainsford Lane by Primrose Hill**, straight over the Parkway lights.
- A crossing the candidate could not place on Rainsford Road was replaced by the zebra on Melbourne Avenue; the
  Chignal Road and Kings Road zebras, the Hamlet Road STOP line and the North Avenue roundabouts were found on the way.

Each route was chosen for variety in the eight: lights (red, a late pedestrian, oncoming traffic on green), a large and
a small roundabout, emerging left and right (once on to a one-way street), a right turn across oncoming traffic, a
zebra, and the pull-up and move-off pair.

## 3. Build the scenes

One scene per route (`chelmsford-route-1`, `chelmsford-route-2`, about 2.4 km square each, as Brentwood's): the map
download for each area was too large for one OpenStreetMap API call, so it was fetched in four tiles and merged.

## 4. Plan the line, probe it, script the road users

As Brentwood: the car's way planned through points on the scene's roads (a point placed past a junction makes the plan
fail: it would need a U-turn), a probe listing stop lines, crossings and roundabouts by metres along it, and each road
user's path generated on the scene's roads (the cyclist and the car passing a pulled-up car given room to pass it).

## 5. Drive it headless

Both routes passed on their first full drive. Tuning that followed, for any route:

| Found | Fix |
|---|---|
| The car stopped at a red light a metre short of the stop point, then crept on when it turned green, so the pedestrian meant to be mid-crossing was nearly across | Put the stop point where the car stops at the red light |
| A road user paced to its point arrives as the car reaches the line, not after it has stopped | Set its point a little earlier than the picture wants |
| The oncoming car arrived after the car had already stopped to wait | Start it earlier |
| A cyclist passed the pulled-up car too close | Generate its path with more room round the car |
| On St John's Road that room took it next to a car parked on the far kerb: the street was too narrow to pass | Pull up where neither kerb has parked cars (Hamlet Road): list the parked cars along a stretch before choosing it |
| Driving back, the car stood nearly two minutes at the Writtle Road lights, waiting to turn right across a stream of background cars (a different one each moment, so no single one was ever "holding" it) | For every route: once the car has stood held by traffic for 10 s, the spot round it is kept clear and the next ones wait |

## Still to do

Played in the app and every paused picture screenshotted and checked, then staging and the owner's drive. Open items
are in `ROUTES.md`.
