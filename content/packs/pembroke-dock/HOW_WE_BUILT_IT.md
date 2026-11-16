# How the Pembroke Dock route was built

Batch 3, by `../BATCH_BUILD_BRIEF.md` and the steps in `tools/centres/README.md`, on the model of Isleworth (Fleming
Way) (`../isleworth-fleming-way/HOW_WE_BUILT_IT.md`). Judgement first (`../EVIDENCE_PLAN.md` section 7): the evidence
pointed to roads and junctions; the route was chosen for what it teaches and for what the engine can drive as depicted.

## 1. Find the centre as it is now

The evidence file gives The Captain Superintendent's Building, Royal Dockyard, SA72 6TD (Driving Test Tips centre page);
DVSA pass-rate data for 2025-26 shows the centre still testing. gov.uk could not be read from this machine: *to recheck*.
The given position is the SA72 6TD postcode point, on Admiralty Way inside the old dockyard, 90 m north of the Admiralty
Way / Melville Terrace / Meyrick Owen Way / Whites Farm Way mini-roundabout. The route starts there on Admiralty Way,
facing the mini-roundabout.

## 2. Read the evidence, then choose

`content/sources/pass2/pembroke-dock-evidence.json`: 0 confirmed and 65 likely roads plus 15 likely junctions, all from
one undated route-list author (drivingtesttips.biz; intensivelessons.co.uk copies it word for word). Its ten routes all
start and finish on Pier Road, 0.9 km east of the current address, so they were not used for leaving and returning.
Further out they were read for road and junction names only; the route copies none. Two single turns coincide with a
list (out of Market Street towards Commercial Row; right from Water Street into Dimond Street), because they are where
the roads go; the route as a whole is our own.

The choice: the Pembroke Dock grid and the A4139 loop (Bush Street, Ferry Lane, London Road, Water Street), which every
list uses, with six named junctions that suit a scenario. Pembroke town (the Main Street mini-roundabout, the Bush Hill
lights) is in the lists too but 2.5 to 4 km away: taking it in makes the route over 7 km.

What the map changed:

- **Ferry Lane into Bush Street** (a turn in the lists) is a skewed junction with islands: from Ferry Lane southbound the
  turn doubles back past the planner's sharpest turn. So the loop runs anticlockwise: Bush Street, left on to Ferry Lane,
  left at the London Road lights. The right turn across oncoming traffic moved to the Dimond Street crossroads.
- **The Pier Road roundabout** was not found as a roundabout (a small structure mapped on its island), and **the
  Waterloo roundabout's** London Road entry from the east is a 32 m unnamed piece the planner will not take: both fixed in
  `osm-patches.json` (a tag dropped, a name set).
- **Water Street at the Pier Road roundabout** began with a 9.6 m piece: the car's line cut the corner on to the
  pavement leaving the roundabout. One node moved 8.5 m south along Water Street (no change of shape).
- **Spacing.** The Waterloo roundabout is 150 m from the London Road lights: the lights are the challenge (with the
  crossing), the Waterloo roundabout is driven through, and the Pier Road roundabout (the lists' start and finish) is the
  roundabout challenge.

## 3. Build the scene

One OpenStreetMap download round the centre (`fetch_osm.py`, half 3000 m, 6 x 6 tiles), the centre's fixes applied,
then the scene from it, 2.4 km square, centred east of the centre so that Ferry Lane and the London Road lights are in:

```
python3 -I tools/centres/fetch_osm.py pd.osm 51.69433 -4.95262 3000 6 --patches content/packs/pembroke-dock/osm-patches.json
node tools/scenes/build_scene.mjs pembroke-dock-route-1 "Pembroke Dock" 51.69298 -4.93885 1200 pd.osm 51.69451,-4.95250 51.69381,-4.95259
```

## 4. Plan the line, probe it, script the road users

As Isleworth: the car's way planned through points on the scene's roads, a probe listing stop lines, crossings,
roundabouts, side roads and parked cars by metres along it, and each road user's path planned on the scene's roads (the
blue car on Commercial Row, which only goes along it, is the road's centreline offset into its left lane). No cars are
parked along Bush Street, so the pull-up is chosen for its side roads: the straight between the lane at 185 m and St
Peter's Road. Following the lessons of the last batch:

- Each road user a pause waits for is set going from close in, as the car comes to its line (the black car at the Pier
  Road roundabout, the silver car at the Dimond Street crossroads, the pedestrian at the lights), and the first decision
  is taken at the line where a corner or the island hides the hazard until there.
- Melville Terrace and Melville Street (cars parked) are kept quiet from the start until Market Street, and Dimond Street
  and Queen Street (cars parked on one side) from the crossroads to the end of Queen Street.
- Each road user's path ends soon after its moment (the black car 70 m down Water Street, the silver car 70 m past the
  crossroads, the white and red cars along Meyrick Owen Way).

## 5. Drive it headless

The authoring rules (`-t "as authored"`) pass. One drive without traffic (`decisionDrive.ts`'s `drive`, 2 minutes):
passed with no faults, all 17 pauses as depicted (each road user within 0.1 m of its point), no red light run, nothing
hit, closest scripted road user the cyclist past the car pulled up (3.14 m), ending 11.6 m short of the planned line's
end. One thing found and fixed without a second drive:

| Found | Fix |
|---|---|
| The car's left side touched the pavement turning left out of Melville Terrace into Melville Street (a tight corner) | Its line kept 1 m right through the corner (a `shift`; the line checked on the carriageway with the car's width) |

The drives with traffic (patterns 4 and 14) and with Skip ahead are the main session's to run.

## Still to do

Played in the app and every paused picture checked (camera angles are first choices), then staging and the owner's
drive. Shared changes for the app (a button in `sim/index.html` if wanted, the voice clips for new directions, the
sources in `public/legal/credits.html`) are listed in the build report.
