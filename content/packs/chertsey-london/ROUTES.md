# Chertsey (London) decision route

One "Decisions only" practice route from the Chertsey (London) test centre, Unit 4, The Forum, Hanworth Lane, Chertsey
KT16 9JX (DVSA's centre data as quoted on passrates.uk, captured May 2026; listed as current on gov.uk's "Check which
driving test centres you can move your test to", updated 15 October 2026; the gov.uk centre finder not reachable from
the build machine, *to recheck*). One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md` section
5). Built from OpenStreetMap data and the published evidence in `content/sources/pass2/chertsey-london-evidence.json`,
November 2026. A practice route, not a confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The
format: `../ROUTE_FORMAT.md`.

**Start and finish.** The centre is in the Hanworth Lane business park (The Forum), between The Knoll and Hanworth
Lane. The map does not name its units, so which building is Unit 4 is not known; the park's car parks are reached by a
61 m way in (way 162180659, unnamed on the map) off Hanworth Lane's service road, which meets The Knoll 50 m west.
The route starts on that way in, facing out, turns right on to Hanworth Lane and up The Knoll, and comes back the same
way, ending on the way in where it started. *To confirm: where tests start and finish within the park.*

**Evidence.** One author only. drivingtesttips.biz's 14 free route lists and its extended routes (copied word for word
by intensivelessons.co.uk) name some 110 roads and the junctions on them, all likely; every list leaves and returns by
The Knoll and the A320 roundabout beside the park, so they fit the current address. No instructor page, video or
learner account was found. Nothing is confirmed.

## Pyrcroft Road and Free Prae Road (scene `chertsey-london-route-1`, 3.7 km)

Out of the test centre right on to Hanworth Lane, up The Knoll, round The Knoll roundabout on to Bell Bridge Road (A320)
and through its crossing lights, right at the Pyrcroft Road roundabout (the third exit) on to Pyrcroft Road (A317),
through the Pyrcroft Road lights and left up Guildford Street, ahead at the Curfew Bell Road mini-roundabout and the
Heriot Road mini-roundabout, along Heriot Road over its signal crossing, right at the London Street mini-roundabout,
along London Street and right into Pound Road, over the Stepgates crossroads, pulling up and moving off on Free Prae
Road, right at the Eastworth Road mini-roundabout, along Eastworth Road, left into Queen Street, right along Station
Road and Guildford Road, left out of the Guildford Road slip on to the A320, round The Knoll
roundabout into The Knoll, and back along Hanworth Lane into the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: the way in's mouth, right on to Hanworth Lane | A white car turning off The Knoll along Hanworth Lane from the right | Mirrors, signal right; look right, give way; look right, left and right, go |
| 2 | Bell Bridge Road at the Pyrcroft Road roundabout, right (third exit) | A black car coming round from Pyrcroft Road east, across the way in, off west | Mirrors, signal right; look right, give way; look right again, go |
| 3 | Guildford Street at the Curfew Bell Road mini-roundabout, ahead | A red car coming down Guildford Street from the right, turning across into Curfew Bell Road | Interior mirror, no signal; look right, give way; look right again, go |
| 4 | Heriot Road, the signal crossing past Beomonds Row | Lights red, a pedestrian crossing from the left | Interior mirror, slow down, wait at the line; on green check both ways, go |
| 5 | London Street, right into Pound Road | A grey car coming the other way along Bridge Road, on into London Street | Mirrors, signal, position; wait; check Pound Road, turn |
| 6 | Pull up on Free Prae Road, past Stepgates | A cyclist behind | Choose the straight clear of the junctions, mirrors, signal; handbrake, neutral, cancel signal |
| 7 | Move off | The cyclist coming past | Mirror and blind spot, wait; again, go |
| 8 | The Guildford Road slip, left on to the A320 | A blue car coming down Bell Bridge Road from the right | Mirrors, signal left; look right, give way; look right and left, go |

**The mix** (rule 4), all on this route: traffic lights and a pedestrian crossing (4, a signal crossing), a roundabout
(2) and a mini-roundabout (3), emerging left (8) and right (1), a right turn across oncoming traffic (5), and the pull-up
and move-off pair (6, 7). The last challenge is 400 m from the end, not at the test centre: the way back in is a left
turn off a quiet service road, with nothing to decide.

## Checker

`node tools/centres/check_route.mjs chertsey-london-1`: passes.

```
chertsey-london-1 (Chertsey: Pyrcroft Road and Free Prae Road): 3.7 km
  On confirmed or likely roads: 88%
  Roads: The Knoll 467 m, Heriot Road 428 m, Station Road 405 m, Free Prae Road 391 m, London Street 337 m, Bell Bridge Road 294 m, Guildford Road 280 m, Guildford Street 219 m
  1. leave-test-centre            emerging-right             0 m  at Test centre way out (Hanworth Lane business park, to The Knoll)
  2. pyrcroft-roundabout          roundabout               660 m (+660)  at Bell Bridge Road / Pyrcroft Road roundabout (A320 / A317)
  3. curfew-mini                  mini-roundabout         1000 m (+340)  at Guildford Street / Curfew Bell Road mini-roundabout
  4. heriot-crossing              lights+crossing         1349 m (+350)
  5. pound-turn                   right-turn              1859 m (+510)  at London Street / Bridge Road / Pound Road / Abbey Road junction
  6. free-prae-pull-up            pull-up                 2163 m (+304)  at Pound Road / Stepgates / Free Prae Road crossroads
  7. free-prae-move-off           move-off                2224 m (+61)
  8. slip-emerge                  lights+emerging-left    3287 m (+1062)  at The Knoll / Guildford Road / Bell Bridge Road roundabout (A320)
  At known junctions: 6 of 8
