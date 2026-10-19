# Asset Batch B (corrected cars, QA v0.3): evaluation (2026-10-19)

Pack: `Driving_Practice_Batch_B_Corrected_Complete.zip`, supplied by the project owner. Register entry:
`driving-practice-batch-b-cars` in `content/assets/register.json`.

## Decision: not used or shipped yet

* **Licence unknown.** The pack README says the vehicle source archive came without licence terms and
  asks for this build to stay separate from the repository until the rights are checked against the
  original marketplace listing or receipt. Several models resemble real branded cars.
* `tools/assets/build-batch-b-cars.sh` builds the everyday models into the git-ignored
  `public/assets/licensed/` only, for local evaluation. Nothing from the pack is committed.

## Evaluation in the simulator (local, software rendering)

The compact Mini (white) was tried as the model for other road users' cars, in place of the
CC0 Quaternius car, with a temporary local change (not committed).

| | Quaternius car (current) | Batch B Mini |
| --- | --- | --- |
| Triangles per car | 2,954 | 16,638 (about 7,200 of them wheels and tyres) |
| Materials | 6 | 10 |
| File, optimised | 113 KB | 293 KB (parked version 148 KB, 6,785 triangles) |
| Brentwood, phone profile, main view without mirrors | 58 draw calls, 76.8k triangles | 77 draw calls, 90.4k triangles |
| Practice zebra, same | 73 draw calls, 51.8k triangles | 73 draw calls, 65.5k triangles |

* Body paint is one material (`Body`), so the simulator's per-car recolouring works; the roof (`Body.01`)
  keeps its colour.
* From the driver's seat and in the mirrors the Mini is recognisable but the difference from the current
  car is small at the distances the exercises use.
* Every model has a `WheelSpin_2s` clip (or `WheelRoll_2s_Loop` on Car 01); the simulator does not play it yet.

Other models measured: BMW saloon 10,582 triangles (190 KB), pickup 17,565 (320 KB). Car 01
(`uk-traffic-car-01_*`, the Dodge-like legacy model) is 15,598 triangles with 1024 px textures (about
956 KB each). Sports, super and futuristic models are not suitable for everyday Brentwood traffic.

Cyclist QA files: the urban bicycle is light (2,480 vertices, 101 KB); the cyclist with contact pose is
4.6 MB (about 58,000 vertices), too heavy for the phone without simplification. The drawn cyclist stays.

## To use them later

1. Confirm the licence (marketplace listing or receipt) allows use in a published web app, and whether
   files may sit in a public repository.
2. If public redistribution is allowed: rebuild into `public/assets/models/vehicles`, register as public,
   add a `CarModelSpec`. If only use (not redistribution) is allowed: keep them private and deploy them
   only to a private preview.
3. Consider simplifying the wheels (about 40 % of the Mini's triangles) before using several at once.
