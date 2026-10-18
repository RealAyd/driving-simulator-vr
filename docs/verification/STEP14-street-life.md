# Step 14: street names, signs, bus stops, people, cyclist and buses

Branch `rebuild/3d-judgement-simulator`. Production `main` and vr.drivingpractice.live unchanged. All software results below come from headless Chromium with **software rendering** at the iPhone 14 Pro Max landscape size. **None of it has been checked on the iPhone yet.**

## 1. Audit (before this step)

| | Moving off | Zebra crossing | Brentwood |
|---|---|---|---|
| Street names | none (representative street) | none (representative street) | none shown; OSM names in the data |
| Location label | none | none | none (credit line only) |
| Bus stops | none | none | 6 mapped stops drawn as a thin pole with a 0.42 × 0.55 m flag edge-on to traffic: **not recognisable from the driver's seat** (the problem you found) |
| People | none | the crossing pedestrian: a cylinder, two boxes and a ball | none |
| Cyclist | box bicycle, cylinder rider, ball helmet | none | none |
| Road signs | none | none (beacons only) | none; the signal heads only |
| Buses | none | none | none |

**Assets available:** no pack in the register has people or a bus (Quaternius LowPoly Cars: cars only; Downtown MegaKit Standard: no people, buses or UK street furniture; the CADmando bus stop has unknown licence and a TfL map image). Free asset sites are blocked by this environment's network policy. Nothing was purchased. **Everything added is project-owned and generated in code** (`docs/assets/ASSET-REGISTER.md`, "Street life").

**References checked (OpenStreetMap, already the Brentwood source, ODbL):**
- street names on every modelled road;
- `maxspeed`: High Street 20 mph (all six ways), Ingrave Road, Shenfield Road and Ongar Road 30 mph; none on Wilson's Corner, Moores Place, Saint Thomas Road or two of the one-way pieces;
- bus stops (NaPTAN import): names, stop letters (`local_ref`, `naptan:Indicator`), `shelter=yes` at the five High Street stops, `shelter=no` at Wilsons Corner;
- bus routes: eight operators' relations use these stops (NIBS, First Essex, Stephensons, Vectare, Go-Ahead London and Stagecoach London among them), so **no operator or route was chosen**: the bus is generic and unbranded;
- **no traffic signs are mapped** (one give-way node, outside the scene) and no direction signs or speed-limit change points.

## 2. What changed, by exercise

### Shared components (used by every exercise)
- `src/world/signage.ts` (placement rules, testable) and `signageMesh.ts`: sign faces lettered on one canvas texture; all signs, posts and shelters in one mesh with one material.
- `src/world/placeLabel.ts`: the location label under the view pill.
- `src/world/crowd.ts` (who walks where, a pure function of simulated time) and `peopleMesh.ts` (three shared shapes drawn as instances: three draw calls for everyone, people over 140 m from the car not drawn).
- `src/actors/bus.ts` (behaviour) and `busVisual`, `cyclistBody`/`cyclistLegs`, `pedestrianFigure` in `src/actors/actorVisuals.ts`.

### Brentwood mini-roundabouts
- **Location label:** "High Street · Brentwood · 20 mph", changing with the street (the junction keeps the street you came from). The limit is shown only where OSM maps it, with a tooltip saying it comes from map data and is not checked on the ground; no limit is shown on Wilson's Corner.
- **Street-name plates (8):** High Street, Ingrave Road, Wilson's Corner (at each mini-roundabout), Shenfield Road, Ongar Road, Moores Place, Saint Thomas Road. Black on white, double-sided, on two posts with the lower edge at 2.1 m. **Positions are estimated** (a pavement corner of each street, 7–10 m from the junction); each records how it was placed (`signage()` diagnostic). They were first placed at 0.75 m; the new sightline test found them hiding traffic at the mini-roundabouts, so they were raised.
- **Mini-roundabout signs (6):** the blue sign with three clockwise arrows (diagram 611.1 design) on the left of every entry to both mini-roundabouts, facing approaching traffic, 600 mm, lower edge 2.1 m. TSRGD requires this sign at each mini-roundabout entry; the exact positions are estimated.
- **Bus stops (6):** a 3.1 m pole and a 0.5 × 0.78 m flag square to the traffic (seen face-on on approach) showing BUS STOP, a bus symbol, the stop name and letter ("High Street", "Stop C"; "Coach Stop E"; "Wilsons Corner" has no letter). No operator logos or routes. **Shelters at the five stops OSM marks `shelter=yes`**, a metre back from the kerb behind the flag (position estimated: OSM maps the stop, not the shelter). None at Wilsons Corner. No bus-stop road markings: none are mapped.
- **Shop names (38):** OSM names of mapped businesses on their shopfront fascias, as plain lettering only. They may be out of date.
- **People:** about 26 walking on pavements plus about 10 waiting at the stops.
- **Buses (2), never assessed:** the westbound bus waits at Coach Stop E beside the start, signals and pulls away after 16 s, and leaves west along the High Street. The eastbound bus comes up from the far end of the High Street, calls at Stop C for 12 s and stops at Stop B, where it stays. Both drive their lane at up to 17 mph, accelerate at 0.9 m/s², brake at about 1.1 m/s² to halt with the front at the flag, slow or stop for the learner's car in their path, and are solid (a dynamic collider 11.5 × 2.55 m).
- **Unchanged:** roads, junctions, route, zones, lead car, signals and the route summary.

