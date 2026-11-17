# How the Cardiff (Llanishen) route was built

Batch 4, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of Pembroke Dock
(`../pembroke-dock/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the evidence pointed to roads
and junctions; the route was chosen for what it teaches and for what the engine can drive as depicted.

## 1. Find the centre as it is now

gov.uk's find-a-driving-test-centre (postcode CF14 5GF, 17 November 2026) gives Cardiff (Llanishen), Cardiff Business
Park, CF14 5GF, its pin 70 m east of the given position. OpenStreetMap has the DVSA point on Lambourne Crescent
(node/12141931941); Driving Test Tips' centre page gives Thornbury House, Unit 11 Lambourne Crescent. gov.uk lists no
other car centre in Cardiff. The route starts on Lambourne Crescent beside the point, facing north.

## 2. Read the evidence, then choose

`content/sources/pass2/cardiff-llanishen-evidence.json`. The route lists (drivingtesttips.biz, copied by
intensivelessons.co.uk, which heads them "Cardiff (Llanishen)") all start on Norbury Road, Fairwater, the earlier centre
5 km away: not used for leaving and returning, and most of their roads are out of reach. Their route 11 runs through Heath
(Heathwood Road, Cefn Carnau Road, St Isan Road, Heathway, St Brigid Road, Caerphilly Road), 1 km south of Llanishen: that
is the route's core. Two single turns coincide with that list (left out of Cefn Carnau Road, right out of St Isan Road),
because they are where the roads go; the route as a whole is our own and is driven the other way round. An instructor's
2026 video turns left at the Morrisons roundabout on to Caerphilly Road, as the route does.

What the map changed:

- The business park's only ways out are Tŷ Glas Avenue (by Parc Tŷ Glas) and Ashbourn Way (by Malvern Drive); Malvern
  Drive's way west to Caerphilly Road is a bus gate. So the route leaves by the Tŷ Glas Avenue lights and comes back by
  Ashbourn Way, and is 7.2 km long.
- Caerphilly Road southbound at the Ffordd Mograig lights is three short unnamed pieces, and the Maes-y-coed Road signal
  sits on a way's end node: both fixed in `osm-patches.json` (names set; the signal moved 2 m to the next node).
- The Morrisons roundabout's first exit (Caerphilly Road south) leaves 3 m after the Tŷ Glas Road entry: the challenge is
  the give way at the line, the car from Thornhill Road coming round.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 2500 m, 6 x 6 tiles), the centre's fixes applied,
then the scene, 2.1 km square, centred south-west of the centre so Morrisons and the Birchgrove lights are in:

```
python3 -I tools/centres/fetch_osm.py cl.osm 51.52283 -3.19232 2500 6 --patches content/packs/cardiff-llanishen/osm-patches.json
node tools/scenes/build_scene.mjs cardiff-llanishen-route-1 "Cardiff (Llanishen)" 51.51924 -3.19593 1050 cl.osm 51.52250,-3.19259 51.52290,-3.19263
```

## 4. Plan the line, probe it, script the road users

As Pembroke Dock: the car's way planned through points on the scene's roads (`decisionPath`), a probe listing stop lines,
crossings, roundabouts, side roads and parked cars by metres along it, and each road user's path planned on the scene's
roads, or a road's centreline offset into its left lane where it only goes along one road (the white car on St Isan Road,
the blue car on Heathway). No cars are parked along Heathwood Road, so the pull-up is chosen for its side roads: the
straight between Ton-yr-ywen Avenue and St Anthony Road; the cyclist's path eases round the car pulled up (3.4 m apart).
Each road user a pause waits for is set going from close in, as the car comes up to its line, and the first decision is
taken at the line where a corner or the island hides the hazard. St Isan Road and Heathway (cars parked) are kept quiet
from Cefn Carnau Road to the end of Heathway.

## 5. Drive it headless

`ROUTES=cardiff-llanishen-1 npx vitest run tests/unit/decisionDrive.centre.test.ts` (the main session's first run, then
the builder's). Found and fixed:

| Found | Fix |
|---|---|
| The car ran on the pavement turning left from Caerphilly Road into Heathwood Road at the Birchgrove lights: the slip leaves past a narrow island, and the line turned before its tip | Its line kept 3.2 m right round the turn (a `shift`; the whole car checked on the carriageway along it) |
| The car touched the bollards on the Morrisons roundabout's splitter noses, at the Tŷ Glas Road entry (the first exit leaves 3 m from it) and at the Caerphilly Road entry on the way back | Its line kept 1.5 m and 1.4 m right there (`shift`s; at least 0.6 m clear of each bollard) |
| In traffic (pattern 4), a background car was on the roundabout when the car paused at its line | The direction given 70 m earlier, and the Caerphilly Road and Beulah Road approaches kept quiet |

All six pass: the authoring rules (2), and the drives without traffic, with traffic in patterns 4 and 14, and with Skip ahead.

## Still to do

The drives, then the app: every paused picture checked (camera angles are first choices), staging and the owner's drive.
Shared changes (a button in `sim/index.html` if wanted, voice clips for any new directions, the sources in
`public/legal/credits.html`) are listed in the build report.
