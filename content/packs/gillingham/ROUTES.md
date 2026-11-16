# Gillingham decision route

One "Decisions only" practice route (one route per centre from batch 2 on, `../ROUTE_TEMPLATE_RULES.md` section 5) from the Gillingham test centre at Unit 1, Astra Park, Courteney Road, Gillingham
ME8 0EZ (postcode confirmed by the owner, 15 November 2026; gov.uk could not be reached from the build machine). The map
has the centre's building (postcode ME8 0EZ) beside Courteney Road, with its way out, a service road, joining Courteney
Road 190 m south of the small roundabout by Tesco. Built from OpenStreetMap data and the published evidence in
`content/sources/pass2/gillingham-evidence.json`, November 2026. A practice route, not a confirmed test route. How it
was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`.

**Start and finish.** The route starts in the way out, facing Courteney Road, turn right towards the roundabout by
Tesco and the Bowaters roundabout, and come back from Bowaters down Courteney Road. **The drive ends on Courteney Road
just short of the roundabout by Tesco, 200 m from the centre**: the engine cannot yet drive the ring's tight exit
towards the centre (below). *To confirm: which way tests leave, and whether examiners use this way out or the one 15 m
north.*

## Gillingham route 1: Sovereign Boulevard, Ito Way and Featherby Road (scene `gillingham-route-1`, 4.5 km)

Out of the test centre, right on to Courteney Road, ahead at the roundabout by Tesco, second exit at the Bowaters
roundabout (traffic lights) on to Sovereign Boulevard (the A2) westbound, its pedestrian lights by Eastcourt Lane, right
at the Will Adams Roundabout on to Ito Way (the A289, 50 mph), round the Cornwallis Roundabout on to Beechings Way, right
through the central reservation into Featherby Road (pulling up and moving off), left on to Sovereign Boulevard
eastbound, and back by the Bowaters roundabout and Courteney Road to the roundabout by Tesco.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre, right on to Courteney Road | A white van coming down Courteney Road from the right; then a blue car coming up from the left | Look right, signal right, give way; look left, give way; look right and left, go |
| 2 | Bowaters roundabout, second exit on to Sovereign Boulevard (traffic lights) | Red light at the entry | Interior mirror, slow down, no signal, wait at the line; on green, look right round the roundabout, go |
| 3 | Sovereign Boulevard pedestrian lights by Eastcourt Lane | Red; a pedestrian crossing from the left | Interior mirror, slow down, wait; on green, look both ways, go |
| 4 | Will Adams Roundabout, right (third exit) on to Ito Way | A black car coming round from Ito Way, out to Will Adams Way | Mirrors, signal right, right-hand lane; look right, give way; look right again, go |
| 5 | Beechings Way, right through the central reservation into Featherby Road | A silver car coming along the other carriageway | Mirrors, signal right, position; wait in the gap; look left along the carriageway and into Featherby Road, go |
| 6 | Pull up on Featherby Road, past Chilham Road | A white van behind | Choose past Chilham Road, mirrors, signal; handbrake, neutral, cancel signal |
| 7 | Move off | The white van coming past, turning into Elmfield | Mirrors, wait; mirror and blind spot, go |
| 8 | Featherby Road, left on to Sovereign Boulevard (A2, 40 mph) | A red car coming along the dual carriageway from the right, through the Hotel Road pedestrian lights | Mirrors, signal left; look right, give way; look right again, go |

The mix: traffic lights (2, 3), a large roundabout (2 and 4), emerging right (1) and left (8), a right turn across
oncoming traffic (5), a pedestrian crossing (3), and the pull-up and move-off pair. **No mini-roundabout**: the area's
mini-roundabouts (Beechings Way at Eastcourt Lane, Goudhurst Road and Pump Lane, Hoath Lane) are all on the
north-east and south sides, away from this route's roads; taking one in would cost the right turn into Featherby Road or
the A289, and the large roundabouts (2, 4) stand in for it. A second route, if one is built, can take them (a north-east
route through Twydall Lane, Beechings Way and Pump Lane was built and driven, then dropped for the one-route rule:
`HOW_WE_BUILT_IT.md`).

**Overlap** (rule 3, `check_route.mjs`): 3.5 km of 4.5 km (78%) on roads in the evidence file (Sovereign Boulevard 1.2
km, Featherby Road 1.1, Ito Way 1.1, Beechings Way). Not in it: Courteney Road and the Bowaters ring (0.75 km, the way out
and back, which the evidence rightly excludes), and the Will Adams and Cornwallis roundabouts.

## The rule the area cannot meet: challenges at known junctions

`check_route.mjs` reports **0 of 8 at known junctions** (the rule asks for 3). The evidence file places
only three junctions, far apart:

- **Will Adams Way roundabouts by Tesco** (s1, s5, s6): recorded at a point on Will Adams Way between its two small
  roundabouts, 100 m south of the A2's Will Adams Roundabout. Challenge 4 is at the Will Adams Roundabout
  itself, 140 m from the recorded point (the check counts 60 m).
- **Hempstead Valley Drive / Sharsted Way roundabouts** (s1, s4): 2.7 km south of the centre, outside any 2.4 km scene
  that holds the centre too.
- **Nelson Road / Gillingham Road junction** (s1, s4): in Gillingham town, 3 km north-west, the same.

No route round the centre can put three of its eight at these. What the sources say about the roads near the centre is
used instead (the route was chosen with them):

- **The Bowaters roundabout** is named by two different authors (s4, first-hand and current; s5), so it is
  *confirmed* by the rules, but it is not recorded in the evidence file as a place. Challenge 2 is at it.
- **"The Tesco roundabout"** (s6, a learner) was taken by the evidence to be Will Adams Way. The Tesco store and its
  bus stop ("Tesco") are on Courteney Road, by the small roundabout 200 m north of the centre, on every way out: the route
  goes through it out and back. *To confirm.*

Adding these two to the evidence file would put one challenge at a known junction (2); still not three.

## Found on the map

- **The gap in Beechings Way's central reservation into Featherby Road**: its way leaves the eastbound carriageway 5 m
  east of where it reaches Featherby Road, so the car's rounded right turn crossed the reservation (pavement in the
  scene). Its east end was moved 5 m west along the carriageway in the downloaded data (`osm-patches.json`).
- **Courteney Road** is mapped unclassified, which the engine reads as a residential street: 6 m wide, cars parked
  along one kerb. It is the business park's through road and the busy link (and bus route) every test drives out and
  back on. Read as a main road (`osm-patches.json`: 6.4 m, a centre line, no kerb parking) from the test centre to the
  Bowaters roundabout, after the car met traffic easing round a parked car on the way back, and was squeezed between
  the kerb and the splitter island turning on to the roundabout by Tesco. *To confirm on the ground.*
- **The roundabout by Tesco** is small, and its ring has no lanes given, so the engine built it 6 m wide; turning on
  to it the car left the carriageway at the kerb corner or touched the splitter island's bollard. Its circulating
  carriageway is read as four lanes (`osm-patches.json`), and the way on to it now drives cleanly. The way off it
  towards the centre (three-quarters round, then a sharp left between the kerb corner and the splitter's bollard)
  still does not: the car's planned line there turns tighter than a car can, and every adjustment tried put it on the
  pavement or into the bollard. The route therefore ends on Courteney Road just short of the roundabout. **Shared
  engine change needed** (build report): a smoother way off small roundabouts, or splitters set back from the exit.
- **Hoath Way** (A278, confirmed) runs beside Courteney Road but has no junction with it short of the Bowaters
  roundabout and the Hoath Lane roundabout 650 m south: a stretch of 50 mph dual carriageway with no decision on it, so
  neither route uses it. (The evidence file's name for it, "Hoath Way (A278) dual carriageway and its end roundabouts",
  is not matched to the map's "Hoath Way" by the checker, which reads names: worth recording as "Hoath Way".)

## Open items

- Which way out examiners use, and the way back in; the last 200 m back to the centre, once the engine can drive the
  roundabout by Tesco's exit.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- The evidence file: add the Bowaters roundabout (s4, s5) and the Courteney Road roundabout by Tesco (s6, to confirm).
- Played in the app and every paused picture screenshotted and checked; then staging and the owner's drive.