### Zebra crossing
- **Crossing pedestrian:** now a human figure (head, hair, coat, arms, legs) in the same navy coat; stands while waiting, walks with swinging legs and arms while crossing. **Position, footprint (0.3 m), timing and triggers unchanged** (unit-tested: drawn exactly at the actor's position). The van still hides it: the van and its collider are untouched, and the G13 sightline checks pass.
- **People:** a few walking on the pavements, kept more than 40 m from the crossing, 18 m from the van and 30 m from the crossing pedestrian, so nobody can be mistaken for the hazard.
- **Label:** "Practice street · representative, not a real place". No street names or shop names are invented.
- **Zig-zag markings: not added** (see section 6).

### Moving off safely
- **Cyclist:** a bicycle (wheels, frame, saddle, bars) and a rider in a yellow jersey and helmet whose legs pedal with the distance travelled. **Same collision box (0.6 × 1.8 m), path, timing and colour.** G11 still measures the cyclist in the left mirror along its whole approach (it passes), and G6/G9 pass.
- **People:** a few on the pavements, none on the nearside pavement from 70 m behind the start to 15 m ahead, so nobody stands between the car and the approaching cyclist in the left mirror or shoulder view. Their clothes avoid yellow, purple and the strict red and blue the mirror checks look for (unit-tested in light and shade).
- **Label:** "Practice street · representative, not a real place".

## 3. Driver-view screenshots (`step14/`)

From the driver's seat unless the file name says "diagnostic":

| File | Shows |
|---|---|
| `01-brentwood-forward-start.png` | the label, mini-roundabout sign and plates ahead, shop names, people |
| `02-brentwood-right-mirror-bus-at-stop-E.png` | the waiting bus at Coach Stop E in the right mirror |
| `03-brentwood-right-shoulder-bus-stop-E.png` | the bus and the stop over the right shoulder |
| `04-brentwood-left-shoulder-stop-A.png` | Stop A's flag and shelter, people waiting |
| `05-brentwood-interior-bus-arriving.png` | the eastbound bus approaching Stop C, with the stops and people behind |
| `06-brentwood-placed-high-street-west.png` | *car placed by a diagnostic* in the eastbound lane 70 m west of the start, looking ahead at Stops C, B and F as you would on approach |
| `07-brentwood-placed-rb1-approach.png` | *car placed by a diagnostic* 18 m before mini-roundabout 1: its sign, the street plates |
| `08-diagnostic-stop-close.png`, `09-diagnostic-roundabout-sign-close.png` | diagnostic camera at eye height, close up, to read the faces |
| `10-zebra-forward.png`, `11-zebra-pedestrian-diagnostic.png` | the zebra exercise; the new crossing pedestrian (diagnostic camera) |
| `12-moving-off-left-mirror-cyclist.png`, `13-moving-off-cyclist-diagnostic.png` | the cyclist in the left mirror; close up (diagnostic camera) |

**In normal driving of the Brentwood exercise**, the learner starts beside Stops A and E and drives away from the other stops, so stops are seen mainly in the mirrors and over the shoulders at the start (screenshots 02–05). Screenshots 06–07 show the forward view on an approach to the stops, which this exercise's route does not include.

## 4. Checks

- **Unit tests:** see the totals in section 7. New: `tests/unit/streetLife.test.ts` (21) and `tests/unit/bus.test.ts` (6):
  - street plates use only map names and stand on pavements;
  - every mini-roundabout entry has its sign on the left facing approaching traffic, 2.1 m up;
  - every mapped stop has a flag with its name and letter; shelters only where mapped, wholly on the pavement;
  - shop names only from map data, only on shops; representative streets get no invented names;
  - **no sign panel hides traffic** at either mini-roundabout (four approach pairs, three target heights);
  - every position any person reaches over 300 s is on a pavement (their body too), never in a junction or carriageway;
  - people stay clear of the zebra crossing, the van, the crossing pedestrian and the Moving off nearside;
  - clothes never match the mirror checks' colours; people have no colliders;
  - the crossing pedestrian is drawn exactly where the actor is, walking only while crossing;
  - the buses' whole bodies stay in their own lane, clear of the kerb, and touch no building, tree, lamp, sign, shelter or parked vehicle along their whole path;
  - they halt exactly at each call, braking at most about 1.1 m/s² (firmer only for the learner's car), accelerate at most 0.9 m/s²; the same simulated time gives the same position at 60 or 120 steps a second;
  - the waiting bus signals before pulling away; neither bus reaches the learner's car at the start, and a bus stops 2–6 m short of a car in its path;
  - buses are never actors, zones or triggers in any scenario.
- **Browser tests:** the full suite, including the new G15, before and after the buses (results in section 7). G11 (cyclist in the left mirror), G13 (van hides the pedestrian), G1 (mirror orientation) and the drive tests G2, G5, G6 and G9 pass with the new figures.

## 5. Performance (software rendering in this container, same conditions before and after)

Stationary at each exercise's start, 932 × 430, forward view with mirrors, then the interior mirror view. Two runs each; scene triangles exclude the instanced people.

| Scene | Triangles before → after (scene meshes) | Forward view fps, before (2 runs) | after (2 runs) | Interior mirror fps, before | after |
|---|---|---|---|---|---|
| Moving off | 67,060–70,014 → 67,156–68,116 | 18.0, 18.9 | 20.4, 18.7 | 17.4, 14.0 | 16.5, 16.7 |
| Zebra crossing | 50,070 → 49,658 | 19.2, 20.1 | 20.3, 22.0 | 18.8, 16.4 | 18.0, 18.8 |
| Brentwood | 65,372 → 67,278 (+ about 36 people as instances, 2 buses, 1 sign mesh) | 17.5, 17.8 | 14.7, 17.0 | 14.7, 14.3 | 14.3, 13.0 |

- **Moving off and zebra:** no measurable change.
- **Brentwood:** forward view 14.7–17.0 against 17.5–17.8 before; interior mirror 13.0–14.3 against 14.3–14.7: up to about 15% slower here, after cutting the people's geometry and not drawing those beyond 140 m (before that trim it was 13.6–15.6 forward). It is the busiest scene, with people, signs and two buses also drawn in every mirror.
- **Download:** the main script grows from 1,069 KB to 1,130 KB (gzip 279 → 297 KB); no new files are downloaded.

The figures vary by about ±10% between runs here. **These are not iPhone figures.** Your 60 fps reading was a single moment in normal mode; section 3 of `PERFORMANCE.md` (the iPhone acceptance check) is still outstanding.

What keeps the cost down:
- all signs and shelters are one mesh and one material;
- all people are three instanced meshes, not drawn beyond 140 m;
- each location builds only its own signs, people and buses (the representative streets get no shop names or buses);
- the sign texture is a single 1024 × 1024 sheet for Brentwood;
- no files are downloaded for any of it.

## 6. Not done, and why

| Item | Why | What would resolve it |
|---|---|---|
| **Zebra zig-zag markings** | Standard zig-zags (8 marks, about 16 m) would put the exercise's parked van on the zig-zags, which is illegal, and change what the exercise depicts. The minimum permitted length (2 marks) would clear it, but it would be a guess. | Your decision: full zig-zags with the van illegally parked (a realistic hazard), shorter zig-zags, or moving the van (which changes the occlusion: it would need re-testing). |
| **Speed-limit signs** | OSM maps the limits per road but not where they change or where repeaters stand. | Survey or street imagery reviewed by a person (no imagery is extracted). The label shows the mapped limits meanwhile. |
| **Direction signs, give-way signs, side-road give-way markings** | Not mapped; drawing them would be guessing. | As above. |
| **Bus-stop road markings ("BUS STOP" boxes)** | Not mapped. | As above. |
| **Buses through the mini-roundabouts** | A bus crossing the learner's path at a junction would become part of the decision the exercise assesses. They stay on the High Street behind the start. | A future exercise designed and reviewed around a bus. |
| **Free human or bus models** | Asset sites are blocked here; none in the register. | Network access to a CC0 source, or a pack you provide, if the procedural figures are not enough. |
| **Location research handover** | Not received yet in this session. No new roundabout has been guessed or built. | The research agent's verified layout. |

## 7. Test results (this container)

- **Typecheck and build:** pass.
- **Unit tests:** 166 pass (17 files), including the 27 new ones above.
- **Browser tests:** 33 pass (full suite, two workers, software rendering), including G15 (new) and G11, G13, G1, G2, G5, G6 and G9.
- **One test was changed, and why:** G11 checks that the cyclist is hidden from the left mirror when close behind the car and in line with it. The new rider leans forward to the handlebars, so its head and shoulders are about 0.3 m further forward than the old cylinder, and a few pixels of it stay at the mirror's inner edge until about 10.5 m behind (the old figure was gone by 12 m). The window is now 3–10 m behind, and "in line" means within the car's width instead of left of its centre line, because the cyclist starts to move out at 10 m. The claim it checks (hidden by the car when close and in line) is unchanged. To keep the yellow area like the old figure's, the rider wears a yellow hi-vis vest and helmet over dark sleeves.
- **Not checked:** the iPhone, the headset and any real-world sign or stop position.
