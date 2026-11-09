# How the Brentwood test routes were built

A teaching reference: the steps taken to build Brentwood routes 1 and 2 (November 2026), what went wrong on the way
and the rules that came out of it. The format itself is in `content/packs/ROUTE_FORMAT.md`; the routes are in
`content/packs/brentwood/ROUTES.md`.

## 1. Start from the owner's route spec

The owner gave each route as a journey and eight challenges, each with what it assesses:

> Route 1: Test centre, Warley Hill, Kings Road past the station, the High Street lights (right), Wilson's Corner,
> Ingrave Road, Queen's Road, Rose Valley, King Edward Road, back to the centre.
> 1 Leave the test centre: pavement observations, approaching traffic, a safe gap. 2 Station-area pedestrian
> crossing. 3 Kings Road / High Street lights, turn right. ... 8 Emerge back towards Kings Road.

An earlier attempt where the routes were chosen by the agent was scrapped: the challenges were not ones that teach
(going ahead on a main road, a car that had already pulled out). **The owner picks the routes and what each challenge
teaches; the build makes them real.**

## 2. Check the spec against the map before building

Every junction was looked up in OpenStreetMap: the roads meeting there, whether it has lights, a mini-roundabout or a
crossing, which side roads join on which side.

- Found and confirmed: the station signal crossing on Kings Road, the Kings Road / High Street lights (a crossroads),
  Wilson's Corner's two mini-roundabouts, the Brook Street lights, the Eagle Way crossroads.
- Found that did not match: **no mini-roundabout on Mascalls Lane**. The only one nearby, Warley Hill / The Drive,
  comes after the Eagle Way crossroads. The owner chose to swap challenges 6 and 7 rather than invent one.
- Found a bonus: Route 2 has a marked crossing after all, a zebra 20 m into Crescent Road, so challenge 1 uses it.
- Found the test centre's way in is not a normal road in the map (a service road). It was added to the scene by its
  map id. **Still to confirm with the owner.**
- A side-road error caught later by a test: Brook Road joins London Road on the right, not the left, so the pull-up
  stops past Westwood Avenue instead.

**Lesson: report mismatches to the owner and let them decide; never quietly move a challenge.**

## 3. Build one map scene for both routes

`node tools/scenes/build_scene.mjs brentwood-routes "Brentwood" 51.6105 0.2912 1250 - <start> <facing> <service way ids>`

One 2.5 km square covering both routes, built from OpenStreetMap: roads with lanes and widths, junctions, lights,
crossings, buildings, parked cars, bus stops.

## 4. Plan the car's line

The route is a list of points the drive passes (`through`). The planner finds the way on the scene's roads, keeping to
one-way streets, and the lane path eases round parked cars. A probe then lists everything along the line by distance
(road names, stop lines, crossings, mini-roundabouts) so each challenge's spot can be found by metres along the route.

## 5. Script the road users

For each challenge, the road users that make the decision: the car coming from the right, the pedestrian at the
kerb, the cyclist out of The Close, the van parked on Queen's Road. Each path was **generated on the scene's roads**
from a start and points to pass, then extended so it drives on out of sight. Hand-drawn paths cut corners, drove over
mini-roundabout discs and ended in view.

## 6. Write the challenges

For each: the examiner's instruction and where it is said, the road users and when they set off, where each stage
pauses and which road user it waits for, the camera, the buttons, the marking rules, the safe orders and the
explanation. New things Brentwood needed were added to the engine for every route: a parked obstruction, pulling in
to the kerb, lights held red for people crossing, a cyclist, a stopping sequence (handbrake, neutral, cancel signal).

## 7. Drive it headless, then in the app

Headless runs drive the route with the right answers, with and without background traffic, and check each pause is
as depicted, nothing is hit, no red light is run and the car stays on the road. Then the route is played in the app
and every paused picture is screenshotted and looked at.

Most of the work was here. Problems found and the general fixes they led to:

| Found | Fix (for every route) |
|---|---|
| A road ahead ended in a wall of sky | The sky dome stayed at the map's middle; it now follows the camera. |
| The awaited car arrived late, so the pause came with the car already stopped | Start road users earlier; pacing holds a car just short of its spot until the learner's car is there. |
| Background traffic jammed at a junction, or drove into the test centre's way in | It keeps off private ways; a car holding the learner too long turns off. |
| A pause showed nothing to decide, or hid the hazard under the panel | Closer-in pauses, camera angles chosen per challenge, panel on the right where the hazard is on the left. |
| Turning cars signalled left for a right turn round a mini disc | Signals follow a manoeuvre's overall turn. |
| Indicators visible from behind as dark boxes | Lamps are shown only when lit. |

## 8. Owner review, and the rules that came from it

Each round went to staging and the owner drove it. Their feedback became rules for every route, each enforced by a
test so no future route can break it:

1. The app never checks mirrors or signals for the learner.
2. Every turn offers both signals and all three mirrors; the interior mirror wherever the car slows.
3. Holding back is called **Give way**.
4. **One decision before, one after** each challenge (the first build had three at most junctions: an approach, a
   decision at the line, and a fresh look after the traffic passed, which felt repetitive). A third only where two
   different hazards meet at one place.
5. Each paused picture must make the answer evident.
6. No long gaps: faster driving between distant challenges, and "Driving to the next challenge."
7. The panel can be hidden to see the whole road; a drag icon and a first-time tour show the camera can be dragged.

## 9. Where it stands

Both routes pass driven headless without traffic and played in the app, and are on staging. Open items: confirm the
test centre's way in; one traffic pattern on Route 1 has a background car passing 6 cm in front of the learner's car
between challenges; signal phases and give way markings are taken from the map, not surveyed.

## What to reuse for the next centre

The engine, the rules and the checks carry over unchanged. Per centre: the owner's route spec, a map check, a
scene, generated road user paths, the challenge data and screenshot review. The plan to automate the per-centre part
(challenge templates and a route compiler) is in the discussion of 9 November; until it exists, follow steps 1 to 8.
