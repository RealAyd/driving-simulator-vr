# Cardiff (Llanishen) decision route

One "Decisions only" practice route from the Cardiff (Llanishen) test centre, Cardiff Business Park, CF14 5GF (gov.uk's
find-a-driving-test-centre, checked 17 November 2026; OpenStreetMap has the DVSA point on Lambourne Crescent). One route
per centre, carrying the whole mix it can (`../ROUTE_TEMPLATE_RULES.md` section 5). Built from OpenStreetMap data and the
published evidence in `content/sources/pass2/cardiff-llanishen-evidence.json`, November 2026. A practice route, not a
confirmed test route. How it was chosen and built: `HOW_WE_BUILT_IT.md`. The format: `../ROUTE_FORMAT.md`. In Wales:
the road signs are bilingual; the rules, the markings and the route's words are as in England for this app.

**Start and finish.** The route starts on Lambourne Crescent beside the DVSA point, facing north, and comes back the same
way (Malvern Drive, Parc Tŷ Glas, right into Lambourne Crescent), finishing at the corner just past the start. *To
confirm: where in the business park tests start and finish (the centre's car park).*

**Evidence.** The two route lists (drivingtesttips.biz, copied word for word by intensivelessons.co.uk) all start on
Norbury Road, Fairwater, the earlier Cardiff centre 5 km south-west: they are used for roads further out only. Near
Llanishen they name Caerphilly Road, Heathwood Road, Cefn Carnau Road, St Isan Road, Heathway and St Brigid Road, and the
junctions between them. A 2023 Llanishen route video (Heathway, the A48) and an instructor's 2026 video (the Morrisons
roundabout, Gabalfa) add to them; Heathway is the one road here named by two sources (*confirmed*).

## Caerphilly Road and Heath (scene `cardiff-llanishen-route-1`, 7.2 km)

Up Parc Tŷ Glas, left at the Tŷ Glas Avenue lights, Tŷ Glas Avenue and Tŷ Glas Road, first exit at the Morrisons
roundabout, Caerphilly Road south to the Birchgrove lights, left over the crossing into Heathwood Road (pulling up and
moving off), left into Cefn Carnau Road, left out on to St Isan Road, right out on to Heathway, left on to Maes-y-coed
Road, right at the Caerphilly Road lights, Caerphilly Road north, round the Morrisons roundabout on to Tŷ Glas Road,
right into Ashbourn Way, left on to Malvern Drive, Parc Tŷ Glas and right into Lambourne Crescent.

| # | Challenge | Road users | Right answer |
|---|---|---|---|
| 1 | Leaving the test centre: Parc Tŷ Glas at the Tŷ Glas Avenue lights, left | Lights red, then green | Mirrors, signal left; wait at the red; left mirror on green, go |
| 2 | Morrisons roundabout, first exit on to Caerphilly Road | A black car coming down Thornhill Road on to the roundabout, from the right, round to Beulah Road | Mirrors, signal left; look right, give way; look right again, go |
| 3 | Caerphilly Road at the Birchgrove lights, left into Heathwood Road | Green; a pedestrian still on the crossing over Caerphilly Road in front, in the car's lane | Mirrors, signal left; look along the crossing, give way; look again, left mirror, go |
| 4 | Pull up on Heathwood Road, on the straight before St Anthony Road | A cyclist behind | Choose the straight clear of the side roads, mirrors, signal; handbrake, neutral, cancel signal |
| 5 | Move off | The cyclist coming past, then left into Heathway | Mirror and blind spot, wait; again, go |
| 6 | Emerging left out of Cefn Carnau Road on to St Isan Road | A white car coming along St Isan Road from the right | Mirrors, signal left; look right, give way; look right and left, go |
| 7 | Emerging right out of St Isan Road on to Heathway | A blue car coming down Heathway from the right | Mirrors, signal right; look right, give way; look right and left, go |
| 8 | Maes-y-coed Road at the Caerphilly Road lights, right turn | Green; a silver car coming out of Tŷ Wern Road opposite, going straight over | Mirrors, signal right, position; wait in the junction; look into Caerphilly Road, go |

