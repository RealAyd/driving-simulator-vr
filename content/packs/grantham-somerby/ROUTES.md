# Grantham (Somerby) decision route

One "Decisions only" practice route (one route per centre, the owner's decision) from the Grantham (Somerby) test
centre at Spitalgate Airfield, Blue Harbour, Grantham NG31 7TX. Built from OpenStreetMap data and the published
evidence in `content/sources/pass2/grantham-somerby-evidence.json`, November 2026. A practice route, not a confirmed
test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish (to be confirmed).** The owner confirmed (16 November 2026) that the centre is on Spitalgate Airfield,
off the B1174 near the A52 Somerby Hill / Cold Harbour area. On the map the airfield is the former Prince William of
Gloucester Barracks, north of Somerby Hill. "Blue Harbour" is not on the map (probably a new road on the airfield
development), and no B1174 runs by the site: the B1174 is South Parade and London Road, 1.5 km west. Every mapped way
into the site joins Somerby Hill. The route uses the main one, a one-way pair through the old main gate (ways 183635670
in, 183635688 out) off Somerby Hill, and starts and ends on the site road behind it (way
183635698). *To confirm: the centre's own entrance on the airfield development, and how tests leave and return.*

## Route 1: Somerby Hill, Harrowby Road and Harrowby Lane (scene `grantham-somerby-route-1`, 11.3 km)

Out of the airfield on to Somerby Hill (right), down the hill (pulling up and moving off), Bridge End Road, Harrowby
Road, right at the Sandon Road lights into Beacon Lane, New Beacon Road, right at the Harrowby Lane mini-roundabout
into Uplands Drive, Tennyson Avenue and Shelley Avenue, left on to Harrowby Lane, back over the mini-roundabout down New
Beacon Road and Beacon Lane, left at the lights down Harrowby Road over its zebra, back up Somerby Hill, all the way
round the Somerby Hill roundabout, and back into the airfield.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, emerging right on to Somerby Hill (A52, 50 mph) | A red car coming up Somerby Hill from the right, in the near lane | Mirrors, signal right; look right, give way; look right, left and right, go |
| 2 | Pull up on Somerby Hill, past Somerby Grove (the hill the evidence names for hill starts) | | Choose past Somerby Grove, mirrors, signal; handbrake, neutral, cancel signal |
| 3 | Move off (on the hill) | A cyclist coming down Somerby Hill behind, turning into Bridge End Grove | Mirror and blind spot, wait; again, go |
| 4 | The Sandon Road lights, right into Beacon Lane | Green; a silver car coming down Sandon Road through the lights | Mirrors, signal right, position; wait in the junction; look into Beacon Lane, go |
| 5 | Harrowby Lane mini-roundabout, from New Beacon Road, right into Uplands Drive | A white car coming along Harrowby Lane from the right, over the mini-roundabout | Mirrors, signal right; look right, give way; look right again, go |
| 6 | Shelley Avenue, left on to Harrowby Lane | A black car coming along Harrowby Lane from the right | Mirrors, signal left; look right, give way; look right and left (the zebra just along), go |
| 7 | Harrowby Road zebra crossing, by Stuart Street | A pedestrian stepping on from the left | Interior mirror, slow down; stop and give way; look both ways, go |
| 8 | Somerby Hill roundabout, all the way round (fifth exit) | A blue car coming round from the Grantham Southern Relief Road | Mirrors, signal right, right-hand lane; look right, give way; look right again, go |

**The mix**: all of it. Lights with a right turn across oncoming traffic (4), the large roundabout (8), the
mini-roundabout (5), emerging right (1) and left (6), a zebra (7), and the pull-up and move-off pair (2, 3). The only
large roundabout in reach is the Somerby Hill roundabout at the end of the A52, east of the centre, with no way on from
it back to the town but Somerby Hill: so the route goes all the way round it, as tests from here are likely to.

**Overlap** (rule 3): 83% of the length on confirmed or likely roads (Somerby Hill 5.3 km, New Beacon Road 1.75,
Harrowby Road 1.56, Harrowby Lane and Bridge End Road). Not named anywhere: Beacon Lane (0.5 km, the link from Harrowby
Road to New Beacon Road), Uplands Drive, Tennyson Avenue and Shelley Avenue (0.75 km, the turn round from the
mini-roundabout), and the airfield's own roads.

**Known junctions: 1 of 8 by the checker, NOT MET (the area cannot meet it).** The checker counts the move-off, at the
evidence's "hill starts and stops on gradients near the centre" (the pull-up is 64 m from that point, just outside the
checker's 60 m). By what the evidence names, four challenges are at its places: the pull-up and move-off on the hill
(2, 3), the Sandon Road lights, the only lights on Harrowby Road, which the route list calls the "Harrowby Road lights"
(4), and the New Beacon Road mini-roundabout, the only roundabout on Harrowby Lane, which it calls the "Harrowby Lane
roundabout" (5). The evidence records both of those last two at a point on the road, not at the junction (365 m and
510 m away), so the checker does not count them. The other known places are 3.5 to 5.5 km west, through the town
centre (the Wharf Road and Barrowby Road roundabouts, the Belton Lane / Manthorpe Road and Watergate / Brook Street
lights): too far for a scene that holds the centre, and for a route of this length. The A1 (confirmed) is 4 km west
and not used.

## Found on the map

- **The Sandon Road lights**: the scene puts each approach's stop line 10 m back from the junction node, past the
  signal crossings on Harrowby Road and Beacon Lane, so a car stopped at red stands with its tail on a crossing. Not
  patched: the lights are mapped right. Listed for the engine.
- **The Somerby Hill crossing** (an uncontrolled crossing on the map) is built as a zebra. **Harrowby Road's zebra** is
  190 m from the Bridge End Road junction and **Harrowby Lane's** 40 m from Shelley Avenue: each is driven over without
  a challenge on one pass.
- The ground is flat in the simulator: the hill start on Somerby Hill is a pull-up and move-off on the hill's road, with
  the hill only in the words.
- No map fixes were needed (`osm-patches.json` is not used).

## Open items

- The centre's entrance on the airfield (above).
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- The evidence's junction places carry road positions: worth placing at the junctions they name.
- Played in the app and every paused picture screenshotted and checked; voice clips for the new directions; the home
  screen; then staging and the owner's drive.
