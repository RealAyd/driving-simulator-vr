# Enfield (Innova Business Park) decision route

One "Decisions only" practice route from the Enfield (Innova Business Park) test centre on Solar Way, Innova Park, EN3
7XY (the driving school and centre listings; gov.uk's list of centres, updated 15 October 2026, has it open; the centre
finder itself was not reachable from the build machine, *to recheck*). Not Enfield (Brancroft Way), the small centre
about 3 miles south. One route per centre, carrying the whole mix (`../ROUTE_TEMPLATE_RULES.md` section 5). Built from
OpenStreetMap data and the published evidence in `content/sources/pass2/enfield-innova-evidence.json`, November 2026. A
practice route, not a confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format:
`../ROUTE_FORMAT.md`.

**Start and finish.** The map has the Driving Test Centre building (DVSA) on the east side of Solar Way at its north
end, reached by a service road east off Solar Way (way 37760028, access for destination only). The route starts on that
service road, 110 m in from Solar Way, facing out; it leaves left, and comes back down Solar Way from the Mollison
Avenue roundabout, left into the service road. *To confirm: where tests start and finish within the site.*

**Evidence.** One route-list author (drivingtesttips.biz; intensivelessons.co.uk copies it word for word): every one of
its eight routes leaves and returns by Mollison Avenue, so it fits this site. Hertford Road and its double
mini-roundabout are confirmed by a driving school's instructor tips (driveJohnson's); everything else is *likely*.

## Ordnance Road and Hertford Road (scene `enfield-innova-route-1`, 5.2 km)

Out of the test centre, left on to Solar Way, the first exit at the Innova Way roundabout, Innova Way, right on to
Mollison Avenue, right at the Ordnance Road lights, Ordnance Road over the zebra crossing by Tysoe Avenue, right at the
Hertford Road lights, right into Totteridge Road (pulling up and moving off), left into Mandeville Road, right out of
it on to Hertford Road, right at the Bullsmoor Lane lights on to Mollison Avenue, the second exit at the Mollison Avenue
roundabout, down Solar Way and left into the test centre.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, left on to Solar Way | A silver car coming down Solar Way from the right, from the Mollison Avenue roundabout | Mirrors, signal left; look right, give way; look right and left, go |
| 2 | Innova Way roundabout (small), first exit into Innova Way | A white car coming round from Innova Way, on the right | Mirrors, signal left; look right, give way; look right again, go |
| 3 | Mollison Avenue at the Ordnance Road lights, turn right | Green; a blue car coming up Mollison Avenue the other way, going ahead | Mirrors, signal right, position; wait in the junction; look into Ordnance Road, go |
| 4 | Zebra crossing on Ordnance Road, by Tysoe Avenue | A pedestrian stepping on from the left | Interior mirror, slow down, give way; look both ways along it, go |
| 5 | Pull up on Totteridge Road, on the straight | A cyclist behind | Choose the straight clear of the junctions and the cars parked opposite, mirrors, signal; handbrake, neutral, cancel signal |
| 6 | Move off | The cyclist coming past | Mirror and blind spot, wait; again, go |
| 7 | Mandeville Road, right on to Hertford Road | A red car coming down Hertford Road from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 8 | Mollison Avenue roundabout, second exit (right) into Solar Way | A black car coming round from Solar Way, on the right | Mirrors, signal right, right-hand lane; look right, give way; look right again, go |

**The mix** (rule 4): traffic lights (3), a large roundabout (8), emerging left (1) and right (7), a right turn across
oncoming traffic (3), a pedestrian crossing (4, a zebra), and the pull-up and move-off pair (5, 6). **No
mini-roundabout:** the nearest are the Hertford Road pair the evidence names (by Carterhatch Lane, about 2.5 km
south-west) and a residential one at the end of Tysoe Avenue (a cul-de-sac), out of reach of a 5 km route from here;
the small Innova Way roundabout (2) stands in for it, the nearest kind, and the checker counts it as a roundabout.

**Known junctions** (3 of 8): the Ordnance Road / Mollison Avenue lights (3), the end of Mandeville Road on to Hertford
Road (7) and the Mollison Avenue / Solar Way roundabout (8). The Hertford Road / Ordnance Road lights and the Hertford
Road / Bullsmoor Lane / Mollison Avenue lights are driven through between challenges.

**Overlap** (rule 3): 4.16 km of 5.2 km (80%) on likely or confirmed roads (Mollison Avenue 1.53 km, Ordnance Road
1.38, Hertford Road 0.49, Mandeville Road 0.48, Totteridge Road 0.28). Not named: Solar Way and the service road (the
way out and back, 0.67 km) and Innova Way (0.19 km).

## Checker

`node tools/centres/check_route.mjs enfield-innova-1`: passes (5.2 km, 80% on confirmed or likely roads, 3 of 8 at
known junctions, spacing met; the mix lacks only the mini-roundabout, above).

## Choices

- **Why this route.** It keeps to the roads every listed route uses from this site (Mollison Avenue, Hertford Road,
  Ordnance Road, Mandeville and Totteridge Roads) and takes the three known junctions that suit a scenario. The order
  is ours: the listed routes go straight out on to Mollison Avenue; this one leaves south through the business park, so
  the small roundabout and the Ordnance Road right turn come first. The last stretch (Mandeville
  Road, right on to Hertford Road, right at the lights on to Mollison Avenue) is also in one listed route, but it is the
  only way back from Mandeville Road, not copied from it.
- **Left out.** Bullsmoor Lane, the A10 and Waltham Cross (further than a 5 km route reaches, and the A10 and M25
  junction are dual carriageway trunk road); the Chingford and Waltham Abbey roads of the longer listed routes.

## Found on the map

- **The test centre's way in stops 17 m short of Solar Way** (at the cycle path beside it): its first node is moved to
  the edge of Solar Way in `osm-patches.json`, so the drive can leave and come back.
- **The Ordnance Road / Mollison Avenue lights** are a dual carriageway junction mapped in many short pieces; the right
  turn crosses the northbound carriageway's short piece and waits in the junction.
- **Mandeville Road does not reach Ordnance Road** (it ends 65 m short), and Park Road does not join Ferndale Road, so
  the way from Ordnance Road to Mandeville Road is by the Hertford Road lights and Totteridge Road.

## Drives

The main session's first full run failed on the car going on to the footway at the Hertford Road and Bullsmoor Lane
lights and, in pattern 4, a car coming north on Mollison Avenue meeting the car as it turned right out of Innova Way.
After the fixes (`HOW_WE_BUILT_IT.md` section 5), one drive without traffic: the right answers to a pass, every pause
as depicted (16 pauses, each road user within 0.1 m of its point), nothing hit, no red light run, closest scripted road
user the cyclist passing the car pulled up (3.2 m). Its only fault was the car briefly on the footway turning back
into the test centre's way in, since widened and not yet driven again. The drives with traffic and Skip ahead are
rerun by the main session: `ROUTES=enfield-innova-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`.

## Open items

- The address on gov.uk's centre finder, and where tests start and finish within the site.
- A second, first-hand source (instructor video, learner account) to confirm the roads beyond Hertford Road; and the
  route list's date.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked; then staging and the owner's drive.