**The mix** (rule 4): traffic lights (1, 3, 8), a roundabout (2), emerging left (6) and right (7), a right turn across
oncoming traffic (8), a pedestrian crossing (3, the signal crossing at the Birchgrove lights), and the pull-up and move-off
pair (4, 5). **Not on this route: a mini-roundabout.** The two in reach are on Phoenix Way (a cul-de-sac estate off
Caerphilly Road: only a loop round the estate reaches it) and at the Tŷ Glas Avenue / Fidlas Road junction, 1 km east,
off every road the evidence names; taking either in would take the route past 8 km or below half on the evidence's roads.
The Morrisons roundabout is small (a ring about 16 m across) but a full roundabout (Tŷ Glas Road, Thornhill Road, Beulah Road and Caerphilly Road).

**Known junctions** (5 of 8, by the checker): the Morrisons roundabout (2), the Birchgrove lights (3), the Heathway /
Heathwood Road junction (5: the move-off ends by it), the end of Cefn Carnau Road at St Isan Road (6) and the end of St
Isan Road at Heathway (7).

**Overlap** (rule 3): 59% of 7.2 km on confirmed or likely roads (Caerphilly Road 2.19 km, Heathwood Road 1.02,
St Isan Road 0.43, Heathway 0.40, Cefn Carnau Road). Not named: the way out and back (Parc Tŷ Glas 0.71 km, Tŷ Glas Road
0.66, Ashbourn Way 0.57, Tŷ Glas Avenue, Malvern Drive), Maes-y-coed Road (0.52) and the roundabout's ring.

## Checker

`node tools/centres/check_route.mjs cardiff-llanishen-1`: passes (7.2 km, 59% on confirmed or likely roads, 5 of 8 at
known junctions, spacing met; the mini-roundabout is the one kind missing, above).

## Choices

- **Why this way out.** Malvern Drive does not reach Caerphilly Road (a bus gate at Smith Road), and the right turn from
  Malvern Drive into Ashbourn Way is not one the planner takes (Ashbourn Way meets it as a one-way pair 5 m apart), so the
  route leaves by Parc Tŷ Glas and the Tŷ Glas Avenue lights (an instructor's Llanishen mock test turns left at lights
  just after leaving) and comes back by Ashbourn Way.
- **Left out.** Gabalfa Interchange and Western Avenue (A48, confirmed): 2 km south, grade-separated trunk road, out of
  the scene a route of this length can cover. Coryton (M4 junction 32), 3 km north-west. The west Cardiff roads of the
  route lists, round the old Fairwater centre. St Brigid Road (likely): passed by, not driven.
- **Long for a decision route** (7.2 km): the centre sits in a business park whose only ways out are Tŷ Glas Avenue and
  Ashbourn Way, so 2.5 km of the route is the way out and back. Between challenges the drive plays four times as fast.

## Found on the map

Fixes in `osm-patches.json`:

- **Caerphilly Road southbound at the Ffordd Mograig / Waun-y-Groes Road lights** is three short unnamed one-way pieces:
  the planner would not drive them, and went round by the estates to the west. Named Caerphilly Road.
- **The Maes-y-coed Road signal at the Caerphilly Road lights** is on a way's end node, so the scene had no stop line on
  that approach (challenge 8's lights). Moved 2 m east on to the next node.

## Drives

Not run by the builder (the machine was busy with a long drive run): the authoring rules (`-t "as authored"`) pass. The
drives without and with traffic (patterns 4 and 14) and with Skip ahead are for the main session
(`ROUTES=cardiff-llanishen-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`).

## Open items

- Where tests start and finish inside Cardiff Business Park.
- A first-hand source naming roads near Llanishen (the instructor videos' chapters name only the Morrisons roundabout
  and Gabalfa); the route lists' dates.
- Signal phases, give way markings and crossing positions are taken from the map, not surveyed.
- Played in the app and every paused picture checked (camera angles are first choices); then staging and the owner's drive.