```

Read with care: the pull-up counts only because its direction is given near the Stepgates crossroads, and the slip
because its end is 55 m from The Knoll roundabout; four challenges are placed at known junctions (1, 2, 3, 5). The
slip counts as "lights" too because it holds Bell Bridge Road's crossing lights green for the blue car. The 88% counts
Station Road by name: the lists' Station Road is Addlestone's, not Chertsey's, so on the evidence's own roads the share
is about 77% (Station Road, Queen Street, Hanworth Lane's service road and the way in are the roads no source names).

## Choices

- **The Knoll and Bell Bridge Road** both ways: every listed route leaves and returns by them and The Knoll roundabout.
- **The Pyrcroft Road roundabout, right**, the big A320 / A317 roundabout the lists use on the way out. The Knoll
  roundabout, 400 m nearer, is driven through (too close to the way out for the spacing); so are Bell Bridge Road's
  crossing lights, which have no crossing on the map (signals only).
- **Guildford Street and Heriot Road**, the lists' way into town, with the three mini-roundabouts they name; the Curfew
  Bell Road one is the challenge, the only one with an arm on the right whose traffic crosses the car's way. The
  Pyrcroft Road lights just before it are driven through. Heriot Road's signal crossing is the crossing.
- **London Street into Pound Road**: the right turn, across Bridge Road's westbound flow where the junction's islands
  split it (the lists turn left into Pound Road from Abbey Road instead; this route comes the other way).
- **Free Prae Road**, long and straight between Stepgates and Fairway, for the pull-up, with no cars parked along it.
- **The way back** by Eastworth Road, Queen Street, Station Road and Guildford Road gives the emerging left turn out of
  the Guildford Road slip on to the A320, then The Knoll roundabout and The Knoll home. No stretch follows a list's
  order beyond what the roads force (out by The Knoll and Bell Bridge Road, back by Guildford Road and The Knoll).
- **Left out.** Addlestone, New Haw, Ottershaw, Lyne, Thorpe and Laleham (2 to 5 km out: too far for a 3 to 4 km
  route with the spacing), Chertsey Bridge and Weir Road lights (just outside the scene), the St Peter's Way roundabouts
  (dual carriageway, A317 to the M25).

## Found on the map

- **The way in is unnamed and short** (61 m): the planner will not turn into a short unnamed road, so the route could
  not come back in. Named "Driving Test Centre" in `osm-patches.json` (our copy only), as the owner's rule of
  21 November 2026 asks.
- **Hanworth Lane's residential part does not reach the park**: it runs north from a dead end beside the park to
  Guildford Road, so the way out and back is by Hanworth Lane's service road and The Knoll.
- **Bell Bridge Road's crossing lights** (the signals at Guildford Road) come out as a set of signals with no crossing
  drawn: the crossing node sits at the end of a way.
- **A signal post on the kerb at the Pyrcroft Road lights** came 0.5 m from the car's side on the planned line: kept
  0.4 m right there.
- **Queen Street's end on Station Road and the Station Road / Guildford Road corner** are tight: kept clear of traffic
  as the car goes through (see Drives).
- **The Eastworth Road roundabout's exit into Victory Road** is tight, with a post on the splitter island 0.2 m from the
  car's side on the planned line: kept left, the car put a wheel on the footway; left as planned, it went on to the
  footway in traffic as it ran inside the bend. The route goes back by Queen Street instead (cars parked along it, eased
  round), and the roundabout is not used.

## Drives

`ROUTES=chertsey-london-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: all 6 pass (the authoring rules, the
way clear of parked cars, the right answers, traffic patterns 4 and 14, and Skip ahead), on the traffic engine of this
worktree. Without traffic the car stops within 0.3 m of every pause point and the cyclist passes 2.5 m from it centre to
centre.

Background traffic is kept off (`quietUntil`): Heriot Road on to the London Street mini-roundabout and Bridge Road with
the mouth of Willow Walk, from the Heriot Road crossing until the car waits at the Pound Road turn (a car out of the
mini-roundabout met the car face to face where Heriot Road's one-way pair joins; a car out of Willow Walk followed the
grey car to the junction); and the end of Queen Street and the Station Road and Guildford Road corner, from the move-off
until the car is round that corner (a car on Station Road and the car each waited for the other for a minute; one came
round the tight corner into it).

## Open items

- The address on the gov.uk centre finder, which unit is the centre, and where tests start and finish in the park.
- A first-hand source (instructor video, learner account) to confirm any road or junction.
- Played in the app and every paused picture checked; then staging and the owner's drive.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
