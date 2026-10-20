# Animated people (project owner's Tripo characters): integration (2026-10-20)

Packs: `Driving_Practice_Animated_Tripo_People.zip` (five rigged, animated GLBs) and
`Driving_Practice_Tripo_Original_Source_Exports.zip` (the five Tripo FBX exports), supplied by the project owner.
**Licence:** the project owner confirmed on 2026-10-20 that they hold a commercial licence to use these characters.
Register entry: `driving-practice-tripo-people` in `content/assets/register.json`. The archives are not stored; the
four rebuilt models are (`public/assets/models/people/`).

## What changed

- **Exercise pedestrians** (the zebra pedestrian, the Kings Road pedestrian) and the **background people nearest
  the car** (within 50 m) are drawn as animated models. Each look has two copies, so at most eight people are animated
  at once. Everyone else keeps the light drawn figures.
- People are in the same places as before. The animated models only change how they are drawn, so sightlines are
  unchanged: the van still hides the zebra pedestrian (G13).
- **Clips:** Walk advances with distance walked, so feet keep pace with the walking speed. People who are standing
  play Idle, and every 9 s they look right and then left along the road for 2 s. The zebra pedestrian looks right
  (towards oncoming traffic) while getting ready to cross. Head direction here is only an animation; nothing
  measures where anyone is looking.
- Each person always gets the same look, chosen from their id.

## Height correction (2026-10-20)

The first version drew people about 1.8 times too tall (around 3 m: the zebra pedestrian looked like a giant
next to the houses). Each character's size is carried by its skeleton, which the mesh's own bounds do not
include. Each model's height is now measured as drawn (skinned, Idle pose: 1.68 to 1.79 m) when it loads, and every
person is scaled from that to their own height (1.58 to 1.86 m; the zebra pedestrian is 1.72 m). G13 checks the
drawn heights: the waiting pedestrian is 1.72 m, and every animated person is between 1.3 and 1.95 m.
`docs/assets/animated-people/zebra-ped-scaled.png` shows the corrected scale next to a Belisha beacon and the van.

## Build (`tools/assets/build-people.sh`, `tools/assets/optimise-person.mjs`)

| Model | Source | Triangles | Bytes |
|---|---|---|---|
| person-man-jacket | pedestrian_male_01 | 9,336 | 969,708 |
| person-man-zip-jacket | pedestrian_male_02 | 7,549 | 799,804 |
| person-woman-jacket | pedestrian_woman_04 | 7,323 | 843,396 |
| person-older-man-coat | pedestrian_adult_05 | 6,082 | 728,080 |

The build does the following:
- keeps the Walk, Idle, LookLeft and LookRight clips;
- flips the texture coordinates vertically, because the supplied GLBs carry FBX-style V and show a patchwork of
  texture pieces otherwise;
- welds and simplifies to 20%, then rebuilds smooth normals;
- keeps only the colour texture (512 px JPEG); the simulator draws people with a plain diffuse material;
- quantises.

Each model keeps its 65-joint skin.

**Not used:**
- action_performer_03: it has no Walk clip, and its Cycling clip is body motion without a bicycle;
- the SeatedIdle, Carrying a bag and Climbing clips;
- the FBX exports.

## Checks

- Unit tests pass (180), including the register check that every shipped model is listed with a licence allowing
  redistribution and is under 1 MB.
- All 35 browser tests pass, including the mirror (G1, G11) and sightline (G13, G16) tests.

**Frame rate**, measured on this development container (not a phone) by the headless perf probe, forward view:

| Exercise | Without | With |
|---|---|---|
| Moving off | 17.3 fps | 17.3 fps |
| Zebra | 17.4 fps | 17.9 fps |
| Brentwood | 12.1 fps | 12.2 fps |
| Kings Road | 18.0 fps | 17.5 fps |

The differences are within run-to-run noise. iPhone performance has not been measured.

The models load in the background. Until they arrive, or if they fail to load, everyone is drawn with the light
figures.

## Screenshots (`animated-people/`)

- `zebra-ped.png` and `zebra-ped2.png`: the zebra pedestrian close up. The diagnostic camera is on the pavement.
- `zebra-forward.png`, `brentwood-forward.png` and `kings-forward.png`: driver's forward view at each start.
