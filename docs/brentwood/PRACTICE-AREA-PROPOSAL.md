# Brentwood area-inspired practice: test centre, survey and proposal for two new locations

**Status: proposal for review. Nothing in this document has been built yet, except the improvements to the existing paired mini-roundabouts (section 4).** All content is *Brentwood area-inspired practice*: not an official test route, not an exact reconstruction, and not endorsed by DVSA. Assessment remains **draft and unreviewed** until an appropriate instructor has reviewed it.

Checked 2026-10-18.

## 1. Test centre

| | |
|---|---|
| Name | Brentwood (London) practical driving test centre (car) – **provisional** |
| Address | 89 Warley Hill, Brentwood, CM14 5JN – **provisional** |
| Official source | https://www.gov.uk/find-driving-test-centre – **not checked: the GOV.UK finder could not be reached from the build environment (network policy refused www.gov.uk on 2026-10-18).** |
| Supporting (unofficial) sources | Third-party listings agree on the name "Brentwood (London)" and 89 Warley Hill, CM14 5JN, as a practical car test centre (also ADI part 2/3): [passrates.uk](https://passrates.uk/centres/brentwood-london), [intensivelessons.co.uk](https://intensivelessons.co.uk/Practical-Test-Centres/Essex/Brentwood-London), [passmefast.co.uk](https://www.passmefast.co.uk/test-centres/practical/essex/brentwood). One listing gives the postcode CM14 5HN, probably a typing error. These are not official. |
| Practical vs theory | The address above is given for **practical** tests. The theory test centre for Brentwood candidates is a separate site and is not used here. Confirm both on GOV.UK. |
| Coordinates | **Estimated 51.6095 N, 0.2984 E** (WGS84), interpolated from house numbers mapped on Warley Hill in OpenStreetMap (odd numbers 11–15 near 51.613 N; even 114–152 near 51.607–51.609 N). OSM has **no address point for 89 Warley Hill** and no test-centre feature (OSM API 0.6 map calls, data downloaded 2026-10-18, newest edit in the area 2026-09-04). Uncertainty is roughly ±250 m along Warley Hill. These coordinates are **not DVSA-supplied**. |
| Entrance | **Not verified.** Needs an official address check and a street-level or site visit. |

**Action for the reviewer:** open the GOV.UK finder, search "Brentwood", and confirm the name, address and that it offers car practical tests. Then confirm the entrance position on a map. Until then, every distance below is measured from the estimate and is provisional.

## 2. Official objectives used

Primary sources (URLs as given in the brief; **their current text could not be fetched from the build environment**, so section and rule references below need checking against the live pages before the exercises are reviewed):

- National standard for driving cars and light vans (category B): https://www.gov.uk/guidance/national-standard-for-driving-cars-and-light-vans-category-b
- Learning to drive a car: syllabus: https://www.gov.uk/guidance/learning-to-drive-a-car-syllabus
- What happens during the practical test: https://www.gov.uk/driving-test/what-happens-during-test
- The Highway Code: https://www.gov.uk/guidance/the-highway-code

Our product supports **judgement practice** (observation, anticipation, priority, gaps, speed, position, signals, vulnerable road users). It does not establish real-world vehicle-handling competence. Head direction in the phone viewer is **not eye tracking**.

## 3. Survey (about 2 km around the estimated centre)

Data: OpenStreetMap, © OpenStreetMap contributors, ODbL 1.0. API 0.6 map calls for four tiles covering 51.591–51.628 N, 0.269–0.328 E, downloaded 2026-10-18. The survey scripts are in `tools/brentwood/survey/`. Straight-line distance is great-circle from the estimated centre. Road distance is the shortest drivable path in the OSM graph, respecting one-way tags, from the Warley Hill node nearest the estimate (node 21618391, Junction Road / Warley Hill).

| Feature (OSM) | Count within 2 km | Nearest examples (straight-line) |
|---|---|---|
| Zebra crossings | 11 | Kings Road (808 m), Queen's Road (917 m), William Hunter Way (≈1.2 km) |
| Signal crossings | 18 | Kings Road (637 m), High Street (≈1.1 km) |
| Uncontrolled crossings | 7 | Crescent Road (381 m) |
| Mini-roundabouts | 19 | The Drive / Warley Hill (472 m), Crown Street / Queen's Road (936 m) |
| Give-way nodes | 1 | (give-way markings are rarely mapped: treat every give-way line as unverified) |
| Named junctions | 445 | Woodman Road / Warley Hill (215 m), Lorne Road / Warley Hill (51 m) |

The **existing paired mini-roundabouts** (High Street / Ingrave Road / Wilson's Corner / Shenfield Road / Ongar Road) are **1.40 km straight-line, about 1.60 km by road** from the estimated centre. They are inside the 2 km radius and kept as a Brentwood location.

What the map data does not tell us: lane markings and widths (mostly not mapped), give-way and stop lines, most signs, kerb lines, parking restrictions (mapped on a few Warley Hill sections only), sightline obstructions (walls, hedges), and changes since the last edit.

## 4. Location 1: existing paired mini-roundabouts (being improved now)

- Connections, approach directions and spacing are checked against OSM. The two mini-roundabouts are 19.1 m apart (unit-tested), with the High Street approach from the west. The learner turns left at the first into Wilson's Corner, then goes ahead at the second into Shenfield Road.
- Improvements in this round (see `docs/verification/STEP11-zebra-and-brentwood-scenery.md`):
  - every OSM building drawn with brick, render, stone or concrete walls, windows on each storey, a flat roof and parapet;
  - shopfronts (generic, no names or signs) only on buildings where OSM maps a business, and only on walls facing a road;
  - collision walls matching each outline;
  - OSM trees with trunk colliders;
  - paved ground, with grass and car-park areas from OSM;
  - the mapped Wilsons Corner bus stop;
  - the William Hunter memorial as an obelisk;
  - street lights at a typical spacing (**representative: not mapped**);
  - signal heads at the real High Street signal crossing, drawn from the exercise's own signal state (held at green: no pedestrian phase is simulated).
- Remaining uncertainties:
  - modelled pavements (2 m) are narrower than the real High Street, where shop fronts are 10–12 m from our kerb line;
  - six High Street bus stops are mapped 10–19 m from our simplified kerb and are not placed;
  - building heights are estimated except where OSM gives storeys (1 building);
  - roofs are drawn flat;
  - the memorial's size is estimated;
  - lane markings on the approaches are simplified.

## 5. Proposed location 2: emerging at a T-junction, Woodman Road onto Warley Hill

| | |
|---|---|
| Where | Woodman Road (residential, 30 mph) meeting Warley Hill (B186, secondary, 30 mph). OSM junction node 21618407: **51.60762 N, 0.29767 E**. Map: https://www.openstreetmap.org/node/21618407 |
| Distance | 215 m straight-line, about 240 m by road from the estimated centre (method above) |
| Learning objective | Emerge from a minor road onto a busier road: approach and stop or slow at the give-way, observe both ways (and again before pulling out), judge a safe gap in traffic from both directions, give way to cyclists, motorcyclists and pedestrians crossing the mouth of the junction, and position correctly when turning left or right. |
| Official references (to confirm against the live pages) | Highway Code, Using the road: junctions (rules 170–172 on emerging, watching for pedestrians, cyclists and motorcyclists, give-way and stop lines; rule 211 on looking out for cyclists and motorcyclists at junctions). National standard, role 3: *drive safely*, including dealing with junctions and negotiating the road safely. Syllabus: *junctions*. Practical test: junctions as part of general and independent driving. |
| What the learner observes and decides | Traffic and gaps on Warley Hill in both directions; a pedestrian crossing Woodman Road; a cyclist approaching on Warley Hill; parked cars near the junction affecting the view. Decides when to stop, where to look, and when the gap is safe. |
| Evidence for feedback | Speed on approach; stop or creep at the give-way line (position events); head-direction observation events right, left and right again (not eye tracking); when the learner moves out relative to the nearest approaching vehicle (time and distance at that moment); conflicts (another vehicle braking, near misses); signals. |
| Our draft design decisions (not DVSA rules) | Any observation-freshness window, minimum safe gap (time or distance), approach-speed bands and the severity of each finding. Marked draft until instructor review. |
| Proposed traffic and hazards (authored, not geography) | Variants with traffic on Warley Hill from both sides at random gaps; a cyclist on Warley Hill; a pedestrian crossing the mouth of Woodman Road; a parked van on Warley Hill near the junction that hides approaching traffic until the learner edges forward. |
| Uncertainties | **Give-way markings and any stop sign are not mapped**; the junction's corner radii and kerb lines need checking; whether Warley Hill parking near the junction is allowed; boundary walls and hedges that limit sightlines (they decide the exercise and must be checked on street-level imagery or by a visit); whether this junction is near the test-centre entrance, depending on where the entrance is. |
| Assets and work | Reuse the streetscape (houses, gardens, walls, lamps) and CC0 parked cars. Lay out from OSM: a T-junction with give-way lines (needs a junction kind for a T-junction: new schema and road-surface work). Traffic needs to obey priority: vehicles on the major road keep going and the scenario checks the learner's gap. Collision walls from the house layout. Estimate: one development round for geometry and traffic, one for assessment and tests. |

## 6. Proposed location 3: zebra crossing on Kings Road (B186)

| | |
|---|---|
| Where | Zebra crossing on Kings Road (B186, secondary, 2 lanes, 30 mph, lit, pavements both sides). OSM node 1691283192: **51.61673 N, 0.29945 E**. Map: https://www.openstreetmap.org/node/1691283192 |
| Distance | 808 m straight-line, about 790 m by road from the estimated centre |
| Learning objective | Approach a real zebra crossing at a speed that allows stopping, scan both pavements for people who may cross (including those partly hidden), check mirrors before slowing, give way to a pedestrian who has moved onto the crossing, and not wave pedestrians across. |
| Official references (to confirm) | Highway Code, rules 191–195 (pedestrian crossings; zebra crossings: give way when someone has moved onto the crossing), rule 205 (pedestrians), rule 206 (take extra care with children and older pedestrians). National standard role 3: *drive safely* and *respond to other road users*. Syllabus: *pedestrian crossings*. |
| What the learner observes and decides | Pedestrians waiting on either pavement, one partly hidden by a parked vehicle or a bus stop; traffic behind (mirror); whether to slow, stop or continue. |
| Evidence for feedback | Approach speed in the zone before the zig-zags; mirror-check events before braking; stop position relative to the give-way line; whether the pedestrian had to wait or step back (conflict events). |
| Our draft design decisions | Approach-speed bands, mirror-before-brake timing window, how close a pedestrian counts as "waiting", severity. Draft until review. |
| Proposed traffic and hazards (authored) | A following car; pedestrians arriving at different times (variants); a pedestrian on the far side; a vehicle approaching from the opposite direction that also has to stop. |
| Uncertainties | Zig-zag lengths and any parking bays near the crossing are not mapped; whether the beacons and the crossing's exact position match the current road (OSM edit 2026-07-17 on Kings Road ways); nearby roundabouts on Kings Road (mapped roundabout ways close by) may change the approach. **Kings Road and the station area are busy; check that the scene would not misrepresent bus stops or signals that are actually there.** |
| Assets and work | The existing zebra code (stripes, give-way line, beacons) and pedestrian actors; streetscape houses or shop frontages depending on what is there; CC0 parked cars. Main new work: lay out Kings Road from OSM and add zig-zag markings. Smaller than location 2 because the crossing exercise and assessment exist. |

**Alternative for location 3 (meeting traffic):** Queen Street, a residential terraced street (326 m straight, about 450 m by road). It suits passing parked cars and giving way to oncoming traffic (Highway Code rule on giving way to oncoming traffic when the obstruction is on your side: confirm the number against the live Highway Code). However, **on-street parking is not mapped there**, so we would be authoring the parked cars as scenario traffic. That is allowed but must be presented as such.

## 7. Requested decisions

1. Confirm the test centre on GOV.UK (name, address, car practical) and its entrance.
2. Approve or replace location 2 (Woodman Road / Warley Hill) and location 3 (Kings Road zebra, or Queen Street meeting traffic).
3. Approve the draft objectives above for instructor review.
