# How the Enfield (Innova Business Park) route was built

Batch 2, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of the Isleworth (Fleming
Way) route (`../isleworth-fleming-way/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the
evidence pointed to roads and junctions; the route was chosen for what it teaches and for what the engine can drive as
depicted. One route per centre, carrying the whole mix.

## 1. Find the centre as it is now

gov.uk's list of centres a test can be moved to (updated 15 October 2026) has Enfield (Innova Business Park) open, with
Enfield (Brancroft Way) about 3 miles away as a separate, smaller centre. The address (Solar Way, Innova Park, EN3 7XY)
is from the driving school and centre listings; gov.uk's centre finder could not be opened from this machine: *to
recheck*. In OpenStreetMap the Driving Test Centre building (DVSA, way 308739086) stands east of Solar Way at its north
end, reached by a service road (way 37760028, access for destination only) that stops at the cycle path beside Solar
Way, 17 m short of the road. Its first node is moved to the edge of Solar Way (`osm-patches.json`) so the scene joins
it; the service road was added to the scene by its id, as Isleworth's was. The route starts 110 m in, facing out, and
ends on it after coming back.

## 2. Read the evidence, then choose

`content/sources/pass2/enfield-innova-evidence.json`: 1 confirmed and 73 likely roads, 1 confirmed and 10 likely
junctions. One undated route-list author (drivingtesttips.biz; intensivelessons.co.uk copies it word for word), whose
eight routes all leave and return by Mollison Avenue, so they fit this site; a driving school's page of instructor tips
(driveJohnson's) confirms Hertford Road and its double mini-roundabout. A route app's free preview of its paid routes
was left out (paid lists are never used). The lists were read for road and junction names only; the route copies none.

The choice: south through the business park and back by Hertford Road, on the roads every listed route uses close in
(Mollison Avenue, Ordnance Road, Hertford Road, Totteridge and Mandeville Roads: 80% of the length), taking three known
junctions that suit a scenario: the Ordnance Road / Mollison Avenue lights (a right turn across oncoming traffic), the
end of Mandeville Road on to Hertford Road (emerging right) and the Mollison Avenue / Solar Way roundabout (second exit,
to the right). Leaving the centre gives the emerging left turn, the small Innova Way roundabout stands in for the
mini-roundabout (none within reach), the zebra on Ordnance Road by Tysoe Avenue is the crossing, and Totteridge Road
(cars parked on one side only) the pull-up.

What the map changed:

- **Mandeville Road stops 65 m short of Ordnance Road, and Park Road does not join Ferndale Road**: the only way from
  Ordnance Road to Mandeville Road is by the Hertford Road lights and Totteridge Road, which also gave the pull-up.
- **The Ordnance Road / Mollison Avenue lights** are a dual carriageway junction in short pieces (a slip road, the two
  carriageways, Smeaton Road opposite); the planned line turns right through them and waits in the junction, where the
  northbound carriageway crosses its way.
- **No mini-roundabout within reach**: the Hertford Road pair is 2.5 km south-west, the Tysoe Avenue one ends a
  cul-de-sac.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2500 m, 6 x 6 tiles), the centre's fix applied
(`patch_osm.py`), then the scene from it, 1.7 km square, centred west of the centre so it takes in the Hertford Road
lights:

```
python3 -I tools/centres/fetch_osm.py enfield.osm 51.67686 -0.02135 2500 6 --patches content/packs/enfield-innova/osm-patches.json
node tools/scenes/build_scene.mjs enfield-innova-route-1 "Enfield (Innova Business Park)" 51.675423 -0.029172 850 enfield.osm 51.677902,-0.019901 51.677938,-0.020452 37760028
```

## 4. Plan the line, probe it, script the road users

As Isleworth: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts, give way ends and parked cars by metres along it, and each road user's path planned on the scene's roads
(or, for the silver car on Solar Way, Solar Way's centreline offset into its lane, `tools/scenes/lane_path.py`). Each
road user a pause waits for is set going from close in, as the car comes to its stop or crossing, and its path ends
soon after its moment. The white car at the Innova Way roundabout starts past a car parked on Innova Way.

## 5. Drive it headless

`ROUTES=enfield-innova-1 npx vitest run tests/unit/decisionDrive.centre.test.ts`: the authoring rules, the route with
the right answers, with 30 background road users in two patterns (4 and 14), and with Skip ahead. The authoring rules
pass; one drive without traffic was run here (the machine is shared), and the traffic drives are left to the main
session. Tuning on the way:

| Found | Fix |
|---|---|
| The test centre's way in did not meet Solar Way in the scene | Its first node moved to the edge of Solar Way (`osm-patches.json`) |
| The white car's path along Innova Way passed a car parked at the kerb | Its path starts past the parked car |
| The car touched the bollard on Solar Way's splitter island going into the Innova Way roundabout, and cut the corner on to the footway coming out into Innova Way | Its line kept 0.5 m left on the way in and 0.8 m right round the island (two `shifts`) |
| In the main session's drives: the car on to the footway turning right at the Hertford Road lights (the planned line ran along the left kerb into Hertford Road) and at the Bullsmoor Lane lights (along the right kerb into Mollison Avenue) | The line moved 1.4 m right and 1.2 m left there (`shifts`); a drive without traffic then had both clear, and the Innova Way roundabout clear of the bollard and the footway |
| In traffic (pattern 4), a car coming north on Mollison Avenue met the car as it turned right out of Innova Way across the northbound carriageway | The end of Innova Way and the northbound carriageway coming up to it kept quiet until the car is on its way south (`quietUntil` on the Innova Way roundabout) |
| That drive's last off-road moment: the sharp left turn from Solar Way back into the test centre's way in, cut on to the footway | The line taken 0.8 m wide of the corner (`shifts`; at least 1.8 m to the kerb); not yet driven again |
| Lessons from the last batch, applied before driving | Each road user a pause waits for set going from close in (as the car comes to its line or the crossing); the first decision at each give way taken stopped at the line; paths ended soon after their moment; Totteridge Road and Mandeville Road (cars parked on both sides in places) kept quiet from the move-off until the car is near the end of Mandeville Road (`quietUntil`) |

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. The drives with background traffic (patterns 4 and 14) and with Skip ahead are run by the main session. Shared
changes for the app (a button in `sim/index.html`, the voice clips for new directions, the sources in
`public/legal/credits.html`) are listed in the build report.
